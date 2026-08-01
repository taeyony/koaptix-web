from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[4]
RANK_RECOVERY = ROOT / "tooling" / "koaptix" / "rank_recovery"
RANK_PUBLICATION = ROOT / "tooling" / "koaptix" / "rank_publication"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


shadow = load_module("canonical_rank_input_shadow", RANK_RECOVERY / "canonical_rank_input_shadow.py")
sys.path.insert(0, str(RANK_PUBLICATION))
seal = load_module("seal_rank_input_manifest", RANK_PUBLICATION / "seal_rank_input_manifest.py")
revoke = load_module("revoke_rank_input_manifest", RANK_PUBLICATION / "revoke_rank_input_manifest.py")


def valid_seal_packet() -> dict[str, object]:
    digest = "A" * 64
    return {
        "snapshot_date": "2026-08-31",
        "manifest_run_id": "manifest-2026-08-31",
        "canonical_query_version": "canonical-rank-input-v1",
        "membership_contract_version": "membership-map-first-45-52-v1",
        "authority_contract_version": "rank-input-v1",
        "expected_market_cap_rows": 10,
        "expected_eligibility_rows": 10,
        "expected_join_rows": 10,
        "expected_qualified_rows": 8,
        "market_cap_calculation_versions": ["market-v1"],
        "eligibility_rule_versions": ["eligibility-v1"],
        "market_cap_source_ids": ["relation:public.apt_market_cap_snapshot"],
        "eligibility_source_ids": ["relation:public.complex_eligibility_snapshot"],
        "membership_source_ids": ["relation:public.v_koaptix_rank_membership_authority_u"],
        "expected_jeonbuk_membership_rows": 1,
        "expected_sgg_52111_membership_rows": 1,
        "expected_sgg_52111_qualified_rows": 1,
        "membership_duplicate_pairs": 0,
        "membership_fail_closed_qualified_rows": 0,
        "affected_universe_codes": ["KOREA_ALL", "SGG_52111"],
        "affected_universe_manifest": [
            {"universe_code": "KOREA_ALL", "row_count": 8, "row_set_sha256": digest},
            {"universe_code": "SGG_52111", "row_count": 1, "row_set_sha256": digest},
        ],
        "manual_override_allowed": False,
        "blocking_review_rule_version": "NO_DIRECT_RANK_REVIEW_AUTHORITY_V1",
        "blocking_review_rows": 0,
        "blocking_review_sha256": digest,
        "market_cap_set_sha256": digest,
        "eligibility_set_sha256": digest,
        "source_set_sha256": digest,
        "selected_input_sha256": digest,
        "membership_set_sha256": digest,
        "affected_universe_set_sha256": digest,
    }


class CanonicalSqlContractTests(unittest.TestCase):
    def test_900_closes_observed_writer_paths(self) -> None:
        text = (ROOT / "supabase/migrations/202607310900_rank_recovery_roles_and_acl.sql").read_text(encoding="utf-8").lower()
        for role in (*seal.OWNER_ROLES, *seal.ACTION_ENTRYPOINTS):
            self.assertIn(f"create role {role} nologin nosuperuser", text)
        self.assertEqual(text.count(" noinherit noreplication nobypassrls;"), 9)
        self.assertIn("revoke execute on function public.append_daily_rank_history(date)", text)
        self.assertIn("revoke insert,update,delete,truncate,references,trigger", text)
        self.assertEqual(text.count("create policy koaptix_rank_publication_owner_"), 6)

    def test_901_uses_only_canonical_authority_base(self) -> None:
        text = (ROOT / "supabase/migrations/202607310901_rank_canonical_input_contract.sql").read_text(encoding="utf-8").lower()
        self.assertIn("create table public.koaptix_rank_input_authority_manifest", text)
        self.assertIn("create table public.koaptix_rank_input_manifest_revocation", text)
        self.assertIn("create view public.v_koaptix_canonical_rank_input_u", text)
        self.assertIn("koaptix_text_array_is_distinct_nonblank", text)
        self.assertIn("trg_koaptix_rank_input_manifest_immutable", text)
        self.assertIn("trg_koaptix_rank_input_manifest_revocation_immutable", text)
        self.assertNotIn("create or replace function public.append_daily_rank_history", text)
        self.assertNotIn("staging_market_raw", text)

    def test_904_is_same_date_deterministic_and_owner_internal(self) -> None:
        text = (ROOT / "supabase/migrations/202607310904_rank_canonical_publisher_binding.sql").read_text(encoding="utf-8").lower()
        self.assertIn("from m join e using(snapshot_date,complex_id)", text)
        self.assertIn(
            "row_number() over (order by i.market_cap_krw desc,i.complex_id asc)",
            text,
        )
        self.assertIn("v_date<=date '2026-05-31'", text)
        self.assertIn("coverage_status='full'", text)
        self.assertNotIn("staging_market_raw", text)
        self.assertIn("owner to koaptix_rank_publication_owner", text)
        helper_acl = text[text.index("alter function public.append_daily_rank_history(date)"):]
        self.assertNotIn("grant execute on function public.append_daily_rank_history(date) to koaptix_rank_generation_builder", helper_acl)

    def test_905_is_guarded_single_rank_base_and_service_role_only(self) -> None:
        text = (ROOT / "supabase/migrations/202607310905_home_payload_publication_identity.sql").read_text(encoding="utf-8").lower()
        self.assertIn("v_home_signature is distinct from array", text)
        self.assertIn("04dc1b5940c62e6620033c6e3732637253cdf3e15b86aad521d471fb06d534c4", text)
        self.assertIn("v_global_signature is distinct from array", text)
        self.assertIn("and v.is_updatable='no'", text)
        self.assertEqual(text.count("rank_base as materialized"), 1)
        self.assertIn("from public.v_koaptix_latest_global_rank_board_published", text)
        for field in (
            "rank_snapshot_date",
            "rank_generation_id",
            "rank_publication_version",
            "rank_publication_event_id",
            "rank_published_at",
        ):
            self.assertIn(field, text)
        self.assertIn(
            "revoke all on table public.v_koaptix_home_public_service_payload_published",
            text,
        )
        self.assertIn("grant select on table public.v_koaptix_home_public_service_payload_published", text)

    def test_typed_queries_are_single_selects(self) -> None:
        expected = {
            "canonical_readiness.sql": "koaptix_compute_rank_input_authority",
            "seal_rank_input_manifest.sql": "koaptix_seal_rank_input_manifest",
            "revoke_rank_input_manifest.sql": "koaptix_revoke_rank_input_manifest",
        }
        for filename, entrypoint in expected.items():
            text = (RANK_PUBLICATION / "queries" / filename).read_text(encoding="utf-8")
            normalized = seal.normalize_typed_query(text).lower()
            self.assertTrue(normalized.startswith("select public."))
            self.assertEqual(normalized.count(";"), 1)
            self.assertIn(entrypoint, normalized)
            for forbidden in (" insert ", " update ", " delete ", " merge ", " truncate "):
                self.assertNotIn(forbidden, f" {normalized} ")


class PythonContractTests(unittest.TestCase):
    def test_shadow_date_and_digest_contract(self) -> None:
        self.assertEqual(shadow.canonical_date("2026-08-31"), "2026-08-31")
        with self.assertRaises(shadow.ShadowContractError):
            shadow.canonical_date("2026-02-30")
        with self.assertRaises(shadow.ShadowContractError):
            shadow.canonical_date(20260831)  # type: ignore[arg-type]
        rows = [
            (date(2026, 8, 31), 10, 300, 1, 300),
            (date(2026, 8, 31), 20, 200, 2, 200),
        ]
        count, first_rank, last_rank, mismatches, digest = shadow.digest_rows(rows)
        self.assertEqual((count, first_rank, last_rank, mismatches), (2, 1, 2, 0))
        self.assertRegex(digest, r"^[0-9A-F]{64}$")
        controls = shadow.pair_controls(
            ["2024-01-01", "2026-04-30"],
            ["KOREA_ALL", "SGG_52111"],
        )
        self.assertEqual(controls[1].universe_code, "SGG_52111")
        with self.assertRaises(shadow.ShadowContractError):
            shadow.pair_controls(["2024-01-01"], ["sgg_52111"])
        with self.assertRaises(shadow.ShadowContractError):
            shadow.pair_controls(["2024-01-01"], ["KOREA_ALL", "SGG_52111"])
        self.assertIn("u.universe_code=%(universe_code)s::text", shadow.CANONICAL_SHADOW_SQL)
        self.assertIn("coverage_status is distinct from 'full'", shadow.CANONICAL_METRICS_SQL)

    def test_shadow_expected_control_is_exact(self) -> None:
        result = shadow.ShadowResult(
            snapshot_date="2024-01-01",
            universe_code="KOREA_ALL",
            row_count=151,
            first_rank=1,
            last_rank=151,
            row_digest_sha256="A" * 64,
            partial_five_rows=0,
            market_cap_only_rows=0,
            eligibility_only_rows=0,
            ordering_mismatches=0,
        )
        expected = {
            "controls": [{
                "snapshot_date": "2024-01-01",
                "universe_code": "KOREA_ALL",
                "row_count": 151,
                "row_digest_sha256": "A" * 64,
            }]
        }
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "expected.json"
            path.write_text(json.dumps(expected), encoding="utf-8")
            shadow.validate_expected([result], path)
            expected["controls"][0]["row_digest_sha256"] = "a" * 64
            path.write_text(json.dumps(expected), encoding="utf-8")
            with self.assertRaises(shadow.ShadowContractError):
                shadow.validate_expected([result], path)

    def test_seal_packet_is_exact_and_sorted(self) -> None:
        packet = valid_seal_packet()
        seal.validate_seal_packet(packet)
        bad = dict(packet)
        bad["unexpected"] = True
        with self.assertRaises(seal.ContractError):
            seal.validate_seal_packet(bad)
        bad = dict(packet)
        bad["affected_universe_codes"] = list(reversed(packet["affected_universe_codes"]))
        with self.assertRaises(seal.ContractError):
            seal.validate_seal_packet(bad)
        bad = dict(packet)
        bad["source_set_sha256"] = "a" * 64
        with self.assertRaises(seal.ContractError):
            seal.validate_seal_packet(bad)

    def test_revocation_packet_is_exact(self) -> None:
        packet = {
            "manifest_run_id": "manifest-1",
            "revocation_run_id": "revoke-1",
            "reason_code": "SOURCE_AUTHORITY_WITHDRAWN",
            "expected_active_generation_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            "expected_publication_version": 2,
        }
        revoke.validate_revocation_packet(packet)
        bad = dict(packet)
        bad["expected_publication_version"] = 0
        with self.assertRaises(seal.ContractError):
            revoke.validate_revocation_packet(bad)
        bad = dict(packet)
        bad["expected_active_generation_id"] = packet["expected_active_generation_id"].upper()
        with self.assertRaises(seal.ContractError):
            revoke.validate_revocation_packet(bad)

    def test_action_runner_dry_run_never_opens_database(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            packet_path = Path(directory) / "packet.json"
            packet_path.write_text(json.dumps(valid_seal_packet()), encoding="utf-8")
            argv = [
                "--packet", str(packet_path),
                "--approval-id", "approval-1",
                "--login", "koaptix_rank_action_login",
            ]
            output = io.StringIO()
            with mock.patch.object(
                seal, "execute_single_action", side_effect=AssertionError("database opened")
            ), contextlib.redirect_stdout(output):
                self.assertEqual(seal.main(argv), 0)
            self.assertEqual(json.loads(output.getvalue())["status"], "VALIDATED_NO_EXECUTION")
            with self.assertRaises(seal.ContractError):
                seal.main([*argv, "--execute"])

    def test_action_lifecycle_contract_is_load_bearing(self) -> None:
        source = (RANK_PUBLICATION / "seal_rank_input_manifest.py").read_text(encoding="utf-8").lower()
        self.assertEqual(len(seal.ACTION_ENTRYPOINTS), 7)
        for fragment in (
            "with inherit false, set true, admin false",
            "set transaction isolation level serializable",
            "select session_user,current_user,pg_backend_pid()",
            "set local role {}",
            "pg_terminate_backend",
            "post-cleanup member/set/usage state is not all false",
            "recovery roles must retain zero inbound/outbound memberships",
            "writer_closure",
            "role cleanup could not be proven; stop the rollout",
        ):
            self.assertIn(fragment, source)
        self.assertLess(source.index("set local role {}"), source.index("query, {\"packet\""))

    def test_runner_modules_are_import_inert(self) -> None:
        self.assertTrue(callable(seal.main))
        self.assertTrue(callable(revoke.main))
        self.assertTrue(callable(shadow.main))


if __name__ == "__main__":
    unittest.main()
