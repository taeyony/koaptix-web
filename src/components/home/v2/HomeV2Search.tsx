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

type SearchPayload = RegionAliasApiMetadata & {
  ok?: boolean;
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

export function HomeV2Search({ universeCode }: { universeCode: string }) {
  const searchRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>(INITIAL_STATE);
  const [popupLayout, setPopupLayout] = useState({ above: false, maxHeight: 384 });

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      return;
    }

    const controller = new AbortController();
    let active = true;
    const debounce = window.setTimeout(() => {
      setState({ status: "loading", payload: null, message: null });
      const timeout = window.setTimeout(() => controller.abort(), DISCOVERY_SEARCH_REQUEST_TIMEOUT_MS);
      const params = new URLSearchParams({
        q: normalized,
        universe_code: universeCode,
        limit: "8",
      });

      void fetch(`/api/search?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = (await response.json()) as SearchPayload;
          const clarification = readCurrentSearchClarificationResult(response, payload);
          if (clarification) {
            if (active) {
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
          if (!response.ok || payload.ok !== true) {
            throw new Error(
              "검색을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
            );
          }
          if (active) {
            setState({
              status: "ready",
              payload,
              message: payload.message ?? null,
            });
          }
        })
        .catch((error: unknown) => {
          if (active) {
            setState({
              status: "error",
              payload: null,
              message:
                error instanceof Error && error.name === "AbortError"
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
  }, [query, universeCode]);

  const rankedItems = useMemo(() => {
    if (state.status !== "ready") return [];
    const seen = new Set<string>();
    return [
      ...(state.payload.localItems ?? []),
      ...(state.payload.globalItems ?? []),
    ]
      .filter((item) => {
        if (!item.complexId || seen.has(item.complexId)) return false;
        seen.add(item.complexId);
        return true;
      })
      .slice(0, 5);
  }, [state]);

  const discoveryItems =
    state.status === "ready"
      ? (state.payload.discoveryCandidates ?? []).slice(0, 3)
      : [];
  const showResults = query.trim().length >= 2 && state.status !== "idle";
  const clarificationChoices = state.status === "ready" ? state.payload.clarificationChoices ?? [] : [];
  const fullSearchHref = `/ranking?${new URLSearchParams({ universe: universeCode, q: query.trim() })}`;

  useEffect(() => {
    if (!showResults) return;
    const viewport = window.visualViewport;
    const updateLayout = () => {
      if (!searchRef.current) return;
      const bounds = searchRef.current.getBoundingClientRect();
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
      const below = Math.max(0, viewportBottom - bounds.bottom - 20);
      const above = Math.max(0, bounds.top - viewportTop - 20);
      const openAbove = below < 160 && above > below;
      const maxHeight = Math.floor(Math.min(384, openAbove ? above : below));
      setPopupLayout((previous) =>
        previous.above === openAbove && previous.maxHeight === maxHeight
          ? previous
          : { above: openAbove, maxHeight },
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
  }, [showResults]);

  return (
    <div ref={searchRef} className="relative mt-6 max-w-2xl">
      <label htmlFor="home-v2-search" className="mb-2 block text-control font-semibold text-ink">
        우리 단지 찾기
      </label>
      <form action="/ranking" className="flex items-center gap-2 rounded-xl border border-[var(--ko-border)] bg-surface px-4 py-2 focus-within:border-accent focus-within:ring-1 focus-within:ring-[var(--ko-focus)]">
        <input type="hidden" name="universe" value={universeCode} />
        <input
          id="home-v2-search"
          name="q"
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setState(INITIAL_STATE);
          }}
          placeholder="단지명 또는 시군구를 입력하세요"
          autoComplete="off"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setQuery("");
              setState(INITIAL_STATE);
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-lg text-ink outline-none placeholder:text-muted"
        />
        {query ? <button type="button" aria-label="검색어 지우기" onClick={() => { setQuery(""); setState(INITIAL_STATE); }} className="ko-icon-button text-sm text-muted">×</button> : null}
        <button type="submit" aria-label="전체 랭킹에서 검색" className="shrink-0 rounded-lg bg-[var(--ko-accent-soft)] px-4 text-control font-semibold text-accent">
          검색
        </button>
      </form>
      <p className="mt-2 text-caption leading-copy text-muted">
        2자 이상 · 공개 랭킹과 관측 준비 후보를 구분해 표시합니다.
      </p>

      {showResults ? (
        <div
          id="home-v2-search-results"
          role="region"
          aria-label="검색 결과"
          aria-live="polite"
          style={{
            top: popupLayout.above ? "auto" : "calc(100% + var(--ko-space-1))",
            bottom: popupLayout.above ? "calc(100% + 8px)" : "auto",
            maxHeight: popupLayout.maxHeight,
          }}
          className="absolute left-0 right-0 z-30 overflow-y-auto overscroll-contain border border-[var(--ko-border)] bg-surface p-3 shadow-[0_18px_45px_rgba(15,23,42,0.13)]"
        >
          {state.status === "loading" ? (
            <p className="py-4 text-xs text-muted">검색 중…</p>
          ) : null}
          {state.status === "error" ? (
            <p className="py-4 text-xs text-down">{state.message}</p>
          ) : null}
          {state.status === "ready" ? (
            <>
              {rankedItems.map((item) => (
                <Link
                  key={item.complexId}
                  href={rankingHref(item)}
                  className="flex items-center justify-between gap-4 border-b border-[var(--ko-border)] py-3 last:border-b-0 hover:text-accent"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {item.name}
                    </span>
                    <span className="mt-0.5 block truncate text-caption text-muted">
                      {item.locationLabel || "지역 확인 중"}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono tabular-nums text-xs text-muted">
                    #{item.rank}
                  </span>
                </Link>
              ))}
              {clarificationChoices.length ? <p className="ko-copy py-2 text-sm text-muted">{state.message}</p> : null}
              {clarificationChoices.map((choice) => choice.compatibility === "INCOMPATIBLE"
                ? <Link key={choice.canonicalRegionCode} href={`/ranking?${new URLSearchParams({ universe: "KOREA_ALL", q: choice.replacementQuery })}`} className="block border-b border-[var(--ko-border)] py-3 text-xs text-accent">전국에서 {choice.qualifiedNameKo} 검색 ↗</Link>
                : <button key={choice.canonicalRegionCode} type="button" onClick={() => { setQuery(choice.replacementQuery); setState(INITIAL_STATE); }} className="block w-full border-b border-[var(--ko-border)] py-3 text-left text-xs text-ink hover:text-accent">{choice.qualifiedNameKo}</button>)}
              {discoveryItems.map((item) => (
                <div
                  key={item.discoveryId}
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
                    관측 준비중
                  </span>
                </div>
              ))}
              {!rankedItems.length && !discoveryItems.length && !clarificationChoices.length ? (
                <p className="py-4 text-xs text-muted">
                  {state.message || "일치하는 공개 결과가 없습니다."}
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
