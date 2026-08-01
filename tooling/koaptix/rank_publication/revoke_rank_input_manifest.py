#!/usr/bin/env python3
"""Validate and, only with --execute, invoke one manifest revocation action."""

from __future__ import annotations

import re
import sys
import uuid
from pathlib import Path
from typing import Any, Mapping

from seal_rank_input_manifest import ContractError, run_cli


ACTION_ROLE = "koaptix_rank_manifest_revoker"
ENTRYPOINT = "public.koaptix_revoke_rank_input_manifest(jsonb)"
QUERY_PATH = Path(__file__).with_name("queries") / "revoke_rank_input_manifest.sql"
QUERY_SQL = (
    "select public.koaptix_revoke_rank_input_manifest(%(packet)s::jsonb) "
    "as revoked_manifest;"
)
REQUIRED_KEYS = frozenset(
    {
        "manifest_run_id",
        "revocation_run_id",
        "reason_code",
        "expected_active_generation_id",
        "expected_publication_version",
    }
)
RUN_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$")


def validate_revocation_packet(packet: Mapping[str, Any]) -> None:
    if set(packet) != REQUIRED_KEYS:
        missing = sorted(REQUIRED_KEYS - set(packet))
        extra = sorted(set(packet) - REQUIRED_KEYS)
        raise ContractError(
            f"revocation packet keys are not exact; missing={missing}, extra={extra}"
        )
    for field in ("manifest_run_id", "revocation_run_id", "reason_code"):
        value = packet[field]
        if not isinstance(value, str) or not value.strip():
            raise ContractError(f"{field} must be a nonblank string")
        if field != "reason_code" and not RUN_ID_RE.fullmatch(value):
            raise ContractError(f"{field} contains unsupported characters")
    generation_id = packet["expected_active_generation_id"]
    if not isinstance(generation_id, str):
        raise ContractError("expected_active_generation_id must be a UUID string")
    try:
        if str(uuid.UUID(generation_id)) != generation_id:
            raise ContractError("expected_active_generation_id is not canonical UUID text")
    except ValueError as exc:
        raise ContractError("expected_active_generation_id is invalid") from exc
    version = packet["expected_publication_version"]
    if isinstance(version, bool) or not isinstance(version, int) or version <= 0:
        raise ContractError("expected_publication_version must be a positive integer")


def main(argv: list[str] | None = None) -> int:
    return run_cli(
        argv=argv,
        description="Validate or explicitly execute one canonical manifest revocation",
        action_role=ACTION_ROLE,
        entrypoint=ENTRYPOINT,
        query_path=QUERY_PATH,
        expected_query=QUERY_SQL,
        packet_validator=validate_revocation_packet,
    )


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ContractError as exc:
        print(f"contract error: {exc}", file=sys.stderr)
        raise SystemExit(2)
