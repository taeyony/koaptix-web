"""Generic KOAPTIX MOLIT 2023 raw-match-clean dry-run generator.

Current lane behavior is dry-run/no-output only. Payload mode fails closed and
must be re-approved in a later lane before any file artifacts are created.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from collections import Counter
from dataclasses import asdict
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

sys.dont_write_bytecode = True

from koaptix_molit_2023_match_rules import (  # noqa: E402
    MATCH_CLASSIFICATIONS,
    MatchRuleInput,
    classify_match_evidence,
    decimal_to_canonical_string,
)
from koaptix_trade_clean_rules import (  # noqa: E402
    CLEAN_CLASSIFICATIONS,
    CLEAN_ELIGIBLE_COMPLEX_AREA_VALID_NONCANCELED,
    CleanRuleInput,
    classify_clean_evidence,
)


DEFAULT_DB_URL_ENV_KEYS = (
    "KOAPTIX_SOURCE_DATABASE_URL",
    "KOAPTIX_DATABASE_URL",
    "DATABASE_URL",
    "SUPABASE_DB_URL",
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL_NON_POOLING",
    "DIRECT_URL",
)


class DryRunBlocked(RuntimeError):
    """Expected safe-stop condition for dry-run validation."""


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def load_local_env_without_logging(root: Path) -> None:
    """Load local env files without printing key values."""

    for name in (".env.local", ".env"):
        path = root / name
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            key = key.strip()
            if not key or key in os.environ:
                continue
            os.environ[key] = value.strip().strip('"').strip("'")


def get_database_url() -> tuple[str | None, str | None]:
    for key in DEFAULT_DB_URL_ENV_KEYS:
        value = os.environ.get(key)
        if value:
            return value, key
    return None, None


def canonicalize(value: Any) -> Any:
    if isinstance(value, Decimal):
        return decimal_to_canonical_string(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(k): canonicalize(v) for k, v in sorted(value.items())}
    if isinstance(value, (list, tuple)):
        return [canonicalize(v) for v in value]
    return value


def canonical_json_bytes(value: Any) -> bytes:
    return json.dumps(
        canonicalize(value),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def sha256_hex(value: Any) -> str:
    return hashlib.sha256(canonical_json_bytes(value)).hexdigest().upper()


def nonnegative_int(name: str, value: int | None) -> int | None:
    if value is None:
        return None
    if value < 0:
        raise argparse.ArgumentTypeError(f"{name} must be non-negative")
    return value


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Dry-run KOAPTIX MOLIT 2023 raw-match-clean candidate counts without "
            "writing DB rows or files."
        )
    )
    parser.add_argument("--scope", required=True)
    parser.add_argument("--lawd-cd", required=True)
    parser.add_argument("--start-date", required=True)
    parser.add_argument("--end-date-exclusive", required=True)
    parser.add_argument("--expected-raw-count", required=True, type=int)
    parser.add_argument("--source-package-sha256", required=True)
    parser.add_argument("--normalized-payload-package-sha256", required=True)
    parser.add_argument("--mapping-package-sha256", required=True)
    parser.add_argument("--raw-selection-manifest-sha256", required=True)
    parser.add_argument("--match-rule-version", required=True)
    parser.add_argument("--clean-rule-version", required=True)
    parser.add_argument("--mode", choices=("dry-run", "payload"), default="dry-run")
    parser.add_argument(
        "--no-output",
        action="store_true",
        default=True,
        help="Required safety boundary; retained for explicit command readability.",
    )
    parser.add_argument(
        "--output-root",
        default=None,
        help="Reserved for a future approved payload/hashlock lane. Current lane rejects it.",
    )
    parser.add_argument("--expected-existing-match-rows", type=int, default=0)
    parser.add_argument("--expected-existing-clean-rows", type=int, default=0)
    parser.add_argument("--expected-unique-alias-candidate-count", type=int)
    parser.add_argument("--expected-unique-apt-complex-candidate-count", type=int)
    parser.add_argument("--expected-ambiguous-candidate-count", type=int)
    parser.add_argument("--expected-no-candidate-count", type=int)
    parser.add_argument("--expected-complete-complex-evidence-rows", type=int)
    parser.add_argument("--expected-area-cluster-resolvable-rows", type=int)
    parser.add_argument("--expected-potential-clean-rows", type=int)
    parser.add_argument("--expected-hold-review-rows", type=int)
    return parser


def validate_args(args: argparse.Namespace) -> None:
    if args.mode != "dry-run":
        raise DryRunBlocked("payload mode is not approved in this lane")
    if args.output_root:
        raise DryRunBlocked("output-root is not approved in this lane")
    if not args.no_output:
        raise DryRunBlocked("no-output mode is required")
    for field in (
        "expected_raw_count",
        "expected_existing_match_rows",
        "expected_existing_clean_rows",
        "expected_unique_alias_candidate_count",
        "expected_unique_apt_complex_candidate_count",
        "expected_ambiguous_candidate_count",
        "expected_no_candidate_count",
        "expected_complete_complex_evidence_rows",
        "expected_area_cluster_resolvable_rows",
        "expected_potential_clean_rows",
        "expected_hold_review_rows",
    ):
        nonnegative_int(field, getattr(args, field))


def fetch_dry_run_rows(args: argparse.Namespace) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    load_local_env_without_logging(_repo_root())
    database_url, database_env_key = get_database_url()
    if not database_url:
        raise DryRunBlocked("read-only database URL is unavailable")

    try:
        import psycopg
        from psycopg.rows import dict_row
    except ImportError as exc:
        raise DryRunBlocked("psycopg is unavailable") from exc

    params = {
        "lawd": args.lawd_cd,
        "start": args.start_date,
        "end": args.end_date_exclusive,
        "source_hash": args.source_package_sha256.lower(),
        "normalized_hash": args.normalized_payload_package_sha256.lower(),
        "mapping_hash": args.mapping_package_sha256.lower(),
    }

    row_sql = """
    with raw as (
      select
        r.trade_raw_id,
        r.source_record_key,
        r.contract_date,
        r.exclusive_area_m2,
        r.deal_amount_krw,
        r.floor_no,
        coalesce(r.is_canceled, false) as is_canceled,
        r.source_payload->'normalized_fields'->>'complex_name_norm' as complex_name_norm,
        r.source_payload->>'source_package_sha256' as source_package_sha256,
        r.source_payload->>'normalized_payload_package_sha256'
          as normalized_payload_package_sha256,
        r.source_payload->>'mapping_package_sha256' as mapping_package_sha256,
        count(*) over(partition by r.source_record_key) as source_record_key_count
      from public.apt_trade_raw r
      where r.lawd_cd = %(lawd)s
        and r.contract_date >= %(start)s
        and r.contract_date < %(end)s
    ),
    clusters as (
      select
        area_cluster_id,
        area_cluster_code,
        min_exclusive_area_m2,
        max_exclusive_area_m2,
        lead(min_exclusive_area_m2)
          over(order by min_exclusive_area_m2, area_cluster_id) as next_min
      from public.area_cluster_dim
      where is_active
    ),
    raw_cluster as (
      select r.trade_raw_id, c.area_cluster_id
      from raw r
      join clusters c
        on r.exclusive_area_m2 >= c.min_exclusive_area_m2
       and (
         (
           c.area_cluster_code = 'EXCL_260_PLUS'
           and r.exclusive_area_m2 <= c.max_exclusive_area_m2
         )
         or (
           c.area_cluster_code <> 'EXCL_260_PLUS'
           and r.exclusive_area_m2 < c.next_min
         )
       )
    ),
    alias_candidates as (
      select distinct r.trade_raw_id, a.complex_id
      from raw r
      join public.complex_name_alias a
        on a.alias_name_norm = r.complex_name_norm
      join public.apt_complex c
        on c.complex_id = a.complex_id
       and c.is_active
      join public.koaptix_complex_region_map rm
        on rm.complex_id = a.complex_id
       and rm.lawd_cd = %(lawd)s
    ),
    alias_per as (
      select
        trade_raw_id,
        count(distinct complex_id)::int as alias_candidate_count,
        min(complex_id) as alias_complex_id
      from alias_candidates
      group by trade_raw_id
    ),
    apt_candidates as (
      select distinct r.trade_raw_id, c.complex_id
      from raw r
      join public.apt_complex c
        on c.apt_name_norm = r.complex_name_norm
       and c.is_active
      join public.koaptix_complex_region_map rm
        on rm.complex_id = c.complex_id
       and rm.lawd_cd = %(lawd)s
    ),
    apt_per as (
      select
        trade_raw_id,
        count(distinct complex_id)::int as apt_candidate_count,
        min(complex_id) as apt_complex_id
      from apt_candidates
      group by trade_raw_id
    ),
    selected as (
      select
        r.*,
        coalesce(a.alias_candidate_count, 0) as alias_candidate_count,
        coalesce(p.apt_candidate_count, 0) as apt_candidate_count,
        case
          when coalesce(a.alias_candidate_count, 0) = 1 then a.alias_complex_id
          when coalesce(a.alias_candidate_count, 0) = 0
           and coalesce(p.apt_candidate_count, 0) = 1 then p.apt_complex_id
          else null
        end as selected_complex_id
      from raw r
      left join alias_per a on a.trade_raw_id = r.trade_raw_id
      left join apt_per p on p.trade_raw_id = r.trade_raw_id
    )
    select
      s.*,
      rc.area_cluster_id as resolved_area_cluster_id,
      h.household_count as household_area_cluster_household_count,
      exists (
        select 1
        from public.apt_trade_match m
        where m.trade_raw_id = s.trade_raw_id
      ) as has_existing_match,
      exists (
        select 1
        from public.apt_trade_clean cl
        where cl.trade_raw_id = s.trade_raw_id
      ) as has_existing_clean
    from selected s
    left join raw_cluster rc on rc.trade_raw_id = s.trade_raw_id
    left join public.apt_complex_area_cluster_household h
      on h.complex_id = s.selected_complex_id
     and h.area_cluster_id = rc.area_cluster_id
    order by s.trade_raw_id
    """

    with psycopg.connect(database_url, autocommit=False, prepare_threshold=None) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("BEGIN READ ONLY")
            cur.execute("SET LOCAL statement_timeout = '30s'")
            cur.execute("SHOW transaction_read_only")
            transaction_read_only = cur.fetchone()["transaction_read_only"]
            if transaction_read_only != "on":
                raise DryRunBlocked("transaction_read_only is not on")
            cur.execute(row_sql, params)
            rows = [dict(row) for row in cur.fetchall()]
            cur.execute("ROLLBACK")

    metadata = {
        "database_env_key_used": database_env_key,
        "transaction_read_only": transaction_read_only,
        "sql_statement_class": "SELECT_ONLY_WITH_BEGIN_READ_ONLY_AND_ROLLBACK",
    }
    return rows, metadata


def classify_rows(rows: list[dict[str, Any]], args: argparse.Namespace) -> dict[str, Any]:
    match_counter: Counter[str] = Counter()
    clean_counter: Counter[str] = Counter()
    preview_match_rows: list[dict[str, Any]] = []
    preview_clean_rows: list[dict[str, Any]] = []

    invalid_count = 0
    canceled_count = 0
    duplicate_source_key_count = 0
    existing_match_rows = 0
    existing_clean_rows = 0
    source_hash_mismatch_count = 0
    normalized_hash_mismatch_count = 0
    mapping_hash_mismatch_count = 0
    unique_alias_candidate_count = 0
    unique_apt_complex_candidate_count = 0
    ambiguous_candidate_count = 0
    no_candidate_count = 0
    complete_complex_evidence_rows = 0
    raw_p3_area_cluster_resolved_rows = 0
    area_cluster_resolvable_rows = 0

    for row in rows:
        has_invalid_required_field = (
            row["contract_date"] is None
            or row["exclusive_area_m2"] is None
            or row["exclusive_area_m2"] <= 0
            or row["deal_amount_krw"] is None
            or row["deal_amount_krw"] <= 0
        )
        duplicate_source_key = row["source_record_key_count"] > 1
        has_area_cluster_support = (
            row["selected_complex_id"] is not None
            and row["resolved_area_cluster_id"] is not None
            and row["household_area_cluster_household_count"] is not None
        )
        match_result = classify_match_evidence(
            MatchRuleInput(
                is_canceled=bool(row["is_canceled"]),
                has_invalid_required_field=has_invalid_required_field,
                duplicate_source_key=duplicate_source_key,
                alias_candidate_count=int(row["alias_candidate_count"]),
                apt_complex_candidate_count=int(row["apt_candidate_count"]),
                has_area_cluster_support=has_area_cluster_support,
            )
        )
        clean_result = classify_clean_evidence(CleanRuleInput(match_result=match_result))

        match_counter[match_result.classification] += 1
        clean_counter[clean_result.classification] += 1
        invalid_count += int(has_invalid_required_field)
        canceled_count += int(bool(row["is_canceled"]))
        duplicate_source_key_count += int(duplicate_source_key)
        existing_match_rows += int(bool(row["has_existing_match"]))
        existing_clean_rows += int(bool(row["has_existing_clean"]))
        source_hash_mismatch_count += int(
            str(row["source_package_sha256"]).lower()
            != args.source_package_sha256.lower()
        )
        normalized_hash_mismatch_count += int(
            str(row["normalized_payload_package_sha256"]).lower()
            != args.normalized_payload_package_sha256.lower()
        )
        mapping_hash_mismatch_count += int(
            str(row["mapping_package_sha256"]).lower()
            != args.mapping_package_sha256.lower()
        )

        if row["alias_candidate_count"] == 1:
            unique_alias_candidate_count += 1
        elif row["alias_candidate_count"] > 1:
            ambiguous_candidate_count += 1
        elif row["apt_candidate_count"] == 1:
            unique_apt_complex_candidate_count += 1
        elif row["apt_candidate_count"] > 1:
            ambiguous_candidate_count += 1
        else:
            no_candidate_count += 1

        complete_complex_evidence_rows += int(match_result.is_unique_complex_candidate)
        raw_p3_area_cluster_resolved_rows += int(row["resolved_area_cluster_id"] is not None)
        area_cluster_resolvable_rows += int(has_area_cluster_support)

        preview_match_rows.append(
            {
                "trade_raw_id": row["trade_raw_id"],
                "selected_complex_id": row["selected_complex_id"],
                "resolved_area_cluster_id": row["resolved_area_cluster_id"],
                "match_classification": match_result.classification,
                "candidate_method": match_result.candidate_method,
                "selected_candidate_count": match_result.selected_candidate_count,
                "hold_reason": match_result.hold_reason,
            }
        )
        if clean_result.is_clean_eligible:
            preview_clean_rows.append(
                {
                    "trade_raw_id": row["trade_raw_id"],
                    "selected_complex_id": row["selected_complex_id"],
                    "resolved_area_cluster_id": row["resolved_area_cluster_id"],
                    "clean_classification": clean_result.classification,
                    "match_provenance": "complex_only",
                    "clean_version": args.clean_rule_version,
                }
            )

    potential_clean_rows = clean_counter[CLEAN_ELIGIBLE_COMPLEX_AREA_VALID_NONCANCELED]
    hold_review_rows = len(rows) - potential_clean_rows

    return {
        "raw_count": len(rows),
        "distinct_raw_name_norm_count": len(
            {row["complex_name_norm"] for row in rows if row["complex_name_norm"]}
        ),
        "existing_match_rows": existing_match_rows,
        "existing_clean_rows": existing_clean_rows,
        "canceled_rows": canceled_count,
        "invalid_amount_area_date_rows": invalid_count,
        "duplicate_source_key_count": duplicate_source_key_count,
        "source_package_hash_mismatch_rows": source_hash_mismatch_count,
        "normalized_payload_package_hash_mismatch_rows": normalized_hash_mismatch_count,
        "mapping_package_hash_mismatch_rows": mapping_hash_mismatch_count,
        "unique_alias_candidate_count": unique_alias_candidate_count,
        "unique_apt_complex_candidate_count": unique_apt_complex_candidate_count,
        "ambiguous_candidate_count": ambiguous_candidate_count,
        "no_candidate_count": no_candidate_count,
        "complete_complex_evidence_rows": complete_complex_evidence_rows,
        "raw_p3_area_cluster_resolved_rows": raw_p3_area_cluster_resolved_rows,
        "area_cluster_resolvable_rows": area_cluster_resolvable_rows,
        "potential_clean_rows": potential_clean_rows,
        "hold_review_rows": hold_review_rows,
        "match_classification_counts": {
            name: match_counter.get(name, 0) for name in MATCH_CLASSIFICATIONS
        },
        "clean_classification_counts": {
            name: clean_counter.get(name, 0) for name in CLEAN_CLASSIFICATIONS
        },
        "future_match_payload_hash_preview": sha256_hex(preview_match_rows),
        "future_clean_payload_hash_preview": sha256_hex(preview_clean_rows),
        "dry_run_summary_hash": None,
    }


def compare_expected(summary: dict[str, Any], args: argparse.Namespace) -> list[str]:
    expected_fields = {
        "raw_count": args.expected_raw_count,
        "existing_match_rows": args.expected_existing_match_rows,
        "existing_clean_rows": args.expected_existing_clean_rows,
        "unique_alias_candidate_count": args.expected_unique_alias_candidate_count,
        "unique_apt_complex_candidate_count": args.expected_unique_apt_complex_candidate_count,
        "ambiguous_candidate_count": args.expected_ambiguous_candidate_count,
        "no_candidate_count": args.expected_no_candidate_count,
        "complete_complex_evidence_rows": args.expected_complete_complex_evidence_rows,
        "area_cluster_resolvable_rows": args.expected_area_cluster_resolvable_rows,
        "potential_clean_rows": args.expected_potential_clean_rows,
        "hold_review_rows": args.expected_hold_review_rows,
    }
    mismatches = []
    for field, expected in expected_fields.items():
        if expected is None:
            continue
        actual = summary.get(field)
        if actual != expected:
            mismatches.append(f"{field}: expected {expected}, actual {actual}")
    for field in (
        "source_package_hash_mismatch_rows",
        "normalized_payload_package_hash_mismatch_rows",
        "mapping_package_hash_mismatch_rows",
    ):
        if summary.get(field) != 0:
            mismatches.append(f"{field}: expected 0, actual {summary.get(field)}")
    return mismatches


def build_output(args: argparse.Namespace, summary: dict[str, Any], metadata: dict[str, Any]) -> dict[str, Any]:
    output = {
        "scope": args.scope,
        "mode": args.mode,
        "no_output": True,
        "lawd_cd": args.lawd_cd,
        "start_date": args.start_date,
        "end_date_exclusive": args.end_date_exclusive,
        "match_rule_version": args.match_rule_version,
        "clean_rule_version": args.clean_rule_version,
        "raw_selection_manifest_sha256_contract": args.raw_selection_manifest_sha256,
        "db_readonly_boundary": {
            "db_connection_attempted": True,
            "db_readonly_connection_success": True,
            "transaction_read_only": metadata["transaction_read_only"],
            "sql_statement_class": metadata["sql_statement_class"],
            "database_env_key_used": metadata["database_env_key_used"],
            "credentials_logged": False,
        },
        "counts": summary,
        "payload_boundary": {
            "payload_file_created": False,
            "hashlock_file_created": False,
            "generated_output_file_created": False,
            "future_payload_hashes_are_preview_only": True,
        },
    }
    output["counts"]["dry_run_summary_hash"] = sha256_hex(
        {k: v for k, v in output.items() if k != "counts"} | {"counts_without_hash": summary}
    )
    return output


def run(args: argparse.Namespace) -> int:
    validate_args(args)
    rows, metadata = fetch_dry_run_rows(args)
    summary = classify_rows(rows, args)
    mismatches = compare_expected(summary, args)
    output = build_output(args, summary, metadata)
    output["count_match_with_prior_plan"] = not mismatches
    output["discrepancies"] = mismatches
    print(json.dumps(canonicalize(output), ensure_ascii=False, sort_keys=True, indent=2))
    if mismatches:
        return 3
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return run(args)
    except DryRunBlocked as exc:
        print(
            json.dumps(
                {
                    "status": "BLOCKED_DRY_RUN_DB_READONLY_ACCESS",
                    "reason": str(exc),
                    "payload_file_created": False,
                    "hashlock_file_created": False,
                    "generated_output_file_created": False,
                },
                sort_keys=True,
            )
        )
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
