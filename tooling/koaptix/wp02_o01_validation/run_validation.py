"""Guarded WP-02/O-01 disposable validation harness."""

from __future__ import annotations

import argparse
import dataclasses
import datetime
import json
import os
import platform
import re
import secrets
import shutil
import stat
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

from artifact_safety import (
    build_manifest_entries,
    canonical_json_bytes,
    redact_text_before_persistence,
    safe_artifact_path,
    sanitize_runtime_identifier,
    scan_secret_like_text,
    sha256_file,
    write_canonical_json,
    write_jsonl,
    write_manifest,
)


LANE = (
    "P-KOAPTIX-CANONICAL-LIFECYCLE-AND-IDENTITY-METADATA-WP02-O01-"
    "DISPOSABLE-VALIDATION-EXECUTION.0"
)
PATCH_LANE = (
    "P-KOAPTIX-CANONICAL-LIFECYCLE-AND-IDENTITY-METADATA-WP02-O01-"
    "EXECUTION-ROOT-AND-SECRET-DELIVERY-RECONCILIATION-PATCH-PLUS-"
    "EXACT-RUNTIME-STATIC-VERIFY.0"
)
SUCCESS_STATUS = "PASS_WP02_O01_DISPOSABLE_VALIDATION_COMPLETE_NO_PRODUCTION_EFFECT"
APPROVAL_MARKER = LANE + ":"
APPROVAL_FILENAME = "execution-approval.txt"
RUN_ID_RE = re.compile(r"^wp02-o01-[0-9]{8}T[0-9]{6}Z-[0-9a-f]{8}$")
EXECUTION_ROOT_PARENT = "koaptix-wp02-o01-validation"
PASSWORD_FILENAME = "postgres-password.txt"
CONTAINER_SECRET_TARGET = "/run/secrets/koaptix_postgres_password"
POSTGRES_PASSWORD_FILE_SETTING = f"POSTGRES_PASSWORD_FILE={CONTAINER_SECRET_TARGET}"

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[2]
FIXTURE_PATH = HERE / "fixtures.json"
METADATA_QUERY_PATH = HERE / "metadata_queries.sql"
RESULT_SCHEMA_PATH = HERE / "result_schema.json"
RUNTIME_PIN_PATH = REPO_ROOT / "tooling/koaptix/wp02_o01_python_runtime.txt"
MIGRATION_PATH = (
    REPO_ROOT
    / "supabase/migrations/20260716_koaptix_identity_reference_code_catalog.sql"
)
ARTIFACT_ROOT = (
    REPO_ROOT / ".handoff/validation/wp02_o01_disposable_validation"
)

EXPECTED_HEAD = "d441093024d2261bdbfb5160d1f9bb5416088986"
EXPECTED_RUNTIME_PIN_SHA256 = (
    "3a55324cbeddc91df012407d051dad08c88624c95a82fbdb856728729fbd14ab"
)
EXPECTED_MIGRATION_SHA256 = (
    "0e89d75a6ed437a64fa9dd7bff62cd32df246f0c29da38faa2cd49cd60c047a6"
)
EXPECTED_RUNTIME_PIN_BYTES = b"3.14.6\n"
EXPECTED_MIGRATION_BYTES = 1472

IMMUTABLE_IMAGE = (
    "docker.io/library/postgres:15.18-bookworm@sha256:"
    "b0c5bab0fbba8e0c221f73b1dc6359ec35f8650074377e727299df248fc8ad51"
)
IMAGE_INDEX_DIGEST = (
    "sha256:b0c5bab0fbba8e0c221f73b1dc6359ec35f8650074377e727299df248fc8ad51"
)
PLATFORM = "linux/amd64"
PLATFORM_MANIFEST_DIGEST = (
    "sha256:fafb7480959eeeb7f1e43b479e642ffef2aa0f067242a1954ab41f2d764e2786"
)
IMAGE_CONFIG_DIGEST = (
    "sha256:14cd37850629c85ffa07818ca9a02568289a360aded79d54aee9401cb684667f"
)
DATABASE_USER = "koaptix_validator"
DATABASE_NAME = "koaptix_wp02_o01_validation"
TARGET_TABLE = "public.koaptix_identity_reference_code"

AUTHORITY_INPUTS = (
    (
        "docs/koaptix/data/"
        "canonical_lifecycle_identity_metadata_wp02_o01_validation_harness_"
        "implementation_contract_decision_20260716.md",
        "f19d920be10a6f94abe785f7726011b0ec165df15078b561a20826598f4715de",
        65878,
    ),
    (
        "docs/koaptix/data/"
        "canonical_lifecycle_identity_metadata_wp02_o01_disposable_"
        "validation_plan_20260716.md",
        "01f8128d52dac766b6e9c1cdeda348d20894176c8109d7667dc5b9c486d04a56",
        117064,
    ),
    (
        "docs/koaptix/data/"
        "canonical_lifecycle_identity_metadata_disposable_toolchain_"
        "version_contract_decision_20260716.md",
        "e0a6565ef32bac7c0c29a57dd7459b2debea3526cc4dbc7232356ac567fe2698",
        42444,
    ),
    (
        "docs/koaptix/data/"
        "canonical_lifecycle_identity_metadata_wp02_o01_exact_python_"
        "runtime_pin_decision_20260716.md",
        "b6c58eaadaffb7873ee1c39135e89f932d456a55ce43c2dc6210687953e07c59",
        41659,
    ),
)
CONTRACT_MARKER = (
    "REVIEW_MARKER: P-KOAPTIX-CANONICAL-LIFECYCLE-AND-IDENTITY-METADATA-"
    "WP02-O01-VALIDATION-HARNESS-IMPLEMENTATION-CONTRACT-DECISION.1"
)
HARNESS_FILES = (
    "run_validation.py",
    "fixtures.json",
    "metadata_queries.sql",
    "result_schema.json",
    "artifact_safety.py",
)
METADATA_QUERY_IDS = (
    "RUNTIME_VERSION",
    "DATABASE_LOCALE",
    "PREAPPLY_OBJECT_ABSENCE",
    "TABLE_IDENTITY",
    "COLUMN_INVENTORY",
    "COLUMN_DEFAULTS",
    "PRIMARY_KEY",
    "CHECK_CONSTRAINTS",
    "INDEX_INVENTORY",
    "TRIGGER_INVENTORY",
    "POLICY_AND_RLS",
    "FOREIGN_KEY_INVENTORY",
    "DEPENDENT_VIEWS",
    "DEPENDENT_MATERIALIZED_VIEWS",
    "DEPENDENCY_SCAN",
    "ROW_COUNT",
    "COLLATION_CONTROL",
)
ARTIFACT_NAMES = (
    "result.json",
    "metadata_first_apply.json",
    "metadata_clean_reapply.json",
    "positive_fixture_results.jsonl",
    "negative_fixture_results.jsonl",
    "transcript.redacted.txt",
    "sha256_manifest.txt",
)
DVG_IDS = tuple(f"DVG-{number:02d}" for number in range(1, 16))
FIXTURE_FIELDS = {
    "fixture_id",
    "category",
    "description",
    "input",
    "omitted_fields",
    "expected_outcome",
    "expected_sqlstate",
    "expected_constraint",
    "expected_column",
    "expected_defaults",
    "expected_cleanup",
    "tags",
}
TABLE_COLUMNS = (
    "code_family",
    "code",
    "label",
    "description",
    "sort_order",
    "is_active",
    "created_at",
    "retired_at",
)
CHECK_CONSTRAINTS = (
    "koaptix_identity_reference_code_code_family_format_chk",
    "koaptix_identity_reference_code_code_format_chk",
    "koaptix_identity_reference_code_description_boundary_chk",
    "koaptix_identity_reference_code_label_boundary_chk",
    "koaptix_identity_reference_code_retired_at_not_before_created_chk",
    "koaptix_identity_reference_code_sort_order_nonnegative_chk",
)
PRIMARY_KEY_NAME = "koaptix_identity_reference_code_pkey"

SUPPORTED_SCHEMA_KEYWORDS = {
    "type",
    "properties",
    "required",
    "additionalProperties",
    "enum",
    "const",
    "pattern",
    "minimum",
    "maximum",
    "minItems",
    "maxItems",
    "items",
}
ALLOWED_IMPORT_ROOTS = {
    "__future__",
    "argparse",
    "dataclasses",
    "datetime",
    "json",
    "os",
    "pathlib",
    "platform",
    "re",
    "secrets",
    "shutil",
    "stat",
    "subprocess",
    "sys",
    "time",
    "typing",
    "hashlib",
    "artifact_safety",
}
ALLOWED_ENVIRONMENT_KEYS = (
    "PATH",
    "SYSTEMROOT",
    "WINDIR",
    "COMSPEC",
    "TEMP",
    "TMP",
    "TMPDIR",
    "HOME",
    "USERPROFILE",
)
SAFE_SQL_FUNCTIONS = {
    "chr",
    "count",
    "current_database",
    "current_setting",
    "format_type",
    "pg_describe_object",
    "pg_encoding_to_char",
    "pg_get_constraintdef",
    "pg_get_expr",
    "pg_get_indexdef",
    "pg_get_triggerdef",
    "version",
}
SQL_CALL_KEYWORDS = {"in", "exists", "case", "when", "filter", "over"}
FORBIDDEN_SQL_WORDS = {
    "alter",
    "analyze",
    "begin",
    "call",
    "checkpoint",
    "cluster",
    "comment",
    "commit",
    "copy",
    "create",
    "deallocate",
    "delete",
    "discard",
    "do",
    "drop",
    "execute",
    "grant",
    "insert",
    "listen",
    "load",
    "lock",
    "merge",
    "notify",
    "prepare",
    "refresh",
    "reindex",
    "reset",
    "revoke",
    "rollback",
    "savepoint",
    "security",
    "set",
    "start",
    "truncate",
    "unlisten",
    "update",
    "vacuum",
}


class HarnessFailure(RuntimeError):
    """A fail-closed validation outcome with one stable status."""

    def __init__(self, status: str, message: str) -> None:
        super().__init__(message)
        self.status = status


@dataclasses.dataclass(frozen=True)
class TimestampValue:
    text: str


@dataclasses.dataclass(frozen=True)
class CommandResult:
    command_class: str
    returncode: int
    stdout: str
    stderr: str


@dataclasses.dataclass
class DisposableEnvironment:
    label: str
    container: str
    network: str
    volume: str
    run_root: Path
    password_file: Path
    creation_attempted: bool = False
    container_created: bool = False
    network_created: bool = False
    volume_created: bool = False
    destroyed: bool = False


@dataclasses.dataclass
class ExecutionState:
    run_id: str
    run_root: Path
    artifact_root: Path
    docker_config: Path
    subprocess_environment: dict[str, str]
    redaction_values: list[str]
    transcript: list[dict[str, Any]]
    approval_guard_passed: bool
    completed_gates: list[str] = dataclasses.field(default_factory=list)
    environment_a: DisposableEnvironment | None = None
    environment_b: DisposableEnvironment | None = None
    metadata_a: dict[str, Any] = dataclasses.field(default_factory=dict)
    metadata_b: dict[str, Any] = dataclasses.field(default_factory=dict)
    positive_results: list[dict[str, Any]] = dataclasses.field(default_factory=list)
    negative_results: list[dict[str, Any]] = dataclasses.field(default_factory=list)
    migration_exit_code: int | None = None
    psql_version: str | None = None
    temp_root_removed: bool = False


def _strict_read_bytes(path: Path, *, require_single_final_lf: bool = True) -> bytes:
    if path.is_symlink() or not path.is_file():
        raise HarnessFailure("BLOCKED_AUTHORITY_OR_INPUT_MISMATCH", f"invalid file: {path.name}")
    data = path.read_bytes()
    if data.startswith(b"\xef\xbb\xbf") or b"\x00" in data or b"\r" in data:
        raise HarnessFailure("BLOCKED_AUTHORITY_OR_INPUT_MISMATCH", f"invalid bytes: {path.name}")
    if not data.endswith(b"\n") or (
        require_single_final_lf and data.endswith(b"\n\n")
    ):
        raise HarnessFailure("BLOCKED_AUTHORITY_OR_INPUT_MISMATCH", f"invalid final LF: {path.name}")
    data.decode("utf-8", errors="strict")
    return data


def _strict_read_text(path: Path, *, require_single_final_lf: bool = True) -> str:
    return _strict_read_bytes(
        path, require_single_final_lf=require_single_final_lf
    ).decode("utf-8", errors="strict")


def _verify_runtime_identity() -> dict[str, Any]:
    info = sys.version_info
    identity = {
        "implementation": platform.python_implementation(),
        "version": [info.major, info.minor, info.micro],
        "releaselevel": info.releaselevel,
        "serial": info.serial,
    }
    if (
        identity["implementation"] != "CPython"
        or identity["version"] != [3, 14, 6]
        or identity["releaselevel"] != "final"
        or identity["serial"] != 0
    ):
        raise HarnessFailure("BLOCKED_EXACT_RUNTIME_IDENTITY_MISMATCH", "exact CPython runtime required")
    return identity


def _verify_authority_inputs() -> None:
    for relative, expected_hash, expected_bytes in AUTHORITY_INPUTS:
        path = REPO_ROOT / relative
        data = _strict_read_bytes(path, require_single_final_lf=False)
        if len(data) != expected_bytes or sha256_file(path) != expected_hash:
            raise HarnessFailure("BLOCKED_AUTHORITY_OR_INPUT_MISMATCH", f"authority drift: {Path(relative).name}")
    contract_text = _strict_read_text(
        REPO_ROOT / AUTHORITY_INPUTS[0][0], require_single_final_lf=False
    )
    if contract_text.count(CONTRACT_MARKER) != 1:
        raise HarnessFailure("BLOCKED_AUTHORITY_OR_INPUT_MISMATCH", "contract marker mismatch")
    pin = _strict_read_bytes(RUNTIME_PIN_PATH)
    if pin != EXPECTED_RUNTIME_PIN_BYTES or sha256_file(RUNTIME_PIN_PATH) != EXPECTED_RUNTIME_PIN_SHA256:
        raise HarnessFailure("BLOCKED_AUTHORITY_OR_INPUT_MISMATCH", "runtime pin mismatch")
    migration = _strict_read_bytes(MIGRATION_PATH)
    if len(migration) != EXPECTED_MIGRATION_BYTES or sha256_file(MIGRATION_PATH) != EXPECTED_MIGRATION_SHA256:
        raise HarnessFailure("BLOCKED_AUTHORITY_OR_INPUT_MISMATCH", "migration mismatch")


def _expected_fixture_ids(prefix: str, count: int) -> list[str]:
    return [f"{prefix}-{number:03d}" for number in range(1, count + 1)]


def _validate_generator(value: Mapping[str, Any], context: str) -> None:
    kind = value.get("kind")
    if kind == "repeat":
        if set(value) != {"kind", "character", "count"}:
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"repeat shape: {context}")
        character = value["character"]
        count = value["count"]
        if not isinstance(character, str) or len(character) != 1 or character == "\x00":
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"repeat character: {context}")
        if isinstance(count, bool) or not isinstance(count, int) or not 1 <= count <= 2001:
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"repeat count: {context}")
        return
    if kind == "timestamp":
        if set(value) != {"kind", "value"}:
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"timestamp shape: {context}")
        timestamp = value["value"]
        if not isinstance(timestamp, str) or re.fullmatch(
            r"20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z",
            timestamp,
        ) is None:
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"timestamp value: {context}")
        datetime.datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        return
    if kind == "internal_control":
        if set(value) != {"kind", "control", "left", "right"}:
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"internal control shape: {context}")
        if value["control"] not in {"SPACE", "TAB", "LF", "CR", "VT", "FF"}:
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"internal control: {context}")
        if not all(isinstance(value[key], str) and value[key] for key in ("left", "right")):
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"internal boundary: {context}")
        return
    if kind == "boundary_control":
        if set(value) != {"kind", "control", "position", "value"}:
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"boundary control shape: {context}")
        if value["control"] not in {"SPACE", "TAB", "LF", "CR", "VT", "FF"}:
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"boundary control: {context}")
        if value["position"] not in {"only", "leading", "trailing"}:
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"boundary position: {context}")
        if not isinstance(value["value"], str):
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"boundary value: {context}")
        return
    raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"unknown generator: {context}")


def _validate_closed_value(value: Any, context: str) -> None:
    if value is None or isinstance(value, bool):
        return
    if isinstance(value, int):
        return
    if isinstance(value, str):
        if "\x00" in value or any(control in value for control in "\t\n\r\v\f"):
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"ambiguous literal control: {context}")
        return
    if isinstance(value, dict):
        _validate_generator(value, context)
        return
    raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"unsupported value: {context}")


def _validate_row(row: Any, omitted_fields: Sequence[str], context: str) -> None:
    if not isinstance(row, dict):
        raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"row is not an object: {context}")
    keys = set(row)
    if not keys <= set(TABLE_COLUMNS):
        raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"unknown row field: {context}")
    if set(omitted_fields) != set(TABLE_COLUMNS) - keys:
        raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"omission mismatch: {context}")
    for key, value in row.items():
        _validate_closed_value(value, f"{context}.{key}")


def _negative_expectations() -> list[tuple[str, str | None, str | None]]:
    family = "koaptix_identity_reference_code_code_family_format_chk"
    code = "koaptix_identity_reference_code_code_format_chk"
    label = "koaptix_identity_reference_code_label_boundary_chk"
    description = "koaptix_identity_reference_code_description_boundary_chk"
    values: list[tuple[str, str | None, str | None]] = [
        ("23502", None, "code_family"),
        *[("23514", family, None)] * 8,
        ("23502", None, "code"),
        *[("23514", code, None)] * 7,
        ("23505", PRIMARY_KEY_NAME, None),
        ("23502", None, "label"),
        *[("23514", label, None)] * 17,
        *[("23514", description, None)] * 17,
        ("23514", "koaptix_identity_reference_code_sort_order_nonnegative_chk", None),
        ("23514", "koaptix_identity_reference_code_retired_at_not_before_created_chk", None),
    ]
    if len(values) != 55:
        raise AssertionError("internal negative expectation count")
    return values


def _fixture_semantic_controls(fixtures: Mapping[str, Mapping[str, Any]]) -> None:
    repeat_controls = {
        "POS-002": ("code_family", "A", 64),
        "POS-003": ("code", "B", 64),
        "POS-011": ("label", "X", 160),
        "POS-018": ("description", "D", 2000),
        "NEG-003": ("code_family", "A", 65),
        "NEG-012": ("code", "A", 65),
        "NEG-021": ("label", "X", 161),
        "NEG-038": ("description", "D", 2001),
    }
    for fixture_id, (column, character, count) in repeat_controls.items():
        value = fixtures[fixture_id]["input"][column]
        if value != {"kind": "repeat", "character": character, "count": count}:
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"boundary drift: {fixture_id}")
    if fixtures["POS-022"]["omitted_fields"] != ["sort_order", "is_active", "created_at"]:
        raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", "default omission drift")
    if fixtures["POS-022"]["expected_defaults"] != {
        "sort_order": 100,
        "is_active": True,
        "created_at": "NON_NULL_CURRENT_TIMESTAMP",
    }:
        raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", "default expectation drift")
    duplicate = fixtures["NEG-018"]["input"]
    if (
        set(duplicate) != {"kind", "rows"}
        or duplicate["kind"] != "duplicate_pair"
        or not isinstance(duplicate["rows"], list)
        or len(duplicate["rows"]) != 2
        or duplicate["rows"][0] != duplicate["rows"][1]
    ):
        raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", "duplicate pair drift")
    internal_controls = {
        "POS-008": ("label", "SPACE"),
        "POS-009": ("label", "TAB"),
        "POS-010": ("label", "LF"),
        "POS-014": ("description", "SPACE"),
        "POS-015": ("description", "TAB"),
        "POS-016": ("description", "LF"),
        "POS-017": ("description", "CR"),
    }
    for fixture_id, (column, control) in internal_controls.items():
        if fixtures[fixture_id]["input"][column].get("control") != control:
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"internal control drift: {fixture_id}")
    label_controls = [
        ("SPACE", "only"),
        ("TAB", "only"),
        ("LF", "only"),
        ("SPACE", "leading"),
        ("SPACE", "trailing"),
        ("TAB", "leading"),
        ("TAB", "trailing"),
        ("LF", "leading"),
        ("LF", "trailing"),
        ("CR", "leading"),
        ("CR", "trailing"),
        ("VT", "leading"),
        ("VT", "trailing"),
        ("FF", "leading"),
        ("FF", "trailing"),
    ]
    for offset, expected in enumerate(label_controls, start=22):
        value = fixtures[f"NEG-{offset:03d}"]["input"]["label"]
        if (value.get("control"), value.get("position")) != expected:
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"label boundary drift: {offset}")
    description_controls = [
        ("SPACE", "only"),
        ("TAB", "only"),
        ("LF", "only"),
        ("SPACE", "leading"),
        ("SPACE", "trailing"),
        ("TAB", "leading"),
        ("TAB", "trailing"),
        ("LF", "leading"),
        ("LF", "trailing"),
        ("CR", "leading"),
        ("CR", "trailing"),
        ("VT", "leading"),
        ("VT", "trailing"),
        ("FF", "leading"),
        ("FF", "trailing"),
    ]
    for offset, expected in enumerate(description_controls, start=39):
        value = fixtures[f"NEG-{offset:03d}"]["input"]["description"]
        if (value.get("control"), value.get("position")) != expected:
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"description boundary drift: {offset}")


def _load_and_validate_fixtures() -> dict[str, Any]:
    document = json.loads(_strict_read_text(FIXTURE_PATH))
    if set(document) != {
        "schema_version",
        "migration_sha256",
        "positive_fixtures",
        "negative_fixtures",
    }:
        raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", "fixture root shape")
    if document["schema_version"] != 1:
        raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", "fixture schema version")
    if document["migration_sha256"].lower() != EXPECTED_MIGRATION_SHA256:
        raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", "fixture migration identity")
    positive = document["positive_fixtures"]
    negative = document["negative_fixtures"]
    if not isinstance(positive, list) or not isinstance(negative, list):
        raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", "fixture lists")
    if len(positive) != 22 or len(negative) != 55:
        raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", "fixture counts")
    if [item.get("fixture_id") for item in positive] != _expected_fixture_ids("POS", 22):
        raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", "positive fixture IDs")
    if [item.get("fixture_id") for item in negative] != _expected_fixture_ids("NEG", 55):
        raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", "negative fixture IDs")
    expected_negative = _negative_expectations()
    all_fixtures: dict[str, Mapping[str, Any]] = {}
    for index, fixture in enumerate(positive + negative):
        if not isinstance(fixture, dict) or set(fixture) != FIXTURE_FIELDS:
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", "fixture field shape")
        fixture_id = fixture["fixture_id"]
        if fixture_id in all_fixtures:
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", "duplicate fixture ID")
        all_fixtures[fixture_id] = fixture
        if not isinstance(fixture["description"], str) or not fixture["description"]:
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"description: {fixture_id}")
        if not isinstance(fixture["tags"], list) or not all(
            isinstance(tag, str) and tag for tag in fixture["tags"]
        ):
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"tags: {fixture_id}")
        omitted = fixture["omitted_fields"]
        if not isinstance(omitted, list) or len(omitted) != len(set(omitted)):
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"omissions: {fixture_id}")
        if fixture_id == "NEG-018":
            duplicate = fixture["input"]
            if not isinstance(duplicate, dict) or not isinstance(duplicate.get("rows"), list):
                raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", "duplicate input")
            for row_value in duplicate["rows"]:
                _validate_row(row_value, (), fixture_id)
        else:
            _validate_row(fixture["input"], omitted, fixture_id)
        if fixture_id.startswith("POS-"):
            if (
                fixture["category"] != "POSITIVE"
                or fixture["expected_outcome"] != "ACCEPT_AND_ROLLBACK"
                or fixture["expected_sqlstate"] is not None
                or fixture["expected_constraint"] is not None
                or fixture["expected_column"] is not None
                or fixture["expected_cleanup"] != "ROLLBACK_AND_ZERO_ROWS"
            ):
                raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"positive expectation: {fixture_id}")
        else:
            expected = expected_negative[index - 22]
            actual = (
                fixture["expected_sqlstate"],
                fixture["expected_constraint"],
                fixture["expected_column"],
            )
            if (
                fixture["category"] != "NEGATIVE"
                or fixture["expected_outcome"] != "REJECT"
                or fixture["expected_cleanup"] != "FAILED_TRANSACTION_AND_ZERO_ROWS"
                or actual != expected
            ):
                raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"negative expectation: {fixture_id}")
        if fixture_id != "POS-022" and fixture["expected_defaults"] != {}:
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", f"unexpected defaults: {fixture_id}")
    _fixture_semantic_controls(all_fixtures)
    return document


def _split_metadata_blocks(text: str) -> dict[str, str]:
    delimiter = re.compile(r"(?m)^-- query: ([A-Z][A-Z0-9_]*)\n")
    matches = list(delimiter.finditer(text))
    if not matches or text[: matches[0].start()] != "":
        raise HarnessFailure("BLOCKED_METADATA_QUERY_NOT_PROVABLY_READ_ONLY", "metadata preamble")
    blocks: dict[str, str] = {}
    ordered_ids: list[str] = []
    for index, match in enumerate(matches):
        query_id = match.group(1)
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        body = text[start:end].strip()
        if query_id in blocks or not body:
            raise HarnessFailure("BLOCKED_METADATA_QUERY_NOT_PROVABLY_READ_ONLY", "metadata block shape")
        blocks[query_id] = body
        ordered_ids.append(query_id)
    if ordered_ids != list(METADATA_QUERY_IDS):
        raise HarnessFailure("BLOCKED_METADATA_QUERY_NOT_PROVABLY_READ_ONLY", "metadata IDs")
    return blocks


def _lex_sql(statement: str) -> list[tuple[str, str]]:
    tokens: list[tuple[str, str]] = []
    index = 0
    length = len(statement)
    while index < length:
        char = statement[index]
        if char.isspace():
            index += 1
            continue
        if char == "-" and index + 1 < length and statement[index + 1] == "-":
            newline = statement.find("\n", index + 2)
            index = length if newline < 0 else newline + 1
            continue
        if char == "/" and index + 1 < length and statement[index + 1] == "*":
            close = statement.find("*/", index + 2)
            if close < 0:
                raise HarnessFailure("BLOCKED_METADATA_QUERY_NOT_PROVABLY_READ_ONLY", "unterminated comment")
            index = close + 2
            continue
        if char == "'":
            index += 1
            while index < length:
                if statement[index] == "'":
                    if index + 1 < length and statement[index + 1] == "'":
                        index += 2
                        continue
                    index += 1
                    break
                index += 1
            else:
                raise HarnessFailure("BLOCKED_METADATA_QUERY_NOT_PROVABLY_READ_ONLY", "unterminated string")
            tokens.append(("STRING", ""))
            continue
        if char == '"':
            index += 1
            value: list[str] = []
            while index < length:
                if statement[index] == '"':
                    if index + 1 < length and statement[index + 1] == '"':
                        value.append('"')
                        index += 2
                        continue
                    index += 1
                    break
                value.append(statement[index])
                index += 1
            else:
                raise HarnessFailure("BLOCKED_METADATA_QUERY_NOT_PROVABLY_READ_ONLY", "unterminated identifier")
            tokens.append(("QIDENT", "".join(value)))
            continue
        if char.isalpha() or char == "_":
            end = index + 1
            while end < length and (statement[end].isalnum() or statement[end] in "_$"):
                end += 1
            tokens.append(("WORD", statement[index:end].lower()))
            index = end
            continue
        if char.isdigit():
            end = index + 1
            while end < length and statement[end].isdigit():
                end += 1
            tokens.append(("NUMBER", statement[index:end]))
            index = end
            continue
        if char == ":":
            if index + 1 < length and statement[index + 1] == ":":
                tokens.append(("SYMBOL", "::"))
                index += 2
                continue
            raise HarnessFailure("BLOCKED_METADATA_QUERY_NOT_PROVABLY_READ_ONLY", "substitution ambiguity")
        if char in {"\\", "$"}:
            raise HarnessFailure("BLOCKED_METADATA_QUERY_NOT_PROVABLY_READ_ONLY", "unsupported SQL token")
        tokens.append(("SYMBOL", char))
        index += 1
    return tokens


def _classify_read_only_query(query_id: str, statement: str) -> None:
    tokens = _lex_sql(statement)
    semicolons = [index for index, token in enumerate(tokens) if token == ("SYMBOL", ";")]
    if len(semicolons) != 1 or semicolons[0] != len(tokens) - 1:
        raise HarnessFailure("BLOCKED_METADATA_QUERY_NOT_PROVABLY_READ_ONLY", f"terminator: {query_id}")
    body = tokens[:-1]
    if not body or body[0] != ("WORD", "select"):
        raise HarnessFailure("BLOCKED_METADATA_QUERY_NOT_PROVABLY_READ_ONLY", f"statement class: {query_id}")
    words = [value for kind, value in body if kind == "WORD"]
    if set(words) & FORBIDDEN_SQL_WORDS or "into" in words or "with" in words:
        raise HarnessFailure("BLOCKED_METADATA_QUERY_NOT_PROVABLY_READ_ONLY", f"forbidden SQL: {query_id}")
    for index, (kind, value) in enumerate(body[:-1]):
        if kind != "WORD" or value == "select" or body[index + 1] != ("SYMBOL", "("):
            continue
        if value not in SAFE_SQL_FUNCTIONS and value not in SQL_CALL_KEYWORDS:
            raise HarnessFailure("BLOCKED_METADATA_QUERY_NOT_PROVABLY_READ_ONLY", f"function ambiguity: {query_id}")
    for index, token in enumerate(body[:-1]):
        if token not in {("WORD", "from"), ("WORD", "join")}:
            continue
        next_token = body[index + 1]
        if next_token == ("SYMBOL", "("):
            continue
        if next_token[0] not in {"WORD", "QIDENT"}:
            raise HarnessFailure("BLOCKED_METADATA_QUERY_NOT_PROVABLY_READ_ONLY", f"relation ambiguity: {query_id}")
        relation = next_token[1].lower()
        if index + 3 < len(body) and body[index + 2] == ("SYMBOL", "."):
            relation += "." + body[index + 3][1].lower()
        if not (
            relation.startswith("pg_catalog.")
            or relation.startswith("information_schema.")
            or relation == TARGET_TABLE
        ):
            raise HarnessFailure("BLOCKED_METADATA_QUERY_NOT_PROVABLY_READ_ONLY", f"relation scope: {query_id}")


def _load_and_validate_metadata_queries() -> dict[str, str]:
    blocks = _split_metadata_blocks(_strict_read_text(METADATA_QUERY_PATH))
    for query_id in METADATA_QUERY_IDS:
        _classify_read_only_query(query_id, blocks[query_id])
    return blocks


def _verify_schema_node(node: Any, path: str) -> None:
    if not isinstance(node, dict):
        raise HarnessFailure("BLOCKED_RESULT_SCHEMA_CONTRACT_INVALID", f"schema node: {path}")
    unsupported = set(node) - SUPPORTED_SCHEMA_KEYWORDS
    if unsupported:
        raise HarnessFailure("BLOCKED_RESULT_SCHEMA_CONTRACT_INVALID", f"schema keyword: {path}")
    declared_type = node.get("type")
    if isinstance(declared_type, list):
        if (
            len(declared_type) != 2
            or "null" not in declared_type
            or not all(isinstance(item, str) for item in declared_type)
        ):
            raise HarnessFailure("BLOCKED_RESULT_SCHEMA_CONTRACT_INVALID", f"nullable type: {path}")
    elif declared_type is not None and not isinstance(declared_type, str):
        raise HarnessFailure("BLOCKED_RESULT_SCHEMA_CONTRACT_INVALID", f"type: {path}")
    properties = node.get("properties")
    if properties is not None:
        if not isinstance(properties, dict):
            raise HarnessFailure("BLOCKED_RESULT_SCHEMA_CONTRACT_INVALID", f"properties: {path}")
        for name, child in properties.items():
            if not isinstance(name, str):
                raise HarnessFailure("BLOCKED_RESULT_SCHEMA_CONTRACT_INVALID", f"property name: {path}")
            _verify_schema_node(child, f"{path}.{name}")
    if "items" in node:
        _verify_schema_node(node["items"], f"{path}[]")
    if "required" in node and (
        not isinstance(node["required"], list)
        or not all(isinstance(item, str) for item in node["required"])
        or len(node["required"]) != len(set(node["required"]))
    ):
        raise HarnessFailure("BLOCKED_RESULT_SCHEMA_CONTRACT_INVALID", f"required: {path}")
    if "additionalProperties" in node and not isinstance(node["additionalProperties"], bool):
        raise HarnessFailure("BLOCKED_RESULT_SCHEMA_CONTRACT_INVALID", f"additional properties: {path}")


def _matches_type(value: Any, expected: str) -> bool:
    if expected == "null":
        return value is None
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected == "string":
        return isinstance(value, str)
    if expected == "array":
        return isinstance(value, list)
    if expected == "object":
        return isinstance(value, dict)
    raise HarnessFailure("BLOCKED_RESULT_SCHEMA_CONTRACT_INVALID", "unsupported declared type")


def _manual_validate(value: Any, schema: Mapping[str, Any], path: str = "$") -> None:
    declared = schema.get("type")
    if declared is not None:
        options = declared if isinstance(declared, list) else [declared]
        if not any(_matches_type(value, option) for option in options):
            raise HarnessFailure("BLOCKED_RESULT_SCHEMA_VALIDATION_FAILED", f"type mismatch: {path}")
    if value is None:
        return
    if "const" in schema and value != schema["const"]:
        raise HarnessFailure("BLOCKED_RESULT_SCHEMA_VALIDATION_FAILED", f"const mismatch: {path}")
    if "enum" in schema and value not in schema["enum"]:
        raise HarnessFailure("BLOCKED_RESULT_SCHEMA_VALIDATION_FAILED", f"enum mismatch: {path}")
    if "pattern" in schema:
        if not isinstance(value, str) or re.search(schema["pattern"], value) is None:
            raise HarnessFailure("BLOCKED_RESULT_SCHEMA_VALIDATION_FAILED", f"pattern mismatch: {path}")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            raise HarnessFailure("BLOCKED_RESULT_SCHEMA_VALIDATION_FAILED", f"minimum: {path}")
        if "maximum" in schema and value > schema["maximum"]:
            raise HarnessFailure("BLOCKED_RESULT_SCHEMA_VALIDATION_FAILED", f"maximum: {path}")
    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            raise HarnessFailure("BLOCKED_RESULT_SCHEMA_VALIDATION_FAILED", f"min items: {path}")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            raise HarnessFailure("BLOCKED_RESULT_SCHEMA_VALIDATION_FAILED", f"max items: {path}")
        if "items" in schema:
            for index, item in enumerate(value):
                _manual_validate(item, schema["items"], f"{path}[{index}]")
    if isinstance(value, dict):
        properties = schema.get("properties", {})
        required = schema.get("required", [])
        missing = set(required) - set(value)
        if missing:
            raise HarnessFailure("BLOCKED_RESULT_SCHEMA_VALIDATION_FAILED", f"missing keys: {path}")
        if schema.get("additionalProperties") is False and set(value) - set(properties):
            raise HarnessFailure("BLOCKED_RESULT_SCHEMA_VALIDATION_FAILED", f"extra keys: {path}")
        for key, child in value.items():
            if key in properties:
                _manual_validate(child, properties[key], f"{path}.{key}")


def _result_skeleton(run_id: str) -> dict[str, Any]:
    return {
        "run_id": run_id,
        "validation_lane": LANE,
        "status": "BLOCKED_EXECUTION_NOT_COMPLETED",
        "validation_classification": "STATIC_SCHEMA_PROBE",
        "environment_type": "DISPOSABLE_LOCAL_DOCKER_POSTGRES_UPSTREAM_COMPATIBILITY_ONLY",
        "isolation_status": "BLOCKED_ISOLATION_NOT_PROVEN",
        "production_project_reference_present": False,
        "production_credential_present": False,
        "immutable_image_reference": IMMUTABLE_IMAGE,
        "image_index_digest": IMAGE_INDEX_DIGEST,
        "selected_platform": PLATFORM,
        "expected_platform_manifest_digest": PLATFORM_MANIFEST_DIGEST,
        "verified_platform_manifest_digest": None,
        "expected_image_config_digest": IMAGE_CONFIG_DIGEST,
        "verified_image_config_digest": None,
        "PostgreSQL_server_version": None,
        "PostgreSQL_server_version_num": None,
        "psql_version": None,
        "database_encoding": None,
        "client_encoding": None,
        "lc_collate": None,
        "lc_ctype": None,
        "locale_provider": None,
        "migration_path": MIGRATION_PATH.relative_to(REPO_ROOT).as_posix(),
        "migration_sha256": EXPECTED_MIGRATION_SHA256,
        "migration_apply_exit_code": None,
        "migration_apply_SQLSTATE": None,
        "table_exists": None,
        "table_count": None,
        "column_count": None,
        "exact_columns": [],
        "primary_key_count": None,
        "primary_key_columns": [],
        "check_constraint_count": None,
        "exact_check_constraints": [],
        "PK_backed_index_count": None,
        "explicit_secondary_index_count": None,
        "noninternal_trigger_count": None,
        "policy_count": None,
        "RLS_enabled": None,
        "forced_RLS_enabled": None,
        "foreign_key_count": None,
        "dependent_view_count": None,
        "dependent_materialized_view_count": None,
        "unexpected_dependency_count": None,
        "row_count_after_apply": None,
        "positive_fixture_total": 22,
        "positive_fixture_passed": 0,
        "negative_fixture_total": 55,
        "negative_fixture_passed": 0,
        "unexpected_fixture_successes": 0,
        "unexpected_fixture_failures": 0,
        "row_count_after_fixtures": None,
        "first_metadata_sha256": None,
        "clean_reapply_metadata_sha256": None,
        "metadata_hashes_match": None,
        "first_environment_destroyed": False,
        "second_environment_destroyed": False,
        "first_network_destroyed": False,
        "second_network_destroyed": False,
        "first_volume_destroyed": False,
        "second_volume_destroyed": False,
        "temporary_root_removed": False,
        "sha256_manifest_sha256": None,
        "artifact_integrity_root": "RESULT_JSON_SHA256_RECORDED_OUTSIDE_ARTIFACT_SET",
        "prohibited_actions_confirmed": True,
        "production_migration_authority_created": False,
        "one_line_conclusion": "Execution has not completed.",
    }


def _load_and_validate_result_schema() -> dict[str, Any]:
    schema = json.loads(_strict_read_text(RESULT_SCHEMA_PATH))
    _verify_schema_node(schema, "$")
    probe = _result_skeleton("wp02-o01-20000101T000000Z-00000000")
    if schema.get("required") != list(probe):
        raise HarnessFailure("BLOCKED_RESULT_SCHEMA_CONTRACT_INVALID", "result required-key order")
    if set(schema.get("properties", {})) != set(probe):
        raise HarnessFailure("BLOCKED_RESULT_SCHEMA_CONTRACT_INVALID", "result governed keys")
    _manual_validate(probe, schema)
    return schema


def _verify_source_posture() -> None:
    actual = sorted(path.name for path in HERE.iterdir())
    if actual != sorted(HARNESS_FILES):
        raise HarnessFailure("BLOCKED_HARNESS_FILE_SET_MISMATCH", "harness file set")
    for name in HARNESS_FILES:
        _strict_read_bytes(HERE / name)
    import_pattern = re.compile(r"^\s*(?:from|import)\s+([A-Za-z_][A-Za-z0-9_]*)", re.MULTILINE)
    for source_name in ("run_validation.py", "artifact_safety.py"):
        source = _strict_read_text(HERE / source_name)
        roots = set(import_pattern.findall(source))
        if not roots <= ALLOWED_IMPORT_ROOTS:
            raise HarnessFailure("BLOCKED_EXTERNAL_DEPENDENCY_PRESENT", f"import posture: {source_name}")
    if ARTIFACT_ROOT.exists():
        raise HarnessFailure("BLOCKED_UNAUTHORIZED_VALIDATION_ARTIFACT_PRESENT", "artifact root already exists")


def verify_static_contract() -> dict[str, Any]:
    runtime_identity = _verify_runtime_identity()
    _verify_authority_inputs()
    _verify_source_posture()
    fixtures = _load_and_validate_fixtures()
    metadata = _load_and_validate_metadata_queries()
    schema = _load_and_validate_result_schema()
    reconciliation = _verify_reconciled_execution_contract()
    return {
        "status": "PASS_STATIC_CONTRACT",
        "runtime_identity": runtime_identity,
        "fixture_count_positive": len(fixtures["positive_fixtures"]),
        "fixture_count_negative": len(fixtures["negative_fixtures"]),
        "metadata_query_count": len(metadata),
        "result_required_key_count": len(schema["required"]),
        "harness_file_count": len(HARNESS_FILES),
        "external_dependency_count": 0,
        **reconciliation,
    }


def generate_run_id() -> str:
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return f"wp02-o01-{now}-{secrets.token_hex(4)}"


def _exact_argument_path(value: str | None, expected: Path, label: str) -> Path:
    if value is None:
        raise HarnessFailure("BLOCKED_EXECUTION_APPROVAL_GUARD_NOT_SATISFIED", f"missing {label}")
    candidate = Path(value)
    if candidate.is_symlink() or candidate.resolve(strict=False) != expected.resolve(strict=False):
        raise HarnessFailure("BLOCKED_EXECUTION_APPROVAL_GUARD_NOT_SATISFIED", f"invalid {label}")
    return candidate


def _execution_root(run_id: str) -> Path:
    if RUN_ID_RE.fullmatch(run_id) is None:
        raise HarnessFailure("BLOCKED_EXECUTION_APPROVAL_GUARD_NOT_SATISFIED", "run ID")
    temp_value = next(
        (os.environ[key] for key in ("TMPDIR", "TEMP", "TMP") if os.environ.get(key)),
        None,
    )
    if temp_value is None:
        raise HarnessFailure(
            "BLOCKED_EXECUTION_APPROVAL_GUARD_NOT_SATISFIED", "system temp root"
        )
    temp_root = Path(temp_value)
    if temp_root.is_symlink() or not temp_root.is_dir():
        raise HarnessFailure(
            "BLOCKED_EXECUTION_APPROVAL_GUARD_NOT_SATISFIED", "system temp root"
        )
    return temp_root.resolve(strict=True) / EXECUTION_ROOT_PARENT / run_id


def verify_execution_guard(
    args: argparse.Namespace, static_report: Mapping[str, Any]
) -> tuple[str, Path, Path]:
    if not args.execute or static_report.get("status") != "PASS_STATIC_CONTRACT":
        raise HarnessFailure("BLOCKED_EXECUTION_APPROVAL_GUARD_NOT_SATISFIED", "static guard")
    run_id = args.run_id
    if not isinstance(run_id, str) or RUN_ID_RE.fullmatch(run_id) is None:
        raise HarnessFailure("BLOCKED_EXECUTION_APPROVAL_GUARD_NOT_SATISFIED", "run ID")
    migration = _exact_argument_path(args.migration, MIGRATION_PATH, "migration")
    artifact_root = _exact_argument_path(args.artifact_root, ARTIFACT_ROOT, "artifact root")
    if artifact_root.exists():
        raise HarnessFailure("BLOCKED_EXECUTION_APPROVAL_GUARD_NOT_SATISFIED", "artifact collision")
    run_root = _execution_root(run_id)
    expected_approval = run_root / APPROVAL_FILENAME
    approval = _exact_argument_path(args.approval_file, expected_approval, "approval file")
    if run_root.is_symlink() or not run_root.is_dir():
        raise HarnessFailure("BLOCKED_EXECUTION_APPROVAL_GUARD_NOT_SATISFIED", "run root")
    if approval.is_symlink() or not approval.is_file():
        raise HarnessFailure("BLOCKED_EXECUTION_APPROVAL_GUARD_NOT_SATISFIED", "approval kind")
    file_stat = approval.stat(follow_symlinks=False)
    if not stat.S_ISREG(file_stat.st_mode) or file_stat.st_nlink != 1 or file_stat.st_size > 192:
        raise HarnessFailure("BLOCKED_EXECUTION_APPROVAL_GUARD_NOT_SATISFIED", "approval stat")
    if os.name == "posix" and stat.S_IMODE(file_stat.st_mode) & 0o077:
        raise HarnessFailure("BLOCKED_EXECUTION_APPROVAL_GUARD_NOT_SATISFIED", "approval permissions")
    expected_bytes = (APPROVAL_MARKER + run_id + "\n").encode("ascii")
    approval_bytes = approval.read_bytes()
    approval_bytes.decode("utf-8", errors="strict").encode("ascii", errors="strict")
    if approval_bytes != expected_bytes:
        raise HarnessFailure("BLOCKED_EXECUTION_APPROVAL_GUARD_NOT_SATISFIED", "approval bytes")
    entries = sorted(path.name for path in run_root.iterdir())
    if entries != [APPROVAL_FILENAME]:
        raise HarnessFailure("BLOCKED_EXECUTION_APPROVAL_GUARD_NOT_SATISFIED", "run root contents")
    if sha256_file(migration) != EXPECTED_MIGRATION_SHA256:
        raise HarnessFailure("BLOCKED_EXECUTION_APPROVAL_GUARD_NOT_SATISFIED", "migration hash")
    return run_id, run_root, artifact_root


def _minimal_environment(docker_config: Path) -> dict[str, str]:
    environment: dict[str, str] = {}
    for key in ALLOWED_ENVIRONMENT_KEYS:
        value = os.environ.get(key)
        if value:
            environment[key] = value
    environment["DOCKER_CONFIG"] = str(docker_config)
    return environment


def _record_command(
    transcript: list[dict[str, Any]], result: CommandResult
) -> None:
    transcript.append(
        {
            "command_class": result.command_class,
            "exit_code": result.returncode,
            "stdout_tail": result.stdout[-2000:],
            "stderr_tail": result.stderr[-2000:],
        }
    )


def _mark_gate(state: ExecutionState, gate_id: str) -> None:
    expected_index = len(state.completed_gates)
    if expected_index >= len(DVG_IDS) or DVG_IDS[expected_index] != gate_id:
        raise HarnessFailure("BLOCKED_VALIDATION_GATE_ORDER", f"gate order: {gate_id}")
    state.completed_gates.append(gate_id)
    state.transcript.append(
        {
            "event": "validation_gate_pass",
            "gate_id": gate_id,
            "sequence": len(state.completed_gates),
        }
    )


def _run_command(
    arguments: Sequence[str],
    command_class: str,
    environment: Mapping[str, str],
    transcript: list[dict[str, Any]],
    redaction_values: Iterable[str],
    timeout_seconds: int,
    stdin_bytes: bytes | None = None,
    cwd: Path | None = None,
) -> CommandResult:
    if (
        not isinstance(arguments, (list, tuple))
        or not arguments
        or not all(isinstance(value, str) and value and "\x00" not in value for value in arguments)
    ):
        raise HarnessFailure("BLOCKED_SUBPROCESS_CONTRACT_INVALID", "invalid argument array")
    if stdin_bytes is not None and len(stdin_bytes) > 262144:
        raise HarnessFailure("BLOCKED_SUBPROCESS_CONTRACT_INVALID", "stdin exceeds bound")
    input_options: dict[str, Any] = {}
    if stdin_bytes is None:
        input_options["stdin"] = subprocess.DEVNULL
    else:
        input_options["input"] = stdin_bytes
    completed = subprocess.run(
        list(arguments),
        shell=False,
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=timeout_seconds,
        env=dict(environment),
        cwd=str(cwd) if cwd is not None else None,
        **input_options,
    )
    stdout = redact_text_before_persistence(
        completed.stdout.decode("utf-8", errors="replace"), redaction_values
    )
    stderr = redact_text_before_persistence(
        completed.stderr.decode("utf-8", errors="replace"), redaction_values
    )
    result = CommandResult(command_class, completed.returncode, stdout, stderr)
    _record_command(transcript, result)
    return result


def _build_git_command(command_id: str) -> list[str]:
    commands = {
        "branch": ["git", "branch", "--show-current"],
        "head": ["git", "rev-parse", "HEAD"],
        "origin": ["git", "rev-parse", "origin/main"],
        "ahead": ["git", "rev-list", "--left-right", "--count", "origin/main...HEAD"],
        "status": ["git", "status", "--short", "--untracked-files=no"],
        "staged": ["git", "diff", "--cached", "--name-status"],
        "deleted": ["git", "ls-files", "--deleted"],
    }
    if command_id not in commands:
        raise HarnessFailure("BLOCKED_GIT_BOUNDARY", "unknown Git command class")
    return list(commands[command_id])


def _verify_git_boundary(state: ExecutionState) -> None:
    outputs: dict[str, str] = {}
    for command_id in ("branch", "head", "origin", "ahead", "status", "staged", "deleted"):
        result = _run_command(
            _build_git_command(command_id),
            f"git_{command_id}",
            state.subprocess_environment,
            state.transcript,
            state.redaction_values,
            20,
            cwd=REPO_ROOT,
        )
        if result.returncode != 0:
            raise HarnessFailure("BLOCKED_GIT_BOUNDARY", f"Git check failed: {command_id}")
        outputs[command_id] = result.stdout.strip()
    if (
        outputs["branch"] != "main"
        or outputs["head"] != EXPECTED_HEAD
        or outputs["origin"] != EXPECTED_HEAD
        or outputs["ahead"].split() != ["0", "0"]
        or outputs["status"]
        or outputs["staged"]
        or outputs["deleted"]
    ):
        raise HarnessFailure("BLOCKED_GIT_BOUNDARY", "Git boundary mismatch")


def _build_registry_inspect() -> list[str]:
    return ["docker", "manifest", "inspect", "--verbose", IMMUTABLE_IMAGE]


def _build_image_pull() -> list[str]:
    return ["docker", "pull", "--platform", PLATFORM, IMMUTABLE_IMAGE]


def _build_image_inspect() -> list[str]:
    return ["docker", "image", "inspect", IMMUTABLE_IMAGE]


def _validate_resource_name(name: str) -> str:
    if re.fullmatch(r"[a-z0-9][a-z0-9_.-]{0,62}", name) is None:
        raise HarnessFailure("BLOCKED_DOCKER_RESOURCE_CONTRACT", "invalid resource name")
    return name


def _build_resource_absence(kind: str, name: str) -> list[str]:
    command = {
        "container": ["docker", "container", "inspect", _validate_resource_name(name)],
        "network": ["docker", "network", "inspect", _validate_resource_name(name)],
        "volume": ["docker", "volume", "inspect", _validate_resource_name(name)],
    }
    if kind not in command:
        raise HarnessFailure("BLOCKED_DOCKER_RESOURCE_CONTRACT", "invalid resource kind")
    return command[kind]


def _build_network_create(name: str) -> list[str]:
    return ["docker", "network", "create", "--internal", _validate_resource_name(name)]


def _build_volume_create(name: str) -> list[str]:
    return ["docker", "volume", "create", _validate_resource_name(name)]


def _build_container_run(environment: DisposableEnvironment) -> list[str]:
    migration_source = str(MIGRATION_PATH.resolve(strict=True))
    password_source = str(_validate_password_file(environment))
    return _build_container_run_arguments(environment, migration_source, password_source)


def _build_container_run_arguments(
    environment: DisposableEnvironment, migration_source: str, password_source: str
) -> list[str]:
    return [
        "docker",
        "run",
        "--detach",
        "--platform",
        PLATFORM,
        "--name",
        _validate_resource_name(environment.container),
        "--hostname",
        _validate_resource_name(environment.container),
        "--network",
        _validate_resource_name(environment.network),
        "--env",
        f"POSTGRES_USER={DATABASE_USER}",
        "--env",
        f"POSTGRES_DB={DATABASE_NAME}",
        "--env",
        POSTGRES_PASSWORD_FILE_SETTING,
        "--env",
        "POSTGRES_INITDB_ARGS=--encoding=UTF8 --locale=en_US.utf8 --locale-provider=libc",
        "--env",
        "LANG=en_US.utf8",
        "--read-only",
        "--tmpfs",
        "/run/postgresql:rw,nosuid,nodev,noexec,size=16m",
        "--tmpfs",
        "/tmp:rw,nosuid,nodev,noexec,size=32m",
        "--mount",
        f"type=volume,src={_validate_resource_name(environment.volume)},dst=/var/lib/postgresql/data",
        "--mount",
        f"type=bind,src={migration_source},dst=/koaptix/migration.sql,readonly",
        "--mount",
        (
            f"type=bind,src={password_source},dst={CONTAINER_SECRET_TARGET},"
            "readonly"
        ),
        IMMUTABLE_IMAGE,
    ]


def _build_readiness(container: str) -> list[str]:
    return [
        "docker",
        "exec",
        _validate_resource_name(container),
        "pg_isready",
        "-U",
        DATABASE_USER,
        "-d",
        DATABASE_NAME,
    ]


def _build_psql(container: str) -> list[str]:
    return [
        "docker",
        "exec",
        "-i",
        _validate_resource_name(container),
        "psql",
        "-X",
        "--no-psqlrc",
        "--set=ON_ERROR_STOP=1",
        "--set=VERBOSITY=verbose",
        "--no-align",
        "--tuples-only",
        "--quiet",
        "--field-separator=\x1f",
        "--record-separator=\x1e",
        "--username",
        DATABASE_USER,
        "--dbname",
        DATABASE_NAME,
    ]


def _build_psql_version(container: str) -> list[str]:
    return ["docker", "exec", _validate_resource_name(container), "psql", "--version"]


def _build_migration_apply(container: str) -> list[str]:
    return _build_psql(container) + ["--file=/koaptix/migration.sql"]


def _build_container_remove(name: str) -> list[str]:
    return ["docker", "container", "rm", "--force", _validate_resource_name(name)]


def _build_volume_remove(name: str) -> list[str]:
    return ["docker", "volume", "rm", _validate_resource_name(name)]


def _build_network_remove(name: str) -> list[str]:
    return ["docker", "network", "rm", _validate_resource_name(name)]


def _recursive_values(value: Any) -> Iterable[str]:
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for child in value.values():
            yield from _recursive_values(child)
    elif isinstance(value, list):
        for child in value:
            yield from _recursive_values(child)


def _verify_registry_metadata(state: ExecutionState) -> None:
    result = _run_command(
        _build_registry_inspect(),
        "registry_manifest_inspect",
        state.subprocess_environment,
        state.transcript,
        state.redaction_values,
        60,
    )
    if result.returncode != 0:
        raise HarnessFailure("BLOCKED_IMMUTABLE_IMAGE_METADATA", "registry metadata unavailable")
    try:
        metadata = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise HarnessFailure("BLOCKED_IMMUTABLE_IMAGE_METADATA", "registry metadata invalid") from exc
    values = set(_recursive_values(metadata))
    if PLATFORM_MANIFEST_DIGEST not in values or IMAGE_CONFIG_DIGEST not in values:
        raise HarnessFailure("BLOCKED_IMMUTABLE_IMAGE_METADATA", "registry digest mismatch")


def _verify_local_image(state: ExecutionState) -> None:
    result = _run_command(
        _build_image_inspect(),
        "local_image_inspect",
        state.subprocess_environment,
        state.transcript,
        state.redaction_values,
        30,
    )
    if result.returncode != 0:
        raise HarnessFailure("BLOCKED_IMMUTABLE_IMAGE_LOCAL_IDENTITY", "image inspect failed")
    try:
        image_records = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise HarnessFailure("BLOCKED_IMMUTABLE_IMAGE_LOCAL_IDENTITY", "image inspect invalid") from exc
    if (
        not isinstance(image_records, list)
        or len(image_records) != 1
        or image_records[0].get("Id") != IMAGE_CONFIG_DIGEST
        or IMAGE_INDEX_DIGEST not in image_records[0].get("RepoDigests", [])
    ):
        raise HarnessFailure("BLOCKED_IMMUTABLE_IMAGE_LOCAL_IDENTITY", "local image mismatch")


def _assert_resource_absent(state: ExecutionState, kind: str, name: str) -> None:
    result = _run_command(
        _build_resource_absence(kind, name),
        f"{kind}_absence",
        state.subprocess_environment,
        state.transcript,
        state.redaction_values,
        20,
    )
    if result.returncode == 0:
        raise HarnessFailure("BLOCKED_DOCKER_RESOURCE_COLLISION", f"{kind} collision")


def _environment_names(run_id: str, label: str, root: Path) -> DisposableEnvironment:
    if label not in {"a", "b"}:
        raise HarnessFailure("BLOCKED_DISPOSABLE_ENVIRONMENT_ISOLATION", "environment label")
    expected_root = _execution_root(run_id)
    if root.is_symlink() or root.resolve(strict=False) != expected_root:
        raise HarnessFailure("BLOCKED_DISPOSABLE_ENVIRONMENT_ISOLATION", "execution root")
    base = sanitize_runtime_identifier(f"kx-{run_id}-{label}")
    return DisposableEnvironment(
        label=label,
        container=sanitize_runtime_identifier(f"{base}-container"),
        network=sanitize_runtime_identifier(f"{base}-network"),
        volume=sanitize_runtime_identifier(f"{base}-volume"),
        run_root=root,
        password_file=root / "secrets" / label / PASSWORD_FILENAME,
    )


def _require_approval_guard(state: ExecutionState) -> None:
    if not state.approval_guard_passed:
        raise HarnessFailure("BLOCKED_EXECUTION_APPROVAL_GUARD_NOT_SATISFIED", "post-guard state")


def _validate_password_file(environment: DisposableEnvironment) -> Path:
    expected = environment.run_root / "secrets" / environment.label / PASSWORD_FILENAME
    candidate = environment.password_file
    if (
        environment.label not in {"a", "b"}
        or environment.run_root.is_symlink()
        or candidate.is_symlink()
        or candidate.parent.is_symlink()
        or candidate.parent.parent.is_symlink()
        or candidate.resolve(strict=False) != expected.resolve(strict=False)
        or not candidate.is_file()
    ):
        raise HarnessFailure("BLOCKED_DISPOSABLE_ENVIRONMENT_ISOLATION", "password file")
    file_stat = candidate.stat(follow_symlinks=False)
    if not stat.S_ISREG(file_stat.st_mode) or file_stat.st_nlink != 1:
        raise HarnessFailure("BLOCKED_DISPOSABLE_ENVIRONMENT_ISOLATION", "password file stat")
    if os.name == "posix":
        if stat.S_IMODE(file_stat.st_mode) & 0o077:
            raise HarnessFailure(
                "BLOCKED_DISPOSABLE_ENVIRONMENT_ISOLATION", "password file permissions"
            )
    return candidate.resolve(strict=True)


def _create_password_file(
    environment: DisposableEnvironment, state: ExecutionState
) -> None:
    _require_approval_guard(state)
    secrets_root = environment.run_root / "secrets"
    label_root = secrets_root / environment.label
    if environment.run_root.is_symlink() or not environment.run_root.is_dir():
        raise HarnessFailure("BLOCKED_DISPOSABLE_ENVIRONMENT_ISOLATION", "execution root")
    try:
        if secrets_root.exists():
            if secrets_root.is_symlink() or not secrets_root.is_dir():
                raise HarnessFailure(
                    "BLOCKED_DISPOSABLE_ENVIRONMENT_ISOLATION", "secrets root"
                )
        else:
            secrets_root.mkdir(mode=0o700)
        if label_root.exists() or label_root.is_symlink():
            raise HarnessFailure(
                "BLOCKED_DISPOSABLE_ENVIRONMENT_ISOLATION", "password directory collision"
            )
        label_root.mkdir(mode=0o700)
        if environment.password_file.exists() or environment.password_file.is_symlink():
            raise HarnessFailure(
                "BLOCKED_DISPOSABLE_ENVIRONMENT_ISOLATION", "password file collision"
            )
        password = f"{environment.label}-{secrets.token_hex(32)}"
        state.redaction_values.append(password)
        flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
        descriptor = os.open(environment.password_file, flags, 0o600)
        try:
            with os.fdopen(descriptor, "wb", closefd=True) as output:
                descriptor = -1
                output.write((password + "\n").encode("ascii"))
        finally:
            if descriptor >= 0:
                os.close(descriptor)
    except OSError as exc:
        raise HarnessFailure(
            "BLOCKED_DISPOSABLE_ENVIRONMENT_ISOLATION", "password file creation"
        ) from exc
    _validate_password_file(environment)


def _verify_reconciled_execution_contract() -> dict[str, Any]:
    sample_run_id = "wp02-o01-20000101T000000Z-00000000"
    run_root = _execution_root(sample_run_id)
    environments = [
        _environment_names(sample_run_id, label, run_root) for label in ("a", "b")
    ]
    if environments[0].password_file == environments[1].password_file:
        raise HarnessFailure(
            "BLOCKED_PASSWORD_FILE_DELIVERY_CONTRACT_NOT_PROVEN", "shared password path"
        )
    migration_source = str(MIGRATION_PATH.resolve(strict=True))
    commands = [
        _build_container_run_arguments(
            environment,
            migration_source,
            str(environment.password_file.resolve(strict=False)),
        )
        for environment in environments
    ]
    forbidden_env_file = "--env" + "-file"
    forbidden_secret_setting = "POSTGRES_" + "PASSWORD="
    forbidden_psql_environment = "PG" + "PASSWORD"
    for environment, command in zip(environments, commands, strict=True):
        expected_mount = (
            f"type=bind,src={environment.password_file.resolve(strict=False)},"
            f"dst={CONTAINER_SECRET_TARGET},readonly"
        )
        if (
            expected_mount not in command
            or POSTGRES_PASSWORD_FILE_SETTING not in command
            or forbidden_env_file in command
            or any(value.startswith(forbidden_secret_setting) for value in command)
            or any(forbidden_psql_environment in value for value in command)
        ):
            raise HarnessFailure(
                "BLOCKED_PASSWORD_FILE_DELIVERY_CONTRACT_NOT_PROVEN",
                f"container builder {environment.label}",
            )
    psql_command = _build_psql(environments[0].container)
    if any(
        token in value.lower()
        for value in psql_command
        for token in ("password", "pgpassword")
    ):
        raise HarnessFailure(
            "BLOCKED_PSQL_PASSWORD_FREE_CONTRACT_NOT_PROVEN", "psql builder"
        )
    source = _strict_read_text(HERE / "run_validation.py")
    runtime_supply_name = "koaptix-wp02-o01-" + "runtime-supply"
    if runtime_supply_name in source:
        raise HarnessFailure(
            "BLOCKED_APPROVAL_GUARD_ORDERING_NOT_PROVEN", "runtime supply ownership"
        )
    return {
        "root_ownership_contract": (
            "PASS_SEPARATE_ROOT_OWNERSHIP_AND_NON_OVERLAPPING_CLEANUP"
        ),
        "pre_guard_execution_root_entries": [APPROVAL_FILENAME],
        "post_guard_child_creation": "REQUIRES_APPROVAL_GUARD_PASS",
        "password_delivery_contract": (
            "PASS_READ_ONLY_PASSWORD_FILE_MOUNT_AND_PASSWORD_FREE_PSQL_BUILDERS"
        ),
    }


def _create_environment(
    state: ExecutionState, environment: DisposableEnvironment
) -> DisposableEnvironment:
    label = environment.label
    environment.creation_attempted = True
    for kind, name in (
        ("container", environment.container),
        ("network", environment.network),
        ("volume", environment.volume),
    ):
        _assert_resource_absent(state, kind, name)
    _create_password_file(environment, state)
    network = _run_command(
        _build_network_create(environment.network),
        f"network_create_{label}",
        state.subprocess_environment,
        state.transcript,
        state.redaction_values,
        30,
    )
    if network.returncode != 0:
        raise HarnessFailure("FAILED_DISPOSABLE_NETWORK_CREATE", f"network {label}")
    environment.network_created = True
    volume = _run_command(
        _build_volume_create(environment.volume),
        f"volume_create_{label}",
        state.subprocess_environment,
        state.transcript,
        state.redaction_values,
        30,
    )
    if volume.returncode != 0:
        raise HarnessFailure("FAILED_DISPOSABLE_VOLUME_CREATE", f"volume {label}")
    environment.volume_created = True
    container = _run_command(
        _build_container_run(environment),
        f"container_create_{label}",
        state.subprocess_environment,
        state.transcript,
        state.redaction_values,
        90,
    )
    if container.returncode != 0:
        raise HarnessFailure("FAILED_DISPOSABLE_CONTAINER_CREATE", f"container {label}")
    environment.container_created = True
    ready = False
    for attempt in range(30):
        readiness = _run_command(
            _build_readiness(environment.container),
            f"readiness_{label}_{attempt + 1}",
            state.subprocess_environment,
            state.transcript,
            state.redaction_values,
            10,
        )
        if readiness.returncode == 0:
            ready = True
            break
        time.sleep(1)
    if not ready:
        raise HarnessFailure("FAILED_DISPOSABLE_DATABASE_READINESS", f"readiness {label}")
    version = _run_command(
        _build_psql_version(environment.container),
        f"psql_version_{label}",
        state.subprocess_environment,
        state.transcript,
        state.redaction_values,
        20,
    )
    if version.returncode != 0 or "15.18" not in version.stdout:
        raise HarnessFailure("FAILED_PSQL_VERSION_IDENTITY", f"psql version {label}")
    state.psql_version = version.stdout.strip()
    return environment


def _run_psql(
    state: ExecutionState,
    container: str,
    sql: str,
    command_class: str,
    expected_exit: int = 0,
) -> CommandResult:
    encoded = sql.encode("utf-8", errors="strict")
    result = _run_command(
        _build_psql(container),
        command_class,
        state.subprocess_environment,
        state.transcript,
        state.redaction_values,
        60,
        stdin_bytes=encoded,
    )
    if result.returncode != expected_exit:
        raise HarnessFailure("FAILED_DISPOSABLE_SQL_EXPECTATION", f"unexpected exit: {command_class}")
    return result


def _parse_psql_rows(text: str) -> list[list[str | None]]:
    rows: list[list[str | None]] = []
    for record in text.strip("\n\x1e").split("\x1e"):
        if not record:
            continue
        fields: list[str | None] = []
        for value in record.split("\x1f"):
            fields.append(None if value == "" else value)
        rows.append(fields)
    return rows


def _run_metadata_query(
    state: ExecutionState, container: str, query_id: str, sql: str
) -> list[list[str | None]]:
    result = _run_psql(state, container, sql, f"metadata_{query_id.lower()}")
    return _parse_psql_rows(result.stdout)


def _assert_preapply_absence(rows: Sequence[Sequence[str | None]]) -> None:
    if len(rows) != 6 or any(len(row) != 2 or row[1] != "0" for row in rows):
        raise HarnessFailure("FAILED_PREAPPLY_OBJECT_ABSENCE", "preapply state is not empty")


def _apply_migration(state: ExecutionState, environment: DisposableEnvironment) -> None:
    if sha256_file(MIGRATION_PATH) != EXPECTED_MIGRATION_SHA256:
        raise HarnessFailure("BLOCKED_MIGRATION_IDENTITY_DRIFT", "migration changed before apply")
    result = _run_command(
        _build_migration_apply(environment.container),
        f"migration_apply_{environment.label}",
        state.subprocess_environment,
        state.transcript,
        state.redaction_values,
        90,
    )
    state.migration_exit_code = result.returncode
    if result.returncode != 0:
        raise HarnessFailure("FAILED_ONE_FILE_MIGRATION_APPLY", f"migration {environment.label}")


def _collect_metadata(
    state: ExecutionState,
    environment: DisposableEnvironment,
    blocks: Mapping[str, str],
) -> dict[str, Any]:
    collected: dict[str, Any] = {}
    for query_id in METADATA_QUERY_IDS:
        collected[query_id] = _run_metadata_query(
            state, environment.container, query_id, blocks[query_id]
        )
    _assert_metadata_contract(collected)
    return collected


def _bool_text(value: str | None) -> bool:
    if value == "t":
        return True
    if value == "f":
        return False
    raise HarnessFailure("FAILED_METADATA_CONTRACT", "invalid boolean text")


def _normalized_locale(value: str | None) -> str:
    if value is None:
        return ""
    return re.sub(r"[^a-z0-9]", "", value.lower())


def _assert_metadata_contract(metadata: Mapping[str, Any]) -> None:
    runtime = metadata["RUNTIME_VERSION"]
    if (
        len(runtime) != 1
        or runtime[0][2] is None
        or not runtime[0][2].startswith("15.18")
        or runtime[0][3] != "150018"
    ):
        raise HarnessFailure("FAILED_METADATA_CONTRACT", "server version")
    locale = metadata["DATABASE_LOCALE"]
    if (
        len(locale) != 1
        or locale[0][1] != "UTF8"
        or locale[0][2] != "UTF8"
        or _normalized_locale(locale[0][3]) != "enusutf8"
        or _normalized_locale(locale[0][4]) != "enusutf8"
        or locale[0][5] != "c"
    ):
        raise HarnessFailure("FAILED_METADATA_CONTRACT", "database locale")
    table = metadata["TABLE_IDENTITY"]
    if table != [["public", "koaptix_identity_reference_code", "r", "p", "f", "f"]]:
        raise HarnessFailure("FAILED_METADATA_CONTRACT", "table identity")
    columns = metadata["COLUMN_INVENTORY"]
    expected_columns = [
        ("1", "code_family", "text", "t"),
        ("2", "code", "text", "t"),
        ("3", "label", "text", "t"),
        ("4", "description", "text", "f"),
        ("5", "sort_order", "integer", "t"),
        ("6", "is_active", "boolean", "t"),
        ("7", "created_at", "timestamp with time zone", "t"),
        ("8", "retired_at", "timestamp with time zone", "f"),
    ]
    if len(columns) != 8 or [tuple(row[:4]) for row in columns] != expected_columns:
        raise HarnessFailure("FAILED_METADATA_CONTRACT", "column inventory")
    defaults = {row[1]: row[2] for row in metadata["COLUMN_DEFAULTS"]}
    if (
        len(defaults) != 8
        or defaults["sort_order"] != "100"
        or defaults["is_active"] != "true"
        or defaults["created_at"] != "now()"
        or any(defaults[name] is not None for name in ("code_family", "code", "label", "description", "retired_at"))
    ):
        raise HarnessFailure("FAILED_METADATA_CONTRACT", "column defaults")
    primary = metadata["PRIMARY_KEY"]
    if (
        len(primary) != 1
        or primary[0][0] != PRIMARY_KEY_NAME
        or primary[0][1] != "p"
        or primary[0][2] != "PRIMARY KEY (code_family, code)"
    ):
        raise HarnessFailure("FAILED_METADATA_CONTRACT", "primary key")
    checks = metadata["CHECK_CONSTRAINTS"]
    if (
        len(checks) != 6
        or tuple(row[0] for row in checks) != CHECK_CONSTRAINTS
        or any(row[2] != "t" or not row[1] for row in checks)
    ):
        raise HarnessFailure("FAILED_METADATA_CONTRACT", "check constraints")
    indexes = metadata["INDEX_INVENTORY"]
    if len(indexes) != 1 or indexes[0][0] != PRIMARY_KEY_NAME or indexes[0][1:3] != ["t", "t"]:
        raise HarnessFailure("FAILED_METADATA_CONTRACT", "index inventory")
    if metadata["TRIGGER_INVENTORY"] or metadata["FOREIGN_KEY_INVENTORY"]:
        raise HarnessFailure("FAILED_METADATA_CONTRACT", "trigger or foreign key")
    policy = metadata["POLICY_AND_RLS"]
    if policy != [["f", "f", "0"]]:
        raise HarnessFailure("FAILED_METADATA_CONTRACT", "policy or RLS")
    if (
        metadata["DEPENDENT_VIEWS"]
        or metadata["DEPENDENT_MATERIALIZED_VIEWS"]
        or metadata["DEPENDENCY_SCAN"]
    ):
        raise HarnessFailure("FAILED_METADATA_CONTRACT", "unexpected dependency")
    if metadata["ROW_COUNT"] != [["0"]]:
        raise HarnessFailure("FAILED_METADATA_CONTRACT", "row count after apply")
    controls = metadata["COLLATION_CONTROL"]
    if controls != [["t", "t", "t", "t", "f", "f", "f"]]:
        raise HarnessFailure("FAILED_METADATA_CONTRACT", "collation controls")


def _expand_value(value: Any) -> Any:
    if not isinstance(value, dict):
        return value
    kind = value["kind"]
    if kind == "repeat":
        return value["character"] * value["count"]
    if kind == "timestamp":
        return TimestampValue(value["value"])
    controls = {"SPACE": " ", "TAB": "\t", "LF": "\n", "CR": "\r", "VT": "\v", "FF": "\f"}
    if kind == "internal_control":
        return value["left"] + controls[value["control"]] + value["right"]
    if kind == "boundary_control":
        control = controls[value["control"]]
        if value["position"] == "only":
            return control
        if value["position"] == "leading":
            return control + value["value"]
        return value["value"] + control
    raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", "unexpandable fixture value")


def _expand_row(row: Mapping[str, Any]) -> dict[str, Any]:
    return {name: _expand_value(value) for name, value in row.items()}


def _sql_literal(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, TimestampValue):
        return "'" + value.text.replace("'", "''") + "'::timestamptz"
    if isinstance(value, str):
        if "\x00" in value:
            raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", "NUL in SQL literal")
        return "'" + value.replace("'", "''") + "'"
    raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", "unsupported SQL literal")


def _insert_statement(row: Mapping[str, Any]) -> str:
    expanded = _expand_row(row)
    columns = [name for name in TABLE_COLUMNS if name in expanded]
    if not columns:
        raise HarnessFailure("BLOCKED_FIXTURE_CONTRACT_INVALID", "empty fixture row")
    values = [_sql_literal(expanded[name]) for name in columns]
    return (
        f"INSERT INTO {TARGET_TABLE} ("
        + ", ".join(columns)
        + ") VALUES ("
        + ", ".join(values)
        + ");"
    )


def _positive_script(fixture: Mapping[str, Any]) -> str:
    statements = ["BEGIN;", _insert_statement(fixture["input"])]
    statements.append(f"SELECT count(*)::bigint FROM {TARGET_TABLE};")
    if fixture["fixture_id"] == "POS-022":
        statements.append(
            f"SELECT sort_order, is_active, (created_at IS NOT NULL) FROM {TARGET_TABLE};"
        )
    statements.append("ROLLBACK;")
    return "\n".join(statements) + "\n"


def _negative_script(fixture: Mapping[str, Any]) -> str:
    statements = ["BEGIN;"]
    if fixture["fixture_id"] == "NEG-018":
        rows = fixture["input"]["rows"]
        statements.extend((_insert_statement(rows[0]), _insert_statement(rows[1])))
    else:
        statements.append(_insert_statement(fixture["input"]))
    statements.append("ROLLBACK;")
    return "\n".join(statements) + "\n"


def _zero_row_script() -> str:
    return f"SELECT count(*)::bigint FROM {TARGET_TABLE};\n"


def _assert_zero_rows(state: ExecutionState, container: str, fixture_id: str) -> None:
    result = _run_psql(
        state,
        container,
        _zero_row_script(),
        f"fixture_zero_row_{fixture_id.lower()}",
    )
    if _parse_psql_rows(result.stdout) != [["0"]]:
        raise HarnessFailure("FAILED_FIXTURE_RESIDUAL_ROW", fixture_id)


def _run_positive_fixtures(
    state: ExecutionState,
    environment: DisposableEnvironment,
    fixtures: Sequence[Mapping[str, Any]],
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for fixture in fixtures:
        fixture_id = fixture["fixture_id"]
        result = _run_psql(
            state,
            environment.container,
            _positive_script(fixture),
            f"positive_fixture_{fixture_id.lower()}",
        )
        rows = _parse_psql_rows(result.stdout)
        if not rows or rows[0] != ["1"]:
            raise HarnessFailure("FAILED_POSITIVE_FIXTURE", fixture_id)
        if fixture_id == "POS-022" and (len(rows) < 2 or rows[1] != ["100", "t", "t"]):
            raise HarnessFailure("FAILED_POSITIVE_FIXTURE_DEFAULTS", fixture_id)
        _assert_zero_rows(state, environment.container, fixture_id)
        results.append(
            {
                "fixture_id": fixture_id,
                "status": "PASS",
                "exit_code": result.returncode,
                "row_count_after": 0,
            }
        )
    return results


def _run_negative_fixtures(
    state: ExecutionState,
    environment: DisposableEnvironment,
    fixtures: Sequence[Mapping[str, Any]],
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for fixture in fixtures:
        fixture_id = fixture["fixture_id"]
        result = _run_command(
            _build_psql(environment.container),
            f"negative_fixture_{fixture_id.lower()}",
            state.subprocess_environment,
            state.transcript,
            state.redaction_values,
            60,
            stdin_bytes=_negative_script(fixture).encode("utf-8", errors="strict"),
        )
        diagnostics = result.stderr
        expected_sqlstate = fixture["expected_sqlstate"]
        expected_constraint = fixture["expected_constraint"]
        expected_column = fixture["expected_column"]
        if result.returncode != 3 or expected_sqlstate not in diagnostics:
            raise HarnessFailure("FAILED_NEGATIVE_FIXTURE", fixture_id)
        if expected_constraint is not None and expected_constraint not in diagnostics:
            raise HarnessFailure("FAILED_NEGATIVE_FIXTURE_CONSTRAINT", fixture_id)
        if expected_column is not None and f'"{expected_column}"' not in diagnostics:
            raise HarnessFailure("FAILED_NEGATIVE_FIXTURE_COLUMN", fixture_id)
        _assert_zero_rows(state, environment.container, fixture_id)
        results.append(
            {
                "fixture_id": fixture_id,
                "status": "PASS_EXPECTED_REJECTION",
                "exit_code": result.returncode,
                "sqlstate": expected_sqlstate,
                "constraint": expected_constraint,
                "column": expected_column,
                "row_count_after": 0,
            }
        )
    return results


def _cleanup_environment(state: ExecutionState, environment: DisposableEnvironment | None) -> bool:
    if environment is None:
        return True
    if environment.destroyed:
        return True
    cleanup_ok = True
    if environment.container_created:
        result = _run_command(
            _build_container_remove(environment.container),
            f"container_remove_{environment.label}",
            state.subprocess_environment,
            state.transcript,
            state.redaction_values,
            45,
        )
        cleanup_ok = cleanup_ok and result.returncode == 0
        if result.returncode == 0:
            environment.container_created = False
    if environment.volume_created:
        result = _run_command(
            _build_volume_remove(environment.volume),
            f"volume_remove_{environment.label}",
            state.subprocess_environment,
            state.transcript,
            state.redaction_values,
            45,
        )
        cleanup_ok = cleanup_ok and result.returncode == 0
        if result.returncode == 0:
            environment.volume_created = False
    if environment.network_created:
        result = _run_command(
            _build_network_remove(environment.network),
            f"network_remove_{environment.label}",
            state.subprocess_environment,
            state.transcript,
            state.redaction_values,
            45,
        )
        cleanup_ok = cleanup_ok and result.returncode == 0
        if result.returncode == 0:
            environment.network_created = False
    for kind, name in (
        ("container", environment.container),
        ("volume", environment.volume),
        ("network", environment.network),
    ):
        result = _run_command(
            _build_resource_absence(kind, name),
            f"{kind}_final_absence_{environment.label}",
            state.subprocess_environment,
            state.transcript,
            state.redaction_values,
            20,
        )
        cleanup_ok = cleanup_ok and result.returncode != 0
    if environment.password_file.exists() and not environment.password_file.is_symlink():
        environment.password_file.unlink()
    cleanup_ok = cleanup_ok and not environment.password_file.exists()
    label_root = environment.password_file.parent
    if label_root.exists() and not label_root.is_symlink() and not any(label_root.iterdir()):
        label_root.rmdir()
    secrets_root = label_root.parent
    if secrets_root.exists() and not secrets_root.is_symlink() and not any(secrets_root.iterdir()):
        secrets_root.rmdir()
    environment.destroyed = cleanup_ok
    return cleanup_ok


def _remove_run_root(state: ExecutionState) -> bool:
    expected = _execution_root(state.run_id)
    if state.run_root.resolve(strict=False) != expected or state.run_root.is_symlink():
        return False
    shutil.rmtree(state.run_root)
    state.temp_root_removed = not state.run_root.exists()
    parent = expected.parent
    if parent.exists() and not any(parent.iterdir()):
        parent.rmdir()
    return state.temp_root_removed


def _metadata_result_fields(metadata: Mapping[str, Any]) -> dict[str, Any]:
    runtime = metadata["RUNTIME_VERSION"][0]
    locale = metadata["DATABASE_LOCALE"][0]
    columns = metadata["COLUMN_INVENTORY"]
    defaults = {row[1]: row[2] for row in metadata["COLUMN_DEFAULTS"]}
    exact_columns = [
        {
            "ordinal_position": int(row[0]),
            "column_name": row[1],
            "data_type": row[2],
            "not_null": _bool_text(row[3]),
            "default_expression": defaults[row[1]],
            "identity_kind": row[4] or "",
            "generated_kind": row[5] or "",
            "collation_name": row[6],
        }
        for row in columns
    ]
    checks = [
        {
            "constraint_name": row[0],
            "normalized_definition": row[1],
            "validated": _bool_text(row[2]),
        }
        for row in metadata["CHECK_CONSTRAINTS"]
    ]
    indexes = metadata["INDEX_INVENTORY"]
    policy = metadata["POLICY_AND_RLS"][0]
    return {
        "PostgreSQL_server_version": runtime[2],
        "PostgreSQL_server_version_num": runtime[3],
        "database_encoding": locale[1],
        "client_encoding": locale[2],
        "lc_collate": locale[3],
        "lc_ctype": locale[4],
        "locale_provider": locale[5],
        "table_exists": True,
        "table_count": len(metadata["TABLE_IDENTITY"]),
        "column_count": len(columns),
        "exact_columns": exact_columns,
        "primary_key_count": len(metadata["PRIMARY_KEY"]),
        "primary_key_columns": ["code_family", "code"],
        "check_constraint_count": len(checks),
        "exact_check_constraints": checks,
        "PK_backed_index_count": sum(1 for row in indexes if row[1] == "t"),
        "explicit_secondary_index_count": sum(1 for row in indexes if row[1] != "t"),
        "noninternal_trigger_count": len(metadata["TRIGGER_INVENTORY"]),
        "policy_count": int(policy[2]),
        "RLS_enabled": _bool_text(policy[0]),
        "forced_RLS_enabled": _bool_text(policy[1]),
        "foreign_key_count": len(metadata["FOREIGN_KEY_INVENTORY"]),
        "dependent_view_count": len(metadata["DEPENDENT_VIEWS"]),
        "dependent_materialized_view_count": len(metadata["DEPENDENT_MATERIALIZED_VIEWS"]),
        "unexpected_dependency_count": len(metadata["DEPENDENCY_SCAN"]),
        "row_count_after_apply": int(metadata["ROW_COUNT"][0][0]),
    }


def _write_artifacts(
    state: ExecutionState,
    schema: Mapping[str, Any],
    status: str,
    conclusion: str,
) -> dict[str, Any]:
    if state.artifact_root.exists() or state.artifact_root.is_symlink():
        raise HarnessFailure("BLOCKED_ARTIFACT_ROOT_COLLISION", "artifact root collision")
    handoff_root = REPO_ROOT / ".handoff"
    if handoff_root.is_symlink() or not handoff_root.is_dir():
        raise HarnessFailure("BLOCKED_ARTIFACT_PATH_SAFETY", "handoff root")
    state.artifact_root.mkdir(parents=True, exist_ok=False)
    paths = {
        name: safe_artifact_path(state.artifact_root, name) for name in ARTIFACT_NAMES
    }
    if status == SUCCESS_STATUS:
        if state.completed_gates != list(DVG_IDS[:14]):
            raise HarnessFailure("BLOCKED_VALIDATION_GATE_ORDER", "artifact gate prerequisites")
        _mark_gate(state, "DVG-15")
    else:
        state.transcript.append(
            {
                "event": "fail_closed_evidence_capture",
                "completed_gates": list(state.completed_gates),
                "status": status,
            }
        )
    write_canonical_json(paths["metadata_first_apply.json"], state.metadata_a)
    write_canonical_json(paths["metadata_clean_reapply.json"], state.metadata_b)
    write_jsonl(paths["positive_fixture_results.jsonl"], state.positive_results)
    write_jsonl(paths["negative_fixture_results.jsonl"], state.negative_results)
    write_jsonl(paths["transcript.redacted.txt"], state.transcript)
    manifest_inputs = [
        paths["metadata_first_apply.json"],
        paths["metadata_clean_reapply.json"],
        paths["positive_fixture_results.jsonl"],
        paths["negative_fixture_results.jsonl"],
        paths["transcript.redacted.txt"],
    ]
    # The result points to the manifest, so the manifest covers the five
    # predecessor evidence payloads and avoids a cyclic hash dependency.
    write_manifest(
        paths["sha256_manifest.txt"],
        build_manifest_entries(manifest_inputs),
    )
    result = _result_skeleton(state.run_id)
    result.update(
        {
            "status": status,
            "validation_classification": (
                "COMPLETE_UPSTREAM_COMPATIBILITY_ONLY"
                if status == SUCCESS_STATUS
                else "FAIL_CLOSED_INCOMPLETE"
            ),
            "isolation_status": (
                "PASS_PRODUCTION_ISOLATED"
                if status == SUCCESS_STATUS
                else "BLOCKED_ISOLATION_NOT_PROVEN"
            ),
            "verified_platform_manifest_digest": (
                PLATFORM_MANIFEST_DIGEST if state.metadata_a else None
            ),
            "verified_image_config_digest": IMAGE_CONFIG_DIGEST if state.metadata_a else None,
            "psql_version": state.psql_version,
            "migration_apply_exit_code": state.migration_exit_code,
            "positive_fixture_passed": len(state.positive_results),
            "negative_fixture_passed": len(state.negative_results),
            "row_count_after_fixtures": 0 if len(state.negative_results) == 55 else None,
            "first_environment_destroyed": bool(
                state.environment_a
                and state.environment_a.creation_attempted
                and state.environment_a.destroyed
            ),
            "second_environment_destroyed": bool(
                state.environment_b
                and state.environment_b.creation_attempted
                and state.environment_b.destroyed
            ),
            "first_network_destroyed": bool(
                state.environment_a
                and state.environment_a.creation_attempted
                and state.environment_a.destroyed
            ),
            "second_network_destroyed": bool(
                state.environment_b
                and state.environment_b.creation_attempted
                and state.environment_b.destroyed
            ),
            "first_volume_destroyed": bool(
                state.environment_a
                and state.environment_a.creation_attempted
                and state.environment_a.destroyed
            ),
            "second_volume_destroyed": bool(
                state.environment_b
                and state.environment_b.creation_attempted
                and state.environment_b.destroyed
            ),
            "temporary_root_removed": state.temp_root_removed,
            "sha256_manifest_sha256": sha256_file(paths["sha256_manifest.txt"]),
            "one_line_conclusion": conclusion,
        }
    )
    if state.metadata_a:
        result.update(_metadata_result_fields(state.metadata_a))
        result["first_metadata_sha256"] = sha256_file(paths["metadata_first_apply.json"])
    if state.metadata_b:
        result["clean_reapply_metadata_sha256"] = sha256_file(
            paths["metadata_clean_reapply.json"]
        )
    if state.metadata_a and state.metadata_b:
        result["metadata_hashes_match"] = (
            result["first_metadata_sha256"] == result["clean_reapply_metadata_sha256"]
        )
    _manual_validate(result, schema)
    write_canonical_json(paths["result.json"], result)
    if sorted(path.name for path in state.artifact_root.iterdir()) != sorted(ARTIFACT_NAMES):
        raise HarnessFailure("BLOCKED_ARTIFACT_SET_MISMATCH", "artifact set")
    for path in state.artifact_root.iterdir():
        artifact_text = path.read_text(encoding="utf-8", errors="strict")
        findings = scan_secret_like_text(artifact_text)
        if findings:
            raise HarnessFailure("BLOCKED_ARTIFACT_SECRET_SCAN", path.name)
    return result


def _prepare_execution_state(run_id: str, run_root: Path, artifact_root: Path) -> ExecutionState:
    docker_config = run_root / "docker-config"
    return ExecutionState(
        run_id=run_id,
        run_root=run_root,
        artifact_root=artifact_root,
        docker_config=docker_config,
        subprocess_environment=_minimal_environment(docker_config),
        redaction_values=[],
        transcript=[],
        approval_guard_passed=True,
    )


def _create_docker_client_config(state: ExecutionState) -> None:
    _require_approval_guard(state)
    if state.docker_config.exists() or state.docker_config.is_symlink():
        raise HarnessFailure("BLOCKED_DISPOSABLE_ENVIRONMENT_ISOLATION", "Docker client config collision")
    state.docker_config.mkdir()
    config_path = state.docker_config / "config.json"
    config_path.write_text("{}\n", encoding="utf-8", newline="\n")


def execute_validation(
    args: argparse.Namespace,
    static_report: Mapping[str, Any],
    fixtures: Mapping[str, Any],
    blocks: Mapping[str, str],
    schema: Mapping[str, Any],
) -> int:
    run_id, run_root, artifact_root = verify_execution_guard(args, static_report)
    state = _prepare_execution_state(run_id, run_root, artifact_root)
    status = SUCCESS_STATUS
    conclusion = (
        "Disposable upstream PostgreSQL compatibility validation passed with complete cleanup "
        "and no production authority."
    )
    failure: HarnessFailure | None = None
    try:
        _verify_git_boundary(state)
        _mark_gate(state, "DVG-01")
        _create_docker_client_config(state)
        _verify_registry_metadata(state)
        _mark_gate(state, "DVG-02")
        state.environment_a = _environment_names(state.run_id, "a", state.run_root)
        state.environment_b = _environment_names(state.run_id, "b", state.run_root)
        for environment in (state.environment_a, state.environment_b):
            for kind, name in (
                ("container", environment.container),
                ("network", environment.network),
                ("volume", environment.volume),
            ):
                _assert_resource_absent(state, kind, name)
        _mark_gate(state, "DVG-03")
        pull = _run_command(
            _build_image_pull(),
            "immutable_image_pull",
            state.subprocess_environment,
            state.transcript,
            state.redaction_values,
            300,
        )
        if pull.returncode != 0:
            raise HarnessFailure("FAILED_IMMUTABLE_IMAGE_PULL", "image pull failed")
        _verify_local_image(state)
        state.environment_a = _create_environment(state, state.environment_a)
        _mark_gate(state, "DVG-04")
        preapply_a = _run_metadata_query(
            state,
            state.environment_a.container,
            "PREAPPLY_OBJECT_ABSENCE",
            blocks["PREAPPLY_OBJECT_ABSENCE"],
        )
        _assert_preapply_absence(preapply_a)
        _mark_gate(state, "DVG-05")
        _apply_migration(state, state.environment_a)
        _mark_gate(state, "DVG-06")
        state.metadata_a = _collect_metadata(state, state.environment_a, blocks)
        _mark_gate(state, "DVG-07")
        state.positive_results = _run_positive_fixtures(
            state, state.environment_a, fixtures["positive_fixtures"]
        )
        _mark_gate(state, "DVG-08")
        state.negative_results = _run_negative_fixtures(
            state, state.environment_a, fixtures["negative_fixtures"]
        )
        _mark_gate(state, "DVG-09")
        if state.metadata_a["COLLATION_CONTROL"] != [["t", "t", "t", "t", "f", "f", "f"]]:
            raise HarnessFailure("FAILED_COLLATION_CONTROL", "collation controls")
        _mark_gate(state, "DVG-10")
        if (
            state.metadata_a["TRIGGER_INVENTORY"]
            or state.metadata_a["FOREIGN_KEY_INVENTORY"]
            or state.metadata_a["DEPENDENT_VIEWS"]
            or state.metadata_a["DEPENDENT_MATERIALIZED_VIEWS"]
            or state.metadata_a["DEPENDENCY_SCAN"]
            or state.metadata_a["ROW_COUNT"] != [["0"]]
        ):
            raise HarnessFailure("FAILED_NO_SEED_SECURITY_LEGACY_DEPENDENCY_PROOF", "absence proof")
        _mark_gate(state, "DVG-11")
        _assert_zero_rows(state, state.environment_a.container, "FINAL-A")
        if not _cleanup_environment(state, state.environment_a):
            raise HarnessFailure(
                "BLOCKED_DISPOSABLE_ENVIRONMENT_CLEANUP_NOT_PROVEN",
                "environment A cleanup",
            )
        _mark_gate(state, "DVG-12")
        state.environment_b = _create_environment(state, state.environment_b)
        _verify_local_image(state)
        preapply_b = _run_metadata_query(
            state,
            state.environment_b.container,
            "PREAPPLY_OBJECT_ABSENCE",
            blocks["PREAPPLY_OBJECT_ABSENCE"],
        )
        _assert_preapply_absence(preapply_b)
        _apply_migration(state, state.environment_b)
        state.metadata_b = _collect_metadata(state, state.environment_b, blocks)
        _mark_gate(state, "DVG-13")
        if canonical_json_bytes(state.metadata_a) != canonical_json_bytes(state.metadata_b):
            raise HarnessFailure("FAILED_CLEAN_REAPPLY_METADATA_HASH_MISMATCH", "metadata A/B")
        if not _cleanup_environment(state, state.environment_b):
            raise HarnessFailure(
                "BLOCKED_DISPOSABLE_ENVIRONMENT_CLEANUP_NOT_PROVEN",
                "environment B cleanup",
            )
        _mark_gate(state, "DVG-14")
    except HarnessFailure as exc:
        failure = exc
        status = exc.status
        conclusion = f"Disposable validation stopped fail closed: {exc.status}."
    finally:
        cleanup_a = _cleanup_environment(state, state.environment_a)
        cleanup_b = _cleanup_environment(state, state.environment_b)
        temp_removed = _remove_run_root(state)
        if not cleanup_a or not cleanup_b or not temp_removed:
            status = "BLOCKED_DISPOSABLE_ENVIRONMENT_CLEANUP_NOT_PROVEN"
            conclusion = "Disposable validation stopped because complete cleanup was not proven."
            failure = HarnessFailure(status, conclusion)
    try:
        result = _write_artifacts(state, schema, status, conclusion)
    except HarnessFailure:
        if (
            state.artifact_root.exists()
            and not state.artifact_root.is_symlink()
            and state.artifact_root.resolve(strict=False) == ARTIFACT_ROOT.resolve(strict=False)
        ):
            shutil.rmtree(state.artifact_root)
        raise
    sys.stdout.buffer.write(canonical_json_bytes(result))
    return 0 if failure is None and status == SUCCESS_STATUS else 1


def _sanitized_plan() -> dict[str, Any]:
    return {
        "lane": PATCH_LANE,
        "mode": "PLAN_ONLY_NO_EXTERNAL_ACTION",
        "runtime": "CPython 3.14.6 final",
        "dependency_mode": "PYTHON_STANDARD_LIBRARY_ONLY",
        "harness_root": "tooling/koaptix/wp02_o01_validation",
        "file_count": 5,
        "positive_fixture_count": 22,
        "negative_fixture_count": 55,
        "metadata_query_count": 17,
        "future_artifact_count": 7,
        "execution_guard": "EXTERNAL_RUN_SCOPED_APPROVAL_FILE_PLUS_EXPLICIT_EXECUTE_FLAG",
        "root_ownership": "SEPARATE_RUNTIME_SUPPLY_AND_HARNESS_EXECUTION_ROOTS",
        "secret_delivery": "READ_ONLY_PASSWORD_FILE_PLUS_POSTGRES_PASSWORD_FILE",
        "external_action_attempted": False,
    }


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="run_validation.py",
        description="WP-02/O-01 guarded disposable validation harness",
    )
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--plan", action="store_true")
    modes.add_argument("--static-check", action="store_true")
    modes.add_argument("--execute", action="store_true")
    parser.add_argument("--run-id")
    parser.add_argument("--approval-file")
    parser.add_argument("--artifact-root")
    parser.add_argument("--migration")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = _parser()
    args = parser.parse_args(argv)
    if not (args.plan or args.static_check or args.execute):
        parser.print_usage(sys.stderr)
        return 2
    try:
        static_report = verify_static_contract()
        if args.plan:
            sys.stdout.buffer.write(canonical_json_bytes(_sanitized_plan()))
            return 0
        if args.static_check:
            sys.stdout.buffer.write(canonical_json_bytes(static_report))
            return 0
        fixtures = _load_and_validate_fixtures()
        blocks = _load_and_validate_metadata_queries()
        schema = _load_and_validate_result_schema()
        return execute_validation(args, static_report, fixtures, blocks, schema)
    except HarnessFailure as exc:
        error = {
            "status": exc.status,
            "message": str(exc),
            "external_action_attempted": False
            if not args.execute
            else "EXECUTION_GUARD_OR_LIFECYCLE_STOP",
        }
        sys.stderr.buffer.write(canonical_json_bytes(error))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
