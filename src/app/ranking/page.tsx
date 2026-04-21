/**
 * /ranking = full board / TOP1000 entry.
 * 현재 universeCode 기준 full ranking을 보여주며, registry visible universe만 노출 대상으로 본다.
 */

import { Suspense } from "react";
import Link from "next/link";

import {
  DEFAULT_UNIVERSE_CODE,
  resolveServiceUniverseCode,
  getUniverseLabel,
} from "../../lib/koaptix/universes";
import {
  getLatestRankBoard,
  toNullableNumber,
} from "../../lib/koaptix/queries";
import type { RankingItem } from "../../lib/koaptix/types";

import { RankingBoardClient } from "../../components/home/RankingBoardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParamValue = string | string[] | undefined;
type SearchParamsShape = Record<string, SearchParamValue>;
type RankingTierKey = "ALL" | "S" | "A" | "B" | "C" | "D";

function pickSingleParam(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseRankingTier(value: string | undefined): RankingTierKey {
  if (
    value === "S" ||
    value === "A" ||
    value === "B" ||
    value === "C" ||
    value === "D"
  ) {
    return value;
  }

  return "ALL";
}

async function resolveSearchParams(
  input: Promise<SearchParamsShape> | undefined,
): Promise<SearchParamsShape | undefined> {
  return input ? await input : undefined;
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsShape>;
}) {
  const resolvedSearchParams = await resolveSearchParams(searchParams);

  const rawUniverseParam = pickSingleParam(resolvedSearchParams?.universe);
  const universeCode = resolveServiceUniverseCode(
    rawUniverseParam ?? DEFAULT_UNIVERSE_CODE,
  );
  const initialTier = parseRankingTier(
    pickSingleParam(resolvedSearchParams?.tier),
  );
  const initialSearchQuery =
    pickSingleParam(resolvedSearchParams?.q)?.trim() ?? "";
  const initialComplexId =
    pickSingleParam(resolvedSearchParams?.complexId)?.trim() || null;

  // 🚨 지차장 지시 B: Label 추출 및 홈으로 돌아갈 경로(현재 유니버스 유지) 생성
  const universeLabel = getUniverseLabel(universeCode);

  const homeHref =
    universeCode === DEFAULT_UNIVERSE_CODE
      ? "/"
      : `/?universe=${encodeURIComponent(universeCode)}`;

  const rawItems = await getLatestRankBoard(universeCode, 1000).catch(
    (error) => {
      console.warn("[RANKING] getLatestRankBoard failed:", error);
      return [];
    },
  );

  const currentYear = new Date().getFullYear();

  const items: RankingItem[] = rawItems.map((row: any) => {
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
      locationLabel: [
        row.sigungu_full_name ?? row.sigungu_name ?? "",
        row.legal_dong_name ?? "",
        row.apt_name_ko ?? "",
      ]
        .filter(Boolean)
        .join(" "),
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

  return (
    <main
      className="min-h-screen bg-[#06090f] px-2 py-4 sm:p-4 lg:p-6"
      data-testid="ranking-page"
      data-universe-code={universeCode}
      data-tier-filter={initialTier}
      data-has-query={initialSearchQuery ? "true" : "false"}
      data-selected-complex-id={initialComplexId ?? ""}
    >
      <div className="mx-auto w-full max-w-[1600px] space-y-4">
        <section className="overflow-hidden rounded-2xl border border-slate-700/50 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_18px_40px_rgba(0,0,0,0.4)]">
          <div className="border-b border-slate-800/80 px-4 py-3 lg:px-5 lg:py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
                  KOAPTIX RANKING OPERATIONS ROOM
                </p>
                <h1 className="mt-1 truncate text-lg font-semibold tracking-tight text-white sm:text-xl lg:text-2xl">
                  KOAPTIX TOP1000
                </h1>

                {/* 🚨 지차장 지시 C: 헤더 설명에 현재 유니버스 배지 추가 */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-xs text-slate-300 sm:text-sm">
                    현재 유니버스 내부 재랭킹 기준 상위 1000개 단지를 탐색하는 full board.
                  </p>
                  <span className="rounded-full border border-slate-700 bg-slate-800/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-300">
                    {universeLabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* 🚨 지차장 지시 D: 홈으로 돌아갈 때 현재 유니버스를 유지하는 링크로 교체 */}
                <Link
                  href={homeHref}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-xs uppercase tracking-[0.16em] text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
                >
                  Home
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="min-h-0">
          <Suspense
            fallback={
              <div className="h-[70vh] w-full animate-pulse rounded-2xl border border-slate-700/50 bg-[#0b1118]" />
            }
          >
            <RankingBoardClient
              key={`ranking-${universeCode}`}
              items={items}
              initialUniverseCode={universeCode}
              title="KOAPTIX TOP1000"
              apiBasePath="/api/ranking"
              boardLimit={1000}
              emptyMessage="TOP1000 데이터가 없습니다."
              enableTierFilters={true}
              useInternalScroll={false}
            />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
