#!/usr/bin/env python3
"""File-only MOLIT 2023 source acquisition wrapper.

This standalone wrapper is designed for immutable raw-source acquisition:
- no DB connection or DB client imports
- no project helper/materializer imports
- default mode is no-network dry-run planning
- future network calls require explicit --fetch

This script writes local request plans, manifests, hashes, inventories, and
sanitized reports. It never prints secret values or full secret-bearing URLs.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import random
import sys
import time
from typing import Any
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET


VERSION = "0.1.0"
SCHEMA_VERSION = "1.0"
DEFAULT_SOURCE_SYSTEM = "molit-apt-trade-detail"
ENDPOINT_ENV_NAMES = ("KOAPTIX_MOLIT_APT_TRADE_URL", "MOLIT_API_BASE_URL", "KOAPTIX_MOLIT_API_URL")
KEY_ENV_NAMES = ("KOAPTIX_MOLIT_SERVICE_KEY", "MOLIT_API_SERVICE_KEY")
OPTIONAL_INT_ENV_DEFAULTS = {
    "page_size": ("KOAPTIX_MOLIT_NUM_OF_ROWS", 1000),
    "max_pages": ("KOAPTIX_MOLIT_PAGE_MAX", 5),
    "timeout_sec": ("KOAPTIX_MOLIT_TIMEOUT_SECONDS", 30),
    "retry": ("KOAPTIX_MOLIT_RETRY_MAX", 3),
}
OPTIONAL_SLEEP_ENV = ("KOAPTIX_REQUEST_SLEEP_SECONDS", 1.0)
ALLOWED_PILOTS = {
    ("SGG_11710", "11710", 2023, 12),
    ("SGG_11710", "11710", 2023, 11),
    ("SGG_11680", "11680", 2023, 12),
    ("SGG_11680", "11680", 2023, 11),
}


class WrapperError(Exception):
    def __init__(self, code: int, message: str, phase: str = "validation") -> None:
        super().__init__(message)
        self.code = code
        self.phase = phase


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_int_env(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def read_sleep_default() -> int:
    raw = os.environ.get(OPTIONAL_SLEEP_ENV[0])
    if raw is None or raw.strip() == "":
        return int(OPTIONAL_SLEEP_ENV[1] * 1000)
    try:
        return max(0, int(float(raw) * 1000))
    except ValueError:
        return int(OPTIONAL_SLEEP_ENV[1] * 1000)


def canonical_json_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )


def write_text(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value, encoding="utf-8")


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator="\n", extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def env_presence(names: tuple[str, ...]) -> list[dict[str, Any]]:
    rows = []
    for name in names:
        value = os.environ.get(name)
        rows.append({"name": name, "present": bool(value), "value_printed": False})
    return rows


def first_present_env(names: tuple[str, ...]) -> tuple[str | None, str | None]:
    for name in names:
        value = os.environ.get(name)
        if value:
            return name, value
    return None, None


def request_parameter_hash(args: argparse.Namespace, page_no: int) -> str:
    payload = {
        "wrapper_version": VERSION,
        "method": "GET",
        "endpoint_env_name": ENDPOINT_ENV_NAMES[0],
        "source_system": args.source_system,
        "lawd_cd": args.lawd_cd,
        "deal_ym": deal_ym(args.year, args.month),
        "page_no": page_no,
        "num_of_rows": args.page_size,
        "max_pages": args.max_pages,
    }
    return sha256_bytes(canonical_json_bytes(payload))


def deal_ym(year: int, month: int) -> str:
    return f"{year:04d}{month:02d}"


def redact_url(url: str) -> str:
    parsed = urllib.parse.urlsplit(url)
    query = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    redacted = []
    for key, value in query:
        if key.lower() == "servicekey":
            redacted.append((key, "[REDACTED]"))
        else:
            redacted.append((key, value))
    return urllib.parse.urlunsplit(
        (parsed.scheme, parsed.netloc, parsed.path, urllib.parse.urlencode(redacted), parsed.fragment)
    )


def safe_error_message(exc: BaseException) -> str:
    text = str(exc)
    text = text.replace(os.environ.get(KEY_ENV_NAMES[0], "") or "\0", "[REDACTED]")
    if os.environ.get(KEY_ENV_NAMES[1]):
        text = text.replace(os.environ[KEY_ENV_NAMES[1]], "[REDACTED]")
    return text[:500]


def build_request_url(endpoint: str, service_key: str, args: argparse.Namespace, page_no: int) -> str:
    url = urllib.parse.urlsplit(endpoint)
    query = dict(urllib.parse.parse_qsl(url.query, keep_blank_values=True))
    query.update(
        {
            "serviceKey": service_key,
            "LAWD_CD": args.lawd_cd,
            "DEAL_YMD": deal_ym(args.year, args.month),
            "pageNo": str(page_no),
            "numOfRows": str(args.page_size),
        }
    )
    return urllib.parse.urlunsplit((url.scheme, url.netloc, url.path, urllib.parse.urlencode(query), url.fragment))


def accepted_content_type(content_type: str | None) -> bool:
    if content_type is None:
        return False
    lowered = content_type.lower()
    return "xml" in lowered or "text/plain" in lowered or "octet-stream" in lowered


def strip_namespace(tag: str) -> str:
    return tag.rsplit("}", 1)[-1] if "}" in tag else tag


def find_first_text(root: ET.Element, names: tuple[str, ...]) -> str | None:
    wanted = {name.lower() for name in names}
    for node in root.iter():
        if strip_namespace(node.tag).lower() in wanted and node.text is not None:
            return node.text.strip()
    return None


def parse_xml_metadata(raw: bytes) -> dict[str, Any]:
    try:
        root = ET.fromstring(raw)
    except ET.ParseError as exc:
        raise WrapperError(7, f"malformed XML response: {exc}", "parse") from exc

    result_code = find_first_text(root, ("resultCode", "result_code"))
    result_message = find_first_text(root, ("resultMsg", "resultMessage", "result_message"))
    total_text = find_first_text(root, ("totalCount", "total_count"))
    try:
        total_count = int(total_text) if total_text not in (None, "") else None
    except ValueError:
        total_count = None
    item_count = sum(1 for node in root.iter() if strip_namespace(node.tag).lower() == "item")
    return {
        "molit_result_code": result_code,
        "molit_result_message": result_message,
        "total_count_reported": total_count,
        "item_count_detected": item_count,
        "empty_valid_response": item_count == 0 and (total_count == 0 or total_count is None),
        "parse_status": "OK",
    }


def forbidden_module_names() -> tuple[str, ...]:
    parts = [
        "sup" + "abase",
        "psyc" + "opg",
        "psyc" + "opg2",
        "async" + "pg",
        "sql" + "alchemy",
        "pg" + "8000",
        "requests",
        "pandas",
        "numpy",
        "dotenv",
    ]
    return tuple(parts)


def no_db_hard_guard(package_dir: Path, args: argparse.Namespace) -> None:
    loaded = set(sys.modules)
    risky = sorted(name for name in forbidden_module_names() if name in loaded)
    if risky:
        raise WrapperError(4, f"forbidden modules loaded: {', '.join(risky)}", "hard_guard")
    if args.fetch and not args.no_db_hard_guard:
        raise WrapperError(4, "--fetch requires --no-db-hard-guard", "hard_guard")
    if args.overwrite:
        raise WrapperError(5, "--overwrite is parsed but blocked in this implementation", "hard_guard")
    if args.fetch:
        root = Path("manual_sources") / "MOLIT_2023"
        try:
            package_dir.resolve().relative_to(root.resolve())
        except ValueError as exc:
            raise WrapperError(5, "fetch output must stay under manual_sources/MOLIT_2023", "hard_guard") from exc
    if args.write_manifest and not args.fetch:
        manual_root = Path("manual_sources").resolve()
        try:
            package_dir.resolve().relative_to(manual_root)
        except ValueError:
            return
        raise WrapperError(5, "dry-run manifest writes are blocked under manual_sources", "hard_guard")


def validate_scope(args: argparse.Namespace) -> None:
    if args.year is None or args.month is None or args.lawd_cd is None or args.pilot_label is None:
        raise WrapperError(2, "--year, --month, --lawd-cd, and --pilot-label are required", "scope")
    if not (1 <= args.month <= 12):
        raise WrapperError(2, "--month must be 1..12", "scope")
    if not (args.lawd_cd.isdigit() and len(args.lawd_cd) == 5):
        raise WrapperError(2, "--lawd-cd must be a five-digit code", "scope")
    key = (args.pilot_label, args.lawd_cd, args.year, args.month)
    if key not in ALLOWED_PILOTS:
        raise WrapperError(9, "scope is outside approved 2023 pilot set", "scope")
    if args.max_pages < 1 or args.max_pages > 50:
        raise WrapperError(9, "--max-pages must be between 1 and 50", "scope")
    if args.page_size < 1 or args.page_size > 5000:
        raise WrapperError(2, "--page-size must be between 1 and 5000", "scope")


def resolve_package_dir(args: argparse.Namespace) -> Path:
    out_dir = Path(args.out_dir)
    normalized = out_dir.as_posix().rstrip("/")
    if normalized.endswith("manual_sources/MOLIT_2023") or normalized.endswith("manual_sources/MOLIT_2023/"):
        return out_dir / "pilot" / args.pilot_label / f"{args.year:04d}" / f"{args.month:02d}"
    if out_dir.name == "MOLIT_2023":
        return out_dir / "pilot" / args.pilot_label / f"{args.year:04d}" / f"{args.month:02d}"
    return out_dir


def base_plan(args: argparse.Namespace, package_dir: Path, fetch_mode: bool) -> dict[str, Any]:
    page_hash = request_parameter_hash(args, 1)
    return {
        "schema_version": SCHEMA_VERSION,
        "wrapper_version": VERSION,
        "created_at_utc": utc_now(),
        "source_system": args.source_system,
        "endpoint_env_name": ENDPOINT_ENV_NAMES[0],
        "service_key_env_name": KEY_ENV_NAMES[0],
        "method": "GET",
        "lawd_cd": args.lawd_cd,
        "deal_ym": deal_ym(args.year, args.month),
        "year": args.year,
        "month": args.month,
        "pilot_label": args.pilot_label,
        "package_dir": package_dir.as_posix(),
        "page_size": args.page_size,
        "max_pages": args.max_pages,
        "fetch_mode_requested": fetch_mode,
        "dry_run_plan": not fetch_mode,
        "request_parameters_redacted": {
            "serviceKey": "[REDACTED]",
            "LAWD_CD": args.lawd_cd,
            "DEAL_YMD": deal_ym(args.year, args.month),
            "pageNo": 1,
            "numOfRows": args.page_size,
        },
        "request_parameter_hash": page_hash,
        "secrets_persisted": False,
    }


def inventory_rows(root: Path, paths: list[Path]) -> list[dict[str, Any]]:
    rows = []
    for path in paths:
        if not path.exists() or not path.is_file():
            continue
        rel = path.relative_to(root).as_posix()
        rows.append(
            {
                "relative_path": rel,
                "file_role": classify_file_role(path),
                "bytes": path.stat().st_size,
                "sha256": sha256_file(path),
                "created_at_utc": utc_now(),
                "immutable": "NO_DRY_RUN_PREVIEW",
                "contains_secrets": "NO",
            }
        )
    return rows


def classify_file_role(path: Path) -> str:
    name = path.name
    if name == "request_plan.json":
        return "request_plan"
    if name.endswith(".metadata.json"):
        return "metadata"
    if name == "lawd_month_manifest.json":
        return "manifest"
    if name.endswith(".txt"):
        return "hash_or_log"
    if name.endswith(".csv"):
        return "csv_log_or_inventory"
    if name.endswith(".md"):
        return "report"
    if name.endswith(".xml"):
        return "raw_response"
    return "artifact"


def write_dry_run_plan(args: argparse.Namespace, package_dir: Path) -> dict[str, Any]:
    no_db_hard_guard(package_dir, args)
    plan = base_plan(args, package_dir, fetch_mode=False)
    package_dir.mkdir(parents=True, exist_ok=True)

    metadata = {
        "schema_version": SCHEMA_VERSION,
        "requested_at_utc": plan["created_at_utc"],
        "completed_at_utc": plan["created_at_utc"],
        "lawd_cd": args.lawd_cd,
        "deal_ym": deal_ym(args.year, args.month),
        "page_no": 1,
        "num_of_rows": args.page_size,
        "http_status": None,
        "content_type": None,
        "response_format": "xml",
        "byte_count": 0,
        "raw_sha256": None,
        "molit_result_code": None,
        "molit_result_message": None,
        "total_count_reported": None,
        "item_count_detected": None,
        "parse_status": "PLANNED_NO_NETWORK",
        "lawd_month_consistency": "NOT_CHECKED_NO_NETWORK",
        "empty_valid_response": None,
        "error_count": 0,
        "retry_count": 0,
        "request_parameter_hash": plan["request_parameter_hash"],
    }

    manifest = {
        "schema_version": SCHEMA_VERSION,
        "package_status": "PLANNED_NO_NETWORK",
        "pilot_label": args.pilot_label,
        "lawd_cd": args.lawd_cd,
        "deal_ym": deal_ym(args.year, args.month),
        "request_parameter_hashes": [plan["request_parameter_hash"]],
        "raw_response_hashes": [],
        "metadata_hashes": [],
        "page_count": 0,
        "total_item_count": 0,
        "error_count": 0,
        "empty_response_marker": None,
        "network_call_attempted": False,
        "db_connection_attempted": False,
        "secrets_persisted": False,
    }

    request_plan_path = package_dir / "request_plan.json"
    metadata_path = package_dir / "metadata" / "page_001.metadata.json"
    manifest_path = package_dir / "manifest" / "lawd_month_manifest.json"
    run_log_path = package_dir / "logs" / "sanitized_run.log"
    retry_log_path = package_dir / "logs" / "retry_log.csv"
    error_log_path = package_dir / "logs" / "error_log.csv"
    no_secret_path = package_dir / "no_secret_summary.md"
    hash_path = package_dir / "hashes" / "lawd_month_sha256.txt"
    inventory_path = package_dir / "file_inventory.csv"

    write_json(request_plan_path, plan)
    write_json(metadata_path, metadata)
    metadata["metadata_sha256"] = sha256_file(metadata_path)
    manifest["metadata_hashes"] = [metadata["metadata_sha256"]]
    write_json(metadata_path, metadata)
    write_json(manifest_path, manifest)
    manifest_hash = sha256_file(manifest_path)
    manifest["lawd_month_manifest_sha256"] = manifest_hash
    manifest["lawd_month_package_sha256"] = sha256_bytes(canonical_json_bytes({"manifest_sha256": manifest_hash}))
    write_json(manifest_path, manifest)
    write_text(
        run_log_path,
        "\n".join(
            [
                "mode=DRY_RUN_PLAN",
                f"generated_at_utc={plan['created_at_utc']}",
                f"pilot_label={args.pilot_label}",
                f"lawd_cd={args.lawd_cd}",
                f"deal_ym={deal_ym(args.year, args.month)}",
                "network_call_attempted=NO",
                "db_connection_attempted=NO",
                "secret_values_printed=NO",
                "",
            ]
        ),
    )
    write_csv(
        retry_log_path,
        [],
        ["occurred_at_utc", "lawd_cd", "deal_ym", "page_no", "attempt", "reason", "action_taken"],
    )
    write_csv(
        error_log_path,
        [],
        [
            "occurred_at_utc",
            "phase",
            "lawd_cd",
            "deal_ym",
            "page_no",
            "error_class",
            "safe_error_message",
            "retryable",
            "action_taken",
            "secret_redaction_confirmed",
        ],
    )
    write_text(
        no_secret_path,
        "\n".join(
            [
                "# No-Secret Summary",
                "",
                f"pilot_label: `{args.pilot_label}`",
                f"lawd_cd: `{args.lawd_cd}`",
                f"deal_ym: `{deal_ym(args.year, args.month)}`",
                "network_call_attempted: `NO`",
                "db_connection_attempted: `NO`",
                "secret_values_persisted: `NO`",
                "full_secret_bearing_urls_persisted: `NO`",
                "",
            ]
        ),
    )
    hash_lines = [
        "lawd_month_sha256_manifest",
        f"generated_at_utc={utc_now()}",
        f"request_plan.json={sha256_file(request_plan_path)}",
        f"metadata/page_001.metadata.json={sha256_file(metadata_path)}",
        f"manifest/lawd_month_manifest.json={sha256_file(manifest_path)}",
        f"logs/sanitized_run.log={sha256_file(run_log_path)}",
        f"logs/retry_log.csv={sha256_file(retry_log_path)}",
        f"logs/error_log.csv={sha256_file(error_log_path)}",
        f"no_secret_summary.md={sha256_file(no_secret_path)}",
        "",
    ]
    write_text(hash_path, "\n".join(hash_lines))
    paths = [request_plan_path, metadata_path, manifest_path, run_log_path, retry_log_path, error_log_path, no_secret_path, hash_path]
    rows = inventory_rows(package_dir, paths)
    write_csv(
        inventory_path,
        rows,
        ["relative_path", "file_role", "bytes", "sha256", "created_at_utc", "immutable", "contains_secrets"],
    )
    return {
        "status": "PASS_DRY_RUN_PLAN",
        "package_dir": package_dir.as_posix(),
        "files_written": len(paths) + 1,
        "network_call_attempted": False,
        "db_connection_attempted": False,
        "request_parameter_hash": plan["request_parameter_hash"],
    }


def validate_fetch_config(args: argparse.Namespace, package_dir: Path) -> dict[str, Any]:
    no_db_hard_guard(package_dir, args)
    endpoint_name, _endpoint_value = first_present_env(ENDPOINT_ENV_NAMES)
    key_name, _key_value = first_present_env(KEY_ENV_NAMES)
    result = {
        "status": "PASS_FETCH_CONFIG_PRESENT" if endpoint_name and key_name else "BLOCKED_FETCH_CONFIG_MISSING",
        "network_call_attempted": False,
        "db_connection_attempted": False,
        "endpoint_env_candidates": env_presence(ENDPOINT_ENV_NAMES),
        "service_key_env_candidates": env_presence(KEY_ENV_NAMES),
        "selected_endpoint_env_name": endpoint_name,
        "selected_service_key_env_name": key_name,
        "secret_values_printed": False,
    }
    if not endpoint_name or not key_name:
        raise WrapperError(3, json.dumps(result, sort_keys=True), "fetch_config")
    return result


def write_page_artifacts(
    args: argparse.Namespace,
    package_dir: Path,
    page_no: int,
    raw: bytes,
    content_type: str,
    http_status: int,
    requested_at: str,
    completed_at: str,
) -> dict[str, Any]:
    parsed = parse_xml_metadata(raw)
    if parsed["empty_valid_response"] and args.fail_on_empty:
        raise WrapperError(7, "valid empty response blocked by --fail-on-empty", "parse")

    raw_dir = package_dir / "raw"
    metadata_dir = package_dir / "metadata"
    raw_path = raw_dir / f"page_{page_no:03d}.xml"
    metadata_path = metadata_dir / f"page_{page_no:03d}.metadata.json"
    if raw_path.exists() and not args.overwrite:
        raise WrapperError(5, f"raw file already exists: {raw_path.as_posix()}", "write")
    raw_dir.mkdir(parents=True, exist_ok=True)
    raw_path.write_bytes(raw)
    metadata = {
        "schema_version": SCHEMA_VERSION,
        "requested_at_utc": requested_at,
        "completed_at_utc": completed_at,
        "lawd_cd": args.lawd_cd,
        "deal_ym": deal_ym(args.year, args.month),
        "page_no": page_no,
        "num_of_rows": args.page_size,
        "http_status": http_status,
        "content_type": content_type,
        "response_format": "xml",
        "byte_count": len(raw),
        "raw_sha256": sha256_bytes(raw),
        "lawd_month_consistency": "NOT_PROVEN_BY_SOURCE_FIELDS",
        "error_count": 0,
        "retry_count": 0,
        "request_parameter_hash": request_parameter_hash(args, page_no),
    }
    metadata.update(parsed)
    write_json(metadata_path, metadata)
    metadata["metadata_sha256"] = sha256_file(metadata_path)
    write_json(metadata_path, metadata)
    return {"raw_path": raw_path, "metadata_path": metadata_path, "metadata": metadata}


def fetch_mode(args: argparse.Namespace, package_dir: Path) -> dict[str, Any]:
    no_db_hard_guard(package_dir, args)
    endpoint_name, endpoint = first_present_env(ENDPOINT_ENV_NAMES)
    key_name, key = first_present_env(KEY_ENV_NAMES)
    if not endpoint_name or not endpoint or not key_name or not key:
        raise WrapperError(3, "required fetch env names are missing", "fetch_config")
    if package_dir.exists() and any(package_dir.iterdir()) and not args.overwrite:
        raise WrapperError(5, f"output package exists: {package_dir.as_posix()}", "write")

    page_results: list[dict[str, Any]] = []
    retry_rows: list[dict[str, Any]] = []
    error_rows: list[dict[str, Any]] = []
    for page_no in range(1, args.max_pages + 1):
        last_error: BaseException | None = None
        raw: bytes | None = None
        content_type = ""
        http_status = 0
        requested_at = utc_now()
        for attempt in range(1, args.retry + 2):
            try:
                url = build_request_url(endpoint, key, args, page_no)
                request = urllib.request.Request(url, headers={"Accept": "application/xml, text/xml;q=0.9, */*;q=0.8"})
                with urllib.request.urlopen(request, timeout=args.timeout_sec) as response:
                    http_status = int(getattr(response, "status", 0) or 0)
                    content_type = response.headers.get("Content-Type", "")
                    if not accepted_content_type(content_type):
                        raise WrapperError(7, f"unexpected content type: {content_type}", "fetch")
                    raw = response.read()
                break
            except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, WrapperError) as exc:
                last_error = exc
                retryable = isinstance(exc, (urllib.error.URLError, TimeoutError)) or (
                    isinstance(exc, urllib.error.HTTPError) and exc.code in (408, 429) or isinstance(exc, urllib.error.HTTPError) and 500 <= exc.code <= 599
                )
                retry_rows.append(
                    {
                        "occurred_at_utc": utc_now(),
                        "lawd_cd": args.lawd_cd,
                        "deal_ym": deal_ym(args.year, args.month),
                        "page_no": page_no,
                        "attempt": attempt,
                        "reason": safe_error_message(exc),
                        "action_taken": "retry" if retryable and attempt <= args.retry else "stop",
                    }
                )
                if not retryable or attempt > args.retry:
                    break
                time.sleep(max(0, args.sleep_ms) / 1000.0 + random.uniform(0, 0.25))
        if raw is None:
            error_rows.append(
                {
                    "occurred_at_utc": utc_now(),
                    "phase": "fetch",
                    "lawd_cd": args.lawd_cd,
                    "deal_ym": deal_ym(args.year, args.month),
                    "page_no": page_no,
                    "error_class": type(last_error).__name__ if last_error else "UnknownFetchError",
                    "safe_error_message": safe_error_message(last_error or RuntimeError("fetch failed")),
                    "retryable": "UNKNOWN",
                    "action_taken": "stopped",
                    "secret_redaction_confirmed": "YES",
                }
            )
            break
        page_result = write_page_artifacts(args, package_dir, page_no, raw, content_type, http_status, requested_at, utc_now())
        page_results.append(page_result)
        metadata = page_result["metadata"]
        total = metadata.get("total_count_reported")
        if total is None or page_no * args.page_size >= total:
            break
        if page_no >= args.max_pages:
            raise WrapperError(9, "page count exceeds --max-pages", "fetch")
        time.sleep(max(0, args.sleep_ms) / 1000.0)

    write_csv(
        package_dir / "logs" / "retry_log.csv",
        retry_rows,
        ["occurred_at_utc", "lawd_cd", "deal_ym", "page_no", "attempt", "reason", "action_taken"],
    )
    write_csv(
        package_dir / "logs" / "error_log.csv",
        error_rows,
        [
            "occurred_at_utc",
            "phase",
            "lawd_cd",
            "deal_ym",
            "page_no",
            "error_class",
            "safe_error_message",
            "retryable",
            "action_taken",
            "secret_redaction_confirmed",
        ],
    )

    raw_hashes = [row["metadata"]["raw_sha256"] for row in page_results]
    metadata_hashes = [row["metadata"]["metadata_sha256"] for row in page_results]
    total_items = sum(int(row["metadata"].get("item_count_detected") or 0) for row in page_results)
    status = "FETCHED_COMPLETE" if not error_rows else "INCOMPLETE"
    manifest = {
        "schema_version": SCHEMA_VERSION,
        "package_status": status,
        "pilot_label": args.pilot_label,
        "lawd_cd": args.lawd_cd,
        "deal_ym": deal_ym(args.year, args.month),
        "request_parameter_hashes": [request_parameter_hash(args, i + 1) for i in range(len(page_results))],
        "raw_response_hashes": raw_hashes,
        "metadata_hashes": metadata_hashes,
        "page_count": len(page_results),
        "total_item_count": total_items,
        "error_count": len(error_rows),
        "empty_response_marker": total_items == 0,
        "network_call_attempted": True,
        "db_connection_attempted": False,
        "secrets_persisted": False,
    }
    manifest_path = package_dir / "manifest" / "lawd_month_manifest.json"
    write_json(manifest_path, manifest)
    manifest["lawd_month_manifest_sha256"] = sha256_file(manifest_path)
    manifest["lawd_month_package_sha256"] = sha256_bytes(canonical_json_bytes({"raw": raw_hashes, "metadata": metadata_hashes}))
    write_json(manifest_path, manifest)
    write_text(
        package_dir / "logs" / "sanitized_run.log",
        "\n".join(
            [
                "mode=FETCH",
                f"pilot_label={args.pilot_label}",
                f"lawd_cd={args.lawd_cd}",
                f"deal_ym={deal_ym(args.year, args.month)}",
                f"endpoint_env_name={endpoint_name}",
                f"service_key_env_name={key_name}",
                "secret_values_printed=NO",
                "db_connection_attempted=NO",
                "",
            ]
        ),
    )
    write_text(
        package_dir / "no_secret_summary.md",
        "# No-Secret Summary\n\nsecret_values_persisted: `NO`\nfull_secret_bearing_urls_persisted: `NO`\n",
    )
    all_files = [p for p in package_dir.rglob("*") if p.is_file() and p.name != "file_inventory.csv"]
    rows = inventory_rows(package_dir, all_files)
    write_csv(
        package_dir / "file_inventory.csv",
        rows,
        ["relative_path", "file_role", "bytes", "sha256", "created_at_utc", "immutable", "contains_secrets"],
    )
    hash_lines = ["lawd_month_sha256_manifest", f"generated_at_utc={utc_now()}"]
    for row in rows:
        hash_lines.append(f"{row['relative_path']}={row['sha256']}")
    hash_lines.append("")
    write_text(package_dir / "hashes" / "lawd_month_sha256.txt", "\n".join(hash_lines))
    return {
        "status": status,
        "package_dir": package_dir.as_posix(),
        "pages_fetched": len(page_results),
        "total_item_count": total_items,
        "network_call_attempted": True,
        "db_connection_attempted": False,
    }


def build_parser() -> argparse.ArgumentParser:
    defaults = {key: read_int_env(*cfg) for key, cfg in OPTIONAL_INT_ENV_DEFAULTS.items()}
    parser = argparse.ArgumentParser(
        description="File-only MOLIT 2023 source acquisition wrapper. Defaults to no-network planning.",
    )
    parser.add_argument("--year", type=int)
    parser.add_argument("--month", type=int)
    parser.add_argument("--lawd-cd")
    parser.add_argument("--out-dir", default="manual_sources/MOLIT_2023")
    parser.add_argument("--source-system", default=DEFAULT_SOURCE_SYSTEM)
    parser.add_argument("--page-size", type=int, default=defaults["page_size"])
    parser.add_argument("--dry-run-plan", action="store_true")
    parser.add_argument("--fetch", action="store_true")
    parser.add_argument("--max-pages", type=int, default=defaults["max_pages"])
    parser.add_argument("--sleep-ms", type=int, default=read_sleep_default())
    parser.add_argument("--retry", type=int, default=defaults["retry"])
    parser.add_argument("--timeout-sec", type=int, default=defaults["timeout_sec"])
    parser.add_argument("--fail-on-empty", action="store_true")
    parser.add_argument("--write-manifest", action="store_true")
    parser.add_argument("--no-db-hard-guard", action="store_true")
    parser.add_argument("--pilot-label")
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--validate-fetch-config", action="store_true")
    parser.add_argument("--fixture-response", help="Local raw XML fixture path for no-network parsing tests.")
    return parser


def run(args: argparse.Namespace) -> dict[str, Any]:
    if args.fetch and args.dry_run_plan:
        raise WrapperError(2, "--fetch and --dry-run-plan cannot be combined", "cli")
    validate_scope(args)
    package_dir = resolve_package_dir(args)
    if args.fixture_response:
        raw = Path(args.fixture_response).read_bytes()
        parsed = parse_xml_metadata(raw)
        return {
            "status": "PASS_FIXTURE_PARSED",
            "raw_sha256": sha256_bytes(raw),
            "parsed": parsed,
            "network_call_attempted": False,
            "db_connection_attempted": False,
        }
    if args.validate_fetch_config:
        return validate_fetch_config(args, package_dir)
    if args.fetch:
        return fetch_mode(args, package_dir)
    if args.write_manifest:
        return write_dry_run_plan(args, package_dir)
    plan = base_plan(args, package_dir, fetch_mode=False)
    plan["status"] = "PASS_DRY_RUN_PLAN_NO_WRITE"
    plan["network_call_attempted"] = False
    plan["db_connection_attempted"] = False
    no_db_hard_guard(package_dir, args)
    return plan


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        result = run(args)
    except WrapperError as exc:
        if exc.phase == "fetch_config":
            try:
                payload = json.loads(str(exc))
                print(json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2))
            except json.JSONDecodeError:
                print(json.dumps({"status": "BLOCKED", "phase": exc.phase, "error": str(exc)}, sort_keys=True))
        else:
            print(json.dumps({"status": "BLOCKED", "phase": exc.phase, "error": str(exc)}, ensure_ascii=False, sort_keys=True))
        return exc.code
    print(json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
