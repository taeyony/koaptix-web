"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useBookmarks } from "../../../hooks/useBookmarks";
import type { RankingItem } from "../../../lib/koaptix/types";
import { HomeV2SectionHeading } from "./HomeV2SectionHeading";
import UniverseSelector from "../UniverseSelector";
import ComparisonSheet from "../ComparisonSheet";
import { getHomeUniverseRegistry } from "../../../lib/koaptix/universes";

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

function movementLabel(delta: number | null): string {
  if (delta === null) return "관측 없음";
  if (delta > 0) return `↑ ${delta}`;
  if (delta < 0) return `↓ ${Math.abs(delta)}`;
  return "— 0";
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

    void fetch(`/api/ranking?universe=${encodeURIComponent(universeCode)}&limit=1000`, {
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
  const needsNationalWatchlist = isLoaded && bookmarks.length > 0 && universeCode !== "KOREA_ALL";
  const watchlistPending = needsNationalWatchlist && nationalWatchlistState === "pending";
  const watchlistError = state.status === "error" || (needsNationalWatchlist && nationalWatchlistState === "error");
  useEffect(() => {
    if (!needsNationalWatchlist) return;
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    void fetch("/api/ranking?universe=KOREA_ALL&limit=1000", { cache: "no-store", signal: controller.signal })
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
        .filter((item) => (item.rankDelta7d ?? 0) > 0)
        .sort((a, b) => (b.rankDelta7d ?? 0) - (a.rankDelta7d ?? 0))
        .slice(0, 3),
    [items],
  );
  const falling = useMemo(
    () =>
      [...items]
        .filter((item) => (item.rankDelta7d ?? 0) < 0)
        .sort((a, b) => (a.rankDelta7d ?? 0) - (b.rankDelta7d ?? 0))
        .slice(0, 3),
    [items],
  );
  const knownMovement = items.filter((item) => Number.isFinite(item.rankDelta7d));
  const movementCounts = {
    rising: knownMovement.filter((item) => (item.rankDelta7d ?? 0) > 0)
      .length,
    falling: knownMovement.filter((item) => (item.rankDelta7d ?? 0) < 0)
      .length,
  };
  const watchlistById = new Map([...nationalItems, ...items].map((item) => [item.complexId, item]));
  function toggleComparison(item: RankingItem) {
    setComparisonItems((previous) => previous.some((row) => row.complexId === item.complexId)
      ? previous.filter((row) => row.complexId !== item.complexId)
      : [...previous.slice(-1), item]);
  }
  function detailHref(item: RankingItem) {
    return `/ranking?${new URLSearchParams({ universe: item.universeCode || universeCode, complexId: item.complexId })}`;
  }

  return (
    <Fragment>
      <section
        id="koaptix-500"
        tabIndex={-1}
        className="order-2 border-t border-[var(--ko-border)] py-10 lg:order-4 lg:col-span-3 lg:py-12"
      >
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-caption font-semibold tracking-label text-muted">
              KOAPTIX
            </p>
            <h2 className="ko-section-title mt-1 text-section font-bold tracking-heading text-ink">
              KOAPTIX 500
            </h2>
            <p className="ko-copy mt-2 max-w-copy text-sm leading-copy text-muted">
              {universeLabel} · 공개 랭킹 상위 8개 미리보기
            </p>
          </div>
          <Link
            href={rankingHref}
            className="ko-text-link inline-flex items-center gap-3 self-start border-b border-[var(--ko-ink)] pb-1 text-xs font-semibold uppercase tracking-label text-ink transition hover:border-accent hover:text-accent"
          >
            전체 랭킹 열기 <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <div className="home-v2-region-selector mt-6">
          <UniverseSelector value={universeCode} options={universeOptions} density="compact" onChange={(code) => router.push(`/?universe=${encodeURIComponent(code)}#koaptix-500`)} />
        </div>
        {universeUnavailable ? <p className="py-6 text-sm text-muted">이 지역의 공개 보드는 아직 제공되지 않습니다. 선택한 지역을 유지합니다.</p> : null}
        {comparisonItems.length ? <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>비교 선택 {comparisonItems.length}/2 · {comparisonItems.map((item) => item.name).join(" · ")}</span>
          <button type="button" disabled={comparisonItems.length !== 2} onClick={() => setComparisonOpen(true)} className="border-b border-accent pb-1 font-semibold text-accent disabled:cursor-not-allowed disabled:opacity-40">두 단지 비교</button>
          <button type="button" onClick={() => setComparisonItems([])} className="text-muted">선택 지우기</button>
        </div> : null}

        <div className="ko-table-scroll mt-8 border-t border-[var(--ko-border)]">
          <div className="ko-table-head hidden items-center gap-4 border-b border-[var(--ko-border)] py-3 text-caption font-semibold uppercase tracking-label text-muted md:grid">
            <span>Rank</span>
            <span>Complex</span>
            <span>Region</span>
            <span className="text-right">Est. market cap</span>
            <span className="text-right">7D rank</span>
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
              현재 공개된 {universeLabel} 랭킹 행이 없습니다.
            </div>
          ) : null}
          {visibleItems.map((item) => {
            const bookmarked = bookmarks.includes(item.complexId);
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
                  className={`hidden text-right font-mono tabular-nums text-xs font-semibold md:block ${movementTone(item.rankDelta7d)}`}
                >
                  {movementLabel(item.rankDelta7d)}
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
                <button type="button" onClick={() => toggleComparison(item)} aria-label={`${item.name} 비교 선택`} aria-pressed={comparisonItems.some((row) => row.complexId === item.complexId)} className="ko-icon-button text-control font-semibold text-accent">VS</button>
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

      <section className="order-3 min-h-[260px] border-b border-[var(--ko-border)] py-8 lg:order-3 lg:border-b-0 lg:border-l lg:pl-7">
        <HomeV2SectionHeading
          title="Capital Movers"
          note="공개 표본의 주간 순위 변화"
        />
        <div className="mt-6 grid grid-cols-2 gap-5 lg:grid-cols-1 lg:gap-6">
          {[
            { label: "상승", items: rising, tone: "text-up" },
            { label: "하락", items: falling, tone: "text-down" },
          ].map((group) => (
            <div key={group.label}>
              <p
                className={`text-caption font-semibold uppercase tracking-label ${group.tone}`}
              >
                {group.label}
              </p>
              <div className="mt-3 space-y-3">
                {group.items.length ? (
                  group.items.map((item) => (
                    <Link href={detailHref(item)}
                      key={item.complexId}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 truncate text-ink">
                        {item.name}
                      </span>
                      <span
                        className={`shrink-0 font-mono tabular-nums font-semibold ${group.tone}`}
                      >
                        {movementLabel(item.rankDelta7d)}
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="text-xs text-muted">
                    {state.status === "loading" && !universeUnavailable ? "관측 불러오는 중" : state.status === "error" || universeUnavailable ? "공개 관측 확인 불가" : "해당 관측 없음"}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        id="insights"
        tabIndex={-1}
        className="order-5 py-7 lg:order-5 lg:col-span-2 lg:pr-8"
      >
        <HomeV2SectionHeading
          title="Market Momentum"
          note={`${universeLabel} · 공개 TOP1000 기준`}
        />
        <div className="mt-5 grid grid-cols-3 divide-x divide-slate-200/70 py-3">
          {[
            { label: "상승 ▲", value: movementCounts.rising, tone: "text-up" },
            {
              label: "보합",
              value:
                knownMovement.length -
                movementCounts.rising -
                movementCounts.falling,
              tone: "text-muted",
            },
            { label: "하락 ▼", value: movementCounts.falling, tone: "text-down" },
          ].map((metric) => (
            <div
              key={metric.label}
              className="px-4 text-center first:pl-0 last:pr-0"
            >
              <p className={`font-mono tabular-nums text-xl font-semibold ${metric.tone}`}>
                {state.status === "ready" && knownMovement.length
                  ? metric.value
                  : "—"}
              </p>
              <p className="mt-1.5 text-caption tracking-label text-muted">
                {metric.label}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-caption leading-copy text-muted">
          {state.status === "ready" ? `${state.metadata.latestBoardDate ?? state.metadata.snapshot_date ?? "기준일 확인 중"} 기준 · ${universeLabel} 공개 표본 ${items.length}개 중 주간 비교 가능 ${knownMovement.length}개입니다.` : universeUnavailable ? "이 지역의 랭킹이 아직 공표되지 않았습니다." : state.status === "error" ? "공개 랭킹을 불러오지 못해 인사이트를 표시할 수 없습니다." : "공개 랭킹의 주간 변화를 확인하고 있습니다."} 지역 전체 시장의 가격 등락률이 아닙니다.
        </p>
        {state.status === "ready" && knownMovement.length && !movementCounts.rising && !movementCounts.falling ? <p className="mt-2 text-caption text-muted">비교 가능한 공개 표본의 주간 순위 이동이 없습니다.</p> : null}
        <div className="mt-4 flex flex-wrap gap-5 text-control font-semibold text-accent">
          <Link className="ko-text-link" href={`${rankingHref}&movement=up`}>상승 단지 보기 ↗</Link>
          <Link className="ko-text-link" href={`${rankingHref}&movement=down`}>하락 단지 보기 ↗</Link>
          <Link className="ko-text-link" href={rankingHref}>전체 랭킹에서 확인 ↗</Link>
        </div>
      </section>

      <section
        id="watchlist"
        tabIndex={-1}
        className="order-6 border-t border-[var(--ko-border)] py-7 lg:order-6 lg:border-l lg:pl-8"
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
              KOAPTIX 500의 ◇를 선택하면 이 브라우저에 저장됩니다.
            </p>
          </div>
        )}
      </section>
      {comparisonOpen ? <ComparisonSheet open items={comparisonItems} onClose={() => setComparisonOpen(false)} onRemoveItem={(item) => { toggleComparison(item as RankingItem); setComparisonOpen(false); }} onClear={() => { setComparisonItems([]); setComparisonOpen(false); }} /> : null}
    </Fragment>
  );
}
