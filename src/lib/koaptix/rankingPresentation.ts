import type { RankingItem } from "./types";
import { commonRankDelta } from "./weeklyRankComparison";

const integerFormat = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const percentFormat = new Intl.NumberFormat("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type RankingSort = "rank" | "rank-up" | "rank-down" | "cap-up" | "cap-down";
export function parseRankingSort(value: string | null | undefined): RankingSort {
  return value === "rank-up" || value === "rank-down" || value === "cap-up" || value === "cap-down" ? value : "rank";
}

/** Sort existing values only; missing comparisons are last, never zero. */
export function sortRankingItems(items: readonly RankingItem[], sort: RankingSort): RankingItem[] {
  const value = (item: RankingItem): number | null => {
    if (sort === "rank") return item.rank;
    if (sort.startsWith("rank-") && "weeklyRankComparison" in item) return commonRankDelta(item);
    if (!item.snapshotDate || !item.historySnapshotDate ||
      new Date(item.snapshotDate + "T00:00:00Z").getTime() - new Date(item.historySnapshotDate + "T00:00:00Z").getTime() !== 7 * 86_400_000) return null;
    const delta = sort.startsWith("cap-") ? item.marketCapDeltaPct7d : item.rankDelta7d;
    return typeof delta === "number" && Number.isFinite(delta) ? delta : null;
  };
  return [...items].sort((a, b) => {
    const left = value(a), right = value(b);
    if (left === null && right !== null) return 1;
    if (right === null && left !== null) return -1;
    const direction = sort === "rank-up" || sort === "cap-up" ? -1 : 1;
    return (left !== null && right !== null ? (left - right) * direction : 0) || a.rank - b.rank || a.complexId.localeCompare(b.complexId);
  });
}

export function formatRankMovement(delta: number | null | undefined): string {
  if (typeof delta !== "number" || !Number.isSafeInteger(delta)) return "순위 비교 자료 없음";
  if (delta === 0) return "순위 변동 없음";
  return `${delta > 0 ? "▲" : "▼"} 순위 ${integerFormat.format(Math.abs(delta))}계단 ${delta > 0 ? "상승" : "하락"}`;
}

export function formatMarketCapMovement(deltaPct: number | null | undefined): string {
  if (typeof deltaPct !== "number" || !Number.isFinite(deltaPct)) return "시총 비교 자료 없음";
  if (deltaPct === 0) return "시총 변동 없음 (0.00%)";
  return `시총 ${deltaPct > 0 ? "▲ +" : "▼ −"}${percentFormat.format(Math.abs(deltaPct))}%`;
}

export function formatRankTransition(item: Pick<RankingItem, "previousRankAll" | "rank">): string | null {
  return Number.isSafeInteger(item.previousRankAll) && item.previousRankAll! > 0 && Number.isSafeInteger(item.rank) && item.rank > 0
    ? `${integerFormat.format(item.previousRankAll!)}위 → ${integerFormat.format(item.rank)}위`
    : null;
}

/** Present only the existing published values for the selected board/date. */
export function selectMovementHighlights(items: readonly RankingItem[], snapshotDate: string | null, basis: "published" | "common" = "published"): RankingItem[] {
  if (!snapshotDate) return [];
  if (basis === "common") return items.filter(item => item.snapshotDate === snapshotDate && commonRankDelta(item) !== null &&
    (commonRankDelta(item) !== 0 || (typeof item.marketCapDeltaPct7d === "number" && Number.isFinite(item.marketCapDeltaPct7d) && item.marketCapDeltaPct7d !== 0)))
    .sort((a, b) => Math.abs(commonRankDelta(b) ?? 0) - Math.abs(commonRankDelta(a) ?? 0) || a.rank - b.rank).slice(0, 8);
  return items
    .filter(item => item.snapshotDate === snapshotDate && typeof item.historySnapshotDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(item.historySnapshotDate) &&
      new Date(snapshotDate + "T00:00:00Z").getTime() - new Date(item.historySnapshotDate + "T00:00:00Z").getTime() === 7 * 86_400_000 &&
      ((typeof item.rankDelta7d === "number" && Number.isSafeInteger(item.rankDelta7d) && item.rankDelta7d !== 0) ||
       (typeof item.marketCapDeltaPct7d === "number" && Number.isFinite(item.marketCapDeltaPct7d) && item.marketCapDeltaPct7d !== 0)))
    .sort((a, b) => Math.abs(b.rankDelta7d ?? 0) - Math.abs(a.rankDelta7d ?? 0) || a.rank - b.rank)
    .slice(0, 8);
}
