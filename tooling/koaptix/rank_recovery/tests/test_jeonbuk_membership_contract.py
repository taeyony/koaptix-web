from __future__ import annotations

import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
MIGRATION = ROOT / "supabase/migrations/202607310902_jeonbuk_45_52_membership.sql"
ROLLBACK = ROOT / "tooling/koaptix/rank_publication/rollback/restore_authority_membership_901_902.sql"
EXPECTED_KOREAN_LABELS = (
    "전국", "서울", "부산", "경기", "전북", "서울 전체", "부산 전체",
    "대구 전체", "인천 전체", "광주 전체", "대전 전체", "울산 전체",
    "세종 전체", "경기 전체", "강원 전체", "충북 전체", "충남 전체",
    "전남 전체", "경북 전체", "경남 전체", "제주 전체", "전북 전체",
    "시군구 미상", "대한민국 전체",
)


def sql_without_comments(path: Path) -> str:
    lines = path.read_text(encoding="utf-8").splitlines()
    return "\n".join(line for line in lines if not line.lstrip().startswith("--")).lower()


class JeonbukMembershipContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.sql = sql_without_comments(MIGRATION)

    def test_exact_three_view_definition_order(self) -> None:
        authority = self.sql.index("create or replace view public.v_koaptix_rank_membership_authority_u")
        service = self.sql.index("create or replace view public.v_koaptix_universe_membership_u")
        compatibility = self.sql.index("create or replace view public.v_koaptix_universe_membership as")
        self.assertLess(authority, service)
        self.assertLess(service, compatibility)

    def test_map_first_fail_closed_before_apt_fallback(self) -> None:
        self.assertIn("when m.map_row_count is null and p.valid_code_count=1 then p.apt_sgg_cd", self.sql)
        self.assertIn("when m.invalid_or_conflict_count>0 or m.valid_code_count<>1 then null", self.sql)
        self.assertIn("fail_closed_map_invalid_or_ambiguous", self.sql)
        self.assertIn("resolution_status='resolved'", self.sql)

    def test_jeonbuk_maps_both_45_and_52_only_in_isolated_branch(self) -> None:
        matches = re.findall(r"left\(j\.resolved_sgg_cd,2\) in \(([^)]*)\)", self.sql)
        self.assertEqual(matches, ["'45','52'"])
        self.assertIn("'jeonbuk_all'::text", self.sql)

    def test_expected_utf8_labels_are_preserved(self) -> None:
        self.assertNotIn("\ufffd", self.sql)
        for label in EXPECTED_KOREAN_LABELS:
            self.assertIn(label.lower(), self.sql)

    def test_deduplication_key_is_complex_and_universe(self) -> None:
        self.assertIn("group by complex_id,universe_code", self.sql)
        self.assertIn("having count(distinct coalesce(universe_name,''))=1", self.sql)
        self.assertIn("count(distinct coalesce(universe_scope,''))=1", self.sql)

    def test_no_registry_or_data_mutation(self) -> None:
        for forbidden in (
            "insert into",
            "update public.",
            "delete from",
            "merge into",
            "truncate ",
            "universe_registry",
            "complex_rank_history",
            "koaptix_rank_snapshot",
        ):
            self.assertNotIn(forbidden, self.sql)

    def test_stage_5_rollback_is_dependent_first_and_preserves_900(self) -> None:
        rollback = sql_without_comments(ROLLBACK)
        compatibility = rollback.index("create or replace view public.v_koaptix_universe_membership as")
        service = rollback.index("create or replace view public.v_koaptix_universe_membership_u")
        authority_drop = rollback.index("drop view public.v_koaptix_rank_membership_authority_u")
        self.assertLess(compatibility, service)
        self.assertLess(service, authority_drop)
        self.assertNotIn("drop role koaptix_rank_publication_owner", rollback)
        self.assertNotIn("drop policy koaptix_rank_publication_owner_select", rollback)
        self.assertNotIn("\ufffd", rollback)
        for label in EXPECTED_KOREAN_LABELS:
            self.assertIn(label.lower(), rollback)
        self.assertEqual(rollback.count("pg_get_viewdef("), 2)
        self.assertIn("upper(x.privilege_type)='maintain'", rollback)
        self.assertIn("pg_catalog.pg_depend", rollback)


if __name__ == "__main__":
    unittest.main()
