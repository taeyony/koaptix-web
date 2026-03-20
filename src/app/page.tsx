import { MarketChartCard } from "../components/home/MarketChartCard";
import { RankingCard } from "../components/home/RankingCard";
import { mapLatestRankBoardRows } from "../lib/koaptix/mappers";
import { getLatestRankBoard } from "../lib/koaptix/queries";
import type { HomePageData } from "../lib/koaptix/types";

async function getHomeData(): Promise<HomePageData> {
  try {
    const rankingRows = await getLatestRankBoard(50);

    return {
      kpis: [
        { label: "Market Cap", value: "1,239.74", subValue: "+4.39 (+0.36%)" },
        { label: "Listed Units", value: "501개", subValue: "24년 7월 기준" },
      ],
      index: {
        valueLabel: "1,239.74",
        changePct: 0.36,
        chartData: [
          { label: "07.31", value: 1000 },
          { label: "08.31", value: 1080 },
          { label: "09.30", value: 1120 },
          { label: "10.31", value: 1180 },
          { label: "11.30", value: 1210 },
          { label: "12.31", value: 1230 },
          { label: "01.31", value: 1239 },
        ],
      },
      rankings: mapLatestRankBoardRows(rankingRows),
      rankingsError: null,
    };
  } catch (error) {
    console.error("[KOAPTIX] Failed to load latest rank board:", error);

    return {
      kpis: [
        { label: "Market Cap", value: "1,239.74", subValue: "+4.39 (+0.36%)" },
        { label: "Listed Units", value: "501개", subValue: "24년 7월 기준" },
      ],
      index: {
        valueLabel: "1,239.74",
        changePct: 0.36,
        chartData: [
          { label: "07.31", value: 1000 },
          { label: "08.31", value: 1080 },
          { label: "09.30", value: 1120 },
          { label: "10.31", value: 1180 },
          { label: "11.30", value: 1210 },
          { label: "12.31", value: 1230 },
          { label: "01.31", value: 1239 },
        ],
      },
      rankings: [],
      rankingsError:
        error instanceof Error
          ? error.message
          : "랭킹 데이터를 불러오지 못했습니다.",
    };
  }
}

export default async function Page() {
  const home = await getHomeData();

  const rankingStatus = home.rankingsError
    ? {
        label: "DB ERROR",
        className: "border-rose-400/20 bg-rose-400/10 text-rose-300",
      }
    : home.rankings.length > 0
      ? {
          label: "LIVE",
          className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
        }
      : {
          label: "EMPTY",
          className: "border-amber-400/20 bg-amber-400/10 text-amber-300",
        };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#05070b] text-[#eaf2ff]">
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
                    랭킹 보드는 Supabase 실데이터, 차트와 KPI는 임시 Mock 유지
                  </p>
                </div>

                <div className="grid w-full grid-cols-2 gap-2 sm:gap-3 lg:max-w-[360px]">
                  {home.kpis.map((kpi) => (
                    <div
                      key={kpi.label}
                      className="rounded-xl border border-white/6 bg-white/[0.03] px-3 py-2.5 sm:px-4 sm:py-3"
                    >
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/45 sm:text-xs">
                        {kpi.label}
                      </p>
                      <p className="mt-1 text-base font-semibold tabular-nums sm:text-lg">
                        {kpi.value}
                      </p>
                      {kpi.subValue && (
                        <p className="mt-1 text-xs text-white/45 sm:text-sm">
                          {kpi.subValue}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:gap-4 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-7">
            <MarketChartCard
              title="KOAPTIX 500"
              valueLabel={home.index.valueLabel}
              changePct={home.index.changePct}
              data={home.index.chartData}
            />
          </div>

          <div className="min-w-0 lg:col-span-5">
            <section className="overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_50px_rgba(0,0,0,0.3)]">
              <div className="border-b border-white/5 px-3 py-3 sm:px-4 sm:py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/70 sm:text-xs">
                        LEADERS BOARD
                      </p>
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium tracking-[0.18em] ${rankingStatus.className}`}
                      >
                        {rankingStatus.label}
                      </span>
                    </div>
                    <h2 className="mt-1 truncate text-lg font-semibold tracking-tight sm:text-xl">
                      Top 50 Rankings
                    </h2>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 p-2 sm:gap-3 sm:p-3 lg:max-h-[600px] lg:overflow-y-auto">
                {home.rankings.length > 0 ? (
                  home.rankings.map((item) => (
                    <RankingCard key={item.complexId} item={item} />
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm leading-6 text-white/55">
                    {home.rankingsError
                      ? "랭킹 데이터를 불러오지 못했다. Supabase env, view 접근 권한, RLS를 점검해라."
                      : "현재 표시할 랭킹 데이터가 없다."}
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}