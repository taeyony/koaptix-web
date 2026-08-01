#!/usr/bin/env python3
"""Read-only canonical rank-input shadow verifier.

Importing this module is inert. Database inspection requires the explicit
``--execute-read-only`` flag and a DSN supplied by an environment-variable name.
Only aggregate counts and SHA-256 digests are emitted.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from dataclasses import asdict, dataclass
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Any, Iterable, Iterator


DATE_RE = re.compile(r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$")
UNIVERSE_RE = re.compile(r"^[A-Z][A-Z0-9_]{0,63}$")
ENV_NAME_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

CANONICAL_SHADOW_SQL = """
with qualified as (
  select m.snapshot_date,m.complex_id,m.market_cap_krw,
         row_number() over (
           order by m.market_cap_krw desc,m.complex_id asc
         )::integer as rank_all
  from public.apt_market_cap_snapshot m
  join public.complex_eligibility_snapshot e
    on e.snapshot_date=m.snapshot_date and e.complex_id=m.complex_id
  join public.apt_complex a on a.complex_id=m.complex_id
  join public.v_koaptix_universe_membership_u u
    on u.complex_id=m.complex_id
  where m.snapshot_date=%(snapshot_date)s::date
    and u.universe_code=%(universe_code)s::text
    and m.market_cap_krw>0
    and m.coverage_status='full'
    and e.is_rank_eligible is true
    and e.eligibility_status='eligible'
    and a.is_active is true
    and a.master_status='active'
    and a.merged_into_complex_id is null
)
select snapshot_date,complex_id,market_cap_krw,rank_all,
       market_cap_krw as total_market_cap
from qualified
order by rank_all,complex_id
""".strip()

CANONICAL_METRICS_SQL = """
with m as (
  select * from public.apt_market_cap_snapshot
  where snapshot_date=%(snapshot_date)s::date
), e as (
  select * from public.complex_eligibility_snapshot
  where snapshot_date=%(snapshot_date)s::date
), paired as (
  select coalesce(m.complex_id,e.complex_id) as complex_id,
         m.complex_id as market_cap_id,e.complex_id as eligibility_id,
         m.market_cap_krw,m.coverage_status,
         e.is_rank_eligible,e.eligibility_status
  from m full join e using(snapshot_date,complex_id)
), scoped as (
  select p.*
  from paired p
  join public.apt_complex a on a.complex_id=p.complex_id
  join public.v_koaptix_universe_membership_u u
    on u.complex_id=p.complex_id
  where u.universe_code=%(universe_code)s::text
    and a.is_active is true
    and a.master_status='active'
    and a.merged_into_complex_id is null
)
select count(*) filter (
         where market_cap_id is not null and eligibility_id is null
       )::bigint as market_cap_only_rows,
       count(*) filter (
         where market_cap_id is null and eligibility_id is not null
       )::bigint as eligibility_only_rows,
       count(*) filter (
         where market_cap_id is not null and eligibility_id is not null
           and market_cap_krw>0
           and is_rank_eligible is true
           and eligibility_status='eligible'
           and coverage_status is distinct from 'full'
       )::bigint as partial_five_rows
from scoped
""".strip()


class ShadowContractError(ValueError):
    pass


@dataclass(frozen=True)
class ShadowControl:
    snapshot_date: str
    universe_code: str


@dataclass(frozen=True)
class ShadowResult:
    snapshot_date: str
    universe_code: str
    row_count: int
    first_rank: int | None
    last_rank: int | None
    row_digest_sha256: str
    partial_five_rows: int
    market_cap_only_rows: int
    eligibility_only_rows: int
    ordering_mismatches: int


def canonical_date(value: str) -> str:
    if not isinstance(value, str) or not DATE_RE.fullmatch(value):
        raise ShadowContractError(f"date must use YYYY-MM-DD: {value!r}")
    try:
        parsed = date.fromisoformat(value)
    except ValueError as exc:
        raise ShadowContractError(f"invalid date: {value!r}") from exc
    if parsed.isoformat() != value:
        raise ShadowContractError(f"noncanonical date: {value!r}")
    return value


def canonical_universe(value: str) -> str:
    if not isinstance(value, str) or not UNIVERSE_RE.fullmatch(value):
        raise ShadowContractError("universe code must be canonical uppercase identifier text")
    return value


def pair_controls(snapshot_dates: Iterable[str], universe_codes: Iterable[str]) -> list[ShadowControl]:
    dates = [canonical_date(value) for value in snapshot_dates]
    universes = [canonical_universe(value) for value in universe_codes]
    if len(dates) != len(universes):
        raise ShadowContractError("snapshot-date and universe-code counts must match")
    controls = [ShadowControl(d, u) for d, u in zip(dates, universes)]
    if len(controls) != len(set(controls)):
        raise ShadowContractError("snapshot-date/universe controls must be unique")
    return controls


def json_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return format(value, "f")
    if isinstance(value, (date,)):
        return value.isoformat()
    if isinstance(value, bytes):
        return value.hex().upper()
    return value


def digest_rows(rows: Iterable[tuple[Any, ...]]) -> tuple[int, int | None, int | None, int, str]:
    hasher = hashlib.sha256()
    header = [
        "snapshot_date",
        "complex_id",
        "market_cap_krw",
        "rank_all",
        "total_market_cap",
    ]
    hasher.update(json.dumps(header, separators=(",", ":")).encode("utf-8") + b"\n")
    count = 0
    first_rank: int | None = None
    last_rank: int | None = None
    ordering_mismatches = 0
    previous_rank = 0
    for row in rows:
        if len(row) != 5:
            raise ShadowContractError("shadow query returned an unexpected column count")
        rank = row[3]
        complex_id = row[1]
        if isinstance(rank, bool) or not isinstance(rank, int) or rank <= 0:
            raise ShadowContractError("rank_all must be a positive integer")
        if isinstance(complex_id, bool) or not isinstance(complex_id, int) or complex_id <= 0:
            raise ShadowContractError("complex_id must be a positive integer")
        if count == 0:
            first_rank = rank
        if rank != previous_rank + 1:
            ordering_mismatches += 1
        previous_rank = rank
        last_rank = rank
        payload = [json_value(value) for value in row]
        hasher.update(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            + b"\n"
        )
        count += 1
    return count, first_rank, last_rank, ordering_mismatches, hasher.hexdigest().upper()


def validate_expected(results: Iterable[ShadowResult], expected_path: Path) -> None:
    try:
        expected = json.loads(expected_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ShadowContractError("expected-control file is not valid UTF-8 JSON") from exc
    if not isinstance(expected, dict) or set(expected) != {"controls"}:
        raise ShadowContractError("expected control must contain only controls")
    controls = expected["controls"]
    if not isinstance(controls, list) or not controls:
        raise ShadowContractError("expected controls must be a nonempty array")
    actual = {(item.snapshot_date, item.universe_code): item for item in results}
    expected_keys: set[tuple[str, str]] = set()
    for control in controls:
        if not isinstance(control, dict) or set(control) != {
            "snapshot_date", "universe_code", "row_count", "row_digest_sha256"
        }:
            raise ShadowContractError("expected control keys are not exact")
        key = (
            canonical_date(control["snapshot_date"]),
            canonical_universe(control["universe_code"]),
        )
        if key in expected_keys:
            raise ShadowContractError("expected controls contain a duplicate")
        expected_keys.add(key)
        row_count = control["row_count"]
        digest = control["row_digest_sha256"]
        if isinstance(row_count, bool) or not isinstance(row_count, int) or row_count <= 0:
            raise ShadowContractError("expected row_count must be a positive integer")
        if not isinstance(digest, str) or not re.fullmatch(r"[0-9A-F]{64}", digest):
            raise ShadowContractError("expected row digest must be uppercase SHA-256")
        item = actual.get(key)
        if item is None or row_count != item.row_count or digest != item.row_digest_sha256:
            raise ShadowContractError(f"shadow mismatch for {key[0]} {key[1]}")
    if set(actual) != expected_keys:
        raise ShadowContractError("expected-control set differs from requested controls")


def run_shadow(dsn: str, controls: Iterable[ShadowControl]) -> list[ShadowResult]:
    try:
        import psycopg
    except ImportError as exc:
        raise ShadowContractError("psycopg 3 is required for read-only execution") from exc

    results: list[ShadowResult] = []
    try:
        with psycopg.connect(dsn, autocommit=False) as conn:
            conn.execute(
                "set transaction isolation level repeatable read, read only",
                prepare=False,
            )
            for control in controls:
                params = asdict(control)
                metrics = conn.execute(
                    CANONICAL_METRICS_SQL, params, prepare=False
                ).fetchone()
                if metrics is None or len(metrics) != 3:
                    raise ShadowContractError("canonical metrics query returned no exact row")
                market_only, eligibility_only, partial_five = metrics
                with conn.cursor() as cursor:
                    cursor.execute(
                        CANONICAL_SHADOW_SQL,
                        params,
                        prepare=False,
                    )

                    def batches() -> Iterator[tuple[Any, ...]]:
                        while True:
                            rows = cursor.fetchmany(1000)
                            if not rows:
                                return
                            yield from rows

                    count, first_rank, last_rank, mismatches, digest = digest_rows(batches())
                results.append(
                    ShadowResult(
                        snapshot_date=control.snapshot_date,
                        universe_code=control.universe_code,
                        row_count=count,
                        first_rank=first_rank,
                        last_rank=last_rank,
                        row_digest_sha256=digest,
                        partial_five_rows=int(partial_five),
                        market_cap_only_rows=int(market_only),
                        eligibility_only_rows=int(eligibility_only),
                        ordering_mismatches=mismatches,
                    )
                )
            conn.rollback()
    except psycopg.Error:
        raise ShadowContractError(
            "read-only database inspection failed; connection details suppressed"
        ) from None
    return results


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Canonical rank-input read-only shadow")
    parser.add_argument("--snapshot-date", action="append", required=True)
    parser.add_argument("--universe-code", action="append", required=True)
    parser.add_argument("--expected", type=Path)
    parser.add_argument("--dsn-env", default="KOAPTIX_READONLY_DSN")
    parser.add_argument(
        "--execute-read-only",
        action="store_true",
        help="open one REPEATABLE READ READ ONLY transaction",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    controls = pair_controls(args.snapshot_date, args.universe_code)
    if not args.execute_read_only:
        print(json.dumps({
            "status": "VALIDATED_NO_EXECUTION",
            "controls": [asdict(control) for control in controls],
            "query_sha256": hashlib.sha256(CANONICAL_SHADOW_SQL.encode("utf-8")).hexdigest().upper(),
            "metrics_query_sha256": hashlib.sha256(CANONICAL_METRICS_SQL.encode("utf-8")).hexdigest().upper(),
        }, sort_keys=True))
        return 0
    if not ENV_NAME_RE.fullmatch(args.dsn_env):
        raise ShadowContractError("read-only DSN environment-variable name is invalid")
    dsn = os.environ.get(args.dsn_env)
    if not dsn or not dsn.strip():
        raise ShadowContractError("read-only DSN environment variable is unavailable")
    results = run_shadow(dsn, controls)
    if any(
        item.row_count <= 0
        or item.ordering_mismatches != 0
        or item.partial_five_rows != 0
        or item.market_cap_only_rows != 0
        or item.eligibility_only_rows != 0
        for item in results
    ):
        raise ShadowContractError(
            "canonical shadow is empty, incomplete, partial, or nondeterministically ordered"
        )
    if args.expected:
        validate_expected(results, args.expected)
    print(json.dumps({
        "status": "PASS_READ_ONLY_CANONICAL_SHADOW",
        "results": [asdict(item) for item in results],
        "persistent_db_write_attempted": False,
        "helper_or_udf_executed": False,
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ShadowContractError as exc:
        print(f"contract error: {exc}", file=sys.stderr)
        raise SystemExit(2)
