#!/usr/bin/env python3
"""Schema and semantic validation for publication and initial-seed evidence.

JSON Schema validation is necessary but is not accepted alone. This validator
also binds plan/execution/generation/event/pointer tuples, expected/actual gates,
component totals, failure-phase provenance and rollback target authority.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence


ROOT = Path(__file__).resolve().parent
MODES = {
    "PUBLICATION_RESULT": ROOT / "publication_result_schema.json",
    "INITIAL_SEED_RESULT": ROOT / "initial_seed_result_schema.json",
}
BOOTSTRAP_AUTHORITY_KIND = "BOOTSTRAP_COMPATIBILITY_BUNDLE"
BOOTSTRAP_SEED_QUERY_SHA256 = (
    "FB458788A70981BAD55A909D49D7AED3BE3772FA1A8DBA3AC89E799791E82A59"
)
BOOTSTRAP_SERVICE_VECTOR_FILE_SHA256 = (
    "5838DF7C3ED197498E23B4330D3CC8D985F9009F79A652EA19B92C0B9AE97E85"
)
BOOTSTRAP_SERVICE_VECTOR_SHA256 = (
    "6E7BA473DDCC0C25F3F46FFEE443BA41CC9D2435F448531189F843AB28FA82F7"
)
BOOTSTRAP_SERVICE_COMPONENT = {
    "snapshot_date": None,
    "previous_snapshot_date": None,
    "date_vector_sha256": BOOTSTRAP_SERVICE_VECTOR_SHA256,
    "universe_count": 225,
    "row_count": 40484,
    "full_row_digest_sha256": "FB31BF64DF0000EABDD3827581D6B40FEC2D22EE64582C4B1AB28FE6A26D8008",
    "component_manifest_sha256": "A1CCACBCE1AF6EE106840E482A97A303813F096EA616F7D3837D865CFA8707E2",
}
EXPECTED_BOOTSTRAP_BY_AUTHORITY = {
    "BOOTSTRAP_COMPATIBILITY_BUNDLE_V1": {
        "source_authority_kind": BOOTSTRAP_AUTHORITY_KIND,
        "source_authority_key": "BOOTSTRAP_COMPATIBILITY_BUNDLE_V1",
        "bootstrap_control_sha256": "30B8AD8904E3ADC4942F59D3C7AB7C3D01CC16928BB87FA9509747666E4B4941",
        "total_component_rows": 53981,
        "combined_surface_manifest_sha256": "F2C78A29E43EAAD77AF815AB2723B3ED5202D70384E7145DDF01BCFC2041DE63",
        "components": {
            "GLOBAL_LATEST": {
                "snapshot_date": "2026-07-31",
                "previous_snapshot_date": "2026-07-30",
                "date_vector_sha256": None,
                "universe_count": 1,
                "row_count": 13497,
                "full_row_digest_sha256": "C560F484EA049B56A6251A34FB4C4E39047E24CB2610A0824DADFE114EC92908",
                "component_manifest_sha256": "DED5CE75CCD8B4A36F064AD59D3BF43F7DD1D8CEADD33AD43E9150ED7826DB6C",
            },
            "UNIVERSE_SERVICE": BOOTSTRAP_SERVICE_COMPONENT,
        },
    },
    "BOOTSTRAP_COMPATIBILITY_BUNDLE_V2": {
        "source_authority_kind": BOOTSTRAP_AUTHORITY_KIND,
        "source_authority_key": "BOOTSTRAP_COMPATIBILITY_BUNDLE_V2",
        "bootstrap_control_sha256": "F8C42997F5220DFB3E61405AAAC2F79D139028E87B69C5F8CA6933354D0E8875",
        "total_component_rows": 53981,
        "combined_surface_manifest_sha256": "D59ED800AD9E99F409E21AA57BFFDFE2D66F2971C2C4C622186A1844A6C3C1BD",
        "components": {
            "GLOBAL_LATEST": {
                "snapshot_date": "2026-08-26",
                "previous_snapshot_date": "2026-08-25",
                "date_vector_sha256": None,
                "universe_count": 1,
                "row_count": 13497,
                "full_row_digest_sha256": "E62394980D8A76FBEEAC8CDE7EED176934CE7280B7732ED4A4007B29E82B5FCB",
                "component_manifest_sha256": "B7B2305831883D5018EECD5B557738C1741B0D6BD2392E18D319466507C5FF82",
            },
            "UNIVERSE_SERVICE": BOOTSTRAP_SERVICE_COMPONENT,
        },
    },
}

# Historical aliases remain V1-only so existing consumers do not silently
# reinterpret a V1 control as a branch selector.
EXPECTED_BOOTSTRAP = EXPECTED_BOOTSTRAP_BY_AUTHORITY[
    "BOOTSTRAP_COMPATIBILITY_BUNDLE_V1"
]["components"]
EXPECTED_BOOTSTRAP_COMBINED = EXPECTED_BOOTSTRAP_BY_AUTHORITY[
    "BOOTSTRAP_COMPATIBILITY_BUNDLE_V1"
]["combined_surface_manifest_sha256"]


class SemanticError(ValueError):
    pass


class SchemaViolation(ValueError):
    pass


def canonical_json(value: object) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    )


def sha256_json(value: object) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest().upper()


def component_manifest(component: Mapping[str, Any]) -> str:
    return sha256_json(
        {
            "date_vector_sha256": component["date_vector_sha256"],
            "full_row_digest_sha256": component["full_row_digest_sha256"],
            "row_count": component["row_count"],
            "snapshot_date": component["snapshot_date"],
            "surface_code": component["surface_code"],
            "universe_count": component["universe_count"],
        }
    )


def validate_component_manifests(
    components: Mapping[str, Mapping[str, Any]], combined_sha256: object
) -> None:
    material: list[dict[str, Any]] = []
    for code in sorted(components):
        component = components[code]
        require(
            component.get("component_manifest_sha256")
            == component_manifest(component),
            f"{code} component manifest is not recomputed from its fields",
        )
        material.append(
            {
                "date_vector_sha256": component["date_vector_sha256"],
                "full_row_digest_sha256": component["full_row_digest_sha256"],
                "row_count": component["row_count"],
                "snapshot_date": component["snapshot_date"],
                "surface_code": component["surface_code"],
                "universe_count": component["universe_count"],
            }
        )
    require(
        combined_sha256 == sha256_json(material),
        "combined surface manifest is not recomputed from both components",
    )


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SemanticError(message)


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SemanticError(f"cannot load JSON {path.name}: {exc}") from exc


def _json_type_matches(value: Any, expected: str) -> bool:
    if expected == "null":
        return value is None
    if expected == "object":
        return isinstance(value, dict)
    if expected == "array":
        return isinstance(value, list)
    if expected == "string":
        return isinstance(value, str)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    raise SchemaViolation(f"unsupported JSON Schema type {expected}")


def _resolve_ref(root: Mapping[str, Any], ref: str) -> Any:
    if not ref.startswith("#/"):
        raise SchemaViolation(f"only local JSON Schema refs are supported: {ref}")
    value: Any = root
    for raw in ref[2:].split("/"):
        key = raw.replace("~1", "/").replace("~0", "~")
        if not isinstance(value, dict) or key not in value:
            raise SchemaViolation(f"unresolved JSON Schema ref: {ref}")
        value = value[key]
    return value


def _stdlib_schema_validate(
    value: Any,
    schema: Any,
    root: Mapping[str, Any],
    path: str = "$",
) -> None:
    if isinstance(schema, bool):
        if not schema:
            raise SchemaViolation(f"{path}: false schema")
        return
    if not isinstance(schema, dict):
        raise SchemaViolation(f"{path}: schema node must be an object or boolean")

    if "$ref" in schema:
        _stdlib_schema_validate(value, _resolve_ref(root, schema["$ref"]), root, path)

    for member in schema.get("allOf", []):
        _stdlib_schema_validate(value, member, root, path)

    if "oneOf" in schema:
        matches = 0
        last_error: Exception | None = None
        for member in schema["oneOf"]:
            try:
                _stdlib_schema_validate(value, member, root, path)
                matches += 1
            except SchemaViolation as exc:
                last_error = exc
        if matches != 1:
            detail = f"; last mismatch: {last_error}" if last_error else ""
            raise SchemaViolation(f"{path}: oneOf matched {matches} branches{detail}")

    if "if" in schema:
        try:
            _stdlib_schema_validate(value, schema["if"], root, path)
            conditional_match = True
        except SchemaViolation:
            conditional_match = False
        if conditional_match and "then" in schema:
            _stdlib_schema_validate(value, schema["then"], root, path)
        if not conditional_match and "else" in schema:
            _stdlib_schema_validate(value, schema["else"], root, path)

    if "type" in schema:
        expected_types = schema["type"]
        if isinstance(expected_types, str):
            expected_types = [expected_types]
        if not any(_json_type_matches(value, item) for item in expected_types):
            raise SchemaViolation(f"{path}: expected type {schema['type']}")

    if "const" in schema and value != schema["const"]:
        raise SchemaViolation(f"{path}: value differs from const")
    if "enum" in schema and value not in schema["enum"]:
        raise SchemaViolation(f"{path}: value is not in enum")

    if isinstance(value, str):
        if len(value) < schema.get("minLength", 0):
            raise SchemaViolation(f"{path}: string is shorter than minLength")
        pattern = schema.get("pattern")
        if pattern is not None and re.search(pattern, value) is None:
            raise SchemaViolation(f"{path}: string does not match pattern")
        format_name = schema.get("format")
        try:
            if format_name == "date":
                if date.fromisoformat(value).isoformat() != value:
                    raise ValueError
            elif format_name == "date-time":
                datetime.fromisoformat(value.replace("Z", "+00:00"))
            elif format_name == "uuid":
                if str(uuid.UUID(value)) != value:
                    raise ValueError
        except ValueError as exc:
            raise SchemaViolation(f"{path}: invalid {format_name} format") from exc

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            raise SchemaViolation(f"{path}: number is below minimum")

    if isinstance(value, list):
        if len(value) < schema.get("minItems", 0):
            raise SchemaViolation(f"{path}: array is shorter than minItems")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            raise SchemaViolation(f"{path}: array is longer than maxItems")
        if schema.get("uniqueItems"):
            encoded = [json.dumps(item, sort_keys=True, separators=(",", ":")) for item in value]
            if len(encoded) != len(set(encoded)):
                raise SchemaViolation(f"{path}: array items are not unique")
        prefix_items = schema.get("prefixItems", [])
        if not isinstance(prefix_items, list):
            raise SchemaViolation(f"{path}: prefixItems must be an array")
        for index, member in enumerate(prefix_items):
            if index >= len(value):
                break
            _stdlib_schema_validate(value[index], member, root, f"{path}[{index}]")
        if "items" in schema:
            for index in range(len(prefix_items), len(value)):
                _stdlib_schema_validate(
                    value[index], schema["items"], root, f"{path}[{index}]"
                )

    if isinstance(value, dict):
        required = schema.get("required", [])
        for key in required:
            if key not in value:
                raise SchemaViolation(f"{path}: missing required property {key}")
        if len(value) < schema.get("minProperties", 0):
            raise SchemaViolation(f"{path}: object has too few properties")
        properties = schema.get("properties", {})
        if not isinstance(properties, dict):
            raise SchemaViolation(f"{path}: properties schema is invalid")
        for key, item in value.items():
            if "propertyNames" in schema:
                _stdlib_schema_validate(key, schema["propertyNames"], root, f"{path}.<key>")
            if key in properties:
                _stdlib_schema_validate(item, properties[key], root, f"{path}.{key}")
            elif schema.get("additionalProperties") is False:
                raise SchemaViolation(f"{path}: unexpected property {key}")
            elif isinstance(schema.get("additionalProperties"), dict):
                _stdlib_schema_validate(
                    item, schema["additionalProperties"], root, f"{path}.{key}"
                )


def validate_schema(document: Any, schema: Any) -> None:
    try:
        from jsonschema import Draft202012Validator, FormatChecker
    except ModuleNotFoundError:
        try:
            require(isinstance(schema, dict), "root JSON Schema must be an object")
            _stdlib_schema_validate(document, schema, schema)
        except SchemaViolation as exc:
            raise SemanticError(f"schema validation failed: {exc}") from exc
    else:
        validator = Draft202012Validator(schema, format_checker=FormatChecker())
        errors = sorted(validator.iter_errors(document), key=lambda item: list(item.path))
        if errors:
            first = errors[0]
            location = ".".join(str(part) for part in first.absolute_path) or "$"
            raise SemanticError(f"schema validation failed at {location}: {first.message}")


def component_map(components: object) -> dict[str, Mapping[str, Any]]:
    require(isinstance(components, list), "surface_components must be an array")
    mapped: dict[str, Mapping[str, Any]] = {}
    for component in components:
        require(isinstance(component, dict), "each surface component must be an object")
        code = component.get("surface_code")
        require(isinstance(code, str), "surface_code must be a string")
        require(code not in mapped, f"duplicate surface component: {code}")
        mapped[code] = component
    require(set(mapped) == {"GLOBAL_LATEST", "UNIVERSE_SERVICE"}, "exactly the two typed surfaces are required")
    return mapped


def bootstrap_authority_record(
    authority_kind: object,
    authority_key: object,
    context: str,
) -> Mapping[str, Any]:
    require(
        authority_kind == BOOTSTRAP_AUTHORITY_KIND,
        f"{context} bootstrap authority kind is not exact",
    )
    require(
        isinstance(authority_key, str)
        and authority_key in EXPECTED_BOOTSTRAP_BY_AUTHORITY,
        f"{context} bootstrap authority key must select exact V1 or V2",
    )
    return EXPECTED_BOOTSTRAP_BY_AUTHORITY[authority_key]


def validate_exact_bootstrap_branch(
    components_value: object,
    total_component_rows: object,
    combined_surface_manifest_sha256: object,
    expected: Mapping[str, Any],
    context: str,
) -> dict[str, Mapping[str, Any]]:
    require(
        isinstance(components_value, list)
        and [item.get("surface_code") for item in components_value if isinstance(item, dict)]
        == ["GLOBAL_LATEST", "UNIVERSE_SERVICE"],
        f"{context} bootstrap surface order is not exact",
    )
    components = component_map(components_value)
    validate_component_manifests(components, combined_surface_manifest_sha256)
    require(
        total_component_rows == expected["total_component_rows"],
        f"{context} bootstrap aggregate mismatch",
    )
    require(
        combined_surface_manifest_sha256
        == expected["combined_surface_manifest_sha256"],
        f"{context} bootstrap combined manifest mismatch",
    )
    for code, expected_component in expected["components"].items():
        component = components[code]
        for key, value in expected_component.items():
            require(
                component.get(key) == value,
                f"{context} bootstrap {code} {key} mismatch",
            )
    require(
        sum(int(item["row_count"]) for item in components.values())
        == expected["total_component_rows"],
        f"{context} bootstrap component rows do not equal the aggregate",
    )
    return components


def compare_prefixed_pairs(mapping: Mapping[str, Any]) -> None:
    expected_keys = [key for key in mapping if key.startswith("expected_")]
    require(expected_keys, "gate evidence contains no expected values")
    for expected_key in expected_keys:
        suffix = expected_key[len("expected_") :]
        actual_key = f"actual_{suffix}"
        require(actual_key in mapping, f"gate evidence is missing {actual_key}")
        require(mapping[expected_key] == mapping[actual_key], f"gate mismatch: {suffix}")
    require(mapping.get("all_expected_actual_equal") is True, "gate equality flag is false")


def validate_event_pointer(
    before: Mapping[str, Any] | None,
    after: Mapping[str, Any],
    event: Mapping[str, Any],
) -> None:
    require(after["event_id"] == event["event_id"], "pointer/event id mismatch")
    require(after["generation_id"] == event["to_generation_id"], "pointer/event target mismatch")
    require(after["publication_version"] == event["publication_version"], "pointer/event version mismatch")
    require(after["published_at"] == event["recorded_at"], "pointer/event timestamp mismatch")
    require(event["publication_version"] == event["expected_previous_version"] + 1, "event version increment is not exact")
    if before is None:
        require(event["expected_previous_version"] == 0, "initial event previous version must be zero")
        require(event["from_generation_id"] is None, "initial event source must be null")
        require(after["previous_generation_id"] is None, "initial pointer previous generation must be null")
    else:
        require(event["expected_previous_version"] == before["publication_version"], "event expected version differs from pointer-before")
        require(event["from_generation_id"] == before["generation_id"], "event source differs from pointer-before")
        require(after["publication_version"] == before["publication_version"] + 1, "pointer version increment is not exact")
        require(after["previous_generation_id"] == before["generation_id"], "pointer previous generation differs from old active")


def validate_initial_seed(document: Mapping[str, Any]) -> None:
    require(document["outcome"] == "SUCCESSFUL_BOOTSTRAP_PUBLICATION", "unexpected initial-seed outcome")
    expected = bootstrap_authority_record(
        document["source_authority_kind"],
        document["source_authority_key"],
        "initial-seed",
    )
    require(
        document["authorization_proof_exact"]
        == "SEPARATE_INITIAL_READ_MODEL_SEED_EXECUTION_APPROVAL",
        "invalid seed authorization proof",
    )
    require(document["affected_universe_codes"] == [], "bootstrap affected universes must be empty")
    expected_hashes = {
        "seed_query_sha256": BOOTSTRAP_SEED_QUERY_SHA256,
        "bootstrap_control_sha256": expected["bootstrap_control_sha256"],
        "service_vector_file_sha256": BOOTSTRAP_SERVICE_VECTOR_FILE_SHA256,
        "service_vector_sha256": BOOTSTRAP_SERVICE_VECTOR_SHA256,
    }
    for key, value in expected_hashes.items():
        require(document[key] == value, f"initial-seed completion {key} mismatch")
    require(document["official_history_rows_written"] == 0, "bootstrap wrote official history")
    require(document["official_snapshot_rows_written"] == 0, "bootstrap wrote official snapshots")
    require(document["pre_post_row_mismatches"] == 0, "bootstrap row mismatch")
    require(document["pre_post_value_mismatches"] == 0, "bootstrap value mismatch")
    require(document["automatic_retry_count"] == 0, "bootstrap retried")
    require(document["cache_mutations"] == 0, "bootstrap mutated a cache")

    validate_exact_bootstrap_branch(
        document["surface_components"],
        document["total_component_rows"],
        document["combined_surface_manifest_sha256"],
        expected,
        "initial-seed",
    )

    require(document["pointer_before"] is None, "initial pointer-before must be null")
    pointer = document["pointer_after"]
    event = document["publish_event"]
    validate_event_pointer(None, pointer, event)
    require(pointer["generation_id"] == document["generation_id"], "seed generation/pointer mismatch")
    require(event["plan_run_id"] == document["plan_run_id"], "seed plan/event mismatch")
    require(event["execution_run_id"] == document["seed_execution_run_id"], "seed execution/event mismatch")


def validate_publication_success(document: Mapping[str, Any]) -> None:
    identity = document["identity"]
    require(
        identity["authorization_proof_exact"]
        == "SEPARATE_EXACT_GENERATION_ATOMIC_PUBLICATION_APPROVAL",
        "invalid publication authorization proof",
    )
    require(date.fromisoformat(identity["target_date"]) > date(2026, 5, 31), "historical 2026-05-31 cannot be auto-published")
    compare_prefixed_pairs(document["gate_counts"])
    candidate = document["candidate_stage"]
    history = document["history"]
    snapshots = document["snapshots"]
    require(candidate["history_row_count"] == history["inserted_rows"], "history differs from candidate stage")
    require(candidate["history_set_sha256"] == history["source_set_sha256"], "history digest differs from candidate stage")
    require(candidate["snapshot_row_count"] == snapshots["total_inserted_rows"], "snapshot count differs from candidate stage")
    require(candidate["snapshot_vector_sha256"] == snapshots["snapshot_vector_sha256"], "snapshot vector differs from candidate stage")

    generation = document["generation"]
    components = component_map(generation["surface_components"])
    validate_component_manifests(
        components, generation["combined_surface_manifest_sha256"]
    )
    require(generation["surface_count"] == 2, "generation surface count is not two")
    require(generation["required_surface_codes"] == ["GLOBAL_LATEST", "UNIVERSE_SERVICE"], "generation surface order mismatch")
    require(sum(int(item["row_count"]) for item in components.values()) == generation["total_component_rows"], "generation aggregate count mismatch")

    activation = document["activation"]
    before = activation["pointer_before"]
    after = activation["pointer_after"]
    event = activation["publish_event"]
    validate_event_pointer(before, after, event)
    require(event["event_type"] == "PUBLISH", "success event must be PUBLISH")
    require(after["generation_id"] == generation["generation_id"], "published generation differs from verified generation")
    require(event["plan_run_id"] == identity["plan_run_id"], "plan/event mismatch")
    require(event["execution_run_id"] == identity["execution_run_id"], "execution/event mismatch")
    started = datetime.fromisoformat(activation["transaction_a_completion_observed_at"].replace("Z", "+00:00"))
    completed = datetime.fromisoformat(activation["transaction_b_completion_observed_at"].replace("Z", "+00:00"))
    require(completed >= started, "Transaction B completed before Transaction A")


def validate_rejection(document: Mapping[str, Any]) -> None:
    rejection = document["rejection"]
    require(rejection["pointer_before"] == rejection["pointer_after"], "rejected publication changed pointer")
    require(rejection["pointer_unchanged"] is True, "rejected pointer equality flag is false")
    require(rejection["automatic_retry_count"] == 0, "rejected publication retried")
    if rejection["phase"] == "TRANSACTION_A":
        require(rejection["transaction_a_committed"] is False, "rejected TxA claims commit")
        require(rejection["retained_inactive_generation"] is None, "rejected TxA retained a generation")
        require(rejection["retained_history_stage_rows"] == 0, "rejected TxA retained history stage")
        require(rejection["retained_snapshot_stage_rows"] == 0, "rejected TxA retained snapshot stage")
    else:
        require(rejection["transaction_a_committed"] is True, "TxB rejection lost TxA provenance")
        require(isinstance(rejection["retained_inactive_generation"], dict), "TxB rejection must identify retained generation")


def validate_rollback(document: Mapping[str, Any]) -> None:
    identity = document["identity"]
    rollback = document["rollback"]
    before = rollback["pointer_before"]
    after = rollback["pointer_after"]
    event = rollback["rollback_event"]
    validate_event_pointer(before, after, event)
    require(event["event_type"] == "ROLLBACK", "rollback event type mismatch")
    require(event["to_generation_id"] == before["previous_generation_id"], "rollback did not select pointer-before previous generation")
    require(after["generation_id"] == before["previous_generation_id"], "rollback pointer target mismatch")
    require(after["previous_generation_id"] == before["generation_id"], "rollback pointer previous mismatch")
    require(
        rollback["original_publish_event_id"] == before["event_id"],
        "rollback original publish event differs from pointer-before",
    )
    require(
        rollback["rollback_execution_run_id"] == event["execution_run_id"],
        "rollback execution/event mismatch",
    )
    require(
        rollback["original_publication_execution_run_id"]
        != rollback["rollback_execution_run_id"],
        "rollback reused the original publication execution id",
    )
    require(
        event["plan_run_id"] == identity["plan_run_id"],
        "rollback plan/event mismatch",
    )
    require(
        event["event_id"] != rollback["original_publish_event_id"],
        "rollback reused the original publish event id",
    )
    target = rollback["target_authority"]
    kind = target.get("authority_kind")
    require(kind in {"SEALED_RANK_INPUT_MANIFEST", "BOOTSTRAP_COMPATIBILITY_BUNDLE"}, "unknown rollback target authority")
    require(target.get("target_generation_id") == after["generation_id"], "rollback authority target/pointer mismatch")
    require(
        target.get("required_surface_codes")
        == ["GLOBAL_LATEST", "UNIVERSE_SERVICE"],
        "rollback target surface order mismatch",
    )
    components = component_map(target.get("surface_components"))
    validate_component_manifests(
        components, target.get("combined_surface_manifest_sha256")
    )
    require(
        sum(int(item["row_count"]) for item in components.values())
        == target.get("total_component_rows"),
        "rollback target component rows do not equal the aggregate",
    )
    if kind == "SEALED_RANK_INPUT_MANIFEST":
        require(
            target.get("target_manifest_revocation_rows") == 0,
            "canonical rollback manifest is revoked",
        )
        require(
            target.get("target_manifest_matches_pointer_after_generation") is True,
            "canonical rollback manifest is not bound to pointer-after",
        )
    else:
        expected = bootstrap_authority_record(
            kind,
            target.get("source_authority_key"),
            "rollback target",
        )
        require(
            target.get("target_bundle_matches_pointer_after_generation") is True,
            "rollback bootstrap bundle is not bound to pointer-after",
        )
        validate_exact_bootstrap_branch(
            target.get("surface_components"),
            target.get("total_component_rows"),
            target.get("combined_surface_manifest_sha256"),
            expected,
            "rollback target",
        )


def validate_publication(document: Mapping[str, Any]) -> None:
    outcome = document["outcome"]
    if outcome == "SUCCESSFUL_PUBLICATION":
        validate_publication_success(document)
    elif outcome == "REJECTED_NO_PUBLICATION":
        validate_rejection(document)
    elif outcome == "PUBLICATION_ROLLED_BACK":
        validate_rollback(document)
    else:
        raise SemanticError(f"unsupported publication outcome: {outcome}")


def validate_document(mode: str, document: object) -> None:
    require(mode in MODES, f"unsupported validation mode: {mode}")
    require(isinstance(document, dict), "result must be a JSON object")
    schema = load_json(MODES[mode])
    validate_schema(document, schema)
    if mode == "INITIAL_SEED_RESULT":
        validate_initial_seed(document)
    else:
        validate_publication(document)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=sorted(MODES), required=True)
    parser.add_argument("--result", type=Path, required=True)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        document = load_json(args.result)
        validate_document(args.mode, document)
        print(f"PASS_{args.mode}_SCHEMA_AND_SEMANTICS")
        return 0
    except SemanticError as exc:
        print(f"FAIL_{args.mode}: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
