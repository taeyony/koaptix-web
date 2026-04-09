import { Suspense } from "react";
import {
  DEFAULT_UNIVERSE_CODE,
  normalizeUniverseCode,
} from "../lib/koaptix/universes";

import { CommandPalette } from "../components/home/CommandPalette";
import { TopMovers } from "../components/home/TopMovers";
import { NeonMap } from "../components/home/NeonMap";
import MarketChartCard from "../components/home/MarketChartCard";
import { RankingBoardClient } from "../components/home/RankingBoardClient";
import { HapiPhilosophyTrigger } from "../components/home/HapiPhilosophyTrigger";

import {
  getLatestRankBoard,
  getHomeKpi,
  getIndexChartRows,
  toNullableNumber,
} from "../lib/koaptix/queries";
import type { RankingItem } from "../lib/koaptix/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParamValue = string | string[] | undefined;
type SearchParamsShape = Record<string, SearchParamValue>;

function pickSingleParam(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function resolveSearchParams(
  input: SearchParamsShape | Promise<SearchParamsShape> | undefined,
): Promise<SearchParamsShape | undefined> {
  return input ? await input : undefined;
}

export default async function Home({
  searchParams,
}: {
  searchParams?: SearchParamsShape | Promise<SearchParamsShape>;
}) {
  const resolvedSearchParams = await resolveSearchParams(searchParams);

  const rawUniverseParam = pickSingleParam(resolvedSearchParams?.universe);
  const universeCode = normalizeUniverseCode(
    rawUniverseParam ?? DEFAULT_UNIVERSE_CODE,
  );
/**
 * Home initial SSR seed limit.
 *
 * 현재는 page-level SSR seed에서
 * - KOREA_ALL = 40
 * - regional = 60
 * 으로 가져오고 있다.
 *
 * 반면 client tactical transition은 /api/rankings route의 limit 20 기준이다.
 * 이 차이는 의도적 분리인지, 추후 정렬할지 다음 방에서 판단해야 한다.
 */
const boardLimit =
  universeCode === DEFAULT_UNIVERSE_CODE ? 40 : 60;

const [rawItems, rawKpi, rawChartRows] = await Promise.all([
  getLatestRankBoard(universeCode, boardLimit).catch((error) => {
    console.warn("[HOME] getLatestRankBoard failed:", error);
    return [];
  }),
  getHomeKpi(),
  getIndexChartRows(180).catch((error) => {
    console.warn("[HOME] getIndexChartRows failed:", error);
    return [];
  }),
]);

  const indexChartRows = rawChartRows.map((row: any) => ({
    snapshot_date: row.snapshot_date,
    total_market_cap:
      row.total_market_cap != null ? Number(row.total_market_cap) : null,
  }));

  const currentYear = new Date().getFullYear();

  console.log("[HOME DEBUG - BEFORE MAP]", {
    universeCode,
    rawItemsCount: rawItems.length,
    firstRowUniverse: (rawItems[0] as any)?.universe_code ?? null,
    firstRowName: (rawItems[0] as any)?.apt_name_ko ?? null,
  });

  const refinedItems: RankingItem[] = rawItems.map((row: any) => {
    const buildYear = toNullableNumber(row.build_year ?? row.approval_year);
    const ageYears = buildYear ? currentYear - buildYear : null;
    const households = toNullableNumber(
      row.household_count ?? row.total_household_count ?? row.households,
    );
    const recovery = toNullableNumber(
      row.recovery_52w ?? row.recovery_rate_52w,
    );

    return {
      complexId: String(row.complex_id ?? row.id),

      name: row.apt_name_ko ?? row.name ?? "",
      apt_name_ko: row.apt_name_ko ?? row.name ?? "",

      rank: row.rank_all ?? row.rank ?? 0,
      rank_all: row.rank_all ?? row.rank ?? 0,

      sigunguName: row.sigungu_name ?? "",
      sigungu_name: row.sigungu_name ?? "",

      legalDongName: row.legal_dong_name ?? "",
      legal_dong_name: row.legal_dong_name ?? "",

      marketCapKrw: row.market_cap_krw ?? 0,
      market_cap_krw: row.market_cap_krw ?? 0,

      marketCapTrillionKrw: row.market_cap_trillion_krw ?? 0,
      market_cap_trillion_krw: row.market_cap_trillion_krw ?? 0,

      rankDelta7d: toNullableNumber(row.rank_delta_w ?? row.rank_delta_7d),
      rank_delta_w: toNullableNumber(row.rank_delta_w ?? row.rank_delta_7d),

      rankMovement: row.rank_movement ?? null,
      rank_movement: row.rank_movement ?? null,

      previousRankAll: toNullableNumber(row.previous_rank_all),
      previous_rank_all: toNullableNumber(row.previous_rank_all),

      recoveryRate52w: recovery,
      recovery_52w: recovery,

      locationLabel: `${
        row.location_search_label ??
        row.sigungu_full_name ??
        row.sigungu_name ??
        ""
      } ${row.legal_dong_name ?? ""}`.trim(),

      households,
      household_count: households,

      buildYear,
      build_year: buildYear,

      ageYears,
      age_years: ageYears,

      universeCode: row.universe_code ?? universeCode,
      universe_code: row.universe_code ?? universeCode,
      universeName: row.universe_name ?? null,
      universe_name: row.universe_name ?? null,
    } as unknown as RankingItem;
  });

  console.log("[HOME DEBUG - AFTER MAP]", {
    universeCode,
    refinedItemsCount: refinedItems.length,
    firstRefinedUniverse: (refinedItems[0] as any)?.universeCode ?? null,
    firstRefinedName: (refinedItems[0] as any)?.name ?? null,
  });

  const home = {
    items: refinedItems,
    kpis: [
      {
        label: "MARKET CAP",
        value: rawKpi?.total_market_cap_krw_string || "468.8조원",
        subValue: "코앱틱스 500 단지",
      },
      {
        label: "LISTED UNITS",
        value: rawKpi?.total_household_count_string || "501개",
        subValue: "2026년 기준",
      },
    ],
  };

  return (
    <>
      <CommandPalette
  key={`cmd-${universeCode}`}
  items={home.items}
  initialUniverseCode={universeCode}
/>

      <main className="min-h-screen bg-[#06090f] px-2 py-4 sm:p-4 lg:p-6">
        <div className="mx-auto w-full max-w-[1600px] space-y-4">
          <section className="overflow-hidden rounded-2xl border border-slate-700/50 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_18px_40px_rgba(0,0,0,0.4)]">
            <div className="border-b border-slate-800/80 px-4 py-3 lg:px-5 lg:py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
                    KOAPTIX LIVE BOARD
                  </p>
                  <h1 className="mt-1 truncate text-lg font-semibold tracking-tight text-white sm:text-xl lg:text-2xl">
                    KOAPTIX 500
                  </h1>
                  <div className="mt-1 space-y-0.5">
                    <p className="text-xs text-slate-300 sm:text-sm">
                      대한민국 아파트 자본 흐름을 가장 빠르게 읽어내는 인사이트 허브.
                    </p>
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
                    <div
                      key={kpi.label}
                      className="rounded-lg border border-slate-700/50 bg-slate-800/20 px-3 py-2"
                    >
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                        {kpi.label}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-100">
                        {kpi.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-6">
            <div className="col-span-1 flex flex-col gap-4 lg:col-span-8 lg:gap-6">
              <div className="h-[400px] min-h-0 lg:h-[650px]">
                <Suspense
                  fallback={
                    <div className="h-full w-full animate-pulse rounded-2xl border border-slate-700/50 bg-[#0b1118]" />
                  }
                >
                  <NeonMap key={`map-${universeCode}`} items={home.items} />
                </Suspense>
              </div>

              <div className="static h-[320px] min-h-0 lg:sticky lg:top-4 lg:h-[400px]">
                <MarketChartCard data={indexChartRows} />
              </div>
            </div>

            <div className="col-span-1 min-h-0 lg:col-span-4 lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-2rem)] lg:flex-col lg:gap-6">
              <div className="mb-4 hidden shrink-0 lg:mb-0 lg:block">
                <TopMovers key={`movers-${universeCode}`} items={home.items} />
              </div>

              <div className="h-[600px] min-h-0 lg:h-auto lg:flex-1 lg:overflow-hidden">
                <Suspense
                  fallback={
                    <div className="h-full w-full animate-pulse rounded-2xl border border-slate-700/50 bg-[#0b1118]" />
                  }
                >
                  <RankingBoardClient
                    key={`board-${universeCode}`}
                    items={home.items}
                    initialUniverseCode={universeCode}
                  />
                </Suspense>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}