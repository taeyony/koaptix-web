#!/usr/bin/env python3
"""Validate and, only with --execute, invoke the manifest-sealer action.

The module is inert when imported. It never contains credentials, never prints DSNs,
and uses exactly one tracked typed query under one temporarily granted action role.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from datetime import date
from pathlib import Path
from typing import Any, Callable, Mapping


ACTION_ROLE = "koaptix_rank_manifest_sealer"
ENTRYPOINT = "public.koaptix_seal_rank_input_manifest(jsonb)"
QUERY_PATH = Path(__file__).with_name("queries") / "seal_rank_input_manifest.sql"
QUERY_SQL = (
    "select public.koaptix_seal_rank_input_manifest(%(packet)s::jsonb) "
    "as sealed_manifest;"
)
SHA256_RE = re.compile(r"^[0-9A-F]{64}$")
DATE_RE = re.compile(r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$")
ENV_NAME_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,62}$")
ACTION_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$")

OWNER_ROLES = (
    "koaptix_rank_authority_owner",
    "koaptix_rank_publication_owner",
)
ACTION_ENTRYPOINTS = {
    "koaptix_rank_authority_reader": "public.koaptix_compute_rank_input_authority(date)",
    "koaptix_rank_manifest_sealer": "public.koaptix_seal_rank_input_manifest(jsonb)",
    "koaptix_rank_manifest_revoker": "public.koaptix_revoke_rank_input_manifest(jsonb)",
    "koaptix_rank_bootstrap_seeder": "public.koaptix_seed_latest_board_compatibility_generation(jsonb)",
    "koaptix_rank_generation_builder": "public.koaptix_build_rank_publication_generation(jsonb)",
    "koaptix_rank_generation_publisher": "public.koaptix_publish_latest_board_generation(jsonb)",
    "koaptix_rank_publication_rollback": "public.koaptix_rollback_latest_board_publication(jsonb)",
}
RECOVERY_ROLES = frozenset((*OWNER_ROLES, *ACTION_ENTRYPOINTS))
CRITICAL_RELATIONS = (
    "public.complex_rank_history",
    "public.koaptix_rank_snapshot",
    "public.koaptix_latest_board_read_model",
    "public.koaptix_rank_input_authority_manifest",
    "public.koaptix_rank_input_manifest_revocation",
    "public.koaptix_latest_board_generation",
    "public.koaptix_latest_board_generation_surface",
    "public.koaptix_latest_board_generation_universe",
    "public.koaptix_latest_board_generation_row",
    "public.koaptix_latest_board_generation_global_row",
    "public.koaptix_rank_publication_history_stage",
    "public.koaptix_rank_publication_snapshot_stage",
    "public.koaptix_latest_board_publication_event",
    "public.koaptix_latest_board_publication",
)

SEAL_KEYS = frozenset(
    {
        "snapshot_date",
        "manifest_run_id",
        "canonical_query_version",
        "membership_contract_version",
        "authority_contract_version",
        "expected_market_cap_rows",
        "expected_eligibility_rows",
        "expected_join_rows",
        "expected_qualified_rows",
        "market_cap_calculation_versions",
        "eligibility_rule_versions",
        "market_cap_source_ids",
        "eligibility_source_ids",
        "membership_source_ids",
        "expected_jeonbuk_membership_rows",
        "expected_sgg_52111_membership_rows",
        "expected_sgg_52111_qualified_rows",
        "membership_duplicate_pairs",
        "membership_fail_closed_qualified_rows",
        "affected_universe_codes",
        "affected_universe_manifest",
        "manual_override_allowed",
        "blocking_review_rule_version",
        "blocking_review_rows",
        "blocking_review_sha256",
        "market_cap_set_sha256",
        "eligibility_set_sha256",
        "source_set_sha256",
        "selected_input_sha256",
        "membership_set_sha256",
        "affected_universe_set_sha256",
    }
)

INTEGER_KEYS = frozenset(
    {
        "expected_market_cap_rows",
        "expected_eligibility_rows",
        "expected_join_rows",
        "expected_qualified_rows",
        "expected_jeonbuk_membership_rows",
        "expected_sgg_52111_membership_rows",
        "expected_sgg_52111_qualified_rows",
        "membership_duplicate_pairs",
        "membership_fail_closed_qualified_rows",
        "blocking_review_rows",
    }
)
ARRAY_KEYS = frozenset(
    {
        "market_cap_calculation_versions",
        "eligibility_rule_versions",
        "market_cap_source_ids",
        "eligibility_source_ids",
        "membership_source_ids",
        "affected_universe_codes",
        "affected_universe_manifest",
    }
)
DIGEST_KEYS = frozenset(
    {
        "blocking_review_sha256",
        "market_cap_set_sha256",
        "eligibility_set_sha256",
        "source_set_sha256",
        "selected_input_sha256",
        "membership_set_sha256",
        "affected_universe_set_sha256",
    }
)


class ContractError(ValueError):
    """Raised before any connection is opened when an action contract is invalid."""


def canonical_json_bytes(value: Any) -> bytes:
    return json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest().upper()


def read_json_object(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ContractError(f"packet is not readable UTF-8 JSON: {path}") from exc
    if not isinstance(value, dict):
        raise ContractError("packet root must be a JSON object")
    return value


def _nonblank_string(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ContractError(f"{field} must be a nonblank string")
    return value


def _unique_nonblank_strings(value: Any, field: str) -> list[str]:
    if not isinstance(value, list) or not value:
        raise ContractError(f"{field} must be a nonempty array")
    result = [_nonblank_string(item, field) for item in value]
    if len(result) != len(set(result)):
        raise ContractError(f"{field} must contain unique strings")
    return result


def validate_seal_packet(packet: Mapping[str, Any]) -> None:
    if set(packet) != SEAL_KEYS:
        missing = sorted(SEAL_KEYS - set(packet))
        extra = sorted(set(packet) - SEAL_KEYS)
        raise ContractError(f"seal packet keys are not exact; missing={missing}, extra={extra}")
    if any(value is None for value in packet.values()):
        raise ContractError("seal packet values cannot be null")

    snapshot_date = _nonblank_string(packet["snapshot_date"], "snapshot_date")
    if not DATE_RE.fullmatch(snapshot_date):
        raise ContractError("snapshot_date must use YYYY-MM-DD")
    try:
        if date.fromisoformat(snapshot_date).isoformat() != snapshot_date:
            raise ContractError("snapshot_date is not canonical")
    except ValueError as exc:
        raise ContractError("snapshot_date is invalid") from exc

    for field in (
        "manifest_run_id",
        "canonical_query_version",
        "membership_contract_version",
        "authority_contract_version",
        "blocking_review_rule_version",
    ):
        _nonblank_string(packet[field], field)
    if packet["canonical_query_version"] != "canonical-rank-input-v1":
        raise ContractError("canonical_query_version is not canonical-rank-input-v1")
    if packet["membership_contract_version"] != "membership-map-first-45-52-v1":
        raise ContractError("membership_contract_version is not membership-map-first-45-52-v1")
    if packet["authority_contract_version"] != "rank-input-v1":
        raise ContractError("authority_contract_version is not rank-input-v1")
    if packet["blocking_review_rule_version"] != "NO_DIRECT_RANK_REVIEW_AUTHORITY_V1":
        raise ContractError("blocking_review_rule_version is not accepted")

    for field in INTEGER_KEYS:
        value = packet[field]
        if isinstance(value, bool) or not isinstance(value, int) or value < 0:
            raise ContractError(f"{field} must be a nonnegative integer")
    for field in ("expected_market_cap_rows", "expected_eligibility_rows", "expected_join_rows", "expected_qualified_rows"):
        if packet[field] <= 0:
            raise ContractError(f"{field} must be positive")
    if packet["membership_duplicate_pairs"] != 0:
        raise ContractError("membership_duplicate_pairs must be zero")
    if packet["membership_fail_closed_qualified_rows"] != 0:
        raise ContractError("membership_fail_closed_qualified_rows must be zero")
    if packet["blocking_review_rows"] != 0:
        raise ContractError("blocking_review_rows must be zero")
    if not isinstance(packet["manual_override_allowed"], bool):
        raise ContractError("manual_override_allowed must be boolean")

    for field in ARRAY_KEYS - {"affected_universe_manifest"}:
        _unique_nonblank_strings(packet[field], field)
    codes = packet["affected_universe_codes"]
    if codes != sorted(codes):
        raise ContractError("affected_universe_codes must be sorted")

    manifest = packet["affected_universe_manifest"]
    if not isinstance(manifest, list) or not manifest:
        raise ContractError("affected_universe_manifest must be nonempty")
    manifest_codes: list[str] = []
    for item in manifest:
        if not isinstance(item, dict) or set(item) != {
            "universe_code", "row_count", "row_set_sha256"
        }:
            raise ContractError("affected_universe_manifest item keys are not exact")
        code = _nonblank_string(item["universe_code"], "universe_code")
        count = item["row_count"]
        if isinstance(count, bool) or not isinstance(count, int) or count <= 0:
            raise ContractError("affected universe row_count must be positive")
        if not isinstance(item["row_set_sha256"], str) or not SHA256_RE.fullmatch(item["row_set_sha256"]):
            raise ContractError("affected universe row_set_sha256 must be uppercase SHA-256")
        manifest_codes.append(code)
    if manifest_codes != codes or manifest_codes != sorted(set(manifest_codes)):
        raise ContractError("affected universe manifest must exactly match sorted codes")

    for field in DIGEST_KEYS:
        if not isinstance(packet[field], str) or not SHA256_RE.fullmatch(packet[field]):
            raise ContractError(f"{field} must be uppercase SHA-256")


def normalize_typed_query(query: str) -> str:
    lines = [line for line in query.splitlines() if not line.lstrip().startswith("--")]
    return " ".join(" ".join(lines).split())


def validate_query_file(path: Path, expected_sql: str) -> tuple[str, str]:
    try:
        query = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        raise ContractError(f"typed query is unreadable: {path}") from exc
    if normalize_typed_query(query) != normalize_typed_query(expected_sql):
        raise ContractError("typed query contains an unexpected statement")
    return query, sha256_bytes(query.encode("utf-8"))


def _require_env(name: str) -> str:
    if not isinstance(name, str) or not ENV_NAME_RE.fullmatch(name):
        raise ContractError("connection environment-variable name is invalid")
    value = os.environ.get(name)
    if not value or not value.strip():
        raise ContractError("required connection environment variable is unavailable")
    return value


def _unexpected_writer_execute_count(
    conn: Any, principal: str, allowed_entrypoint: str | None
) -> int:
    return conn.execute(
        r"""
        with recursive funcs as (
          select p.oid,p.proname,p.prosecdef,
                 lower(pg_get_functiondef(p.oid)) as body
          from pg_catalog.pg_proc p
          join pg_catalog.pg_namespace n on n.oid=p.pronamespace
          where n.nspname not in ('pg_catalog','information_schema')
            and n.nspname not like 'pg_toast%' and p.prokind in ('f','p')
        ), direct_or_dynamic_rank_writers as (
          select f.oid from funcs f
          where (
            f.body ~ '(insert[[:space:]]+into|merge[[:space:]]+into|update|delete[[:space:]]+from|truncate|execute)'
            and f.body ~ '(complex_rank_history|koaptix_rank_snapshot|koaptix_latest_board_read_model|koaptix_rank_input_authority_manifest|koaptix_rank_input_manifest_revocation|koaptix_rank_publication|koaptix_latest_board_generation)'
          ) or (
            f.prosecdef and f.body ~ '\mexecute\m'
            and f.body ~ '(rank|snapshot|latest_board|market_pipeline)'
          )
        ), writer_closure(oid) as (
          select oid from direct_or_dynamic_rank_writers
          union
          select caller.oid from funcs caller
          join funcs callee on caller.body ~ (
            '(^|[^a-z0-9_])'||lower(callee.proname)||'[[:space:]]*\('
          )
          join writer_closure prior on prior.oid=callee.oid
        )
        select count(distinct w.oid)
        from writer_closure w
        where has_function_privilege(%s,w.oid,'EXECUTE')
          and (%s is null or w.oid<>to_regprocedure(%s))
        """,
        (principal, allowed_entrypoint, allowed_entrypoint),
        prepare=False,
    ).fetchone()[0]


def _recovery_role_membership_count(conn: Any) -> int:
    recovery_roles = sorted(RECOVERY_ROLES)
    return conn.execute(
        """
        select count(*)
        from pg_catalog.pg_auth_members am
        join pg_catalog.pg_roles granted_role on granted_role.oid=am.roleid
        join pg_catalog.pg_roles member_role on member_role.oid=am.member
        where granted_role.rolname=any(%s) or member_role.rolname=any(%s)
        """,
        (recovery_roles, recovery_roles),
        prepare=False,
    ).fetchone()[0]


def _validate_recovery_role_isolation(conn: Any) -> None:
    if _recovery_role_membership_count(conn) != 0:
        raise ContractError("recovery roles must retain zero inbound/outbound memberships")


def _validate_sterile_login(
    conn: Any, login: str, action_role: str, expected_entrypoint: str
) -> None:
    if not IDENTIFIER_RE.fullmatch(login) or login in RECOVERY_ROLES:
        raise ContractError("dedicated login name is invalid or reserved")
    if ACTION_ENTRYPOINTS.get(action_role) != expected_entrypoint:
        raise ContractError("action role and entrypoint do not match the reviewed matrix")
    row = conn.execute(
        """
        select rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolreplication,
               rolbypassrls,rolconnlimit
        from pg_catalog.pg_roles where rolname=%s
        """,
        (login,),
        prepare=False,
    ).fetchone()
    if row is None or tuple(row) != (True, False, False, False, False, False, 1):
        raise ContractError("dedicated login attributes are not sterile/exact")
    role = conn.execute(
        """
        select rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolreplication,
               rolbypassrls,rolinherit
        from pg_catalog.pg_roles where rolname=%s
        """,
        (action_role,),
        prepare=False,
    ).fetchone()
    if role is None or tuple(role) != (False, False, False, False, False, False, False):
        raise ContractError("action role attributes are missing or not inert/exact")
    membership_count = conn.execute(
        """
        select count(*)
        from pg_catalog.pg_auth_members am
        join pg_catalog.pg_roles granted_role on granted_role.oid=am.roleid
        join pg_catalog.pg_roles member_role on member_role.oid=am.member
        where granted_role.rolname in (%s,%s)
           or member_role.rolname in (%s,%s)
        """,
        (login, action_role, login, action_role),
        prepare=False,
    ).fetchone()[0]
    if membership_count != 0:
        raise ContractError("dedicated login or action role already has a role membership")
    _validate_recovery_role_isolation(conn)
    owner_count = conn.execute(
        """
        select
          (select count(*) from pg_catalog.pg_class c join pg_catalog.pg_roles r on r.oid=c.relowner where r.rolname in (%s,%s))
          +(select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_roles r on r.oid=p.proowner where r.rolname in (%s,%s))
          +(select count(*) from pg_catalog.pg_namespace n join pg_catalog.pg_roles r on r.oid=n.nspowner where r.rolname in (%s,%s))
        """,
        (login, action_role, login, action_role, login, action_role),
        prepare=False,
    ).fetchone()[0]
    if owner_count != 0:
        raise ContractError("dedicated login or action role owns database objects")
    backend_count = conn.execute(
        "select count(*) from pg_catalog.pg_stat_activity where usename=%s and pid<>pg_backend_pid()",
        (login,),
        prepare=False,
    ).fetchone()[0]
    if backend_count != 0:
        raise ContractError("dedicated login has an active backend")
    for principal in (login, action_role):
        for relation in CRITICAL_RELATIONS:
            has_dml = conn.execute(
                """
                select has_table_privilege(
                         %s,%s,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
                       )
                    or has_any_column_privilege(%s,%s,'INSERT,UPDATE,REFERENCES')
                """,
                (principal, relation, principal, relation),
                prepare=False,
            ).fetchone()[0]
            if has_dml:
                raise ContractError(
                    "dedicated login or action role has critical table/column capability"
                )

    for entrypoint in ACTION_ENTRYPOINTS.values():
        login_execute = conn.execute(
            "select has_function_privilege(%s,to_regprocedure(%s),'EXECUTE')",
            (login, entrypoint),
            prepare=False,
        ).fetchone()[0]
        role_execute = conn.execute(
            "select has_function_privilege(%s,to_regprocedure(%s),'EXECUTE')",
            (action_role, entrypoint),
            prepare=False,
        ).fetchone()[0]
        if login_execute or bool(role_execute) != (entrypoint == expected_entrypoint):
            raise ContractError("single-entrypoint execute matrix is not exact")

    entrypoint_definition = conn.execute(
        """
        select p.prosecdef,owner_role.rolname
        from pg_catalog.pg_proc p
        join pg_catalog.pg_roles owner_role on owner_role.oid=p.proowner
        where p.oid=to_regprocedure(%s)
        """,
        (expected_entrypoint,),
        prepare=False,
    ).fetchone()
    if (
        entrypoint_definition is None
        or entrypoint_definition[0] is not True
        or entrypoint_definition[1] not in OWNER_ROLES
    ):
        raise ContractError("action entrypoint is missing or not owner-backed SECURITY DEFINER")
    if _unexpected_writer_execute_count(conn, login, None) != 0:
        raise ContractError("dedicated login retains an executable rank-writer path")
    if _unexpected_writer_execute_count(conn, action_role, expected_entrypoint) != 0:
        raise ContractError("action role retains an unreviewed executable rank-writer path")


def _verify_membership_options(conn: Any, login: str, action_role: str) -> None:
    row = conn.execute(
        """
        select am.admin_option,am.inherit_option,am.set_option,
               pg_catalog.pg_has_role(%s,%s,'MEMBER'),
               pg_catalog.pg_has_role(%s,%s,'SET'),
               pg_catalog.pg_has_role(%s,%s,'USAGE')
        from pg_catalog.pg_auth_members am
        join pg_catalog.pg_roles granted_role on granted_role.oid=am.roleid
        join pg_catalog.pg_roles member_role on member_role.oid=am.member
        where granted_role.rolname=%s and member_role.rolname=%s
        """,
        (login, action_role, login, action_role, login, action_role, action_role, login),
        prepare=False,
    ).fetchone()
    if row is None or tuple(row) != (False, False, True, True, True, False):
        raise ContractError("temporary role membership options are not exact")
    membership_count = conn.execute(
        """
        select count(*)
        from pg_catalog.pg_auth_members am
        join pg_catalog.pg_roles granted_role on granted_role.oid=am.roleid
        join pg_catalog.pg_roles member_role on member_role.oid=am.member
        where granted_role.rolname in (%s,%s)
           or member_role.rolname in (%s,%s)
        """,
        (login, action_role, login, action_role),
        prepare=False,
    ).fetchone()[0]
    if membership_count != 1:
        raise ContractError("temporary role membership is not the only related membership")
    if _recovery_role_membership_count(conn) != 1:
        raise ContractError("a different recovery-role membership is active")


def _verify_cleanup(
    conn: Any, login: str, action_role: str, expected_entrypoint: str
) -> None:
    role_state = conn.execute(
        """
        select pg_catalog.pg_has_role(%s,%s,'MEMBER'),
               pg_catalog.pg_has_role(%s,%s,'SET'),
               pg_catalog.pg_has_role(%s,%s,'USAGE')
        """,
        (login, action_role, login, action_role, login, action_role),
        prepare=False,
    ).fetchone()
    if role_state is None or tuple(role_state) != (False, False, False):
        raise ContractError("post-cleanup MEMBER/SET/USAGE state is not all false")
    _validate_sterile_login(conn, login, action_role, expected_entrypoint)


def _terminate_login_backends(conn: Any, login: str) -> None:
    for _ in range(5):
        rows = conn.execute(
            """
            select pid from pg_catalog.pg_stat_activity
            where usename=%s and pid<>pg_backend_pid()
            order by pid
            """,
            (login,),
            prepare=False,
        ).fetchall()
        if not rows:
            return
        if len(rows) > 1:
            raise ContractError("dedicated CONNECTION LIMIT 1 login has multiple backends")
        pid = rows[0][0]
        terminated = conn.execute(
            "select pg_catalog.pg_terminate_backend(%s)",
            (pid,),
            prepare=False,
        ).fetchone()[0]
        if terminated is not True:
            raise ContractError("exact lingering action backend could not be terminated")
    raise ContractError("exact lingering action backend did not reach zero")


def _cleanup_action_membership(
    *,
    psycopg: Any,
    sql: Any,
    admin_dsn: str,
    login: str,
    action_role: str,
    expected_entrypoint: str,
) -> None:
    with psycopg.connect(admin_dsn, autocommit=False) as cleanup:
        server_version = cleanup.execute(
            "select current_setting('server_version_num')::integer", prepare=False
        ).fetchone()[0]
        if server_version < 170000:
            raise ContractError("rank recovery cleanup requires PostgreSQL 17+")
        _terminate_login_backends(cleanup, login)
        cleanup.execute(
            sql.SQL("revoke {} from {}").format(
                sql.Identifier(action_role), sql.Identifier(login)
            ),
            prepare=False,
        )
        cleanup.commit()
        _verify_cleanup(cleanup, login, action_role, expected_entrypoint)
        cleanup.commit()


def execute_single_action(
    *,
    packet: Mapping[str, Any],
    query: str,
    action_role: str,
    expected_entrypoint: str,
    login: str,
    admin_dsn: str,
    action_dsn: str,
) -> Any:
    try:
        import psycopg
        from psycopg import sql
        from psycopg.types.json import Jsonb
    except ImportError as exc:
        raise ContractError("psycopg 3 is required for --execute") from exc

    cleanup_required = False
    action_pid: int | None = None
    result = None
    try:
        try:
            with psycopg.connect(admin_dsn, autocommit=False) as admin:
                server_version = admin.execute(
                    "select current_setting('server_version_num')::integer", prepare=False
                ).fetchone()[0]
                if server_version < 170000:
                    raise ContractError("rank recovery execution requires PostgreSQL 17+")
                _validate_sterile_login(
                    admin, login, action_role, expected_entrypoint
                )
                cleanup_required = True
                admin.execute(
                    sql.SQL(
                        "grant {} to {} with inherit false, set true, admin false"
                    ).format(sql.Identifier(action_role), sql.Identifier(login)),
                    prepare=False,
                )
                admin.commit()
                _verify_membership_options(admin, login, action_role)
                admin.commit()

            with psycopg.connect(action_dsn, autocommit=False) as action:
                action.execute(
                    "set transaction isolation level serializable", prepare=False
                )
                identity = action.execute(
                    "select session_user,current_user,pg_backend_pid()", prepare=False
                ).fetchone()
                if identity is None or tuple(identity[:2]) != (login, login):
                    raise ContractError(
                        "action DSN does not authenticate as the dedicated login"
                    )
                action_pid = int(identity[2])
                action.execute(
                    sql.SQL("set local role {}").format(sql.Identifier(action_role)),
                    prepare=False,
                )
                result = action.execute(
                    query, {"packet": Jsonb(dict(packet))}, prepare=False
                ).fetchone()
                action.commit()
        finally:
            if cleanup_required:
                try:
                    _cleanup_action_membership(
                        psycopg=psycopg,
                        sql=sql,
                        admin_dsn=admin_dsn,
                        login=login,
                        action_role=action_role,
                        expected_entrypoint=expected_entrypoint,
                    )
                except ContractError:
                    raise
                except Exception:
                    raise ContractError(
                        "role cleanup could not be proven; stop the rollout"
                    ) from None
    except ContractError:
        raise
    except Exception:
        raise ContractError(
            "database action failed; connection details suppressed and cleanup attempted"
        ) from None
    if action_pid is None:
        raise ContractError("action backend identity was not recorded")
    return result[0] if result else None


def build_parser(description: str) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("--packet", required=True, type=Path)
    parser.add_argument("--approval-id", required=True)
    parser.add_argument("--login", required=True)
    parser.add_argument("--admin-dsn-env", default="KOAPTIX_RANK_ADMIN_DSN")
    parser.add_argument("--action-dsn-env", default="KOAPTIX_RANK_ACTION_DSN")
    parser.add_argument("--expected-packet-sha256")
    parser.add_argument("--expected-query-sha256")
    parser.add_argument(
        "--execute",
        action="store_true",
        help="perform the separately authorized role lifecycle and one typed action",
    )
    return parser


def run_cli(
    *,
    argv: list[str] | None,
    description: str,
    action_role: str,
    entrypoint: str,
    query_path: Path,
    expected_query: str,
    packet_validator: Callable[[Mapping[str, Any]], None],
) -> int:
    args = build_parser(description).parse_args(argv)
    if not ACTION_ID_RE.fullmatch(args.approval_id):
        raise ContractError("approval_id is not a bounded canonical action identifier")
    if not IDENTIFIER_RE.fullmatch(args.login) or args.login in RECOVERY_ROLES:
        raise ContractError("login is not a valid dedicated non-recovery role name")
    packet = read_json_object(args.packet)
    packet_validator(packet)
    packet_sha = sha256_bytes(canonical_json_bytes(packet))
    query, query_sha = validate_query_file(query_path, expected_query)
    if args.expected_packet_sha256 and args.expected_packet_sha256.upper() != packet_sha:
        raise ContractError("packet SHA-256 does not match the approved value")
    if args.expected_query_sha256 and args.expected_query_sha256.upper() != query_sha:
        raise ContractError("query SHA-256 does not match the approved value")
    if args.execute and (not args.expected_packet_sha256 or not args.expected_query_sha256):
        raise ContractError("--execute requires both approved packet and query SHA-256")

    if not args.execute:
        print(json.dumps({
            "status": "VALIDATED_NO_EXECUTION",
            "action_role": action_role,
            "entrypoint": entrypoint,
            "approval_id": args.approval_id,
            "packet_sha256": packet_sha,
            "query_sha256": query_sha,
        }, sort_keys=True))
        return 0

    result = execute_single_action(
        packet=packet,
        query=query,
        action_role=action_role,
        expected_entrypoint=entrypoint,
        login=args.login,
        admin_dsn=_require_env(args.admin_dsn_env),
        action_dsn=_require_env(args.action_dsn_env),
    )
    print(json.dumps({
        "status": "EXECUTED_ONE_TYPED_ACTION_AND_DEACTIVATED",
        "action_role": action_role,
        "entrypoint": entrypoint,
        "approval_id": args.approval_id,
        "packet_sha256": packet_sha,
        "query_sha256": query_sha,
        "result": result,
    }, ensure_ascii=False, sort_keys=True, default=str))
    return 0


def main(argv: list[str] | None = None) -> int:
    return run_cli(
        argv=argv,
        description="Validate or explicitly execute one canonical manifest seal",
        action_role=ACTION_ROLE,
        entrypoint=ENTRYPOINT,
        query_path=QUERY_PATH,
        expected_query=QUERY_SQL,
        packet_validator=validate_seal_packet,
    )


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ContractError as exc:
        print(f"contract error: {exc}", file=sys.stderr)
        raise SystemExit(2)
