"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useBookmarks } from "../../../hooks/useBookmarks";
import type { RankingItem, WeeklyRankComparisonMetadata } from "../../../lib/koaptix/types";
import { HomeV2SectionHeading } from "./HomeV2SectionHeading";
import UniverseSelector from "../UniverseSelector";
import ComparisonSheet from "../ComparisonSheet";
import { getHomeUniverseRegistry } from "../../../lib/koaptix/universes";
import { formatRankMovement, selectMovementHighlights } from "../../../lib/koaptix/rankingPresentation";
import { commonRankDelta } from "../../../lib/koaptix/weeklyRankComparison";
import { HomeV2MovementTicker } from "./HomeV2MovementTicker";
import { HomeV2Insights } from "./HomeV2Insights";

type RankingsPayload = {
  ok?: boolean;
  requestedUniverseCode?: string;
  renderedUniverseCode?: string;
  renderedLimit?: number;
  resultCount?: number;
  snapshot_date?: string | null;
  latestBoardDate?: string | null;
  reason?: string | null;
  items?: RankingItem[];
  weeklyRankComparison?: WeeklyRankComparisonMetadata;
};

type BoardState =
  | { status: "loading"; items: RankingItem[]; metadata: null; error: null }
  | {
      status: "ready";
      items: RankingItem[];
      metadata: RankingsPayload;
      error: null;
    }
  | { status: "error"; items: RankingItem[]; metadata: null; error: string };

const numberFormat = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 1,
});

function marketCapLabel(item: RankingItem): string {
  const trillion =
    item.marketCapTrillionKrw ?? item.marketCapKrw / 1_000_000_000_000;
  return Number.isFinite(trillion) && trillion > 0
    ? `${numberFormat.format(trillion)}조`
    : "—";
}

function locationLabel(item: RankingItem): string {
  return [item.sigunguName, item.legalDongName].filter(Boolean).join(" ") || "지역 확인 중";
}

function movementTone(delta: number | null): string {
  if (delta === null || delta === 0) return "text-muted";
  return delta > 0 ? "text-up" : "text-down";
}

function LoadingRows() {
  return (
    <div className="divide-y divide-[var(--ko-border)]" aria-label="랭킹 불러오는 중">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="grid grid-cols-[42px_1fr_84px] gap-4 py-4">
          <span className="h-3 animate-pulse bg-[var(--ko-selected-neutral)]" />
          <span className="h-3 animate-pulse bg-[var(--ko-selected-neutral)]" />
          <span className="h-3 animate-pulse bg-[var(--ko-selected-neutral)]" />
        </div>
      ))}
    </div>
  );
}

export function HomeV2LiveBoard({ universeCode, universeLabel, universeUnavailable }: {
  universeCode: string;
  universeLabel: string;
  universeUnavailable: boolean;
}) {
  const router = useRouter();
  const [retryKey, setRetryKey] = useState(0);
  const [comparisonItems, setComparisonItems] = useState<RankingItem[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const universeOptions = getHomeUniverseRegistry().map(({ code, label }) => ({ code, label }));
  const rankingHref = `/ranking?universe=${encodeURIComponent(universeCode)}`;
  const [state, setState] = useState<BoardState>({
    status: "loading",
    items: [],
    metadata: null,
    error: null,
  });
  const { bookmarks, bookmarkDetails, toggleBookmark, isLoaded, storageUnavailable } = useBookmarks();
  const [nationalItems, setNationalItems] = useState<RankingItem[]>([]);
  const [nationalWatchlistState, setNationalWatchlistState] = useState<"pending" | "ready" | "error">("pending");

  useEffect(() => {
    if (universeUnavailable) return;
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);

    void fetch(`/api/ranking?universe=${encodeURIComponent(universeCode)}&limit=1000&comparison=common`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as RankingsPayload;
        if (
          !response.ok ||
          payload.ok !== true ||
          payload.requestedUniverseCode !== universeCode ||
          payload.renderedUniverseCode !== universeCode ||
          !Array.isArray(payload.items)
        ) {
          throw new Error(
            "선택한 지역의 공개 랭킹을 불러오지 못했습니다.",
          );
        }
        if (active) {
          setState({
            status: "ready",
            items: payload.items,
            metadata: payload,
            error: null,
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: "error",
            items: [],
            metadata: null,
            error:
              error instanceof Error && error.name === "AbortError"
                ? "랭킹 응답이 지연되고 있습니다. 다시 시도해 주세요."
                : "선택한 지역의 공개 랭킹을 불러오지 못했습니다.",
          });
        }
      })
      .finally(() => window.clearTimeout(timeout));

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [retryKey, universeCode, universeUnavailable]);

  const items = state.items;
  const boardDate = state.status === "ready" ? state.metadata.latestBoardDate ?? state.metadata.snapshot_date ?? null : null;
  const needsNationalWatchlist = isLoaded && bookmarks.length > 0 && universeCode !== "KOREA_ALL";
  const watchlistPending = needsNationalWatchlist && nationalWatchlistState === "pending";
  const watchlistError = state.status === "error" || (needsNationalWatchlist && nationalWatchlistState === "error");
  useEffect(() => {
    if (!needsNationalWatchlist) return;
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    void fetch("/api/ranking?universe=KOREA_ALL&limit=1000&comparison=common", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as RankingsPayload;
        if (!response.ok || payload.ok !== true || payload.requestedUniverseCode !== "KOREA_ALL" || payload.renderedUniverseCode !== "KOREA_ALL" || !Array.isArray(payload.items)) throw new Error("watchlist_read_failed");
        if (active) { setNationalItems(payload.items); setNationalWatchlistState("ready"); }
      })
      .catch(() => { if (active) setNationalWatchlistState("error"); })
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [needsNationalWatchlist]);
  const visibleItems = items.slice(0, 8);
  const rising = useMemo(
    () =>
      [...items]
        .filter((item) => (commonRankDelta(item) ?? 0) > 0)
        .sort((a, b) => (commonRankDelta(b) ?? 0) - (commonRankDelta(a) ?? 0))
        .slice(0, 3),
    [items],
  );
  const falling = useMemo(
    () =>
      [...items]
        .filter((item) => (commonRankDelta(item) ?? 0) < 0)
        .sort((a, b) => (commonRankDelta(a) ?? 0) - (commonRankDelta(b) ?? 0))
        .slice(0, 3),
    [items],
  );
  const tickerItems = useMemo(() => {
    const cardIds = new Set([...rising, ...falling].map(item => item.complexId));
    return selectMovementHighlights(items.filter(item => !cardIds.has(item.complexId)), boardDate, "common");
  }, [items, boardDate, rising, falling]);
  const watchlistById = new Map([...nationalItems, ...items].map((item) => [item.complexId, item]));
  function toggleComparison(item: RankingItem) {
    const next = comparisonItems.some((row) => row.complexId === item.complexId)
      ? comparisonItems.filter((row) => row.complexId !== item.complexId)
      : [...comparisonItems.slice(-1), item];
    setComparisonItems(next);
    setComparisonOpen(next.length === 2);
  }
  function detailHref(item: RankingItem) {
    return `/ranking?${new URLSearchParams({ universe: item.universeCode || universeCode, complexId: item.complexId })}`;
  }

  return (
    <Fragment>
      <section
        id="koaptix-500"
        tabIndex={-1}
        className="order-1 border-t border-[var(--ko-border)] py-8 lg:order-1 lg:col-span-3"
      >
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-caption font-semibold tracking-label text-muted">
              KOAPTIX
            </p>
            <h2 className="ko-section-title mt-1 text-section font-bold tracking-heading text-ink">
              아파트 시가총액 순위
            </h2>
            <p className="mt-2 text-caption leading-copy text-muted">
              {universeLabel} · 상위 8개 미리보기 · 전체 랭킹은 최대 1,000개
            </p>
          </div>
          <Link
            href={rankingHref}
            className="ko-text-link inline-flex items-center gap-3 self-start border-b border-[var(--ko-ink)] pb-1 text-xs font-semibold uppercase tracking-label text-ink transition hover:border-accent hover:text-accent"
          >
            전체 랭킹 열기 <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <p className="mt-3 text-caption leading-copy text-muted" data-testid="home-ranking-scope">
          {state.status === "ready" ? `랭킹 기준일 ${state.metadata.latestBoardDate ?? state.metadata.snapshot_date ?? "확인 중"} · 공개 TOP${items.length.toLocaleString("ko-KR")} · 상위 ${Math.min(8, items.length)}개 표시` : universeUnavailable ? "선택한 지역의 랭킹은 아직 공개되지 않았어요." : "랭킹의 기준 날짜와 포함된 단지를 확인하고 있어요."}
        </p>
        {state.status === "ready" && state.metadata.weeklyRankComparison?.status === "unavailable" ? (
          <p className="mt-3 text-caption text-muted" role="status">공통 단지 전체를 확인하지 못해 주간 비교는 잠시 비워 뒀어요. 현재 공표 순위는 그대로 볼 수 있어요.</p>
        ) : null}

        <div className="home-v2-region-selector mt-6">
          <UniverseSelector value={universeCode} options={universeOptions} density="compact" onChange={(code) => router.push(`/?universe=${encodeURIComponent(code)}#koaptix-500`)} />
        </div>
        {universeUnavailable ? <p className="py-6 text-sm text-muted">이 지역의 랭킹은 아직 준비 중이에요. 다른 지역도 찾아보세요.</p> : null}
        {comparisonItems.length ? <div className="sticky top-4 z-20 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-accent bg-surface p-3 text-control text-ink">
          <span role="status">비교 선택 {comparisonItems.length}/2 · {comparisonItems.map((item) => item.name).join(" · ")}{comparisonItems.length === 1 ? " · 다른 단지의 ‘비교’를 누르면 비교창이 열려요." : ""}</span>
          <button type="button" disabled={comparisonItems.length !== 2} onClick={() => setComparisonOpen(true)} className="border-b border-accent pb-1 font-semibold text-accent disabled:cursor-not-allowed disabled:opacity-40">두 단지 비교</button>
          <button type="button" onClick={() => setComparisonItems([])} className="text-muted">선택 지우기</button>
        </div> : null}

        <div className="ko-table-scroll mt-8 border-t border-[var(--ko-border)]">
          <div className="ko-table-head hidden items-center gap-4 border-b border-[var(--ko-border)] py-3 text-caption font-semibold uppercase tracking-label text-muted md:grid">
            <span>순위</span>
            <span>아파트</span>
            <span>지역</span>
            <span className="text-right">추정 시가총액</span>
            <span className="text-right">주간 비교 · 공통 단지</span>
            <span />
            <span>비교</span>
          </div>
          {state.status === "loading" && !universeUnavailable ? <LoadingRows /> : null}
          {state.status === "error" ? (
            <div className="flex flex-col items-start gap-3 border-b border-[var(--ko-border)] py-10 text-sm text-muted">
              <p>{state.error}</p>
              <button
                type="button"
                onClick={() => {
                  setState({
                    status: "loading",
                    items: [],
                    metadata: null,
                    error: null,
                  });
                  setRetryKey((value) => value + 1);
                }}
                className="border-b border-accent pb-1 text-xs font-semibold text-accent"
              >
                다시 시도
              </button>
            </div>
          ) : null}
          {state.status === "ready" && !visibleItems.length ? (
            <div className="border-b border-[var(--ko-border)] py-12 text-center text-sm text-muted">
              현재 공개된 {universeLabel} 랭킹에 표시할 단지가 없어요.
            </div>
          ) : null}
          {visibleItems.map((item) => {
            const bookmarked = bookmarks.includes(item.complexId);
            const comparing = comparisonItems.some((row) => row.complexId === item.complexId);
            return (
              <div
                key={item.complexId}
                className="ko-table-row grid items-center gap-2 border-b border-[var(--ko-border)] py-[var(--ko-row-padding)] transition hover:bg-surface md:gap-4"
              >
                <span className="font-mono tabular-nums text-sm font-semibold text-ink">
                  {item.rank || "—"}
                </span>
                <div className="min-w-0">
                  <Link href={detailHref(item)} className="block truncate text-sm font-semibold text-ink hover:text-accent">
                    {item.name || "단지명 확인 중"}
                  </Link>
                  <p className="mt-1 truncate text-caption text-muted md:hidden">
                    {locationLabel(item)}
                  </p>
                </div>
                <span className="hidden truncate text-xs text-muted md:block">
                  {locationLabel(item)}
                </span>
                <span className="text-right font-mono tabular-nums text-xs font-semibold text-ink">
                  {marketCapLabel(item)}
                </span>
                <span
                  className={`hidden text-right font-mono tabular-nums text-xs font-semibold md:block ${movementTone(commonRankDelta(item))}`}
                >
                  {formatRankMovement(commonRankDelta(item))}
                </span>
                <button
                  type="button"
                  onClick={() => toggleBookmark(item.complexId, { name: item.name, locationLabel: locationLabel(item) })}
                  aria-label={
                    bookmarked
                      ? `${item.name} 관심목록에서 제거`
                      : `${item.name} 관심목록에 추가`
                  }
                  className={`ko-icon-button text-lg leading-copy transition ${bookmarked ? "text-accent" : "text-muted hover:text-accent"}`}
                  aria-pressed={bookmarked}
                  disabled={!isLoaded}
                >
                  {bookmarked ? "◆" : "◇"}
                </button>
                <button type="button" onClick={() => toggleComparison(item)} aria-label={`${item.name} 비교 ${comparing ? "선택 취소" : "선택"}`} aria-pressed={comparing} className={`ko-icon-button text-control font-semibold ${comparing ? "border border-accent bg-[var(--ko-selected-neutral)] text-ink" : "text-accent"}`}>{comparing ? "✓" : "비교"}</button>
              </div>
            );
          })}
        </div>
        {state.status === "ready" ? (
          <p className="mt-3 text-caption text-muted">
            랭킹 기준일 {state.metadata.latestBoardDate ?? state.metadata.snapshot_date ?? "확인 중"} · 공개 표본 {items.length}개 중 상위 {visibleItems.length}개
          </p>
        ) : null}
      </section>

      <HomeV2Insights
        items={items}
        rising={rising}
        falling={falling}
        comparison={state.metadata?.weeklyRankComparison}
        snapshotDate={boardDate}
        status={universeUnavailable ? "unavailable" : state.status}
        universeCode={universeCode}
        universeLabel={universeLabel}
      />

      <section
        id="watchlist"
        tabIndex={-1}
        className="order-6 border-t border-[var(--ko-border)] py-7 lg:order-4 lg:border-l lg:pl-8"
      >
        <HomeV2SectionHeading title="관심목록" note={`이 브라우저에만 저장${isLoaded ? ` · ${bookmarks.length}개` : ""}`} />
        {storageUnavailable ? <p role="status" className="mt-3 text-caption text-muted">브라우저 저장소를 사용할 수 없어 새로고침 후에는 변경 사항이 유지되지 않을 수 있습니다.</p> : null}
        {!isLoaded ? (
          <p className="mt-7 text-sm text-muted">관심목록 확인 중</p>
        ) : bookmarks.length ? (
          <div className="mt-4 max-h-[28rem] overflow-y-auto divide-y divide-slate-200/70">
            {bookmarks.map((id) => {
              const item = watchlistById.get(id);
              const detail = bookmarkDetails[id];
              return (
              <div
                key={id}
                className="flex items-center justify-between gap-4 py-4"
              >
                <div className="min-w-0">
                  {item ? <Link href={detailHref(item)} className="block truncate text-sm font-semibold text-ink hover:text-accent">{item.name}</Link> : <p className="truncate text-sm font-semibold text-ink">{detail?.name || `저장한 단지 ${id}`}</p>}
                  <p className="mt-1 truncate text-caption text-muted">
                    {item ? locationLabel(item) : detail?.locationLabel || "지역 확인 중"}
                  </p>
                  {!item ? <p className="mt-1 text-caption text-muted">{watchlistPending || state.status === "loading" ? "공개 랭킹 확인 중" : watchlistError ? "공개 랭킹을 불러오지 못했습니다." : "현재 공개 TOP1000에 없는 저장 항목입니다."}</p> : null}
                </div>
                <span className="shrink-0 font-mono tabular-nums text-xs text-muted">
                  {item ? marketCapLabel(item) : "—"}
                </span>
                <button type="button" className="ko-icon-button shrink-0 text-accent" aria-label={`${item?.name || detail?.name || id} 관심목록에서 제거`} onClick={() => toggleBookmark(id)}>◆</button>
              </div>
            );})}
            <Link href="/ranking?universe=KOREA_ALL&view=watchlist" className="ko-text-link inline-block py-3 text-control font-semibold text-accent">전체 랭킹에서 관심 단지 확인 ↗</Link>
          </div>
        ) : (
          <div className="mt-4 border-t border-dashed border-[var(--ko-border)] pt-5">
            <p className="text-sm font-medium text-ink">
              아직 저장한 단지가 없습니다.
            </p>
            <p className="ko-copy mt-1 max-w-copy text-sm leading-copy text-muted">
              아파트 시가총액 순위의 ◇를 선택하면 이 브라우저에 저장됩니다.
            </p>
          </div>
        )}
      </section>
      {comparisonOpen ? <ComparisonSheet open items={comparisonItems} onClose={() => setComparisonOpen(false)} onRemoveItem={(item) => { toggleComparison(item as RankingItem); setComparisonOpen(false); }} onClear={() => { setComparisonItems([]); setComparisonOpen(false); }} /> : null}
      {state.status === "ready" && boardDate && tickerItems.length ? <HomeV2MovementTicker key={universeCode + boardDate} items={tickerItems} snapshotDate={boardDate} universeLabel={universeLabel} universeCode={universeCode} /> : null}
    </Fragment>
  );
}
