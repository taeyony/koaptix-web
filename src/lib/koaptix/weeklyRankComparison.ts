import type { RankMovement, RankingItem, WeeklyRankComparison } from "./types";

export type CommonRankSourceRow = {
  complex_id: string | number | null;
  rank_all: string | number | null;
  previous_rank_all?: string | number | null;
  source_previous_snapshot_date?: string | null;
};

export function previousWeekDate(snapshotDate: string): string {
  const date = new Date(snapshotDate + "T00:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshotDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== snapshotDate) {
    throw new Error("Invalid comparison date");
  }
  date.setUTCDate(date.getUTCDate() - 7);
  return date.toISOString().slice(0, 10);
}

/** A separate ordinal comparison. Never changes a published rank or value. */
export function buildCommonRankComparisons(rows: readonly CommonRankSourceRow[], expectedCount: number, snapshotDate: string) {
  if (!Number.isSafeInteger(expectedCount) || expectedCount < 1 || rows.length !== expectedCount) {
    throw new Error("Incomplete current rank population");
  }
  const previousSnapshotDate = previousWeekDate(snapshotDate);
  const ids = new Set<string>();
  const previousRanks = new Set<number>();
  const ordered = [...rows].sort((a, b) => Number(a.rank_all) - Number(b.rank_all));
  const common: { id: string; previousRank: number }[] = [];
  ordered.forEach((row, index) => {
    const id = String(row.complex_id ?? "");
    const rank = Number(row.rank_all);
    if (!/^[1-9]\d*$/.test(id) || ids.has(id) || rank !== index + 1) throw new Error("Invalid or duplicate current rank");
    ids.add(id);
    if (row.previous_rank_all == null) return;
    const previousRank = Number(row.previous_rank_all);
    if (!Number.isSafeInteger(previousRank) || previousRank < 1 || previousRanks.has(previousRank) || row.source_previous_snapshot_date !== previousSnapshotDate) {
      throw new Error("Invalid exact weekly predecessor");
    }
    previousRanks.add(previousRank);
    common.push({ id, previousRank });
  });
  const previousPositions = new Map([...common].sort((a, b) => a.previousRank - b.previousRank).map((row, i) => [row.id, i + 1]));
  const comparisons = new Map<string, WeeklyRankComparison>();
  common.forEach((row, i) => {
    const currentRank = i + 1;
    const previousRank = previousPositions.get(row.id)!;
    comparisons.set(row.id, { currentRank, previousRank, delta: previousRank - currentRank, cohortSize: common.length, previousSnapshotDate });
  });
  return { comparisons, commonComplexCount: common.length, currentPublishedCount: rows.length, previousSnapshotDate };
}

/** Missing/invalid common-cohort data must never fall back to absolute-rank deltas. */
export function commonRankDelta(item: Pick<RankingItem, "snapshotDate" | "weeklyRankComparison">): number | null {
  const comparison = item.weeklyRankComparison;
  if (!comparison || !item.snapshotDate) return null;
  try {
    if (comparison.previousSnapshotDate !== previousWeekDate(item.snapshotDate)) return null;
  } catch { return null; }
  const { currentRank, previousRank, cohortSize, delta } = comparison;
  return [currentRank, previousRank, cohortSize].every(value => Number.isSafeInteger(value) && value > 0) &&
    currentRank <= cohortSize && previousRank <= cohortSize && Number.isSafeInteger(delta) && delta === previousRank - currentRank ? delta : null;
}

export function commonRankTransition(item: Pick<RankingItem, "snapshotDate" | "weeklyRankComparison">): string | null {
  if (commonRankDelta(item) === null) return null;
  const value = item.weeklyRankComparison!;
  return `공통 ${value.cohortSize.toLocaleString("ko-KR")}개 내 ${value.previousRank.toLocaleString("ko-KR")}위 → ${value.currentRank.toLocaleString("ko-KR")}위`;
}

export function commonRankMovement(item: Pick<RankingItem, "snapshotDate" | "weeklyRankComparison" | "rankMovement" | "rank_movement">): RankMovement | null {
  const delta = commonRankDelta(item);
  if (delta !== null) return delta > 0 ? "UP" : delta < 0 ? "DOWN" : "SAME";
  // Preserve the existing NEW filter without inventing a change from zero.
  return (item.rankMovement ?? item.rank_movement) === "NEW" ? "NEW" : null;
}

/** A review flag, not evidence of an erroneous price and not an exclusion rule. */
export function needsMarketCapReview(item: Pick<RankingItem, "marketCapDeltaPct7d">): boolean {
  return typeof item.marketCapDeltaPct7d === "number" && Number.isFinite(item.marketCapDeltaPct7d) && Math.abs(item.marketCapDeltaPct7d) >= 30;
}
