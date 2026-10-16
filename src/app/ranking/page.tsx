/**
 * /ranking = full board / TOP1000 entry.
 * 현재 universeCode 기준 full ranking을 보여주며, registry visible universe만 노출 대상으로 본다.
 */

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getPublicPageBoard, PUBLIC_SITE_ORIGIN, publicRegionLabel } from "../../lib/koaptix/publicPageData";
import { formatKrwCompact } from "../../lib/formatters";

import {
  DEFAULT_UNIVERSE_CODE,
  resolveUniverseRequest,
} from "../../lib/koaptix/universes";
import type { RankingItem } from "../../lib/koaptix/types";

import { RankingBoardClient } from "../../components/home/RankingBoardClient";
import { LAUNCH_COPY } from "../../components/home/BetaDisclosure";
import { ThemeToggle } from "../../components/home/ThemeToggle";

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

export async function generateMetadata({ searchParams }: { searchParams?: Promise<SearchParamsShape> }): Promise<Metadata> {
  const params = await resolveSearchParams(searchParams);
  const scope = resolveUniverseRequest(pickSingleParam(params?.universe), { capability: "ranking" });
  const label = publicRegionLabel(scope.requestedUniverseCode);
  const filtered = Object.keys(params ?? {}).some(key => key !== "universe");
  const canonical = scope.requestedUniverseCode === DEFAULT_UNIVERSE_CODE ? "/ranking" : `/ranking?${new URLSearchParams({ universe: scope.requestedUniverseCode })}`;
  const title = `${label} 아파트 시가총액 순위 | KOAPTIX`;
  const description = `${label}에서 공개된 아파트의 단지 전체 추정 시가총액과 순위를 살펴보세요. 기준일과 포함 범위를 함께 안내합니다. 집 한 채의 가격이나 투자 추천이 아닙니다.`;
  return { metadataBase: new URL(PUBLIC_SITE_ORIGIN), title, description,
    alternates: { canonical }, openGraph: { title, description, url: canonical },
    robots: { index: !scope.universeUnavailable && !filtered, follow: true } };
}

async function PublicRankingPreview({ universeCode }: { universeCode: string }) {
  const preview = await getPublicPageBoard(universeCode, 5);
  if (!preview.length) return null;
  return <details className="mt-4 rounded-xl border border-[var(--ko-border)] bg-surface p-4 text-ink" data-testid="regional-ranking-preview">
    <summary className="cursor-pointer text-control font-semibold">{publicRegionLabel(universeCode)} 상위 단지 빠른보기 · {preview[0].snapshot_date} 기준</summary>
    <ol className="mt-3 divide-y divide-[var(--ko-border)]">
      {preview.map(row => <li key={String(row.complex_id)} className="flex items-center justify-between gap-3 py-4 text-body">
        <Link className="ko-text-link font-semibold" href={`/complex/${row.complex_id}${universeCode === DEFAULT_UNIVERSE_CODE ? "" : `?universe=${universeCode}`}`}>{row.rank_all}위 · {row.apt_name_ko}</Link>
        <span className="shrink-0 tabular-nums">{formatKrwCompact(row.market_cap_krw)}</span>
      </li>)}
    </ol>
  </details>;
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

  const homeHref =
    universeCode === DEFAULT_UNIVERSE_CODE
      ? "/"
      : `/?universe=${encodeURIComponent(universeCode)}`;

  // Keep the ranking HTML shell lightweight; the client board keeps the TOP1000
  // contract by fetching the full payload through /api/ranking after hydration.
  const items: RankingItem[] = [];

  return (
    <main
      className="min-h-screen overflow-x-hidden bg-[#06090f] px-2 py-3 sm:p-4 lg:p-5"
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
      <div className="mx-auto w-full min-w-0 max-w-board space-y-2 overflow-x-hidden">
        <section className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-700/50 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_18px_40px_rgba(0,0,0,0.4)]">
          <div className="min-w-0 max-w-full border-b border-slate-800/80 px-3 py-2.5 lg:px-4 lg:py-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2">
              <div className="min-w-0 max-w-full">
                <h1 className="ko-section-title mt-1 break-words text-section font-bold tracking-heading text-white [overflow-wrap:break-word] sm:text-xl lg:text-2xl">
                  전체 아파트 순위
                </h1>

              </div>

              <div className="flex shrink-0 items-center gap-2">
                <ThemeToggle />
                {/* 🚨 지차장 지시 D: 홈으로 돌아갈 때 현재 유니버스를 유지하는 링크로 교체 */}
                <Link
                  href={homeHref}
                  className="shrink-0 whitespace-nowrap rounded-lg border border-slate-700 px-2.5 py-2 text-xs uppercase tracking-label text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
                >
                  홈으로
                </Link>
              </div>
              <div className="col-span-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption">
                <span className="font-semibold text-accent">공개 테스트 중</span>
                <p className="text-muted">단지 전체의 추정 가치 · 공개 대상 최대 1,000개</p>
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
              items={items}
              initialUniverseCode={universeCode}
              title="공개 랭킹"
              apiBasePath="/api/ranking"
              boardLimit={1000}
              emptyMessage="선택한 지역에는 아직 공개된 랭킹이 없어요. 다른 지역도 찾아보세요."
              enableTierFilters={true}
              useInternalScroll={false}
              presentation="weekly-movement-full-board"
            />
          </Suspense>
          <details className="mt-3 rounded-xl border border-[var(--ko-border)] bg-surface p-3 text-caption text-muted">
            <summary className="cursor-pointer font-semibold text-ink">계산·비교 기준 및 이용 안내</summary>
            <div className="mt-3 max-w-copy space-y-2 leading-copy">
              <p>{LAUNCH_COPY.estimatedMarketCap}</p><p>{LAUNCH_COPY.compactBeta}</p>
              <p>순위 차이는 두 날짜에 모두 포함된 단지끼리 비교합니다. 시총 변화율은 양쪽의 계산 방식과 면적별 세대수 구성이 확인된 경우에만 표시합니다.</p>
            </div>
          </details>
          {!universeUnavailable ? <Suspense fallback={null}><PublicRankingPreview universeCode={universeCode} /></Suspense> : null}
        </section>
      </div>
    </main>
  );
}
