"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  DiscoveryCandidate,
  RankingItem,
} from "../../../lib/koaptix/types";
import type { RegionAliasApiMetadata } from "../../../lib/koaptix/regionAliasV1.types";
import { readCurrentSearchClarificationResult } from "../CommandPalette";
import { DISCOVERY_SEARCH_REQUEST_TIMEOUT_MS } from "../../../lib/koaptix/discoverySearch";
import { formatKrwCompact } from "../../../lib/formatters";
import { getUniverseLabel } from "../../../lib/koaptix/universes";
import { SearchProgress } from "../SearchProgress";
import { publicComplexName } from "../../../lib/koaptix/rankingPresentation";

type HomeV2SearchProps = {
  universeCode: string;
  presentation?: "default" | "landing";
  examples?: { name: string; query?: string; complexId?: string }[];
  inputId?: string;
  label?: string;
  onSelectRankedItem?: (item: RankingItem) => void;
  inlineResults?: boolean;
};

type SearchPayload = RegionAliasApiMetadata & {
  ok?: boolean;
  degraded?: boolean;
  message?: string;
  localItems?: RankingItem[];
  globalItems?: RankingItem[];
  discoveryCandidates?: DiscoveryCandidate[];
};

type SearchState =
  | { status: "idle"; payload: null; message: null }
  | { status: "loading"; payload: null; message: null }
  | { status: "ready"; payload: SearchPayload; message: string | null }
  | { status: "error"; payload: null; message: string };

const INITIAL_STATE: SearchState = {
  status: "idle",
  payload: null,
  message: null,
};

function rankingHref(item: RankingItem): string {
  const params = new URLSearchParams({
    universe: item.universeCode || "KOREA_ALL",
    complexId: item.complexId,
  });
  return `/ranking?${params.toString()}`;
}

export function HomeV2Search({
  universeCode,
  presentation = "default",
  examples = [],
  inputId = "home-v2-search",
  label = "우리 단지 찾기",
  onSelectRankedItem,
  inlineResults = false,
}: HomeV2SearchProps) {
  const isLanding = presentation === "landing";
  const resultsId = `${inputId}-results`;
  const searchRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestVersion = useRef(0);
  const [query, setQuery] = useState("");
  const [composing, setComposing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [retry, setRetry] = useState(0);
  const requestQuery = isLanding ? query.trim() : query;
  const [state, setState] = useState<SearchState>(INITIAL_STATE);
  const [popupLayout, setPopupLayout] = useState({ above: false, maxHeight: 384, top: 0, bottom: 0 });

  function changeQuery(value: string) {
    if (isLanding && value.trim() === query.trim()) {
      setQuery(value);
      setDismissed(false);
      return;
    }
    requestVersion.current += 1;
    setQuery(value);
    setDismissed(false);
    setState(value.trim().length >= 2 ? { status: "loading", payload: null, message: null } : INITIAL_STATE);
  }

  useEffect(() => {
    const normalized = requestQuery.trim();
    if (normalized.length < 2 || (isLanding && composing)) {
      return;
    }

    const controller = new AbortController();
    const version = requestVersion.current;
    const isCurrent = () => active && requestVersion.current === version;
    let active = true;
    const debounce = window.setTimeout(() => {
      setState({ status: "loading", payload: null, message: null });
      const timeout = window.setTimeout(() => controller.abort(), DISCOVERY_SEARCH_REQUEST_TIMEOUT_MS);
      const params = new URLSearchParams({
        q: normalized,
        universe_code: universeCode,
        limit: "8",
      });
      if (isLanding) params.set("mode", "autocomplete");

      void fetch(`/api/search?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = (await response.json()) as SearchPayload;
          const clarification = readCurrentSearchClarificationResult(response, payload);
          if (clarification) {
            if (isCurrent()) {
              setState({
                status: "ready",
                payload: {
                  ...payload,
                  ...clarification,
                  regionResolution: clarification.regionResolution ?? undefined,
                },
                message: "지역을 확인한 뒤 검색합니다. 원하는 지역을 선택해 주세요.",
              });
            }
            return;
          }
          if (!response.ok || payload.ok !== true || (isLanding && payload.degraded)) {
            throw new Error(
              "검색을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
            );
          }
          if (isCurrent()) {
            setState({
              status: "ready",
              payload,
              message: payload.message ?? null,
            });
          }
        })
        .catch((error: unknown) => {
          if (isCurrent()) {
            setState({
              status: "error",
              payload: null,
              message:
                isLanding ? "검색 미리보기를 불러오지 못했어요. 다시 시도하거나 검색 버튼·엔터로 계속해 보세요." : error instanceof Error && error.name === "AbortError"
                  ? "검색 응답이 지연되고 있습니다. 다시 검색해 주세요."
                  : "검색을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
            });
          }
        })
        .finally(() => window.clearTimeout(timeout));
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(debounce);
      controller.abort();
    };
  }, [requestQuery, universeCode, isLanding, composing, retry]);

  const rankedItems = useMemo(() => {
    if (state.status !== "ready") return [];
    const seen = new Set<string>();
    return [
      ...(state.payload.localItems ?? []),
      ...(state.payload.globalItems ?? []),
    ]
      .filter((item) => {
        if (onSelectRankedItem && item.universeCode !== universeCode) return false;
        if (!item.complexId || seen.has(item.complexId)) return false;
        seen.add(item.complexId);
        return true;
      })
      .slice(0, 5);
  }, [state, onSelectRankedItem, universeCode]);

  const discoveryItems =
    state.status === "ready"
      ? (state.payload.discoveryCandidates ?? []).slice(0, 3)
      : [];
  const showResults = query.trim().length >= 2 && state.status !== "idle" && (!isLanding || (!dismissed && !composing));
  const clarificationChoices = state.status === "ready" ? state.payload.clarificationChoices ?? [] : [];
  const fullSearchHref = `/ranking?${new URLSearchParams({ universe: universeCode, q: query.trim() })}`;

  useEffect(() => {
    if (!showResults) return;
    const viewport = window.visualViewport;
    const updateLayout = () => {
      if (!searchRef.current) return;
      const bounds = searchRef.current.getBoundingClientRect();
      const anchor = isLanding && formRef.current ? formRef.current.getBoundingClientRect() : bounds;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
      const below = Math.max(0, viewportBottom - anchor.bottom - 20);
      const above = Math.max(0, anchor.top - viewportTop - 20);
      const openAbove = below < 160 && above > below;
      const maxHeight = Math.floor(Math.min(384, openAbove ? above : below));
      const top = anchor.bottom - bounds.top + 8;
      const bottom = bounds.bottom - anchor.top + 8;
      setPopupLayout((previous) =>
        previous.above === openAbove && previous.maxHeight === maxHeight && previous.top === top && previous.bottom === bottom
          ? previous
          : { above: openAbove, maxHeight, top, bottom },
      );
    };
    updateLayout();
    window.addEventListener("resize", updateLayout);
    window.addEventListener("scroll", updateLayout, true);
    viewport?.addEventListener("resize", updateLayout);
    viewport?.addEventListener("scroll", updateLayout);
    return () => {
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("scroll", updateLayout, true);
      viewport?.removeEventListener("resize", updateLayout);
      viewport?.removeEventListener("scroll", updateLayout);
    };
  }, [showResults, isLanding]);

  useEffect(() => {
    if (!isLanding || !showResults) return;
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !searchRef.current?.contains(event.target)) setDismissed(true);
    };
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, [isLanding, showResults]);

  return (
    <div ref={searchRef} data-presentation={isLanding ? "landing" : undefined} className="relative mt-6 max-w-2xl">
      <label htmlFor={inputId} className="mb-2 block text-control font-semibold text-ink">
        {label}
      </label>
      <form ref={formRef} action="/ranking" onSubmit={isLanding ? (event) => {
        if (onSelectRankedItem) { event.preventDefault(); setDismissed(false); }
        if ((inputRef.current?.value ?? query).trim().length < 2) { event.preventDefault(); inputRef.current?.focus(); }
      } : undefined} className="flex items-center gap-2 rounded-xl border border-[var(--ko-border)] bg-surface px-4 py-2 focus-within:border-accent focus-within:ring-1 focus-within:ring-[var(--ko-focus)]">
        <input type="hidden" name="universe" value={universeCode} />
        <input
          ref={inputRef}
          id={inputId}
          name="q"
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          onInput={isLanding ? (event) => changeQuery(event.currentTarget.value) : undefined}
          onCompositionStart={isLanding ? () => setComposing(true) : undefined}
          onCompositionEnd={isLanding ? () => setComposing(false) : undefined}
          onFocus={isLanding ? () => setDismissed(false) : undefined}
          minLength={isLanding ? 2 : undefined}
          enterKeyHint={isLanding ? "search" : undefined}
          placeholder="아파트 이름이나 지역을 입력해 보세요"
          autoComplete="off"
          aria-controls={resultsId}
          aria-busy={state.status === "loading"}
          onKeyDown={(event) => {
            if (isLanding && event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault();
            if (event.key === "Escape") {
              if (showResults) event.stopPropagation();
              if (isLanding) setDismissed(true);
              else changeQuery("");
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-lg text-ink outline-none placeholder:text-muted"
        />
        {query ? <button type="button" aria-label="검색어 지우기" onClick={() => { changeQuery(""); inputRef.current?.focus(); }} className="ko-icon-button text-sm text-muted">×</button> : null}
        <button type="submit" aria-label={onSelectRankedItem ? `${label} 검색` : "전체 랭킹에서 검색"} className="shrink-0 rounded-lg bg-[var(--ko-accent-soft)] px-4 text-control font-semibold text-accent">
          검색
        </button>
      </form>
      <p className="mt-2 text-caption leading-copy text-muted">
        두 글자 이상 입력해 주세요. 순위가 없는 단지는 ‘순위 준비 중’으로 표시해요.
      </p>
      {isLanding && examples.length > 0 ? (
        <div data-search-examples role="group" aria-label="단지명·지역명 검색 예시" className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-caption text-muted">검색 예시</span>
          {examples.map((example) => (
            <button
              key={example.query ?? example.name}
              type="button"
              onClick={() => {
                changeQuery(example.query ?? example.name);
                inputRef.current?.focus();
              }}
              className="rounded-full border border-[var(--ko-border)] px-3 py-2 text-control font-semibold text-ink hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ko-focus)]"
            >
              {example.name}
            </button>
          ))}
        </div>
      ) : null}

      {showResults ? (
        <div
          id={resultsId}
          role="region"
          aria-label={onSelectRankedItem ? `${label} 검색 결과` : "검색 결과"}
          aria-live="polite"
          aria-busy={state.status === "loading"}
          style={inlineResults ? undefined : {
            top: popupLayout.above ? "auto" : isLanding ? popupLayout.top : "calc(100% + var(--ko-space-1))",
            bottom: popupLayout.above ? (isLanding ? popupLayout.bottom : "calc(100% + 8px)") : "auto",
            maxHeight: popupLayout.maxHeight,
          }}
          className={`${inlineResults ? "relative mt-3 max-h-80" : "absolute left-0 right-0 z-30"} overflow-y-auto overscroll-contain border border-[var(--ko-border)] bg-surface p-3 shadow-[0_18px_45px_rgba(15,23,42,0.13)]`}
        >
          {state.status === "loading" ? (
            <SearchProgress />
          ) : null}
          {state.status === "error" ? (
            <div className="py-4 text-xs text-down">
              <p role="status">{state.message}</p>
              {isLanding ? <div className="mt-3 flex flex-wrap items-center gap-4">
                <button type="button" className="ko-text-link min-h-11 text-control" onClick={() => { requestVersion.current += 1; setState({ status: "loading", payload: null, message: null }); setRetry((value) => value + 1); }}>미리보기 다시 시도</button>
                <Link href={fullSearchHref} className="ko-text-link min-h-11 py-2 text-control">전체 랭킹에서 검색 ↗</Link>
              </div> : null}
            </div>
          ) : null}
          {state.status === "ready" ? (
            <>
              {rankedItems.map((item) => {
                const contents = <>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {publicComplexName(item.name)}
                    </span>
                    <span className="mt-0.5 block truncate text-caption text-muted">
                      {item.locationLabel || "지역 확인 중"}
                    </span>
                  </span>
                  {isLanding ? (
                    <span data-search-metrics className="shrink-0 text-right tabular-nums">
                      <span className="block text-caption text-muted">추정 시가총액</span>
                      <strong className="block text-lg font-bold text-ink">{formatKrwCompact(item.marketCapKrw)}</strong>
                      <span className="block text-control font-semibold text-accent">{getUniverseLabel(item.universeCode || "KOREA_ALL")} · {item.rank.toLocaleString("ko-KR")}위</span>
                      {item.snapshotDate ? <span className="block text-caption text-muted">{item.snapshotDate} 기준</span> : null}
                    </span>
                  ) : (
                    <span className="shrink-0 font-mono tabular-nums text-xs text-muted">
                      {getUniverseLabel(item.universeCode || universeCode)} · #{item.rank}
                      {item.snapshotDate ? <span className="block text-caption">{item.snapshotDate} 기준</span> : null}
                    </span>
                  )}
                </>;
                return onSelectRankedItem ? <button key={item.complexId} type="button" data-result-kind="ranked" aria-label={`${publicComplexName(item.name)} 비교 단지로 선택`}
                  onClick={() => { onSelectRankedItem(item); changeQuery(""); setDismissed(true); }}
                  className="flex w-full flex-col items-stretch gap-2 border-b border-[var(--ko-border)] py-3 text-left last:border-b-0 hover:text-accent">{contents}</button>
                  : <Link key={item.complexId} href={rankingHref(item)} data-result-kind={isLanding ? "ranked" : undefined} className="flex items-center justify-between gap-4 border-b border-[var(--ko-border)] py-3 last:border-b-0 hover:text-accent">{contents}</Link>;
              })}
              {clarificationChoices.length ? <p className="ko-copy py-2 text-sm text-muted">{state.message}</p> : null}
              {clarificationChoices.map((choice) => choice.compatibility === "INCOMPATIBLE"
                ? <Link key={choice.canonicalRegionCode} href={`/ranking?${new URLSearchParams({ universe: "KOREA_ALL", q: choice.replacementQuery })}`} className="block border-b border-[var(--ko-border)] py-3 text-xs text-accent">전국에서 {choice.qualifiedNameKo} 검색 ↗</Link>
                : <button key={choice.canonicalRegionCode} type="button" onClick={() => changeQuery(choice.replacementQuery)} className="block w-full border-b border-[var(--ko-border)] py-3 text-left text-xs text-ink hover:text-accent">{choice.qualifiedNameKo}</button>)}
              {discoveryItems.map((item) => (
                <div
                  key={item.discoveryId}
                  data-result-kind={isLanding ? "discovery" : undefined}
                  className="flex items-center justify-between gap-4 border-b border-dashed border-[var(--ko-border)] py-3 last:border-b-0"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-muted">
                      {item.displayName}
                    </span>
                    <span className="mt-0.5 block truncate text-caption text-muted">
                      {item.regionLabel || item.copy.helperText}
                    </span>
                  </span>
                  <span className="shrink-0 bg-[var(--ko-selected-neutral)] px-2 py-1 text-caption font-semibold text-muted">
                    순위 준비 중
                  </span>
                </div>
              ))}
              {!rankedItems.length && !discoveryItems.length && !clarificationChoices.length ? (
                <p data-search-empty={isLanding ? true : undefined} className="py-4 text-xs text-muted">
                  {state.message || (onSelectRankedItem ? "선택한 지역의 공개 순위에서 찾지 못했어요. 비교 지역이나 검색어를 바꿔 보세요." : isLanding
                    ? "일치하는 공개 결과를 아직 찾지 못했어요. 단지명과 지역 이름을 함께 입력해 보세요."
                    : "일치하는 공개 결과가 없습니다.")}
                </p>
              ) : null}
              <Link href={fullSearchHref} className="ko-text-link mt-3 block text-sm font-semibold text-accent">전체 랭킹에서 검색 이어보기 ↗</Link>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
