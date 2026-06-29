"""Pure match-rule helpers for KOAPTIX MOLIT 2023 dry-run planning.

This module has no database, filesystem, or environment side effects.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any


UNIQUE_ALIAS_MATCH = "UNIQUE_ALIAS_MATCH"
UNIQUE_APT_COMPLEX_FALLBACK = "UNIQUE_APT_COMPLEX_FALLBACK"
AMBIGUOUS_CANDIDATE = "AMBIGUOUS_CANDIDATE"
NO_COMPLEX_CANDIDATE = "NO_COMPLEX_CANDIDATE"
UNIQUE_COMPLEX_NO_AREA_CLUSTER = "UNIQUE_COMPLEX_NO_AREA_CLUSTER"
CANCELED_EXCLUDED = "CANCELED_EXCLUDED"
INVALID_FIELD = "INVALID_FIELD"
DUPLICATE_RAW_NATURAL_KEY = "DUPLICATE_RAW_NATURAL_KEY"
HOLD_REVIEW = "HOLD_REVIEW"

MATCH_CLASSIFICATIONS = (
    UNIQUE_ALIAS_MATCH,
    UNIQUE_APT_COMPLEX_FALLBACK,
    AMBIGUOUS_CANDIDATE,
    NO_COMPLEX_CANDIDATE,
    UNIQUE_COMPLEX_NO_AREA_CLUSTER,
    CANCELED_EXCLUDED,
    INVALID_FIELD,
    DUPLICATE_RAW_NATURAL_KEY,
    HOLD_REVIEW,
)


@dataclass(frozen=True)
class MatchRuleInput:
    """Sanitized raw-row evidence needed for deterministic match classification."""

    is_canceled: bool
    has_invalid_required_field: bool
    duplicate_source_key: bool
    alias_candidate_count: int
    apt_complex_candidate_count: int
    has_area_cluster_support: bool


@dataclass(frozen=True)
class MatchRuleResult:
    classification: str
    candidate_method: str | None
    selected_candidate_count: int
    is_unique_complex_candidate: bool
    is_clean_candidate_source: bool
    hold_reason: str | None


def decimal_to_canonical_string(value: Any) -> str | None:
    """Return a stable string for Decimal-like values without rounding."""

    if value is None:
        return None
    try:
        dec = value if isinstance(value, Decimal) else Decimal(str(value))
    except (InvalidOperation, ValueError):
        return str(value)
    if dec == dec.to_integral():
        return str(dec.quantize(Decimal("1")))
    return format(dec.normalize(), "f")


def classify_match_evidence(evidence: MatchRuleInput) -> MatchRuleResult:
    """Classify a raw trade's complex/area evidence without mutating state."""

    if evidence.is_canceled:
        return MatchRuleResult(
            classification=CANCELED_EXCLUDED,
            candidate_method=None,
            selected_candidate_count=0,
            is_unique_complex_candidate=False,
            is_clean_candidate_source=False,
            hold_reason="canceled",
        )
    if evidence.has_invalid_required_field:
        return MatchRuleResult(
            classification=INVALID_FIELD,
            candidate_method=None,
            selected_candidate_count=0,
            is_unique_complex_candidate=False,
            is_clean_candidate_source=False,
            hold_reason="invalid_required_field",
        )
    if evidence.duplicate_source_key:
        return MatchRuleResult(
            classification=DUPLICATE_RAW_NATURAL_KEY,
            candidate_method=None,
            selected_candidate_count=0,
            is_unique_complex_candidate=False,
            is_clean_candidate_source=False,
            hold_reason="duplicate_source_key",
        )

    if evidence.alias_candidate_count > 0:
        method = "alias_name_norm_lawd_unique"
        candidate_count = evidence.alias_candidate_count
        unique_classification = UNIQUE_ALIAS_MATCH
    else:
        method = "apt_name_norm_lawd_unique"
        candidate_count = evidence.apt_complex_candidate_count
        unique_classification = UNIQUE_APT_COMPLEX_FALLBACK

    if candidate_count == 0:
        return MatchRuleResult(
            classification=NO_COMPLEX_CANDIDATE,
            candidate_method=None,
            selected_candidate_count=0,
            is_unique_complex_candidate=False,
            is_clean_candidate_source=False,
            hold_reason="no_complex_candidate",
        )
    if candidate_count > 1:
        return MatchRuleResult(
            classification=AMBIGUOUS_CANDIDATE,
            candidate_method=method,
            selected_candidate_count=candidate_count,
            is_unique_complex_candidate=False,
            is_clean_candidate_source=False,
            hold_reason="ambiguous_complex_candidate",
        )
    if not evidence.has_area_cluster_support:
        return MatchRuleResult(
            classification=UNIQUE_COMPLEX_NO_AREA_CLUSTER,
            candidate_method=method,
            selected_candidate_count=1,
            is_unique_complex_candidate=True,
            is_clean_candidate_source=False,
            hold_reason="unique_complex_no_area_cluster_support",
        )
    return MatchRuleResult(
        classification=unique_classification,
        candidate_method=method,
        selected_candidate_count=1,
        is_unique_complex_candidate=True,
        is_clean_candidate_source=True,
        hold_reason=None,
    )
