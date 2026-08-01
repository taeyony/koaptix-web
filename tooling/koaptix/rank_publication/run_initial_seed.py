#!/usr/bin/env python3
"""Validate or, with separate approval, seed the exact immutable V1 bundle.

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
from datetime import date, datetime
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
BUNDLE_PATH = ROOT / "bootstrap_compatibility_bundle_v1.json"
VECTOR_PATH = ROOT / "bootstrap_legacy_source_date_vector.json"
SEED = ActionSpec(
    action="SEED_COMPATIBILITY",
    role="koaptix_rank_bootstrap_seeder",
    query_file="bootstrap_legacy_vector_generation.sql",
    entrypoint="public.koaptix_seed_latest_board_compatibility_generation",
)

EXPECTED = {
    "vector_sha256": "6E7BA473DDCC0C25F3F46FFEE443BA41CC9D2435F448531189F843AB28FA82F7",
    "combined_surface_manifest_sha256": "F2C78A29E43EAAD77AF815AB2723B3ED5202D70384E7145DDF01BCFC2041DE63",
    "total_component_rows": 53981,
}
EXPECTED_COMPONENTS = {
    "GLOBAL_LATEST": {
        "component_manifest_sha256": "DED5CE75CCD8B4A36F064AD59D3BF43F7DD1D8CEADD33AD43E9150ED7826DB6C",
        "date_vector_sha256": None,
        "full_row_digest_sha256": "C560F484EA049B56A6251A34FB4C4E39047E24CB2610A0824DADFE114EC92908",
        "previous_snapshot_date": "2026-07-30",
        "row_count": 13497,
        "snapshot_date": "2026-07-31",
        "surface_code": "GLOBAL_LATEST",
        "universe_count": 1,
    },
    "UNIVERSE_SERVICE": {
        "component_manifest_sha256": "A1CCACBCE1AF6EE106840E482A97A303813F096EA616F7D3837D865CFA8707E2",
        "date_vector_sha256": "6E7BA473DDCC0C25F3F46FFEE443BA41CC9D2435F448531189F843AB28FA82F7",
        "full_row_digest_sha256": "FB31BF64DF0000EABDD3827581D6B40FEC2D22EE64582C4B1AB28FE6A26D8008",
        "previous_snapshot_date": None,
        "row_count": 40484,
        "snapshot_date": None,
        "surface_code": "UNIVERSE_SERVICE",
        "universe_count": 225,
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


def load_and_verify_controls() -> tuple[dict[str, Any], dict[str, Any]]:
    bundle = load_json_object(BUNDLE_PATH)
    vector = load_json_object(VECTOR_PATH)
    rows = vector.get("rows")
    if not isinstance(rows, list) or len(rows) != 225:
        raise ContractError("bootstrap vector must contain exactly 225 rows")
    vector_digest = hashlib.sha256(canonical_json(rows).encode("utf-8")).hexdigest().upper()
    if vector_digest != EXPECTED["vector_sha256"] or vector.get("vector_sha256") != vector_digest:
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
    if bundle.get("source_authority_key") != "BOOTSTRAP_COMPATIBILITY_BUNDLE_V1":
        raise ContractError("only BOOTSTRAP_COMPATIBILITY_BUNDLE_V1 is allowed")
    if bundle.get("required_surface_codes") != ["GLOBAL_LATEST", "UNIVERSE_SERVICE"]:
        raise ContractError("bootstrap requires exactly two typed surfaces")
    if bundle.get("surface_count") != 2 or len(bundle.get("components", [])) != 2:
        raise ContractError("bootstrap component count must equal two")
    if bundle.get("total_component_rows") != EXPECTED["total_component_rows"]:
        raise ContractError("bootstrap aggregate row count mismatch")
    if bundle.get("combined_surface_manifest_sha256") != EXPECTED["combined_surface_manifest_sha256"]:
        raise ContractError("bootstrap combined manifest mismatch")
    components = {item.get("surface_code"): item for item in bundle["components"]}
    if set(components) != {"GLOBAL_LATEST", "UNIVERSE_SERVICE"}:
        raise ContractError("bootstrap contains an unknown or missing surface")
    for code, expected in EXPECTED_COMPONENTS.items():
        if components[code] != expected:
            raise ContractError(f"{code} bootstrap component drifted")
    if sum(item["row_count"] for item in components.values()) != 53981:
        raise ContractError("bootstrap component rows do not equal the aggregate")
    return bundle, vector


def validate_seed_packet(
    packet: object,
    bundle: Mapping[str, Any],
    vector: Mapping[str, Any],
) -> dict[str, Any]:
    if not isinstance(packet, dict):
        raise ContractError("seed packet must be a JSON object")
    exact_keys = {
        "schema_version",
        "action",
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
    if packet.get("schema_version") != "koaptix-latest-board-packet-v1" or packet.get("action") != SEED.action:
        raise ContractError("invalid seed schema_version or action")
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
    controls = validate_generation_inputs(packet)
    if controls["service_vector_rows"] != vector.get("rows"):
        raise ContractError(
            "seed packet service universe rows recompute to a different closed vector"
        )
    if not isinstance(packet.get("service_rows"), list) or len(packet["service_rows"]) != 40484:
        raise ContractError("seed packet must carry exactly 40,484 service rows")
    if not isinstance(packet.get("global_rows"), list) or len(packet["global_rows"]) != 13497:
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


def validate_seed_completion(
    completion: object,
    packet: Mapping[str, Any],
    bundle: Mapping[str, Any],
) -> dict[str, Any]:
    if not isinstance(completion, dict):
        raise ContractError("initial-seed completion must be a JSON object")
    _validate_completion_document("INITIAL_SEED_RESULT", completion)
    expected = {
        "plan_run_id": packet["plan_run_id"],
        "seed_execution_run_id": packet["execution_run_id"],
        "generation_id": packet["generation_id"],
        "authorization_proof_exact": packet["authorization_proof_exact"],
        "source_authority_kind": "BOOTSTRAP_COMPATIBILITY_BUNDLE",
        "source_authority_key": "BOOTSTRAP_COMPATIBILITY_BUNDLE_V1",
        "affected_universe_codes": [],
        "surface_components": bundle["components"],
        "total_component_rows": bundle["total_component_rows"],
        "combined_surface_manifest_sha256": bundle[
            "combined_surface_manifest_sha256"
        ],
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
) -> dict[str, Any]:
    keys = (
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
        "combined_surface_manifest_sha256",
        "official_history_rows_written",
        "official_snapshot_rows_written",
        "automatic_retry_count",
    )
    result = dict(_exact_object(result, keys, "initial-seed DB result"))
    expected = {
        "action": SEED.action,
        "outcome": "PUBLISHED",
        "generation_id": packet["generation_id"],
        "event_id": packet["event_id"],
        "publication_version": 1,
        "active_generation_id": packet["generation_id"],
        "previous_generation_id": None,
        "surface_count": 2,
        "total_component_rows": 53981,
        "combined_surface_manifest_sha256": EXPECTED[
            "combined_surface_manifest_sha256"
        ],
        "official_history_rows_written": 0,
        "official_snapshot_rows_written": 0,
        "automatic_retry_count": 0,
    }
    for key, value in expected.items():
        if result.get(key) != value:
            raise ContractError(f"initial-seed DB result {key} differs")
    _same_timestamp(result.get("published_at"), packet["recorded_at"], "seed published_at")
    if completion["pointer_after"]["event_id"] != result["event_id"]:
        raise ContractError("initial-seed completion pointer differs from DB result")
    return result


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--packet", type=Path, required=True)
    parser.add_argument("--completion-result", type=Path)
    parser.add_argument("--dsn-env", default="KOAPTIX_RANK_SEED_ACTION_DSN")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--execute", action="store_true")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        bundle, vector = load_and_verify_controls()
        packet = validate_seed_packet(load_json_object(args.packet), bundle, vector)
        load_typed_action_query(SEED)
        if not args.execute:
            if args.completion_result is not None:
                raise ContractError(
                    "validation-only seed mode does not accept --completion-result"
                )
            result: dict[str, Any] = {
                "status": "PASS_EXACT_BOOTSTRAP_PACKET_VALIDATED_NO_EXECUTION",
                "packet_sha256": sha256_json(packet),
                "bundle_sha256": sha256_json(bundle),
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
                load_json_object(args.completion_result), packet, bundle
            )
            completion_sha256 = sha256_json(completion)
            connection = connect_from_env(args.dsn_env)
            try:
                execute_serializable_action(
                    connection,
                    SEED,
                    packet,
                    lambda database_result: validate_seed_action_result(
                        database_result, packet, completion
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
