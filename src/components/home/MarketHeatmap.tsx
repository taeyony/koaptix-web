"use client";

import type { KeyboardEvent } from "react";
import type { RankingItem } from "../../lib/koaptix/types";

type DistrictBucket = {
  name: string;
  totalMarketCap: number;
  averageDelta: number;
  totalDelta: number;
  itemCount: number;
  sharePct: number;
  leadSignal: string;
  spanClass: string;
};

function formatMarketCapKrw(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "-";

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

function formatSignedDelta(value: number): string {
  const abs = Math.abs(value);
  const display = Number.isInteger(abs) ? abs.toString() : abs.toFixed(1);

  if (value > 0) return `▲ +${display}`;
  if (value < 0) return `▼ -${display}`;
  return "— 0";
}

function getSpanClass(sharePct: number): string {
  if (sharePct >= 24) return "lg:col-span-6";
  if (sharePct >= 17) return "lg:col-span-5";
  if (sharePct >= 9) return "lg:col-span-4";
  return "lg:col-span-3";
}

function getTone(delta: number) {
  if (delta >= 1) {
    return {
      card: "border-cyan-300/25 bg-cyan-300/[0.10]",
      pill: "border-cyan-300/25 bg-cyan-300/12 text-cyan-100",
      delta: "text-cyan-100",
      bar: "bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.45)]",
      hover:
        "hover:shadow-[0_0_0_1px_rgba(34,211,238,0.22),0_0_28px_rgba(34,211,238,0.18)] hover:border-cyan-300/40",
    };
  }

  if (delta > 0) {
    return {
      card: "border-emerald-300/18 bg-emerald-300/[0.09]",
      pill: "border-emerald-300/20 bg-emerald-300/12 text-emerald-100",
      delta: "text-emerald-100",
      bar: "bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.35)]",
      hover:
        "hover:shadow-[0_0_0_1px_rgba(110,231,183,0.18),0_0_24px_rgba(110,231,183,0.14)] hover:border-emerald-300/30",
    };
  }

  if (delta <= -1) {
    return {
      card: "border-fuchsia-400/22 bg-fuchsia-400/[0.10]",
      pill: "border-fuchsia-400/22 bg-fuchsia-400/12 text-fuchsia-100",
      delta: "text-fuchsia-100",
      bar: "bg-fuchsia-400 shadow-[0_0_18px_rgba(232,121,249,0.35)]",
      hover:
        "hover:shadow-[0_0_0_1px_rgba(232,121,249,0.22),0_0_28px_rgba(232,121,249,0.18)] hover:border-fuchsia-400/38",
    };
  }

  if (delta < 0) {
    return {
      card: "border-rose-400/18 bg-rose-400/[0.09]",
      pill: "border-rose-400/18 bg-rose-400/12 text-rose-100",
      delta: "text-rose-100",
      bar: "bg-rose-400 shadow-[0_0_18px_rgba(251,113,133,0.35)]",
      hover:
        "hover:shadow-[0_0_0_1px_rgba(251,113,133,0.18),0_0_24px_rgba(251,113,133,0.14)] hover:border-rose-400/30",
    };
  }

  return {
    card: "border-white/8 bg-white/[0.03]",
    pill: "border-white/10 bg-white/[0.04] text-white/65",
    delta: "text-white/75",
    bar: "bg-white/25",
    hover:
      "hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_22px_rgba(103,232,249,0.08)] hover:border-cyan-300/16",
  };
}

function buildDistrictBuckets(items: RankingItem[]): DistrictBucket[] {
  const grouped = new Map<
    string,
    {
      name: string;
      totalMarketCap: number;
      totalDelta: number;
      itemCount: number;
      leadItemName: string;
      leadItemDelta: number;
    }
  >();

  for (const item of items) {
    const districtName = item.sigunguName?.trim() || "기타";
    const current = grouped.get(districtName) ?? {
      name: districtName,
      totalMarketCap: 0,
      totalDelta: 0,
      itemCount: 0,
      leadItemName: item.name,
      leadItemDelta: item.rankDelta7d,
    };

    current.totalMarketCap += item.marketCapKrw;
    current.totalDelta += item.rankDelta7d;
    current.itemCount += 1;

    if (Math.abs(item.rankDelta7d) > Math.abs(current.leadItemDelta)) {
      current.leadItemName = item.name;
      current.leadItemDelta = item.rankDelta7d;
    }

    grouped.set(districtName, current);
  }

  const totalMarketCap = Array.from(grouped.values()).reduce(
    (sum, bucket) => sum + bucket.totalMarketCap,
    0
  );

  return Array.from(grouped.values())
    .map((bucket) => {
      const averageDelta =
        bucket.itemCount > 0 ? bucket.totalDelta / bucket.itemCount : 0;
      const sharePct =
        totalMarketCap > 0 ? (bucket.totalMarketCap / totalMarketCap) * 100 : 0;

      return {
        name: bucket.name,
        totalMarketCap: bucket.totalMarketCap,
        averageDelta,
        totalDelta: bucket.totalDelta,
        itemCount: bucket.itemCount,
        sharePct,
        leadSignal: `${bucket.leadItemName} ${formatSignedDelta(bucket.leadItemDelta)}`,
        spanClass: getSpanClass(sharePct),
      };
    })
    .sort((a, b) => b.totalMarketCap - a.totalMarketCap);
}

function buildUrlWithDistrict(districtName: string) {
  const params = new URLSearchParams(window.location.search);
  params.set("district", districtName);

  const queryString = params.toString();
  return `${window.location.pathname}${queryString ? `?${queryString}` : ""}${window.location.hash}`;
}

function pushDistrictToUrl(districtName: string) {
  const nextUrl = buildUrlWithDistrict(districtName);
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (currentUrl !== nextUrl) {
    window.history.pushState(null, "", nextUrl);
  }
}

function handleDistrictKeyDown(
  event: KeyboardEvent<HTMLElement>,
  districtName: string
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    pushDistrictToUrl(districtName);
  }
}

export function MarketHeatmap({ items }: { items: RankingItem[] }) {
  const buckets = buildDistrictBuckets(items);

  return (
    <section className="overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_50px_rgba(0,0,0,0.3)]">
      <div className="border-b border-white/5 px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/70 sm:text-xs">
              DISTRICT HEATMAP
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold tracking-tight sm:text-xl">
              서울 자본 흐름 온도
            </h2>
            <p className="mt-1 text-xs text-white/45 sm:text-sm">
              구별 시가총액 체급과 최근 7일 기준 순위 압력을 동시에 본다
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] sm:text-xs">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-cyan-100">
              Cyan = 주간 상승 우위
            </span>
            <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-2.5 py-1 text-fuchsia-100">
              Fuchsia = 주간 하락 압력
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-white/65">
              Gray = 보합
            </span>
          </div>
        </div>
      </div>

      <div className="p-2 sm:p-3">
        {buckets.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-12">
            {buckets.map((bucket) => {
              const tone = getTone(bucket.averageDelta);

              return (
                <article
                  key={bucket.name}
                  role="button"
                  tabIndex={0}
                  aria-label={`${bucket.name} 필터 적용`}
                  onClick={() => pushDistrictToUrl(bucket.name)}
                  onKeyDown={(event) => handleDistrictKeyDown(event, bucket.name)}
                  className={`col-span-1 cursor-pointer rounded-2xl border p-4 transition duration-200 outline-none ${bucket.spanClass} ${tone.card} ${tone.hover} hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-cyan-300/50`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-white/48">
                        {bucket.name}
                      </p>
                      <h3 className="mt-2 truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
                        {formatMarketCapKrw(bucket.totalMarketCap)}
                      </h3>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${tone.pill}`}
                    >
                      {bucket.sharePct.toFixed(1)}%
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="min-w-0 rounded-xl border border-black/20 bg-black/20 px-2 py-2 sm:px-3">
                      {/* truncate 추가 및 글자 간격(tracking) 축소! */}
                      <p className="truncate text-[9px] uppercase tracking-wider text-white/40 sm:text-[10px]">
                        Momentum (W)
                      </p>
                      <p className={`mt-1 truncate text-xs font-semibold sm:text-sm ${tone.delta}`}>
                        {formatSignedDelta(bucket.averageDelta)}
                      </p>
                    </div>

                    <div className="min-w-0 rounded-xl border border-black/20 bg-black/20 px-2 py-2 text-right sm:px-3">
                      <p className="truncate text-[9px] uppercase tracking-wider text-white/40 sm:text-[10px]">
                        Listings
                      </p>
                      <p className="mt-1 truncate text-xs font-semibold text-white sm:text-sm">
                        {bucket.itemCount}개
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/30">
                    <div
                      className={`h-full rounded-full ${tone.bar}`}
                      style={{ width: `${Math.max(10, bucket.sharePct)}%` }}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-xs text-white/55">
                      SIGNAL // {bucket.leadSignal}
                    </p>
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-cyan-300/70">
                      Click to filter
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm leading-6 text-white/55">
            현재 히트맵을 그릴 랭킹 데이터가 없다.
          </div>
        )}
      </div>
    </section>
  );
}