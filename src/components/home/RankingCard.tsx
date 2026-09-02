"use client";

import { formatMarketCapKrw } from "../../lib/formatters";
import type { RankMovement, RankingItem } from "../../lib/koaptix/types";

interface RankingCardProps {
  item: RankingItem;
  isBookmarked?: boolean;
  onToggleBookmark?: (complexId: string) => void;
  onClick?: () => void;
  onCompare?: (e: React.MouseEvent) => void;
  isCompared?: boolean;
  variant?: "default" | "full-board";
  currentSnapshotDate?: string | null;
}

type RankingItemWeeklyMeta = {
  rankMovement?: string | null;
  previousRankAll?: number | null;
};

function getAuthoritativeMovement(item: RankingItem): RankMovement | null {
  const value = item.rankMovement ?? item.rank_movement;
  if (value === "NEW" || value === "UP" || value === "DOWN" || value === "SAME") {
    return value;
  }

  return null;
}

function toUtcDateOnly(value: string | null | undefined): number | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const timestamp = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isExactWeeklyWindow(
  previousSnapshotDate: string | null | undefined,
  currentSnapshotDate: string | null | undefined,
) {
  const previous = toUtcDateOnly(previousSnapshotDate);
  const current = toUtcDateOnly(currentSnapshotDate);
  return previous !== null && current !== null && current - previous === 7 * 86_400_000;
}

function formatSignedWeeklyPercent(value: number) {
  if (value > 0) return `+${value.toFixed(1)}% W`;
  if (value < 0) return `${value.toFixed(1)}% W`;
  return "0.0% W";
}

export function RankingCard({
  item,
  isBookmarked,
  onToggleBookmark,
  onClick,
  onCompare,
  isCompared,
  variant = "default",
  currentSnapshotDate = null,
}: RankingCardProps) {
  const weeklyMeta = item as RankingItem & RankingItemWeeklyMeta;

  const hasWeeklyDelta = typeof item.rankDelta7d === "number";
  const isUp = typeof item.rankDelta7d === "number" && item.rankDelta7d > 0;
  const isDown = typeof item.rankDelta7d === "number" && item.rankDelta7d < 0;
  const isNew = weeklyMeta.rankMovement === "NEW" && !hasWeeklyDelta;

  const momentumText = isNew
    ? "NEW"
    : isUp
      ? `▲ ${item.rankDelta7d ?? 0}`
      : isDown
        ? `▼ ${Math.abs(item.rankDelta7d ?? 0)}`
        : "—";

  const momentumColor = isNew
    ? "text-cyan-400"
    : isUp
      ? "text-emerald-500"
      : isDown
        ? "text-rose-500"
        : "text-slate-500";

  const weeklyHint =
    isNew || (!hasWeeklyDelta && weeklyMeta.previousRankAll == null)
      ? "최근 7일 비교 기준 데이터 없음"
      : null;

  const locationText =
    item.sigunguName && item.legalDongName
      ? `${item.sigunguName} ${item.legalDongName}`
      : item.sigunguName
        ? item.sigunguName
        : item.legalDongName
          ? `위치 정보 보강 중 · ${item.legalDongName}`
          : "위치 정보 없음";

  if (variant === "full-board") {
    const movement = getAuthoritativeMovement(item);
    const previousRank = item.previousRankAll ?? item.previous_rank_all ?? null;
    const rankDelta =
      typeof item.rankDelta7d === "number"
        ? item.rankDelta7d
        : typeof item.rank_delta_w === "number"
          ? item.rank_delta_w
          : null;
    const movementContext =
      movement === "NEW"
        ? `Current #${item.rank}`
        : previousRank !== null
          ? `Previous #${previousRank} → Current #${item.rank}`
          : `Current #${item.rank}`;
    const movementLabel =
      movement === "NEW"
        ? "NEW"
        : movement === "SAME"
          ? "SAME"
          : movement === "UP"
            ? rankDelta !== null && rankDelta > 0
              ? `▲ +${rankDelta}`
              : "▲ UP"
            : movement === "DOWN"
              ? rankDelta !== null && rankDelta < 0
                ? `▼ ${rankDelta}`
                : "▼ DOWN"
              : "UNAVAILABLE";
    const movementTone =
      movement === "NEW"
        ? "border-cyan-400/35 bg-cyan-500/10 text-cyan-200"
        : movement === "UP"
          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
          : movement === "DOWN"
            ? "border-rose-400/30 bg-rose-500/10 text-rose-300"
            : movement === "SAME"
              ? "border-slate-600 bg-slate-800/50 text-slate-300"
              : "border-slate-800 bg-slate-900/50 text-slate-500";
    const previousSnapshotDate = item.historySnapshotDate ?? null;
    const weeklyCapPercent =
      typeof item.marketCapDeltaPct7d === "number" &&
      Number.isFinite(item.marketCapDeltaPct7d) &&
      isExactWeeklyWindow(previousSnapshotDate, currentSnapshotDate)
        ? item.marketCapDeltaPct7d
        : null;

    return (
      <div
        onClick={onClick}
        data-testid="ranking-card"
        data-ranking-card-variant="full-board"
        data-complex-id={item.complexId}
        data-universe-code={item.universeCode ?? item.universe_code ?? ""}
        data-rank-movement={movement ?? "UNKNOWN"}
        data-previous-rank={previousRank ?? ""}
        data-current-rank={item.rank}
        data-weekly-cap-available={weeklyCapPercent !== null ? "true" : "false"}
        className="group relative cursor-pointer rounded-xl border border-slate-800/80 bg-white/[0.025] p-3 transition-all duration-200 hover:border-cyan-500/35 hover:bg-cyan-500/[0.035] hover:shadow-[0_0_24px_rgba(34,211,238,0.08)] sm:p-4"
      >
        <div className="grid min-w-0 grid-cols-[56px_minmax(0,1fr)_auto] gap-x-3 gap-y-2 lg:grid-cols-[72px_minmax(220px,1fr)_minmax(390px,1.25fr)_auto] lg:items-center">
          <div className="col-start-1 row-span-3 row-start-1 flex min-h-14 items-start justify-center border-r border-slate-800/80 pr-3 lg:row-span-2 lg:items-center">
            <span className="font-mono text-xl font-bold tabular-nums text-white transition-colors group-hover:text-cyan-300 sm:text-2xl">
              #{item.rank}
            </span>
          </div>

          <div className="col-start-2 row-start-1 min-w-0 lg:col-start-2">
            <div className="flex min-w-0 items-center gap-2">
              {onToggleBookmark && (
                <button
                  type="button"
                  aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleBookmark(item.complexId);
                  }}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm transition-all hover:scale-105 ${
                    isBookmarked
                      ? "text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]"
                      : "text-slate-600 hover:text-yellow-300"
                  }`}
                >
                  {isBookmarked ? "★" : "☆"}
                </button>
              )}
              <h3 className="min-w-0 line-clamp-2 break-words text-sm font-bold text-slate-100 transition-colors [overflow-wrap:anywhere] group-hover:text-white sm:line-clamp-1 sm:text-base">
                {item.name}
              </h3>
            </div>
          </div>

          {onCompare && (
            <button
              type="button"
              onClick={onCompare}
              className={`col-start-3 row-start-1 flex h-8 min-w-9 items-center justify-center rounded-lg border px-2 text-[10px] font-bold transition-all lg:col-start-4 ${
                isCompared
                  ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-300"
                  : "border-slate-800 text-slate-500 hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300"
              }`}
              title="비교함에 담기"
            >
              VS
            </button>
          )}

          <div className="col-span-2 col-start-2 row-start-2 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:col-span-1 lg:col-start-3 lg:row-start-1">
            <div className="rounded-lg border border-slate-800 bg-black/20 px-3 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Estimated market cap
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-slate-100 sm:text-base">
                {formatMarketCapKrw(item.marketCapKrw)}
              </p>
              {weeklyCapPercent !== null && (
                <p
                  className={`mt-1 text-xs font-bold tabular-nums ${
                    weeklyCapPercent > 0
                      ? "text-emerald-300"
                      : weeklyCapPercent < 0
                        ? "text-rose-300"
                        : "text-slate-400"
                  }`}
                  data-testid="ranking-weekly-cap-movement"
                  title={`${previousSnapshotDate} → ${currentSnapshotDate}`}
                >
                  {formatSignedWeeklyPercent(weeklyCapPercent)}
                </p>
              )}
            </div>

            <div
              className={`rounded-lg border px-3 py-2 ${movementTone}`}
              data-testid="ranking-weekly-rank-movement"
            >
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] opacity-70">
                Weekly rank movement
              </p>
              <p className="mt-1 truncate text-[11px] font-medium tabular-nums opacity-80 sm:text-xs">
                {movementContext}
              </p>
              <p className="mt-1 text-sm font-extrabold tabular-nums sm:text-base">
                {movementLabel}
              </p>
            </div>
          </div>

          <p className="col-span-2 col-start-2 row-start-3 truncate text-[11px] text-slate-500 sm:text-xs lg:col-span-2 lg:col-start-2 lg:row-start-2">
            {locationText}
          </p>
        </div>

        {item.recoveryRate52w != null && (
          <div className="mt-3 flex items-center gap-2 border-t border-slate-800/60 pt-2 opacity-60 transition-opacity group-hover:opacity-90">
            <span className="text-[9px] uppercase tracking-wider text-slate-500">
              52W Rec
            </span>
            <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-emerald-500/60 transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, item.recoveryRate52w))}%`,
                }}
              />
            </div>
            <span className="text-[9px] font-medium text-slate-400">
              {item.recoveryRate52w.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      data-testid="ranking-card"
      data-complex-id={item.complexId}
      data-universe-code={item.universeCode ?? item.universe_code ?? ""}
      className="group relative flex cursor-pointer flex-col justify-center rounded-xl border border-transparent bg-white/[0.02] p-3 transition-all duration-300 hover:border-cyan-500/30 hover:bg-cyan-500/[0.03] hover:shadow-[0_0_20px_rgba(34,211,238,0.1)] sm:p-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex w-8 shrink-0 justify-center">
          <span className="font-mono text-lg font-bold text-slate-400 transition-colors group-hover:text-cyan-400 sm:text-xl">
            {item.rank}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            {onToggleBookmark && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(item.complexId);
                }}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-sm transition-all hover:scale-110 ${
                  isBookmarked
                    ? "text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]"
                    : "text-slate-600 hover:text-yellow-400/50"
                }`}
              >
                {isBookmarked ? "★" : "☆"}
              </button>
            )}
            <h3 className="truncate text-sm font-bold text-slate-100 transition-colors group-hover:text-white sm:text-base">
              {item.name}
            </h3>
          </div>

          <p className="truncate pl-8 text-[11px] text-slate-400 sm:text-xs">
            {locationText}
          </p>

          {weeklyHint && (
            <p className="truncate pl-8 pt-1 text-[10px] text-slate-500 sm:text-[11px]">
              {weeklyHint}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end text-right">
          <span className="text-sm font-semibold tabular-nums text-slate-200 transition-colors group-hover:text-white sm:text-base">
            {formatMarketCapKrw(item.marketCapKrw)}
          </span>
          <span className={`mt-0.5 text-[11px] font-bold sm:text-xs ${momentumColor}`}>
            {momentumText}
          </span>
        </div>

        {onCompare && (
          <div className="ml-1 shrink-0 border-l border-white/5 pl-3 transition-colors group-hover:border-white/10">
            <button
              onClick={onCompare}
              className={`flex h-8 min-w-[32px] items-center justify-center rounded-lg border px-2 text-[10px] font-bold transition-all ${
                isCompared
                  ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                  : "border-transparent bg-transparent text-slate-500 hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-400 group-hover:border-cyan-500/30 group-hover:bg-cyan-500/10 group-hover:text-cyan-400"
              }`}
              title="비교함에 담기"
            >
              VS
            </button>
          </div>
        )}
      </div>

      {item.recoveryRate52w != null && (
        <div className="mt-3 flex items-center gap-2 px-1 opacity-70 transition-opacity group-hover:opacity-100">
          <span className="text-[9px] uppercase tracking-wider text-slate-500">52W Rec</span>
          <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-emerald-500/60 transition-all"
              style={{ width: `${Math.min(100, Math.max(0, item.recoveryRate52w))}%` }}
            />
          </div>
          <span className="text-[9px] font-medium text-slate-400">
            {item.recoveryRate52w.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
