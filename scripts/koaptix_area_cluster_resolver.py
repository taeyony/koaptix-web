"""Canonical KOAPTIX P3 area-cluster resolver mirror.

This module is a Python Decimal conformance mirror for the accepted SQL
numeric policy. It does not own an independent cluster taxonomy; callers must
provide the active cluster configuration explicitly.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any, Iterable, Mapping, Sequence


MATCH = "MATCH"
HOLD = "HOLD"

HOLD_NULL_INPUT = "HOLD_NULL_INPUT"
HOLD_INVALID_NUMERIC = "HOLD_INVALID_NUMERIC"
HOLD_WRONG_AREA_SEMANTIC = "HOLD_WRONG_AREA_SEMANTIC"
HOLD_NON_POSITIVE = "HOLD_NON_POSITIVE"
HOLD_BELOW_GLOBAL_MINIMUM = "HOLD_BELOW_GLOBAL_MINIMUM"
HOLD_ABOVE_TERMINAL_MAXIMUM = "HOLD_ABOVE_TERMINAL_MAXIMUM"
HOLD_NO_ACTIVE_CLUSTER = "HOLD_NO_ACTIVE_CLUSTER"
HOLD_CONFIG_INVALID = "HOLD_CONFIG_INVALID"
HOLD_DUPLICATE_MATCH = "HOLD_DUPLICATE_MATCH"
HOLD_NO_MATCH = "HOLD_NO_MATCH"

EXPECTED_AREA_SEMANTIC = "exclusive"
EXPECTED_ACTIVE_CLUSTER_COUNT = 29
TERMINAL_CLUSTER_CODE = "EXCL_260_PLUS"
TERMINAL_MIN = Decimal("260.00")
TERMINAL_MAX = Decimal("999.99")


@dataclass(frozen=True)
class AreaCluster:
    area_cluster_id: int
    area_cluster_code: str
    min_exclusive_area_m2: Decimal
    max_exclusive_area_m2: Decimal
    is_active: bool = True
    display_order: int | None = None


@dataclass(frozen=True)
class DecimalParseResult:
    value: Decimal | None
    match_status: str
    hold_reason: str | None
    raw_text: str | None


@dataclass(frozen=True)
class ClusterConfigValidationResult:
    is_valid: bool
    clusters: tuple[AreaCluster, ...]
    hold_reason: str | None
    detail: str | None = None


@dataclass(frozen=True)
class ResolveResult:
    area_cluster_id: int | None
    area_cluster_code: str | None
    match_status: str
    hold_reason: str | None
    raw_decimal_area: Decimal | None
    detail: str | None = None


def parse_decimal_area(raw_value: Any) -> DecimalParseResult:
    """Parse a source area value without float conversion."""

    if raw_value is None:
        return DecimalParseResult(None, HOLD, HOLD_NULL_INPUT, None)

    if isinstance(raw_value, Decimal):
        return DecimalParseResult(raw_value, MATCH, None, str(raw_value))

    if isinstance(raw_value, bool) or isinstance(raw_value, float):
        return DecimalParseResult(None, HOLD, HOLD_INVALID_NUMERIC, repr(raw_value))

    raw_text = str(raw_value).strip().replace(",", "")
    if not raw_text:
        return DecimalParseResult(None, HOLD, HOLD_INVALID_NUMERIC, raw_text)

    try:
        return DecimalParseResult(Decimal(raw_text), MATCH, None, raw_text)
    except InvalidOperation:
        return DecimalParseResult(None, HOLD, HOLD_INVALID_NUMERIC, raw_text)


def _decimal_from_config(raw_value: Any) -> Decimal | None:
    parsed = parse_decimal_area(raw_value)
    return parsed.value if parsed.match_status == MATCH else None


def _coerce_cluster(row: AreaCluster | Mapping[str, Any]) -> AreaCluster | None:
    if isinstance(row, AreaCluster):
        return row

    def get(*keys: str) -> Any:
        for key in keys:
            if key in row:
                return row[key]
        return None

    cluster_id = get("area_cluster_id", "id")
    code = get("area_cluster_code", "code")
    min_area = _decimal_from_config(get("min_exclusive_area_m2", "min_area"))
    max_area = _decimal_from_config(get("max_exclusive_area_m2", "max_area"))
    display_order = get("display_order")
    is_active = get("is_active")

    if cluster_id in (None, "") or code in (None, "") or min_area is None or max_area is None:
        return None

    try:
        cluster_id_int = int(cluster_id)
    except (TypeError, ValueError):
        return None

    try:
        display_order_int = int(display_order) if display_order not in (None, "") else None
    except (TypeError, ValueError):
        display_order_int = None

    if isinstance(is_active, str):
        active = is_active.strip().lower() not in {"false", "f", "0", "no", "n"}
    elif is_active is None:
        active = True
    else:
        active = bool(is_active)

    return AreaCluster(
        area_cluster_id=cluster_id_int,
        area_cluster_code=str(code),
        min_exclusive_area_m2=min_area,
        max_exclusive_area_m2=max_area,
        is_active=active,
        display_order=display_order_int,
    )


def validate_cluster_config(
    clusters: Iterable[AreaCluster | Mapping[str, Any]],
) -> ClusterConfigValidationResult:
    """Validate the accepted P3 cluster configuration."""

    coerced: list[AreaCluster] = []
    for row in clusters:
        cluster = _coerce_cluster(row)
        if cluster is None:
            return ClusterConfigValidationResult(False, tuple(), HOLD_CONFIG_INVALID, "unparseable cluster row")
        if cluster.is_active:
            coerced.append(cluster)

    if not coerced:
        return ClusterConfigValidationResult(False, tuple(), HOLD_NO_ACTIVE_CLUSTER, "no active clusters")

    ordered = tuple(sorted(coerced, key=lambda item: (item.min_exclusive_area_m2, item.area_cluster_id)))

    if len(ordered) != EXPECTED_ACTIVE_CLUSTER_COUNT:
        return ClusterConfigValidationResult(
            False,
            ordered,
            HOLD_CONFIG_INVALID,
            f"expected {EXPECTED_ACTIVE_CLUSTER_COUNT} active clusters",
        )

    seen_ids: set[int] = set()
    seen_codes: set[str] = set()
    seen_lowers: set[Decimal] = set()
    previous_min: Decimal | None = None

    for cluster in ordered:
        if cluster.area_cluster_id in seen_ids:
            return ClusterConfigValidationResult(False, ordered, HOLD_CONFIG_INVALID, "duplicate cluster id")
        if cluster.area_cluster_code in seen_codes:
            return ClusterConfigValidationResult(False, ordered, HOLD_CONFIG_INVALID, "duplicate cluster code")
        if cluster.min_exclusive_area_m2 in seen_lowers:
            return ClusterConfigValidationResult(False, ordered, HOLD_CONFIG_INVALID, "duplicate lower bound")
        if cluster.min_exclusive_area_m2 <= Decimal("0"):
            return ClusterConfigValidationResult(False, ordered, HOLD_CONFIG_INVALID, "non-positive lower bound")
        if cluster.max_exclusive_area_m2 < cluster.min_exclusive_area_m2:
            return ClusterConfigValidationResult(False, ordered, HOLD_CONFIG_INVALID, "inverted cluster range")
        if previous_min is not None and cluster.min_exclusive_area_m2 <= previous_min:
            return ClusterConfigValidationResult(False, ordered, HOLD_CONFIG_INVALID, "non-increasing lower bound")
        previous_min = cluster.min_exclusive_area_m2
        seen_ids.add(cluster.area_cluster_id)
        seen_codes.add(cluster.area_cluster_code)
        seen_lowers.add(cluster.min_exclusive_area_m2)

    terminal = ordered[-1]
    if (
        terminal.area_cluster_code != TERMINAL_CLUSTER_CODE
        or terminal.min_exclusive_area_m2 != TERMINAL_MIN
        or terminal.max_exclusive_area_m2 != TERMINAL_MAX
    ):
        return ClusterConfigValidationResult(False, ordered, HOLD_CONFIG_INVALID, "terminal contract mismatch")

    return ClusterConfigValidationResult(True, ordered, None, None)


def _hold(reason: str, raw_area: Decimal | None, detail: str | None = None) -> ResolveResult:
    return ResolveResult(None, None, HOLD, reason, raw_area, detail)


def resolve_area_cluster_p3(
    raw_exclusive_area_m2: Any,
    area_semantic: str | None,
    clusters: Sequence[AreaCluster | Mapping[str, Any]],
) -> ResolveResult:
    """Resolve an exclusive-area value with the accepted P3 formula."""

    if area_semantic != EXPECTED_AREA_SEMANTIC:
        return _hold(HOLD_WRONG_AREA_SEMANTIC, None)

    parsed = parse_decimal_area(raw_exclusive_area_m2)
    if parsed.match_status != MATCH:
        return _hold(parsed.hold_reason or HOLD_INVALID_NUMERIC, None)

    raw_area = parsed.value
    assert raw_area is not None

    if raw_area <= Decimal("0"):
        return _hold(HOLD_NON_POSITIVE, raw_area)

    validation = validate_cluster_config(clusters)
    if not validation.is_valid:
        return _hold(validation.hold_reason or HOLD_CONFIG_INVALID, raw_area, validation.detail)

    ordered = validation.clusters
    global_min = ordered[0].min_exclusive_area_m2
    terminal = ordered[-1]

    if raw_area < global_min:
        return _hold(HOLD_BELOW_GLOBAL_MINIMUM, raw_area)
    if raw_area > terminal.max_exclusive_area_m2:
        return _hold(HOLD_ABOVE_TERMINAL_MAXIMUM, raw_area)

    matches: list[AreaCluster] = []
    for index, cluster in enumerate(ordered):
        next_min = ordered[index + 1].min_exclusive_area_m2 if index + 1 < len(ordered) else None
        if next_min is None:
            if (
                cluster.area_cluster_code == TERMINAL_CLUSTER_CODE
                and raw_area >= cluster.min_exclusive_area_m2
                and raw_area <= cluster.max_exclusive_area_m2
            ):
                matches.append(cluster)
        elif raw_area >= cluster.min_exclusive_area_m2 and raw_area < next_min:
            matches.append(cluster)

    if len(matches) > 1:
        return _hold(HOLD_DUPLICATE_MATCH, raw_area)
    if not matches:
        return _hold(HOLD_NO_MATCH, raw_area)

    match = matches[0]
    return ResolveResult(
        area_cluster_id=match.area_cluster_id,
        area_cluster_code=match.area_cluster_code,
        match_status=MATCH,
        hold_reason=None,
        raw_decimal_area=raw_area,
    )
