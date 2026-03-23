"use client";

import type { KeyboardEvent } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
      hover: "hover:shadow-[0_0_0_1px_rgba(34,211,238,0.22),0_0_28px_rgba(34,211,238,0.18)] hover:border-cyan-300/40",
    };
  }
  if (delta > 0) {
    return {
      card: "border-emerald-300/18 bg-emerald-300/[0.09]",
      pill: "border-emerald-300/20 bg-emerald-300/12 text-emerald-100",
      delta: "text-emerald-100",
      bar: "bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.35)]",
      hover: "hover:shadow-[0_0_0_1px_rgba(110,231,183,0.18),0_0_24px_rgba(110,231,183,0.14)] hover:border-emerald-300/30",
    };
  }
  if (delta <= -1) {
    return {
      card: "border-fuchsia-400/22 bg-fuchsia-400/[0.10]",
      pill: "border-fuchsia-400/22 bg-fuchsia-400/12 text-fuchsia-100",
      delta: "text-fuchsia-100",
      bar: "bg-fuchsia-400 shadow-[0_0_18px_rgba(232,121,249,0.35)]",
      hover: "hover:shadow-[0_0_0_1px_rgba(232,121,249,0.22),0_0_28px_rgba(232,121,249,0.18)] hover:border-fuchsia-400/38",
    };
  }
  if (delta < 0) {
    return {
      card: "border-rose-400/18 bg-rose-400/[0.09]",
      pill: "border-rose-400/18 bg-rose-400/12 text-rose-100",
      delta: "text-rose-100",
      bar: "bg-rose-400 shadow-[0_0_18px_rgba(251,113,133,0.35)]",
      hover: "hover:shadow-[0_0_0_1px_rgba(251,113,133,0.18),0_0_24px_rgba(251,113,133,0.14)] hover:border-rose-400/30",
    };
  }
  return {
    card: "border-white/8 bg-white/[0.03]",
    pill: "border-white/10 bg-white/[0.04] text-white/65",
    delta: "text-white/75",
    bar: "bg-white/25",
    hover: "hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_22px_rgba(103,232,249,0.08)] hover:border-cyan-300/16",
  };
}

function buildDistrictBuckets(items: RankingItem[]): DistrictBucket[] {
  const grouped = new Map();
  for (const item of items) {
    const districtName = item.sigunguName?.trim() || "기타";
    const current = grouped.get(districtName) ?? {
      name: districtName,
      totalMarketCap: 0,
      totalDelta: 0,
      itemCount: 0,
      leadItemName: item.name,
      leadItemDelta: item.rankDelta1d,
    };
    current.totalMarketCap += item.marketCapKrw;
    current.totalDelta += item.rankDelta1d;
    current.itemCount += 1;
    if (Math.abs(item.rankDelta1d) > Math.abs(current.leadItemDelta)) {
      current.leadItemName = item.name;
      current.leadItemDelta = item.rankDelta1d;
    }
    grouped.set(districtName, current);
  }
  const totalMarketCap = Array.from(grouped.values()).reduce((sum, bucket) => sum + bucket.totalMarketCap, 0);
  return Array.from(grouped.values())
    .map((bucket) => {
      const averageDelta = bucket.itemCount > 0 ? bucket.totalDelta / bucket.itemCount : 0;
      const sharePct = totalMarketCap > 0 ? (bucket.totalMarketCap / totalMarketCap) * 100 : 0;
      return {
        ...bucket,
        averageDelta,
        sharePct,
        leadSignal: `${bucket.leadItemName} ${formatSignedDelta(bucket.leadItemDelta)}`,
        spanClass: getSpanClass(sharePct),
      };
    })
    .sort((a, b) => b.totalMarketCap - a.totalMarketCap);
}

export function MarketHeatmap({ items }: { items: RankingItem[] }) {
  const buckets = buildDistrictBuckets(items);
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 💡 현재 선택된 구를 파악합니다!
  const currentDistrict = searchParams.get("district");

  function handleDistrictClick(districtName: string) {
    const params = new URLSearchParams(searchParams.toString());
    
    // 💡 잼이사의 토글 로직: 이미 선택된 구를 다시 누르면 해제!
    if (params.get("district") === districtName) {
      params.delete("district");
    } else {
      params.set("district", districtName);
    }
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });

    // 스크롤 모터 (해제할 땐 스크롤 안 함)
    if (params.get("district")) {
      setTimeout(() => {
        document.getElementById("ranking-board-section")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }

  function handleDistrictKeyDown(event: KeyboardEvent<HTMLElement>, districtName: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleDistrictClick(districtName);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_50px_rgba(0,0,0,0.3)]">
      <div className="border-b border-white/5 px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/70 sm:text-xs">DISTRICT HEATMAP</p>
            <h2 className="mt-1 truncate text-lg font-semibold tracking-tight sm:text-xl">서울 자본 흐름 온도</h2>
            <p className="mt-1 text-xs text-white/45 sm:text-sm">구별 시가총액 체급과 전주 대비 순위 압력을 동시에 본다</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] sm:text-xs">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-cyan-100">Cyan = 상승 우위</span>
            <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-2.5 py-1 text-fuchsia-100">Fuchsia = 하락 우위</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-white/65">Gray = 보합</span>
          </div>
        </div>
      </div>
      <div className="p-2 sm:p-3">
        {buckets.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-12">
            {buckets.map((bucket) => {
              const tone = getTone(bucket.averageDelta);
              
              // 💡 선택된 구역에 테두리 빛 발산 효과!
              const isSelected = currentDistrict === bucket.name;
              const selectedRing = isSelected ? "ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)] border-cyan-400/50" : "";

              return (
                <article
                  key={bucket.name}
                  role="button"
                  tabIndex={0}
                  aria-label={`${bucket.name} 필터 토글`}
                  onClick={() => handleDistrictClick(bucket.name)}
                  onKeyDown={(event) => handleDistrictKeyDown(event, bucket.name)}
                  className={`col-span-1 cursor-pointer rounded-2xl border p-4 transition duration-200 outline-none ${bucket.spanClass} ${tone.card} ${tone.hover} ${selectedRing} hover:-translate-y-0.5`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-white/48">{bucket.name}</p>
                      <h3 className="mt-2 truncate text-lg font-semibold tracking-tight text-white sm:text-xl">{formatMarketCapKrw(bucket.totalMarketCap)}</h3>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${tone.pill}`}>{bucket.sharePct.toFixed(1)}%</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-black/20 bg-black/20 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Avg Delta</p>
                      <p className={`mt-1 text-sm font-semibold ${tone.delta}`}>{formatSignedDelta(bucket.averageDelta)}</p>
                    </div>
                    <div className="rounded-xl border border-black/20 bg-black/20 px-3 py-2 text-right">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Listings</p>
                      <p className="mt-1 text-sm font-semibold text-white">{bucket.itemCount}개</p>
                    </div>
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/30">
                    <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.max(10, bucket.sharePct)}%` }} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-xs text-white/55">SIGNAL // {bucket.leadSignal}</p>
                    {/* 선택 상태에 따라 텍스트 변경 */}
                    <span className={`shrink-0 text-[10px] uppercase tracking-[0.18em] ${isSelected ? 'text-cyan-300 font-bold' : 'text-cyan-300/50'}`}>
                      {isSelected ? "FILTER ACTIVE" : "Click to filter"}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm leading-6 text-white/55">현재 히트맵을 그릴 랭킹 데이터가 없다.</div>
        )}
      </div>
    </section>
  );
}