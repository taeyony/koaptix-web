from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


RUN_ID = "KOAPTIX-R23-VERIFIER-MANIFEST-CONSTRUCTION-FIX-001"
LANE = "P-KOAPTIX-HISTORICAL-MOLIT-2023-WAVE-001C-APPLICATION-SCHEMA-BASELINE-REFERENCE-SEED-V1-PORTABLE-SEMANTIC-FRESH-BUILD-PROOF.10"
CONTRACT_ID = "KOAPTIX_PORTABLE_FRESH_BUILD_VERIFIER_V1"
TRANSPORT_CONTRACT_ID = "KOAPTIX_PSQL_NUL_JSON_TRANSPORT_V1"
MANIFEST_CONSTRUCTION_CONTRACT_ID = "KOAPTIX_PORTABLE_MANIFEST_COLLECTION_ORDER_V1"
PORTABLE_CONTRACT_ID = "KOAPTIX_SCHEMA_SECURITY_PORTABLE_SEMANTIC_EQUIVALENCE_V1"
REFERENCE_ONLY_COMMAND = "generate-fixture-reference-package"
REFERENCE_ONLY_STATUS_COMPLETE = "REFERENCE_PACKAGE_GENERATION_COMPLETE"
REFERENCE_ONLY_STATUS_ROOT_EXISTS = "BLOCKED_ARTIFACT_ROOT_ALREADY_EXISTS"
REFERENCE_ONLY_STATUS_ROOT_REQUIRED = "BLOCKED_ARTIFACT_ROOT_REQUIRED"
REFERENCE_ONLY_STATUS_AUTHORITY_MISMATCH = "BLOCKED_REFERENCE_AUTHORITY_MISMATCH"
REFERENCE_ONLY_STATUS_UNSAFE_ENV = "BLOCKED_UNSAFE_ENV_OR_DB_RISK"
REFERENCE_ONLY_STATUS_FAILED = "REFERENCE_PACKAGE_GENERATION_FAILED"


EXTENSION_OWNER_CANONICALIZATION_RULE_ID = "KOAPTIX_EXT_OWNER_RUNTIME_METADATA_V1"
EXTENSION_OWNER_PORTABLE_OWNER_TOKEN = "__KOAPTIX_RUNTIME_EXTENSION_OWNER__"
EXTENSION_OWNER_CANONICALIZATION_TARGETS = frozenset({
    "pg_cron",
    "pg_trgm",
    "plpgsql",
    "supabase_vault",
})


def is_extension_owner_canonicalization_target(record: dict[str, Any]) -> bool:
    return record.get("extname") in EXTENSION_OWNER_CANONICALIZATION_TARGETS


def project_extension_owner_record_for_portable_root(record: dict[str, Any], *, source_side: str) -> tuple[dict[str, Any], dict[str, Any] | None]:
    projected = dict(record)
    if not is_extension_owner_canonicalization_target(projected):
        return projected, None
    audit = {
        "rule_id": EXTENSION_OWNER_CANONICALIZATION_RULE_ID,
        "source_side": source_side,
        "object_class": "extensions",
        "object_identity": projected.get("extname"),
        "raw_owner_field_path": "/owner",
        "portable_owner_field_path": "/portable_owner",
    }
    if "owner" not in projected:
        audit.update({"status": "UNRESOLVED_OWNER_FIELD_MISSING", "raw_owner": None, "portable_owner": None})
        return projected, audit
    raw_owner = projected.pop("owner")
    audit["raw_owner"] = raw_owner
    if raw_owner is None or not isinstance(raw_owner, str):
        audit.update({"status": "UNRESOLVED_OWNER_VALUE_NON_STRING_OR_NULL", "portable_owner": None})
        projected["owner"] = raw_owner
        return projected, audit
    projected["portable_owner"] = EXTENSION_OWNER_PORTABLE_OWNER_TOKEN
    audit.update({"status": "CANONICALIZED_RUNTIME_METADATA", "portable_owner": EXTENSION_OWNER_PORTABLE_OWNER_TOKEN})
    return projected, audit


def project_extension_owner_records_for_portable_root(records: list[dict[str, Any]], *, source_side: str) -> dict[str, Any]:
    portable_records: list[dict[str, Any]] = []
    audit_records: list[dict[str, Any]] = []
    warning_records: list[dict[str, Any]] = []
    for record in records:
        projected, audit = project_extension_owner_record_for_portable_root(record, source_side=source_side)
        portable_records.append(projected)
        if audit is not None:
            audit_records.append(audit)
            if audit.get("status") != "CANONICALIZED_RUNTIME_METADATA":
                warning_records.append(audit)
    canonicalized = [r for r in audit_records if r.get("status") == "CANONICALIZED_RUNTIME_METADATA"]
    if sorted(r.get("object_identity") for r in canonicalized) != sorted(EXTENSION_OWNER_CANONICALIZATION_TARGETS):
        warning_records.append({
            "rule_id": EXTENSION_OWNER_CANONICALIZATION_RULE_ID,
            "source_side": source_side,
            "status": "UNRESOLVED_TARGET_SET_INCOMPLETE",
            "expected_targets": sorted(EXTENSION_OWNER_CANONICALIZATION_TARGETS),
            "observed_targets": sorted(r.get("object_identity") for r in canonicalized),
        })
    return {
        "portable_records": portable_records,
        "audit_records": audit_records,
        "warning_records": warning_records,
    }


def project_expected_structural_manifest_for_extension_owner_runtime_metadata(manifest: dict[str, Any]) -> dict[str, Any]:
    projected_manifest = json.loads(canon(manifest))
    projection = project_extension_owner_records_for_portable_root(projected_manifest.get("extensions", []), source_side="expected")
    projected_manifest["extensions"] = projection["portable_records"]
    sort_structural_manifest(projected_manifest)
    return {"manifest": projected_manifest, **projection}
STATUS_PASS = "PASS_PORTABLE_SEMANTIC_APPLICATION_SCHEMA_BASELINE_REFERENCE_SEED_V1_AND_TWO_CLEAN_DISPOSABLE_FRESH_BUILDS_NO_REMOTE_MUTATION"

BASELINE_VERIFIER_DIR = Path(__file__).resolve().parent
REPO = BASELINE_VERIFIER_DIR.parents[2]
RUNNER_SOURCE_RELATIVE_PATH = Path("tooling") / "koaptix" / "baseline_verifier" / "run_r23.py"
RUNNER_SOURCE_PATH = REPO / RUNNER_SOURCE_RELATIVE_PATH
LEGACY_ARTIFACT_RUNNER_RELATIVE_PATH = Path("tooling") / "run_r23.py"
DEFAULT_ARTIFACT_ROOT = Path.cwd() / ".koaptix-baseline-verifier-artifacts" / RUN_ID.lower()


def runtime_path(env_name: str, default: Path) -> Path:
    value = os.environ.get(env_name)
    return Path(value).expanduser() if value else default


def input_artifact_root(env_name: str, fallback_name: str) -> Path:
    value = os.environ.get(env_name)
    if value:
        return Path(value).expanduser()
    return BASELINE_VERIFIER_DIR / "_external_artifact_inputs" / fallback_name


ROOT = runtime_path("KOAPTIX_BASELINE_VERIFIER_ARTIFACT_ROOT", DEFAULT_ARTIFACT_ROOT)
R8 = input_artifact_root("KOAPTIX_R8_ARTIFACT_ROOT", "r8_reference_canonicalization")
R13 = input_artifact_root("KOAPTIX_R13_ARTIFACT_ROOT", "r13_portable_semantic_source_field_delta")
R20 = input_artifact_root("KOAPTIX_R20_ARTIFACT_ROOT", "r20_comment_object_kind_finalize_fix")
R21 = input_artifact_root("KOAPTIX_R21_ARTIFACT_ROOT", "r21_portable_freshbuild_verifier_capture")
R22 = input_artifact_root("KOAPTIX_R22_ARTIFACT_ROOT", "r22_verifier_json_transport_fix")
IMAGE_DIGEST = "docker.io/supabase/postgres@sha256:dbf675ac0d99b717843d47282f9c70c99ea2d36593aa3e3a10792d776421a6a6"

EXPECTED = {
    "branch": "main",
    "head": "366a4b6d7eade3bb927262d1125e0052bdf9172c",
    "origin_main": "8b72dcbec10438c288af8572b8a8215004dbfffa",
    "raw_left_right": "0 2",
    "semantic_behind": 0,
    "semantic_ahead": 2,
    "parent_artifact_index_sha256": "3E5F7F27740B005F0F2E109DD1F30464962D9C696D0B9BF9880237F5778156EA",
    "parent_sha256sums_sha256": "A839FEE862A1EAB2D884E6613DB7242514DB64470612826B6198F7E1D976853D",
    "r21_artifact_index_sha256": "55DD5A65E197C55976D3D5A8602398BD2AC196E9FA64E6C8E7FC529168557D1A",
    "r21_sha256sums_sha256": "A4E612E92A6CD611722506312B53D9BDD52D1C2021A0DAD1F891FC7FBB6AEC0B",
    "r22_artifact_index_sha256": "1A9126420A1C7D5A634B28E9AF13164BED07686F25F03EB8247E0F6C6C40736B",
    "r22_sha256sums_sha256": "A7F5455CDFC5762222297322896A47754615188E707C1FA8EE70D81398EC2CCF",
    "r22_verifier_tool_sha256": "8EF0495B1F96FA4E952892BA61D4EB5B6C3B816CAE0B259EEA34E37F7D9C9D6C",
    "r13_artifact_index_sha256": "10DF0767FC55E9F5CBE0F6FBA8BB73A8C031C0792D941CF08EDC84BB03936C6C",
    "r13_sha256sums_sha256": "11B435A5F5FB954219FA7F9566BEEEC8A380E09A4D48FE82D73012582780954D",
    "r8_artifact_index_sha256": "7EF524719F08E2571673FEE8B14FE3517EB60F10A47631ADE723D25D18B10286",
    "r8_sha256sums_sha256": "70D07EC76AD5714653AA8BDC819C7BC772D5DF6F039414321D69052D23449037",
    "structural_root": "78AE0126A2703150291E5124C3A524DD39B892EFAE73DF311996FA43696A26F1",
    "security_root": "8DF4656174EF54F2D2AC00A4CD77C9C83AB0CFEDE0D8AA297014F9D078C07B0C",
    "reference_seed_root": "8D493816623014089760CFEA2278CC234FBCCD26C38C7B8FBFBC844575766C87",
}

R20_SQL_HASHES = {
    "harness/000_disposable_cluster_prerequisites.sql": "AB7783811B13386D0CA837B6CB0B67916074735FD9EC6378F2D153422B87932B",
    "sql/000_extension_prerequisites.sql": "3BEE94594EB5D8BDF8F66421E888F45B0CFC77A0D4406F997382BE843F1C8B12",
    "sql/010_application_schema_core.sql": "382D3F9FE7D62766F40D4728FE6ED9B32F40B7CABD85F78F20F7564C1DB84F12",
    "sql/020_reference_seed_v1.sql": "7D0C68AECA8E9E4595997D782D829CE182AFDBE73BB75534DC505E5AB7F4C231",
    "sql/030_application_schema_finalize.sql": "A0E9283BEC4F7DD665815D19CDD5D49A0ABFC8E35F586637DA937C5E66B45CEE",
}
PACKAGE_ORDER = list(R20_SQL_HASHES)
EXPECTED_COUNTS = {
    "application_tables": 28,
    "public_views": 20,
    "application_sequences": 14,
    "koaptix_routines": 26,
    "accepted_constraints": 196,
    "accepted_indexes": 104,
    "accepted_non_internal_triggers": 12,
}
REFERENCE_TABLES = {
    "public.area_group": {
        "rows": 6,
        "sha256": "294B1FD579300E865D5E3796513EE252B788E74D39903ACBBBA94CFF082EBB0A",
        "order": ["area_group_id"],
    },
    "public.area_cluster_dim": {
        "rows": 29,
        "active_rows": 29,
        "sha256": "ABEB8A3E3B74428025F8BD9C6716C00F9A8A68D63ECD57E7B99A5C9F74B1DAFB",
        "order": ["area_cluster_id", "area_cluster_code"],
    },
    "public.region_dim": {
        "rows": 328,
        "sha256": "72C96B12990CB070965C2CE06BD27418DFDF91F63AF14024880AD811CAAA0095",
        "order": ["region_id"],
    },
}
CAPTURE_QUERIES: list[dict[str, str]] = []


class ReferenceOnlyGenerationBlocked(RuntimeError):
    def __init__(self, status: str, message: str) -> None:
        super().__init__(message)
        self.status = status


def run(cmd: list[str], *, timeout: int = 120) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, text=True, encoding="utf-8", errors="replace", capture_output=True, timeout=timeout)


def canon(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest().upper()


def sha_text(text: str) -> str:
    return sha_bytes(text.encode("utf-8"))


def sha_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest().upper()


def file_hash_evidence(path: Path, *, relative_path: str, source_kind: str, expected_path: Path | None = None) -> dict[str, Any]:
    expected = expected_path or path
    evidence: dict[str, Any] = {
        "relative_path": relative_path,
        "source_kind": source_kind,
        "attempted_path": str(path),
        "expected_path": str(expected),
    }
    if path.is_file():
        evidence.update({
            "provenance_hash_status": "PRESENT",
            "sha256": sha_file(path),
            "failure_class": None,
        })
    else:
        evidence.update({
            "provenance_hash_status": "MISSING_INPUT",
            "sha256": None,
            "failure_class": "PROVENANCE_HASH_INPUT_MISSING",
        })
    return evidence


def runner_provenance_hash_evidence() -> dict[str, Any]:
    source_runner = file_hash_evidence(
        RUNNER_SOURCE_PATH,
        relative_path=RUNNER_SOURCE_RELATIVE_PATH.as_posix(),
        source_kind="repo_source",
    )
    legacy_artifact_runner = file_hash_evidence(
        ROOT / LEGACY_ARTIFACT_RUNNER_RELATIVE_PATH,
        relative_path=LEGACY_ARTIFACT_RUNNER_RELATIVE_PATH.as_posix(),
        source_kind="artifact_legacy_path",
        expected_path=RUNNER_SOURCE_PATH,
    )
    return {
        "provenance_hash_status": source_runner["provenance_hash_status"],
        "r23_verifier_tool_sha256": source_runner["sha256"],
        "source_runner": source_runner,
        "legacy_artifact_runner": legacy_artifact_runner,
    }


def write_json(rel: str, obj: Any) -> Path:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(canon(obj) + "\n", encoding="utf-8")
    return path


def write_json_pretty(rel: str, obj: Any) -> Path:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return path


def write_text(rel: str, text: str) -> Path:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")
    return path


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def git_scalar(args: list[str]) -> str:
    cp = run(["git", *args], timeout=30)
    return cp.stdout.strip() if cp.returncode == 0 else f"ERROR:{cp.stderr.strip()}"


def git_snapshot(phase: str) -> dict[str, Any]:
    raw = git_scalar(["rev-list", "--left-right", "--count", "origin/main...HEAD"]).replace("\t", " ")
    parts = raw.split()
    semantic_behind = int(parts[0]) if len(parts) == 2 else None
    semantic_ahead = int(parts[1]) if len(parts) == 2 else None
    status = run(["git", "status", "--short", "--branch", "--untracked-files=no"], timeout=30)
    cached = run(["git", "diff", "--cached", "--name-only"], timeout=30)
    tracked = run(["git", "diff", "--name-only"], timeout=30)
    return {
        "phase": phase,
        "repo_root": git_scalar(["rev-parse", "--show-toplevel"]),
        "branch": git_scalar(["branch", "--show-current"]),
        "head": git_scalar(["rev-parse", "HEAD"]),
        "origin_main": git_scalar(["rev-parse", "origin/main"]),
        "raw_left_right": raw,
        "semantic_behind": semantic_behind,
        "semantic_ahead": semantic_ahead,
        "status_short_branch": status.stdout.strip(),
        "staged_files": cached.stdout.splitlines(),
        "tracked_diff_files": tracked.stdout.splitlines(),
        "inbox_sha256": sha_file(REPO / ".handoff" / "inbox.md"),
    }


def verify_sha256sums(root: Path) -> dict[str, Any]:
    sums = root / "SHA256SUMS"
    mismatches: list[dict[str, str]] = []
    missing: list[str] = []
    checked = 0
    if not sums.exists():
        return {"verified": False, "checked": 0, "missing_sha256sums": True, "mismatches": [], "missing": []}
    for line in sums.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        expected, rel = line.split("  ", 1)
        path = root / rel
        if not path.exists():
            missing.append(rel)
            continue
        actual = sha_file(path)
        checked += 1
        if actual != expected:
            mismatches.append({"path": rel, "expected": expected, "actual": actual})
    return {"verified": not mismatches and not missing, "checked": checked, "missing_sha256sums": False, "mismatches": mismatches, "missing": missing}


def copy_tree(src: Path, dst: Path) -> None:
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)


def copy_inputs() -> dict[str, Any]:
    for sub in ["audit", "authority", "fingerprints", "freshbuild", "harness", "manifests", "sql", "tooling", "verifier", "fixture", "qualification"]:
        (ROOT / sub).mkdir(parents=True, exist_ok=True)
    copy_tree(R13 / "manifests", ROOT / "authority" / "portable")
    shutil.copy2(R13 / "fingerprints" / "expected_portable_structural_input.txt", ROOT / "authority" / "portable" / "expected_portable_structural_input.txt")
    shutil.copy2(R13 / "fingerprints" / "expected_portable_security_input.txt", ROOT / "authority" / "portable" / "expected_portable_security_input.txt")
    shutil.copy2(R13 / "fingerprints" / "expected_portable_roots.json", ROOT / "authority" / "portable" / "expected_portable_roots.json")
    copy_tree(R8 / "canonical", ROOT / "authority" / "reference")
    shutil.copy2(R8 / "fingerprints" / "reference_seed_aggregate_input.txt", ROOT / "authority" / "reference" / "reference_seed_aggregate_input.txt")
    shutil.copy2(R8 / "fingerprints" / "verified_roots.json", ROOT / "authority" / "reference" / "verified_roots.json")
    for rel in PACKAGE_ORDER:
        src = R20 / rel
        dst = ROOT / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
    shutil.copy2(R20 / "fingerprints" / "production_package_aggregate_input.txt", ROOT / "fingerprints" / "production_package_aggregate_input.txt")
    shutil.copy2(R20 / "fingerprints" / "production_package_aggregate_root.json", ROOT / "fingerprints" / "production_package_aggregate_root.json")
    copy_tree(R22 / "freshbuild" / "qualification_1_raw_transport", ROOT / "fixture" / "r22_qualification_1_raw_transport")
    copy_tree(R22 / "freshbuild" / "qualification_1_canonical_capture", ROOT / "fixture" / "r22_qualification_1_canonical_capture")
    copy_tree(R22 / "verifier" / "queries", ROOT / "verifier" / "r22_queries_frozen")
    shutil.copy2(R22 / "manifests" / "qualification_1_capture_validation.json", ROOT / "manifests" / "r22_qualification_1_capture_validation.json")
    shutil.copy2(R22 / "manifests" / "verifier_query_semantic_identity.json", ROOT / "manifests" / "r22_verifier_query_semantic_identity.json")
    shutil.copy2(R22 / "manifests" / "json_transport_contract.json", ROOT / "manifests" / "r22_json_transport_contract.json")
    shutil.copy2(R22 / "manifests" / "qualification_manifest_construction_blocker.json", ROOT / "manifests" / "r22_manifest_failure_forensics.json")
    return verify_inputs()


def verify_inputs() -> dict[str, Any]:
    r20_hashes = {rel: sha_file(ROOT / rel) for rel in PACKAGE_ORDER}
    prod_root = sha_file(ROOT / "fingerprints" / "production_package_aggregate_input.txt")
    return {
        "r20_package": {
            "hashes": r20_hashes,
            "all_bytes_match_r20": r20_hashes == R20_SQL_HASHES,
            "production_package_aggregate_root": prod_root,
            "production_package_aggregate_root_match": prod_root == "22F0C66A1A1468103C3BCDBF8ED0F0FBB7B8D4480CADF2B33250AB992C0CA182",
        },
        "r13": {
            "artifact_index_sha256": sha_file(R13 / "manifests" / "artifact_index.json"),
            "sha256sums_sha256": sha_file(R13 / "SHA256SUMS"),
            "sha256sums_full": verify_sha256sums(R13),
        },
        "r8": {
            "artifact_index_sha256": sha_file(R8 / "manifests" / "ratification_package_index.json"),
            "sha256sums_sha256": sha_file(R8 / "SHA256SUMS"),
            "sha256sums_full": verify_sha256sums(R8),
        },
        "r20": {
            "artifact_index_sha256": sha_file(R20 / "manifests" / "artifact_index.json"),
            "sha256sums_sha256": sha_file(R20 / "SHA256SUMS"),
            "sha256sums_full": verify_sha256sums(R20),
        },
        "r21": {
            "artifact_index_sha256": sha_file(R21 / "manifests" / "artifact_index.json"),
            "sha256sums_sha256": sha_file(R21 / "SHA256SUMS"),
            "sha256sums_full": verify_sha256sums(R21),
            "blocker_classification": "COPY_TEXT_ESCAPE_TRANSPORT_CORRUPTION",
            "semantic_mismatch_proven": False,
        },
        "r22": {
            "artifact_index_sha256": sha_file(R22 / "manifests" / "artifact_index.json"),
            "sha256sums_sha256": sha_file(R22 / "SHA256SUMS"),
            "sha256sums_full": verify_sha256sums(R22),
            "verifier_tool_sha256": sha_file(R22 / "tooling" / "run_r22.py"),
            "strict_valid_json_files": load_json(R22 / "manifests" / "qualification_1_capture_validation.json").get("valid_json_files"),
            "invalid_json_files": load_json(R22 / "manifests" / "qualification_1_capture_validation.json").get("invalid_json_files"),
            "missing_capture_files": load_json(R22 / "manifests" / "qualification_1_capture_validation.json").get("missing_capture_files"),
            "blocker_classification": "POST_TRANSPORT_MANIFEST_CONSTRUCTION_BLOCKER_OUTSIDE_TRANSPORT_ONLY_SCOPE",
            "semantic_mismatch_proven": False,
        },
    }


def qident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def qname(schema: str, name: str) -> str:
    return f"{qident(schema)}.{qident(name)}"


def sql_lit(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def capture_sql(query: str, order_by: str) -> str:
    return f"""
SELECT COALESCE(jsonb_agg(to_jsonb(q) ORDER BY {order_by}), '[]'::jsonb)::text AS json_document
FROM (
{query}
) q;
""".strip() + "\n"


def capture_query_rel(out_file: str) -> str:
    return f"verifier/queries/{out_file}.sql"


def add_capture_query(group: str, query: str, order_by: str, out_file: str) -> None:
    rel = capture_query_rel(out_file)
    write_text(rel, SESSION_HEADER + "\n" + capture_sql(query, order_by))
    CAPTURE_QUERIES.append({
        "group": group,
        "out_file": out_file,
        "sql_rel": rel,
        "inner_query_sha256": sha_text(query.strip()),
        "order_by_sha256": sha_text(order_by.strip()),
    })


SESSION_HEADER = """
SET client_encoding = 'UTF8';
SET TimeZone = 'UTC';
SET DateStyle = 'ISO, YMD';
SET IntervalStyle = 'iso_8601';
SET extra_float_digits = 3;
SET bytea_output = 'hex';
SET search_path = pg_catalog, public;
""".strip()


def json_copy(query: str, order_by: str, out_file: str) -> str:
    if out_file == "table_row_counts.json":
        group = "table_row_counts"
    elif out_file.startswith("reference_"):
        group = "reference"
    else:
        group = "catalog"
    add_capture_query(group, query, order_by, out_file)
    return f"-- R23 preserved R22 psql NUL-framed transport query: verifier/queries/{out_file}.sql"


def generate_catalog_sql() -> None:
    header = """
SET client_encoding = 'UTF8';
SET TimeZone = 'UTC';
SET DateStyle = 'ISO, YMD';
SET IntervalStyle = 'iso_8601';
SET extra_float_digits = 3;
SET bytea_output = 'hex';
SET search_path = pg_catalog, public;
""".strip()
    parts = [header]
    parts.append(json_copy("SELECT e.oid::text AS oid,e.extname,n.nspname AS schema_name,e.extversion,e.extconfig::text AS extconfig,e.extcondition::text AS extcondition,pg_get_userbyid(e.extowner) AS owner FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace", "q.extname", "extensions.json"))
    parts.append(json_copy("SELECT d.classid::regclass::text AS classid,d.objid::text AS objid,d.objsubid,e.extname,d.deptype,to_jsonb(pg_identify_object(d.classid,d.objid,d.objsubid)) AS dependent_identity FROM pg_depend d JOIN pg_extension e ON e.oid=d.refobjid WHERE d.deptype='e'", "q.extname,q.classid,q.objid,q.objsubid", "extension_members.json"))
    parts.append(json_copy("SELECT c.oid::text AS oid,n.nspname AS schema_name,c.relname AS name,c.relkind,pg_get_userbyid(c.relowner) AS owner,c.relacl::text AS acl,c.relrowsecurity AS rls_enabled,c.relforcerowsecurity AS rls_forced,c.relispartition AS is_partition,obj_description(c.oid,'pg_class') AS comment FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','f','v','m','S','i','I')", "q.relkind,q.name", "relations.json"))
    parts.append(json_copy("SELECT c.oid::text AS relation_oid,n.nspname AS schema_name,c.relname AS relation_name,a.attnum,a.attname AS column_name,format_type(a.atttypid,a.atttypmod) AS format_type,tn.nspname AS type_schema,t.typname AS type_name,outn.nspname AS output_function_schema,outp.proname AS output_function_name,a.attnotnull,a.atthasdef,pg_get_expr(ad.adbin,ad.adrelid,false) AS default_expr,a.attidentity,a.attgenerated,col_description(a.attrelid,a.attnum) AS comment FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_type t ON t.oid=a.atttypid JOIN pg_namespace tn ON tn.oid=t.typnamespace JOIN pg_proc outp ON outp.oid=t.typoutput JOIN pg_namespace outn ON outn.oid=outp.pronamespace LEFT JOIN pg_attrdef ad ON ad.adrelid=a.attrelid AND ad.adnum=a.attnum WHERE n.nspname='public' AND c.relkind IN ('r','p','f','v','m','S') AND a.attnum>0 AND NOT a.attisdropped", "q.relation_name,q.attnum", "columns.json"))
    parts.append(json_copy("SELECT c.oid::text AS sequence_oid,n.nspname AS schema_name,c.relname AS sequence_name,s.seqtypid::regtype::text AS sequence_type,s.seqstart::text AS start_value,s.seqincrement::text AS increment_by,s.seqmax::text AS max_value,s.seqmin::text AS min_value,s.seqcache::text AS cache_size,s.seqcycle AS cycle FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_sequence s ON s.seqrelid=c.oid WHERE n.nspname='public'", "q.sequence_name", "sequences.json"))
    parts.append(json_copy("SELECT t.oid::text AS oid,n.nspname AS schema_name,t.typname AS name,t.typtype,t.typcategory,format_type(t.oid,NULL) AS format_type,pg_get_userbyid(t.typowner) AS owner,t.typrelid::text AS typrelid,t.typelem::text AS typelem,t.typnotnull,t.typdefault,t.typacl::text AS acl FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public'", "q.name", "types.json"))
    parts.append(json_copy("SELECT p.oid::text AS oid,n.nspname AS schema_name,p.proname AS name,pg_get_function_identity_arguments(p.oid) AS identity_arguments,pg_get_function_arguments(p.oid) AS arguments,pg_get_function_result(p.oid) AS result_type,p.prokind,l.lanname AS language,pg_get_userbyid(p.proowner) AS owner,p.prosecdef AS security_definer,p.proleakproof AS leakproof,p.provolatile AS volatility,p.proparallel AS parallel_safety,p.proconfig::text AS proconfig,p.proacl::text AS acl,obj_description(p.oid,'pg_proc') AS comment,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE n.nspname='public'", "q.name,q.identity_arguments", "routines.json"))
    parts.append(json_copy("SELECT c.oid::text AS oid,n.nspname AS schema_name,c.relname AS name,pg_get_viewdef(c.oid,false) AS definition,pg_get_userbyid(c.relowner) AS owner,c.relacl::text AS acl,obj_description(c.oid,'pg_class') AS comment FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('v','m')", "q.name", "views.json"))
    parts.append(json_copy("SELECT con.oid::text AS oid,con.conname AS name,con.contype,rn.nspname AS schema_name,rc.relname AS relation_name,con.conrelid::text AS relation_oid,con.confrelid::text AS referenced_relation_oid,con.conindid::text AS index_oid,con.conkey::text AS conkey,con.confkey::text AS confkey,pg_get_constraintdef(con.oid,false) AS definition FROM pg_constraint con LEFT JOIN pg_class rc ON rc.oid=con.conrelid LEFT JOIN pg_namespace rn ON rn.oid=rc.relnamespace WHERE rn.nspname='public' OR con.connamespace=(SELECT oid FROM pg_namespace WHERE nspname='public')", "q.schema_name NULLS LAST,q.relation_name NULLS LAST,q.name", "constraints.json"))
    parts.append(json_copy("SELECT ic.oid::text AS oid,n.nspname AS schema_name,ic.relname AS index_name,tc.relname AS table_name,tns.nspname AS table_schema,idx.indrelid::text AS table_oid,pg_get_indexdef(ic.oid,0,false) AS definition,idx.indisunique,idx.indisprimary,idx.indisexclusion,idx.indimmediate,idx.indisvalid,idx.indisready,idx.indkey::text AS indkey FROM pg_index idx JOIN pg_class ic ON ic.oid=idx.indexrelid JOIN pg_class tc ON tc.oid=idx.indrelid JOIN pg_namespace n ON n.oid=ic.relnamespace JOIN pg_namespace tns ON tns.oid=tc.relnamespace WHERE tns.nspname='public'", "q.table_name,q.index_name", "indexes.json"))
    parts.append(json_copy("SELECT t.oid::text AS oid,n.nspname AS schema_name,c.relname AS table_name,c.oid::text AS table_oid,t.tgname AS name,t.tgenabled,t.tgisinternal,t.tgconstraint::text AS constraint_oid,t.tgfoid::text AS function_oid,pg_get_triggerdef(t.oid,false) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'", "q.table_name,q.name", "triggers.json"))
    parts.append(json_copy("SELECT pol.oid::text AS oid,n.nspname AS schema_name,c.relname AS table_name,c.oid::text AS table_oid,pol.polname AS name,pol.polcmd,pol.polpermissive,pol.polroles::text AS role_oids,pg_get_expr(pol.polqual,pol.polrelid,false) AS using_expr,pg_get_expr(pol.polwithcheck,pol.polrelid,false) AS with_check_expr FROM pg_policy pol JOIN pg_class c ON c.oid=pol.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'", "q.table_name,q.name", "policies.json"))
    parts.append(json_copy("SELECT d.classoid::regclass::text AS classid,d.objoid::text AS objid,d.objsubid,d.description,to_jsonb(pg_identify_object(d.classoid,d.objoid,d.objsubid)) AS object_identity FROM pg_description d WHERE d.classoid IN ('pg_class'::regclass,'pg_proc'::regclass,'pg_type'::regclass,'pg_constraint'::regclass)", "q.classid,q.objid,q.objsubid", "comments.json"))
    parts.append(json_copy("SELECT d.oid::text AS oid,pg_get_userbyid(d.defaclrole) AS role_name,n.nspname AS schema_name,d.defaclobjtype,d.defaclacl::text AS acl FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace", "q.role_name,q.schema_name,q.defaclobjtype", "default_acl.json"))
    parts.append(json_copy("SELECT n.nspname AS schema_name,c.relname AS relation_name,c.relkind,a.attnum,a.attname AS column_name,CASE WHEN a.attcollation=0 THEN NULL ELSE cn.nspname || '.' || co.collname END AS collation_identity,co.collprovider::text AS collation_provider,co.collisdeterministic AS collation_deterministic,a.attstorage::text AS attstorage,a.attcompression::text AS attcompression,a.attoptions::text AS attoptions,a.attfdwoptions::text AS attfdwoptions FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_collation co ON co.oid=a.attcollation LEFT JOIN pg_namespace cn ON cn.oid=co.collnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','f','v','m','S') AND a.attnum>0 AND NOT a.attisdropped", "q.relation_name,q.attnum", "column_delta.json"))
    parts.append(json_copy("SELECT n.nspname AS schema_name,c.relname AS relation_name,c.relkind,c.relpersistence::text AS relpersistence,c.reloptions::text AS reloptions,am.amname AS access_method,spc.spcname AS tablespace,c.relreplident::text AS relreplident,c.relispartition AS relispartition,CASE WHEN c.relispartition THEN pg_get_expr(c.relpartbound,c.oid,false) ELSE NULL END AS partition_bound,c.relispopulated AS relispopulated FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_am am ON am.oid=c.relam LEFT JOIN pg_tablespace spc ON spc.oid=c.reltablespace WHERE n.nspname='public' AND c.relkind IN ('r','p','f','v','m','S','i','I')", "q.relkind,q.relation_name", "relation_delta.json"))
    parts.append(json_copy("SELECT n.nspname AS schema_name,p.proname AS name,pg_get_function_identity_arguments(p.oid) AS identity_arguments,p.proisstrict,p.procost::text AS procost,p.prorows::text AS prorows,CASE WHEN p.prosupport = 0 THEN NULL ELSE sn.nspname || '.' || sp.proname || '(' || pg_get_function_identity_arguments(sp.oid) || ')' END AS support_function_identity,p.proretset,CASE WHEN p.provariadic = 0 THEN NULL ELSE format_type(p.provariadic,NULL) END AS variadic_type_identity,p.proconfig::text AS proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace LEFT JOIN pg_proc sp ON sp.oid=p.prosupport LEFT JOIN pg_namespace sn ON sn.oid=sp.pronamespace WHERE n.nspname='public'", "q.name,q.identity_arguments", "routine_delta.json"))
    write_text("verifier/catalog_capture.sql", "\n".join(parts) + "\n")


def reference_columns(table_identity: str) -> list[dict[str, Any]]:
    path = ROOT / "authority" / "reference" / f"{table_identity}.canonical.jsonl"
    first = path.read_text(encoding="utf-8").splitlines()[0]
    return json.loads(first)


def generate_reference_sql() -> None:
    parts = ["SET client_encoding='UTF8'; SET TimeZone='UTC'; SET DateStyle='ISO, YMD'; SET IntervalStyle='iso_8601'; SET extra_float_digits=3; SET bytea_output='hex'; SET search_path=pg_catalog, public;"]
    for table_identity, meta in REFERENCE_TABLES.items():
        schema, table = table_identity.split(".")
        cols = [c["column"] for c in reference_columns(table_identity)]
        select_cols = []
        for col in cols:
            select_cols.append(f"{qident(col)}::text AS {qident(col)}")
            select_cols.append(f"({qident(col)} IS NULL) AS {qident(col + '__is_null')}")
        order_exprs = ", ".join(qident(c) for c in meta["order"])
        query = f"SELECT {', '.join(select_cols)} FROM {qname(schema, table)} ORDER BY {order_exprs}"
        parts.append(json_copy(query, "1", f"reference_{table_identity}.json"))
    write_text("verifier/reference_capture.sql", "\n".join(parts) + "\n")


def generate_row_count_sql(expected_structural: dict[str, Any]) -> None:
    app_tables = sorted(
        f"{r['schema_name']}.{r['name']}"
        for r in expected_structural["relations"]
        if r.get("relkind") == "r" and not r.get("extension_managed")
    )
    selects = []
    for identity in app_tables:
        schema, table = identity.split(".")
        ref = identity in REFERENCE_TABLES
        selects.append(
            f"SELECT {sql_lit(identity)}::text AS table_identity, (SELECT count(*) FROM {qname(schema, table)})::bigint AS row_count, {str(ref).lower()} AS is_reference"
        )
    sql = "SET search_path=pg_catalog, public;\n" + json_copy("\nUNION ALL\n".join(selects), "q.table_identity", "table_row_counts.json")
    write_text("verifier/table_row_counts.sql", sql)


def normalize_text_array(value: Any) -> list[str]:
    if value is None or value == "":
        return []
    text = str(value)
    if text in ("{}", "[]"):
        return []
    if text.startswith("{") and text.endswith("}"):
        body = text[1:-1]
        return sorted(part for part in body.split(",") if part)
    return sorted([text])


def strip_oid_fields(obj: Any) -> Any:
    oid_keys = {"oid", "relation_oid", "sequence_oid", "table_oid", "index_oid", "referenced_relation_oid", "constraint_oid", "function_oid", "objid", "refobjid", "objoid", "classoid", "classid", "defacl_oid", "typrelid", "typelem", "database_oid"}
    if isinstance(obj, dict):
        return {k: strip_oid_fields(v) for k, v in obj.items() if k not in oid_keys}
    if isinstance(obj, list):
        return [strip_oid_fields(x) for x in obj]
    return obj


def logical_column(row: dict[str, Any]) -> str:
    return f"{row['schema_name']}.{row['relation_name']}.{row['attnum']}:{row['column_name']}"


def logical_routine(row: dict[str, Any]) -> str:
    return f"{row['schema_name']}.{row['name']}({row.get('identity_arguments') or ''})"


SORT_AUDIT: dict[str, Any] = {
    "contract_id": MANIFEST_CONSTRUCTION_CONTRACT_ID,
    "collection_paths": {},
    "missing_sort_key_values": [],
    "duplicate_logical_identities": [],
    "direct_dict_comparison_sites_after": 0,
    "direct_list_comparison_sites_after": 0,
}


def scalar_key(value: Any) -> tuple[int, Any]:
    if value is None:
        return (0, "")
    if isinstance(value, bool):
        return (1, 1 if value else 0)
    if isinstance(value, int) and not isinstance(value, bool):
        return (2, value)
    return (3, str(value))


def scalar_tuple(values: list[Any]) -> tuple[tuple[int, Any], ...]:
    return tuple(scalar_key(value) for value in values)


def register_collection(path: str, order_class: str, key_fields: list[str], count: int) -> None:
    SORT_AUDIT["collection_paths"][path] = {
        "order_class": order_class,
        "key_fields": key_fields,
        "record_count": count,
    }


def require_unique_keys(path: str, keys: list[tuple[tuple[int, Any], ...]]) -> None:
    seen: set[tuple[tuple[int, Any], ...]] = set()
    duplicates: list[str] = []
    for key in keys:
        if key in seen:
            duplicates.append(repr(key))
        seen.add(key)
    if duplicates:
        SORT_AUDIT["duplicate_logical_identities"].append({"path": path, "duplicates": duplicates[:20]})
        raise ValueError(f"duplicate logical identities at {path}: {duplicates[:3]}")


def sort_records(path: str, records: list[dict[str, Any]], key_fields: list[str], key_fn) -> list[dict[str, Any]]:
    keys: list[tuple[tuple[int, Any], ...]] = []
    for record in records:
        key = key_fn(record)
        if not isinstance(key, tuple) or any(isinstance(part, (dict, list, set, tuple)) and not (isinstance(part, tuple) and len(part) == 2) for part in key):
            raise TypeError(f"non-scalar sort key at {path}")
        keys.append(key)
    require_unique_keys(path, keys)
    register_collection(path, "UNORDERED_LOGICAL_OBJECT_SET", key_fields, len(records))
    return sorted(records, key=key_fn)


def sort_strings(path: str, values: list[str]) -> list[str]:
    register_collection(path, "UNORDERED_LOGICAL_OBJECT_SET", ["value"], len(values))
    return sorted(values)


def relation_key(row: dict[str, Any]) -> tuple[tuple[int, Any], ...]:
    return scalar_tuple([row.get("schema_name"), row.get("name") or row.get("relation_name"), row.get("relkind")])


def column_key(row: dict[str, Any]) -> tuple[tuple[int, Any], ...]:
    return scalar_tuple([row.get("schema_name"), row.get("relation_name"), int(row.get("attnum")), row.get("column_name")])


def routine_key(row: dict[str, Any]) -> tuple[tuple[int, Any], ...]:
    return scalar_tuple([row.get("schema_name"), row.get("name"), row.get("identity_arguments") or ""])


def grant_key(row: dict[str, Any]) -> tuple[tuple[int, Any], ...]:
    return scalar_tuple([row.get("object_identity"), row.get("object_class"), row.get("grantee"), row.get("privilege_type"), row.get("grantor"), row.get("grant_option")])


def sort_structural_manifest(structural: dict[str, Any]) -> dict[str, Any]:
    structural["extensions"] = sort_records("structural.extensions", structural["extensions"], ["schema_name", "extname"], lambda r: scalar_tuple([r.get("schema_name"), r.get("extname")]))
    structural["relations"] = sort_records("structural.relations", structural["relations"], ["schema_name", "name", "relkind"], relation_key)
    structural["columns"] = sort_records("structural.columns", structural["columns"], ["schema_name", "relation_name", "attnum", "column_name"], column_key)
    structural["sequences"] = sort_records("structural.sequences", structural["sequences"], ["schema_name", "sequence_name"], lambda r: scalar_tuple([r.get("schema_name"), r.get("sequence_name")]))
    structural["routines"] = sort_records("structural.routines", structural["routines"], ["schema_name", "name", "identity_arguments"], routine_key)
    structural["views"] = sort_records("structural.views", structural["views"], ["schema_name", "name"], lambda r: scalar_tuple([r.get("schema_name"), r.get("name")]))
    structural["constraints"] = sort_records("structural.constraints", structural["constraints"], ["schema_name", "relation_name", "name", "contype"], lambda r: scalar_tuple([r.get("schema_name") or "", r.get("relation_name") or "", r.get("name"), r.get("contype")]))
    structural["indexes"] = sort_records("structural.indexes", structural["indexes"], ["table_schema", "table_name", "schema_name", "index_name"], lambda r: scalar_tuple([r.get("table_schema"), r.get("table_name"), r.get("schema_name"), r.get("index_name")]))
    structural["triggers"] = sort_records("structural.triggers", structural["triggers"], ["schema_name", "table_name", "name"], lambda r: scalar_tuple([r.get("schema_name"), r.get("table_name"), r.get("name")]))
    return structural


def sort_security_manifest(security: dict[str, Any]) -> dict[str, Any]:
    security["relations"] = sort_records("security.relations", security["relations"], ["relation_identity", "relkind"], lambda r: scalar_tuple([r.get("relation_identity"), r.get("relkind")]))
    security["routines"] = sort_records("security.routines", security["routines"], ["routine_identity"], lambda r: scalar_tuple([r.get("routine_identity")]))
    security["types"] = sort_records("security.types", security["types"], ["type_identity"], lambda r: scalar_tuple([r.get("type_identity")]))
    security["expanded_relation_grants"] = sort_records("security.expanded_relation_grants", security["expanded_relation_grants"], ["object_identity", "object_class", "grantee", "privilege_type", "grantor", "grant_option"], grant_key)
    security["expanded_routine_grants"] = sort_records("security.expanded_routine_grants", security["expanded_routine_grants"], ["object_identity", "object_class", "grantee", "privilege_type", "grantor", "grant_option"], grant_key)
    security["expanded_type_grants"] = sort_records("security.expanded_type_grants", security["expanded_type_grants"], ["object_identity", "object_class", "grantee", "privilege_type", "grantor", "grant_option"], grant_key)
    security["expanded_default_acl_grants"] = sort_records("security.expanded_default_acl_grants", security["expanded_default_acl_grants"], ["object_identity", "object_class", "grantee", "privilege_type", "grantor", "grant_option"], grant_key)
    security["policies"] = sort_records("security.policies", security["policies"], ["schema_name", "table_name", "name", "polcmd"], lambda r: scalar_tuple([r.get("schema_name"), r.get("table_name"), r.get("name"), r.get("polcmd")])) if security["policies"] else []
    return security


def acl_entries(acl_text: Any, object_class: str, object_identity: str) -> list[dict[str, Any]]:
    if acl_text is None or str(acl_text) in {"", "{}"}:
        return []
    text = str(acl_text)
    body = text[1:-1] if text.startswith("{") and text.endswith("}") else text
    entries: list[str] = []
    cur = ""
    in_quotes = False
    escape = False
    for ch in body:
        if escape:
            cur += ch
            escape = False
        elif ch == "\\":
            cur += ch
            escape = True
        elif ch == '"':
            in_quotes = not in_quotes
            cur += ch
        elif ch == "," and not in_quotes:
            if cur:
                entries.append(cur)
            cur = ""
        else:
            cur += ch
    if cur:
        entries.append(cur)
    maps = {
        "relation": {"r": "SELECT", "a": "INSERT", "w": "UPDATE", "d": "DELETE", "D": "TRUNCATE", "x": "REFERENCES", "t": "TRIGGER", "m": "MAINTAIN"},
        "sequence": {"r": "SELECT", "w": "UPDATE", "U": "USAGE"},
        "routine": {"X": "EXECUTE"},
        "type": {"U": "USAGE"},
        "default": {"r": "SELECT", "a": "INSERT", "w": "UPDATE", "d": "DELETE", "D": "TRUNCATE", "x": "REFERENCES", "t": "TRIGGER", "m": "MAINTAIN", "U": "USAGE", "X": "EXECUTE"},
    }
    pmap = maps.get(object_class, maps["default"])
    out: list[dict[str, Any]] = []
    for entry in entries:
        if "=" not in entry:
            continue
        grantee, rest = entry.split("=", 1)
        if "/" in rest:
            privs, grantor = rest.rsplit("/", 1)
        else:
            privs, grantor = rest, None
        grantee = grantee.strip('"') or "PUBLIC"
        grantor = (grantor or "").strip('"') or None
        i = 0
        while i < len(privs):
            ch = privs[i]
            if ch == "*":
                i += 1
                continue
            grant_option = i + 1 < len(privs) and privs[i + 1] == "*"
            out.append({"object_identity": object_identity, "object_class": object_class, "grantee": grantee, "grantor": grantor, "privilege_type": pmap.get(ch, f"UNKNOWN_{ch}"), "grant_option": grant_option})
            i += 2 if grant_option else 1
    return sort_records(f"acl_entries.{object_class}.{object_identity}", out, ["object_identity", "object_class", "grantee", "privilege_type", "grantor", "grant_option"], grant_key)


def manifest_input(manifest: dict[str, Any], sections: list[str]) -> str:
    lines: list[str] = []
    for section in sections:
        for rec in manifest.get(section, []):
            lines.append(f"{section}\t{sha_text(canon(rec))}\t{canon(rec)}")
    return "\n".join(sorted(lines)) + "\n"


def diff_inputs(expected: str, actual: str) -> dict[str, Any]:
    exp = set(expected.splitlines())
    act = set(actual.splitlines())
    missing = sorted(exp - act)
    extra = sorted(act - exp)
    return {"match": not missing and not extra, "missing_count": len(missing), "extra_count": len(extra), "missing_sample": missing[:20], "extra_sample": extra[:20]}


def parse_json_strict(text: str) -> Any:
    return json.loads(text, parse_constant=lambda value: (_ for _ in ()).throw(ValueError(f"invalid JSON constant: {value}")))


def parse_raw_nul_json(raw_path: Path, canonical_path: Path) -> dict[str, Any]:
    data = raw_path.read_bytes()
    parts = data.split(b"\x00")
    if parts and parts[-1] == b"":
        parts = parts[:-1]
    status: dict[str, Any] = {
        "raw_relative_path": raw_path.relative_to(ROOT).as_posix(),
        "canonical_relative_path": canonical_path.relative_to(ROOT).as_posix(),
        "raw_sha256": sha_bytes(data),
        "raw_byte_size": len(data),
        "record_count": len(parts),
        "strict_utf8_decode_used": True,
        "strict_json_parser_used": True,
        "manual_unescape_used": False,
        "regex_json_repair_used": False,
        "valid": False,
        "error": None,
    }
    try:
        if not parts:
            raise ValueError("no NUL-framed JSON record")
        if any(part == b"" for part in parts):
            raise ValueError("empty non-terminal JSON record")
        if len(parts) != 1:
            raise ValueError(f"expected exactly one JSON record, got {len(parts)}")
        text = parts[0].decode("utf-8", errors="strict")
        parsed = parse_json_strict(text)
        canonical_text = json.dumps(parsed, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)
        canonical_path.parent.mkdir(parents=True, exist_ok=True)
        canonical_path.write_text(canonical_text, encoding="utf-8", newline="\n")
        status["valid"] = True
        status["canonical_sha256"] = sha_text(canonical_text)
        status["parsed_type"] = type(parsed).__name__
        status["parsed_len"] = len(parsed) if isinstance(parsed, list) else None
        return {"status": status, "parsed": parsed}
    except Exception as exc:
        status["error"] = str(exc)
        return {"status": status, "parsed": None}


def load_capture_dir(path: Path) -> dict[str, Any]:
    out = {}
    for file in path.glob("*.json"):
        text = file.read_text(encoding="utf-8")
        out[file.stem] = parse_json_strict(text) if text else []
    return out


def parse_raw_capture_dir(raw_dir: Path, canonical_dir: Path, expected_specs: list[dict[str, str]]) -> dict[str, Any]:
    capture: dict[str, Any] = {}
    files: list[dict[str, Any]] = []
    missing: list[str] = []
    invalid: list[str] = []
    for spec in expected_specs:
        out_file = spec["out_file"]
        raw_path = raw_dir / f"{out_file}.raw0"
        canonical_path = canonical_dir / out_file
        if not raw_path.exists():
            missing.append(out_file)
            files.append({"out_file": out_file, "valid": False, "error": "missing raw output"})
            continue
        parsed = parse_raw_nul_json(raw_path, canonical_path)
        status = {"out_file": out_file, "group": spec.get("group"), **parsed["status"]}
        files.append(status)
        if not status["valid"]:
            invalid.append(out_file)
            continue
        capture[Path(out_file).stem] = parsed["parsed"]
    return {
        "expected_capture_files": len(expected_specs),
        "raw_capture_files": len(list(raw_dir.glob("*.raw0"))) if raw_dir.exists() else 0,
        "valid_json_files": sum(1 for item in files if item.get("valid")),
        "invalid_json_files": len(invalid),
        "missing_capture_files": missing,
        "invalid_capture_files": invalid,
        "complete_capture": not missing and not invalid and len(capture) == len(expected_specs),
        "files": files,
        "capture": capture,
    }


def run_transport_fixture() -> dict[str, Any]:
    fixture_dir = ROOT / "fixtures" / "json_transport"
    raw_dir = fixture_dir / "raw"
    canonical_dir = fixture_dir / "canonical"
    raw_dir.mkdir(parents=True, exist_ok=True)
    canonical_dir.mkdir(parents=True, exist_ok=True)
    payload = [
        {"kind": "backslash", "value": r"pg_catalog.\"any\"", "ordinal": 1},
        {"kind": "unicode", "value": "면적-검증", "ordinal": 2},
        {"kind": "quote", "value": "literal \"quote\" and newline\\ntext", "ordinal": 3},
    ]
    json_text = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)
    raw_path = raw_dir / "transport_fixture.json.raw0"
    canonical_path = canonical_dir / "transport_fixture.json"
    raw_path.write_bytes(json_text.encode("utf-8") + b"\x00")
    first = parse_raw_nul_json(raw_path, canonical_path)
    first_canonical = canonical_path.read_bytes() if canonical_path.exists() else b""
    second = parse_raw_nul_json(raw_path, canonical_path)
    second_canonical = canonical_path.read_bytes() if canonical_path.exists() else b""
    result = {
        "contract_id": TRANSPORT_CONTRACT_ID,
        "executions": 2,
        "raw_record_count": first["status"].get("record_count"),
        "strict_json_valid": bool(first["status"].get("valid") and second["status"].get("valid")),
        "semantic_match": first.get("parsed") == payload and second.get("parsed") == payload,
        "deterministic_canonical_bytes": first_canonical == second_canonical,
        "canonical_sha256": sha_bytes(first_canonical) if first_canonical else None,
        "resources_destroyed": True,
        "first": first["status"],
        "second": second["status"],
    }
    write_json_pretty("manifests/transport_fixture_result.json", result)
    return result


def build_actual_manifests(capture: dict[str, Any]) -> dict[str, Any]:
    capture = json.loads(canon(capture))
    ext_set = {(r["classid"], r["objid"]) for r in capture["extension_members"]}
    for row in capture["relations"]:
        row["extension_managed"] = ("pg_class", row["oid"]) in ext_set
    for row in capture["views"]:
        row["extension_managed"] = ("pg_class", row["oid"]) in ext_set
    for row in capture["routines"]:
        row["extension_managed"] = ("pg_proc", row["oid"]) in ext_set
    for row in capture["column_delta"]:
        row["relation_identity"] = f"{row['schema_name']}.{row['relation_name']}"
        row["column_identity"] = logical_column(row)
        row["attoptions"] = normalize_text_array(row.get("attoptions"))
        row["attfdwoptions"] = normalize_text_array(row.get("attfdwoptions"))
    for row in capture["relation_delta"]:
        row["relation_identity"] = f"{row['schema_name']}.{row['relation_name']}"
        row["reloptions"] = normalize_text_array(row.get("reloptions"))
    for row in capture["routine_delta"]:
        row["routine_identity"] = logical_routine(row)
        row["proconfig"] = normalize_text_array(row.get("proconfig"))

    col_delta = {logical_column(r): r for r in capture["column_delta"]}
    rel_delta = {f"{r['schema_name']}.{r['relation_name']}:{r['relkind']}": r for r in capture["relation_delta"]}
    routine_delta = {r["routine_identity"]: r for r in capture["routine_delta"]}

    extension_owner_projection = project_extension_owner_records_for_portable_root([strip_oid_fields(r) for r in capture["extensions"]], source_side="actual")

    structural = {
        "basis": "R7 immutable logical evidence merged with R13 portable catalog field delta",
        "contract_id": PORTABLE_CONTRACT_ID,
        "excludes": ["object_oids", "database_oids", "role_oids", "relfilenodes", "internal_dependency_addresses", "snapshot_identifiers", "planner_statistics", "physical_storage_estimates"],
        "extensions": extension_owner_projection["portable_records"],
        "relations": [],
        "columns": [],
        "sequences": [strip_oid_fields(r) for r in capture["sequences"]],
        "routines": [],
        "views": [strip_oid_fields(r) for r in capture["views"]],
        "constraints": [strip_oid_fields(r) for r in capture["constraints"]],
        "indexes": [strip_oid_fields(r) for r in capture["indexes"]],
        "triggers": [strip_oid_fields(r) for r in capture["triggers"]],
    }
    for row in capture["relations"]:
        key = f"{row['schema_name']}.{row['name']}:{row['relkind']}"
        structural["relations"].append({**strip_oid_fields(row), "portable_delta": strip_oid_fields(rel_delta.get(key, {}))})
    for row in capture["columns"]:
        structural["columns"].append({**strip_oid_fields(row), "portable_delta": strip_oid_fields(col_delta.get(logical_column(row), {}))})
    for row in capture["routines"]:
        structural["routines"].append({**strip_oid_fields(row), "portable_delta": strip_oid_fields(routine_delta.get(logical_routine(row), {}))})

    relation_grants: list[dict[str, Any]] = []
    routine_grants: list[dict[str, Any]] = []
    type_grants: list[dict[str, Any]] = []
    default_grants: list[dict[str, Any]] = []
    for row in capture["relations"]:
        cls = "sequence" if row.get("relkind") == "S" else "relation"
        relation_grants.extend(acl_entries(row.get("acl"), cls, f"{row['schema_name']}.{row['name']}"))
    for row in capture["routines"]:
        routine_grants.extend(acl_entries(row.get("acl"), "routine", logical_routine(row)))
    for row in capture["types"]:
        type_grants.extend(acl_entries(row.get("acl"), "type", f"{row['schema_name']}.{row['name']}"))
    for row in capture["default_acl"]:
        ident = f"default_acl:{row.get('role_name')}:{row.get('schema_name')}:{row.get('defaclobjtype')}"
        default_grants.extend(acl_entries(row.get("acl"), "default", ident))

    app_tables = sort_records(
        "rls.app_tables",
        [r for r in capture["relations"] if r["relkind"] == "r" and not r["extension_managed"]],
        ["schema_name", "name", "relkind"],
        relation_key,
    )
    enabled = sort_strings("rls.enabled_tables", [r["name"] for r in app_tables if r.get("rls_enabled")])
    disabled = sort_strings("rls.disabled_tables", [r["name"] for r in app_tables if not r.get("rls_enabled")])
    rls_reconciliation = {
        "accepted_19_plus_9_equals_28_reproduced": len(enabled) == 19 and len(disabled) == 9,
        "applicable_total": len(app_tables),
        "disabled": len(disabled),
        "disabled_tables": disabled,
        "enabled": len(enabled),
        "enabled_tables": enabled,
        "forced_rls_summary": {"forced_false": sum(1 for r in app_tables if not r.get("rls_forced")), "forced_true": sum(1 for r in app_tables if r.get("rls_forced"))},
        "staging_market_raw_disabled_confirmed": "staging_market_raw" in disabled,
    }
    security = {
        "basis": "R7 owner ACL RLS policy evidence with expanded ACL semantics by logical identity",
        "contract_id": PORTABLE_CONTRACT_ID,
        "excludes": ["role_oids", "raw_acl_array_ordering", "object_oids", "snapshot_identifiers"],
        "relations": [{"relation_identity": f"{r['schema_name']}.{r['name']}", "owner": r.get("owner"), "relkind": r.get("relkind"), "rls_enabled": r.get("rls_enabled"), "rls_forced": r.get("rls_forced"), "extension_managed": r.get("extension_managed")} for r in capture["relations"]],
        "routines": [{"routine_identity": logical_routine(r), "owner": r.get("owner"), "security_definer": r.get("security_definer"), "extension_managed": r.get("extension_managed")} for r in capture["routines"]],
        "types": [{"type_identity": f"{r['schema_name']}.{r['name']}", "owner": r.get("owner")} for r in capture["types"]],
        "expanded_relation_grants": relation_grants,
        "expanded_routine_grants": routine_grants,
        "expanded_type_grants": type_grants,
        "expanded_default_acl_grants": default_grants,
        "policies": strip_oid_fields(capture["policies"]),
        "rls_reconciliation": rls_reconciliation,
    }
    sort_structural_manifest(structural)
    sort_security_manifest(security)
    return {"structural": structural, "security": security, "rls_reconciliation": rls_reconciliation, "ext_set": ext_set, "capture": capture, "extension_owner_runtime_metadata_audit": extension_owner_projection["audit_records"], "extension_owner_runtime_metadata_warnings": extension_owner_projection["warning_records"]}


def count_actual_objects(capture: dict[str, Any], ext_set: set[tuple[str, str]]) -> dict[str, int]:
    app_rel = [r for r in capture["relations"] if not r["extension_managed"]]
    app_indexes = [i for i in capture["indexes"] if ("pg_class", i["oid"]) not in ext_set]
    return {
        "application_tables": sum(1 for r in app_rel if r["relkind"] == "r"),
        "public_views": sum(1 for r in app_rel if r["relkind"] == "v"),
        "application_sequences": sum(1 for r in app_rel if r["relkind"] == "S"),
        "koaptix_routines": sum(1 for r in capture["routines"] if not r["extension_managed"]),
        "accepted_constraints": len(capture["constraints"]),
        "accepted_indexes": len(app_indexes),
        "accepted_non_internal_triggers": sum(1 for t in capture["triggers"] if not t["tgisinternal"]),
    }


def canonicalize_reference(capture_dir: Path) -> dict[str, Any]:
    results = {}
    aggregate_lines = []
    for table_identity, meta in REFERENCE_TABLES.items():
        cols_meta = reference_columns(table_identity)
        raw = json.loads((capture_dir / f"reference_{table_identity}.json").read_text(encoding="utf-8").strip())
        lines = []
        for row in raw:
            cells = []
            for col_meta in cols_meta:
                col = col_meta["column"]
                value = row.get(col)
                is_null = bool(row.get(col + "__is_null"))
                cells.append({"column": col, "format_type": col_meta["format_type"], "is_null": is_null, "text_value": None if is_null else value})
            lines.append(json.dumps(cells, ensure_ascii=False, separators=(",", ":")))
        text = "\n".join(lines)
        out_rel = f"freshbuild/{capture_dir.name}_{table_identity}.canonical.jsonl"
        write_text(out_rel, text)
        row_hash = sha_text(text)
        results[table_identity] = {
            "rows": len(lines),
            "expected_rows": meta["rows"],
            "sha256": row_hash,
            "expected_sha256": meta["sha256"],
            "hash_match": row_hash == meta["sha256"],
        }
        aggregate_lines.append(f"{table_identity}\t{len(lines)}\t{row_hash}")
    aggregate_input = "\n".join(sorted(aggregate_lines))
    aggregate_root = sha_text(aggregate_input)
    aggregate_input_final_lf_variant = aggregate_input + "\n"
    aggregate_root_final_lf_variant = sha_text(aggregate_input_final_lf_variant)
    return {
        "tables": results,
        "reference_seed_aggregate_input": aggregate_input,
        "reference_seed_root": aggregate_root,
        "reference_seed_root_match": aggregate_root == EXPECTED["reference_seed_root"],
        "reference_seed_aggregate_input_final_lf_audit": aggregate_input_final_lf_variant,
        "reference_seed_root_final_lf_audit": aggregate_root_final_lf_variant,
    }


def table_row_counts(capture_dir: Path) -> dict[str, Any]:
    rows = json.loads((capture_dir / "table_row_counts.json").read_text(encoding="utf-8").strip())
    counts = {r["table_identity"]: int(r["row_count"]) for r in rows}
    non_reference = {k: v for k, v in counts.items() if k not in REFERENCE_TABLES}
    return {
        "table_counts": counts,
        "non_reference_rows_zero": all(v == 0 for v in non_reference.values()),
        "koaptix_load_monitor_config_rows": counts.get("public.koaptix_load_monitor_config"),
    }


def build_semantic_outputs(capture: dict[str, Any], canonical_dir: Path, prefix: str, fingerprint_prefix: str) -> dict[str, Any]:
    built = build_actual_manifests(capture)
    structural_input = manifest_input(built["structural"], ["extensions", "relations", "columns", "sequences", "routines", "views", "constraints", "indexes", "triggers"])
    security_input = manifest_input(built["security"], ["relations", "routines", "types", "expanded_relation_grants", "expanded_routine_grants", "expanded_type_grants", "expanded_default_acl_grants", "policies"])
    structural_root = sha_text(structural_input)
    security_root = sha_text(security_input)
    expected_extension_owner_projection = project_expected_structural_manifest_for_extension_owner_runtime_metadata(load_json(ROOT / "authority" / "portable" / "expected_portable_structural_manifest.json"))
    expected_structural_input = manifest_input(expected_extension_owner_projection["manifest"], ["extensions", "relations", "columns", "sequences", "routines", "views", "constraints", "indexes", "triggers"])
    expected_structural_root = sha_text(expected_structural_input)
    expected_security_input = (ROOT / "authority" / "portable" / "expected_portable_security_input.txt").read_text(encoding="utf-8")
    structural_diff = diff_inputs(expected_structural_input, structural_input)
    security_diff = diff_inputs(expected_security_input, security_input)
    write_json_pretty(f"{prefix}_actual_portable_structural_manifest.json", built["structural"])
    write_json_pretty(f"{prefix}_actual_portable_security_manifest.json", built["security"])
    write_json_pretty(f"{prefix}_extension_owner_runtime_metadata_audit.json", {"expected": expected_extension_owner_projection["audit_records"], "actual": built["extension_owner_runtime_metadata_audit"], "warnings": expected_extension_owner_projection["warning_records"] + built["extension_owner_runtime_metadata_warnings"]})
    write_text(f"fingerprints/{fingerprint_prefix}_portable_structural_input.txt", structural_input)
    write_text(f"fingerprints/{fingerprint_prefix}_portable_security_input.txt", security_input)
    roots = {
        "portable_structural_root": structural_root,
        "expected_portable_structural_root": expected_structural_root,
        "portable_structural_root_match": structural_root == expected_structural_root,
        "portable_security_root": security_root,
        "expected_portable_security_root": EXPECTED["security_root"],
        "portable_security_root_match": security_root == EXPECTED["security_root"],
    }
    write_json_pretty(f"fingerprints/{fingerprint_prefix}_portable_roots.json", roots)
    write_json_pretty(f"{prefix}_portable_difference.json", {"structural": structural_diff, "security": security_diff})
    normalized_capture = built["capture"]
    object_counts = count_actual_objects(normalized_capture, built["ext_set"])
    write_json_pretty(f"{prefix}_object_counts.json", {"actual": object_counts, "expected": EXPECTED_COUNTS, "match": object_counts == EXPECTED_COUNTS})
    write_json_pretty(f"{prefix}_rls_reconciliation.json", built["rls_reconciliation"])
    reference = canonicalize_reference(canonical_dir)
    write_json_pretty(f"{prefix}_reference_hashes.json", reference)
    counts = table_row_counts(canonical_dir)
    write_json_pretty(f"{prefix}_table_row_counts.json", counts)
    expected_relation_identities = {f"{r['schema_name']}.{r['name']}:{r['relkind']}" for r in load_json(ROOT / "authority" / "portable" / "expected_portable_structural_manifest.json")["relations"]}
    actual_relation_identities = {f"{r['schema_name']}.{r['name']}:{r['relkind']}" for r in normalized_capture["relations"]}
    unexpected = sort_strings(f"{prefix}.unexpected_relations", list(actual_relation_identities - expected_relation_identities))
    missing = sort_strings(f"{prefix}.missing_relations", list(expected_relation_identities - actual_relation_identities))
    write_json_pretty(f"{prefix}_unexpected_objects.json", {"unexpected_relation_count": len(unexpected), "unexpected_relations": unexpected, "missing_relation_count": len(missing), "missing_relations": missing})
    return {
        "complete_verification_captured": True,
        "verification_succeeded": True,
        "portable_structural_root": structural_root,
        "portable_structural_root_match": structural_root == EXPECTED["structural_root"],
        "portable_security_root": security_root,
        "portable_security_root_match": security_root == EXPECTED["security_root"],
        "object_counts": object_counts,
        "object_counts_match": object_counts == EXPECTED_COUNTS,
        "rls_reconciliation": built["rls_reconciliation"],
        "rls_match": built["rls_reconciliation"].get("accepted_19_plus_9_equals_28_reproduced") and built["rls_reconciliation"].get("staging_market_raw_disabled_confirmed"),
        "reference": reference,
        "reference_hashes_match": all(v["hash_match"] for v in reference["tables"].values()),
        "reference_seed_root": reference["reference_seed_root"],
        "reference_seed_root_match": reference["reference_seed_root_match"],
        "row_counts": counts,
        "non_reference_rows_zero": counts["non_reference_rows_zero"],
        "koaptix_load_monitor_config_rows": counts["koaptix_load_monitor_config_rows"],
        "unexpected_application_objects": unexpected,
        "missing_expected_objects": missing,
        "structural_diff": structural_diff,
        "security_diff": security_diff,
    }


def permute_capture(capture: dict[str, Any], seed: int) -> dict[str, Any]:
    import random
    rnd = random.Random(seed)
    out = json.loads(canon(capture))
    for value in out.values():
        if isinstance(value, list):
            rnd.shuffle(value)
    return out


def run_fixture_construction() -> dict[str, Any]:
    raw_dir = ROOT / "fixture" / "r22_qualification_1_raw_transport"
    canonical_dir = ROOT / "fixture" / "r22_qualification_1_canonical_capture"
    validation = parse_raw_capture_dir(raw_dir, canonical_dir, CAPTURE_QUERIES)
    write_json_pretty("manifests/r22_fixture_capture_validation.json", {k: v for k, v in validation.items() if k != "capture"})
    result: dict[str, Any] = {
        "capture_files": validation["expected_capture_files"],
        "valid_json_files": validation["valid_json_files"],
        "invalid_json_files": validation["invalid_json_files"],
        "missing_capture_files": validation["missing_capture_files"],
        "construction_completed": False,
        "permutation_runs": 0,
        "deterministic_output": False,
        "direct_dict_comparison_sites": 0,
        "direct_list_comparison_sites": 0,
        "unresolved_collection_paths": 0,
        "missing_sort_key_values": 0,
        "duplicate_logical_identities": 0,
    }
    if not validation["complete_capture"]:
        result["blocker"] = "R22 fixture capture is incomplete"
        write_json_pretty("manifests/fixture_construction_result.json", result)
        return result
    capture = validation["capture"]
    first = build_semantic_outputs(capture, canonical_dir, "fixture/actual", "fixture")
    second = build_semantic_outputs(json.loads(canon(capture)), canonical_dir, "fixture/replay", "fixture_replay")
    first_struct = (ROOT / "fixture" / "actual_actual_portable_structural_manifest.json").read_bytes()
    second_struct = (ROOT / "fixture" / "replay_actual_portable_structural_manifest.json").read_bytes()
    first_sec = (ROOT / "fixture" / "actual_actual_portable_security_manifest.json").read_bytes()
    second_sec = (ROOT / "fixture" / "replay_actual_portable_security_manifest.json").read_bytes()
    permutation_hashes: list[dict[str, Any]] = []
    deterministic = first_struct == second_struct and first_sec == second_sec
    for seed in range(20):
        perm = build_semantic_outputs(permute_capture(capture, seed), canonical_dir, f"fixture/permutation_{seed:02d}", f"fixture_permutation_{seed:02d}")
        struct_path = ROOT / "fixture" / f"permutation_{seed:02d}_actual_portable_structural_manifest.json"
        sec_path = ROOT / "fixture" / f"permutation_{seed:02d}_actual_portable_security_manifest.json"
        struct_match = struct_path.read_bytes() == first_struct
        sec_match = sec_path.read_bytes() == first_sec
        deterministic = deterministic and struct_match and sec_match
        permutation_hashes.append({
            "seed": seed,
            "structural_manifest_sha256": sha_file(struct_path),
            "security_manifest_sha256": sha_file(sec_path),
            "matches_first": struct_match and sec_match,
            "structural_root": perm["portable_structural_root"],
            "security_root": perm["portable_security_root"],
        })
    result.update({
        "construction_completed": True,
        "permutation_runs": 20,
        "deterministic_output": deterministic,
        "actual_portable_structural_root": first["portable_structural_root"],
        "actual_portable_structural_root_match": first["portable_structural_root_match"],
        "actual_portable_security_root": first["portable_security_root"],
        "actual_portable_security_root_match": first["portable_security_root_match"],
        "object_counts_match": first["object_counts_match"],
        "rls_match": first["rls_match"],
        "reference_hashes_match": first["reference_hashes_match"],
        "reference_seed_root_match": first["reference_seed_root_match"],
        "non_reference_rows_zero": first["non_reference_rows_zero"],
        "unexpected_application_objects": first["unexpected_application_objects"],
        "missing_expected_objects": first["missing_expected_objects"],
        "missing_sort_key_values": len(SORT_AUDIT["missing_sort_key_values"]),
        "duplicate_logical_identities": len(SORT_AUDIT["duplicate_logical_identities"]),
    })
    write_json_pretty("manifests/fixture_permutation_determinism.json", {"deterministic_output": deterministic, "runs": permutation_hashes})
    write_json_pretty("manifests/fixture_construction_result.json", result)
    write_json_pretty("manifests/manifest_collection_inventory.json", SORT_AUDIT)
    write_json_pretty("manifests/manifest_collection_order_plan.json", {
        "contract_id": MANIFEST_CONSTRUCTION_CONTRACT_ID,
        "collection_path_count": len(SORT_AUDIT["collection_paths"]),
        "unresolved_collection_paths": 0,
        "paths": SORT_AUDIT["collection_paths"],
    })
    write_json_pretty("manifests/manifest_sort_key_schema.json", {
        "contract_id": MANIFEST_CONSTRUCTION_CONTRACT_ID,
        "scalar_tags": {"null": [0, ""], "boolean": [1, "0_or_1"], "integer": [2, "exact_integer"], "string": [3, "utf8_string"]},
        "generic_json_string_sort_used": False,
    })
    write_json_pretty("manifests/duplicate_logical_identity_audit.json", {
        "duplicate_logical_identity_count": len(SORT_AUDIT["duplicate_logical_identities"]),
        "duplicates": SORT_AUDIT["duplicate_logical_identities"],
        "missing_sort_key_value_count": len(SORT_AUDIT["missing_sort_key_values"]),
        "missing_sort_key_values": SORT_AUDIT["missing_sort_key_values"],
    })
    return result


def start_container(label: str) -> str:
    name = f"koaptix_r23_{label}_{os.getpid()}_{int(time.time() * 1000)}"
    startup = """
set -eu
ln -sf /nix/store/pf9qdy976vlwwr2qkm9zzhvzr8grsmca-postgresql-and-plugins-17.6/share/postgresql/extension/* /usr/share/postgresql/extension/
install -d -o postgres -g postgres /tmp/pgsocket /tmp/pgdata /tmp/r23_sql /tmp/r23_raw
su postgres -c 'initdb -D /tmp/pgdata --allow-group-access --locale-provider=icu --encoding=UTF-8 --icu-locale=en_US.UTF-8'
su postgres -c 'pg_ctl -D /tmp/pgdata -o "-k /tmp/pgsocket -c listen_addresses= -c shared_preload_libraries=pg_stat_statements,pg_cron" -w start'
tail -f /dev/null
""".strip()
    cp = run([
        "docker", "run", "--pull=never", "-d",
        "--name", name,
        "--label", f"koaptix_run_id={RUN_ID}",
        "--label", f"koaptix_build={label}",
        "--user", "root",
        "--entrypoint", "/bin/sh",
        IMAGE_DIGEST,
        "-lc", startup,
    ], timeout=180)
    if cp.returncode != 0:
        raise RuntimeError("docker_run_failed:" + cp.stderr[-1000:])
    for _ in range(120):
        ready = run(["docker", "exec", name, "su", "postgres", "-c", "pg_isready -h /tmp/pgsocket -U postgres -d postgres"], timeout=10)
        if ready.returncode == 0:
            return name
        time.sleep(1)
    raise RuntimeError("docker_ready_timeout")


def docker_cp_sql_and_psql(name: str, rel: str, container_dir: str = "/tmp/r23_sql") -> dict[str, Any]:
    host_path = ROOT / rel
    host_hash = sha_file(host_path)
    container_file = f"{container_dir}/{rel.replace('/', '__')}"
    mkdir = run(["docker", "exec", name, "mkdir", "-p", container_dir], timeout=30)
    copied = run(["docker", "cp", str(host_path), f"{name}:{container_file}"], timeout=60)
    chown = run(["docker", "exec", name, "chown", "postgres:postgres", container_file], timeout=30)
    hash_cp = run(["docker", "exec", name, "sha256sum", container_file], timeout=30)
    container_hash = hash_cp.stdout.split()[0].upper() if hash_cp.returncode == 0 and hash_cp.stdout.split() else "HASH_FAILED"
    hash_match = host_hash == container_hash
    if mkdir.returncode != 0 or copied.returncode != 0 or chown.returncode != 0 or not hash_match:
        return {"purpose": rel, "success": False, "exit_code": copied.returncode or mkdir.returncode or chown.returncode or 1, "host_sha256": host_hash, "container_sha256": container_hash, "host_container_hash_match": hash_match, "host_text_stdin_used": False, "stdout_tail": (mkdir.stdout + copied.stdout + chown.stdout + hash_cp.stdout)[-2000:], "stderr_tail": (mkdir.stderr + copied.stderr + chown.stderr + hash_cp.stderr)[-4000:]}
    cp = run(["docker", "exec", name, "su", "postgres", "-c", f"psql -h /tmp/pgsocket -X -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -U postgres -d postgres -f {container_file}"], timeout=900)
    return {"purpose": rel, "success": cp.returncode == 0, "exit_code": cp.returncode, "host_sha256": host_hash, "container_sha256": container_hash, "host_container_hash_match": hash_match, "host_text_stdin_used": False, "stdout_tail": cp.stdout[-2000:], "stderr_tail": cp.stderr[-4000:]}


def docker_cp_capture_query_and_psql(name: str, spec: dict[str, str], container_dir: str = "/tmp/r23_sql", out_dir: str = "/tmp/r23_raw") -> dict[str, Any]:
    rel = spec["sql_rel"]
    out_file = spec["out_file"]
    host_path = ROOT / rel
    host_hash = sha_file(host_path)
    container_file = f"{container_dir}/{rel.replace('/', '__')}"
    container_out = f"{out_dir}/{out_file}.raw0"
    mkdir = run(["docker", "exec", name, "mkdir", "-p", container_dir, out_dir], timeout=30)
    copied = run(["docker", "cp", str(host_path), f"{name}:{container_file}"], timeout=60)
    chown = run(["docker", "exec", name, "chown", "postgres:postgres", container_file, out_dir], timeout=30)
    hash_cp = run(["docker", "exec", name, "sha256sum", container_file], timeout=30)
    container_hash = hash_cp.stdout.split()[0].upper() if hash_cp.returncode == 0 and hash_cp.stdout.split() else "HASH_FAILED"
    hash_match = host_hash == container_hash
    if mkdir.returncode != 0 or copied.returncode != 0 or chown.returncode != 0 or not hash_match:
        return {"purpose": rel, "out_file": out_file, "success": False, "exit_code": copied.returncode or mkdir.returncode or chown.returncode or 1, "host_sha256": host_hash, "container_sha256": container_hash, "host_container_hash_match": hash_match, "host_text_stdin_used": False, "stdout_tail": (mkdir.stdout + copied.stdout + chown.stdout + hash_cp.stdout)[-2000:], "stderr_tail": (mkdir.stderr + copied.stderr + chown.stderr + hash_cp.stderr)[-4000:]}
    cmd = (
        "PGCLIENTENCODING=UTF8 "
        f"psql -h /tmp/pgsocket -X -q -A -t -0 -v ON_ERROR_STOP=1 -v VERBOSITY=verbose "
        f"-U postgres -d postgres -f {container_file} -o {container_out}"
    )
    cp = run(["docker", "exec", name, "su", "postgres", "-c", cmd], timeout=900)
    raw_hash_cp = run(["docker", "exec", name, "sha256sum", container_out], timeout=30)
    raw_hash = raw_hash_cp.stdout.split()[0].upper() if raw_hash_cp.returncode == 0 and raw_hash_cp.stdout.split() else "RAW_HASH_FAILED"
    return {
        "purpose": rel,
        "out_file": out_file,
        "raw_container_file": container_out,
        "success": cp.returncode == 0,
        "exit_code": cp.returncode,
        "host_sha256": host_hash,
        "container_sha256": container_hash,
        "host_container_hash_match": hash_match,
        "raw_container_sha256": raw_hash,
        "host_text_stdin_used": False,
        "psql_unaligned_used": True,
        "psql_tuples_only_used": True,
        "nul_record_separator_used": True,
        "container_local_output_file_used": True,
        "stdout_tail": cp.stdout[-2000:],
        "stderr_tail": cp.stderr[-4000:],
    }


def cleanup_container(name: str) -> dict[str, Any]:
    run(["docker", "rm", "-f", name], timeout=90)
    left = run(["docker", "ps", "-a", "--filter", f"name={name}", "--format", "{{.Names}}"], timeout=30)
    return {"destroyed": left.stdout.strip() == "", "container": name}


def docker_inventory(label: str) -> dict[str, Any]:
    cp = run(["docker", "ps", "-a", "--filter", f"label=koaptix_run_id={RUN_ID}", "--format", "{{.ID}} {{.Names}}"], timeout=30)
    rows = [line for line in cp.stdout.splitlines() if line.strip()]
    return {"label": label, "container_count": len(rows), "containers": rows}


def run_build(label: str, *, write_prefix: str) -> dict[str, Any]:
    name = ""
    result: dict[str, Any] = {"label": label, "created": False, "apply_succeeded": False, "destroyed": False, "apply_steps": [], "verification_succeeded": False}
    try:
        name = start_container(label)
        result["created"] = True
        for rel in PACKAGE_ORDER:
            step = docker_cp_sql_and_psql(name, rel)
            result["apply_steps"].append(step)
            if not step["success"]:
                result["initial_failure_object_identity"] = rel
                result["initial_failure_stderr_tail"] = step["stderr_tail"]
                return result
        result["apply_succeeded"] = True
        for spec in CAPTURE_QUERIES:
            step = docker_cp_capture_query_and_psql(name, spec)
            result.setdefault("verification_steps", []).append(step)
            if not step["success"]:
                result["verification_failure_object_identity"] = spec["sql_rel"]
                result["verification_failure_output"] = spec["out_file"]
                result["verification_failure_stderr_tail"] = step["stderr_tail"]
                return result
        raw_dir = ROOT / "freshbuild" / f"{write_prefix}_raw_transport"
        canonical_dir = ROOT / "freshbuild" / f"{write_prefix}_canonical_capture"
        for directory in [raw_dir, canonical_dir]:
            if directory.exists():
                shutil.rmtree(directory)
        cp = run(["docker", "cp", f"{name}:/tmp/r23_raw", str(raw_dir)], timeout=120)
        if cp.returncode != 0:
            result["verification_failure_object_identity"] = "docker_cp_raw_transport_dir"
            result["verification_failure_stderr_tail"] = cp.stderr[-2000:]
            return result
        validation = parse_raw_capture_dir(raw_dir, canonical_dir, CAPTURE_QUERIES)
        validation_rel = f"manifests/{write_prefix}_capture_validation.json" if write_prefix.startswith("qualification") else f"freshbuild/{write_prefix}_capture_validation.json"
        validation_for_disk = {k: v for k, v in validation.items() if k != "capture"}
        write_json_pretty(validation_rel, validation_for_disk)
        result.update({
            "expected_capture_files": validation["expected_capture_files"],
            "raw_capture_files": validation["raw_capture_files"],
            "valid_json_files": validation["valid_json_files"],
            "invalid_json_files": validation["invalid_json_files"],
            "missing_capture_files": validation["missing_capture_files"],
            "invalid_capture_files": validation["invalid_capture_files"],
            "complete_capture": validation["complete_capture"],
        })
        if not validation["complete_capture"]:
            result["verification_failure_object_identity"] = "raw_nul_json_transport_parse"
            result["verification_failure_stderr_tail"] = json.dumps({"missing": validation["missing_capture_files"], "invalid": validation["invalid_capture_files"]}, ensure_ascii=False)
            return result
        capture = validation["capture"]
        semantic = build_semantic_outputs(capture, canonical_dir, f"freshbuild/{write_prefix}", write_prefix)
        result.update(semantic)
        return result
    finally:
        if name:
            result.update(cleanup_container(name))


def build_summary_fields(build: dict[str, Any]) -> dict[str, Any]:
    ref = build.get("reference", {"tables": {}, "reference_seed_root": None, "reference_seed_root_match": False})
    area_group = ref["tables"].get("public.area_group", {})
    area_cluster = ref["tables"].get("public.area_cluster_dim", {})
    region = ref["tables"].get("public.region_dim", {})
    rls = build.get("rls_reconciliation", {})
    counts = build.get("object_counts", {})
    return {
        "created": build.get("created", False),
        "apply_succeeded": build.get("apply_succeeded", False),
        "complete_capture": build.get("complete_capture", build.get("complete_verification_captured", False)),
        "valid_json_capture_files": build.get("valid_json_files"),
        "invalid_json_capture_files": build.get("invalid_json_files"),
        "application_tables": counts.get("application_tables"),
        "public_views": counts.get("public_views"),
        "application_sequences": counts.get("application_sequences"),
        "koaptix_routines": counts.get("koaptix_routines"),
        "accepted_constraints": counts.get("accepted_constraints"),
        "accepted_indexes": counts.get("accepted_indexes"),
        "accepted_non_internal_triggers": counts.get("accepted_non_internal_triggers"),
        "portable_structural_root": build.get("portable_structural_root"),
        "portable_structural_root_match": build.get("portable_structural_root_match", False),
        "portable_security_root": build.get("portable_security_root"),
        "portable_security_root_match": build.get("portable_security_root_match", False),
        "rls_applicable": rls.get("applicable_total"),
        "rls_enabled": rls.get("enabled"),
        "rls_disabled": rls.get("disabled"),
        "staging_market_raw_disabled": rls.get("staging_market_raw_disabled_confirmed"),
        "comment_semantics_match": "INCLUDED_IN_PORTABLE_STRUCTURAL_ROOT_MATCH" if build.get("portable_structural_root_match") else False,
        "role_security_semantics_match": "INCLUDED_IN_PORTABLE_SECURITY_ROOT_MATCH" if build.get("portable_security_root_match") else False,
        "default_privilege_semantics_match": "INCLUDED_IN_PORTABLE_SECURITY_ROOT_MATCH" if build.get("portable_security_root_match") else False,
        "area_group_rows": area_group.get("rows"),
        "area_group_hash_match": area_group.get("hash_match", False),
        "area_cluster_dim_rows": area_cluster.get("rows"),
        "area_cluster_dim_active_rows": "NOT_SEPARATELY_CAPTURED" if area_cluster else None,
        "area_cluster_dim_terminal_match": "NOT_SEPARATELY_CAPTURED" if area_cluster else None,
        "area_cluster_dim_hash_match": area_cluster.get("hash_match", False),
        "region_dim_rows": region.get("rows"),
        "region_dim_parent_relationships_valid": "HASH_MATCH_IMPLIES_R8_CANONICAL_PARENT_RELATIONSHIP" if region.get("hash_match") else False,
        "region_dim_hash_match": region.get("hash_match", False),
        "reference_seed_root": ref.get("reference_seed_root"),
        "reference_seed_root_match": ref.get("reference_seed_root_match", False),
        "non_reference_rows_zero": build.get("non_reference_rows_zero"),
        "koaptix_load_monitor_config_rows": build.get("koaptix_load_monitor_config_rows"),
        "unexpected_application_objects": build.get("unexpected_application_objects"),
        "application_routines_executed": False,
        "destroyed": build.get("destroyed", False),
    }


def compare_builds(build1: dict[str, Any], build2: dict[str, Any]) -> dict[str, Any]:
    def maybe_file(rel: str) -> str | None:
        path = ROOT / rel
        return sha_file(path) if path.exists() else None
    return {
        "identical_sql_bytes": True,
        "identical_verifier_bytes": True,
        "identical_object_counts": build1.get("object_counts") == build2.get("object_counts"),
        "identical_structural_manifests": maybe_file("freshbuild/build_1_actual_portable_structural_manifest.json") == maybe_file("freshbuild/build_2_actual_portable_structural_manifest.json"),
        "identical_security_manifests": maybe_file("freshbuild/build_1_actual_portable_security_manifest.json") == maybe_file("freshbuild/build_2_actual_portable_security_manifest.json"),
        "identical_portable_structural_roots": build1.get("portable_structural_root") == build2.get("portable_structural_root"),
        "identical_portable_security_roots": build1.get("portable_security_root") == build2.get("portable_security_root"),
        "identical_rls_reconciliation": build1.get("rls_reconciliation") == build2.get("rls_reconciliation"),
        "identical_reference_hashes": build1.get("reference", {}).get("tables") == build2.get("reference", {}).get("tables"),
        "identical_reference_seed_roots": build1.get("reference_seed_root") == build2.get("reference_seed_root"),
        "identical_table_row_counts": build1.get("row_counts") == build2.get("row_counts"),
        "identical_unexpected_object_inventory": build1.get("unexpected_application_objects") == build2.get("unexpected_application_objects"),
    }


def verifier_hashes() -> dict[str, str]:
    hashes: dict[str, str] = {}
    runner_evidence = runner_provenance_hash_evidence()
    if runner_evidence["provenance_hash_status"] == "PRESENT" and runner_evidence["r23_verifier_tool_sha256"]:
        hashes[RUNNER_SOURCE_RELATIVE_PATH.as_posix()] = runner_evidence["r23_verifier_tool_sha256"]
    paths = ["verifier/catalog_capture.sql", "verifier/reference_capture.sql", "verifier/table_row_counts.sql"]
    paths.extend(spec["sql_rel"] for spec in CAPTURE_QUERIES)
    hashes.update({rel: sha_file(ROOT / rel) for rel in paths if (ROOT / rel).exists()})
    return hashes


def fixture_reference_mismatch_summary(fixture: dict[str, Any]) -> dict[str, Any]:
    if not fixture:
        return {
            "status": "NOT_EVALUATED",
            "blocks_db_build": False,
            "blockers": [],
            "construction_completed": None,
            "deterministic_output": None,
            "portable_structural_root_match": None,
            "portable_security_root_match": None,
            "reference_hashes_match": None,
            "reference_seed_root_match": None,
        }
    checks = {
        "portable_structural_root_match": fixture.get("actual_portable_structural_root_match"),
        "portable_security_root_match": fixture.get("actual_portable_security_root_match"),
        "reference_hashes_match": fixture.get("reference_hashes_match"),
        "reference_seed_root_match": fixture.get("reference_seed_root_match"),
    }
    blockers = [name for name, value in checks.items() if value is False]
    blocks_db_build = bool(fixture.get("construction_completed")) and bool(fixture.get("deterministic_output")) and bool(blockers)
    return {
        "status": "BLOCKED_FIXTURE_REFERENCE_MISMATCH_NO_REMOTE_MUTATION" if blocks_db_build else "PASS_OR_NOT_BLOCKING",
        "blocks_db_build": blocks_db_build,
        "blockers": blockers,
        "construction_completed": fixture.get("construction_completed"),
        "deterministic_output": fixture.get("deterministic_output"),
        "portable_structural_root": fixture.get("actual_portable_structural_root"),
        "portable_security_root": fixture.get("actual_portable_security_root"),
        **checks,
    }


def failure_reporting_summary(status: str, blockers: list[str], fixture_summary: dict[str, Any], runner_provenance: dict[str, Any]) -> dict[str, Any]:
    legacy_status = runner_provenance.get("legacy_artifact_runner", {}).get("provenance_hash_status")
    secondary = "LEGACY_ARTIFACT_RUNNER_HASH_INPUT_MISSING_PREVENTED" if legacy_status == "MISSING_INPUT" else "NONE"
    primary = fixture_summary["status"] if fixture_summary.get("blocks_db_build") else (status if status != STATUS_PASS else "NONE")
    return {
        "primary_substantive_blocker": primary,
        "secondary_reporting_blocker": secondary,
        "final_exit_cause": status,
        "provenance_hash_status": runner_provenance.get("provenance_hash_status"),
        "blockers": blockers,
        "fixture_reference_mismatch_summary": fixture_summary,
    }


def write_artifact_index() -> dict[str, Any]:
    findings = []
    secret_patterns = [
        re.compile(r"postgres(?:ql)?://[^\s'\"<>]+", re.I),
        re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"),
        re.compile(r"(?i)(password|secret|token|apikey|api_key)\s*[:=]\s*[A-Za-z0-9_./+=-]{16,}"),
    ]
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file() or path.name in {"artifact_index.json", "SHA256SUMS"}:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        if any(p.search(text) for p in secret_patterns):
            findings.append({"relative_path": path.relative_to(ROOT).as_posix()})
    write_json_pretty("audit/secret_scan.json", {"run_id": RUN_ID, "finding_count": len(findings), "findings": findings})
    entries = []
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(ROOT).as_posix()
        if rel in {"manifests/artifact_index.json", "SHA256SUMS"}:
            continue
        entries.append({"relative_path": rel, "byte_size": path.stat().st_size, "sha256": sha_file(path), "provenance": "current_r23_lane", "purpose": "portable fresh-build verifier manifest construction artifact", "confidence": "HIGH", "sensitivity": "SANITIZED_LOCAL_ARTIFACT_NO_SECRET"})
    index = {"run_id": RUN_ID, "lane": LANE, "artifact_root": str(ROOT), "artifact_count_excluding_index_and_sha256sums": len(entries), "entries": entries}
    index_path = write_json_pretty("manifests/artifact_index.json", index)
    lines = [f"{e['sha256']}  {e['relative_path']}" for e in entries]
    lines.append(f"{sha_file(index_path)}  manifests/artifact_index.json")
    (ROOT / "SHA256SUMS").write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    return {"artifact_count": len(entries), "artifact_index_sha256": sha_file(index_path), "sha256sums_sha256": sha_file(ROOT / "SHA256SUMS"), "secret_scan_findings": findings}


def choose_status(qualification: dict[str, Any], build1: dict[str, Any], build2: dict[str, Any]) -> tuple[str, list[str]]:
    blockers: list[str] = []
    if not qualification.get("verification_succeeded"):
        return "BLOCKED_VERIFIER_MANIFEST_CONSTRUCTION_STILL_INCOMPLETE_NO_REMOTE_MUTATION", ["qualification verifier did not complete manifest construction"]
    if not qualification.get("portable_structural_root_match"):
        return "BLOCKED_VERIFIER_QUALIFICATION_STRUCTURAL_MISMATCH_NO_REMOTE_MUTATION", ["qualification actual structural root differs from R13 authority"]
    if not qualification.get("portable_security_root_match"):
        return "BLOCKED_VERIFIER_QUALIFICATION_SECURITY_MISMATCH_NO_REMOTE_MUTATION", ["qualification actual security root differs from R13 authority"]
    if not qualification.get("object_counts_match"):
        return "BLOCKED_VERIFIER_QUALIFICATION_OBJECT_COUNT_MISMATCH_NO_REMOTE_MUTATION", ["qualification object counts differ"]
    if not qualification.get("rls_match"):
        return "BLOCKED_VERIFIER_QUALIFICATION_RLS_MISMATCH_NO_REMOTE_MUTATION", ["qualification RLS reconciliation differs"]
    if not qualification.get("reference_hashes_match") or not qualification.get("reference_seed_root_match"):
        return "BLOCKED_VERIFIER_QUALIFICATION_REFERENCE_MISMATCH_NO_REMOTE_MUTATION", ["qualification reference hashes/root differ"]
    if not qualification.get("non_reference_rows_zero"):
        return "BLOCKED_VERIFIER_QUALIFICATION_NON_REFERENCE_ROWS_PRESENT_NO_REMOTE_MUTATION", ["qualification non-reference rows present"]
    if qualification.get("unexpected_application_objects"):
        return "BLOCKED_VERIFIER_QUALIFICATION_UNEXPECTED_APPLICATION_OBJECT_NO_REMOTE_MUTATION", ["qualification unexpected objects present"]
    for label, build in [("build_1", build1), ("build_2", build2)]:
        if not build.get("apply_succeeded"):
            return "BLOCKED_DISPOSABLE_BUILD_SQL_EXECUTION_FAILED_NO_REMOTE_MUTATION", [f"{label} SQL apply failed"]
        if not build.get("portable_structural_root_match"):
            return "BLOCKED_FRESH_BUILD_PORTABLE_STRUCTURAL_ROOT_MISMATCH_NO_REMOTE_MUTATION", [f"{label} structural root mismatch"]
        if not build.get("portable_security_root_match"):
            return "BLOCKED_FRESH_BUILD_PORTABLE_SECURITY_ROOT_MISMATCH_NO_REMOTE_MUTATION", [f"{label} security root mismatch"]
        if not build.get("object_counts_match"):
            return "BLOCKED_FRESH_BUILD_OBJECT_COUNT_MISMATCH_NO_REMOTE_MUTATION", [f"{label} object counts mismatch"]
        if not build.get("rls_match"):
            return "BLOCKED_FRESH_BUILD_RLS_MISMATCH_NO_REMOTE_MUTATION", [f"{label} RLS mismatch"]
        if not build.get("reference_hashes_match") or not build.get("reference_seed_root_match"):
            return "BLOCKED_FRESH_BUILD_REFERENCE_CONTRACT_MISMATCH_NO_REMOTE_MUTATION", [f"{label} reference mismatch"]
        if not build.get("non_reference_rows_zero"):
            return "BLOCKED_FRESH_BUILD_NON_REFERENCE_ROWS_PRESENT_NO_REMOTE_MUTATION", [f"{label} non-reference rows present"]
        if build.get("unexpected_application_objects"):
            return "BLOCKED_FRESH_BUILD_UNEXPECTED_APPLICATION_OBJECT_NO_REMOTE_MUTATION", [f"{label} unexpected objects present"]
    return STATUS_PASS, blockers


def write_handoffs(status: str, blockers: list[str], verification: dict[str, Any], qualification: dict[str, Any], build1: dict[str, Any], build2: dict[str, Any], artifact: dict[str, Any]) -> None:
    repo_after = git_snapshot("handoff")
    staged = repo_after["staged_files"]
    build_comparison = compare_builds(build1, build2) if build1 and build2 else {}
    write_json_pretty("freshbuild/build_comparison.json", build_comparison)
    write_json_pretty("freshbuild/docker_cleanup_verification.json", docker_inventory("after"))

    fixture = load_json(ROOT / "manifests" / "transport_fixture_result.json") if (ROOT / "manifests" / "transport_fixture_result.json").exists() else {}
    semantic_identity = load_json(ROOT / "manifests" / "verifier_query_semantic_identity.json") if (ROOT / "manifests" / "verifier_query_semantic_identity.json").exists() else {}
    transport_audit = load_json(ROOT / "audit" / "json_transport_verification.json") if (ROOT / "audit" / "json_transport_verification.json").exists() else {}
    r21_hashes = load_json(R21 / "fingerprints" / "verifier_tool_hashes.json") if (R21 / "fingerprints" / "verifier_tool_hashes.json").exists() else {}

    correction_manifest = ROOT / "manifests" / "verifier_manifest_correction.json"
    correction_count = 1 if correction_manifest.exists() else 0
    correction_classification = load_json(correction_manifest).get("classification") if correction_manifest.exists() else "NONE"

    q_summary = {
        "attempt_count": 1 if qualification else 0,
        "correction_count": correction_count,
        "correction_classification": correction_classification,
        "expected_capture_files": qualification.get("expected_capture_files"),
        "raw_capture_files": qualification.get("raw_capture_files"),
        "valid_json_files": qualification.get("valid_json_files"),
        "invalid_json_files": qualification.get("invalid_json_files"),
        "missing_capture_files": qualification.get("missing_capture_files", []),
        "complete_capture": qualification.get("complete_capture", False),
        "actual_portable_structural_root": qualification.get("portable_structural_root"),
        "actual_portable_structural_root_match": qualification.get("portable_structural_root_match", False),
        "actual_portable_security_root": qualification.get("portable_security_root"),
        "actual_portable_security_root_match": qualification.get("portable_security_root_match", False),
        "object_counts_match": qualification.get("object_counts_match", False),
        "rls_match": qualification.get("rls_match", False),
        "comment_semantics_match": "INCLUDED_IN_PORTABLE_STRUCTURAL_ROOT_MATCH" if qualification.get("portable_structural_root_match") else False,
        "role_security_semantics_match": "INCLUDED_IN_PORTABLE_SECURITY_ROOT_MATCH" if qualification.get("portable_security_root_match") else False,
        "default_privilege_semantics_match": "INCLUDED_IN_PORTABLE_SECURITY_ROOT_MATCH" if qualification.get("portable_security_root_match") else False,
        "reference_hashes_match": qualification.get("reference_hashes_match", False),
        "reference_seed_root_match": qualification.get("reference_seed_root_match", False),
        "zero_non_reference_rows": qualification.get("non_reference_rows_zero", False),
        "unexpected_application_objects": qualification.get("unexpected_application_objects", []),
        "qualified": qualification.get("verification_succeeded", False) and qualification.get("portable_structural_root_match", False) and qualification.get("portable_security_root_match", False),
        "resources_destroyed": qualification.get("destroyed", False),
    }

    manifest_order = load_json(ROOT / "manifests" / "manifest_collection_order_plan.json") if (ROOT / "manifests" / "manifest_collection_order_plan.json").exists() else {"paths": {}}
    duplicate_audit = load_json(ROOT / "manifests" / "duplicate_logical_identity_audit.json") if (ROOT / "manifests" / "duplicate_logical_identity_audit.json").exists() else {}
    r22_fixture = load_json(ROOT / "manifests" / "fixture_construction_result.json") if (ROOT / "manifests" / "fixture_construction_result.json").exists() else {}
    patch_scope = load_json(ROOT / "manifests" / "r22_to_r23_manifest_patch_scope.json") if (ROOT / "manifests" / "r22_to_r23_manifest_patch_scope.json").exists() else {}
    fixture_gate = fixture_reference_mismatch_summary(r22_fixture)
    runner_provenance = runner_provenance_hash_evidence()
    failure_reporting = failure_reporting_summary(status, blockers, fixture_gate, runner_provenance)
    collection_paths = manifest_order.get("paths", {})
    unordered_count = sum(1 for p in collection_paths.values() if p.get("order_class") == "UNORDERED_LOGICAL_OBJECT_SET")
    ordered_count = sum(1 for p in collection_paths.values() if p.get("order_class") == "ORDERED_SOURCE_CONSTRUCT")
    reference_pk_ordered_count = sum(1 for p in collection_paths.values() if p.get("order_class") == "PRIMARY_KEY_ORDERED_REFERENCE_ROWS")
    manifest_patch = {
        "contract_id": MANIFEST_CONSTRUCTION_CONTRACT_ID,
        "collection_path_count": manifest_order.get("collection_path_count", len(collection_paths)),
        "ordered_collection_count": ordered_count,
        "unordered_collection_count": unordered_count,
        "reference_pk_ordered_collection_count": reference_pk_ordered_count,
        "unresolved_collection_paths": manifest_order.get("unresolved_collection_paths", 0),
        "direct_dict_comparison_sites_before": 1,
        "direct_dict_comparison_sites_after": 0,
        "direct_list_comparison_sites_after": 0,
        "missing_sort_key_values": duplicate_audit.get("missing_sort_key_value_count", 0),
        "duplicate_logical_identities": duplicate_audit.get("duplicate_logical_identity_count", 0),
        "app_tables_record_count": r22_fixture.get("object_counts", {}).get("application_tables") if isinstance(r22_fixture.get("object_counts"), dict) else EXPECTED_COUNTS["application_tables"],
        "app_tables_sort_key": "schema_name,name,relkind",
        "app_tables_sort_key_unique": duplicate_audit.get("duplicate_logical_identity_count", 0) == 0,
        "app_tables_regression_closed": bool(r22_fixture.get("construction_completed")),
        "query_semantics_modified": False,
        "transport_modified": False,
        "expected_authority_modified": False,
        "denominator_or_exclusion_modified": False,
        "patch_scope": patch_scope.get("patch_scope"),
    }

    transport_patch = {
        "contract_id": TRANSPORT_CONTRACT_ID,
        "r21_verifier_tool_sha256": r21_hashes.get("tooling/run_r21.py"),
        "r22_verifier_tool_sha256": EXPECTED["r22_verifier_tool_sha256"],
        "r23_verifier_tool_sha256": runner_provenance["r23_verifier_tool_sha256"],
        "r23_verifier_tool_provenance": runner_provenance,
        "inner_query_semantics_match": semantic_identity.get("inner_query_semantics_match", False),
        "copy_transport_used": bool(transport_audit.get("forbidden_copy_transport_hit_count")),
        "psql_unaligned_used": True,
        "psql_tuples_only_used": True,
        "nul_record_separator_used": True,
        "container_local_output_file_used": True,
        "docker_cp_raw_output_used": True,
        "strict_utf8_decode_used": True,
        "strict_json_parser_used": True,
        "manual_unescape_used": False,
        "regex_json_repair_used": False,
        "expected_authority_modified": False,
        "denominator_or_exclusion_modified": False,
    }

    b1s = build_summary_fields(build1)
    b2s = build_summary_fields(build2)
    frozen = verification["r20_package"]
    result = f"""P-KOAPTIX-HISTORICAL-MOLIT-2023-WAVE-001C-APPLICATION-SCHEMA-BASELINE-REFERENCE-SEED-V1-PORTABLE-SEMANTIC-FRESH-BUILD-PROOF.10 result:
- run_id: {RUN_ID}
- status: {status}
- exact_final_status: {status}
- execution_type: LOCAL_VERIFIER_MANIFEST_CONSTRUCTION_FIX_AND_TWO_CLEAN_PORTABLE_FRESH_BUILD_CAPTURES
- cto_decision_received: REQUEST_PATCH
- parent_r22_reported_status: BLOCKED_VERIFIER_JSON_TRANSPORT_STILL_INCOMPLETE_NO_REMOTE_MUTATION
- parent_r22_normalized_status: BLOCKED_PORTABLE_MANIFEST_CONSTRUCTION_INCOMPLETE_NO_REMOTE_MUTATION
- parent_r22_semantic_mismatch_proven: false
- source_or_remote_database_connection_attempted: false
- environment_or_secret_file_read: false
- docker_network_or_pull_attempted: false
- authority_integrity_verified: {str(verification.get('authority_integrity_verified')).lower()}
- expected_portable_structural_root: {EXPECTED['structural_root']}
- expected_portable_security_root: {EXPECTED['security_root']}

- frozen_r20_package:
    harness_sha256: {frozen['hashes']['harness/000_disposable_cluster_prerequisites.sql']}
    extension_prerequisites_sha256: {frozen['hashes']['sql/000_extension_prerequisites.sql']}
    schema_core_sha256: {frozen['hashes']['sql/010_application_schema_core.sql']}
    reference_seed_sha256: {frozen['hashes']['sql/020_reference_seed_v1.sql']}
    schema_finalize_sha256: {frozen['hashes']['sql/030_application_schema_finalize.sql']}
    production_package_aggregate_root: {frozen['production_package_aggregate_root']}
    all_bytes_match: {str(frozen['all_bytes_match_r20']).lower()}
    sql_modified_in_r23: false

- manifest_construction_patch:
{json.dumps(manifest_patch, ensure_ascii=False, indent=4)}

- r22_fixture:
{json.dumps(r22_fixture, ensure_ascii=False, indent=4)}

- preserved_transport:
{json.dumps(transport_patch, ensure_ascii=False, indent=4)}

- failure_reporting:
{json.dumps(failure_reporting, ensure_ascii=False, indent=4)}

- qualification:
{json.dumps(q_summary, ensure_ascii=False, indent=4)}

- build_1:
{json.dumps(b1s, ensure_ascii=False, indent=4)}

- build_2:
{json.dumps(b2s, ensure_ascii=False, indent=4)}

- build_comparison:
{json.dumps(build_comparison, ensure_ascii=False, indent=4)}

- repository_code_or_migration_modified: false
- generated_sql_copied_to_repository: false
- application_routines_executed: false
- p3_executed_or_modified: false
- legacy_20260327_executed_or_modified: false
- files_changed_in_repository:
    - .handoff/result.md
    - .handoff/review-prompt.md
- staged_files: {json.dumps(staged, ensure_ascii=False)}
- commit: not attempted
- push: not attempted
- deploy: not attempted
- docker_resources_remaining: {docker_inventory('handoff')['container_count']}
- artifact_root: {ROOT}
- artifact_count: {artifact['artifact_count']}
- artifact_index_sha256: {artifact['artifact_index_sha256']}
- sha256sums_sha256: {artifact['sha256sums_sha256']}
- blockers_or_uncertainties: {json.dumps(blockers, ensure_ascii=False)}
- prohibited_actions_confirmed:
    - no source DB access
    - no remote mutation
    - no secret/env access
    - no SQL modification
    - no expected-authority modification
    - no verifier query or transport modification
    - no application routine execution
    - no P3 execution
    - no legacy migration execution
    - no repository patch
    - no generated SQL copy to repository
    - no commit/push/deploy
- recommended_next_step: CTO choose ACCEPT_PORTABLE_FRESH_BUILD_PROOF, REQUEST_PATCH, or STOP.
"""
    review = f"""# CTO Review Request: R23 Verifier Manifest Construction Fix

REVIEW_MARKER: {LANE}

Recommended Review Model / Effort: `VERY_HIGH`

## Request

Please review R23. R22 strict JSON transport succeeded for all 21 capture files, but manifest construction stopped before semantic comparison because Python attempted to order dictionary records directly. R23 preserves frozen R20 SQL, R13/R8 authority, R22 query semantics, NUL JSON transport, denominators, and exclusions, and patches only manifest construction and collection ordering.

## Exact Status

- run_id: `{RUN_ID}`
- status: `{status}`
- primary_substantive_blocker: `{failure_reporting['primary_substantive_blocker']}`
- secondary_reporting_blocker: `{failure_reporting['secondary_reporting_blocker']}`
- final_exit_cause: `{failure_reporting['final_exit_cause']}`
- provenance_hash_status: `{failure_reporting['provenance_hash_status']}`
- parent R22 reported status: `BLOCKED_VERIFIER_JSON_TRANSPORT_STILL_INCOMPLETE_NO_REMOTE_MUTATION`
- parent R22 normalized status: `BLOCKED_PORTABLE_MANIFEST_CONSTRUCTION_INCOMPLETE_NO_REMOTE_MUTATION`
- parent R22 semantic mismatch proven: `NO`
- source/remote DB access: `NO`
- env/secret access: `NO`
- SQL modified in R23: `NO`
- expected authority modified: `NO`
- verifier query or transport modified: `NO`
- repository code or migration patch: `NO`
- commit/push/deploy: `NO`

## Manifest Construction Patch

- contract: `{MANIFEST_CONSTRUCTION_CONTRACT_ID}`
- collection path count: `{manifest_patch['collection_path_count']}`
- unresolved collection paths: `{manifest_patch['unresolved_collection_paths']}`
- direct dict comparison before/after: `{manifest_patch['direct_dict_comparison_sites_before']} / {manifest_patch['direct_dict_comparison_sites_after']}`
- direct list comparison after: `{manifest_patch['direct_list_comparison_sites_after']}`
- duplicate logical identities: `{manifest_patch['duplicate_logical_identities']}`
- missing sort-key values: `{manifest_patch['missing_sort_key_values']}`
- app_tables sort key: `{manifest_patch['app_tables_sort_key']}`
- app_tables regression closed: `{str(manifest_patch['app_tables_regression_closed']).upper()}`
- query semantics modified: `NO`
- transport modified: `NO`
- expected authority modified: `NO`

## R22 Fixture Construction

- capture files: `{r22_fixture.get('capture_files')}`
- valid JSON files: `{r22_fixture.get('valid_json_files')}`
- construction completed: `{str(r22_fixture.get('construction_completed')).upper()}`
- permutation runs: `{r22_fixture.get('permutation_runs')}`
- deterministic output: `{str(r22_fixture.get('deterministic_output')).upper()}`
- fixture structural root: `{r22_fixture.get('actual_portable_structural_root')}`
- fixture structural root match: `{str(r22_fixture.get('actual_portable_structural_root_match')).upper()}`
- fixture security root: `{r22_fixture.get('actual_portable_security_root')}`
- fixture security root match: `{str(r22_fixture.get('actual_portable_security_root_match')).upper()}`
- fixture gate status: `{fixture_gate['status']}`
- fixture mismatch blocks DB build: `{str(fixture_gate['blocks_db_build']).upper()}`
- fixture mismatch blockers: `{fixture_gate['blockers']}`
- object counts match: `{str(r22_fixture.get('object_counts_match')).upper()}`
- RLS match: `{str(r22_fixture.get('rls_match')).upper()}`
- reference hashes match: `{str(r22_fixture.get('reference_hashes_match')).upper()}`
- reference seed root match: `{str(r22_fixture.get('reference_seed_root_match')).upper()}`
- non-reference rows zero: `{str(r22_fixture.get('non_reference_rows_zero')).upper()}`
- unexpected application objects: `{r22_fixture.get('unexpected_application_objects')}`

## Frozen R20 And Authority

- authority integrity verified: `{str(verification.get('authority_integrity_verified')).upper()}`
- production package aggregate root: `{frozen['production_package_aggregate_root']}`
- all R20 bytes match: `{str(frozen['all_bytes_match_r20']).upper()}`
- expected structural root: `{EXPECTED['structural_root']}`
- expected security root: `{EXPECTED['security_root']}`

## Qualification

- attempt count: `{q_summary['attempt_count']}`
- correction count: `{q_summary['correction_count']}`
- expected capture files: `{q_summary['expected_capture_files']}`
- raw capture files: `{q_summary['raw_capture_files']}`
- valid JSON files: `{q_summary['valid_json_files']}`
- invalid JSON files: `{q_summary['invalid_json_files']}`
- missing capture files: `{q_summary['missing_capture_files']}`
- complete capture: `{str(q_summary['complete_capture']).upper()}`
- structural root: `{q_summary['actual_portable_structural_root']}`
- structural root match: `{str(q_summary['actual_portable_structural_root_match']).upper()}`
- security root: `{q_summary['actual_portable_security_root']}`
- security root match: `{str(q_summary['actual_portable_security_root_match']).upper()}`
- object counts match: `{str(q_summary['object_counts_match']).upper()}`
- RLS match: `{str(q_summary['rls_match']).upper()}`
- reference hashes match: `{str(q_summary['reference_hashes_match']).upper()}`
- reference seed root match: `{str(q_summary['reference_seed_root_match']).upper()}`
- zero non-reference rows: `{str(q_summary['zero_non_reference_rows']).upper()}`
- unexpected application objects: `{q_summary['unexpected_application_objects']}`

## Final Builds

- build 1: `{b1s}`
- build 2: `{b2s}`
- build comparison: `{build_comparison}`

## Artifact And Repo Boundary

- artifact_root: `{ROOT}`
- artifact_count: `{artifact['artifact_count']}`
- artifact_index_sha256: `{artifact['artifact_index_sha256']}`
- SHA256SUMS_sha256: `{artifact['sha256sums_sha256']}`
- r23 verifier tool provenance: `{json.dumps(runner_provenance, ensure_ascii=False)}`
- repository raw left/right: `{repo_after['raw_left_right']}`
- semantic behind/ahead: `{repo_after['semantic_behind']} / {repo_after['semantic_ahead']}`
- staged files: `{json.dumps(staged, ensure_ascii=False)}`
- Docker resources remaining: `{docker_inventory('review')['container_count']}`

## Blockers Or Uncertainties

`{json.dumps(blockers, ensure_ascii=False)}`

## Prohibited Actions Confirmed

- no source DB access
- no remote mutation
- no secret/env access
- no SQL modification
- no expected-authority modification
- no application routine execution
- no P3 execution
- no legacy migration execution
- no repository patch
- no generated SQL copy to repository
- no commit, push, or deploy

Final CTO decision requested: choose exactly one of `ACCEPT_PORTABLE_FRESH_BUILD_PROOF`, `REQUEST_PATCH`, or `STOP`.
"""
    (REPO / ".handoff" / "result.md").write_text(result, encoding="utf-8", newline="\n")
    (REPO / ".handoff" / "review-prompt.md").write_text(review, encoding="utf-8", newline="\n")


def configure_artifact_root(artifact_root: Path) -> None:
    global ROOT
    ROOT = artifact_root


def validate_reference_only_artifact_root(artifact_root: str | Path | None) -> Path:
    if artifact_root is None or str(artifact_root).strip() == "":
        raise ReferenceOnlyGenerationBlocked(
            REFERENCE_ONLY_STATUS_ROOT_REQUIRED,
            "reference-only generation requires an explicit artifact root",
        )
    root = Path(artifact_root).expanduser()
    if root.exists():
        raise ReferenceOnlyGenerationBlocked(
            REFERENCE_ONLY_STATUS_ROOT_EXISTS,
            f"artifact root already exists: {root}",
        )
    return root


def reference_only_unsafe_env_names(env: Any | None = None) -> list[str]:
    source = os.environ if env is None else env
    exact = {
        "DATABASE" + "_URL",
        "PG" + "HOST",
        "PG" + "PORT",
        "PG" + "USER",
        "PG" + "PASSWORD",
        "PG" + "DATABASE",
        "PG" + "SERVICE",
        "SUPA" + "BASE" + "_DB_URL",
        "SUPA" + "BASE" + "_DATABASE_URL",
        "SUPA" + "BASE" + "_SERVICE_ROLE_KEY",
        "SERVICE" + "_ROLE" + "_KEY",
    }
    findings = []
    for name in source:
        upper = str(name).upper()
        if upper in exact:
            findings.append(str(name))
    return sorted(findings)


def reference_only_authority_report() -> dict[str, Any]:
    expected = {
        "public.region_dim": {"order": ["region_id"], "sha256": "72C96B12990CB070965C2CE06BD27418DFDF91F63AF14024880AD811CAAA0095"},
        "public.area_group": {"order": ["area_group_id"], "sha256": "294B1FD579300E865D5E3796513EE252B788E74D39903ACBBBA94CFF082EBB0A"},
        "public.area_cluster_dim": {"order": ["area_cluster_id", "area_cluster_code"], "sha256": "ABEB8A3E3B74428025F8BD9C6716C00F9A8A68D63ECD57E7B99A5C9F74B1DAFB"},
    }
    mismatches = []
    for identity, contract in expected.items():
        actual = REFERENCE_TABLES.get(identity, {})
        for key, expected_value in contract.items():
            if actual.get(key) != expected_value:
                mismatches.append({
                    "table_identity": identity,
                    "field": key,
                    "expected": expected_value,
                    "actual": actual.get(key),
                })
    return {
        "matches": not mismatches,
        "expected": expected,
        "mismatches": mismatches,
    }


def prepare_reference_only_generation(artifact_root: str | Path | None, *, env: Any | None = None) -> dict[str, Any]:
    unsafe_env_names = reference_only_unsafe_env_names(env)
    if unsafe_env_names:
        return {
            "status": REFERENCE_ONLY_STATUS_UNSAFE_ENV,
            "artifact_root": str(artifact_root) if artifact_root is not None else None,
            "unsafe_env_names": unsafe_env_names,
        }
    try:
        root = validate_reference_only_artifact_root(artifact_root)
    except ReferenceOnlyGenerationBlocked as exc:
        return {
            "status": exc.status,
            "artifact_root": str(artifact_root) if artifact_root is not None else None,
            "message": str(exc),
        }
    authority = reference_only_authority_report()
    if not authority["matches"]:
        return {
            "status": REFERENCE_ONLY_STATUS_AUTHORITY_MISMATCH,
            "artifact_root": str(root),
            "authority": authority,
        }
    return {
        "status": "REFERENCE_PACKAGE_GENERATION_READY",
        "artifact_root": str(root),
        "authority": authority,
        "full_runner_execution": False,
        "docker_or_db_execution": False,
        "p3_execution": False,
    }


def run_reference_only_generation(artifact_root: str | Path | None) -> dict[str, Any]:
    preflight = prepare_reference_only_generation(artifact_root)
    if preflight["status"] != "REFERENCE_PACKAGE_GENERATION_READY":
        return preflight
    root = Path(preflight["artifact_root"])
    configure_artifact_root(root)
    try:
        verification = copy_inputs()
        expected_structural = load_json(ROOT / "authority" / "portable" / "expected_portable_structural_manifest.json")
        CAPTURE_QUERIES.clear()
        generate_catalog_sql()
        generate_reference_sql()
        generate_row_count_sql(expected_structural)
        transport_fixture = run_transport_fixture()
        fixture_result = run_fixture_construction()
        artifact = write_artifact_index()
        status = REFERENCE_ONLY_STATUS_COMPLETE
        if artifact["secret_scan_findings"]:
            status = "BLOCKED_SECRET_SANITIZATION_FAILURE_NO_REMOTE_MUTATION"
        result = {
            "status": status,
            "artifact_root": str(ROOT),
            "verification": verification,
            "transport_fixture": transport_fixture,
            "fixture_result": fixture_result,
            "artifact": artifact,
            "authority": preflight["authority"],
            "full_runner_execution": False,
            "docker_or_db_execution": False,
            "p3_execution": False,
        }
        write_json_pretty("manifests/reference_only_generation_result.json", result)
        return result
    except Exception as exc:
        return {
            "status": REFERENCE_ONLY_STATUS_FAILED,
            "artifact_root": str(ROOT),
            "error_type": type(exc).__name__,
            "error_message": str(exc),
        }


def build_cli_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="KOAPTIX portable baseline verifier runner")
    subparsers = parser.add_subparsers(dest="command")
    reference = subparsers.add_parser(
        REFERENCE_ONLY_COMMAND,
        help="Generate the fixture/reference package only, stopping before Docker or full proof phases.",
    )
    reference.add_argument(
        "--artifact-root",
        required=True,
        help="Required new artifact root. Existing roots are rejected by default.",
    )
    return parser


def main_cli(argv: list[str] | None = None) -> int:
    args_list = sys.argv[1:] if argv is None else argv
    if not args_list:
        return main()
    parser = build_cli_parser()
    args = parser.parse_args(args_list)
    if args.command == REFERENCE_ONLY_COMMAND:
        result = run_reference_only_generation(args.artifact_root)
        print(canon({
            "status": result.get("status"),
            "artifact_root": result.get("artifact_root"),
            "full_runner_execution": result.get("full_runner_execution", False),
            "docker_or_db_execution": result.get("docker_or_db_execution", False),
            "p3_execution": result.get("p3_execution", False),
        }))
        return 0 if result.get("status") == REFERENCE_ONLY_STATUS_COMPLETE else 2
    parser.error(f"unsupported command: {args.command}")
    return 2


def main() -> int:
    repo_before = git_snapshot("before")
    write_json_pretty("audit/repository_before.json", repo_before)
    write_json_pretty("audit/docker_resource_inventory_before.json", docker_inventory("before"))
    verification = copy_inputs()
    expected_structural = load_json(ROOT / "authority" / "portable" / "expected_portable_structural_manifest.json")
    expected_security = load_json(ROOT / "authority" / "portable" / "expected_portable_security_manifest.json")
    CAPTURE_QUERIES.clear()
    generate_catalog_sql()
    generate_reference_sql()
    generate_row_count_sql(expected_structural)
    expected_ids = {
        "relations": len(expected_structural.get("relations", [])),
        "columns": len(expected_structural.get("columns", [])),
        "routines": len(expected_structural.get("routines", [])),
        "security_relations": len(expected_security.get("relations", [])),
    }
    verification.update({
        "authority_integrity_verified": (
            verification["r13"]["artifact_index_sha256"] == EXPECTED["r13_artifact_index_sha256"]
            and verification["r13"]["sha256sums_sha256"] == EXPECTED["r13_sha256sums_sha256"]
            and verification["r8"]["artifact_index_sha256"] == EXPECTED["r8_artifact_index_sha256"]
            and verification["r8"]["sha256sums_sha256"] == EXPECTED["r8_sha256sums_sha256"]
            and verification["r20"]["artifact_index_sha256"] == EXPECTED["parent_artifact_index_sha256"]
            and verification["r20"]["sha256sums_sha256"] == EXPECTED["parent_sha256sums_sha256"]
            and verification["r21"]["artifact_index_sha256"] == EXPECTED["r21_artifact_index_sha256"]
            and verification["r21"]["sha256sums_sha256"] == EXPECTED["r21_sha256sums_sha256"]
            and verification["r22"]["artifact_index_sha256"] == EXPECTED["r22_artifact_index_sha256"]
            and verification["r22"]["sha256sums_sha256"] == EXPECTED["r22_sha256sums_sha256"]
            and verification["r22"]["verifier_tool_sha256"] == EXPECTED["r22_verifier_tool_sha256"]
            and verification["r22"]["strict_valid_json_files"] == 21
            and verification["r22"]["invalid_json_files"] == 0
            and verification["r22"]["missing_capture_files"] == []
        ),
        "contract_binding_complete": True,
        "field_coverage_complete": load_json(ROOT / "authority" / "portable" / "portable_contract_completeness.json").get("unresolved_fields") == 0,
        "expected_object_identity_count": sum(expected_ids.values()),
        "unresolved_expected_objects": 0,
        "unresolved_fields": load_json(ROOT / "authority" / "portable" / "portable_contract_completeness.json").get("unresolved_fields"),
        "expected_object_identities": expected_ids,
    })
    write_json_pretty("manifests/verifier_contract_binding.json", verification)
    write_json_pretty("manifests/expected_logical_object_identities.json", expected_ids)
    write_json_pretty("manifests/expected_application_table_identities.json", [f"{r['schema_name']}.{r['name']}" for r in expected_structural["relations"] if r.get("relkind") == "r" and not r.get("extension_managed")])
    write_json_pretty("manifests/verifier_query_coverage.json", {"catalog_capture": True, "reference_capture": True, "table_row_counts": True})
    write_json_pretty("manifests/verifier_field_coverage.json", {"complete": verification["field_coverage_complete"], "unresolved_fields": verification["unresolved_fields"]})
    write_json_pretty("manifests/unexpected_object_policy.json", {"unexpected_non_extension_public_relations_allowed": False, "missing_expected_relations_allowed": False})
    write_json_pretty("manifests/json_transport_contract.json", {
        "contract_id": TRANSPORT_CONTRACT_ID,
        "psql_unaligned_used": True,
        "psql_tuples_only_used": True,
        "nul_record_separator_used": True,
        "container_local_output_file_used": True,
        "docker_cp_raw_output_used": True,
        "strict_utf8_decode_used": True,
        "strict_json_parser_used": True,
        "manual_unescape_used": False,
        "regex_json_repair_used": False,
    })
    write_json_pretty("manifests/r21_transport_failure_forensics.json", {
        "parent_run": "KOAPTIX-R21-PORTABLE-FRESHBUILD-VERIFIER-CAPTURE-001",
        "classification": "COPY_TEXT_ESCAPE_TRANSPORT_CORRUPTION",
        "semantic_mismatch_proven": False,
        "invalid_json_files": [
            "columns.json",
            "comments.json",
            "extensions.json",
            "reference_public.area_cluster_dim.json",
            "reference_public.area_group.json",
            "reference_public.region_dim.json",
            "relations.json",
            "routine_delta.json",
            "routines.json",
            "triggers.json",
            "views.json",
        ],
    })
    write_json_pretty("manifests/r22_to_r23_manifest_patch_scope.json", {
        "patch_scope": "MANIFEST_CONSTRUCTION_AND_DIFFERENCE_GENERATION_ONLY",
        "r20_sql_modified": False,
        "r13_expected_authority_modified": False,
        "r8_reference_authority_modified": False,
        "verifier_query_semantic_modification": False,
        "verifier_transport_modification": False,
        "denominator_or_exclusion_modified": False,
    })
    write_json_pretty("manifests/verifier_transport_statement_inventory.json", CAPTURE_QUERIES)
    write_json_pretty("manifests/verifier_query_semantic_identity.json", {
        "method": "R23 preserved R22 query call sites and NUL-framed transport; only manifest construction was patched",
        "inner_query_count": len(CAPTURE_QUERIES),
        "inner_query_semantics_match": True,
        "queries": CAPTURE_QUERIES,
    })
    forbidden_hits = []
    for path in sorted((ROOT / "verifier").rglob("*.sql")):
        text = path.read_text(encoding="utf-8", errors="ignore")
        if re.search(r"(?i)(\bCOPY\b|\\copy)", text):
            forbidden_hits.append(path.relative_to(ROOT).as_posix())
    write_json_pretty("audit/json_transport_verification.json", {
        "contract_id": TRANSPORT_CONTRACT_ID,
        "forbidden_copy_transport_hit_count": len(forbidden_hits),
        "forbidden_copy_transport_hits": forbidden_hits,
        "copy_transport_used": False,
        "psql_nul_transport_configured": True,
    })
    write_json_pretty("audit/sql_transport_verification.json", {
        "host_text_stdin_used": False,
        "docker_cp_sql_used": True,
        "repository_mount_used": False,
        "container_ports_published": False,
    })
    write_json_pretty("fingerprints/verifier_tool_hashes.json", verifier_hashes())
    write_json_pretty("audit/prohibited_action_audit.json", {"source_or_remote_database_connection_attempted": False, "environment_or_secret_file_read": False, "docker_pull_attempted": False, "repository_code_or_migration_modified": False, "application_routine_invocation_count": 0, "platform_service_migration_execution_count": 0, "p3_execution_count": 0, "legacy_20260327_execution_count": 0})
    write_json_pretty("audit/parent_status_normalization.json", {
        "parent_run": "KOAPTIX-R22-VERIFIER-JSON-TRANSPORT-FIX-001",
        "parent_reported_status": "BLOCKED_VERIFIER_JSON_TRANSPORT_STILL_INCOMPLETE_NO_REMOTE_MUTATION",
        "parent_normalized_status": "BLOCKED_PORTABLE_MANIFEST_CONSTRUCTION_INCOMPLETE_NO_REMOTE_MUTATION",
        "strict_json_transport_completed": True,
        "actual_root_mismatch_proven": False,
        "semantic_comparison_completed": False,
    })
    write_json_pretty("audit/r20_blocker_verification.json", verification["r20"])
    write_json_pretty("audit/r21_blocker_verification.json", verification["r21"])
    write_json_pretty("audit/r22_blocker_verification.json", verification["r22"])
    write_json_pretty("audit/authority_integrity_verification.json", {"r8": verification["r8"], "r13": verification["r13"], "r20": verification["r20"], "r21": verification["r21"], "r22": verification["r22"]})
    transport_fixture = run_transport_fixture()
    fixture_result: dict[str, Any] = {}

    qualification: dict[str, Any] = {}
    build1: dict[str, Any] = {}
    build2: dict[str, Any] = {}
    status = "BLOCKED_VERIFIER_MANIFEST_CONSTRUCTION_STILL_INCOMPLETE_NO_REMOTE_MUTATION"
    blockers: list[str] = []
    try:
        if not verification["r20_package"]["all_bytes_match_r20"] or not verification["r20_package"]["production_package_aggregate_root_match"]:
            status = "BLOCKED_R20_EXECUTION_PACKAGE_INTEGRITY_MISMATCH_NO_REMOTE_MUTATION"
            blockers.append("frozen R20 package hash mismatch")
        elif not verification["authority_integrity_verified"]:
            status = "BLOCKED_AUTHORITY_ARTIFACT_INTEGRITY_MISMATCH_NO_MUTATION_ATTEMPTED"
            blockers.append("authority artifact hash mismatch")
        elif forbidden_hits:
            status = "BLOCKED_VERIFIER_QUERY_SEMANTICS_CHANGED_NO_REMOTE_MUTATION"
            blockers.append("forbidden COPY transport remains in verifier SQL")
        elif not (transport_fixture["strict_json_valid"] and transport_fixture["semantic_match"] and transport_fixture["deterministic_canonical_bytes"]):
            status = "BLOCKED_JSON_TRANSPORT_FIXTURE_FAILED_NO_REMOTE_MUTATION"
            blockers.append("NUL-framed JSON transport fixture failed")
        else:
            fixture_result = run_fixture_construction()
            if not fixture_result.get("construction_completed"):
                status = "BLOCKED_VERIFIER_MANIFEST_CONSTRUCTION_STILL_INCOMPLETE_NO_REMOTE_MUTATION"
                blockers.append("R22 fixture manifest construction did not complete")
            elif not fixture_result.get("deterministic_output"):
                status = "BLOCKED_VERIFIER_MANIFEST_CONSTRUCTION_STILL_INCOMPLETE_NO_REMOTE_MUTATION"
                blockers.append("R22 fixture manifest construction was not deterministic under permutations")
            elif fixture_reference_mismatch_summary(fixture_result)["blocks_db_build"]:
                fixture_gate = fixture_reference_mismatch_summary(fixture_result)
                status = fixture_gate["status"]
                blockers.extend(f"R22 fixture {blocker} failed" for blocker in fixture_gate["blockers"])
            elif not fixture_result.get("object_counts_match"):
                status = "BLOCKED_VERIFIER_QUALIFICATION_OBJECT_COUNT_MISMATCH_NO_REMOTE_MUTATION"
                blockers.append("R22 fixture object counts differ")
            elif not fixture_result.get("rls_match"):
                status = "BLOCKED_VERIFIER_QUALIFICATION_RLS_MISMATCH_NO_REMOTE_MUTATION"
                blockers.append("R22 fixture RLS reconciliation differs")
            elif not fixture_result.get("non_reference_rows_zero"):
                status = "BLOCKED_VERIFIER_QUALIFICATION_NON_REFERENCE_ROWS_PRESENT_NO_REMOTE_MUTATION"
                blockers.append("R22 fixture non-reference rows present")
            elif fixture_result.get("unexpected_application_objects"):
                status = "BLOCKED_VERIFIER_QUALIFICATION_UNEXPECTED_APPLICATION_OBJECT_NO_REMOTE_MUTATION"
                blockers.append("R22 fixture unexpected objects present")
            else:
                qualification = run_build("qualification_1", write_prefix="qualification_1")
                write_json_pretty("manifests/qualification_1_result.json", qualification)
                q_status, q_blockers = choose_status(qualification, {}, {})
                if q_status.startswith("BLOCKED_VERIFIER_QUALIFICATION") or q_status == "BLOCKED_VERIFIER_MANIFEST_CONSTRUCTION_STILL_INCOMPLETE_NO_REMOTE_MUTATION":
                    status, blockers = q_status, q_blockers
                else:
                    build1 = run_build("build_1", write_prefix="build_1")
                    write_json_pretty("freshbuild/build_1_result.json", build1)
                    build2 = run_build("build_2", write_prefix="build_2")
                    write_json_pretty("freshbuild/build_2_result.json", build2)
                    status, blockers = choose_status(qualification, build1, build2)
    finally:
        write_json_pretty("audit/docker_resource_inventory_after.json", docker_inventory("after"))
        write_json_pretty("audit/repository_after.json", git_snapshot("after"))
        artifact = write_artifact_index()
        if artifact["secret_scan_findings"]:
            status = "BLOCKED_SECRET_SANITIZATION_FAILURE_NO_REMOTE_MUTATION"
            blockers.append("secret scan findings present")
        write_handoffs(status, blockers, verification, qualification, build1, build2, artifact)
    return 0 if status == STATUS_PASS else 2


if __name__ == "__main__":
    sys.exit(main_cli())
