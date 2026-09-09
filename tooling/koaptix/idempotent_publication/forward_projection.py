"""Pure forward-projection contract mechanics. No connection, issuer, or action runner."""
from __future__ import annotations
from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Mapping
from . import contracts as publication

EFFECTIVE_BOUNDARY = "FIRST_GENERATION_EXPLICITLY_ACCEPTED_AND_PUBLISHED_UNDER_THIS_CONTRACT"
TIER_KEYS = ("tier_code", "tier_label", "tier_sort")
COMMON_KEYS = (
    "snapshot_date", "universe_code", "complex_id", "rank_all", "market_cap_krw",
    "market_cap_share", "market_cap_share_pct", "tier_code", "tier_label",
    "tier_sort", "is_top1000",
)
REFERENCE_STATUSES = frozenset(("VERIFIED_NO_OUTPUT_CHANGE", "NO_NEW_SOURCE_INPUT"))
FAILURE_STATUSES = frozenset(("PARTIAL", "FAILED_RECORDED", "GAP_UNRESOLVED"))
# Dates and generation envelopes are independent from business-value equality.
# Comparison rank/delta/movement, descriptors, quality facts and tier NULLs remain
# in the business preimage. No old row is rewritten when a daily reference is made.
BUSINESS_DATE_ENVELOPE_KEYS = frozenset((
    "snapshot_date", "source_previous_snapshot_date", "generated_at", "refresh_run_id"
))

def canonical_timestamp(value: str) -> str:
    parsed = publication._canonical_timestamp_value(value, "fixed timestamp")
    return parsed.astimezone(timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z")

def load_projection_json(text: str) -> dict[str, Any]:
    import json
    def reject_constant(value: str) -> None:
        raise publication.ContractError("nonfinite JSON constant: " + value)
    value = json.loads(text, parse_float=Decimal, parse_constant=reject_constant)
    if not isinstance(value, dict):
        raise publication.ContractError("projection must be an object")
    return value

def _reject_floats(value: object) -> None:
    if isinstance(value, float):
        raise publication.ContractError("binary floats are forbidden")
    if isinstance(value, Decimal) and not value.is_finite():
        raise publication.ContractError("nonfinite decimal is forbidden")
    if isinstance(value, dict):
        for child in value.values():
            _reject_floats(child)
    elif isinstance(value, (list, tuple)):
        for child in value:
            _reject_floats(child)

def _require_row_order(rows: list[Mapping[str, Any]], keys: tuple[str, ...]) -> None:
    order = [tuple(row[k] for k in keys) for row in rows]
    if order != sorted(order) or len(order) != len(set(order)):
        raise publication.ContractError("row order or identity is not canonical")

def _assert_current_common_fields(global_rows: list[dict], service_rows: list[dict],
                                  global_previous_date: str | None) -> None:
    korea = {r["complex_id"]: r for r in service_rows if r["universe_code"] == "KOREA_ALL"}
    global_map = {r["complex_id"]: r for r in global_rows}
    if set(korea) != set(global_map):
        raise publication.ContractError("KOREA_ALL population differs from GLOBAL")
    for cid, g in global_map.items():
        k = korea[cid]
        if publication.canonical_json([g[key] for key in COMMON_KEYS]) != publication.canonical_json([k[key] for key in COMMON_KEYS]):
            raise publication.ContractError("KOREA_ALL current field differs from GLOBAL")
        if k["source_previous_snapshot_date"] == global_previous_date:
            if (g["previous_rank_all"], g["rank_delta_1d"], g["rank_movement"]) != (
                k["previous_rank_all"], k["rank_delta_w"], k["rank_movement"]
            ):
                raise publication.ContractError("KOREA_ALL movement differs for shared predecessor")

def assemble_projection(projection: Mapping[str, Any]) -> dict[str, Any]:
    """Assemble deterministic data arrays/digests only; external authority stays external.

    This consumes the read-only SQL result. It never creates S/A/B authorization,
    generation IDs, plan/run IDs or live publication actions.
    """
    _reject_floats(projection)
    required = {
        "target_rank_date", "global_previous_snapshot_date", "input_authority",
        "global_rows", "service_rows", "history_stage_rows", "snapshot_stage_rows",
    }
    publication._exact_object(dict(projection), required, "SQL projection")
    target = publication._canonical_date_value(projection["target_rank_date"], "target D")
    previous = publication._canonical_date_value(
        projection["global_previous_snapshot_date"], "GLOBAL previous", nullable=True
    )
    if previous is not None and previous >= target:
        raise publication.ContractError("GLOBAL predecessor must be earlier than D")
    g = publication._exact_object_array(projection, "global_rows", publication.GLOBAL_ROW_KEYS)
    s = publication._exact_object_array(projection, "service_rows", publication.SERVICE_ROW_KEYS)
    h = publication._exact_object_array(projection, "history_stage_rows", publication.HISTORY_STAGE_KEYS)
    t = publication._exact_object_array(projection, "snapshot_stage_rows", publication.SNAPSHOT_STAGE_KEYS)
    for rows in (g, s, t):
        _require_row_order(rows, ("snapshot_date", "universe_code", "rank_all", "complex_id"))
    _require_row_order(h, ("snapshot_date", "rank_all", "complex_id"))
    for row in g + s + h + t:
        if row["snapshot_date"] != target:
            raise publication.ContractError("fresh action rows must use actual canonical input D")
    for row in g + s:
        if any(row[key] is not None for key in TIER_KEYS):
            raise publication.ContractError("prospective tier triple must be NULL")
        if row["recovery_52w"] is not None:
            raise publication.ContractError("source-proven recovery_52w must be NULL")
    for row in t:
        if row["rank_method"] != "market_cap_desc" or row["calculation_version"] != "v1":
            raise publication.ContractError("exact method/version contract violated")
        if row["created_at"] != canonical_timestamp(row["created_at"]):
            raise publication.ContractError("stage timestamp must be frozen canonical UTC")
    for row in s:
        if row["generated_at"] != canonical_timestamp(row["generated_at"]):
            raise publication.ContractError("generation timestamp must be frozen canonical UTC")
        prior = row["source_previous_snapshot_date"]
        if prior is not None and prior >= target:
            raise publication.ContractError("SERVICE predecessor must be earlier than D")
    _assert_current_common_fields(g, s, previous)
    by_universe = defaultdict(list)
    for row in s:
        by_universe[row["universe_code"]].append(row)
    codes = sorted(by_universe)
    if projection["input_authority"]["affected_universe_codes"] != codes:
        raise publication.ContractError("affected set differs from canonical input authority")
    universes, vector = [], []
    for code in codes:
        rows = by_universe[code]
        dates = {row["source_previous_snapshot_date"] for row in rows}
        if len(dates) != 1:
            raise publication.ContractError("mixed SERVICE predecessor")
        prior = next(iter(dates))
        universes.append({
            "universe_code": code, "snapshot_date": target,
            "previous_snapshot_date": prior, "expected_row_count": len(rows),
            "row_digest_sha256": publication._row_digest(
                rows, publication.SERVICE_DIGEST_KEYS, publication.SERVICE_NUMERIC_TEXT_KEYS),
        })
        vector.append({
            "max_rank": len(rows), "min_rank": 1, "previous_date": prior,
            "row_count": len(rows), "snapshot_date": target, "universe_code": code,
        })
    components = [
        {"surface_code": "GLOBAL_LATEST", "snapshot_date": target,
         "previous_snapshot_date": previous, "date_vector_sha256": None,
         "universe_count": 1, "row_count": len(g),
         "full_row_digest_sha256": publication._row_digest(
             g, publication.GLOBAL_ROW_KEYS, publication.GLOBAL_NUMERIC_TEXT_KEYS)},
        {"surface_code": "UNIVERSE_SERVICE", "snapshot_date": None,
         "previous_snapshot_date": None, "date_vector_sha256": publication.sha256_json(vector),
         "universe_count": len(codes), "row_count": len(s),
         "full_row_digest_sha256": publication._row_digest(
             s, publication.SERVICE_DIGEST_KEYS, publication.SERVICE_NUMERIC_TEXT_KEYS)},
    ]
    for component in components:
        component["component_manifest_sha256"] = publication._component_manifest(component)
    data = {
        "affected_universe_codes": codes, "surface_components": components,
        "service_universes": universes, "service_rows": list(s), "global_rows": list(g),
        "combined_surface_manifest_sha256": publication._combined_surface_manifest(components),
        "history_stage_rows": list(h), "snapshot_stage_rows": list(t),
    }
    # Existing exact array/date/count/digest validation with only PD01/PD04 changes.
    publication.validate_generation_inputs(data)
    expected_history = [
        {"snapshot_date": r["snapshot_date"], "complex_id": r["complex_id"],
         "market_cap_krw": r["market_cap_krw"], "rank_all": r["rank_all"],
         "total_market_cap": r["market_cap_krw"]} for r in g
    ]
    if list(h) != expected_history:
        raise publication.ContractError("history stage differs from canonical GLOBAL values")
    stage_map = {(r["universe_code"], r["complex_id"]): r for r in t}
    if len(stage_map) != len(t) or len(t) != len(s):
        raise publication.ContractError("snapshot stage row count or identity multiplicity differs from SERVICE")
    if set(stage_map) != {(r["universe_code"], r["complex_id"]) for r in s}:
        raise publication.ContractError("snapshot stage identity differs from affected SERVICE")
    for row in s:
        stage = stage_map[(row["universe_code"], row["complex_id"])]
        for key in ("snapshot_date", "rank_all", "market_cap_krw", "market_cap_share",
                    "previous_rank_all", "is_top1000"):
            if stage[key] != row[key]:
                raise publication.ContractError("snapshot stage differs from SERVICE")
        if stage["rank_delta_1d"] != row["rank_delta_w"]:
            raise publication.ContractError("snapshot stage delta differs from SERVICE")
    return data

def canonical_business_state(data: Mapping[str, Any]) -> dict[str, Any]:
    """Complete-bundle business values; never a per-universe partial success test."""
    return {
        name: [
            {key: row[key] for key in keys if key not in BUSINESS_DATE_ENVELOPE_KEYS}
            for row in sorted(data[name], key=lambda r: (r["universe_code"], r["rank_all"], r["complex_id"]))
        ]
        for name, keys in (("global_rows", publication.GLOBAL_ROW_KEYS),
                           ("service_rows", publication.SERVICE_ROW_KEYS))
    }

def business_sha256(data: Mapping[str, Any]) -> str:
    return publication.sha256_json(canonical_business_state(data))

def validate_daily_observation_reference(
    receipt: Mapping[str, Any], prior: Mapping[str, Any],
    current_projection: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Validate a supplied evidence/reference boundary; no storage or dispatch.

    Whole atomic generation is the classification unit. If any part is partial,
    failed or unaccounted, a successful whole-state reference is rejected.
    """
    keys = {
        "expected_kst_day", "observed_at", "classification", "observation_evidence_sha256",
        "source_inventory_complete", "prior_generation_id", "prior_packet_sha256",
        "prior_projection_contract_sha256", "projection_contract_sha256",
        "prior_business_sha256", "current_business_sha256",
        "prior_input_identity_sha256", "current_input_identity_sha256",
        "affected_universe_set_sha256", "prior_date_vector_sha256",
    }
    publication._exact_object(dict(receipt), keys, "daily observation reference")
    day = publication._canonical_date_value(receipt["expected_kst_day"], "expected KST day")
    observed = publication._canonical_timestamp_value(receipt["observed_at"], "observed_at")
    from datetime import timedelta
    if observed.astimezone(timezone(timedelta(hours=9))).date().isoformat() != day:
        raise publication.ContractError("observation timestamp must account for exact KST day")
    classification = receipt["classification"]
    if classification not in REFERENCE_STATUSES:
        raise publication.ContractError("failed/partial/gap or publication state cannot carry forward")
    if receipt["source_inventory_complete"] is not True:
        raise publication.ContractError("complete relevant-source inventory evidence is required")
    publication._require_uuid(receipt, "prior_generation_id")
    for key in keys:
        if key.endswith("_sha256"):
            publication._require_sha256(receipt, key)
    bindings = {
        "prior_generation_id": prior["generation_id"],
        "prior_packet_sha256": prior["packet_sha256"],
        "prior_projection_contract_sha256": prior["projection_contract_sha256"],
        "prior_business_sha256": business_sha256(prior["data"]),
        "prior_input_identity_sha256": prior["input_identity_sha256"],
        "affected_universe_set_sha256": prior["affected_universe_set_sha256"],
        "prior_date_vector_sha256": prior["data"]["surface_components"][1]["date_vector_sha256"],
    }
    if any(receipt[key] != value for key, value in bindings.items()):
        raise publication.ContractError("daily reference differs from exact prior verified identity")
    if any(row["snapshot_date"] > day for row in prior["data"]["service_rows"] + prior["data"]["global_rows"]):
        raise publication.ContractError("reference cannot use future business observation")
    if receipt["current_business_sha256"] != receipt["prior_business_sha256"]:
        raise publication.ContractError("changed business state cannot be a carry-forward reference")
    if classification == "VERIFIED_NO_OUTPUT_CHANGE":
        if current_projection is None:
            raise publication.ContractError("processed complete output comparison is required")
        if business_sha256(current_projection) != receipt["prior_business_sha256"]:
            raise publication.ContractError("output comparison is not equal")
        if receipt["projection_contract_sha256"] != receipt["prior_projection_contract_sha256"]:
            raise publication.ContractError("no-change equivalence requires the same explicit projection contract")
    elif receipt["current_input_identity_sha256"] != receipt["prior_input_identity_sha256"]:
        raise publication.ContractError("NO_NEW_SOURCE_INPUT needs identical relevant input identity")
    # Caller must retain immutable evidence bytes matching the supplied evidence
    # hash. A hash-shaped string alone does not establish observation truth.
    return {
        "classification": classification, "expected_kst_day": day,
        "effective_generation_id": prior["generation_id"],
        "business_snapshot_dates": sorted({r["snapshot_date"] for r in prior["data"]["service_rows"]}),
        "observation_reference_sha256": publication.sha256_json(dict(receipt)),
        "action_packet_required": False, "official_target_D_rows_required": False,
    }

def projection_contract_sha256(identity_manifest: Mapping[str, Any]) -> str:
    """Content-address a supplied closed manifest; never assign calculation_version."""
    publication._exact_object(dict(identity_manifest), ("effective_boundary", "artifacts"), "projection identity material")
    if identity_manifest.get("effective_boundary") != EFFECTIVE_BOUNDARY:
        raise publication.ContractError("effective boundary is not the approved prospective boundary")
    artifacts = identity_manifest.get("artifacts")
    if not isinstance(artifacts, list) or not artifacts:
        raise publication.ContractError("projection identity needs exact source artifact bindings")
    paths = [row["path"] for row in artifacts]
    if paths != sorted(set(paths)):
        raise publication.ContractError("identity artifacts must be sorted and unique")
    for row in artifacts:
        publication._exact_object(row, ("path", "bytes", "sha256"), "identity artifact")
        publication._integer_value(row["bytes"], "identity bytes", minimum=1)
        publication._require_sha256(row, "sha256")
    return publication.sha256_json(dict(identity_manifest))
