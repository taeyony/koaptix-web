/**
 * Home = lightweight tactical board.
 * 보드/맵/검색은 universe-aware delivery path를 쓰고, chart는 index chain 기반 universe-aware renderer를 사용한다.
 */

import { Suspense } from "react";
import Link from "next/link";
import {
  DEFAULT_UNIVERSE_CODE,
  getUniverseLabel,
  resolveServiceUniverseCode,
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
  getIndexChartPayload,
  toNullableNumber,
  type HomeIndexChartPayload,
} from "../lib/koaptix/queries";
import type { RankingItem } from "../lib/koaptix/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

let lastGoodHomeKpi: any | null = null;
const lastGoodIndexChartPayloadByUniverse = new Map<string, HomeIndexChartPayload>();

type SearchParamValue = string | string[] | undefined;
type SearchParamsShape = Record<string, SearchParamValue>;

function pickSingleParam(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function resolveSearchParams(
  input: Promise<SearchParamsShape> | undefined,
): Promise<SearchParamsShape | undefined> {
  return input ? await input : undefined;
}

function withTimeoutFallback<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

function buildEmptyIndexChartPayload(
  universeCode: string,
): HomeIndexChartPayload {
  return {
    requestedUniverseCode: universeCode,
    renderedUniverseCode: universeCode,
    renderedUniverseLabel: getUniverseLabel(universeCode),
    isFallbackToKorea: false,
    indexCode: null,
    indexName: null,
    latestSnapshotDate: null,
    indexValue: null,
    change1m: null,
    changePct1m: null,
    totalMarketCapKrw: null,
    componentComplexCount: null,
    movement1m: null,
    rows: [],
  };
}

function buildSafeChartFallback(
  universeCode: string,
  cache: Map<string, HomeIndexChartPayload>,
): HomeIndexChartPayload {
  const exact = cache.get(universeCode) ?? null;

  const exactUsable =
    exact &&
    exact.requestedUniverseCode === universeCode &&
    exact.renderedUniverseCode === universeCode;

  if (exactUsable) {
    return exact;
  }

  return buildEmptyIndexChartPayload(universeCode);
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsShape>;
}) {
  const resolvedSearchParams = await resolveSearchParams(searchParams);

  const rawUniverseParam = pickSingleParam(resolvedSearchParams?.universe);
  const universeCode = resolveServiceUniverseCode(
    rawUniverseParam ?? DEFAULT_UNIVERSE_CODE,
  );

  const rankingHref =
    universeCode === DEFAULT_UNIVERSE_CODE
      ? "/ranking"
      : `/ranking?universe=${encodeURIComponent(universeCode)}`;

  const boardPrimaryLimit =
    universeCode === DEFAULT_UNIVERSE_CODE ? 8 : 18;

  const boardSeedTimeoutMs =
    universeCode === DEFAULT_UNIVERSE_CODE ? 6200 : 7200;

  // 🚨 2-A) 지차장 지시: 지역 페이지에서 KOREA 캐시를 주워오지 않도록 교체
  const chartFallback = buildSafeChartFallback(
    universeCode,
    lastGoodIndexChartPayloadByUniverse,
  );

  const [boardSeed, rawKpi, indexChartPayload] = await Promise.all([
    withTimeoutFallback(
      getLatestRankBoard(universeCode, boardPrimaryLimit)
        .then((items) => ({
          items,
          boardError: null as string | null,
        }))
        .catch((error) => {
          const message =
            error instanceof Error ? error.message : "보드 로딩 실패";
          console.warn("[HOME] getLatestRankBoard failed:", error);
          return {
            items: [] as any[],
            boardError: message,
          };
        }),
      boardSeedTimeoutMs,
      {
        items: [] as any[],
        boardError: null as string | null,
      },
    ),
    withTimeoutFallback(
      getHomeKpi()
        .then((data) => {
          if (data) {
            lastGoodHomeKpi = data;
          }
          return data;
        })
        .catch((error) => {
          console.warn("[HOME] getHomeKpi failed:", error);
          return lastGoodHomeKpi;
        }),
      2500,
      lastGoodHomeKpi,
    ),
    withTimeoutFallback(
      getIndexChartPayload(universeCode, 24)
        .then((payload) => {
          // 🚨 2-B) 지차장 지시: 지역 페이지 캐시에 KOREA 데이터가 섞이지 않도록 저장 로직 교체
          if (
            payload.rows.length > 0 &&
            payload.requestedUniverseCode === universeCode &&
            payload.renderedUniverseCode === universeCode
          ) {
            lastGoodIndexChartPayloadByUniverse.set(universeCode, {
              ...payload,
              requestedUniverseCode: universeCode,
              renderedUniverseCode: universeCode,
              isFallbackToKorea: false,
            });
          }
          return payload;
        })
        .catch((error) => {
          console.warn("[HOME] getIndexChartPayload failed:", error);
          return chartFallback;
        }),
      4500,
      chartFallback,
    ),
  ]);

  const rawItems = boardSeed.items;
  const boardError = boardSeed.boardError;

  const currentYear = new Date().getFullYear();

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
      locationLabel: `${row.location_search_label ??
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

                    <Link
                      href={rankingHref}
                      className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300 transition-all hover:border-cyan-400/50 hover:bg-cyan-500/20 hover:text-cyan-200"
                    >
                      TOP1000 OPERATIONS ROOM
                    </Link>

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

              <div className="static h-[320px] min-h-0 min-w-0 overflow-hidden lg:sticky lg:top-4 lg:h-[400px]">
                {/* 🚨 2-C) 지차장 지시: 유니버스가 바뀔 때 확실히 리렌더링되도록 고유 Key 추가 */}
                <MarketChartCard
                  key={`chart-${indexChartPayload.requestedUniverseCode}-${indexChartPayload.renderedUniverseCode}`}
                  payload={indexChartPayload}
                />
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
                    boardError={boardError}
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
