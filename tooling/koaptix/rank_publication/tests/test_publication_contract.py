from __future__ import annotations

import copy
import hashlib
import importlib.util
import json
import re
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REPO = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT))

import run_initial_seed
import run_publication
import validate_publication_result


UUID_A = "11111111-1111-4111-8111-111111111111"
UUID_B = "22222222-2222-4222-8222-222222222222"

PRIMARY_DEFINITION_PROFILE = "PRIMARY_PRODUCTION"
COMPATIBILITY_DEFINITION_PROFILE = "SANITIZED_SCHEMA_ONLY_COMMENT_OMISSION_V1"
AUDITED_COMPATIBILITY_COMMENT = "  -- 임시로 기록 기능 생략(의존성 제거)"
AUDITED_COMPATIBILITY_COMMENT_SHA256 = (
    "FB7F69E60E6FA5E5192CA08FE1E060814D8FA8D4B51C1EA0A9B6962727FE7F77"
)
AUDITED_COMMENT_SET_SHA256 = (
    "A8E86FDC0E23B7ECE7E5F88F7FC53865A14D1F7D7C7BB9A7033B9AA51582230F"
)


def canonicalize_routine_definition(raw: bytes) -> str:
    """Reference implementation of the migration-900 primary byte contract."""
    text = raw.decode("utf-8", errors="strict")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = [line.rstrip(" \t") for line in text.split("\n")]
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines) + "\n"


def definition_sha256(raw: bytes) -> str:
    canonical = canonicalize_routine_definition(raw)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest().upper()


def selected_definition_matches(
    raw: bytes,
    *,
    profile: str,
    primary_sha256: str,
    compatibility_sha256: str | None = None,
) -> bool:
    if profile == PRIMARY_DEFINITION_PROFILE:
        selected = primary_sha256
    elif profile == COMPATIBILITY_DEFINITION_PROFILE:
        if compatibility_sha256 is None:
            selected = primary_sha256
        else:
            selected = compatibility_sha256
    else:
        return False
    return definition_sha256(raw) == selected


def structural_identity_sha256(model: dict[str, object]) -> str:
    canonical = json.dumps(
        model, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest().upper()


def valid_publication_packet(action: run_publication.ActionSpec) -> dict[str, object]:
    packet: dict[str, object] = {
        "schema_version": run_publication.PACKET_SCHEMA_VERSION,
        "action": action.action,
        "plan_run_id": "P-APPROVED-PLAN.0",
        "execution_run_id": f"E-{action.action}.0",
        "authorization_proof_exact": run_publication.EXECUTION_PROOFS[action.action],
        "automatic_retry": False,
        "generation_id": UUID_A,
        "target_rank_date": "2026-08-31",
        "input_manifest_run_id": "manifest-2026-08-31",
        "expected_active_generation_id": UUID_B,
        "expected_publication_version": 2,
        "affected_universe_codes": ["KOREA_ALL"],
        "market_cap_set_sha256": "A" * 64,
        "eligibility_set_sha256": "B" * 64,
        "source_set_sha256": "C" * 64,
        "selected_input_sha256": "D" * 64,
        "membership_set_sha256": "E" * 64,
        "affected_universe_set_sha256": "F" * 64,
        **(
            {
                "generated_at": "2026-08-31T00:00:00Z",
                "verified_at": "2026-08-31T00:00:01Z",
                "required_surface_codes": ["GLOBAL_LATEST", "UNIVERSE_SERVICE"],
                "surface_components": [],
                "service_universes": [],
                "service_rows": [],
                "global_rows": [],
                "combined_surface_manifest_sha256": "0" * 64,
                "history_stage_rows": [],
                "snapshot_stage_rows": [],
            }
            if action == run_publication.BUILD
            else {
                "event_id": "33333333-3333-4333-8333-333333333333",
                "recorded_at": "2026-08-31T00:00:02Z",
            }
        ),
    }
    if action == run_publication.BUILD:
        service_row = {
            "snapshot_date": "2026-08-31",
            "universe_code": "KOREA_ALL",
            "universe_name": "Korea",
            "universe_scope": "NATIONWIDE",
            "complex_id": 1,
            "apt_name_ko": "fixture",
            "sigungu_name": "fixture",
            "legal_dong_name": "fixture",
            "build_year": 2020,
            "household_count": 100,
            "total_household_count": 100,
            "recovery_52w": "1.0",
            "rank_all": 1,
            "previous_rank_all": 1,
            "rank_delta_w": 0,
            "rank_movement": "SAME",
            "market_cap_krw": 1000,
            "market_cap_trillion_krw": 1,
            "market_cap_share": 1,
            "market_cap_share_pct": 1,
            "tier_code": "T1",
            "tier_label": "Tier 1",
            "tier_sort": 1,
            "is_top1000": True,
            "source_previous_snapshot_date": "2026-08-30",
            "generated_at": "2026-08-31T00:00:00Z",
            "refresh_run_id": "fixture-refresh",
        }
        global_row = {
            "snapshot_date": "2026-08-31",
            "universe_code": "KOREA_ALL",
            "complex_id": 1,
            "apt_name_ko": "fixture",
            "address_road": "fixture",
            "address_jibun": "fixture",
            "legal_dong_name": "fixture",
            "build_year": 2020,
            "sigungu_code": "00000",
            "sigungu_name": "fixture",
            "rank_all": 1,
            "tier_code": "T1",
            "tier_label": "Tier 1",
            "tier_sort": 1,
            "market_cap_krw": 1000,
            "market_cap_trillion_krw": 1,
            "market_cap_share": 1,
            "market_cap_share_pct": 1,
            "previous_rank_all": 1,
            "rank_delta_1d": 0,
            "rank_movement": "SAME",
            "is_top1000": True,
            "total_household_count": 100,
            "household_count": 100,
            "priced_household_count": 100,
            "priced_household_ratio": 1,
            "total_cluster_count": 1,
            "priced_cluster_count": 1,
            "coverage_status": "FULL",
            "is_rank_eligible": True,
            "eligibility_status": "ELIGIBLE",
            "latitude": 1,
            "longitude": 1,
            "recovery_52w": "1.0",
        }
        service_digest = run_publication._row_digest(
            [service_row],
            run_publication.SERVICE_DIGEST_KEYS,
            run_publication.SERVICE_NUMERIC_TEXT_KEYS,
        )
        global_digest = run_publication._row_digest(
            [global_row],
            run_publication.GLOBAL_ROW_KEYS,
            run_publication.GLOBAL_NUMERIC_TEXT_KEYS,
        )
        vector = [
            {
                "max_rank": 1,
                "min_rank": 1,
                "previous_date": "2026-08-30",
                "row_count": 1,
                "snapshot_date": "2026-08-31",
                "universe_code": "KOREA_ALL",
            }
        ]
        components = [
            {
                "surface_code": "GLOBAL_LATEST",
                "snapshot_date": "2026-08-31",
                "previous_snapshot_date": "2026-08-30",
                "date_vector_sha256": None,
                "universe_count": 1,
                "row_count": 1,
                "full_row_digest_sha256": global_digest,
            },
            {
                "surface_code": "UNIVERSE_SERVICE",
                "snapshot_date": "2026-08-31",
                "previous_snapshot_date": "2026-08-30",
                "date_vector_sha256": run_publication.sha256_json(vector),
                "universe_count": 1,
                "row_count": 1,
                "full_row_digest_sha256": service_digest,
            },
        ]
        for component in components:
            component["component_manifest_sha256"] = (
                run_publication._component_manifest(component)
            )
        packet.update(
            {
                "surface_components": components,
                "service_universes": [
                    {
                        "universe_code": "KOREA_ALL",
                        "snapshot_date": "2026-08-31",
                        "previous_snapshot_date": "2026-08-30",
                        "expected_row_count": 1,
                        "row_digest_sha256": service_digest,
                    }
                ],
                "service_rows": [service_row],
                "global_rows": [global_row],
                "combined_surface_manifest_sha256": (
                    run_publication._combined_surface_manifest(components)
                ),
                "history_stage_rows": [
                    {
                        "snapshot_date": "2026-08-31",
                        "complex_id": 1,
                        "market_cap_krw": 1000,
                        "rank_all": 1,
                        "total_market_cap": 1000,
                    }
                ],
                "snapshot_stage_rows": [
                    {
                        "snapshot_date": "2026-08-31",
                        "universe_code": "KOREA_ALL",
                        "complex_id": 1,
                        "rank_all": 1,
                        "market_cap_krw": 1000,
                        "market_cap_share": 1,
                        "previous_rank_all": 1,
                        "rank_delta_1d": 0,
                        "is_top1000": True,
                        "rank_method": "CANONICAL",
                        "calculation_version": "v1",
                        "created_at": "2026-08-31T00:00:00Z",
                    }
                ],
            }
        )
    return packet


def exact_build_result(packet: dict[str, object]) -> dict[str, object]:
    controls = run_publication.validate_generation_inputs(packet)
    return {
        "action": run_publication.BUILD.action,
        "outcome": "VERIFIED_INACTIVE",
        "generation_id": packet["generation_id"],
        "expected_active_generation_id": packet["expected_active_generation_id"],
        "expected_publication_version": packet["expected_publication_version"],
        "history_stage_rows": controls["history_stage_row_count"],
        "snapshot_stage_rows": controls["snapshot_stage_row_count"],
        "verification": {
            "generation_id": packet["generation_id"],
            "surface_count": 2,
            "total_component_row_count": sum(
                component["row_count"]
                for component in packet["surface_components"]
            ),
            "combined_surface_manifest_sha256": packet[
                "combined_surface_manifest_sha256"
            ],
            "surface_components": packet["surface_components"],
            "verified": True,
        },
        "official_history_rows_written": 0,
        "official_snapshot_rows_written": 0,
        "publication_events_written": 0,
        "pointer_rows_changed": 0,
        "automatic_retry_count": 0,
    }


def exact_publish_result(packet: dict[str, object]) -> dict[str, object]:
    return {
        "action": run_publication.PUBLISH.action,
        "outcome": "PUBLISHED",
        "generation_id": packet["generation_id"],
        "event_id": packet["event_id"],
        "publication_version": packet["expected_publication_version"] + 1,
        "active_generation_id": packet["generation_id"],
        "previous_generation_id": packet["expected_active_generation_id"],
        "published_at": packet["recorded_at"],
        "official_history_rows_written": 1,
        "official_snapshot_rows_written": 1,
        "pointer_rows_changed": 1,
        "automatic_retry_count": 0,
    }


def exact_seed_result() -> dict[str, object]:
    return {
        "action": run_initial_seed.SEED.action,
        "outcome": "PUBLISHED",
        "generation_id": UUID_A,
        "event_id": UUID_B,
        "publication_version": 1,
        "active_generation_id": UUID_A,
        "previous_generation_id": None,
        "published_at": "2026-08-01T00:00:00Z",
        "surface_count": 2,
        "total_component_rows": 53981,
        "combined_surface_manifest_sha256": (
            run_initial_seed.EXPECTED["combined_surface_manifest_sha256"]
        ),
        "official_history_rows_written": 0,
        "official_snapshot_rows_written": 0,
        "automatic_retry_count": 0,
    }


def valid_initial_seed_result() -> dict[str, object]:
    recorded = "2026-08-01T00:00:00Z"
    components = []
    for code in ("GLOBAL_LATEST", "UNIVERSE_SERVICE"):
        components.append(
            {
                "surface_code": code,
                **validate_publication_result.EXPECTED_BOOTSTRAP[code],
            }
        )
    return {
        "outcome": "SUCCESSFUL_BOOTSTRAP_PUBLICATION",
        "plan_run_id": "P-BOOTSTRAP.0",
        "seed_execution_run_id": "E-BOOTSTRAP.0",
        "generation_id": UUID_A,
        "authorization_proof_exact": (
            "SEPARATE_INITIAL_READ_MODEL_SEED_EXECUTION_APPROVAL"
        ),
        "source_authority_kind": "BOOTSTRAP_COMPATIBILITY_BUNDLE",
        "source_authority_key": "BOOTSTRAP_COMPATIBILITY_BUNDLE_V1",
        "affected_universe_codes": [],
        "surface_components": components,
        "total_component_rows": 53981,
        "combined_surface_manifest_sha256": validate_publication_result.EXPECTED_BOOTSTRAP_COMBINED,
        "official_history_rows_written": 0,
        "official_snapshot_rows_written": 0,
        "pre_post_row_mismatches": 0,
        "pre_post_value_mismatches": 0,
        "pointer_before": None,
        "pointer_after": {
            "generation_id": UUID_A,
            "previous_generation_id": None,
            "event_id": UUID_B,
            "publication_version": 1,
            "published_at": recorded,
        },
        "publish_event": {
            "event_id": UUID_B,
            "event_type": "PUBLISH",
            "from_generation_id": None,
            "to_generation_id": UUID_A,
            "plan_run_id": "P-BOOTSTRAP.0",
            "execution_run_id": "E-BOOTSTRAP.0",
            "expected_previous_version": 0,
            "publication_version": 1,
            "recorded_at": recorded,
        },
        "automatic_retry_count": 0,
        "smoke_status": "PASS",
        "cache_mutations": 0,
    }


class FakeCursor:
    def __init__(self, row: tuple[object, ...] | None = ({"status": "ok"},)) -> None:
        self.row = row
        self.executed: list[tuple[str, object | None]] = []
        self.fetch_count = 0
        self.closed = False

    def execute(self, query: str, params: object | None = None) -> None:
        self.executed.append((query, params))

    def fetchone(self) -> tuple[object, ...] | None:
        self.fetch_count += 1
        return self.row if self.fetch_count == 1 else None

    def close(self) -> None:
        self.closed = True


class FakeConnection:
    def __init__(self, cursor: FakeCursor | None = None) -> None:
        self.fake_cursor = cursor or FakeCursor()
        self.commits = 0
        self.rollbacks = 0
        self.closed = False

    def cursor(self) -> FakeCursor:
        return self.fake_cursor

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1

    def close(self) -> None:
        self.closed = True


class PublicationRunnerContractTests(unittest.TestCase):
    def test_action_queries_are_one_typed_select_each(self) -> None:
        specs = [
            run_publication.BUILD,
            run_publication.PUBLISH,
            run_initial_seed.SEED,
            run_publication.ActionSpec(
                "ROLLBACK_PUBLICATION",
                "koaptix_rank_publication_rollback",
                "rollback_publication_pointer.sql",
                "public.koaptix_rollback_latest_board_publication",
            ),
        ]
        for spec in specs:
            with self.subTest(spec=spec.action):
                query = run_publication.load_typed_action_query(spec)
                self.assertIn("%(packet)s::jsonb", query)

    def test_action_queries_have_no_client_side_write_or_second_statement(self) -> None:
        specs = [
            run_publication.BUILD,
            run_publication.PUBLISH,
            run_initial_seed.SEED,
            run_publication.ActionSpec(
                "ROLLBACK_PUBLICATION",
                "koaptix_rank_publication_rollback",
                "rollback_publication_pointer.sql",
                "public.koaptix_rollback_latest_board_publication",
            ),
        ]
        forbidden = re.compile(
            r"\b(insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|call)\b",
            re.IGNORECASE,
        )
        for spec in specs:
            with self.subTest(spec=spec.action):
                query = run_publication.load_typed_action_query(spec)
                executable = "\n".join(
                    line
                    for line in query.splitlines()
                    if not line.lstrip().startswith("--")
                ).strip()
                self.assertTrue(executable.lower().startswith("select "))
                self.assertEqual(executable.count(";"), 1)
                self.assertIsNone(forbidden.search(executable))

    def test_publication_packet_rejects_historical_date(self) -> None:
        packet = valid_publication_packet(run_publication.BUILD)
        packet["target_rank_date"] = "2026-05-31"
        with self.assertRaisesRegex(run_publication.ContractError, "historical"):
            run_publication.validate_publication_packet(packet, run_publication.BUILD)

    def test_publication_packet_rejects_implementation_approval(self) -> None:
        packet = valid_publication_packet(run_publication.BUILD)
        packet["authorization_proof_exact"] = run_publication.IMPLEMENTATION_APPROVAL
        with self.assertRaisesRegex(run_publication.ContractError, "not approved"):
            run_publication.validate_publication_packet(packet, run_publication.BUILD)

    def test_publication_packet_rejects_retry_and_partial_universe(self) -> None:
        packet = valid_publication_packet(run_publication.PUBLISH)
        packet["automatic_retry"] = True
        with self.assertRaisesRegex(run_publication.ContractError, "false"):
            run_publication.validate_publication_packet(packet, run_publication.PUBLISH)
        packet["automatic_retry"] = False
        packet["affected_universe_codes"] = []
        with self.assertRaisesRegex(run_publication.ContractError, "nonempty"):
            run_publication.validate_publication_packet(packet, run_publication.PUBLISH)

    def test_serializable_action_commits_once_without_retry(self) -> None:
        packet = valid_publication_packet(run_publication.BUILD)
        database_result = exact_build_result(packet)
        connection = FakeConnection(FakeCursor((database_result,)))
        result = run_publication.execute_serializable_action(
            connection,
            run_publication.BUILD,
            packet,
            lambda value: run_publication.validate_build_action_result(value, packet),
        )
        self.assertEqual(result, database_result)
        self.assertEqual(connection.commits, 1)
        self.assertEqual(connection.rollbacks, 0)
        self.assertIn("SERIALIZABLE", connection.fake_cursor.executed[0][0])
        self.assertIn("SET LOCAL ROLE", connection.fake_cursor.executed[1][0])
        self.assertEqual(len(connection.fake_cursor.executed), 3)

    def test_serializable_action_rolls_back_and_propagates(self) -> None:
        class FailingCursor(FakeCursor):
            def execute(self, query: str, params: object | None = None) -> None:
                super().execute(query, params)
                if "koaptix_build_rank_publication_generation" in query:
                    raise RuntimeError("injected failure")

        connection = FakeConnection(FailingCursor())
        with self.assertRaisesRegex(RuntimeError, "injected"):
            run_publication.execute_serializable_action(
                connection,
                run_publication.BUILD,
                valid_publication_packet(run_publication.BUILD),
                lambda value: dict(value),
            )
        self.assertEqual(connection.commits, 0)
        self.assertEqual(connection.rollbacks, 1)

    def test_arbitrary_one_column_jsonb_rolls_back_before_commit(self) -> None:
        packet = valid_publication_packet(run_publication.BUILD)
        connection = FakeConnection(FakeCursor(({"status": "ok"},)))
        with self.assertRaisesRegex(run_publication.ContractError, "exact key mismatch"):
            run_publication.execute_serializable_action(
                connection,
                run_publication.BUILD,
                packet,
                lambda value: run_publication.validate_build_action_result(
                    value, packet
                ),
            )
        self.assertEqual(connection.commits, 0)
        self.assertEqual(connection.rollbacks, 1)
        self.assertTrue(connection.fake_cursor.closed)

    def test_exact_publish_and_seed_database_result_fixtures(self) -> None:
        publish_packet = valid_publication_packet(run_publication.PUBLISH)
        publish_result = exact_publish_result(publish_packet)
        transaction_a_evidence = {
            "transaction_a": {"history_stage_rows": 1, "snapshot_stage_rows": 1}
        }
        completion = {
            "activation": {
                "pointer_after": {
                    "event_id": publish_packet["event_id"],
                    "generation_id": publish_packet["generation_id"],
                    "published_at": publish_packet["recorded_at"],
                }
            }
        }
        self.assertEqual(
            run_publication.validate_publish_action_result(
                publish_result,
                publish_packet,
                transaction_a_evidence,
                completion,
            ),
            publish_result,
        )

        seed_result = exact_seed_result()
        seed_packet = {
            "generation_id": UUID_A,
            "event_id": UUID_B,
            "recorded_at": "2026-08-01T00:00:00Z",
        }
        seed_completion = valid_initial_seed_result()
        self.assertEqual(
            run_initial_seed.validate_seed_action_result(
                seed_result, seed_packet, seed_completion
            ),
            seed_result,
        )

    def test_runner_source_has_no_retry_loop(self) -> None:
        source = (ROOT / "run_publication.py").read_text(encoding="utf-8")
        self.assertNotIn("for attempt", source)
        self.assertNotIn("while True", source)
        self.assertNotIn("time.sleep", source)


class BootstrapAndResultContractTests(unittest.TestCase):
    def test_bootstrap_controls_are_exact_and_aggregate_is_not_component(self) -> None:
        bundle, vector = run_initial_seed.load_and_verify_controls()
        self.assertEqual(len(vector["rows"]), 225)
        self.assertEqual(bundle["surface_count"], 2)
        self.assertEqual([row["row_count"] for row in bundle["components"]], [13497, 40484])
        self.assertNotIn(53981, [row["row_count"] for row in bundle["components"]])

    def test_bootstrap_vector_is_closed_sorted_and_digest_bound(self) -> None:
        bundle, vector = run_initial_seed.load_and_verify_controls()
        rows = vector["rows"]
        codes = [row["universe_code"] for row in rows]
        self.assertEqual(codes, sorted(codes))
        self.assertEqual(len(codes), len(set(codes)))
        self.assertEqual(sum(row["row_count"] for row in rows), 40484)
        self.assertTrue(all(row["min_rank"] == 1 for row in rows))
        self.assertTrue(all(row["max_rank"] == row["row_count"] for row in rows))
        digest = hashlib.sha256(
            run_publication.canonical_json(rows).encode("utf-8")
        ).hexdigest().upper()
        self.assertEqual(digest, run_initial_seed.EXPECTED["vector_sha256"])
        components = {
            item["surface_code"]: item for item in bundle["components"]
        }
        self.assertEqual(
            components["GLOBAL_LATEST"]["previous_snapshot_date"], "2026-07-30"
        )
        self.assertIsNone(
            components["UNIVERSE_SERVICE"]["previous_snapshot_date"]
        )
        for code, expected in validate_publication_result.EXPECTED_BOOTSTRAP.items():
            for key, value in expected.items():
                self.assertEqual(components[code][key], value)

    def test_initial_result_requires_schema_and_semantic_equality(self) -> None:
        result = valid_initial_seed_result()
        validate_publication_result.validate_document("INITIAL_SEED_RESULT", result)
        changed = copy.deepcopy(result)
        changed["surface_components"][0]["row_count"] = 13496
        with self.assertRaisesRegex(
            validate_publication_result.SemanticError, "component manifest"
        ):
            validate_publication_result.validate_document("INITIAL_SEED_RESULT", changed)

    def test_initial_result_binds_event_pointer_and_generation(self) -> None:
        for mutation, message in (
            (
                lambda value: value["pointer_after"].__setitem__(
                    "event_id", "33333333-3333-4333-8333-333333333333"
                ),
                "pointer/event id mismatch",
            ),
            (
                lambda value: value["publish_event"].__setitem__(
                    "to_generation_id", UUID_B
                ),
                "pointer/event target mismatch",
            ),
            (
                lambda value: value.__setitem__("generation_id", UUID_B),
                "seed generation/pointer mismatch",
            ),
        ):
            changed = copy.deepcopy(valid_initial_seed_result())
            mutation(changed)
            with self.subTest(message=message):
                with self.assertRaisesRegex(
                    validate_publication_result.SemanticError, message
                ):
                    validate_publication_result.validate_document(
                        "INITIAL_SEED_RESULT", changed
                    )

    def test_operational_action_schema_binds_role_to_one_query(self) -> None:
        schema = json.loads(
            (ROOT / "operational_role_action_packet_schema.json").read_text(
                encoding="utf-8"
            )
        )
        packet = {
            "schema_version": 1,
            "plan_run_id": "P.0",
            "execution_run_id": "E.0",
            "authorization_proof_exact": "AUTHORIZE_BUILD",
            "dedicated_login": "koaptix_rank_action_build_01",
            "connection_limit": 1,
            "backend_count_before": 0,
            "action_role": "koaptix_rank_generation_builder",
            "entrypoint": "public.koaptix_build_rank_publication_generation(jsonb)",
            "query_path": "tooling/koaptix/rank_publication/queries/build_latest_generation.sql",
            "query_sha256": "A" * 64,
            "packet_sha256": "B" * 64,
            "membership_options": {"inherit": False, "set": True, "admin": False},
            "transaction_isolation": "SERIALIZABLE",
            "set_local_role": True,
            "automatic_retry_count": 0,
            "backend_closed": True,
            "membership_revoked": True,
            "post_cleanup": {"member": False, "set": False, "usage": False, "backend_count": 0},
        }
        validate_publication_result.validate_schema(packet, schema)
        packet["query_path"] = "tooling/koaptix/rank_publication/queries/verify_and_publish_generation.sql"
        with self.assertRaises(validate_publication_result.SemanticError):
            validate_publication_result.validate_schema(packet, schema)

    def test_bootstrap_rollback_semantics_use_schema_authority_names(self) -> None:
        before_event_id = "44444444-4444-4444-8444-444444444444"
        rollback_event_id = "33333333-3333-4333-8333-333333333333"
        before = {
            "generation_id": UUID_B,
            "previous_generation_id": UUID_A,
            "event_id": before_event_id,
            "publication_version": 2,
            "published_at": "2026-08-31T00:00:00Z",
        }
        after = {
            "generation_id": UUID_A,
            "previous_generation_id": UUID_B,
            "event_id": rollback_event_id,
            "publication_version": 3,
            "published_at": "2026-08-31T00:01:00Z",
        }
        event = {
            "event_id": rollback_event_id,
            "event_type": "ROLLBACK",
            "from_generation_id": UUID_B,
            "to_generation_id": UUID_A,
            "plan_run_id": "P-ROLLBACK.0",
            "execution_run_id": "E-ROLLBACK.0",
            "expected_previous_version": 2,
            "publication_version": 3,
            "recorded_at": "2026-08-31T00:01:00Z",
        }
        components = [
            {"surface_code": code, **expected}
            for code, expected in validate_publication_result.EXPECTED_BOOTSTRAP.items()
        ]
        document = {
            "identity": {"plan_run_id": "P-ROLLBACK.0"},
            "rollback": {
                "rollback_execution_run_id": "E-ROLLBACK.0",
                "original_publication_execution_run_id": "E-PUBLISH.0",
                "original_publish_event_id": before_event_id,
                "pointer_before": before,
                "pointer_after": after,
                "rollback_event": event,
                "target_authority": {
                    "authority_kind": "BOOTSTRAP_COMPATIBILITY_BUNDLE",
                    "target_generation_id": UUID_A,
                    "source_authority_key": "BOOTSTRAP_COMPATIBILITY_BUNDLE_V1",
                    "required_surface_codes": [
                        "GLOBAL_LATEST",
                        "UNIVERSE_SERVICE",
                    ],
                    "surface_components": components,
                    "total_component_rows": 53981,
                    "combined_surface_manifest_sha256": validate_publication_result.EXPECTED_BOOTSTRAP_COMBINED,
                    "target_bundle_matches_pointer_after_generation": True,
                },
            },
        }
        validate_publication_result.validate_rollback(document)
        changed = copy.deepcopy(document)
        changed["rollback"]["target_authority"]["surface_components"][0][
            "row_count"
        ] -= 1
        changed_target = changed["rollback"]["target_authority"]
        changed_target["surface_components"][0][
            "component_manifest_sha256"
        ] = validate_publication_result.component_manifest(
            changed_target["surface_components"][0]
        )
        changed_target["combined_surface_manifest_sha256"] = (
            run_publication._combined_surface_manifest(
                changed_target["surface_components"]
            )
        )
        with self.assertRaisesRegex(
            validate_publication_result.SemanticError,
            "component rows do not equal the aggregate",
        ):
            validate_publication_result.validate_rollback(changed)


class Migration900DefinitionFingerprintTests(unittest.TestCase):
    def test_primary_canonicalization_accepts_only_raw_formatting_variants(self) -> None:
        canonical = "create function fixture()\nbegin\n  return 1;\nend;\n"
        expected = definition_sha256(canonical.encode("utf-8"))
        variants = {
            "lf": canonical.encode("utf-8"),
            "crlf": canonical.replace("\n", "\r\n").encode("utf-8"),
            "lone_cr": canonical.replace("\n", "\r").encode("utf-8"),
            "trailing_space_tab": (
                "create function fixture() \t\n"
                "begin\t\n"
                "  return 1;  \n"
                "end; \n"
            ).encode("utf-8"),
            "no_final_lf": canonical.rstrip("\n").encode("utf-8"),
            "many_final_lf": (canonical + "\n\n").encode("utf-8"),
        }
        for label, raw in variants.items():
            with self.subTest(label=label):
                self.assertEqual(definition_sha256(raw), expected)
        with self.assertRaises(UnicodeDecodeError):
            canonicalize_routine_definition(b"select '\xff';")

    def test_exact_compatibility_profile_isolated_by_whole_definition_hash(self) -> None:
        primary = (
            "create function public.run_daily_market_pipeline_legacy(date)\n"
            "begin\n"
            f"{AUDITED_COMPATIBILITY_COMMENT}\n"
            "  v_merge := public.merge_market_source_to_master(p_run_date);\n"
            "end;\n"
        ).encode("utf-8")
        compatibility = primary.replace(
            (AUDITED_COMPATIBILITY_COMMENT + "\n").encode("utf-8"), b"", 1
        )
        primary_sha = definition_sha256(primary)
        compatibility_sha = definition_sha256(compatibility)
        self.assertNotEqual(primary_sha, compatibility_sha)
        self.assertTrue(
            selected_definition_matches(
                primary,
                profile=PRIMARY_DEFINITION_PROFILE,
                primary_sha256=primary_sha,
                compatibility_sha256=compatibility_sha,
            )
        )
        self.assertTrue(
            selected_definition_matches(
                compatibility,
                profile=COMPATIBILITY_DEFINITION_PROFILE,
                primary_sha256=primary_sha,
                compatibility_sha256=compatibility_sha,
            )
        )
        self.assertFalse(
            selected_definition_matches(
                primary,
                profile=COMPATIBILITY_DEFINITION_PROFILE,
                primary_sha256=primary_sha,
                compatibility_sha256=compatibility_sha,
            )
        )
        self.assertFalse(
            selected_definition_matches(
                compatibility,
                profile=PRIMARY_DEFINITION_PROFILE,
                primary_sha256=primary_sha,
                compatibility_sha256=compatibility_sha,
            )
        )
        self.assertFalse(
            selected_definition_matches(
                primary,
                profile="UNRECOGNIZED_PROFILE",
                primary_sha256=primary_sha,
                compatibility_sha256=compatibility_sha,
            )
        )

    def test_audited_comment_identity_and_context_are_exact(self) -> None:
        self.assertEqual(
            hashlib.sha256(AUDITED_COMPATIBILITY_COMMENT.encode("utf-8"))
            .hexdigest()
            .upper(),
            AUDITED_COMPATIBILITY_COMMENT_SHA256,
        )
        primary = (
            "create function fixture()\n"
            "begin\n"
            f"{AUDITED_COMPATIBILITY_COMMENT}\n"
            "  v_merge := public.merge_market_source_to_master(p_run_date);\n"
            "end;\n"
        ).encode("utf-8")
        primary_sha = definition_sha256(primary)
        rejected = {
            "unknown_full_line_comment": primary.replace(
                b"begin\n", b"begin\n  -- unknown\n", 1
            ),
            "inline_comment": primary.replace(b"begin\n", b"begin -- changed\n", 1),
            "block_comment": primary.replace(b"begin\n", b"begin\n  /* changed */\n", 1),
            "duplicate_audited_line": primary.replace(
                (AUDITED_COMPATIBILITY_COMMENT + "\n").encode("utf-8"),
                (AUDITED_COMPATIBILITY_COMMENT + "\n" + AUDITED_COMPATIBILITY_COMMENT + "\n").encode("utf-8"),
                1,
            ),
            "moved_audited_line": primary.replace(
                (
                    AUDITED_COMPATIBILITY_COMMENT
                    + "\n  v_merge := public.merge_market_source_to_master(p_run_date);"
                ).encode("utf-8"),
                (
                    "  v_merge := public.merge_market_source_to_master(p_run_date);\n"
                    + AUDITED_COMPATIBILITY_COMMENT
                ).encode("utf-8"),
                1,
            ),
            "modified_audited_line": primary.replace(
                "생략".encode("utf-8"), "제외".encode("utf-8"), 1
            ),
            "different_context": primary.replace(
                b"public.merge_market_source_to_master", b"public.other_callee", 1
            ),
        }
        for label, raw in rejected.items():
            with self.subTest(label=label):
                self.assertNotEqual(definition_sha256(raw), primary_sha)

    def test_meaningful_body_changes_never_canonicalize_away(self) -> None:
        base = (
            "create function public.fixture(p_ok boolean) returns void\n"
            "language plpgsql security definer set search_path=public\n"
            "as $body$\n"
            "begin\n"
            "  if p_ok then\n"
            "    insert into public.target_a(id) values (1);\n"
            "    perform public.callee_a();\n"
            "    execute 'update public.dynamic_a set value=1';\n"
            "    raise notice 'quoted -- value';\n"
            "  end if;\n"
            "exception when no_data_found then\n"
            "  return;\n"
            "end;\n"
            "$body$;\n"
        )
        base_sha = definition_sha256(base.encode("utf-8"))
        mutations = {
            "quoted_dash_text": base.replace("quoted -- value", "quoted -- changed"),
            "sql_token": base.replace("values (1)", "values (2)"),
            "mutation_target": base.replace("target_a", "target_b"),
            "called_routine": base.replace("callee_a", "callee_b"),
            "condition": base.replace("if p_ok then", "if not p_ok then"),
            "exception": base.replace("no_data_found", "others"),
            "dynamic_sql": base.replace("dynamic_a", "dynamic_b"),
            "writer_removed": base.replace(
                "    insert into public.target_a(id) values (1);\n", ""
            ),
            "statement_reordered": base.replace(
                "    insert into public.target_a(id) values (1);\n"
                "    perform public.callee_a();",
                "    perform public.callee_a();\n"
                "    insert into public.target_a(id) values (1);",
            ),
        }
        for label, changed in mutations.items():
            with self.subTest(label=label):
                self.assertNotEqual(definition_sha256(changed.encode("utf-8")), base_sha)

    def test_layer_one_structural_and_acl_fields_fail_independently(self) -> None:
        base: dict[str, object] = {
            "routine_identity": "public.fixture(boolean)",
            "routine_kind": "FUNCTION",
            "identity_arguments": "p_ok boolean",
            "owner_contract": "SHARED_PRE900_ROUTINE_OWNER_AT_MIGRATION_START",
            "language": "plpgsql",
            "volatility": "VOLATILE",
            "parallel": "UNSAFE",
            "strict": False,
            "leakproof": False,
            "security_mode": "SECURITY_DEFINER",
            "proconfig": ["search_path=public"],
            "result_type": "void",
            "returns_set": False,
            "catalog_dependencies": [],
            "declared_mutation_targets": ["public.target_a"],
            "declared_protected_callees": ["public.callee_a()"],
            "normalized_nonowner_acl": [],
            "classification": "EXPLICITLY_PROTECTED_BY_EXISTING_900",
        }
        expected = structural_identity_sha256(base)
        mutations: dict[str, object] = {
            "routine_identity": "public.fixture(integer)",
            "routine_kind": "PROCEDURE",
            "identity_arguments": "p_ok integer",
            "owner_contract": "DIFFERENT_OWNER_CLASS",
            "language": "sql",
            "volatility": "STABLE",
            "parallel": "SAFE",
            "strict": True,
            "leakproof": True,
            "security_mode": "SECURITY_INVOKER",
            "proconfig": ["search_path=pg_catalog"],
            "result_type": "integer",
            "returns_set": True,
            "catalog_dependencies": ["ROUTINE:n:public.other()"],
            "declared_mutation_targets": ["public.target_b"],
            "declared_protected_callees": ["public.callee_b()"],
            "normalized_nonowner_acl": [{"grantee": "PUBLIC", "privilege": "EXECUTE"}],
            "classification": "LEXICAL_FALSE_POSITIVE_NONWRITER",
        }
        for field, value in mutations.items():
            with self.subTest(field=field):
                changed = copy.deepcopy(base)
                changed[field] = value
                self.assertNotEqual(structural_identity_sha256(changed), expected)


class SqlDefinitionContractTests(unittest.TestCase):
    def test_migration_900_exact_writer_closure_is_self_contained(self) -> None:
        sql = (
            REPO / "supabase/migrations/202607310900_rank_recovery_roles_and_acl.sql"
        ).read_text(encoding="utf-8")
        lowered = sql.casefold()
        protected = {
            "public.append_daily_rank_history(date)": "function",
            "public.capture_koaptix_daily_snapshot()": "procedure",
            "public.refresh_koaptix_front_views_legacy()": "function",
            "public.refresh_koaptix_latest_rank_board()": "function",
            "public.run_daily_market_pipeline(date)": "function",
            "public.run_daily_market_pipeline_legacy(date)": "function",
            "public.run_koaptix_safe_finalize(date)": "function",
            "public.sync_rank_snapshot_from_history(date)": "function",
        }
        all_candidates = {
            *protected,
            "public.build_koaptix_index_snapshot_stage(text,date,date,text[])",
            "public.merge_market_source_to_master(date)",
            "public.refresh_koaptix_front_views()",
            "public.refresh_koaptix_home_kpi()",
            "public.refresh_koaptix_index_snapshot(date)",
            "public.refresh_koaptix_total_market_cap_history()",
            "public.sync_market_daily_aggregates(date)",
        }
        self.assertEqual(len(all_candidates), 15)
        for identity in all_candidates:
            self.assertIn(identity, lowered)
        for identity, kind in protected.items():
            self.assertRegex(
                lowered,
                rf"revoke\s+execute\s+on\s+{kind}\s+{re.escape(identity)}\s+from\s+public,anon,authenticated,service_role",
            )
        route_values = lowered.split(
            "insert into koaptix_rank_recovery_writer_route_contract (", 1
        )[1].split(
            "update koaptix_rank_recovery_writer_route_contract", 1
        )[0]
        self.assertEqual(route_values.count("'explicitly_protected_by_existing_900'"), 6)
        self.assertEqual(route_values.count("'additional_protected_writer_route'"), 2)
        self.assertEqual(route_values.count("'lexical_false_positive_nonwriter'"), 7)
        self.assertIn("count(*) from koaptix_rank_recovery_writer_route_contract where protected_writer", lowered)
        self.assertIn("pg_catalog.sha256(pg_catalog.convert_to(", lowered)
        self.assertNotIn("md5(pg_catalog.pg_get_functiondef", lowered)
        for marker in (
            "koaptix.migration_900_definition_profile",
            PRIMARY_DEFINITION_PROFILE.casefold(),
            COMPATIBILITY_DEFINITION_PROFILE.casefold(),
            "shared_pre900_routine_owner_at_migration_start",
            "primary_definition_sha256",
            "compatibility_definition_sha256",
            AUDITED_COMPATIBILITY_COMMENT.casefold(),
            AUDITED_COMPATIBILITY_COMMENT_SHA256.casefold(),
            AUDITED_COMMENT_SET_SHA256.casefold(),
            "expected_language",
            "expected_volatility",
            "expected_parallel",
            "expected_strict",
            "expected_leakproof",
            "expected_security_mode",
            "expected_proconfig",
            "expected_result_type",
            "expected_returns_set",
            "expected_catalog_dependencies",
        ):
            self.assertIn(marker, lowered)
        fingerprint_path = lowered.split("-- narrow lexical discovery", 1)[0]
        self.assertNotIn("e'--[^\\n\\r]*'", fingerprint_path)
        self.assertIn("acl.grantee<>proc.proowner", lowered)
        self.assertIn("contract.resolved_oid=candidate.oid", lowered)
        self.assertIn("authority_unresolved: unclassified protected writer candidate", lowered)
        self.assertIn("code_without_single_quoted_literals", lowered)
        self.assertNotIn("direct_or_dynamic_rank_writers", lowered)
        self.assertNotIn("writer_closure(oid)", lowered)
        self.assertNotRegex(lowered, r"\bperform\s+public\.")
        self.assertNotRegex(lowered, r"\bcall\s+public\.")

    def test_migration_900_rollback_uses_exact_dual_acl_authority(self) -> None:
        sql = (ROOT / "rollback/restore_role_acl_900.sql").read_text(
            encoding="utf-8"
        )
        lowered = sql.casefold()
        for authority in (
            "456ecd8f7ca6f9e2791188dc12ee702ecd1c03cef389081781750d264f08611c",
            "96c98452b894aa9623957ca4a7288a7f80d47b4dc28a8a6966f3c9e3d1dccaed",
        ):
            self.assertIn(authority, lowered)
        for marker in (
            "koaptix.migration_900_rollback_authority_sha256",
            "schema_only_default_acl",
            "production_pre900_compatible",
            "missing or unrecognized migration-900 rollback authority sha-256",
            "migration-900 rollback layer-1 structural routine authority drift",
            "migration-900 rollback selected definition profile drift",
            "postrollback routine acl fingerprint differs from selected authority",
            "postrollback relation acl fingerprint differs from selected authority",
            "postrollback column acl fingerprint has an unexpected mutation grant",
            "granted by %i",
        ):
            self.assertIn(marker, lowered)
        self.assertGreaterEqual(lowered.count("except"), 4)
        self.assertIn("primary_definition_sha256", lowered)
        self.assertIn("compatibility_definition_sha256", lowered)
        self.assertIn(COMPATIBILITY_DEFINITION_PROFILE.casefold(), lowered)
        self.assertIn(AUDITED_COMPATIBILITY_COMMENT_SHA256.casefold(), lowered)
        self.assertNotIn("md5(pg_catalog.pg_get_functiondef", lowered)
        self.assertIn(
            "public.capture_koaptix_daily_snapshot()','procedure'", lowered
        )
        self.assertIn(
            "public.refresh_koaptix_front_views_legacy()','function'", lowered
        )
        self.assertNotRegex(lowered, r"\bgrant\s+all\b")
        self.assertNotIn(
            "revoke all on table public.complex_rank_history", lowered
        )
        self.assertNotIn(
            "grant delete,insert,references,select,trigger,truncate,update", lowered
        )

    def test_migration_900_and_rollback_share_two_layer_authority(self) -> None:
        migration = (
            REPO / "supabase/migrations/202607310900_rank_recovery_roles_and_acl.sql"
        ).read_text(encoding="utf-8")
        rollback = (ROOT / "rollback/restore_role_acl_900.sql").read_text(
            encoding="utf-8"
        )

        row_pattern = re.compile(
            r"\(\d+,'(public\.[^']+)','(?:FUNCTION|PROCEDURE)','[^']*','([0-9A-F]{64})',"
        )
        migration_authority = dict(row_pattern.findall(migration))
        rollback_authority = dict(row_pattern.findall(rollback))
        self.assertEqual(len(migration_authority), 15)
        self.assertEqual(rollback_authority, migration_authority)

        canonical_markers = (
            "set local search_path = pg_catalog, pg_temp, public;",
            "E'[ \\t]+(\\n|$)',E'\\\\1','g'",
            "E'\\n*$', ''",
            "pg_catalog.sha256(pg_catalog.convert_to(",
            "SHARED_PRE900_ROUTINE_OWNER_AT_MIGRATION_START",
            "PRIMARY_PRODUCTION_PRESENT__SANITIZED_BASELINE_ABSENT",
            COMPATIBILITY_DEFINITION_PROFILE,
            AUDITED_COMPATIBILITY_COMMENT,
            AUDITED_COMPATIBILITY_COMMENT_SHA256,
            AUDITED_COMMENT_SET_SHA256,
            "ROUTINE:n:public.current_seoul_date()",
        )
        for marker in canonical_markers:
            self.assertIn(marker, migration)
            self.assertIn(marker, rollback)
        for sql in (migration, rollback):
            self.assertGreaterEqual(sql.count("pg_catalog.pg_get_functiondef("), 2)
            postcheck_error = (
                "migration-900 Layer-1 or Layer-2 routine authority changed during migration"
                if sql is migration
                else "postrollback migration-900 Layer-1 or Layer-2 routine authority changed"
            )
            postcheck = sql.split(postcheck_error, 1)[0].rsplit("if exists (", 1)[1]
            self.assertIn(
                "left join pg_catalog.pg_proc proc on proc.oid=contract.resolved_oid",
                postcheck,
            )
            self.assertIn("proc.oid is null", postcheck)
            self.assertIn("observed.routine_identity is null", postcheck)
            self.assertIn("observed.catalog_dependencies", postcheck)
            self.assertIn("from pg_catalog.pg_depend dependency", postcheck)
            self.assertNotIn("md5(pg_catalog.pg_get_functiondef", sql.casefold())
            self.assertNotIn("strip_comment", sql.casefold())
        self.assertNotIn("E'--[^\\n\\r]*'", rollback)
        migration_fingerprint_path = migration.split("-- Narrow lexical discovery", 1)[0]
        self.assertNotIn("E'--[^\\n\\r]*'", migration_fingerprint_path)

    def test_migrations_901_through_905_bytes_remain_locked(self) -> None:
        expected = {
            "202607310901_rank_canonical_input_contract.sql": "816973FB9DC18939F57A2BB5FBE3F7F40FEA234EB6F4B4FBAF1D13E71BDBB22E",
            "202607310902_jeonbuk_45_52_membership.sql": "0248E90C5FA7BC6E3877966954D75D9700BD2DE1550201DB58E842D0BCFB38AF",
            "202607310903_latest_board_atomic_generation.sql": "793BE244C0517F7A5AB951F1C30953C78D36E24973C45939C0BDF64C1D32D84E",
            "202607310904_rank_canonical_publisher_binding.sql": "47CA0933CD69868F414707BDADE171C5FC4D9B761B53370EC689FDBFBF0C81D0",
            "202607310905_home_payload_publication_identity.sql": "D1AB7080E4F8167A89A783BC2236C0F92EE25A1A2AA0DD2E692EA10730BA17DE",
        }
        for name, digest in expected.items():
            actual = hashlib.sha256(
                (REPO / "supabase/migrations" / name).read_bytes()
            ).hexdigest().upper()
            self.assertEqual(actual, digest, name)

    def test_migration_order_and_typed_component_markers(self) -> None:
        migrations = [
            REPO / f"supabase/migrations/20260731090{i}_{suffix}.sql"
            for i, suffix in enumerate(
                (
                    "rank_recovery_roles_and_acl",
                    "rank_canonical_input_contract",
                    "jeonbuk_45_52_membership",
                    "latest_board_atomic_generation",
                    "rank_canonical_publisher_binding",
                    "home_payload_publication_identity",
                )
            )
        ]
        self.assertEqual([path.name[8:12] for path in migrations], ["0900", "0901", "0902", "0903", "0904", "0905"])
        for path in migrations:
            self.assertTrue(path.is_file(), path)
        sql_903 = migrations[3].read_text(encoding="utf-8")
        normalized_sql = sql_903.casefold()
        for marker in (
            "GLOBAL_LATEST",
            "UNIVERSE_SERVICE",
            "FORCE ROW LEVEL SECURITY",
            "DEFERRABLE INITIALLY DEFERRED",
            "koaptix_require_publication_event_pointer_commit",
            "koaptix_guard_latest_board_publication_pointer",
            "koaptix_build_rank_publication_generation",
            "koaptix_publish_latest_board_generation",
            "koaptix_seed_latest_board_compatibility_generation",
            "koaptix_rollback_latest_board_publication",
            "v_koaptix_latest_board_read_model_published",
            "v_koaptix_latest_global_rank_board_published",
            "v_koaptix_latest_board_publication_currentness",
            "v_koaptix_latest_board_publication_summary",
        ):
            self.assertIn(marker.casefold(), normalized_sql)
        self.assertGreaterEqual(normalized_sql.count("security definer"), 10)
        self.assertEqual(normalized_sql.count("force row level security"), 9)
        forced_relations = set(
            re.findall(
                r"alter\s+table\s+public\.([a-z0-9_]+)\s+force\s+row\s+level\s+security\s*;",
                normalized_sql,
            )
        )
        self.assertEqual(
            forced_relations,
            {
                "koaptix_latest_board_generation",
                "koaptix_latest_board_generation_surface",
                "koaptix_latest_board_generation_universe",
                "koaptix_latest_board_generation_row",
                "koaptix_latest_board_generation_global_row",
                "koaptix_rank_publication_history_stage",
                "koaptix_rank_publication_snapshot_stage",
                "koaptix_latest_board_publication_event",
                "koaptix_latest_board_publication",
            },
        )
        self.assertNotIn(
            "format('alter table public.%i force row level security'",
            normalized_sql,
        )
        trigger_names = set(
            re.findall(
                r"create\s+(?:constraint\s+)?trigger\s+([a-z0-9_]+)",
                normalized_sql,
            )
        )
        self.assertEqual(
            trigger_names,
            {
                "trg_koaptix_rank_publication_history_stage_immutable",
                "trg_koaptix_rank_publication_snapshot_stage_immutable",
                "trg_koaptix_latest_board_generation_immutable",
                "trg_koaptix_latest_board_generation_universe_immutable",
                "trg_koaptix_latest_board_generation_surface_immutable",
                "trg_koaptix_latest_board_generation_row_immutable",
                "trg_koaptix_latest_board_generation_global_row_immutable",
                "trg_koaptix_latest_board_publication_event_immutable",
                "trg_koaptix_publication_event_requires_pointer_commit",
                "trg_koaptix_latest_board_publication_guard",
            },
        )
        self.assertRegex(
            normalized_sql,
            r"create\s+constraint\s+trigger\s+trg_koaptix_publication_event_requires_pointer_commit\b",
        )
        self.assertIn("deferrable initially deferred", normalized_sql)
        for marker in (
            "exact immutable verified_inactive idempotent zero-write reuse",
            "idempotent reuse identity collision",
            "idempotent reuse parent collision",
            "idempotent reuse surface collision",
            "idempotent reuse universe collision",
            "idempotent reuse service-row collision",
            "idempotent reuse global-row collision",
            "idempotent reuse history-stage collision",
            "idempotent reuse snapshot-stage collision",
        ):
            self.assertIn(marker, normalized_sql)
        self.assertEqual(normalized_sql.count("jsonb_populate_recordset("), 12)
        self.assertRegex(
            normalized_sql,
            r"g\.generation_id=v_generation_id\s+or g\.run_id=p_packet->>'execution_run_id'[\s\S]*?"
            r"g\.source_authority_kind='sealed_rank_input_manifest'[\s\S]*?"
            r"g\.combined_surface_manifest_sha256",
        )
        self.assertLess(
            normalized_sql.index("for update nowait", normalized_sql.index("koaptix_build_rank_publication_generation")),
            normalized_sql.index("idempotent reuse identity collision"),
        )
        self.assertTrue(normalized_sql.rstrip().endswith("commit;"))

    def test_cutover_encodes_passive_drain_without_wait_or_cache_action(self) -> None:
        sql = (ROOT / "queries/cutover_latest_board_service_view.sql").read_text(
            encoding="utf-8"
        )
        self.assertIn("991", sql)
        self.assertNotIn("pg_sleep", sql.lower())
        self.assertNotIn("cache purge", sql.lower())
        for view in (
            "v_koaptix_latest_universe_rank_board_u",
            "v_koaptix_latest_rank_board",
            "v_koaptix_home_kpi",
            "v_koaptix_complex_detail_sheet",
            "v_koaptix_latest_universe_rank_board",
        ):
            self.assertIn(f"create or replace view public.{view}", sql.lower())
        for isolated in (
            "v_koaptix_home_latest_payload",
            "v_koaptix_home_public_service_payload",
            "v_koaptix_latest_universe_rank_board_u_v2",
        ):
            self.assertRegex(
                sql.lower(),
                rf"revoke\s+all\s+on\s+table\s+public\.{isolated}",
            )
        lowered = sql.lower()
        gate_start = lowered.index(
            "-- independently recompute the dynamic membership board"
        )
        gate_end = lowered.index(
            "global_latest canonical-membership rank/value/share equivalence failed",
            gate_start,
        )
        membership_gate = lowered[gate_start:gate_end]
        self.assertIn("v_koaptix_latest_global_rank_board_published", membership_gate)
        self.assertIn("v_koaptix_universe_membership", membership_gate)
        self.assertIn("expected_projection", membership_gate)
        self.assertGreaterEqual(membership_gate.count("except"), 2)
        self.assertNotIn(
            "v_koaptix_latest_board_read_model_published",
            membership_gate,
        )
        self.assertNotIn(
            "authorized membership delta/current-value equivalence failed",
            lowered,
        )
        for marker in (
            "from pg_catalog.pg_trigger",
            "not t.tgisinternal",
            "(t.tgtype & 64)<>0",
            "has an instead of trigger",
        ):
            self.assertIn(marker, lowered)
        self.assertTrue(sql.rstrip().lower().endswith("commit;"))

    def test_full_predata_rollback_is_guarded_and_complete(self) -> None:
        sql = (
            ROOT / "rollback/restore_pre_execution_definitions.sql"
        ).read_text(encoding="utf-8")
        lowered = sql.lower()
        self.assertIn("full definition rollback is prohibited", lowered)
        self.assertIn("koaptix_rank_input_authority_manifest", lowered)
        self.assertIn("koaptix_latest_board_publication", lowered)
        self.assertIn(
            "set local search_path = pg_catalog, public, pg_temp;",
            lowered,
        )
        for marker in (
            "a.pid<>pg_backend_pid()",
            "a.datname=current_database()",
            "a.backend_type='client backend'",
            "zero other client backends in the current database",
        ):
            self.assertIn(marker, lowered)
        self.assertNotIn("a.usename in (", lowered)
        for view in (
            "v_koaptix_latest_universe_rank_board_u",
            "v_koaptix_latest_rank_board",
            "v_koaptix_home_kpi",
            "v_koaptix_complex_detail_sheet",
            "v_koaptix_latest_universe_rank_board",
        ):
            self.assertIn(f"create or replace view public.{view}", lowered)
        for entrypoint in (
            "koaptix_seed_latest_board_compatibility_generation",
            "koaptix_build_rank_publication_generation",
            "koaptix_publish_latest_board_generation",
            "koaptix_rollback_latest_board_publication",
        ):
            self.assertIn(f"drop function public.{entrypoint}(jsonb)", lowered)
        functions_903 = {
            "koaptix_jsonb_has_exact_keys",
            "koaptix_compact_jsonb_array",
            "koaptix_service_rows_digest",
            "koaptix_global_rows_digest",
            "koaptix_service_date_vector_digest",
            "koaptix_reject_latest_board_immutable_mutation",
            "koaptix_compact_jsonb_object",
            "koaptix_jsonb_array_has_exact_object_keys",
            "koaptix_generation_surface_components_json",
            "koaptix_surface_component_manifest_digest",
            "koaptix_combined_surface_manifest_digest",
            "koaptix_verify_latest_board_generation",
            "koaptix_assert_rank_input_authority",
            "koaptix_assert_generation_authority",
            "koaptix_insert_latest_board_generation_packet",
            "koaptix_require_publication_event_pointer_commit",
            "koaptix_guard_latest_board_publication_pointer",
            "koaptix_assert_latest_board_action_packet_header",
            "koaptix_seed_latest_board_compatibility_generation",
            "koaptix_build_rank_publication_generation",
            "koaptix_publish_latest_board_generation",
            "koaptix_rollback_latest_board_publication",
        }
        dropped_functions = set(
            re.findall(r"drop\s+function\s+public\.([a-z0-9_]+)\s*\(", lowered)
        )
        self.assertEqual(len(functions_903), 22)
        self.assertTrue(functions_903 <= dropped_functions)
        self.assertTrue(lowered.rstrip().endswith("commit;"))


if __name__ == "__main__":
    unittest.main()
