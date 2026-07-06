"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RankingItem } from "../../lib/koaptix/types";
import { BetaDisclosure } from "./BetaDisclosure";
import {
  DEFAULT_UNIVERSE_CODE,
  getSearchUniverseRegistry,
  resolveServiceUniverseCode,
  type KnownUniverseCode,
} from "../../lib/koaptix/universes";

interface CommandPaletteProps {
  items: RankingItem[];
  initialUniverseCode?: string;
}

type SearchApiResponse = {
  ok?: boolean;
  universeCode?: string;
  localItems?: RankingItem[];
  globalItems?: RankingItem[];
  message?: string;
};

type RegionSearchResult = {
  code: KnownUniverseCode;
  label: string;
  displayLabel: string;
};

const SEARCH_API = (query: string, universeCode: string, limit = 12) =>
  `/api/search?q=${encodeURIComponent(query)}&universe_code=${encodeURIComponent(
    universeCode,
  )}&limit=${limit}`;

const MAX_REGION_SEARCH_RESULTS = 4;

const SGG_CODE_PREFIX_LABELS: Record<string, string> = {
  "11": "서울특별시",
  "26": "부산광역시",
  "27": "대구광역시",
  "28": "인천광역시",
  "29": "광주광역시",
  "30": "대전광역시",
  "31": "울산광역시",
  "36": "세종특별자치시",
  "41": "경기도",
  "42": "강원도",
  "43": "충청북도",
  "44": "충청남도",
  "45": "전라북도",
  "46": "전라남도",
  "47": "경상북도",
  "48": "경상남도",
  "50": "제주특별자치도",
  "51": "강원특별자치도",
  "52": "전북특별자치도",
};

function normalizeRegionSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function getAdministrativeShortLabel(label: string) {
  return label
    .replace(/특별자치도|특별자치시|특별시|광역시|자치도|자치시/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getRegionSearchTerms(label: string, code: string) {
  const administrativeShortLabel = getAdministrativeShortLabel(label);

  return Array.from(
    new Set([
      label,
      label.replace(/\s+/g, ""),
      administrativeShortLabel,
      administrativeShortLabel.replace(/\s+/g, ""),
      code,
    ]),
  ).map(
    normalizeRegionSearchText,
  );
}

function hasAdministrativeContext(label: string) {
  return (
    /\s/.test(label.trim()) ||
    /특별자치도|특별자치시|특별시|광역시/.test(label)
  );
}

function getSggCodePrefixLabel(code: string) {
  if (!code.startsWith("SGG_")) return null;
  return SGG_CODE_PREFIX_LABELS[code.slice(4, 6)] ?? null;
}

function getRegionSearchDisplayLabel(label: string, code: string) {
  if (hasAdministrativeContext(label)) return label;

  const prefixLabel = getSggCodePrefixLabel(code);
  if (!prefixLabel) return label;

  return `${prefixLabel} ${label}`;
}

function getAdministrativeSearchShortLabel(label: string) {
  return label
    .replace(/특별자치도|특별자치시|특별시|광역시|자치시|시/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getRegionSearchPhrasesForScore(label: string, code: string) {
  const displayLabel = getRegionSearchDisplayLabel(label, code);
  const shortLabel = getAdministrativeSearchShortLabel(label);
  const shortDisplayLabel = getAdministrativeSearchShortLabel(displayLabel);

  return Array.from(
    new Set([
      label,
      displayLabel,
      shortLabel,
      shortDisplayLabel,
      code,
      ...getRegionSearchTerms(label, code),
    ]),
  );
}

function getLastAdministrativeToken(value: string) {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  return tokens[tokens.length - 1] ?? value.trim();
}

function getRegionAdministrativeTokensForScore(label: string, code: string) {
  return Array.from(
    new Set(
      getRegionSearchPhrasesForScore(label, code)
        .filter((phrase) => !phrase.toUpperCase().startsWith("SGG_"))
        .map(getLastAdministrativeToken)
        .filter(Boolean),
    ),
  );
}

function isShortAdministrativeQuery(normalizedQuery: string) {
  return (
    normalizedQuery.length <= 3 &&
    (normalizedQuery.endsWith("구") ||
      normalizedQuery.endsWith("군") ||
      normalizedQuery.endsWith("시"))
  );
}

function scoreRegionSearchResult(
  label: string,
  code: string,
  normalizedQuery: string,
) {
  const normalizedPhrases = getRegionSearchPhrasesForScore(label, code).map(
    normalizeRegionSearchText,
  );
  const normalizedTokens = getRegionAdministrativeTokensForScore(label, code).map(
    normalizeRegionSearchText,
  );
  const normalizedOriginalPhrases = [
    label,
    getAdministrativeSearchShortLabel(label),
  ].map(normalizeRegionSearchText);

  if (normalizeRegionSearchText(code) === normalizedQuery) return 1000;
  if (normalizedPhrases.some((phrase) => phrase === normalizedQuery)) return 900;
  if (normalizedTokens.some((token) => token === normalizedQuery)) return 850;

  if (
    normalizedOriginalPhrases.some((phrase) =>
      phrase.startsWith(normalizedQuery),
    )
  ) {
    return 750;
  }

  if (normalizedPhrases.some((phrase) => phrase.startsWith(normalizedQuery))) {
    return 700;
  }

  if (isShortAdministrativeQuery(normalizedQuery)) return null;

  if (normalizedPhrases.some((phrase) => phrase.includes(normalizedQuery))) {
    return 200;
  }

  return null;
}

async function readSearchResult(
  input: string,
  signal: AbortSignal,
): Promise<{ localItems: RankingItem[]; globalItems: RankingItem[] }> {
  const response = await fetch(input, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  const json = (await response.json()) as SearchApiResponse;

  if (!response.ok || json.ok === false) {
    throw new Error(
      json.message ?? `Request failed: ${response.status} ${input}`,
    );
  }

  return {
    localItems: json.localItems ?? [],
    globalItems: json.globalItems ?? [],
  };
}

export function CommandPalette({
  items,
  initialUniverseCode = DEFAULT_UNIVERSE_CODE,
}: CommandPaletteProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlUniverseCode = resolveServiceUniverseCode(
    searchParams?.get("universe") ?? initialUniverseCode,
  );

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [localItems, setLocalItems] = useState<RankingItem[]>([]);
  const [globalItems, setGlobalItems] = useState<RankingItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const cacheRef = useRef<
    Record<string, { localItems: RankingItem[]; globalItems: RankingItem[] }>
  >({});

  const replaceUrlParams = useCallback(
    (
      updater: (params: URLSearchParams) => void,
      mode: "replace" | "push" = "replace",
    ) => {
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      updater(params);

      const nextQuery = params.toString();
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;

      if (mode === "push") {
        window.history.pushState(null, "", nextUrl);
      } else {
        window.history.replaceState(null, "", nextUrl);
      }

      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    [pathname],
  );

  const localFallbackItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return items
      .filter((item) => {
        return (
          item.name.toLowerCase().includes(q) ||
          item.sigunguName?.toLowerCase().includes(q) ||
          item.legalDongName?.toLowerCase().includes(q) ||
          item.locationLabel?.toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [items, query]);

  const regionSearchResults = useMemo<RegionSearchResult[]>(() => {
    const normalizedQuery = normalizeRegionSearchText(query);
    if (normalizedQuery.length < 2) return [];

    return getSearchUniverseRegistry()
      .filter((universe) => universe.scope === "SIGUNGU")
      .map((universe) => {
        const score = scoreRegionSearchResult(
          universe.label,
          universe.code,
          normalizedQuery,
        );

        if (score === null) return null;

        return {
          code: universe.code,
          label: universe.label,
          displayLabel: getRegionSearchDisplayLabel(
            universe.label,
            universe.code,
          ),
          order: universe.order,
          score,
        };
      })
      .filter(
        (
          result,
        ): result is RegionSearchResult & { order: number; score: number } =>
          result !== null,
      )
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .slice(0, MAX_REGION_SEARCH_RESULTS)
      .map(({ code, label, displayLabel }) => ({
        code,
        label,
        displayLabel,
      }));
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 10);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isMetaK =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      const isEsc = event.key === "Escape";

      if (isMetaK) {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }

      if (isEsc) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const q = query.trim();
    if (q.length < 2) {
      setLocalItems([]);
      setGlobalItems([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const cacheKey = `${urlUniverseCode}::${q.toLowerCase()}`;
    const cached = cacheRef.current[cacheKey];
    if (cached) {
      setLocalItems(cached.localItems);
      setGlobalItems(cached.globalItems);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

  const controller = new AbortController();
  let cancelled = false;
  let timedOut = false;

  const searchFetchTimeoutMs = 7000;
  let fetchTimeoutId: number | undefined;

  const timer = window.setTimeout(async () => {
    setIsSearching(true);
    setSearchError(null);

    fetchTimeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, searchFetchTimeoutMs);

    try {
      const next = await readSearchResult(
        SEARCH_API(q, urlUniverseCode, 12),
        controller.signal,
      );

      if (cancelled) return;

      cacheRef.current[cacheKey] = next;
      setLocalItems(next.localItems);
      setGlobalItems(next.globalItems);
    } catch (error) {
      if (!timedOut && (controller.signal.aborted || cancelled)) return;

      const message = timedOut
        ? "검색 시간 초과"
        : error instanceof Error
          ? error.message
          : "검색 실패";

      if (timedOut) {
        console.warn("[CommandPalette] search fetch timed out", {
          urlUniverseCode,
          q,
        });
      } else {
        console.error("[CommandPalette] search failed", {
          urlUniverseCode,
          q,
          message,
        });
      }

      setSearchError(message);
      setLocalItems([]);
      setGlobalItems([]);
    } finally {
      if (fetchTimeoutId !== undefined) window.clearTimeout(fetchTimeoutId);
      if (!cancelled) {
        setIsSearching(false);
      }
    }
  }, 180);

  return () => {
    cancelled = true;
    controller.abort();
    window.clearTimeout(timer);
    if (fetchTimeoutId !== undefined) window.clearTimeout(fetchTimeoutId);
  };
  }, [isOpen, query, urlUniverseCode]);

  const visibleLocalItems = useMemo(() => {
    if (query.trim().length < 2) {
      return localFallbackItems;
    }
    return localItems;
  }, [localFallbackItems, localItems, query]);

  const visibleGlobalItems = useMemo(() => {
    if (query.trim().length < 2) return [];
    return globalItems;
  }, [globalItems, query]);

  const rankingSearchHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("universe", urlUniverseCode);

    const q = query.trim();
    if (q) {
      params.set("q", q);
    }

    return `/ranking?${params.toString()}`;
  }, [query, urlUniverseCode]);

  const handleSelectItem = useCallback(
    (item: RankingItem) => {
      replaceUrlParams((params) => {
        if (item.universeCode && item.universeCode !== DEFAULT_UNIVERSE_CODE) {
          params.set("universe", item.universeCode);
        } else {
          params.delete("universe");
        }

        params.set("complexId", item.complexId);
      }, "push");

      setIsOpen(false);
    },
    [replaceUrlParams],
  );

  const handleOpenRankingSearch = useCallback(() => {
    router.push(rankingSearchHref);
    setIsOpen(false);
  }, [rankingSearchHref, router]);

  const handleSelectRegionResult = useCallback(
    (result: RegionSearchResult) => {
      const params = new URLSearchParams();
      params.set("universe", result.code);

      const q = query.trim();
      if (q) {
        params.set("q", q);
      }

      router.push(`/ranking?${params.toString()}`);
      setIsOpen(false);
    },
    [query, router],
  );

  const renderResultCard = (item: RankingItem) => (
    <button
      key={`${item.universeCode ?? "KOREA_ALL"}::${item.complexId}`}
      type="button"
      onClick={() => handleSelectItem(item)}
      data-testid="command-result-card"
      data-complex-id={item.complexId}
      data-universe-code={item.universeCode ?? item.universe_code ?? ""}
      className="group flex w-full items-start justify-between rounded-2xl border border-slate-800 bg-[#0f1620] px-4 py-4 text-left transition hover:border-cyan-500/30 hover:bg-[#111b27]"
    >
      <div className="min-w-0 pr-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-400">
            #{item.rank_all ?? item.rank ?? "-"}
          </span>
          <span className="truncate text-[28px] font-semibold leading-none text-white">
            {item.name}
          </span>
        </div>

        <p className="mt-2 truncate text-sm text-slate-400">
          {item.locationLabel || `${item.sigunguName ?? ""} ${item.legalDongName ?? ""}`}
          {" · "}
          ID {item.complexId}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
          MARKET CAP
        </p>
        <p className="mt-1 text-3xl font-semibold text-slate-100">
          {typeof item.marketCapTrillionKrw === "number" && item.marketCapTrillionKrw > 0
            ? `${item.marketCapTrillionKrw.toFixed(2)}조원`
            : `${Math.round((item.marketCapKrw ?? 0) / 100000000).toLocaleString()}억원`}
        </p>
      </div>
    </button>
  );

  const renderRegionResultCard = (result: RegionSearchResult) => (
    <button
      key={`region::${result.code}`}
      type="button"
      onClick={() => handleSelectRegionResult(result)}
      data-testid="command-region-result-card"
      data-universe-code={result.code}
      className="group flex w-full items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-left transition hover:border-emerald-400/40 hover:bg-emerald-500/15"
    >
      <div className="min-w-0 pr-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-emerald-400/30 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
            REGION
          </span>
          <span className="truncate text-[26px] font-semibold leading-none text-white">
            {result.displayLabel}
          </span>
        </div>

        <p className="mt-2 truncate text-sm text-emerald-100/70">
          {result.code}
          {result.displayLabel !== result.label ? ` - ${result.label}` : ""}
          {" - TOP1000 지역 보드로 이동"}
        </p>
      </div>

      <div className="shrink-0 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300/80">
        OPEN
      </div>
    </button>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        data-testid="command-palette-open"
        className="fixed bottom-6 right-6 z-[980] rounded-full border border-slate-700 bg-slate-950/95 px-4 py-2 text-xs font-medium text-slate-200 shadow-2xl backdrop-blur transition hover:border-cyan-400/30 hover:text-cyan-300"
      >
        단지·지역 검색
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm">
          <div className="mx-auto mt-24 w-[92%] max-w-[820px] rounded-[28px] border border-cyan-500/20 bg-[#0b1118]/95 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_24px_80px_rgba(0,0,0,0.55)]">
            <div className="border-b border-slate-800/80 px-6 py-5">
              <p className="text-[12px] uppercase tracking-[0.24em] text-cyan-300/80">
                KOAPTIX 관측 검색
              </p>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                  🔎
                </div>

                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  data-testid="command-palette-input"
                  placeholder="아파트명, 동네명, 시군구를 입력하세요."
                  className="h-12 w-full rounded-2xl border border-slate-700 bg-black/30 px-4 text-lg text-white outline-none transition focus:border-cyan-400/50"
                />

                <button
                  type="button"
                  onClick={handleOpenRankingSearch}
                  data-testid="command-open-ranking-search"
                  className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-cyan-300 transition hover:border-cyan-400/50 hover:bg-cyan-500/20"
                >
                  TOP1000
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-400 transition hover:border-slate-500 hover:text-white"
                >
                  닫기
                </button>
              </div>
            </div>

            <div className="px-6 py-4">
              {(query.trim().length < 2) && (
                <div className="mb-4 rounded-2xl border border-slate-800 bg-black/20 px-4 py-3 text-sm text-slate-400">
                  두 글자 이상 입력하면 현재 공개 보드에서 먼저 찾고, 필요하면 전국 공개 결과까지 이어서 확인합니다.
                </div>
              )}

              {query.trim().length >= 2 && regionSearchResults.length > 0 && (
                <div className="mb-4">
                  <div className="mb-3 flex items-center justify-between text-[12px] uppercase tracking-[0.18em] text-emerald-300/80">
                    <span>지역 바로가기</span>
                    <span>{regionSearchResults.length} ITEMS</span>
                  </div>
                  <div className="space-y-3">
                    {regionSearchResults.map(renderRegionResultCard)}
                  </div>
                </div>
              )}

              {isSearching ? (
                <div className="rounded-2xl border border-slate-800 bg-black/20 px-5 py-8 text-center text-slate-400">
                  검색 중...
                </div>
              ) : searchError ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-8 text-center text-rose-300">
                  {searchError}
                </div>
              ) : query.trim().length < 2 ? (
                <div className="space-y-3">
                  {visibleLocalItems.length > 0 ? (
                    <>
                      <div className="mb-2 flex items-center justify-between text-[12px] uppercase tracking-[0.18em] text-slate-500">
                        <span>현재 보드 미리보기</span>
                        <span>{visibleLocalItems.length} ITEMS</span>
                      </div>
                      <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                        {visibleLocalItems.map(renderResultCard)}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-slate-800 bg-black/20 px-5 py-8 text-center text-slate-400">
                      아파트명이나 지역명을 두 글자 이상 입력해 관측 기록을 찾아보세요.
                    </div>
                  )}
                </div>
              ) : visibleLocalItems.length > 0 || visibleGlobalItems.length > 0 ? (
                <div className="max-h-[520px] space-y-5 overflow-y-auto pr-1">
                  {visibleLocalItems.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center justify-between text-[12px] uppercase tracking-[0.18em] text-cyan-300/80">
                        <span>현재 유니버스 결과</span>
                        <span>{visibleLocalItems.length} ITEMS</span>
                      </div>
                      <div className="space-y-3">
                        {visibleLocalItems.map(renderResultCard)}
                      </div>
                    </div>
                  )}

                  {visibleGlobalItems.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center justify-between text-[12px] uppercase tracking-[0.18em] text-slate-400">
                        <span>전국 결과</span>
                        <span>{visibleGlobalItems.length} ITEMS</span>
                      </div>
                      <div className="space-y-3">
                        {visibleGlobalItems.map(renderResultCard)}
                      </div>
                    </div>
                  )}
                </div>
              ) : regionSearchResults.length > 0 ? (
                null
              ) : (
                <div className="space-y-2 rounded-2xl border border-slate-800 bg-black/20 px-5 py-8 text-center text-slate-400">
                  <p>현재 공개 랭킹/지역 보드에서는 검색 결과가 없습니다.</p>
                  <p>
                    단지가 존재하더라도 KOAPTIX 산정 조건 또는 공개 검증 상태에
                    따라 아직 표시되지 않을 수 있습니다.
                  </p>
                  <p>단지명, 구, 동 이름을 바꿔 다시 검색해보세요.</p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-800/80 px-6 py-3">
              <BetaDisclosure variant="search" />
              <p className="mt-3 break-words text-[11px] uppercase tracking-[0.14em] text-slate-500 [overflow-wrap:anywhere] sm:text-[12px]">
                ↑ ↓ NAVIGATE · ENTER OPEN DETAIL · ESC CLOSE · CMD/CTRL + K REOPEN
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
