import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketChartCard } from "../components/home/MarketChartCard";
import { RankingBoardClient } from "../components/home/RankingBoardClient";
import { buildComplexMetadata } from "../lib/koaptix/metadata";
import { mapLatestRankBoardRows, mapHomeKpiToKpiCards, mapIndexChartData } from "../lib/koaptix/mappers";
import { getLatestRankBoard, getHomeKpi, getIndexChart } from "../lib/koaptix/queries";
import type { HomePageData } from "../lib/koaptix/types";

// 💡 잼이사 조립: 페이즈 11 신규 부품 가져오기
import { HapiPhilosophyTrigger } from "../components/home/HapiPhilosophyTrigger";
import { TickerTape } from "../components/home/TickerTape";

type HomeSearchParams = Promise<{ complexId?: string | string[] | undefined }> | { complexId?: string | string[] | undefined };

function pickFirst(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ searchParams }: { searchParams?: HomeSearchParams }): Promise<Metadata> {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  return buildComplexMetadata(pickFirst(resolvedSearchParams.complexId));
}

async function getHomeData(): Promise<HomePageData> {
  try {
    const [rankingRows, kpiRow, chartRows] = await Promise.all([
      getLatestRankBoard(50),
      getHomeKpi(),
      getIndexChart(),
    ]);

    return {
      kpis: mapHomeKpiToKpiCards(kpiRow),
      index: mapIndexChartData(chartRows),
      rankings: mapLatestRankBoardRows(rankingRows),
      rankingsError: null,
    };
  } catch (error) {
    console.error("[KOAPTIX] Failed to load home data:", error);
    return {
      kpis: [],
      index: { valueLabel: "-", changePct: 0, chartData: [] },
      rankings: [],
      rankingsError: error instanceof Error ? error.message : "랭킹 데이터를 불러오지 못했습니다.",
    };
  }
}

export default async function Page() {
  const home = await getHomeData();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#05070b] text-[#eaf2ff]">
      
      {/* 💡 잼이사 조립: 대망의 사이버펑크 전광판 탑재! */}
      <TickerTape
        items={[
          "KOAPTIX 500 LIVE",
          "자본의 흐름을 읽는 자만이 살아남는다",
          "오늘의 급등 단지: 반포자이 ▲",
          "HAPI 그룹 제공",
        ]}
      />

      <div className="mx-auto w-full max-w-[1440px] px-3 pb-8 pt-3 sm:px-4 sm:pb-10 sm:pt-4 lg:px-6 lg:pb-12">
        <section className="mb-3 grid gap-3 sm:mb-4 sm:gap-4">
          <div className="overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_50px_rgba(0,0,0,0.3)]">
            <div className="border-b border-white/5 px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/70 sm:text-xs">
                    KOAPTIX LIVE BOARD
                  </p>
                  <h1 className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl lg:text-[32px]">
                    KOAPTIX 500 / Top 50
                  </h1>
                  <p className="mt-1 text-sm leading-6 text-white/55 sm:text-[15px]">
                    URL 동기화, 공유 미리보기, 비교 모드, 사이버펑크 월드 빌드 적용
                  </p>

                  {/* 💡 잼이사 조립: HAPI 철학관 입구 버튼 탑재! */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <HapiPhilosophyTrigger />

                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/50">
                      Elastic Sacrifice Protocol
                    </span>
                  </div>
                </div>

                <div className="grid w-full grid-cols-2 gap-2 sm:gap-3 lg:max-w-[360px]">
                  {home.kpis.map((kpi) => (
                    <div key={kpi.label} className="rounded-xl border border-white/6 bg-white/[0.03] px-3 py-2.5 sm:px-4 sm:py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/45 sm:text-xs">{kpi.label}</p>
                      <p className="mt-1 text-base font-semibold tabular-nums sm:text-lg">{kpi.value}</p>
                      {kpi.subValue && <p className="mt-1 text-xs text-white/45 sm:text-sm">{kpi.subValue}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:gap-4 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-7">
            <MarketChartCard title="KOAPTIX 500" valueLabel={home.index.valueLabel} changePct={home.index.changePct} data={home.index.chartData} />
          </div>
          <div className="min-w-0 lg:col-span-5">
            <Suspense fallback={<div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-white/55">랭킹 보드 로딩 중...</div>}>
              <RankingBoardClient items={home.rankings} boardError={home.rankingsError ?? null} />
            </Suspense>
          </div>
        </section>
      </div>
    </main>
  );
}