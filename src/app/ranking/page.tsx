/**
 * /ranking = full board / TOP1000 entry.
 * 현재 universeCode 기준 full ranking을 보여주며, registry visible universe만 노출 대상으로 본다.
 */

import { Suspense } from "react";
import Link from "next/link";

import {
  DEFAULT_UNIVERSE_CODE,
  resolveUniverseRequest,
} from "../../lib/koaptix/universes";
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

function getUniverseResolutionLabel(
  resolution: ReturnType<typeof resolveUniverseRequest>,
) {
  return resolution.registryItem?.label ?? resolution.requestedUniverseCode;
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsShape>;
}) {
  const resolvedSearchParams = await resolveSearchParams(searchParams);

  const rawUniverseParam = pickSingleParam(resolvedSearchParams?.universe);
  const universeResolution = resolveUniverseRequest(rawUniverseParam, {
    capability: "ranking",
  });
  const universeCode = universeResolution.requestedUniverseCode;
  const universeUnavailable = universeResolution.universeUnavailable;
  const initialTier = parseRankingTier(
    pickSingleParam(resolvedSearchParams?.tier),
  );
  const initialSearchQuery =
    pickSingleParam(resolvedSearchParams?.q)?.trim() ?? "";
  const initialComplexId =
    pickSingleParam(resolvedSearchParams?.complexId)?.trim() || null;

  // 🚨 지차장 지시 B: Label 추출 및 홈으로 돌아갈 경로(현재 유니버스 유지) 생성
  const universeLabel = getUniverseResolutionLabel(universeResolution);

  const homeHref =
    universeCode === DEFAULT_UNIVERSE_CODE
      ? "/"
      : `/?universe=${encodeURIComponent(universeCode)}`;

  // Keep the ranking HTML shell lightweight; the client board keeps the TOP1000
  // contract by fetching the full payload through /api/ranking after hydration.
  const items: RankingItem[] = [];

  return (
    <main
      className="min-h-screen bg-[#06090f] px-2 py-4 sm:p-4 lg:p-6"
      data-testid="ranking-page"
      data-universe-code={universeCode}
      data-universe-unavailable={universeUnavailable ? "true" : "false"}
      data-universe-resolution-status={
        universeResolution.universeResolutionStatus
      }
      data-universe-unavailable-reason={universeResolution.reason ?? ""}
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
