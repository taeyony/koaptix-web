"use client";

import type { RankingItem } from "../../lib/koaptix/types";

interface RankingCardProps {
  item: RankingItem;
  isBookmarked?: boolean;
  onToggleBookmark?: (complexId: string) => void;
  onClick?: () => void;
  onCompare?: (e: React.MouseEvent) => void;
  isCompared?: boolean;
}

type RankingItemWeeklyMeta = {
  rankMovement?: string | null;
  previousRankAll?: number | null;
};

export function RankingCard({
  item,
  isBookmarked,
  onToggleBookmark,
  onClick,
  onCompare,
  isCompared,
}: RankingCardProps) {
  const weeklyMeta = item as RankingItem & RankingItemWeeklyMeta;

  const hasWeeklyDelta = typeof item.rankDelta7d === "number";
  const isUp = hasWeeklyDelta && item.rankDelta7d > 0;
  const isDown = hasWeeklyDelta && item.rankDelta7d < 0;
  const isNew = weeklyMeta.rankMovement === "NEW" && !hasWeeklyDelta;

  const momentumText = isNew
    ? "NEW"
    : isUp
      ? `▲ ${item.rankDelta7d}`
      : isDown
        ? `▼ ${Math.abs(item.rankDelta7d)}`
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
            {item.marketCapTrillionKrw?.toFixed(2)}조
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
