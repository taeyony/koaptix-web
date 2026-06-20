"""Read-only verifier for the KOAPTIX canonical P3 area resolver.

The verifier does not apply the SQL migration. It compares the Python Decimal
mirror to SELECT-only SQL predicate equivalents and writes detailed artifacts
only under the system temp directory.
"""

from __future__ import annotations

import csv
import hashlib
import json
import os
import sys
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from dataclasses import asdict
from decimal import Decimal
from pathlib import Path
from typing import Any, Iterable

from koaptix_area_cluster_resolver import (
    HOLD,
    HOLD_ABOVE_TERMINAL_MAXIMUM,
    HOLD_BELOW_GLOBAL_MINIMUM,
    HOLD_CONFIG_INVALID,
    HOLD_DUPLICATE_MATCH,
    HOLD_INVALID_NUMERIC,
    HOLD_NO_ACTIVE_CLUSTER,
    HOLD_NON_POSITIVE,
    HOLD_NULL_INPUT,
    HOLD_WRONG_AREA_SEMANTIC,
    MATCH,
    AreaCluster,
    parse_decimal_area,
    resolve_area_cluster_p3,
    validate_cluster_config,
)


def json_default(value: Any) -> str:
    if isinstance(value, Decimal):
        return str(value)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


REPO_ROOT = Path(__file__).resolve().parents[1]
SOURCE_PACKAGE = REPO_ROOT / "manual_sources/SGG_52111/kapt_area/SGG_52111_kapt_area_actual_20260605.xlsx"
ACCEPTED_REGRESSION = (
    REPO_ROOT
    / "outputs/reports/2026-06-19-molit-2023-wave-001c-decimal-area-normalization-global-regression-plan/existing_support_assignment_regression.csv"
)
SGG29155_REGRESSION = (
    REPO_ROOT
    / "outputs/reports/2026-06-19-molit-2023-wave-001c-decimal-area-normalization-global-regression-plan/sgg29155_target_five_row_policy_outcomes.csv"
)
TMP_ROOT = Path(os.environ.get("TEMP", "/tmp")) / "koaptix_p3_resolver_patch_0" / "verifier"
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest().upper()


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for name in (".env.local", ".env"):
        path = REPO_ROOT / name
        if not path.exists():
            continue
        for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def col_index(cell_ref: str) -> int:
    letters = "".join(ch for ch in cell_ref if ch.isalpha())
    index = 0
    for ch in letters:
        index = index * 26 + (ord(ch.upper()) - 64)
    return index


def cell_text(cell: ET.Element) -> str:
    if cell.attrib.get("t") == "inlineStr":
        return "".join(node.text or "" for node in cell.iter() if node.tag == NS + "t")
    value = cell.find(NS + "v")
    return value.text if value is not None and value.text is not None else ""


def decimal_scale(raw_value: str) -> int:
    text = raw_value.strip()
    if "." not in text:
        return 0
    return len(text.split(".", 1)[1].rstrip("0"))


def read_kapt_source() -> tuple[list[dict[str, str]], dict[str, Any]]:
    if not SOURCE_PACKAGE.exists():
        raise RuntimeError(f"source package missing: {SOURCE_PACKAGE}")

    rows: list[dict[str, str]] = []
    canonical_lines: list[str] = []
    area_values: list[str] = []
    area_counter: Counter[str] = Counter()
    scale_counter: Counter[str] = Counter()
    header: list[str] | None = None
    notice = ""
    min_area: Decimal | None = None
    max_area: Decimal | None = None
    rows_more_than_two = 0
    sgg_values = {"84.9936", "84.9947", "84.9948", "84.9963", "84.9984"}
    sgg_hits: list[dict[str, str]] = []

    with zipfile.ZipFile(SOURCE_PACKAGE) as package:
        with package.open("xl/worksheets/sheet1.xml") as sheet:
            for _event, elem in ET.iterparse(sheet, events=("end",)):
                if elem.tag != NS + "row":
                    continue
                excel_row = int(elem.attrib.get("r", "0"))
                values: dict[int, str] = {}
                for cell in elem.findall(NS + "c"):
                    values[col_index(cell.attrib.get("r", "A0"))] = cell_text(cell)

                if excel_row == 1:
                    notice = values.get(1, "")
                elif excel_row == 2:
                    header = [values.get(i, "") for i in range(1, 12)]
                elif excel_row >= 3:
                    ordered = [values.get(i, "") for i in range(1, 12)]
                    data_row = len(rows) + 1
                    area_text = ordered[9].strip()
                    parsed = parse_decimal_area(area_text)
                    if parsed.value is None:
                        raise RuntimeError(f"invalid source area at Excel row {excel_row}")
                    area = parsed.value
                    area_values.append(area_text)
                    area_counter[area_text] += 1
                    scale = decimal_scale(area_text)
                    scale_counter[str(scale)] += 1
                    if scale > 2:
                        rows_more_than_two += 1
                    min_area = area if min_area is None or area < min_area else min_area
                    max_area = area if max_area is None or area > max_area else max_area
                    row = {
                        "excel_row": str(excel_row),
                        "data_row": str(data_row),
                        "sido": ordered[0],
                        "sigungu": ordered[1],
                        "eupmyeon": ordered[2],
                        "dongri": ordered[3],
                        "kapt_code": ordered[4],
                        "complex_name": ordered[5],
                        "building_count": ordered[6],
                        "management_area_m2": ordered[7],
                        "complex_exclusive_area_total_m2": ordered[8],
                        "exclusive_area_m2": area_text,
                        "household_count": ordered[10],
                    }
                    rows.append(row)
                    canonical_fields = [
                        row["excel_row"],
                        row["data_row"],
                        row["sido"],
                        row["sigungu"],
                        row["eupmyeon"],
                        row["dongri"],
                        row["kapt_code"],
                        row["complex_name"],
                        row["building_count"],
                        row["management_area_m2"],
                        row["complex_exclusive_area_total_m2"],
                        row["exclusive_area_m2"],
                        row["household_count"],
                    ]
                    canonical_lines.append("\t".join(item.replace("\t", " ").replace("\r", " ").replace("\n", " ") for item in canonical_fields))
                    if area_text in sgg_values:
                        sgg_hits.append(row)
                elem.clear()

    canonical_header = [
        "excel_row",
        "data_row",
        "sido",
        "sigungu",
        "eupmyeon",
        "dongri",
        "kapt_code",
        "complex_name",
        "building_count",
        "management_area_m2",
        "complex_exclusive_area_total_m2",
        "exclusive_area_m2",
        "household_count",
    ]
    canonical_content = "\t".join(canonical_header) + "\n" + "\n".join(canonical_lines) + "\n"
    area_multiset_content = "\n".join(sorted(area_values, key=lambda item: (Decimal(item), item))) + "\n"
    TMP_ROOT.mkdir(parents=True, exist_ok=True)
    canonical_path = TMP_ROOT / "kapt_area_canonical_extract.tsv"
    canonical_path.write_text(canonical_content, encoding="utf-8", newline="\n")
    area_multiset_path = TMP_ROOT / "kapt_area_source_area_multiset.txt"
    area_multiset_path.write_text(area_multiset_content, encoding="utf-8", newline="\n")
    metadata = {
        "source_package_path": SOURCE_PACKAGE.as_posix(),
        "source_package_size": SOURCE_PACKAGE.stat().st_size,
        "source_package_sha256": sha256_file(SOURCE_PACKAGE),
        "source_package_format": "xlsx_zip_xml_direct_sheet_parse",
        "worksheet": "sheet1 / xl/worksheets/sheet1.xml",
        "notice_row_present": bool(notice),
        "source_columns": header,
        "source_area_semantic": "exclusive_area_from_column_J",
        "parsed_row_count": len(rows),
        "distinct_area_count": len(area_counter),
        "min_source_area": str(min_area),
        "max_source_area": str(max_area),
        "decimal_scale_distribution": dict(sorted(scale_counter.items(), key=lambda pair: int(pair[0]))),
        "rows_more_than_two_decimals": rows_more_than_two,
        "sgg29155_value_hits_count": len(sgg_hits),
        "canonical_extract_path": str(canonical_path),
        "canonical_extract_sha256": sha256_text(canonical_content),
        "source_area_multiset_path": str(area_multiset_path),
        "source_area_multiset_sha256": sha256_text(area_multiset_content),
    }
    return rows, metadata


def connect_readonly():
    env = load_env()
    dsn = next((env[key] for key in ("DATABASE_URL", "POSTGRES_URL", "SUPABASE_DB_URL", "DIRECT_URL") if env.get(key)), None)
    if not dsn:
        raise RuntimeError("no configured database DSN found")
    import psycopg

    conn = psycopg.connect(
        dsn,
        options="-c default_transaction_read_only=on -c statement_timeout=30000",
    )
    conn.read_only = True
    return conn


def fetch_clusters(conn) -> list[AreaCluster]:
    sql = """
        select
          area_cluster_id,
          area_cluster_code,
          min_exclusive_area_m2::text as min_exclusive_area_m2,
          max_exclusive_area_m2::text as max_exclusive_area_m2,
          display_order,
          is_active
        from public.area_cluster_dim
        where is_active = true
        order by min_exclusive_area_m2, area_cluster_id
    """
    with conn.cursor() as cur:
        cur.execute(sql, prepare=False)
        rows = cur.fetchall()
    return [
        AreaCluster(
            area_cluster_id=int(row[0]),
            area_cluster_code=str(row[1]),
            min_exclusive_area_m2=Decimal(str(row[2])),
            max_exclusive_area_m2=Decimal(str(row[3])),
            display_order=int(row[4]) if row[4] is not None else None,
            is_active=bool(row[5]),
        )
        for row in rows
    ]


def fetch_live_distinct_areas(conn) -> list[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            select area_text
            from (
                select distinct
                    exclusive_area_m2::text as area_text,
                    exclusive_area_m2::numeric as area_numeric
                from public.apt_trade_raw
                where exclusive_area_m2 is not null
            ) distinct_areas
            order by area_numeric
            """,
            prepare=False,
        )
        return [str(row[0]) for row in cur.fetchall()]


def sql_resolve_batch(conn, inputs: list[tuple[str, str | None, str | None]]) -> dict[str, dict[str, str | None]]:
    if not inputs:
        return {}
    values_sql = ",".join(["(%s::text, %s::numeric, %s::text)"] * len(inputs))
    params: list[Any] = []
    for row_key, raw_area, semantic in inputs:
        params.extend([row_key, raw_area, semantic])

    sql = f"""
    with input_values(row_key, raw_area, area_semantic) as (
      values {values_sql}
    ),
    active_clusters as (
      select
        area_cluster_id,
        area_cluster_code,
        min_exclusive_area_m2,
        max_exclusive_area_m2
      from public.area_cluster_dim
      where is_active = true
    ),
    ordered as (
      select
        *,
        lag(min_exclusive_area_m2) over (order by min_exclusive_area_m2, area_cluster_id) as previous_min,
        lead(min_exclusive_area_m2) over (order by min_exclusive_area_m2, area_cluster_id) as next_min
      from active_clusters
    ),
    config as (
      select
        count(*)::integer as active_count,
        count(*) filter (
          where area_cluster_id is null
             or area_cluster_code is null
             or min_exclusive_area_m2 is null
             or max_exclusive_area_m2 is null
        )::integer as required_field_errors,
        count(*) filter (where previous_min is not null and min_exclusive_area_m2 <= previous_min)::integer as non_increasing_count,
        (count(*) - count(distinct min_exclusive_area_m2))::integer as duplicate_lower_count,
        count(*) filter (where next_min is not null and max_exclusive_area_m2 >= next_min)::integer as overlap_count,
        min(min_exclusive_area_m2) as global_min,
        max(area_cluster_code) filter (where area_cluster_code = 'EXCL_260_PLUS') as terminal_code,
        max(min_exclusive_area_m2) filter (where area_cluster_code = 'EXCL_260_PLUS') as terminal_min,
        max(max_exclusive_area_m2) filter (where area_cluster_code = 'EXCL_260_PLUS') as terminal_max
      from ordered
    )
    select
      i.row_key,
      r.area_cluster_id::text,
      r.area_cluster_code,
      r.match_status,
      r.hold_reason
    from input_values i
    cross join lateral (
      with candidates as (
        select o.area_cluster_id, o.area_cluster_code
        from ordered o
        cross join config cfg
        where (
          o.next_min is not null
          and i.raw_area >= o.min_exclusive_area_m2
          and i.raw_area < o.next_min
        )
        or (
          o.next_min is null
          and o.area_cluster_code = 'EXCL_260_PLUS'
          and i.raw_area >= o.min_exclusive_area_m2
          and i.raw_area <= o.max_exclusive_area_m2
        )
      ),
      candidate_summary as (
        select count(*)::integer as match_count, min(area_cluster_id) as match_id, min(area_cluster_code) as match_code
        from candidates
      )
      select
        case
          when i.area_semantic is distinct from 'exclusive' then null::bigint
          when i.raw_area is null then null::bigint
          when i.raw_area <= 0 then null::bigint
          when cfg.active_count = 0 then null::bigint
          when cfg.active_count <> 29
            or cfg.required_field_errors <> 0
            or cfg.non_increasing_count <> 0
            or cfg.duplicate_lower_count <> 0
            or cfg.overlap_count <> 0
            or cfg.terminal_code <> 'EXCL_260_PLUS'
            or cfg.terminal_min <> 260.00
            or cfg.terminal_max <> 999.99 then null::bigint
          when i.raw_area < cfg.global_min then null::bigint
          when i.raw_area > cfg.terminal_max then null::bigint
          when cs.match_count <> 1 then null::bigint
          else cs.match_id
        end as area_cluster_id,
        case
          when i.area_semantic is distinct from 'exclusive' then null::text
          when i.raw_area is null then null::text
          when i.raw_area <= 0 then null::text
          when cfg.active_count = 0 then null::text
          when cfg.active_count <> 29
            or cfg.required_field_errors <> 0
            or cfg.non_increasing_count <> 0
            or cfg.duplicate_lower_count <> 0
            or cfg.overlap_count <> 0
            or cfg.terminal_code <> 'EXCL_260_PLUS'
            or cfg.terminal_min <> 260.00
            or cfg.terminal_max <> 999.99 then null::text
          when i.raw_area < cfg.global_min then null::text
          when i.raw_area > cfg.terminal_max then null::text
          when cs.match_count <> 1 then null::text
          else cs.match_code
        end as area_cluster_code,
        case
          when i.area_semantic is distinct from 'exclusive' then 'HOLD'
          when i.raw_area is null then 'HOLD'
          when i.raw_area <= 0 then 'HOLD'
          when cfg.active_count = 0 then 'HOLD'
          when cfg.active_count <> 29
            or cfg.required_field_errors <> 0
            or cfg.non_increasing_count <> 0
            or cfg.duplicate_lower_count <> 0
            or cfg.overlap_count <> 0
            or cfg.terminal_code <> 'EXCL_260_PLUS'
            or cfg.terminal_min <> 260.00
            or cfg.terminal_max <> 999.99 then 'HOLD'
          when i.raw_area < cfg.global_min then 'HOLD'
          when i.raw_area > cfg.terminal_max then 'HOLD'
          when cs.match_count <> 1 then 'HOLD'
          else 'MATCH'
        end as match_status,
        case
          when i.area_semantic is distinct from 'exclusive' then 'HOLD_WRONG_AREA_SEMANTIC'
          when i.raw_area is null then 'HOLD_NULL_INPUT'
          when i.raw_area <= 0 then 'HOLD_NON_POSITIVE'
          when cfg.active_count = 0 then 'HOLD_NO_ACTIVE_CLUSTER'
          when cfg.active_count <> 29
            or cfg.required_field_errors <> 0
            or cfg.non_increasing_count <> 0
            or cfg.duplicate_lower_count <> 0
            or cfg.overlap_count <> 0
            or cfg.terminal_code <> 'EXCL_260_PLUS'
            or cfg.terminal_min <> 260.00
            or cfg.terminal_max <> 999.99 then 'HOLD_CONFIG_INVALID'
          when i.raw_area < cfg.global_min then 'HOLD_BELOW_GLOBAL_MINIMUM'
          when i.raw_area > cfg.terminal_max then 'HOLD_ABOVE_TERMINAL_MAXIMUM'
          when cs.match_count > 1 then 'HOLD_DUPLICATE_MATCH'
          when cs.match_count = 0 then 'HOLD_NO_MATCH'
          else null::text
        end as hold_reason
      from config cfg
      cross join candidate_summary cs
    ) r
    order by i.row_key
    """
    with conn.cursor() as cur:
        cur.execute(sql, params, prepare=False)
        rows = cur.fetchall()
    return {
        str(row[0]): {
            "area_cluster_id": row[1],
            "area_cluster_code": row[2],
            "match_status": row[3],
            "hold_reason": row[4],
        }
        for row in rows
    }


def python_result(raw_area: str | None, semantic: str | None, clusters: list[AreaCluster]) -> dict[str, str | None]:
    result = resolve_area_cluster_p3(raw_area, semantic, clusters)
    return {
        "area_cluster_id": str(result.area_cluster_id) if result.area_cluster_id is not None else None,
        "area_cluster_code": result.area_cluster_code,
        "match_status": result.match_status,
        "hold_reason": result.hold_reason,
    }


def compare_python_sql(
    conn,
    rows: list[tuple[str, str | None, str | None]],
    clusters: list[AreaCluster],
    batch_size: int = 800,
) -> tuple[int, int, list[dict[str, Any]], list[str], list[str], int]:
    pass_count = 0
    fail_count = 0
    duplicate_match_count = 0
    mismatches: list[dict[str, Any]] = []
    python_lines: list[str] = []
    sql_lines: list[str] = []
    for offset in range(0, len(rows), batch_size):
        batch = rows[offset : offset + batch_size]
        sql_results = sql_resolve_batch(conn, batch)
        for row_key, raw_area, semantic in batch:
            py = python_result(raw_area, semantic, clusters)
            sql = sql_results[row_key]
            if py["hold_reason"] == HOLD_DUPLICATE_MATCH or sql["hold_reason"] == HOLD_DUPLICATE_MATCH:
                duplicate_match_count += 1
            py_line = "\t".join([row_key, str(raw_area), str(semantic), str(py["area_cluster_id"]), str(py["area_cluster_code"]), str(py["match_status"]), str(py["hold_reason"])])
            sql_line = "\t".join([row_key, str(raw_area), str(semantic), str(sql["area_cluster_id"]), str(sql["area_cluster_code"]), str(sql["match_status"]), str(sql["hold_reason"])])
            python_lines.append(py_line)
            sql_lines.append(sql_line)
            if py == sql:
                pass_count += 1
            else:
                fail_count += 1
                mismatches.append({"row_key": row_key, "raw_area": raw_area, "semantic": semantic, "python": py, "sql": sql})
    return pass_count, fail_count, mismatches, python_lines, sql_lines, duplicate_match_count


def make_185_policy_fixtures(clusters: list[AreaCluster]) -> list[tuple[str, str | None, str | None]]:
    ordered = sorted(clusters, key=lambda item: (item.min_exclusive_area_m2, item.area_cluster_id))
    fixtures: list[tuple[str, str | None, str | None]] = []
    for cluster in ordered:
        fixtures.append((f"lower:{cluster.area_cluster_id}", str(cluster.min_exclusive_area_m2), "exclusive"))
    for cluster in ordered:
        fixtures.append((f"stored_upper:{cluster.area_cluster_id}", str(cluster.max_exclusive_area_m2), "exclusive"))
    for cluster in ordered[:-1]:
        next_min = ordered[ordered.index(cluster) + 1].min_exclusive_area_m2
        fixtures.append((f"next_lower:{cluster.area_cluster_id}", str(next_min), "exclusive"))
    for cluster in ordered[:-1]:
        fixtures.append((f"gap_after_upper:{cluster.area_cluster_id}", str(cluster.max_exclusive_area_m2 + Decimal("0.0001")), "exclusive"))
    for cluster in ordered[:-1]:
        next_min = ordered[ordered.index(cluster) + 1].min_exclusive_area_m2
        fixtures.append((f"just_below_next:{cluster.area_cluster_id}", str(next_min - Decimal("0.0001")), "exclusive"))
    for cluster in ordered:
        fixtures.append((f"just_above_lower:{cluster.area_cluster_id}", str(cluster.min_exclusive_area_m2 + Decimal("0.0001")), "exclusive"))
    extras = [
        ("terminal:259.9999", "259.9999", "exclusive"),
        ("terminal:260.00", "260.00", "exclusive"),
        ("terminal:999.99", "999.99", "exclusive"),
        ("terminal:999.9900", "999.9900", "exclusive"),
        ("terminal:999.9999", "999.9999", "exclusive"),
        ("terminal:1000.00", "1000.00", "exclusive"),
        ("invalid:null", None, "exclusive"),
        ("invalid:zero", "0", "exclusive"),
        ("invalid:negative", "-1", "exclusive"),
        ("invalid:below_global", "0.0001", "exclusive"),
        ("semantic:wrong", "84.9936", "supply"),
        ("semantic:missing", "84.9936", None),
        ("sgg29155:84.9963", "84.9963", "exclusive"),
        ("sgg29155:84.9984", "84.9984", "exclusive"),
    ]
    fixtures.extend(extras)
    if len(fixtures) != 185:
        raise RuntimeError(f"internal fixture count error: {len(fixtures)}")
    return fixtures


def read_accepted_10_rows() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    with ACCEPTED_REGRESSION.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            if (
                row.get("policy_candidate") == "P3_ADJACENT_LOWER_BOUND_HALF_OPEN_INTERVAL"
                and row.get("reference_scope") == "ACCEPTED_SUPPORT_READY"
                and row.get("sgg") in {"SGG_41220", "SGG_11710"}
            ):
                rows.append(row)
    return rows


def read_sgg29155_rows() -> list[dict[str, str]]:
    with SGG29155_REGRESSION.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def evaluate_expected_rows(rows: Iterable[dict[str, str]], clusters: list[AreaCluster], area_key: str, expected_key: str) -> tuple[int, list[dict[str, Any]], str]:
    failures: list[dict[str, Any]] = []
    result_lines: list[str] = []
    count = 0
    for row in rows:
        count += 1
        result = resolve_area_cluster_p3(row[area_key], "exclusive", clusters)
        expected = row[expected_key]
        actual = str(result.area_cluster_id) if result.area_cluster_id is not None else ""
        line = "\t".join([str(count), row.get(area_key, ""), expected, actual, result.match_status, str(result.hold_reason)])
        result_lines.append(line)
        if actual != expected or result.match_status != MATCH:
            failures.append({"row": row, "actual": asdict(result), "expected": expected})
    return count, failures, sha256_text("\n".join(result_lines) + "\n")


def terminal_regression(clusters: list[AreaCluster]) -> tuple[list[dict[str, Any]], str]:
    cases = [
        ("259.9999", "28", MATCH, None),
        ("260.00", "29", MATCH, None),
        ("999.99", "29", MATCH, None),
        ("999.9900", "29", MATCH, None),
        ("999.9999", None, HOLD, HOLD_ABOVE_TERMINAL_MAXIMUM),
        ("1000.00", None, HOLD, HOLD_ABOVE_TERMINAL_MAXIMUM),
    ]
    failures: list[dict[str, Any]] = []
    lines: list[str] = []
    for raw, expected_id, expected_status, expected_hold in cases:
        result = resolve_area_cluster_p3(raw, "exclusive", clusters)
        actual_id = str(result.area_cluster_id) if result.area_cluster_id is not None else None
        lines.append("\t".join([raw, str(expected_id), str(actual_id), result.match_status, str(result.hold_reason)]))
        if actual_id != expected_id or result.match_status != expected_status or result.hold_reason != expected_hold:
            failures.append({"raw": raw, "expected_id": expected_id, "actual": asdict(result)})
    return failures, sha256_text("\n".join(lines) + "\n")


def invalid_regression(clusters: list[AreaCluster]) -> list[dict[str, Any]]:
    failures: list[dict[str, Any]] = []
    parser_cases = [("", HOLD_INVALID_NUMERIC), ("not-a-number", HOLD_INVALID_NUMERIC)]
    for raw, expected_hold in parser_cases:
        parsed = parse_decimal_area(raw)
        if parsed.hold_reason != expected_hold:
            failures.append({"parser_raw": raw, "actual": asdict(parsed), "expected_hold": expected_hold})

    resolver_cases = [
        (None, "exclusive", HOLD_NULL_INPUT),
        ("0", "exclusive", HOLD_NON_POSITIVE),
        ("-1", "exclusive", HOLD_NON_POSITIVE),
        ("0.0001", "exclusive", HOLD_BELOW_GLOBAL_MINIMUM),
        ("84.9936", "supply", HOLD_WRONG_AREA_SEMANTIC),
        ("84.9936", None, HOLD_WRONG_AREA_SEMANTIC),
    ]
    for raw, semantic, expected_hold in resolver_cases:
        result = resolve_area_cluster_p3(raw, semantic, clusters)
        if result.match_status != HOLD or result.hold_reason != expected_hold:
            failures.append({"raw": raw, "semantic": semantic, "actual": asdict(result), "expected_hold": expected_hold})

    duplicate = list(clusters)
    duplicate[1] = AreaCluster(duplicate[1].area_cluster_id, duplicate[1].area_cluster_code, duplicate[0].min_exclusive_area_m2, duplicate[1].max_exclusive_area_m2)
    malformed_cases = [
        ("empty", []),
        ("duplicate_lower", duplicate),
        ("missing_terminal", clusters[:-1]),
        ("altered_terminal", clusters[:-1] + [AreaCluster(29, "EXCL_260_PLUS", Decimal("260.00"), Decimal("1000.00"))]),
    ]
    expected = {
        "empty": HOLD_NO_ACTIVE_CLUSTER,
        "duplicate_lower": HOLD_CONFIG_INVALID,
        "missing_terminal": HOLD_CONFIG_INVALID,
        "altered_terminal": HOLD_CONFIG_INVALID,
    }
    for name, bad_clusters in malformed_cases:
        result = resolve_area_cluster_p3("84.9936", "exclusive", bad_clusters)
        if result.match_status != HOLD or result.hold_reason != expected[name]:
            failures.append({"malformed_case": name, "actual": asdict(result), "expected_hold": expected[name]})
    return failures


def main() -> int:
    TMP_ROOT.mkdir(parents=True, exist_ok=True)
    source_rows, source_meta = read_kapt_source()
    conn = connect_readonly()
    try:
        clusters = fetch_clusters(conn)
        validation = validate_cluster_config(clusters)
        if not validation.is_valid:
            raise RuntimeError(f"cluster config invalid: {validation.hold_reason} {validation.detail}")

        fixture_rows = make_185_policy_fixtures(clusters)
        fixture_pass, fixture_fail, fixture_mismatches, fixture_py, fixture_sql, fixture_dup = compare_python_sql(conn, fixture_rows, clusters)

        live_areas = fetch_live_distinct_areas(conn)
        live_rows = [(f"live:{index}", area, "exclusive") for index, area in enumerate(live_areas, start=1)]
        live_pass, live_fail, live_mismatches, live_py, live_sql, live_dup = compare_python_sql(conn, live_rows, clusters)

        nationwide_rows = [(f"source:{row['excel_row']}:{row['data_row']}", row["exclusive_area_m2"], "exclusive") for row in source_rows]
        nation_pass, nation_fail, nation_mismatches, nation_py, nation_sql, nation_dup = compare_python_sql(conn, nationwide_rows, clusters)

        accepted_rows = read_accepted_10_rows()
        accepted_count, accepted_failures, accepted_hash = evaluate_expected_rows(
            accepted_rows,
            clusters,
            "raw_source_area",
            "current_accepted_area_cluster_id",
        )

        sgg29155_rows = read_sgg29155_rows()
        sgg_count, sgg_failures, sgg_hash = evaluate_expected_rows(
            sgg29155_rows,
            clusters,
            "raw_area_string",
            "half_open_cluster_id",
        )

        terminal_failures, terminal_hash = terminal_regression(clusters)
        invalid_failures = invalid_regression(clusters)

        mismatch_report = {
            "fixture_mismatches": fixture_mismatches[:100],
            "live_mismatches": live_mismatches[:100],
            "nationwide_mismatches": nation_mismatches[:100],
            "accepted_failures": accepted_failures,
            "sgg29155_failures": sgg_failures,
            "terminal_failures": terminal_failures,
            "invalid_failures": invalid_failures,
        }
        mismatch_text = json.dumps(mismatch_report, ensure_ascii=False, indent=2)
        mismatch_path = TMP_ROOT / "mismatch_report.json"
        mismatch_path.write_text(mismatch_text, encoding="utf-8")

        strict_gap_count = 0
        for row in source_rows:
            area = Decimal(row["exclusive_area_m2"])
            strict = [cluster for cluster in clusters if cluster.min_exclusive_area_m2 <= area <= cluster.max_exclusive_area_m2]
            if not strict:
                strict_gap_count += 1

        python_result_multiset = "\n".join(sorted(fixture_py + live_py + nation_py)) + "\n"
        sql_result_multiset = "\n".join(sorted(fixture_sql + live_sql + nation_sql)) + "\n"
        result_hashes = {
            "python_result_multiset_sha256": sha256_text(python_result_multiset),
            "sql_result_multiset_sha256": sha256_text(sql_result_multiset),
            "mismatch_report_sha256": sha256_text(mismatch_text),
            "accepted_10_row_result_sha256": accepted_hash,
            "sgg29155_five_row_result_sha256": sgg_hash,
            "terminal_result_sha256": terminal_hash,
        }

        summary = {
            "source": source_meta,
            "source_strict_gap_row_count": strict_gap_count,
            "schema_contract": {
                "active_cluster_count": len(clusters),
                "validation": asdict(validation),
            },
            "fixture_count": len(fixture_rows),
            "fixture_pass_count": fixture_pass,
            "fixture_fail_count": fixture_fail,
            "live_distinct_area_comparison_count": len(live_rows),
            "live_pass_count": live_pass,
            "live_fail_count": live_fail,
            "nationwide_source_row_comparison_count": len(nationwide_rows),
            "nationwide_pass_count": nation_pass,
            "nationwide_fail_count": nation_fail,
            "SQL_Python_parity_pass_count": fixture_pass + live_pass + nation_pass,
            "SQL_Python_parity_fail_count": fixture_fail + live_fail + nation_fail,
            "duplicate_match_count": fixture_dup + live_dup + nation_dup,
            "accepted_10_row_count": accepted_count,
            "accepted_10_row_failure_count": len(accepted_failures),
            "accepted_assignment_displacement_count": len(accepted_failures),
            "SGG29155_5_row_count": sgg_count,
            "SGG29155_5_row_failure_count": len(sgg_failures),
            "terminal_failure_count": len(terminal_failures),
            "invalid_input_failure_count": len(invalid_failures),
            "result_hashes": result_hashes,
            "mismatch_report_path": str(mismatch_path),
        }
        summary_path = TMP_ROOT / "verification_summary.json"
        summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2, default=json_default), encoding="utf-8")

        print("verification_summary_path=" + str(summary_path))
        for key in [
            "fixture_count",
            "live_distinct_area_comparison_count",
            "nationwide_source_row_comparison_count",
            "SQL_Python_parity_pass_count",
            "SQL_Python_parity_fail_count",
            "duplicate_match_count",
            "accepted_10_row_failure_count",
            "SGG29155_5_row_failure_count",
            "terminal_failure_count",
            "invalid_input_failure_count",
        ]:
            print(f"{key}={summary[key]}")
        print("source_package_sha256=" + source_meta["source_package_sha256"])
        print("canonical_extract_sha256=" + source_meta["canonical_extract_sha256"])
        print("python_result_multiset_sha256=" + result_hashes["python_result_multiset_sha256"])
        print("sql_result_multiset_sha256=" + result_hashes["sql_result_multiset_sha256"])
        print("mismatch_report_sha256=" + result_hashes["mismatch_report_sha256"])

        pass_conditions = [
            source_meta["parsed_row_count"] == 91937,
            strict_gap_count == 2438,
            len(fixture_rows) == 185,
            fixture_fail == 0,
            live_fail == 0,
            nation_fail == 0,
            accepted_count == 10,
            len(accepted_failures) == 0,
            sgg_count == 5,
            len(sgg_failures) == 0,
            len(terminal_failures) == 0,
            len(invalid_failures) == 0,
            fixture_dup + live_dup + nation_dup == 0,
        ]
        return 0 if all(pass_conditions) else 1
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
