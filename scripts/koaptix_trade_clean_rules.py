"""Pure clean-rule helpers for KOAPTIX MOLIT 2023 dry-run planning.

This module has no database, filesystem, or environment side effects.
"""

from __future__ import annotations

from dataclasses import dataclass

from koaptix_molit_2023_match_rules import (
    AMBIGUOUS_CANDIDATE,
    CANCELED_EXCLUDED,
    DUPLICATE_RAW_NATURAL_KEY,
    INVALID_FIELD,
    NO_COMPLEX_CANDIDATE,
    UNIQUE_ALIAS_MATCH,
    UNIQUE_APT_COMPLEX_FALLBACK,
    UNIQUE_COMPLEX_NO_AREA_CLUSTER,
    MatchRuleResult,
)


CLEAN_ELIGIBLE_COMPLEX_AREA_VALID_NONCANCELED = (
    "CLEAN_ELIGIBLE_COMPLEX_AREA_VALID_NONCANCELED"
)
NOT_CLEAN_NO_AREA_CLUSTER = "NOT_CLEAN_NO_AREA_CLUSTER"
NOT_CLEAN_AMBIGUOUS = "NOT_CLEAN_AMBIGUOUS"
NOT_CLEAN_NO_CANDIDATE = "NOT_CLEAN_NO_CANDIDATE"
NOT_CLEAN_CANCELED = "NOT_CLEAN_CANCELED"
NOT_CLEAN_INVALID = "NOT_CLEAN_INVALID"
NOT_CLEAN_DUPLICATE = "NOT_CLEAN_DUPLICATE"
NOT_CLEAN_OUTLIER_REVIEW = "NOT_CLEAN_OUTLIER_REVIEW"

CLEAN_CLASSIFICATIONS = (
    CLEAN_ELIGIBLE_COMPLEX_AREA_VALID_NONCANCELED,
    NOT_CLEAN_NO_AREA_CLUSTER,
    NOT_CLEAN_AMBIGUOUS,
    NOT_CLEAN_NO_CANDIDATE,
    NOT_CLEAN_CANCELED,
    NOT_CLEAN_INVALID,
    NOT_CLEAN_DUPLICATE,
    NOT_CLEAN_OUTLIER_REVIEW,
)


@dataclass(frozen=True)
class CleanRuleInput:
    match_result: MatchRuleResult
    has_outlier_review_signal: bool = False


@dataclass(frozen=True)
class CleanRuleResult:
    classification: str
    is_clean_eligible: bool
    hold_reason: str | None


def classify_clean_evidence(evidence: CleanRuleInput) -> CleanRuleResult:
    """Classify clean eligibility while preserving match provenance."""

    match_classification = evidence.match_result.classification

    if match_classification == CANCELED_EXCLUDED:
        return CleanRuleResult(NOT_CLEAN_CANCELED, False, "canceled")
    if match_classification == INVALID_FIELD:
        return CleanRuleResult(NOT_CLEAN_INVALID, False, "invalid_required_field")
    if match_classification == DUPLICATE_RAW_NATURAL_KEY:
        return CleanRuleResult(NOT_CLEAN_DUPLICATE, False, "duplicate_source_key")
    if match_classification == AMBIGUOUS_CANDIDATE:
        return CleanRuleResult(NOT_CLEAN_AMBIGUOUS, False, "ambiguous_complex_candidate")
    if match_classification == NO_COMPLEX_CANDIDATE:
        return CleanRuleResult(NOT_CLEAN_NO_CANDIDATE, False, "no_complex_candidate")
    if match_classification == UNIQUE_COMPLEX_NO_AREA_CLUSTER:
        return CleanRuleResult(
            NOT_CLEAN_NO_AREA_CLUSTER,
            False,
            "unique_complex_no_area_cluster_support",
        )
    if evidence.has_outlier_review_signal:
        return CleanRuleResult(NOT_CLEAN_OUTLIER_REVIEW, False, "outlier_review_signal")
    if match_classification in (UNIQUE_ALIAS_MATCH, UNIQUE_APT_COMPLEX_FALLBACK):
        return CleanRuleResult(
            CLEAN_ELIGIBLE_COMPLEX_AREA_VALID_NONCANCELED,
            True,
            None,
        )
    return CleanRuleResult(NOT_CLEAN_INVALID, False, "unrecognized_match_classification")
