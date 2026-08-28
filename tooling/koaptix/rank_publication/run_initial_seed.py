#!/usr/bin/env python3
"""Validate or, with separate approval, seed one exact V1/V2 bundle.

The bootstrap never writes ``complex_rank_history`` or ``koaptix_rank_snapshot``.
Its sole write-capable client statement is the typed SELECT in
``queries/bootstrap_legacy_vector_generation.sql``. Importing this module and
running it without ``--execute`` are non-executing operations.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import uuid
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Mapping, Sequence

from run_publication import (
    ActionSpec,
    ContractError,
    IMPLEMENTATION_APPROVAL,
    canonical_json,
    connect_from_env,
    execute_serializable_action,
    load_json_object,
    load_typed_action_query,
    sha256_json,
    validate_generation_inputs,
    _same_timestamp,
    _validate_completion_document,
    _exact_object,
)


ROOT = Path(__file__).resolve().parent
VECTOR_PATH = ROOT / "bootstrap_legacy_source_date_vector.json"
AUTHORITY_KIND = "BOOTSTRAP_COMPATIBILITY_BUNDLE"
V1_AUTHORITY_KEY = "BOOTSTRAP_COMPATIBILITY_BUNDLE_V1"
V2_AUTHORITY_KEY = "BOOTSTRAP_COMPATIBILITY_BUNDLE_V2"
BOOTSTRAP_PACKET_SCHEMA_VERSION = "koaptix-latest-board-packet-v2"
SEED_QUERY_BYTES = 169
SEED_QUERY_SHA256 = "FB458788A70981BAD55A909D49D7AED3BE3772FA1A8DBA3AC89E799791E82A59"
VECTOR_FILE_BYTES = 42751
VECTOR_FILE_SHA256 = "5838DF7C3ED197498E23B4330D3CC8D985F9009F79A652EA19B92C0B9AE97E85"
VECTOR_LOGICAL_SHA256 = "6E7BA473DDCC0C25F3F46FFEE443BA41CC9D2435F448531189F843AB28FA82F7"
SEED = ActionSpec(
    action="SEED_COMPATIBILITY",
    role="koaptix_rank_bootstrap_seeder",
    query_file="bootstrap_legacy_vector_generation.sql",
    entrypoint="public.koaptix_seed_latest_board_compatibility_generation",
)
SEED_DATABASE_RESULT_KEYS = (
    "action",
    "outcome",
    "generation_id",
    "event_id",
    "publication_version",
    "active_generation_id",
    "previous_generation_id",
    "published_at",
    "surface_count",
    "total_component_rows",
    "source_authority_kind",
    "source_authority_key",
    "combined_surface_manifest_sha256",
    "official_history_rows_written",
    "official_snapshot_rows_written",
    "automatic_retry_count",
)

SERVICE_COMPONENT = {
    "component_manifest_sha256": "A1CCACBCE1AF6EE106840E482A97A303813F096EA616F7D3837D865CFA8707E2",
    "date_vector_sha256": VECTOR_LOGICAL_SHA256,
    "full_row_digest_sha256": "FB31BF64DF0000EABDD3827581D6B40FEC2D22EE64582C4B1AB28FE6A26D8008",
    "previous_snapshot_date": None,
    "row_count": 40484,
    "snapshot_date": None,
    "surface_code": "UNIVERSE_SERVICE",
    "universe_count": 225,
}

# This registry is the authority.  A loaded control document can never select
# itself or supply an expected identity.  The explicit CLI selector chooses one
# record and the v2 packet must name that same complete record.
EXPECTED_BOOTSTRAP_BY_AUTHORITY: dict[str, dict[str, Any]] = {
    V1_AUTHORITY_KEY: {
        "source_authority_kind": AUTHORITY_KIND,
        "source_authority_key": V1_AUTHORITY_KEY,
        "control_file": "bootstrap_compatibility_bundle_v1.json",
        "control_bytes": 1684,
        "control_sha256": "30B8AD8904E3ADC4942F59D3C7AB7C3D01CC16928BB87FA9509747666E4B4941",
        "control_schema_version": 1,
        "control_status": "IMMUTABLE_APPROVED_CONTROL_NO_EXECUTION",
        "components": [
            {
                "component_manifest_sha256": "DED5CE75CCD8B4A36F064AD59D3BF43F7DD1D8CEADD33AD43E9150ED7826DB6C",
                "date_vector_sha256": None,
                "full_row_digest_sha256": "C560F484EA049B56A6251A34FB4C4E39047E24CB2610A0824DADFE114EC92908",
                "previous_snapshot_date": "2026-07-30",
                "row_count": 13497,
                "snapshot_date": "2026-07-31",
                "surface_code": "GLOBAL_LATEST",
                "universe_count": 1,
            },
            {**SERVICE_COMPONENT},
        ],
        "combined_surface_manifest_sha256": "F2C78A29E43EAAD77AF815AB2723B3ED5202D70384E7145DDF01BCFC2041DE63",
        "total_component_rows": 53981,
        "service_vector_subauthority": None,
        "row_artifacts": None,
        "row_artifact_status": "HISTORICAL_V1_CONTROL_NO_ACCEPTED_EXACT_LOCAL_ROW_FILE_BINDING",
    },
    V2_AUTHORITY_KEY: {
        "source_authority_kind": AUTHORITY_KIND,
        "source_authority_key": V2_AUTHORITY_KEY,
        "control_file": "bootstrap_compatibility_bundle_v2.json",
        "control_bytes": 2192,
        "control_sha256": "F8C42997F5220DFB3E61405AAAC2F79D139028E87B69C5F8CA6933354D0E8875",
        "control_schema_version": 2,
        "control_status": "UNAPPLIED_CANDIDATE_NOT_ACCEPTED_CONTROL",
        "components": [
            {
                "component_manifest_sha256": "B7B2305831883D5018EECD5B557738C1741B0D6BD2392E18D319466507C5FF82",
                "date_vector_sha256": None,
                "full_row_digest_sha256": "E62394980D8A76FBEEAC8CDE7EED176934CE7280B7732ED4A4007B29E82B5FCB",
                "previous_snapshot_date": "2026-08-25",
                "row_count": 13497,
                "snapshot_date": "2026-08-26",
                "surface_code": "GLOBAL_LATEST",
                "universe_count": 1,
            },
            {**SERVICE_COMPONENT},
        ],
        "combined_surface_manifest_sha256": "D59ED800AD9E99F409E21AA57BFFDFE2D66F2971C2C4C622186A1844A6C3C1BD",
        "total_component_rows": 53981,
        "service_vector_subauthority": {
            "authority_key": V1_AUTHORITY_KEY,
            "file_bytes": VECTOR_FILE_BYTES,
            "file_sha256": VECTOR_FILE_SHA256,
            "logical_vector_sha256": VECTOR_LOGICAL_SHA256,
            "path": "bootstrap_legacy_source_date_vector.json",
            "relationship": "EXACT_IMMUTABLE_V1_SERVICE_VECTOR_REUSED_AS_EXPLICIT_V2_SUBAUTHORITY",
            "relabelled_as_v2": False,
            "row_count": 225,
        },
        "row_artifacts": {
            "GLOBAL_LATEST": {
                "path": ".handoff/work/P-KOAPTIX-PRODUCTION-M903-INITIAL-COMPATIBILITY-FRESH-CURRENT-LATEST-IDENTITY-LOCALIZATION-AND-READ-ONLY-CAPTURE.0/capture/current_global_rows_34.json",
                "bytes": 11909898,
                "sha256": "4E49ACA2B0AC2DB45347D9F319CF48527D2EB5E9D4EE8953752665D6371DCCA6",
                "rows": 13497,
                "fields": 34,
            },
            "UNIVERSE_SERVICE": {
                "path": ".handoff/work/P-KOAPTIX-PRODUCTION-M903-INITIAL-COMPATIBILITY-FRESH-CURRENT-LATEST-IDENTITY-LOCALIZATION-AND-READ-ONLY-CAPTURE.0/capture/current_service_source_rows_24.json",
                "bytes": 24164710,
                "sha256": "A260B5D3B156F9BE7785605E1FA121858E4B626FB4998C69876505E35863D021",
                "rows": 40484,
                "fields": 24,
            },
        },
        "row_artifact_status": "ACCEPTED_READ_ONLY_V2_CANDIDATE_INPUT_IDENTITIES",
    },
}


def _nonblank(packet: Mapping[str, Any], key: str) -> str:
    value = packet.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ContractError(f"{key} must be a nonblank string")
    return value


def _canonical_uuid(packet: Mapping[str, Any], key: str) -> str:
    value = _nonblank(packet, key)
    try:
        parsed = uuid.UUID(value)
    except ValueError as exc:
        raise ContractError(f"{key} must be a UUID") from exc
    if str(parsed) != value:
        raise ContractError(f"{key} must be canonical lowercase UUID text")
    return value


def _canonical_timestamp(packet: Mapping[str, Any], key: str) -> datetime:
    value = _nonblank(packet, key)
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ContractError(f"{key} must be an ISO-8601 timestamptz") from exc
    if parsed.tzinfo is None:
        raise ContractError(f"{key} must include a timezone")
    return parsed


def select_bootstrap_authority(source_authority_key: str) -> Mapping[str, Any]:
    authority = EXPECTED_BOOTSTRAP_BY_AUTHORITY.get(source_authority_key)
    if authority is None:
        raise ContractError(
            "source_authority_key must select exact V1 or V2; no fallback is allowed"
        )
    return authority


def _file_identity(path: Path, label: str) -> tuple[int, str]:
    try:
        payload = path.read_bytes()
    except OSError as exc:
        raise ContractError(f"cannot read {label} {path.name}: {exc}") from exc
    return len(payload), hashlib.sha256(payload).hexdigest().upper()


def _repository_root() -> Path:
    for candidate in (ROOT, *ROOT.parents):
        if (candidate / ".git").exists():
            return candidate.resolve()
    raise ContractError("cannot resolve repository root for fixed row-artifact controls")


def _fixed_repository_input(relative_path: str, label: str) -> Path:
    relative = Path(relative_path)
    if relative.is_absolute() or ".." in relative.parts:
        raise ContractError(f"{label} registry path is not a fixed repository-relative path")
    repository = _repository_root()
    resolved = (repository / relative).resolve()
    try:
        resolved.relative_to(repository)
    except ValueError as exc:
        raise ContractError(f"{label} registry path escapes the repository") from exc
    return resolved


def _fixed_tooling_dependency(file_name: str, label: str) -> Path:
    if Path(file_name).name != file_name:
        raise ContractError(f"{label} registry file name is not exact")
    run_local_or_tracked = ROOT / file_name
    if run_local_or_tracked.exists():
        return run_local_or_tracked.resolve()
    return _fixed_repository_input(
        f"tooling/koaptix/rank_publication/{file_name}", label
    )


def load_and_verify_controls(
    source_authority_key: str,
) -> tuple[dict[str, Any], dict[str, Any], Mapping[str, Any]]:
    authority = select_bootstrap_authority(source_authority_key)
    bundle_path = _fixed_tooling_dependency(
        str(authority["control_file"]), "bootstrap control"
    )
    bundle_bytes, bundle_sha256 = _file_identity(bundle_path, "bootstrap control")
    if (
        bundle_bytes != authority["control_bytes"]
        or bundle_sha256 != authority["control_sha256"]
    ):
        raise ContractError("selected bootstrap control byte identity drifted")
    vector_path = _fixed_tooling_dependency(
        VECTOR_PATH.name, "bootstrap service vector"
    )
    vector_bytes, vector_file_sha256 = _file_identity(
        vector_path, "bootstrap service vector"
    )
    if (
        vector_bytes != VECTOR_FILE_BYTES
        or vector_file_sha256 != VECTOR_FILE_SHA256
    ):
        raise ContractError("bootstrap service vector byte identity drifted")
    row_artifacts = authority["row_artifacts"]
    if row_artifacts is not None:
        if set(row_artifacts) != {"GLOBAL_LATEST", "UNIVERSE_SERVICE"}:
            raise ContractError("selected authority row-artifact registry is not exact")
        for surface_code, identity in row_artifacts.items():
            artifact_path = _fixed_repository_input(
                str(identity["path"]), f"{surface_code} row artifact"
            )
            artifact_bytes, artifact_sha256 = _file_identity(
                artifact_path, f"{surface_code} row artifact"
            )
            if (
                artifact_bytes != identity["bytes"]
                or artifact_sha256 != identity["sha256"]
            ):
                raise ContractError(
                    f"{surface_code} row artifact byte identity drifted"
                )

    bundle = load_json_object(bundle_path)
    vector = load_json_object(vector_path)
    rows = vector.get("rows")
    if not isinstance(rows, list) or len(rows) != 225:
        raise ContractError("bootstrap vector must contain exactly 225 rows")
    vector_digest = hashlib.sha256(canonical_json(rows).encode("utf-8")).hexdigest().upper()
    if (
        vector_digest != VECTOR_LOGICAL_SHA256
        or vector.get("vector_sha256") != vector_digest
        or vector.get("authority") != V1_AUTHORITY_KEY
    ):
        raise ContractError("bootstrap universe/date vector digest mismatch")
    codes: list[str] = []
    total_rows = 0
    for index, row in enumerate(rows):
        if not isinstance(row, dict) or set(row) != {
            "max_rank",
            "min_rank",
            "previous_date",
            "row_count",
            "snapshot_date",
            "universe_code",
        }:
            raise ContractError(f"bootstrap vector row {index} has an invalid key set")
        code = row.get("universe_code")
        if not isinstance(code, str) or not code.strip():
            raise ContractError(f"bootstrap vector row {index} has a blank universe")
        if row.get("snapshot_date") is None:
            raise ContractError(
                f"bootstrap vector row {index} has no snapshot_date"
            )
        for date_key in ("snapshot_date", "previous_date"):
            value = row.get(date_key)
            if value is not None:
                try:
                    parsed = date.fromisoformat(value)
                except (TypeError, ValueError) as exc:
                    raise ContractError(
                        f"bootstrap vector row {index} has an invalid {date_key}"
                    ) from exc
                if parsed.isoformat() != value:
                    raise ContractError(
                        f"bootstrap vector row {index} has a noncanonical {date_key}"
                    )
        row_count = row.get("row_count")
        if (
            not isinstance(row_count, int)
            or isinstance(row_count, bool)
            or row_count < 1
            or row.get("min_rank") != 1
            or row.get("max_rank") != row_count
        ):
            raise ContractError(f"bootstrap vector row {index} has a rank/count gap")
        if row.get("previous_date") is not None and not (
            row["previous_date"] < row["snapshot_date"]
        ):
            raise ContractError(
                f"bootstrap vector row {index} has a non-earlier previous date"
            )
        codes.append(code)
        total_rows += row_count
    if codes != sorted(set(codes)) or total_rows != 40484:
        raise ContractError("bootstrap vector is not a sorted distinct 40,484-row set")
    expected_scalars = {
        "schema_version": authority["control_schema_version"],
        "status": authority["control_status"],
        "source_authority_kind": authority["source_authority_kind"],
        "source_authority_key": authority["source_authority_key"],
        "vector_control": "bootstrap_legacy_source_date_vector.json",
        "surface_count": 2,
        "total_component_rows": authority["total_component_rows"],
        "combined_surface_manifest_sha256": authority[
            "combined_surface_manifest_sha256"
        ],
    }
    for key, expected in expected_scalars.items():
        if bundle.get(key) != expected:
            raise ContractError(f"selected bootstrap control {key} drifted")
    if authority["service_vector_subauthority"] is None:
        if "service_vector_subauthority" in bundle:
            raise ContractError("historical V1 control gained an unauthorized subauthority")
    elif bundle.get("service_vector_subauthority") != authority[
        "service_vector_subauthority"
    ]:
        raise ContractError("V2 service vector subauthority drifted")
    if bundle.get("required_surface_codes") != ["GLOBAL_LATEST", "UNIVERSE_SERVICE"]:
        raise ContractError("bootstrap requires exactly two typed surfaces")
    if bundle.get("surface_count") != 2 or len(bundle.get("components", [])) != 2:
        raise ContractError("bootstrap component count must equal two")
    if bundle.get("total_component_rows") != authority["total_component_rows"]:
        raise ContractError("bootstrap aggregate row count mismatch")
    if bundle.get("combined_surface_manifest_sha256") != authority[
        "combined_surface_manifest_sha256"
    ]:
        raise ContractError("bootstrap combined manifest mismatch")
    components = {item.get("surface_code"): item for item in bundle["components"]}
    if set(components) != {"GLOBAL_LATEST", "UNIVERSE_SERVICE"}:
        raise ContractError("bootstrap contains an unknown or missing surface")
    expected_components = {
        item["surface_code"]: item for item in authority["components"]
    }
    for code, expected in expected_components.items():
        if components[code] != expected:
            raise ContractError(f"{code} bootstrap component drifted")
    if sum(item["row_count"] for item in components.values()) != 53981:
        raise ContractError("bootstrap component rows do not equal the aggregate")
    return bundle, vector, authority


def validate_seed_packet(
    packet: object,
    bundle: Mapping[str, Any],
    vector: Mapping[str, Any],
    authority: Mapping[str, Any],
) -> dict[str, Any]:
    if not isinstance(packet, dict):
        raise ContractError("seed packet must be a JSON object")
    exact_keys = {
        "schema_version",
        "action",
        "source_authority_kind",
        "source_authority_key",
        "plan_run_id",
        "execution_run_id",
        "authorization_proof_exact",
        "automatic_retry",
        "generation_id",
        "generated_at",
        "verified_at",
        "expected_active_generation_id",
        "expected_publication_version",
        "required_surface_codes",
        "surface_components",
        "service_universes",
        "service_rows",
        "global_rows",
        "combined_surface_manifest_sha256",
        "event_id",
        "recorded_at",
    }
    if set(packet) != exact_keys:
        raise ContractError(
            f"SEED_COMPATIBILITY exact key mismatch; missing={sorted(exact_keys-set(packet))}, extra={sorted(set(packet)-exact_keys)}"
        )
    if (
        packet.get("schema_version") != BOOTSTRAP_PACKET_SCHEMA_VERSION
        or packet.get("action") != SEED.action
    ):
        raise ContractError("invalid seed schema_version or action")
    if packet.get("source_authority_kind") != authority["source_authority_kind"]:
        raise ContractError("seed packet source_authority_kind differs from selector")
    if packet.get("source_authority_key") != authority["source_authority_key"]:
        raise ContractError("seed packet source_authority_key differs from selector")
    if (
        bundle.get("source_authority_kind") != packet["source_authority_kind"]
        or bundle.get("source_authority_key") != packet["source_authority_key"]
    ):
        raise ContractError("seed packet authority differs from selected control")
    _nonblank(packet, "plan_run_id")
    _nonblank(packet, "execution_run_id")
    proof = _nonblank(packet, "authorization_proof_exact")
    if proof != "SEPARATE_INITIAL_READ_MODEL_SEED_EXECUTION_APPROVAL":
        raise ContractError("authorization_proof_exact is not the seed execution approval")
    _canonical_uuid(packet, "generation_id")
    _canonical_uuid(packet, "event_id")
    if packet.get("expected_active_generation_id") is not None:
        raise ContractError("initial seed expected_active_generation_id must be null")
    if packet.get("expected_publication_version") != 0:
        raise ContractError("initial seed expected_publication_version must be zero")
    for key in ("required_surface_codes", "combined_surface_manifest_sha256"):
        if packet.get(key) != bundle.get(key):
            raise ContractError(f"seed packet {key} differs from immutable bundle")
    if packet.get("surface_components") != bundle.get("components"):
        raise ContractError("seed packet surface_components differ from immutable bundle")
    if not isinstance(packet.get("service_universes"), list) or len(packet["service_universes"]) != 225:
        raise ContractError("seed packet must carry exactly 225 service universes")
    controls = validate_generation_inputs(
        packet,
        expected_initial_seed_vector_rows=vector.get("rows"),
    )
    if controls["service_vector_rows"] != vector.get("rows"):
        raise ContractError(
            "seed packet service universe rows recompute to a different closed vector"
        )
    service_component = authority["components"][1]
    global_component = authority["components"][0]
    if not isinstance(packet.get("service_rows"), list) or len(
        packet["service_rows"]
    ) != service_component["row_count"]:
        raise ContractError("seed packet must carry exactly 40,484 service rows")
    if not isinstance(packet.get("global_rows"), list) or len(
        packet["global_rows"]
    ) != global_component["row_count"]:
        raise ContractError("seed packet must carry exactly 13,497 global rows")
    generated_at = _canonical_timestamp(packet, "generated_at")
    verified_at = _canonical_timestamp(packet, "verified_at")
    recorded_at = _canonical_timestamp(packet, "recorded_at")
    if not generated_at <= verified_at <= recorded_at:
        raise ContractError(
            "seed generated_at, verified_at, and recorded_at must be ordered"
        )
    if packet["generation_id"] == packet["event_id"]:
        raise ContractError("seed generation_id and event_id must differ")
    if packet.get("automatic_retry") is not False:
        raise ContractError("automatic_retry must be false")
    return packet


def _normalized_timestamp(value: object, label: str) -> str:
    if not isinstance(value, str) or not value:
        raise ContractError(f"{label} must be an ISO-8601 timestamptz")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ContractError(f"{label} must be an ISO-8601 timestamptz") from exc
    if parsed.tzinfo is None:
        raise ContractError(f"{label} must include a timezone")
    return (
        parsed.astimezone(timezone.utc)
        .isoformat(timespec="microseconds")
        .replace("+00:00", "Z")
    )


def _expected_seed_database_result_projection(
    packet: Mapping[str, Any], authority: Mapping[str, Any]
) -> dict[str, Any]:
    return {
        "action": SEED.action,
        "outcome": "PUBLISHED",
        "generation_id": packet["generation_id"],
        "event_id": packet["event_id"],
        "publication_version": 1,
        "active_generation_id": packet["generation_id"],
        "previous_generation_id": None,
        "published_at": _normalized_timestamp(
            packet["recorded_at"], "seed expected published_at"
        ),
        "surface_count": 2,
        "total_component_rows": authority["total_component_rows"],
        "source_authority_kind": authority["source_authority_kind"],
        "source_authority_key": authority["source_authority_key"],
        "combined_surface_manifest_sha256": authority[
            "combined_surface_manifest_sha256"
        ],
        "official_history_rows_written": 0,
        "official_snapshot_rows_written": 0,
        "automatic_retry_count": 0,
    }


def _seed_database_result_projection(
    result: Mapping[str, Any],
) -> dict[str, Any]:
    projected = dict(
        _exact_object(result, SEED_DATABASE_RESULT_KEYS, "initial-seed DB result")
    )
    projected["published_at"] = _normalized_timestamp(
        projected["published_at"], "seed actual published_at"
    )
    return projected


def validate_seed_completion(
    completion: object,
    packet: Mapping[str, Any],
    bundle: Mapping[str, Any],
    authority: Mapping[str, Any],
) -> dict[str, Any]:
    if not isinstance(completion, dict):
        raise ContractError("initial-seed completion must be a JSON object")
    _validate_completion_document("INITIAL_SEED_RESULT", completion)
    expected = {
        "plan_run_id": packet["plan_run_id"],
        "seed_execution_run_id": packet["execution_run_id"],
        "generation_id": packet["generation_id"],
        "authorization_proof_exact": packet["authorization_proof_exact"],
        "source_authority_kind": authority["source_authority_kind"],
        "source_authority_key": authority["source_authority_key"],
        "affected_universe_codes": [],
        "surface_components": bundle["components"],
        "total_component_rows": bundle["total_component_rows"],
        "combined_surface_manifest_sha256": bundle[
            "combined_surface_manifest_sha256"
        ],
        "seed_packet_sha256": sha256_json(packet),
        "seed_query_sha256": SEED_QUERY_SHA256,
        "bootstrap_control_sha256": authority["control_sha256"],
        "service_vector_file_sha256": VECTOR_FILE_SHA256,
        "service_vector_sha256": VECTOR_LOGICAL_SHA256,
        "expected_database_result_projection_sha256": sha256_json(
            _expected_seed_database_result_projection(packet, authority)
        ),
    }
    for key, value in expected.items():
        if completion.get(key) != value:
            raise ContractError(f"initial-seed completion {key} differs from packet")
    event = completion["publish_event"]
    pointer = completion["pointer_after"]
    if (
        event["event_id"] != packet["event_id"]
        or event["to_generation_id"] != packet["generation_id"]
        or event["plan_run_id"] != packet["plan_run_id"]
        or event["execution_run_id"] != packet["execution_run_id"]
        or pointer["event_id"] != packet["event_id"]
        or pointer["generation_id"] != packet["generation_id"]
    ):
        raise ContractError("initial-seed completion event/pointer differs from packet")
    _same_timestamp(event["recorded_at"], packet["recorded_at"], "seed event recorded_at")
    _same_timestamp(pointer["published_at"], packet["recorded_at"], "seed pointer published_at")
    return completion


def validate_seed_action_result(
    result: Mapping[str, Any],
    packet: Mapping[str, Any],
    completion: Mapping[str, Any],
    authority: Mapping[str, Any],
) -> dict[str, Any]:
    result = _seed_database_result_projection(result)
    expected = _expected_seed_database_result_projection(packet, authority)
    for key, value in expected.items():
        if key != "published_at" and result.get(key) != value:
            raise ContractError(f"initial-seed DB result {key} differs")
    _same_timestamp(result.get("published_at"), packet["recorded_at"], "seed published_at")
    actual_projection_sha256 = sha256_json(result)
    if actual_projection_sha256 != completion.get(
        "expected_database_result_projection_sha256"
    ):
        raise ContractError(
            "initial-seed DB result projection differs from completion expectation"
        )
    if completion["pointer_after"]["event_id"] != result["event_id"]:
        raise ContractError("initial-seed completion pointer differs from DB result")
    return result


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-authority-key",
        required=True,
        choices=tuple(EXPECTED_BOOTSTRAP_BY_AUTHORITY),
        help="explicit closed bootstrap authority selector; no default or path override",
    )
    parser.add_argument("--packet", type=Path, required=True)
    parser.add_argument("--completion-result", type=Path)
    parser.add_argument("--dsn-env", default="KOAPTIX_RANK_SEED_ACTION_DSN")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--execute", action="store_true")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        bundle, vector, authority = load_and_verify_controls(
            args.source_authority_key
        )
        packet = validate_seed_packet(
            load_json_object(args.packet), bundle, vector, authority
        )
        load_typed_action_query(SEED)
        query_path = ROOT / "queries" / SEED.query_file
        if not query_path.exists():
            query_path = _fixed_repository_input(
                f"tooling/koaptix/rank_publication/queries/{SEED.query_file}",
                "bootstrap typed query",
            )
        query_bytes, query_sha256 = _file_identity(
            query_path, "bootstrap typed query"
        )
        if query_bytes != SEED_QUERY_BYTES or query_sha256 != SEED_QUERY_SHA256:
            raise ContractError("bootstrap typed query byte identity drifted")
        if not args.execute:
            if args.completion_result is not None:
                raise ContractError(
                    "validation-only seed mode does not accept --completion-result"
                )
            result: dict[str, Any] = {
                "status": "PASS_EXACT_BOOTSTRAP_PACKET_VALIDATED_NO_EXECUTION",
                "packet_sha256": sha256_json(packet),
                "source_authority_kind": authority["source_authority_kind"],
                "source_authority_key": authority["source_authority_key"],
                "bootstrap_control_sha256": authority["control_sha256"],
                "service_vector_file_sha256": VECTOR_FILE_SHA256,
                "service_vector_sha256": VECTOR_LOGICAL_SHA256,
                "seed_query_sha256": SEED_QUERY_SHA256,
                "official_history_rows_written": 0,
                "official_snapshot_rows_written": 0,
                "bootstrap_attempted": False,
            }
        else:
            if args.completion_result is None:
                raise ContractError(
                    "approved seed execution requires --completion-result"
                )
            completion = validate_seed_completion(
                load_json_object(args.completion_result),
                packet,
                bundle,
                authority,
            )
            completion_sha256 = sha256_json(completion)
            connection = connect_from_env(args.dsn_env)
            try:
                execute_serializable_action(
                    connection,
                    SEED,
                    packet,
                    lambda database_result: validate_seed_action_result(
                        database_result, packet, completion, authority
                    ),
                )
            finally:
                connection.close()
            _validate_completion_document("INITIAL_SEED_RESULT", completion)
            if sha256_json(completion) != completion_sha256:
                raise ContractError(
                    "initial-seed completion document changed across commit"
                )
            result = completion
        rendered = json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
        if args.output:
            args.output.write_text(rendered, encoding="utf-8", newline="\n")
        else:
            sys.stdout.write(rendered)
        return 0
    except ContractError as exc:
        sys.stderr.write(f"contract error: {exc}\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
