#!/usr/bin/env python3
"""File-only adapter for historical MOLIT 2023 source acquisition.

This script mirrors the safe request and XML parsing contract observed in
existing KOAPTIX ingestion paths, but it is intentionally isolated from every
DB-coupled operational path:

- standard-library only
- no project module imports
- no DB/admin-client imports
- no-network by default
- future live network requires explicit --fetch --no-db-hard-guard

Successful future fetches write immutable raw source packages only. They do
not normalize, import, match, clean, or write anything to KOAPTIX tables.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import time
from typing import Any
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET


VERSION = "0.1.0"
SCHEMA_VERSION = "1.0"
DEFAULT_SOURCE_SYSTEM = "MOLIT_RTMS"
DEFAULT_CONTRACT_MODE = "existing-ingest"
ENDPOINT_ENV_NAME = "KOAPTIX_MOLIT_APT_TRADE_URL"
SERVICE_KEY_ENV_NAME = "KOAPTIX_MOLIT_SERVICE_KEY"
HTTP_ERROR_BODY_MAX_BYTES = 64 * 1024
REPO_ROOT = Path(__file__).resolve().parents[1]
MANUAL_SOURCE_ROOT = REPO_ROOT / "manual_sources" / "MOLIT_2023"
SENSITIVE_HEADER_NAMES = {
    "authorization",
    "cookie",
    "proxy-authorization",
    "servicekey",
    "set-cookie",
    "x-api-key",
    "x-service-key",
}


class AdapterError(Exception):
    def __init__(self, code: int, message: str, phase: str = "validation") -> None:
        super().__init__(message)
        self.code = code
        self.phase = phase


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def canonical_json_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_text(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value, encoding="utf-8")


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in fieldnames})


def is_relative_to(child: Path, parent: Path) -> bool:
    try:
        child.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


def is_outside_repo(path: Path) -> bool:
    return not is_relative_to(path, REPO_ROOT)


def is_nonempty_dir(path: Path) -> bool:
    return path.exists() and path.is_dir() and any(path.iterdir())


def ensure_no_collision(package_dir: Path) -> None:
    if is_nonempty_dir(package_dir):
        raise AdapterError(5, f"output package exists and is non-empty: {package_dir.as_posix()}", "collision")


def forbidden_module_names() -> tuple[str, ...]:
    return (
        "supabase",
        "psycopg",
        "psycopg2",
        "asyncpg",
        "sqlalchemy",
        "pg8000",
        "requests",
        "dotenv",
        "pandas",
        "numpy",
    )


def no_db_hard_guard(args: argparse.Namespace) -> None:
    loaded = set(sys.modules)
    risky = sorted(name for name in forbidden_module_names() if name in loaded)
    project_loaded = sorted(name for name in loaded if name == "koaptix" or name.startswith("koaptix."))
    if risky or project_loaded:
        names = ", ".join(risky + project_loaded)
        raise AdapterError(4, f"forbidden modules loaded: {names}", "hard_guard")
    if args.fetch and not args.no_db_hard_guard:
        raise AdapterError(4, "--fetch requires --no-db-hard-guard", "hard_guard")
    if args.fetch:
        package_dir = resolve_package_dir(args)
        if not is_relative_to(package_dir, MANUAL_SOURCE_ROOT):
            raise AdapterError(5, "fetch output must stay under manual_sources/MOLIT_2023", "hard_guard")


def known_secret_values(args: argparse.Namespace | None = None, include_env: bool = True) -> tuple[str, ...]:
    values: list[str] = []
    if include_env:
        service_key = os.environ.get(SERVICE_KEY_ENV_NAME)
        if service_key:
            values.append(service_key)
    if args is not None:
        extra = getattr(args, "known_secret_value", None)
        if extra:
            values.append(extra)
    return tuple(value for value in values if len(value) >= 4)


def redact_text(value: str, secrets: tuple[str, ...]) -> str:
    result = value
    for secret in secrets:
        if secret:
            result = result.replace(secret, "[REDACTED]")
    return result


def contains_secret_bytes(data: bytes, secrets: tuple[str, ...]) -> bool:
    if not data:
        return False
    for secret in secrets:
        if secret and secret.encode("utf-8", errors="ignore") in data:
            return True
    return False


def sanitize_header_value(name: str, value: str, secrets: tuple[str, ...]) -> str:
    if name.lower() in SENSITIVE_HEADER_NAMES:
        return "[REDACTED]"
    return redact_text(value, secrets)


def sanitize_headers(headers: dict[str, str], secrets: tuple[str, ...]) -> dict[str, str]:
    return {name: sanitize_header_value(name, str(value), secrets) for name, value in headers.items()}


def safe_error_message(exc: BaseException, secrets: tuple[str, ...] = ()) -> str:
    message = str(exc)
    message = redact_text(message, secrets)
    message = re.sub(r"serviceKey=([^&\s]+)", "serviceKey=[REDACTED]", message)
    return message[:500]


def deal_ym(year: int, month: int) -> str:
    return f"{year:04d}{month:02d}"


def validate_scope(args: argparse.Namespace) -> None:
    missing = [name for name in ("year", "month", "lawd_cd", "pilot_label") if getattr(args, name) in (None, "")]
    if missing:
        raise AdapterError(2, f"missing required flags: {', '.join('--' + name.replace('_', '-') for name in missing)}", "scope")
    if args.year != 2023:
        raise AdapterError(2, "--year must be 2023 for this historical adapter", "scope")
    if not (1 <= args.month <= 12):
        raise AdapterError(2, "--month must be 1..12", "scope")
    if not re.fullmatch(r"\d{5}", args.lawd_cd or ""):
        raise AdapterError(2, "--lawd-cd must be a five-digit code", "scope")
    if args.page_size < 1 or args.page_size > 5000:
        raise AdapterError(2, "--page-size must be between 1 and 5000", "scope")
    if args.max_pages < 1 or args.max_pages > 100:
        raise AdapterError(2, "--max-pages must be between 1 and 100", "scope")
    if args.timeout_sec < 1 or args.timeout_sec > 300:
        raise AdapterError(2, "--timeout-sec must be between 1 and 300", "scope")
    if args.retry < 0 or args.retry > 10:
        raise AdapterError(2, "--retry must be between 0 and 10", "scope")
    if args.sleep_ms < 0 or args.sleep_ms > 60000:
        raise AdapterError(2, "--sleep-ms must be between 0 and 60000", "scope")
    if args.contract_mode != DEFAULT_CONTRACT_MODE:
        raise AdapterError(2, "--contract-mode currently supports only existing-ingest", "scope")
    if args.fetch and args.plan:
        raise AdapterError(2, "--fetch and --plan cannot be combined", "cli")


def resolve_package_dir(args: argparse.Namespace) -> Path:
    out_dir = Path(args.out_dir)
    return out_dir / "pilot" / args.pilot_label / f"{args.year:04d}" / f"{args.month:02d}"


def request_hash_input(args: argparse.Namespace, page_no: int) -> dict[str, Any]:
    return {
        "adapter_version": VERSION,
        "contract_mode": args.contract_mode,
        "source_system": args.source_system,
        "method": "GET",
        "endpoint_env_name": ENDPOINT_ENV_NAME,
        "lawd_cd": args.lawd_cd,
        "deal_ym": deal_ym(args.year, args.month),
        "page_no": page_no,
        "num_of_rows": args.page_size,
        "max_pages": args.max_pages,
    }


def request_parameter_hash(args: argparse.Namespace, page_no: int) -> str:
    return sha256_bytes(canonical_json_bytes(request_hash_input(args, page_no)))


def build_request_url(endpoint: str, service_key: str, args: argparse.Namespace, page_no: int) -> str:
    parsed = urllib.parse.urlsplit(endpoint)
    query = dict(urllib.parse.parse_qsl(parsed.query, keep_blank_values=True))
    query.update(
        {
            "serviceKey": service_key,
            "LAWD_CD": args.lawd_cd,
            "DEAL_YMD": deal_ym(args.year, args.month),
            "pageNo": str(page_no),
            "numOfRows": str(args.page_size),
        }
    )
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urllib.parse.urlencode(query), parsed.fragment))


def redacted_request_parameters(args: argparse.Namespace, page_no: int) -> dict[str, Any]:
    return {
        "serviceKey": "[REDACTED_IF_PRESENT]",
        "LAWD_CD": args.lawd_cd,
        "DEAL_YMD": deal_ym(args.year, args.month),
        "pageNo": page_no,
        "numOfRows": args.page_size,
    }


def build_request_plan(args: argparse.Namespace, package_dir: Path, fetch_mode: bool) -> dict[str, Any]:
    planned_pages = [
        {
            "page_no": page_no,
            "request_parameter_hash": request_parameter_hash(args, page_no),
            "request_parameters_redacted": redacted_request_parameters(args, page_no),
        }
        for page_no in range(1, args.max_pages + 1)
    ]
    return {
        "schema_version": SCHEMA_VERSION,
        "adapter_version": VERSION,
        "created_at_utc": utc_now(),
        "contract_mode": args.contract_mode,
        "source_system": args.source_system,
        "method": "GET",
        "endpoint_env_name": ENDPOINT_ENV_NAME,
        "service_key_env_name": SERVICE_KEY_ENV_NAME,
        "endpoint_present": bool(os.environ.get(ENDPOINT_ENV_NAME)),
        "service_key_present": bool(os.environ.get(SERVICE_KEY_ENV_NAME)),
        "service_key_value_persisted": False,
        "lawd_cd": args.lawd_cd,
        "deal_ym": deal_ym(args.year, args.month),
        "year": args.year,
        "month": args.month,
        "pilot_label": args.pilot_label,
        "page_size": args.page_size,
        "max_pages": args.max_pages,
        "timeout_sec": args.timeout_sec,
        "retry": args.retry,
        "sleep_ms": args.sleep_ms,
        "fetch_mode_requested": fetch_mode,
        "network_call_attempted": False,
        "db_connection_attempted": False,
        "package_dir": package_dir.as_posix(),
        "planned_pages": planned_pages,
        "request_parameter_hash": planned_pages[0]["request_parameter_hash"],
        "request_hash_input_first_page": request_hash_input(args, 1),
    }


def local_name(tag: str) -> str:
    if "}" in tag:
        return tag.rsplit("}", 1)[1]
    return tag


def element_text(root: ET.Element, names: tuple[str, ...]) -> str | None:
    name_set = set(names)
    for element in root.iter():
        if local_name(element.tag) in name_set:
            text = (element.text or "").strip()
            if text:
                return text
    return None


def item_to_dict(item: ET.Element) -> dict[str, str]:
    result: dict[str, str] = {}
    for child in list(item):
        key = local_name(child.tag)
        value = (child.text or "").strip()
        if value:
            result[key] = value
    return result


def value_of(item: dict[str, str], *keys: str) -> str | None:
    for key in keys:
        value = item.get(key)
        if value is not None and value.strip():
            return value.strip()
    return None


def parse_int(value: str | None) -> int | None:
    if value is None:
        return None
    cleaned = re.sub(r"[^0-9-]", "", value)
    if cleaned in {"", "-"}:
        return None
    try:
        return int(cleaned)
    except ValueError:
        return None


def normalize_result_message(value: str | None) -> str:
    normalized = (value or "").strip().upper()
    normalized = re.sub(r"[^A-Z0-9]+", " ", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


def is_api_success(result_code: str | None, result_message: str | None) -> bool:
    code = re.sub(r"\s+", "", (result_code or "").strip())
    message = normalize_result_message(result_message)
    return code in {"00", "000", "0"} or message in {"OK", "NORMAL SERVICE"}


def dedupe_candidate(item: dict[str, str]) -> dict[str, Any]:
    fields = {
        "lawd_cd": value_of(item, "lawdCd", "regionCode"),
        "umd_nm": value_of(item, "umdNm"),
        "apt_nm": value_of(item, "aptNm"),
        "jibun": value_of(item, "jibun"),
        "deal_year": value_of(item, "dealYear", "year"),
        "deal_month": value_of(item, "dealMonth", "month"),
        "deal_day": value_of(item, "dealDay", "day"),
        "exclusive_area": value_of(item, "excluUseAr", "exclusiveArea"),
        "deal_amount": value_of(item, "dealAmount"),
        "floor": value_of(item, "floor"),
    }
    compact = {key: value for key, value in fields.items() if value not in (None, "")}
    return {
        "field_count": len(compact),
        "fields_available": sorted(compact),
        "candidate_sha256": sha256_bytes(canonical_json_bytes(compact)) if compact else None,
    }


def parse_xml_metadata(raw: bytes) -> dict[str, Any]:
    try:
        root = ET.fromstring(raw)
    except ET.ParseError as exc:
        preview = raw[:200].decode("utf-8", errors="replace")
        raise AdapterError(7, f"XML parse failed: {preview}", "parse") from exc

    result_code = element_text(root, ("resultCode",))
    result_message = element_text(root, ("resultMsg", "resultMessage"))
    total_count = parse_int(element_text(root, ("totalCount",)))
    page_no = parse_int(element_text(root, ("pageNo",)))
    num_of_rows = parse_int(element_text(root, ("numOfRows",)))
    items = [item_to_dict(element) for element in root.iter() if local_name(element.tag) == "item"]
    dedupe_candidates = [dedupe_candidate(item) for item in items[:50]]

    return {
        "response_format": "xml",
        "result_code": result_code,
        "result_message": result_message,
        "result_success": is_api_success(result_code, result_message),
        "total_count": total_count,
        "page_no_detected": page_no,
        "num_of_rows_detected": num_of_rows,
        "item_count": len(items),
        "empty_valid_response": len(items) == 0 and (total_count == 0 or total_count is None),
        "dedupe_key_candidate_count": len(dedupe_candidates),
        "dedupe_key_candidates_preview": dedupe_candidates,
        "raw_sha256": sha256_bytes(raw),
        "byte_count": len(raw),
    }


def inventory_rows(root: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if not root.exists():
        return rows
    for path in sorted(p for p in root.rglob("*") if p.is_file()):
        rel = path.relative_to(root).as_posix()
        rows.append(
            {
                "relative_path": rel,
                "bytes": path.stat().st_size,
                "sha256": sha256_file(path),
                "created_at_utc": utc_now(),
                "contains_secrets": "UNKNOWN_NOT_SCANNED",
            }
        )
    return rows


def write_artifact_hashes(package_dir: Path) -> None:
    rows = inventory_rows(package_dir)
    write_csv(
        package_dir / "hashes" / "artifact_hashes.csv",
        rows,
        ["relative_path", "bytes", "sha256", "created_at_utc", "contains_secrets"],
    )
    rows = inventory_rows(package_dir)
    write_csv(
        package_dir / "file_inventory.csv",
        rows,
        ["relative_path", "bytes", "sha256", "created_at_utc", "contains_secrets"],
    )


def write_plan_artifacts(args: argparse.Namespace, package_dir: Path, plan: dict[str, Any]) -> dict[str, Any]:
    if not is_outside_repo(package_dir):
        plan["artifacts_written"] = False
        plan["artifact_write_reason"] = "output target is inside repo; plan returned on stdout only"
        return plan
    ensure_no_collision(package_dir)
    write_json(package_dir / "request_plan.json", plan)
    manifest = {
        "schema_version": SCHEMA_VERSION,
        "package_status": "PLAN_ONLY_NO_NETWORK",
        "network_call_attempted": False,
        "db_connection_attempted": False,
        "raw_response_file_count": 0,
        "request_parameter_hashes": [page["request_parameter_hash"] for page in plan["planned_pages"]],
        "service_key_value_persisted": False,
    }
    write_json(package_dir / "manifest" / "lawd_month_manifest.json", manifest)
    write_csv(
        package_dir / "logs" / "fetch_log.csv",
        [
            {
                "created_at_utc": utc_now(),
                "mode": "PLAN",
                "network_call_attempted": False,
                "db_connection_attempted": False,
            }
        ],
        ["created_at_utc", "mode", "network_call_attempted", "db_connection_attempted"],
    )
    write_artifact_hashes(package_dir)
    plan["artifacts_written"] = True
    plan["artifact_root"] = package_dir.as_posix()
    return plan


def write_fixture_artifacts(args: argparse.Namespace, package_dir: Path, metadata: dict[str, Any]) -> dict[str, Any]:
    if not is_outside_repo(package_dir):
        return {
            "status": "PASS_FIXTURE_PARSED_NO_WRITE",
            "metadata": metadata,
            "network_call_attempted": False,
            "db_connection_attempted": False,
            "artifacts_written": False,
        }
    ensure_no_collision(package_dir)
    write_json(package_dir / "metadata" / "fixture_parse.metadata.json", metadata)
    manifest = {
        "schema_version": SCHEMA_VERSION,
        "package_status": "FIXTURE_PARSE_ONLY",
        "network_call_attempted": False,
        "db_connection_attempted": False,
        "raw_response_file_count": 0,
        "fixture_raw_sha256": metadata["raw_sha256"],
        "total_count": metadata.get("total_count"),
        "item_count": metadata.get("item_count"),
        "service_key_value_persisted": False,
    }
    write_json(package_dir / "manifest" / "lawd_month_manifest.json", manifest)
    write_artifact_hashes(package_dir)
    return {
        "status": "PASS_FIXTURE_PARSED",
        "metadata": metadata,
        "network_call_attempted": False,
        "db_connection_attempted": False,
        "artifacts_written": True,
        "artifact_root": package_dir.as_posix(),
    }


def write_error_log(package_dir: Path, row: dict[str, Any]) -> None:
    fields = [
        "created_at_utc",
        "page_no",
        "error_type",
        "safe_error_message",
        "http_status",
        "http_reason",
        "http_error_body_saved",
        "http_error_body_sha256",
        "http_error_metadata_path",
        "secret_exposure_risk",
    ]
    write_csv(package_dir / "logs" / "error_log.csv", [row], fields)


def write_raw_response_hashes(package_dir: Path, raw_rows: list[dict[str, Any]]) -> None:
    write_csv(package_dir / "hashes" / "raw_response_hashes.csv", raw_rows, ["relative_path", "sha256", "bytes"])


def write_http_error_diagnostics(
    args: argparse.Namespace,
    package_dir: Path,
    page_no: int,
    status: int,
    reason: str,
    headers: dict[str, str],
    body: bytes,
    secrets: tuple[str, ...],
) -> dict[str, Any]:
    bounded = body[:HTTP_ERROR_BODY_MAX_BYTES]
    body_truncated = len(body) > len(bounded)
    body_sha256 = sha256_bytes(bounded)
    secret_exposure = contains_secret_bytes(bounded, secrets)
    support_dir = package_dir / "support" / "http_errors"
    body_path = support_dir / f"http_error_body_page_{page_no:03d}.txt"
    metadata_path = support_dir / f"http_error_metadata_page_{page_no:03d}.json"
    body_saved = False
    if bounded and not secret_exposure:
        write_text(body_path, bounded.decode("utf-8", errors="replace"))
        body_saved = True
    metadata = {
        "schema_version": SCHEMA_VERSION,
        "created_at_utc": utc_now(),
        "page_no": page_no,
        "http_status": status,
        "http_reason": redact_text(reason, secrets),
        "headers": sanitize_headers(headers, secrets),
        "body_sha256": body_sha256,
        "body_saved": body_saved,
        "body_truncated": body_truncated,
        "body_relative_path": body_path.relative_to(package_dir).as_posix() if body_saved else None,
        "classified_as_success_raw_response": False,
        "secret_exposure_risk": "YES" if secret_exposure else "NO",
        "request_parameter_hash": request_parameter_hash(args, page_no),
    }
    write_json(metadata_path, metadata)
    error_row = {
        "created_at_utc": utc_now(),
        "page_no": page_no,
        "error_type": "HTTPError",
        "safe_error_message": f"HTTP {status}: {redact_text(reason, secrets)}",
        "http_status": status,
        "http_reason": redact_text(reason, secrets),
        "http_error_body_saved": body_saved,
        "http_error_body_sha256": body_sha256,
        "http_error_metadata_path": metadata_path.relative_to(package_dir).as_posix(),
        "secret_exposure_risk": "YES" if secret_exposure else "NO",
    }
    write_error_log(package_dir, error_row)
    write_raw_response_hashes(package_dir, [])
    manifest = {
        "schema_version": SCHEMA_VERSION,
        "package_status": "INCOMPLETE_ERROR_ONLY",
        "network_call_attempted": bool(args.fetch),
        "db_connection_attempted": False,
        "raw_response_file_count": 0,
        "page_count": 0,
        "http_error_diagnostics": [metadata],
        "service_key_value_persisted": False,
    }
    write_json(package_dir / "manifest" / "lawd_month_manifest.json", manifest)
    write_artifact_hashes(package_dir)
    return {
        "status": "PASS_HTTP_ERROR_DIAGNOSTIC_WRITTEN" if not args.fetch else "INCOMPLETE_HTTP_ERROR",
        "http_status": status,
        "body_saved": body_saved,
        "body_sha256": body_sha256,
        "secret_exposure_risk": "YES" if secret_exposure else "NO",
        "raw_response_file_count": 0,
        "network_call_attempted": bool(args.fetch),
        "db_connection_attempted": False,
        "artifact_root": package_dir.as_posix(),
    }


def write_non_http_error_package(
    args: argparse.Namespace,
    package_dir: Path,
    page_no: int,
    exc: BaseException,
    secrets: tuple[str, ...],
) -> dict[str, Any]:
    error_row = {
        "created_at_utc": utc_now(),
        "page_no": page_no,
        "error_type": type(exc).__name__,
        "safe_error_message": safe_error_message(exc, secrets),
        "http_status": "",
        "http_reason": "",
        "http_error_body_saved": False,
        "http_error_body_sha256": "",
        "http_error_metadata_path": "",
        "secret_exposure_risk": "NO",
    }
    write_error_log(package_dir, error_row)
    write_raw_response_hashes(package_dir, [])
    manifest = {
        "schema_version": SCHEMA_VERSION,
        "package_status": "INCOMPLETE_ERROR_ONLY",
        "network_call_attempted": bool(args.fetch),
        "db_connection_attempted": False,
        "raw_response_file_count": 0,
        "page_count": 0,
        "error": error_row,
        "service_key_value_persisted": False,
    }
    write_json(package_dir / "manifest" / "lawd_month_manifest.json", manifest)
    write_artifact_hashes(package_dir)
    return {
        "status": "INCOMPLETE_ERROR_ONLY",
        "error_type": type(exc).__name__,
        "raw_response_file_count": 0,
        "network_call_attempted": bool(args.fetch),
        "db_connection_attempted": False,
        "artifact_root": package_dir.as_posix(),
    }


def write_success_page(
    args: argparse.Namespace,
    package_dir: Path,
    page_no: int,
    raw: bytes,
    http_status: int,
    content_type: str,
) -> dict[str, Any]:
    metadata = parse_xml_metadata(raw)
    raw_path = package_dir / "raw" / f"page_{page_no:03d}.xml"
    metadata_path = package_dir / "metadata" / f"page_{page_no:03d}.metadata.json"
    raw_path.parent.mkdir(parents=True, exist_ok=True)
    raw_path.write_bytes(raw)
    metadata.update(
        {
            "schema_version": SCHEMA_VERSION,
            "created_at_utc": utc_now(),
            "page_no": page_no,
            "http_status": http_status,
            "content_type": content_type,
            "request_parameter_hash": request_parameter_hash(args, page_no),
            "classified_as_success_raw_response": True,
        }
    )
    write_json(metadata_path, metadata)
    return {
        "raw_path": raw_path,
        "metadata_path": metadata_path,
        "metadata": metadata,
    }


def finalize_fetch_manifest(args: argparse.Namespace, package_dir: Path, page_results: list[dict[str, Any]], bounded_partial: bool) -> dict[str, Any]:
    raw_rows = [
        {
            "relative_path": row["raw_path"].relative_to(package_dir).as_posix(),
            "sha256": row["metadata"]["raw_sha256"],
            "bytes": row["metadata"]["byte_count"],
        }
        for row in page_results
    ]
    write_raw_response_hashes(package_dir, raw_rows)
    total_items = sum(int(row["metadata"].get("item_count") or 0) for row in page_results)
    package_status = "FETCHED_COMPLETE"
    if bounded_partial:
        package_status = "FETCHED_BOUNDED_POSSIBLY_PARTIAL"
    manifest = {
        "schema_version": SCHEMA_VERSION,
        "package_status": package_status,
        "network_call_attempted": True,
        "db_connection_attempted": False,
        "raw_response_file_count": len(page_results),
        "page_count": len(page_results),
        "total_item_count": total_items,
        "request_parameter_hashes": [request_parameter_hash(args, i + 1) for i in range(len(page_results))],
        "raw_response_hashes": [row["metadata"]["raw_sha256"] for row in page_results],
        "metadata_hashes": [sha256_file(row["metadata_path"]) for row in page_results],
        "service_key_value_persisted": False,
    }
    manifest_path = package_dir / "manifest" / "lawd_month_manifest.json"
    write_json(manifest_path, manifest)
    manifest["lawd_month_manifest_sha256"] = sha256_file(manifest_path)
    manifest["lawd_month_package_sha256"] = sha256_bytes(canonical_json_bytes(manifest))
    write_json(manifest_path, manifest)
    write_artifact_hashes(package_dir)
    return manifest


def should_retry_http(status: int) -> bool:
    return status == 429 or 500 <= status <= 599


def fetch_mode(args: argparse.Namespace, package_dir: Path) -> dict[str, Any]:
    no_db_hard_guard(args)
    ensure_no_collision(package_dir)
    endpoint = os.environ.get(ENDPOINT_ENV_NAME)
    service_key = os.environ.get(SERVICE_KEY_ENV_NAME)
    if not endpoint or not service_key:
        raise AdapterError(3, "required fetch env names are missing", "fetch_config")

    secrets = known_secret_values(args, include_env=True)
    plan = build_request_plan(args, package_dir, fetch_mode=True)
    package_dir.mkdir(parents=True, exist_ok=True)
    write_json(package_dir / "request_plan.json", plan)
    page_results: list[dict[str, Any]] = []
    bounded_partial = False

    for page_no in range(1, args.max_pages + 1):
        last_error: BaseException | None = None
        for attempt in range(1, args.retry + 2):
            try:
                url = build_request_url(endpoint, service_key, args, page_no)
                request = urllib.request.Request(
                    url,
                    headers={
                        "Accept": "application/xml, text/xml;q=0.9, */*;q=0.8",
                        "User-Agent": "KOAPTIX-file-only-adapter/0.1",
                    },
                )
                with urllib.request.urlopen(request, timeout=args.timeout_sec) as response:
                    raw = response.read()
                    content_type = response.headers.get("Content-Type", "")
                    page_result = write_success_page(args, package_dir, page_no, raw, response.status, content_type)
                    page_results.append(page_result)
                break
            except urllib.error.HTTPError as exc:
                body = exc.read(HTTP_ERROR_BODY_MAX_BYTES + 1)
                last_error = exc
                if should_retry_http(exc.code) and attempt <= args.retry:
                    time.sleep(args.sleep_ms / 1000)
                    continue
                return write_http_error_diagnostics(
                    args,
                    package_dir,
                    page_no,
                    exc.code,
                    exc.reason or "",
                    dict(exc.headers.items()) if exc.headers else {},
                    body,
                    secrets,
                )
            except (urllib.error.URLError, TimeoutError) as exc:
                last_error = exc
                if attempt <= args.retry:
                    time.sleep(args.sleep_ms / 1000)
                    continue
                return write_non_http_error_package(args, package_dir, page_no, exc, secrets)
        if last_error is not None and len(page_results) < page_no:
            return write_non_http_error_package(args, package_dir, page_no, last_error, secrets)

        latest = page_results[-1]["metadata"]
        item_count = int(latest.get("item_count") or 0)
        total_count = latest.get("total_count")
        num_of_rows = int(latest.get("num_of_rows_detected") or args.page_size)
        current_page = int(latest.get("page_no_detected") or page_no)
        consumed = current_page * num_of_rows
        if item_count == 0:
            break
        if isinstance(total_count, int) and consumed >= total_count:
            break
        if page_no == args.max_pages:
            bounded_partial = True
            break
        time.sleep(args.sleep_ms / 1000)

    manifest = finalize_fetch_manifest(args, package_dir, page_results, bounded_partial)
    return {
        "status": manifest["package_status"],
        "raw_response_file_count": len(page_results),
        "page_count": len(page_results),
        "network_call_attempted": True,
        "db_connection_attempted": False,
        "artifact_root": package_dir.as_posix(),
    }


def simulate_http_error(args: argparse.Namespace, package_dir: Path) -> dict[str, Any]:
    if not is_outside_repo(package_dir):
        raise AdapterError(5, "HTTPError fixture output must be outside repo", "fixture")
    ensure_no_collision(package_dir)
    package_dir.mkdir(parents=True, exist_ok=True)
    body = (args.simulate_http_error_body or "").encode("utf-8")
    secrets = known_secret_values(args, include_env=False)
    return write_http_error_diagnostics(
        args,
        package_dir,
        1,
        int(args.simulate_http_error),
        "Simulated HTTP error",
        {"Content-Type": "text/plain"},
        body,
        secrets,
    )


def simulate_collision(args: argparse.Namespace, package_dir: Path) -> dict[str, Any]:
    ensure_no_collision(package_dir)
    return {
        "status": "PASS_COLLISION_CHECK_NO_EXISTING_PACKAGE",
        "network_call_attempted": False,
        "db_connection_attempted": False,
    }


def run(args: argparse.Namespace) -> dict[str, Any]:
    validate_scope(args)
    no_db_hard_guard(args)
    package_dir = resolve_package_dir(args)

    if args.simulate_collision_check:
        return simulate_collision(args, package_dir)

    if args.simulate_http_error is not None:
        return simulate_http_error(args, package_dir)

    if args.fixture_response:
        raw = Path(args.fixture_response).read_bytes()
        metadata = parse_xml_metadata(raw)
        return write_fixture_artifacts(args, package_dir, metadata)

    if args.fetch:
        return fetch_mode(args, package_dir)

    plan = build_request_plan(args, package_dir, fetch_mode=False)
    plan["status"] = "PASS_PLAN_NO_NETWORK"
    return write_plan_artifacts(args, package_dir, plan)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="File-only/no-DB adapter for historical MOLIT 2023 source acquisition.",
    )
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--month", type=int, required=True)
    parser.add_argument("--lawd-cd", required=True)
    parser.add_argument("--source-system", default=DEFAULT_SOURCE_SYSTEM)
    parser.add_argument("--pilot-label", required=True)
    parser.add_argument("--out-dir", default=(Path("manual_sources") / "MOLIT_2023").as_posix())
    parser.add_argument("--page-size", type=int, default=200)
    parser.add_argument("--max-pages", type=int, default=20)
    parser.add_argument("--timeout-sec", type=int, default=90)
    parser.add_argument("--retry", type=int, default=3)
    parser.add_argument("--sleep-ms", type=int, default=2000)
    parser.add_argument("--plan", action="store_true")
    parser.add_argument("--fetch", action="store_true")
    parser.add_argument("--no-db-hard-guard", action="store_true")
    parser.add_argument("--contract-mode", default=DEFAULT_CONTRACT_MODE, choices=[DEFAULT_CONTRACT_MODE])
    parser.add_argument("--fixture-response")
    parser.add_argument("--simulate-http-error", type=int, help=argparse.SUPPRESS)
    parser.add_argument("--simulate-http-error-body", help=argparse.SUPPRESS)
    parser.add_argument("--known-secret-value", help=argparse.SUPPRESS)
    parser.add_argument("--simulate-collision-check", action="store_true", help=argparse.SUPPRESS)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        result = run(args)
        print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
        return 0
    except AdapterError as exc:
        secrets = known_secret_values(args, include_env=bool(getattr(args, "fetch", False)))
        print(
            json.dumps(
                {
                    "status": "ERROR",
                    "phase": exc.phase,
                    "code": exc.code,
                    "message": safe_error_message(exc, secrets),
                    "network_call_attempted": False,
                    "db_connection_attempted": False,
                },
                ensure_ascii=False,
                indent=2,
                sort_keys=True,
            )
        )
        return exc.code


if __name__ == "__main__":
    raise SystemExit(main())
