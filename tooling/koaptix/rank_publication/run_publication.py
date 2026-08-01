#!/usr/bin/env python3
"""Run one explicitly selected rank-publication transaction.

This module intentionally contains no database credentials and performs no work
when imported. Transaction A and Transaction B can never execute in the same
process invocation. Transaction B additionally requires a separately authored
transition proof, independently verified Transaction-A evidence, producer
deactivation/zero-backend evidence, publisher activation evidence, and a full
completion document that passes the tracked schema and semantic validator.
There is deliberately no retry loop.

Transaction A calls only ``koaptix_build_rank_publication_generation(jsonb)``.
Transaction B calls only ``koaptix_publish_latest_board_generation(jsonb)``.
Candidate and official DML remains inside reviewed SECURITY DEFINER functions.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib
import json
import os
import re
import sys
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Callable, Mapping, Protocol, Sequence


ROOT = Path(__file__).resolve().parent
QUERY_ROOT = ROOT / "queries"
SURFACE_CODES = ("GLOBAL_LATEST", "UNIVERSE_SERVICE")
PACKET_SCHEMA_VERSION = "koaptix-latest-board-packet-v1"
SHA256_RE = re.compile(r"^[0-9A-F]{64}$")
ROLE_RE = re.compile(r"^koaptix_rank_[a-z0-9_]+$")
TRANSITION_SCHEMA_VERSION = "koaptix-publication-transition-proof-v1"
TRANSITION_APPROVAL = "SEPARATE_EXACT_GENERATION_ATOMIC_PUBLICATION_TRANSITION_APPROVAL"

SURFACE_COMPONENT_KEYS = (
    "surface_code",
    "snapshot_date",
    "previous_snapshot_date",
    "date_vector_sha256",
    "universe_count",
    "row_count",
    "full_row_digest_sha256",
    "component_manifest_sha256",
)
SERVICE_UNIVERSE_KEYS = (
    "universe_code",
    "snapshot_date",
    "previous_snapshot_date",
    "expected_row_count",
    "row_digest_sha256",
)
SERVICE_ROW_KEYS = (
    "snapshot_date",
    "universe_code",
    "universe_name",
    "universe_scope",
    "complex_id",
    "apt_name_ko",
    "sigungu_name",
    "legal_dong_name",
    "build_year",
    "household_count",
    "total_household_count",
    "recovery_52w",
    "rank_all",
    "previous_rank_all",
    "rank_delta_w",
    "rank_movement",
    "market_cap_krw",
    "market_cap_trillion_krw",
    "market_cap_share",
    "market_cap_share_pct",
    "tier_code",
    "tier_label",
    "tier_sort",
    "is_top1000",
    "source_previous_snapshot_date",
    "generated_at",
    "refresh_run_id",
)
SERVICE_DIGEST_KEYS = SERVICE_ROW_KEYS[:24]
GLOBAL_ROW_KEYS = (
    "snapshot_date",
    "universe_code",
    "complex_id",
    "apt_name_ko",
    "address_road",
    "address_jibun",
    "legal_dong_name",
    "build_year",
    "sigungu_code",
    "sigungu_name",
    "rank_all",
    "tier_code",
    "tier_label",
    "tier_sort",
    "market_cap_krw",
    "market_cap_trillion_krw",
    "market_cap_share",
    "market_cap_share_pct",
    "previous_rank_all",
    "rank_delta_1d",
    "rank_movement",
    "is_top1000",
    "total_household_count",
    "household_count",
    "priced_household_count",
    "priced_household_ratio",
    "total_cluster_count",
    "priced_cluster_count",
    "coverage_status",
    "is_rank_eligible",
    "eligibility_status",
    "latitude",
    "longitude",
    "recovery_52w",
)
HISTORY_STAGE_KEYS = (
    "snapshot_date",
    "complex_id",
    "market_cap_krw",
    "rank_all",
    "total_market_cap",
)
SNAPSHOT_STAGE_KEYS = (
    "snapshot_date",
    "universe_code",
    "complex_id",
    "rank_all",
    "market_cap_krw",
    "market_cap_share",
    "previous_rank_all",
    "rank_delta_1d",
    "is_top1000",
    "rank_method",
    "calculation_version",
    "created_at",
)
SERVICE_NUMERIC_TEXT_KEYS = {
    "market_cap_trillion_krw",
    "market_cap_share",
    "market_cap_share_pct",
}
GLOBAL_NUMERIC_TEXT_KEYS = {
    "market_cap_trillion_krw",
    "market_cap_share",
    "market_cap_share_pct",
    "priced_household_ratio",
    "latitude",
    "longitude",
}
DIGEST_INTEGER_KEYS = {
    "complex_id",
    "build_year",
    "household_count",
    "total_household_count",
    "rank_all",
    "previous_rank_all",
    "rank_delta_w",
    "rank_delta_1d",
    "market_cap_krw",
    "tier_sort",
    "priced_household_count",
    "total_cluster_count",
    "priced_cluster_count",
}
DIGEST_BOOLEAN_KEYS = {"is_top1000", "is_rank_eligible"}

IMPLEMENTATION_APPROVAL = (
    "RANK_CANONICAL_INPUT_MEMBERSHIP_AND_READ_MODEL_TRACKED_IMPLEMENTATION_APPROVAL"
)


class ContractError(ValueError):
    """Raised before any database action when a packet or query is invalid."""


class Cursor(Protocol):
    def execute(self, query: str, params: object | None = None) -> Any: ...
    def fetchone(self) -> Sequence[Any] | None: ...
    def close(self) -> None: ...


class Connection(Protocol):
    def cursor(self) -> Cursor: ...
    def commit(self) -> None: ...
    def rollback(self) -> None: ...
    def close(self) -> None: ...


@dataclass(frozen=True)
class ActionSpec:
    action: str
    role: str
    query_file: str
    entrypoint: str


BUILD = ActionSpec(
    action="BUILD_GENERATION",
    role="koaptix_rank_generation_builder",
    query_file="build_latest_generation.sql",
    entrypoint="public.koaptix_build_rank_publication_generation",
)
PUBLISH = ActionSpec(
    action="PUBLISH_GENERATION",
    role="koaptix_rank_generation_publisher",
    query_file="verify_and_publish_generation.sql",
    entrypoint="public.koaptix_publish_latest_board_generation",
)

BUILD_PACKET_KEYS = {
    "schema_version",
    "action",
    "plan_run_id",
    "execution_run_id",
    "authorization_proof_exact",
    "automatic_retry",
    "generation_id",
    "generated_at",
    "verified_at",
    "target_rank_date",
    "input_manifest_run_id",
    "expected_active_generation_id",
    "expected_publication_version",
    "affected_universe_codes",
    "market_cap_set_sha256",
    "eligibility_set_sha256",
    "source_set_sha256",
    "selected_input_sha256",
    "membership_set_sha256",
    "affected_universe_set_sha256",
    "required_surface_codes",
    "surface_components",
    "service_universes",
    "service_rows",
    "global_rows",
    "combined_surface_manifest_sha256",
    "history_stage_rows",
    "snapshot_stage_rows",
}
PUBLISH_PACKET_KEYS = {
    "schema_version",
    "action",
    "plan_run_id",
    "execution_run_id",
    "authorization_proof_exact",
    "automatic_retry",
    "generation_id",
    "target_rank_date",
    "input_manifest_run_id",
    "expected_active_generation_id",
    "expected_publication_version",
    "affected_universe_codes",
    "market_cap_set_sha256",
    "eligibility_set_sha256",
    "source_set_sha256",
    "selected_input_sha256",
    "membership_set_sha256",
    "affected_universe_set_sha256",
    "event_id",
    "recorded_at",
}
EXECUTION_PROOFS = {
    BUILD.action: "SEPARATE_EXACT_FUTURE_DATE_INACTIVE_GENERATION_EXECUTION_APPROVAL",
    PUBLISH.action: "SEPARATE_EXACT_GENERATION_ATOMIC_PUBLICATION_APPROVAL",
}


def _decimal_json_text(value: Decimal) -> str:
    if not value.is_finite():
        raise ContractError("non-finite JSON numbers are prohibited")
    rendered = format(value, "f")
    if value.is_zero() and rendered.startswith("-"):
        rendered = rendered[1:]
    return rendered


def canonical_json(value: object) -> str:
    """Serialize exactly, retaining JSON decimal scale and rejecting floats."""

    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, Decimal):
        return _decimal_json_text(value)
    if isinstance(value, float):
        raise ContractError("binary floating-point JSON values are prohibited")
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False, allow_nan=False)
    if isinstance(value, (list, tuple)):
        return "[" + ",".join(canonical_json(item) for item in value) + "]"
    if isinstance(value, Mapping):
        if any(not isinstance(key, str) for key in value):
            raise ContractError("JSON object keys must be strings")
        return "{" + ",".join(
            canonical_json(key) + ":" + canonical_json(value[key])
            for key in sorted(value)
        ) + "}"
    raise ContractError(f"unsupported JSON value type: {type(value).__name__}")


def sha256_json(value: object) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest().upper()


def _exact_object(value: object, keys: Sequence[str], label: str) -> Mapping[str, Any]:
    if not isinstance(value, dict) or set(value) != set(keys):
        missing = sorted(set(keys) - set(value) if isinstance(value, dict) else set(keys))
        extra = sorted(set(value) - set(keys) if isinstance(value, dict) else set())
        raise ContractError(f"{label} exact key mismatch; missing={missing}, extra={extra}")
    return value


def _exact_object_array(
    packet: Mapping[str, Any], key: str, keys: Sequence[str], *, nonempty: bool = True
) -> list[Mapping[str, Any]]:
    value = packet.get(key)
    if not isinstance(value, list) or (nonempty and not value):
        raise ContractError(f"{key} must be a nonempty array")
    return [_exact_object(item, keys, f"{key}[{index}]") for index, item in enumerate(value)]


def _canonical_date_value(value: object, label: str, *, nullable: bool = False) -> str | None:
    if value is None and nullable:
        return None
    if not isinstance(value, str):
        raise ContractError(f"{label} must be a canonical date string")
    try:
        parsed = date.fromisoformat(value)
    except ValueError as exc:
        raise ContractError(f"{label} must be a canonical date string") from exc
    if parsed.isoformat() != value:
        raise ContractError(f"{label} must be a canonical date string")
    return value


def _canonical_timestamp_value(value: object, label: str) -> datetime:
    if not isinstance(value, str) or not value:
        raise ContractError(f"{label} must be an ISO-8601 timestamptz")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ContractError(f"{label} must be an ISO-8601 timestamptz") from exc
    if parsed.tzinfo is None:
        raise ContractError(f"{label} must include a timezone")
    return parsed


def _integer_value(value: object, label: str, *, minimum: int = 0) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or value < minimum:
        raise ContractError(f"{label} must be an integer >= {minimum}")
    return value


def _postgres_numeric_text(value: object, label: str) -> str | None:
    if value is None:
        return None
    if isinstance(value, bool) or isinstance(value, float):
        raise ContractError(f"{label} must be an exact JSON decimal or integer")
    try:
        number = value if isinstance(value, Decimal) else Decimal(str(value))
    except (InvalidOperation, ValueError) as exc:
        raise ContractError(f"{label} must be an exact PostgreSQL numeric") from exc
    return _decimal_json_text(number)


def _row_digest(
    rows: Sequence[Mapping[str, Any]],
    keys: Sequence[str],
    numeric_text_keys: set[str],
) -> str:
    rendered: list[tuple[tuple[object, ...], str]] = []
    for index, row in enumerate(rows):
        snapshot_date = _canonical_date_value(row.get("snapshot_date"), f"row[{index}].snapshot_date")
        universe_code = row.get("universe_code")
        if not isinstance(universe_code, str) or not universe_code:
            raise ContractError(f"row[{index}].universe_code must be nonblank")
        rank_all = _integer_value(row.get("rank_all"), f"row[{index}].rank_all", minimum=1)
        complex_id = _integer_value(row.get("complex_id"), f"row[{index}].complex_id", minimum=1)
        values: list[object] = []
        for key in keys:
            item = row.get(key)
            if key == "snapshot_date":
                item = snapshot_date
            elif key in numeric_text_keys:
                item = _postgres_numeric_text(item, f"row[{index}].{key}")
            elif key in DIGEST_INTEGER_KEYS:
                if item is not None and (
                    not isinstance(item, int) or isinstance(item, bool)
                ):
                    raise ContractError(f"row[{index}].{key} must be an integer or null")
            elif key in DIGEST_BOOLEAN_KEYS:
                if item is not None and not isinstance(item, bool):
                    raise ContractError(f"row[{index}].{key} must be boolean or null")
            values.append(item)
        rendered.append(((snapshot_date, universe_code, rank_all, complex_id), canonical_json(values)))
    ordered = sorted(rendered, key=lambda item: item[0])
    if len({item[0] for item in ordered}) != len(ordered):
        raise ContractError("surface rows contain a duplicate canonical row identity")
    material = canonical_json(list(keys)) + "\n" + "".join(
        row_json + "\n" for _, row_json in ordered
    )
    return hashlib.sha256(material.encode("utf-8")).hexdigest().upper()


def _ordered_row_array_digest(
    rows: Sequence[Mapping[str, Any]], sort_keys: Sequence[str]
) -> str:
    try:
        ordered = sorted(rows, key=lambda row: tuple(row[key] for key in sort_keys))
    except (KeyError, TypeError) as exc:
        raise ContractError("candidate stage rows cannot be deterministically ordered") from exc
    identities = [tuple(row[key] for key in sort_keys) for row in ordered]
    if len(identities) != len(set(identities)):
        raise ContractError("candidate stage rows contain duplicate canonical identities")
    return sha256_json(ordered)


def _component_manifest(component: Mapping[str, Any]) -> str:
    material = {
        "date_vector_sha256": component["date_vector_sha256"],
        "full_row_digest_sha256": component["full_row_digest_sha256"],
        "row_count": component["row_count"],
        "snapshot_date": component["snapshot_date"],
        "surface_code": component["surface_code"],
        "universe_count": component["universe_count"],
    }
    return sha256_json(material)


def _combined_surface_manifest(components: Sequence[Mapping[str, Any]]) -> str:
    material = [
        {
            "date_vector_sha256": component["date_vector_sha256"],
            "full_row_digest_sha256": component["full_row_digest_sha256"],
            "row_count": component["row_count"],
            "snapshot_date": component["snapshot_date"],
            "surface_code": component["surface_code"],
            "universe_count": component["universe_count"],
        }
        for component in sorted(components, key=lambda item: str(item["surface_code"]))
    ]
    return sha256_json(material)


def _require_string(packet: Mapping[str, Any], key: str) -> str:
    value = packet.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ContractError(f"{key} must be a nonblank string")
    return value


def _require_uuid(packet: Mapping[str, Any], key: str) -> str:
    value = _require_string(packet, key)
    try:
        parsed = uuid.UUID(value)
    except ValueError as exc:
        raise ContractError(f"{key} must be a canonical UUID") from exc
    if str(parsed) != value:
        raise ContractError(f"{key} must use canonical lowercase UUID text")
    return value


def _require_date(packet: Mapping[str, Any], key: str) -> str:
    value = _require_string(packet, key)
    try:
        parsed = date.fromisoformat(value)
    except ValueError as exc:
        raise ContractError(f"{key} must be YYYY-MM-DD") from exc
    if parsed.isoformat() != value:
        raise ContractError(f"{key} must round-trip as canonical YYYY-MM-DD")
    return value


def _require_sha256(packet: Mapping[str, Any], key: str) -> str:
    value = _require_string(packet, key)
    if not SHA256_RE.fullmatch(value):
        raise ContractError(f"{key} must be an uppercase SHA-256 digest")
    return value


def validate_generation_inputs(packet: Mapping[str, Any]) -> dict[str, Any]:
    """Recompute every surface digest and manifest from the supplied rows."""

    components = _exact_object_array(
        packet, "surface_components", SURFACE_COMPONENT_KEYS
    )
    if [item.get("surface_code") for item in components] != list(SURFACE_CODES):
        raise ContractError("surface_components must be sorted exactly by required surface code")
    universes = _exact_object_array(
        packet, "service_universes", SERVICE_UNIVERSE_KEYS
    )
    service_rows = _exact_object_array(packet, "service_rows", SERVICE_ROW_KEYS)
    global_rows = _exact_object_array(packet, "global_rows", GLOBAL_ROW_KEYS)

    service_digest = _row_digest(
        service_rows, SERVICE_DIGEST_KEYS, SERVICE_NUMERIC_TEXT_KEYS
    )
    global_digest = _row_digest(global_rows, GLOBAL_ROW_KEYS, GLOBAL_NUMERIC_TEXT_KEYS)

    universe_codes = [item.get("universe_code") for item in universes]
    if (
        any(not isinstance(code, str) or not code for code in universe_codes)
        or universe_codes != sorted(set(universe_codes))
    ):
        raise ContractError("service_universes must be sorted and distinct")
    rows_by_universe: dict[str, list[Mapping[str, Any]]] = {
        str(code): [] for code in universe_codes
    }
    for row in service_rows:
        code = row.get("universe_code")
        if code not in rows_by_universe:
            raise ContractError(f"service row names undeclared universe {code!r}")
        rows_by_universe[str(code)].append(row)

    vector_rows: list[dict[str, Any]] = []
    for index, universe in enumerate(universes):
        code = str(universe["universe_code"])
        rows = rows_by_universe[code]
        if not rows:
            raise ContractError(f"service universe {code} has no rows")
        dates = {
            _canonical_date_value(row.get("snapshot_date"), f"service_rows[{code}].snapshot_date")
            for row in rows
        }
        previous_dates = {
            _canonical_date_value(
                row.get("source_previous_snapshot_date"),
                f"service_rows[{code}].source_previous_snapshot_date",
                nullable=True,
            )
            for row in rows
        }
        if len(dates) != 1 or len(previous_dates) != 1:
            raise ContractError(f"service universe {code} has mixed source dates")
        snapshot_date = next(iter(dates))
        previous_date = next(iter(previous_dates))
        ranks = sorted(
            _integer_value(row.get("rank_all"), f"service_rows[{code}].rank_all", minimum=1)
            for row in rows
        )
        if ranks != list(range(1, len(rows) + 1)):
            raise ContractError(f"service universe {code} has a rank gap")
        if universe.get("snapshot_date") != snapshot_date:
            raise ContractError(f"service universe {code} snapshot_date differs from rows")
        if universe.get("previous_snapshot_date") != previous_date:
            raise ContractError(
                f"service universe {code} previous_snapshot_date differs from rows"
            )
        if universe.get("expected_row_count") != len(rows):
            raise ContractError(f"service universe {code} row count differs from rows")
        row_digest = _row_digest(rows, SERVICE_DIGEST_KEYS, SERVICE_NUMERIC_TEXT_KEYS)
        _require_sha256(universe, "row_digest_sha256")
        if universe["row_digest_sha256"] != row_digest:
            raise ContractError(f"service universe {code} row digest mismatch")
        vector_rows.append(
            {
                "max_rank": len(rows),
                "min_rank": 1,
                "previous_date": previous_date,
                "row_count": len(rows),
                "snapshot_date": snapshot_date,
                "universe_code": code,
            }
        )

    service_date_vector = sha256_json(vector_rows)
    global_dates = {
        _canonical_date_value(row.get("snapshot_date"), "global_rows.snapshot_date")
        for row in global_rows
    }
    if len(global_dates) != 1:
        raise ContractError("global_rows must carry exactly one snapshot date")
    if {row.get("universe_code") for row in global_rows} != {"KOREA_ALL"}:
        raise ContractError("global_rows must use only KOREA_ALL")
    global_ranks = sorted(
        _integer_value(row.get("rank_all"), "global_rows.rank_all", minimum=1)
        for row in global_rows
    )
    if global_ranks != list(range(1, len(global_rows) + 1)):
        raise ContractError("global_rows contain a rank gap")

    component_map = {str(item["surface_code"]): item for item in components}
    service_dates = {str(item["snapshot_date"]) for item in universes}
    service_previous_dates = {item["previous_snapshot_date"] for item in universes}
    derived_components = [
        {
            "surface_code": "GLOBAL_LATEST",
            "snapshot_date": next(iter(global_dates)),
            "date_vector_sha256": None,
            "universe_count": 1,
            "row_count": len(global_rows),
            "full_row_digest_sha256": global_digest,
        },
        {
            "surface_code": "UNIVERSE_SERVICE",
            "snapshot_date": next(iter(service_dates)) if len(service_dates) == 1 else None,
            "date_vector_sha256": service_date_vector,
            "universe_count": len(universes),
            "row_count": len(service_rows),
            "full_row_digest_sha256": service_digest,
        },
    ]
    for derived in derived_components:
        derived["component_manifest_sha256"] = _component_manifest(derived)
        supplied = component_map[str(derived["surface_code"])]
        for key, value in derived.items():
            if supplied.get(key) != value:
                raise ContractError(
                    f"{derived['surface_code']} {key} differs from recomputed rows"
                )
        previous = supplied.get("previous_snapshot_date")
        _canonical_date_value(
            previous,
            f"{derived['surface_code']}.previous_snapshot_date",
            nullable=True,
        )
        if derived["surface_code"] == "UNIVERSE_SERVICE":
            derived_previous = (
                next(iter(service_previous_dates))
                if len(service_previous_dates) == 1
                else None
            )
            if previous != derived_previous:
                raise ContractError(
                    "UNIVERSE_SERVICE previous_snapshot_date differs from universe rows"
                )

    combined = _combined_surface_manifest(derived_components)
    _require_sha256(packet, "combined_surface_manifest_sha256")
    if packet["combined_surface_manifest_sha256"] != combined:
        raise ContractError("combined_surface_manifest_sha256 differs from recomputed rows")

    if "history_stage_rows" in packet:
        history_rows = _exact_object_array(
            packet, "history_stage_rows", HISTORY_STAGE_KEYS
        )
        snapshot_rows = _exact_object_array(
            packet, "snapshot_stage_rows", SNAPSHOT_STAGE_KEYS
        )
        affected = packet.get("affected_universe_codes")
        if not isinstance(affected, list) or {
            row.get("universe_code") for row in snapshot_rows
        } != set(affected):
            raise ContractError(
                "snapshot_stage_rows must cover exactly the affected universes"
            )
    else:
        history_rows = []
        snapshot_rows = []
    return {
        "surface_components": components,
        "result_surface_components": [
            {
                **derived,
                "affected_date_aligned": True,
                "cross_surface_common_fields_equal": True,
            }
            for derived in derived_components
        ],
        "combined_surface_manifest_sha256": combined,
        "service_date_vector_sha256": service_date_vector,
        "service_vector_rows": vector_rows,
        "history_stage_row_count": len(history_rows),
        "snapshot_stage_row_count": len(snapshot_rows),
        "history_stage_sha256": _ordered_row_array_digest(
            history_rows, ("snapshot_date", "rank_all", "complex_id")
        ),
        "snapshot_stage_sha256": _ordered_row_array_digest(
            snapshot_rows,
            ("snapshot_date", "universe_code", "rank_all", "complex_id"),
        ),
        "snapshot_stage_per_universe": {
            code: sum(1 for row in snapshot_rows if row.get("universe_code") == code)
            for code in packet.get("affected_universe_codes", [])
        },
    }


def validate_publication_packet(
    packet: object, expected: ActionSpec
) -> dict[str, Any]:
    """Validate load-bearing client invariants; SQL validates its exact key set."""

    if not isinstance(packet, dict):
        raise ContractError("action packet must be a JSON object")
    if packet.get("schema_version") != PACKET_SCHEMA_VERSION:
        raise ContractError(f"schema_version must equal {PACKET_SCHEMA_VERSION}")
    if packet.get("action") != expected.action:
        raise ContractError(f"action must equal {expected.action}")

    exact_keys = BUILD_PACKET_KEYS if expected == BUILD else PUBLISH_PACKET_KEYS
    if set(packet) != exact_keys:
        missing = sorted(exact_keys - set(packet))
        extra = sorted(set(packet) - exact_keys)
        raise ContractError(f"{expected.action} exact key mismatch; missing={missing}, extra={extra}")

    _require_string(packet, "plan_run_id")
    _require_string(packet, "execution_run_id")
    proof = _require_string(packet, "authorization_proof_exact")
    if proof != EXECUTION_PROOFS[expected.action]:
        raise ContractError(f"authorization_proof_exact is not approved for {expected.action}")
    _require_uuid(packet, "generation_id")
    target = _require_date(packet, "target_rank_date")
    if target <= "2026-05-31":
        raise ContractError("target_rank_date must be later than historical 2026-05-31")
    _require_string(packet, "input_manifest_run_id")
    _require_uuid(packet, "expected_active_generation_id")

    version = packet.get("expected_publication_version")
    if not isinstance(version, int) or isinstance(version, bool) or version < 1:
        raise ContractError("expected_publication_version must be a positive integer")

    universes = packet.get("affected_universe_codes")
    if (
        not isinstance(universes, list)
        or not universes
        or any(not isinstance(value, str) or not value.strip() for value in universes)
        or universes != sorted(set(universes))
    ):
        raise ContractError(
            "affected_universe_codes must be a nonempty sorted distinct string array"
        )

    for key in (
        "market_cap_set_sha256",
        "eligibility_set_sha256",
        "source_set_sha256",
        "selected_input_sha256",
        "membership_set_sha256",
        "affected_universe_set_sha256",
    ):
        _require_sha256(packet, key)

    if packet.get("automatic_retry") is not False:
        raise ContractError("automatic_retry must be false")
    if expected == BUILD:
        required_surfaces = packet.get("required_surface_codes")
        if required_surfaces != list(SURFACE_CODES):
            raise ContractError(
                "required_surface_codes must be exactly GLOBAL_LATEST, UNIVERSE_SERVICE"
            )
        for key in (
            "surface_components",
            "service_universes",
            "service_rows",
            "global_rows",
            "history_stage_rows",
            "snapshot_stage_rows",
        ):
            if not isinstance(packet.get(key), list):
                raise ContractError(f"{key} must be an array")
        _require_sha256(packet, "combined_surface_manifest_sha256")
        for key in ("generated_at", "verified_at"):
            _canonical_timestamp_value(packet.get(key), key)
        if _canonical_timestamp_value(packet["verified_at"], "verified_at") < _canonical_timestamp_value(
            packet["generated_at"], "generated_at"
        ):
            raise ContractError("verified_at must not precede generated_at")
        validate_generation_inputs(packet)
    else:
        _require_uuid(packet, "event_id")
        _canonical_timestamp_value(packet.get("recorded_at"), "recorded_at")
    return packet


def load_json_object(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"), parse_float=Decimal)
    except (OSError, json.JSONDecodeError) as exc:
        raise ContractError(f"cannot load JSON packet {path.name}: {exc}") from exc
    if not isinstance(value, dict):
        raise ContractError(f"{path.name} must contain a JSON object")
    return value


def load_typed_action_query(spec: ActionSpec) -> str:
    path = QUERY_ROOT / spec.query_file
    try:
        query = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise ContractError(f"cannot read action query {spec.query_file}") from exc
    executable = "\n".join(
        line for line in query.splitlines() if not line.lstrip().startswith("--")
    ).strip()
    if executable.count(";") != 1 or not executable.endswith(";"):
        raise ContractError(f"{spec.query_file} must contain exactly one statement")
    normalized = " ".join(executable.split()).lower()
    if not normalized.startswith("select ") or spec.entrypoint.lower() not in normalized:
        raise ContractError(
            f"{spec.query_file} must SELECT only {spec.entrypoint}(jsonb)"
        )
    if "%(packet)s::jsonb" not in executable:
        raise ContractError(f"{spec.query_file} must use typed packet binding")
    forbidden = re.compile(
        r"\b(insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|call)\b",
        re.IGNORECASE,
    )
    if forbidden.search(executable):
        raise ContractError(f"{spec.query_file} contains forbidden client-side action")
    return query


def _quoted_role(role: str) -> str:
    if not ROLE_RE.fullmatch(role):
        raise ContractError("action role is not from the closed identifier grammar")
    return f'"{role}"'


def _decode_result(row: Sequence[Any] | None, spec: ActionSpec) -> dict[str, Any]:
    if row is None or len(row) != 1:
        raise ContractError(f"{spec.entrypoint} must return exactly one JSONB column")
    value = row[0]
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError as exc:
            raise ContractError("entrypoint returned invalid JSON text") from exc
    if not isinstance(value, dict):
        raise ContractError("entrypoint result must be a JSON object")
    return value


def _same_timestamp(left: object, right: object, label: str) -> None:
    if _canonical_timestamp_value(left, f"{label}.left") != _canonical_timestamp_value(
        right, f"{label}.right"
    ):
        raise ContractError(f"{label} timestamps differ")


def validate_build_action_result(
    result: Mapping[str, Any], packet: Mapping[str, Any]
) -> dict[str, Any]:
    keys = {
        "action",
        "outcome",
        "generation_id",
        "expected_active_generation_id",
        "expected_publication_version",
        "history_stage_rows",
        "snapshot_stage_rows",
        "verification",
        "official_history_rows_written",
        "official_snapshot_rows_written",
        "publication_events_written",
        "pointer_rows_changed",
        "automatic_retry_count",
    }
    result = dict(_exact_object(result, tuple(keys), "Transaction A result"))
    controls = validate_generation_inputs(packet)
    for key in ("generation_id", "expected_active_generation_id", "expected_publication_version"):
        if result.get(key) != packet.get(key):
            raise ContractError(f"Transaction A result {key} differs from packet")
    if result.get("action") != BUILD.action or result.get("outcome") != "VERIFIED_INACTIVE":
        raise ContractError("Transaction A result action/outcome is invalid")
    exact_counts = {
        "history_stage_rows": controls["history_stage_row_count"],
        "snapshot_stage_rows": controls["snapshot_stage_row_count"],
        "official_history_rows_written": 0,
        "official_snapshot_rows_written": 0,
        "publication_events_written": 0,
        "pointer_rows_changed": 0,
        "automatic_retry_count": 0,
    }
    for key, expected in exact_counts.items():
        if result.get(key) != expected:
            raise ContractError(f"Transaction A result {key} differs from recomputed input")
    verification_keys = {
        "generation_id",
        "surface_count",
        "total_component_row_count",
        "combined_surface_manifest_sha256",
        "surface_components",
        "verified",
    }
    verification = _exact_object(
        result.get("verification"), tuple(verification_keys), "Transaction A verification"
    )
    if verification.get("generation_id") != packet["generation_id"]:
        raise ContractError("Transaction A verification generation differs")
    if verification.get("surface_count") != 2 or verification.get("verified") is not True:
        raise ContractError("Transaction A verification is not exact and affirmative")
    if verification.get("total_component_row_count") != sum(
        int(item["row_count"]) for item in controls["surface_components"]
    ):
        raise ContractError("Transaction A verification component total differs")
    if verification.get("combined_surface_manifest_sha256") != controls[
        "combined_surface_manifest_sha256"
    ]:
        raise ContractError("Transaction A verification combined manifest differs")
    if verification.get("surface_components") != controls["surface_components"]:
        raise ContractError("Transaction A verification surface components differ")
    return result


def validate_publish_action_result(
    result: Mapping[str, Any],
    packet: Mapping[str, Any],
    transaction_a_evidence: Mapping[str, Any],
    completion: Mapping[str, Any],
) -> dict[str, Any]:
    keys = {
        "action",
        "outcome",
        "generation_id",
        "event_id",
        "publication_version",
        "active_generation_id",
        "previous_generation_id",
        "published_at",
        "official_history_rows_written",
        "official_snapshot_rows_written",
        "pointer_rows_changed",
        "automatic_retry_count",
    }
    result = dict(_exact_object(result, tuple(keys), "Transaction B result"))
    transaction_a = transaction_a_evidence["transaction_a"]
    expected = {
        "action": PUBLISH.action,
        "outcome": "PUBLISHED",
        "generation_id": packet["generation_id"],
        "event_id": packet["event_id"],
        "publication_version": packet["expected_publication_version"] + 1,
        "active_generation_id": packet["generation_id"],
        "previous_generation_id": packet["expected_active_generation_id"],
        "official_history_rows_written": transaction_a["history_stage_rows"],
        "official_snapshot_rows_written": transaction_a["snapshot_stage_rows"],
        "pointer_rows_changed": 1,
        "automatic_retry_count": 0,
    }
    for key, value in expected.items():
        if result.get(key) != value:
            raise ContractError(f"Transaction B result {key} differs from approved evidence")
    _same_timestamp(result.get("published_at"), packet.get("recorded_at"), "published_at")
    activation = completion["activation"]
    if activation["pointer_after"]["event_id"] != result["event_id"]:
        raise ContractError("completion pointer event differs from Transaction B")
    if activation["pointer_after"]["generation_id"] != result["generation_id"]:
        raise ContractError("completion pointer generation differs from Transaction B")
    _same_timestamp(
        activation["pointer_after"]["published_at"],
        result["published_at"],
        "completion published_at",
    )
    return result


def _validate_completion_document(mode: str, document: Mapping[str, Any]) -> None:
    try:
        validator = importlib.import_module("validate_publication_result")
        validator.validate_document(mode, document)
    except (ModuleNotFoundError, AttributeError) as exc:
        raise ContractError("tracked schema/semantic validator is unavailable") from exc
    except ValueError as exc:
        raise ContractError(f"{mode} completion validation failed: {exc}") from exc


def build_transaction_a_evidence(
    packet: Mapping[str, Any], result: Mapping[str, Any]
) -> dict[str, Any]:
    controls = validate_generation_inputs(packet)
    authority_keys = (
        "plan_run_id",
        "execution_run_id",
        "generation_id",
        "target_rank_date",
        "input_manifest_run_id",
        "expected_active_generation_id",
        "expected_publication_version",
        "affected_universe_codes",
        "market_cap_set_sha256",
        "eligibility_set_sha256",
        "source_set_sha256",
        "selected_input_sha256",
        "membership_set_sha256",
        "affected_universe_set_sha256",
    )
    return {
        "mode": "TRANSACTION_A_COMMITTED_PENDING_SEPARATE_PUBLICATION",
        "generation_id": packet["generation_id"],
        "transaction_a_committed_at": datetime.now(timezone.utc).isoformat().replace(
            "+00:00", "Z"
        ),
        "transaction_a": dict(result),
        "candidate_stage": {
            "history_row_count": controls["history_stage_row_count"],
            "history_set_sha256": controls["history_stage_sha256"],
            "snapshot_row_count": controls["snapshot_stage_row_count"],
            "snapshot_vector_sha256": controls["snapshot_stage_sha256"],
            "per_universe_insert_counts": controls[
                "snapshot_stage_per_universe"
            ],
        },
        "authority_binding": {key: packet[key] for key in authority_keys},
        "build_packet_sha256": sha256_json(packet),
        "transaction_a_result_sha256": sha256_json(result),
        "automatic_retry_count": 0,
        "transaction_b_attempted": False,
        "producer_deactivation_required": True,
        "publisher_activation_required": True,
    }


def validate_transaction_a_evidence(document: object) -> dict[str, Any]:
    keys = {
        "mode",
        "generation_id",
        "transaction_a_committed_at",
        "transaction_a",
        "candidate_stage",
        "authority_binding",
        "build_packet_sha256",
        "transaction_a_result_sha256",
        "automatic_retry_count",
        "transaction_b_attempted",
        "producer_deactivation_required",
        "publisher_activation_required",
    }
    evidence = dict(_exact_object(document, tuple(keys), "Transaction A evidence"))
    if evidence["mode"] != "TRANSACTION_A_COMMITTED_PENDING_SEPARATE_PUBLICATION":
        raise ContractError("Transaction A evidence mode is invalid")
    _require_uuid(evidence, "generation_id")
    _canonical_timestamp_value(
        evidence["transaction_a_committed_at"], "transaction_a_committed_at"
    )
    _require_sha256(evidence, "build_packet_sha256")
    _require_sha256(evidence, "transaction_a_result_sha256")
    if evidence["transaction_a_result_sha256"] != sha256_json(evidence["transaction_a"]):
        raise ContractError("Transaction A evidence result digest mismatch")
    binding_keys = {
        "plan_run_id",
        "execution_run_id",
        "generation_id",
        "target_rank_date",
        "input_manifest_run_id",
        "expected_active_generation_id",
        "expected_publication_version",
        "affected_universe_codes",
        "market_cap_set_sha256",
        "eligibility_set_sha256",
        "source_set_sha256",
        "selected_input_sha256",
        "membership_set_sha256",
        "affected_universe_set_sha256",
    }
    binding = _exact_object(
        evidence.get("authority_binding"), tuple(binding_keys), "authority_binding"
    )
    transaction_a_keys = {
        "action",
        "outcome",
        "generation_id",
        "expected_active_generation_id",
        "expected_publication_version",
        "history_stage_rows",
        "snapshot_stage_rows",
        "verification",
        "official_history_rows_written",
        "official_snapshot_rows_written",
        "publication_events_written",
        "pointer_rows_changed",
        "automatic_retry_count",
    }
    transaction_a = _exact_object(
        evidence.get("transaction_a"), tuple(transaction_a_keys), "transaction_a"
    )
    if (
        transaction_a.get("action") != BUILD.action
        or transaction_a.get("outcome") != "VERIFIED_INACTIVE"
        or transaction_a.get("generation_id") != evidence["generation_id"]
        or binding.get("generation_id") != evidence["generation_id"]
        or transaction_a.get("expected_active_generation_id")
        != binding.get("expected_active_generation_id")
        or transaction_a.get("expected_publication_version")
        != binding.get("expected_publication_version")
    ):
        raise ContractError("Transaction A evidence identity is inconsistent")
    for key in (
        "official_history_rows_written",
        "official_snapshot_rows_written",
        "publication_events_written",
        "pointer_rows_changed",
        "automatic_retry_count",
    ):
        if transaction_a.get(key) != 0:
            raise ContractError(f"Transaction A evidence {key} must be zero")
    verification = _exact_object(
        transaction_a.get("verification"),
        (
            "generation_id",
            "surface_count",
            "total_component_row_count",
            "combined_surface_manifest_sha256",
            "surface_components",
            "verified",
        ),
        "transaction_a.verification",
    )
    if (
        verification.get("generation_id") != evidence["generation_id"]
        or verification.get("surface_count") != 2
        or verification.get("verified") is not True
        or not isinstance(verification.get("surface_components"), list)
        or len(verification["surface_components"]) != 2
    ):
        raise ContractError("Transaction A verification evidence is invalid")
    _require_sha256(verification, "combined_surface_manifest_sha256")
    candidate = _exact_object(
        evidence.get("candidate_stage"),
        (
            "history_row_count",
            "history_set_sha256",
            "snapshot_row_count",
            "snapshot_vector_sha256",
            "per_universe_insert_counts",
        ),
        "candidate_stage",
    )
    if (
        candidate.get("history_row_count") != transaction_a.get("history_stage_rows")
        or candidate.get("snapshot_row_count")
        != transaction_a.get("snapshot_stage_rows")
    ):
        raise ContractError("Transaction A candidate counts differ from DB result")
    _require_sha256(candidate, "history_set_sha256")
    _require_sha256(candidate, "snapshot_vector_sha256")
    if (
        evidence["automatic_retry_count"] != 0
        or evidence["transaction_b_attempted"] is not False
        or evidence["producer_deactivation_required"] is not True
        or evidence["publisher_activation_required"] is not True
    ):
        raise ContractError("Transaction A evidence incorrectly claims transition state")
    return evidence


def validate_transition_proof(
    document: object,
    transaction_a_evidence: Mapping[str, Any],
    publish_packet: Mapping[str, Any],
    completion: Mapping[str, Any],
) -> dict[str, Any]:
    keys = {
        "schema_version",
        "action",
        "plan_run_id",
        "generation_id",
        "build_execution_run_id",
        "publish_execution_run_id",
        "build_packet_sha256",
        "publish_packet_sha256",
        "transaction_a_result_sha256",
        "completion_result_sha256",
        "separate_publication_authorization_proof_exact",
        "independent_verification",
        "producer_deactivation",
        "publisher_activation",
    }
    proof = dict(_exact_object(document, tuple(keys), "publication transition proof"))
    if proof["schema_version"] != TRANSITION_SCHEMA_VERSION:
        raise ContractError("transition proof schema_version is invalid")
    if proof["action"] != "AUTHORIZE_TRANSACTION_B":
        raise ContractError("transition proof action is invalid")
    if proof["separate_publication_authorization_proof_exact"] != TRANSITION_APPROVAL:
        raise ContractError("transition proof lacks the separate exact approval")
    binding = transaction_a_evidence.get("authority_binding")
    if not isinstance(binding, dict):
        raise ContractError("Transaction A evidence authority binding is absent")
    expected_scalars = {
        "plan_run_id": publish_packet["plan_run_id"],
        "generation_id": publish_packet["generation_id"],
        "build_execution_run_id": binding.get("execution_run_id"),
        "publish_execution_run_id": publish_packet["execution_run_id"],
        "build_packet_sha256": transaction_a_evidence["build_packet_sha256"],
        "publish_packet_sha256": sha256_json(publish_packet),
        "transaction_a_result_sha256": transaction_a_evidence[
            "transaction_a_result_sha256"
        ],
        "completion_result_sha256": sha256_json(completion),
    }
    for key, expected in expected_scalars.items():
        if proof.get(key) != expected:
            raise ContractError(f"transition proof {key} differs from approved evidence")
    if proof["build_execution_run_id"] == proof["publish_execution_run_id"]:
        raise ContractError("Transaction B must use a distinct execution_run_id")

    verification = _exact_object(
        proof.get("independent_verification"),
        (
            "status",
            "verifier_id",
            "verified_at",
            "generation_id",
            "transaction_a_result_sha256",
            "completion_result_sha256",
        ),
        "independent_verification",
    )
    if verification.get("status") != "PASS":
        raise ContractError("independent verification did not pass")
    if not isinstance(verification.get("verifier_id"), str) or not verification[
        "verifier_id"
    ].strip():
        raise ContractError("independent verifier_id must be nonblank")
    for key in ("generation_id", "transaction_a_result_sha256", "completion_result_sha256"):
        if verification.get(key) != expected_scalars[key]:
            raise ContractError(f"independent verification {key} differs")

    producer = _exact_object(
        proof.get("producer_deactivation"),
        ("role", "membership_revoked", "post_cleanup_backend_count", "observed_at"),
        "producer_deactivation",
    )
    if (
        producer.get("role") != BUILD.role
        or producer.get("membership_revoked") is not True
        or producer.get("post_cleanup_backend_count") != 0
    ):
        raise ContractError("producer deactivation and zero-backend proof is invalid")
    publisher = _exact_object(
        proof.get("publisher_activation"),
        (
            "role",
            "membership_active",
            "backend_count_before",
            "membership_options",
            "observed_at",
        ),
        "publisher_activation",
    )
    if (
        publisher.get("role") != PUBLISH.role
        or publisher.get("membership_active") is not True
        or publisher.get("backend_count_before") != 0
        or publisher.get("membership_options")
        != {"inherit": False, "set": True, "admin": False}
    ):
        raise ContractError("publisher activation proof is invalid")
    committed_at = _canonical_timestamp_value(
        transaction_a_evidence["transaction_a_committed_at"],
        "transaction_a_committed_at",
    )
    producer_at = _canonical_timestamp_value(producer["observed_at"], "producer observed_at")
    verified_at = _canonical_timestamp_value(
        verification["verified_at"], "independent verified_at"
    )
    publisher_at = _canonical_timestamp_value(
        publisher["observed_at"], "publisher observed_at"
    )
    if not committed_at <= producer_at <= verified_at <= publisher_at:
        raise ContractError("transition evidence timestamps are out of order")
    return proof


def validate_publication_completion(
    completion: object,
    publish_packet: Mapping[str, Any],
    transaction_a_evidence: Mapping[str, Any],
) -> dict[str, Any]:
    if not isinstance(completion, dict):
        raise ContractError("publication completion must be a JSON object")
    _validate_completion_document("PUBLICATION_RESULT", completion)
    if completion.get("outcome") != "SUCCESSFUL_PUBLICATION":
        raise ContractError("Transaction B requires SUCCESSFUL_PUBLICATION completion")
    identity = completion["identity"]
    expected_identity = {
        "plan_run_id": publish_packet["plan_run_id"],
        "execution_run_id": publish_packet["execution_run_id"],
        "authorization_proof_exact": publish_packet["authorization_proof_exact"],
        "manifest_run_id": publish_packet["input_manifest_run_id"],
        "manifest_contract_version": "rank-input-v1",
        "target_date": publish_packet["target_rank_date"],
    }
    if identity != expected_identity:
        raise ContractError("publication completion identity differs from publish packet")
    binding = transaction_a_evidence["authority_binding"]
    for key in (
        "plan_run_id",
        "generation_id",
        "target_rank_date",
        "input_manifest_run_id",
        "expected_active_generation_id",
        "expected_publication_version",
        "affected_universe_codes",
        "market_cap_set_sha256",
        "eligibility_set_sha256",
        "source_set_sha256",
        "selected_input_sha256",
        "membership_set_sha256",
        "affected_universe_set_sha256",
    ):
        if binding.get(key) != publish_packet.get(key):
            raise ContractError(f"Transaction A and B authority binding differs: {key}")

    transaction_a = transaction_a_evidence["transaction_a"]
    verification = transaction_a["verification"]
    generation = completion["generation"]
    if generation["generation_id"] != publish_packet["generation_id"]:
        raise ContractError("completion generation_id differs from packet")
    if generation["combined_surface_manifest_sha256"] != verification[
        "combined_surface_manifest_sha256"
    ]:
        raise ContractError("completion combined manifest differs from Transaction A")
    expected_components = []
    for component in verification["surface_components"]:
        expected_components.append(
            {
                key: value
                for key, value in component.items()
                if key != "previous_snapshot_date"
            }
            | {
                "affected_date_aligned": True,
                "cross_surface_common_fields_equal": True,
            }
        )
    if generation["surface_components"] != expected_components:
        raise ContractError("completion surface components differ from Transaction A")
    if generation["total_component_rows"] != verification["total_component_row_count"]:
        raise ContractError("completion component total differs from Transaction A")
    candidate_evidence = transaction_a_evidence["candidate_stage"]
    candidate_completion = completion["candidate_stage"]
    for key in (
        "history_row_count",
        "history_set_sha256",
        "snapshot_row_count",
        "snapshot_vector_sha256",
    ):
        if candidate_completion[key] != candidate_evidence[key]:
            raise ContractError(f"completion candidate {key} differs from Transaction A")
    if completion["history"]["inserted_rows"] != candidate_evidence[
        "history_row_count"
    ]:
        raise ContractError("completion official history count differs from Transaction A")
    if completion["history"]["source_set_sha256"] != candidate_evidence[
        "history_set_sha256"
    ]:
        raise ContractError("completion official history digest differs from Transaction A")
    if completion["snapshots"]["total_inserted_rows"] != candidate_evidence[
        "snapshot_row_count"
    ]:
        raise ContractError("completion official snapshot count differs from Transaction A")
    if completion["snapshots"]["snapshot_vector_sha256"] != candidate_evidence[
        "snapshot_vector_sha256"
    ]:
        raise ContractError("completion official snapshot digest differs from Transaction A")
    if completion["snapshots"]["per_universe_insert_counts"] != candidate_evidence[
        "per_universe_insert_counts"
    ]:
        raise ContractError("completion per-universe counts differ from Transaction A")
    gate = completion["gate_counts"]
    digest_bindings = {
        "market_cap_set_sha256": "market_cap_set_sha256",
        "eligibility_set_sha256": "eligibility_set_sha256",
        "source_set_sha256": "source_set_sha256",
        "selected_input_sha256": "selected_input_sha256",
        "membership_set_sha256": "membership_set_sha256",
        "affected_universe_set_sha256": "affected_universe_set_sha256",
        "affected_universe_codes": "affected_universe_codes",
    }
    for suffix, packet_key in digest_bindings.items():
        if gate.get(f"expected_{suffix}") != publish_packet[packet_key]:
            raise ContractError(f"completion expected_{suffix} differs from packet")
        if gate.get(f"actual_{suffix}") != publish_packet[packet_key]:
            raise ContractError(f"completion actual_{suffix} differs from packet")
    activation = completion["activation"]
    before = activation["pointer_before"]
    after = activation["pointer_after"]
    event = activation["publish_event"]
    if (
        before["generation_id"] != publish_packet["expected_active_generation_id"]
        or before["publication_version"] != publish_packet["expected_publication_version"]
        or after["generation_id"] != publish_packet["generation_id"]
        or after["event_id"] != publish_packet["event_id"]
        or event["event_id"] != publish_packet["event_id"]
    ):
        raise ContractError("completion activation tuple differs from publish packet")
    _same_timestamp(after["published_at"], publish_packet["recorded_at"], "pointer published_at")
    _same_timestamp(event["recorded_at"], publish_packet["recorded_at"], "event recorded_at")
    _same_timestamp(
        activation["transaction_a_completion_observed_at"],
        transaction_a_evidence["transaction_a_committed_at"],
        "Transaction A completion observed_at",
    )
    return completion


def execute_serializable_action(
    connection: Connection,
    spec: ActionSpec,
    packet: dict[str, Any],
    result_validator: Callable[[Mapping[str, Any]], dict[str, Any]],
) -> dict[str, Any]:
    """Execute once and validate the exact DB response before commit."""

    query = load_typed_action_query(spec)
    cursor = connection.cursor()
    try:
        cursor.execute("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE")
        cursor.execute(f"SET LOCAL ROLE {_quoted_role(spec.role)}")
        cursor.execute(query, {"packet": canonical_json(packet)})
        result = _decode_result(cursor.fetchone(), spec)
        if cursor.fetchone() is not None:
            raise ContractError("entrypoint returned more than one row")
        result = result_validator(result)
        connection.commit()
        return result
    except BaseException:
        connection.rollback()
        raise
    finally:
        cursor.close()


def connect_from_env(variable_name: str) -> Connection:
    if not re.fullmatch(r"[A-Z][A-Z0-9_]*", variable_name):
        raise ContractError("DSN environment variable name is invalid")
    dsn = os.environ.get(variable_name)
    if not dsn:
        raise ContractError(f"required DSN environment variable is not set: {variable_name}")
    try:
        psycopg = importlib.import_module("psycopg")
    except ModuleNotFoundError as exc:
        raise ContractError("psycopg is required only for an approved execution") from exc
    return psycopg.connect(dsn, autocommit=False)


def run_two_transactions(
    build_packet: dict[str, Any],
    publish_packet: dict[str, Any],
    build_dsn_env: str,
    publish_dsn_env: str,
) -> dict[str, Any]:
    del build_packet, publish_packet, build_dsn_env, publish_dsn_env
    raise ContractError(
        "automatic Transaction-A-to-Transaction-B execution is prohibited; "
        "use separate --execute-transaction-a and --execute-transaction-b invocations"
    )


def execute_transaction_a(
    build_packet: dict[str, Any], build_dsn_env: str
) -> dict[str, Any]:
    validate_publication_packet(build_packet, BUILD)
    connection = connect_from_env(build_dsn_env)
    try:
        transaction_a = execute_serializable_action(
            connection,
            BUILD,
            build_packet,
            lambda result: validate_build_action_result(result, build_packet),
        )
    finally:
        connection.close()
    return build_transaction_a_evidence(build_packet, transaction_a)


def execute_transaction_b(
    publish_packet: dict[str, Any],
    transaction_a_evidence: dict[str, Any],
    transition_proof: dict[str, Any],
    completion: dict[str, Any],
    publish_dsn_env: str,
) -> dict[str, Any]:
    validate_publication_packet(publish_packet, PUBLISH)
    transaction_a_evidence = validate_transaction_a_evidence(
        transaction_a_evidence
    )
    completion = validate_publication_completion(
        completion, publish_packet, transaction_a_evidence
    )
    validate_transition_proof(
        transition_proof, transaction_a_evidence, publish_packet, completion
    )
    completion_sha256 = sha256_json(completion)
    connection = connect_from_env(publish_dsn_env)
    try:
        execute_serializable_action(
            connection,
            PUBLISH,
            publish_packet,
            lambda result: validate_publish_action_result(
                result, publish_packet, transaction_a_evidence, completion
            ),
        )
    finally:
        connection.close()
    _validate_completion_document("PUBLICATION_RESULT", completion)
    if sha256_json(completion) != completion_sha256:
        raise ContractError("publication completion document changed across commit")
    return completion


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--build-packet", type=Path)
    parser.add_argument("--publish-packet", type=Path)
    parser.add_argument("--transaction-a-evidence", type=Path)
    parser.add_argument("--transition-proof", type=Path)
    parser.add_argument("--completion-result", type=Path)
    parser.add_argument("--build-dsn-env", default="KOAPTIX_RANK_BUILD_ACTION_DSN")
    parser.add_argument("--publish-dsn-env", default="KOAPTIX_RANK_PUBLISH_ACTION_DSN")
    parser.add_argument("--output", type=Path)
    actions = parser.add_mutually_exclusive_group()
    actions.add_argument("--execute-transaction-a", action="store_true")
    actions.add_argument("--execute-transaction-b", action="store_true")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        load_typed_action_query(BUILD)
        load_typed_action_query(PUBLISH)
        if args.execute_transaction_a:
            if args.build_packet is None:
                raise ContractError("--execute-transaction-a requires --build-packet")
            if any(
                value is not None
                for value in (
                    args.publish_packet,
                    args.transaction_a_evidence,
                    args.transition_proof,
                    args.completion_result,
                )
            ):
                raise ContractError(
                    "Transaction A invocation must not receive Transaction B artifacts"
                )
            build_packet = validate_publication_packet(
                load_json_object(args.build_packet), BUILD
            )
            result = execute_transaction_a(build_packet, args.build_dsn_env)
        elif args.execute_transaction_b:
            required = {
                "--publish-packet": args.publish_packet,
                "--transaction-a-evidence": args.transaction_a_evidence,
                "--transition-proof": args.transition_proof,
                "--completion-result": args.completion_result,
            }
            missing = [name for name, value in required.items() if value is None]
            if missing:
                raise ContractError(
                    f"--execute-transaction-b missing required artifacts: {missing}"
                )
            if args.build_packet is not None:
                raise ContractError("Transaction B invocation must not receive --build-packet")
            publish_packet = validate_publication_packet(
                load_json_object(args.publish_packet), PUBLISH
            )
            result = execute_transaction_b(
                publish_packet,
                load_json_object(args.transaction_a_evidence),
                load_json_object(args.transition_proof),
                load_json_object(args.completion_result),
                args.publish_dsn_env,
            )
        else:
            if args.build_packet is None and args.publish_packet is None:
                raise ContractError(
                    "validation-only mode requires at least one action packet"
                )
            result = {
                "status": "PASS_PACKETS_VALIDATED_NO_EXECUTION",
                "production_action_attempted": False,
                "automatic_transaction_transition_count": 0,
            }
            if args.build_packet is not None:
                build_packet = validate_publication_packet(
                    load_json_object(args.build_packet), BUILD
                )
                result["build_packet_sha256"] = sha256_json(build_packet)
            if args.publish_packet is not None:
                publish_packet = validate_publication_packet(
                    load_json_object(args.publish_packet), PUBLISH
                )
                result["publish_packet_sha256"] = sha256_json(publish_packet)
            if any(
                value is not None
                for value in (
                    args.transaction_a_evidence,
                    args.transition_proof,
                    args.completion_result,
                )
            ):
                raise ContractError(
                    "validation-only mode does not accept transition execution artifacts"
                )
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
