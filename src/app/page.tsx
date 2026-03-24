// 🚨 1. 리액트에서 마법의 방어막(Suspense)을 가져옵니다!
import { Suspense } from "react"; 

import { CommandPalette } from "../components/home/CommandPalette";
import { TopMovers } from "../components/home/TopMovers";
import { NeonMap } from "../components/home/NeonMap";
import { MarketChartCard } from "../components/home/MarketChartCard";
import { RankingBoardClient } from "../components/home/RankingBoardClient";
import { HapiPhilosophyTrigger } from "../components/home/HapiPhilosophyTrigger";

import { getLatestRankBoard, getHomeKpi } from "../lib/koaptix/queries";
import type { RankingItem } from "../lib/koaptix/types";

export default async function Home() {
  const rawItems = await getLatestRankBoard(50);
  const rawKpi = await getHomeKpi();

  const refinedItems: RankingItem[] = rawItems.map((row: any) => ({
    complexId: String(row.complex_id),
    name: row.apt_name_ko || "",
    rank: row.rank_all || 0,
    sigunguName: row.sigungu_name || "",
    legalDongName: row.legal_dong_name || "",
    marketCapKrw: row.market_cap_krw || 0,
    marketCapTrillionKrw: row.market_cap_trillion_krw || 0,
    rankDelta7d: row.rank_delta_7d || 0,
    recoveryRate52w: row.recovery_rate_52w ?? null,
    locationLabel: `${row.sigungu_name} ${row.legal_dong_name}`
  } as RankingItem));

  const home = {
    items: refinedItems,
    kpis: [
      { 
        label: "MARKET CAP", 
        value: rawKpi?.total_market_cap_krw_string || "468.8조원", 
        subValue: "코앱틱스 500 단지" 
      },
      { 
        label: "LISTED UNITS", 
        value: rawKpi?.total_household_count_string || "501개", 
        subValue: "2026년 기준" 
      }
    ]
  };

  return (
    <>
      <CommandPalette items={home.items} />
      
      <main className="min-h-screen bg-[#06090f] px-2 py-4 sm:p-4 lg:p-6">
        <div className="mx-auto w-full max-w-[1600px] space-y-4">
          
          {/* --- 1. 대문 (압축된 Hero 영역) --- */}
          <section className="overflow-hidden rounded-2xl border border-slate-700/50 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_18px_40px_rgba(0,0,0,0.4)]">
            <div className="border-b border-slate-800/80 px-4 py-3 lg:px-5 lg:py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">KOAPTIX LIVE BOARD</p>
                  <h1 className="mt-1 truncate text-lg font-semibold tracking-tight text-white sm:text-xl lg:text-2xl">KOAPTIX 500 / Top 50</h1>
                  <div className="mt-1 space-y-0.5">
                    <p className="text-xs text-slate-300 sm:text-sm">서울 아파트 자본 흐름을 가장 빠르게 스캔하는 전술 터미널.</p>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <HapiPhilosophyTrigger />
                    <span className="cursor-pointer rounded-full border border-slate-700 bg-slate-800/40 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-300 transition-all hover:bg-slate-700 hover:text-white">
                      Elastic Sacrifice Protocol
                    </span>
                  </div>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 sm:gap-3 lg:max-w-[320px]">
                  {home.kpis.map((kpi) => (
                    <div key={kpi.label} className="rounded-lg border border-slate-700/50 bg-slate-800/20 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{kpi.label}</p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-100">{kpi.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* --- 2. 하이엔드 2-Pane 레이아웃 --- */}
          <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-6">
            
            {/* 좌측 패널 */}
            <div className="flex flex-col gap-4 lg:col-span-8 lg:gap-6">
              {/* 🚨 2. 네온 맵에 Suspense 방어막 씌우기! (로딩 중엔 까만 스텔스 박스가 뜹니다) */}
              <Suspense fallback={<div className="h-[450px] w-full animate-pulse rounded-2xl border border-slate-700/50 bg-[#0b1118]" />}>
                <NeonMap items={home.items} />
              </Suspense>
              
              <MarketChartCard />
            </div>

            {/* 우측 패널 */}
            <div className="sticky top-4 flex h-[calc(100vh-2rem)] flex-col gap-4 lg:col-span-4 lg:gap-6">
              <div className="shrink-0">
                <TopMovers items={home.items} />
              </div>
              
              <div className="flex-1 overflow-hidden min-h-0">
                {/* 🚨 3. 랭킹 보드에도 Suspense 방어막 씌우기! */}
                <Suspense fallback={<div className="h-full w-full animate-pulse rounded-2xl border border-slate-700/50 bg-[#0b1118]" />}>
                  <RankingBoardClient items={home.items} />
                </Suspense>
              </div>
            </div>

          </section>
        </div>
      </main>
    </>
  );
}