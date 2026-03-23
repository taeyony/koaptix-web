"use client";

import type { RankingItem } from "../../lib/koaptix/types";

function formatMarketCapKrw(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }

  const TRILLION = 1_000_000_000_000;
  const HUNDRED_MILLION = 100_000_000;

  if (value >= TRILLION) {
    const amount = value / TRILLION;
    const digits = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
    return `${amount.toFixed(digits)}조원`;
  }

  if (value >= HUNDRED_MILLION) {
    const amount = value / HUNDRED_MILLION;
    const digits = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
    return `${amount.toFixed(digits)}억원`;
  }

  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

function formatPercent(value: number): string {
  if (value > 0) return `+${value.toFixed(2)}%`;
  if (value < 0) return `${value.toFixed(2)}%`;
  return "0.00%";
}

function getRankDeltaTone(delta: number): string {
  if (delta > 0) return "text-emerald-400";
  if (delta < 0) return "text-rose-400";
  return "text-white/45";
}

function getMomentumTone(value: number): string {
  if (value > 0) return "text-cyan-200";
  if (value < 0) return "text-fuchsia-200";
  return "text-white/45";
}

function formatRankDelta(delta: number): string {
  if (delta > 0) return `▲ +${delta}`;
  if (delta < 0) return `▼ ${delta}`;
  return "— 0";
}

export function RankingCard({ item }: { item: RankingItem }) {
  const locationLabel = item.locationLabel || "위치 정보 없음";
  const rankDeltaTone = getRankDeltaTone(item.rankDelta7d);
  const momentumTone = getMomentumTone(item.marketCapDeltaPct7d);

  return (
    <article className="grid grid-cols-[44px_minmax(0,1fr)_auto] gap-3 rounded-xl border border-white/6 bg-white/[0.03] p-3 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:gap-4 sm:p-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-sm font-semibold text-cyan-200 tabular-nums sm:h-12 sm:w-12 sm:text-base">
        #{item.rank}
      </div>

      <div className="min-w-0">
        <h3 className="truncate text-[15px] font-semibold tracking-tight sm:text-base">
          {item.name}
        </h3>
        <p className="mt-1 truncate text-xs leading-5 text-white/45 sm:text-sm">
          {locationLabel}
        </p>
      </div>

      <div className="text-right tabular-nums">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/45 sm:text-[11px]">
          Market Cap
        </p>
        <p className="mt-1 text-[15px] font-semibold sm:text-base">
          {formatMarketCapKrw(item.marketCapKrw)}
        </p>
        <p className={`mt-1 text-xs font-medium sm:text-sm ${rankDeltaTone}`}>
          주간 순위 변동 {formatRankDelta(item.rankDelta7d)}
        </p>
        <p className={`mt-1 text-[11px] font-medium sm:text-xs ${momentumTone}`}>
          Momentum (W) {formatPercent(item.marketCapDeltaPct7d)}
        </p>
      </div>
    </article>
  );
}