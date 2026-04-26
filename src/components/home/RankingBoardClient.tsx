"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { RankingCard } from "./RankingCard";
import type { RankingItem, ComplexDetail } from "../../lib/koaptix/types";
import type { UniverseOption } from "../../lib/koaptix/universes";
import { useBookmarks } from "../../hooks/useBookmarks";
import ComparisonSheet from "./ComparisonSheet";
import { ComplexDetailSheet } from "./ComplexDetailSheet";
import UniverseSelector from "./UniverseSelector";
import {
  DEFAULT_UNIVERSE_CODE,
  getUniverseLabel,
  resolveServiceUniverseCode,
  RANKING_UNIVERSE_OPTIONS,
} from "../../lib/koaptix/universes";

interface RankingBoardClientProps {
  items: RankingItem[];
  initialUniverseCode?: string;
  boardError?: string | null;

  title?: string;
  apiBasePath?: string;
  universeOptions?: UniverseOption[];
  boardLimit?: number;
  emptyMessage?: string;

  enableTierFilters?: boolean;
  useInternalScroll?: boolean;
}

type ApiEnvelope<T> = T | { data?: T | null } | null;
type UniverseCodeValue = ReturnType<typeof resolveServiceUniverseCode>;

type RankingsApiResponse = {
  ok?: boolean;
  universeCode?: string;
  count?: number;
  items?: RankingItem[];
  message?: string;
};

type TierFilterKey = "ALL" | "S" | "A" | "B" | "C" | "D";

const TIER_FILTER_OPTIONS: Array<{
  key: TierFilterKey;
  label: string;
}> = [
    { key: "ALL", label: "전체" },
    { key: "S", label: "S 1-10" },
    { key: "A", label: "A 11-50" },
    { key: "B", label: "B 51-100" },
    { key: "C", label: "C 101-300" },
    { key: "D", label: "D 301-1000" },
  ];

function parseTierFilter(value?: string | null): TierFilterKey {
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

function getRankValue(item: RankingItem): number | null {
  const value = item.rank_all ?? item.rank ?? null;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function matchesTierFilter(
  item: RankingItem,
  selectedTierFilter: TierFilterKey,
): boolean {
  if (selectedTierFilter === "ALL") return true;

  const rank = getRankValue(item);
  if (rank == null) return false;

  if (selectedTierFilter === "S") return rank >= 1 && rank <= 10;
  if (selectedTierFilter === "A") return rank >= 11 && rank <= 50;
  if (selectedTierFilter === "B") return rank >= 51 && rank <= 100;
  if (selectedTierFilter === "C") return rank >= 101 && rank <= 300;
  if (selectedTierFilter === "D") return rank >= 301 && rank <= 1000;

  return true;
}

function isAbortError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  if (error instanceof Error) {
    return (
      error.name === "AbortError" ||
      error.message.toLowerCase().includes("aborted")
    );
  }

  return false;
}

const COMPLEX_DETAIL_API = (id: string) =>
  `/api/complex-detail?complexId=${encodeURIComponent(id)}`;

const RANKINGS_API = (
  apiBasePath: string,
  universeCode: string,
  limit: number,
) =>
  // Canonical contract: both tactical (/api/rankings) and TOP1000
  // (/api/ranking) use universe_code in API requests.
  `${apiBasePath}?universe_code=${encodeURIComponent(universeCode)}&limit=${limit}`;

async function readApiData<T>(
  input: string,
  signal: AbortSignal,
): Promise<T | null> {
  const response = await fetch(input, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${input}`);
  }

  const json = (await response.json()) as ApiEnvelope<T>;

  if (json && typeof json === "object" && "data" in json) {
    return (json.data ?? null) as T | null;
  }

  return (json ?? null) as T | null;
}

async function readRankingItems(
  input: string,
  signal: AbortSignal,
): Promise<RankingItem[]> {
  const response = await fetch(input, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  const json = (await response.json()) as RankingsApiResponse;

  if (!response.ok || json.ok === false) {
    throw new Error(
      json.message ?? `Request failed: ${response.status} ${input}`,
    );
  }

  return json.items ?? [];
}

export function RankingBoardClient({
  items,
  initialUniverseCode = DEFAULT_UNIVERSE_CODE,
  boardError,

  title = "KOAPTIX 500",
  apiBasePath = "/api/rankings",
  universeOptions = RANKING_UNIVERSE_OPTIONS,
  boardLimit = 20,
  emptyMessage = "데이터가 없습니다.",
  enableTierFilters = false,
  useInternalScroll = true,
}: RankingBoardClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialDistrictQuery = searchParams?.get("district") ?? "";
  const initialSelectedComplexId = searchParams?.get("complexId") ?? null;
  const initialSearchQuery = searchParams?.get("q") ?? "";
  const initialSelectedTierFilter = parseTierFilter(searchParams?.get("tier"));

  const urlUniverseCode = resolveServiceUniverseCode(
    searchParams?.get("universe") ?? initialUniverseCode,
  );

  const syncRankingUrlState =
    apiBasePath === "/api/ranking" || enableTierFilters;

  const [boardUniverseCode, setBoardUniverseCode] =
    useState<UniverseCodeValue>(urlUniverseCode);
  const [boardItems, setBoardItems] = useState<RankingItem[]>(items);
  const [liveBoardError, setLiveBoardError] = useState<string | null>(
    boardError ?? null,
  );
  const [isBoardLoading, setIsBoardLoading] = useState(false);
  const [staleBoardUniverseCode, setStaleBoardUniverseCode] =
    useState<string | null>(null);

  const [districtQueryLocal, setDistrictQueryLocal] =
    useState<string>(initialDistrictQuery);
  const [selectedComplexId, setSelectedComplexId] = useState<string | null>(
    initialSelectedComplexId,
  );

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedTierFilter, setSelectedTierFilter] =
    useState<TierFilterKey>(initialSelectedTierFilter);

  const { bookmarks, toggleBookmark, isLoaded } = useBookmarks();
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  const [comparisonItems, setComparisonItems] = useState<RankingItem[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  const [complexDetail, setComplexDetail] = useState<ComplexDetail | null>(
    null,
  );
  const [isComplexDetailLoading, setIsComplexDetailLoading] = useState(false);

  const initializedFromServerRef = useRef(false);
  const boardCacheRef = useRef<Partial<Record<string, RankingItem[]>>>({});
  const inflightBoardRef = useRef<
    Partial<Record<string, Promise<RankingItem[]>>>
  >({});

  const getBoardCacheKey = useCallback(
    (universeCode: UniverseCodeValue) =>
      `${apiBasePath}::${boardLimit}::${universeCode}`,
    [apiBasePath, boardLimit],
  );

  const syncLocalStateFromUrl = useCallback(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);

    setBoardUniverseCode(
      resolveServiceUniverseCode(params.get("universe") ?? initialUniverseCode),
    );
    setDistrictQueryLocal(params.get("district") ?? "");
    setSelectedComplexId(params.get("complexId"));

    if (syncRankingUrlState) {
      setSearchQuery(params.get("q") ?? "");
      setSelectedTierFilter(parseTierFilter(params.get("tier")));
    } else {
      setSearchQuery("");
      setSelectedTierFilter("ALL");
    }
  }, [initialUniverseCode, syncRankingUrlState]);

  useEffect(() => {
    syncLocalStateFromUrl();

    const onPopState = () => {
      syncLocalStateFromUrl();
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [syncLocalStateFromUrl]);

  const replaceUrlParams = useCallback(
    (
      updater: (params: URLSearchParams) => void,
      mode: "replace" | "push" = "replace",
      syncServerRoute = false,
    ) => {
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      updater(params);

      const nextQuery = params.toString();
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      const currentUrl = `${window.location.pathname}${window.location.search}`;

      if (nextUrl === currentUrl) {
        return;
      }

      if (syncServerRoute) {
        if (mode === "push") {
          router.push(nextUrl, { scroll: false });
        } else {
          router.replace(nextUrl, { scroll: false });
        }

        return;
      }

      if (mode === "push") {
        window.history.pushState(null, "", nextUrl);
      } else {
        window.history.replaceState(null, "", nextUrl);
      }

      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    [pathname, router],
  );

  useEffect(() => {
    if (!syncRankingUrlState) return;

    replaceUrlParams((params) => {
      if (searchQuery.trim()) {
        params.set("q", searchQuery);
      } else {
        params.delete("q");
      }

      if (selectedTierFilter !== "ALL") {
        params.set("tier", selectedTierFilter);
      } else {
        params.delete("tier");
      }
    }, "replace");
  }, [
    searchQuery,
    selectedTierFilter,
    syncRankingUrlState,
    replaceUrlParams,
  ]);

  const fetchBoardUniverse = useCallback(
    async (universeCode: UniverseCodeValue, signal?: AbortSignal) => {
      const cacheKey = getBoardCacheKey(universeCode);

      const cached = boardCacheRef.current[cacheKey];
      if (cached !== undefined) {
        return cached;
      }

      const inflight = inflightBoardRef.current[cacheKey];
      if (inflight !== undefined) {
        return inflight;
      }

      const localController = signal ? null : new AbortController();
      const nextSignal = signal ?? localController!.signal;

      const request = readRankingItems(
        RANKINGS_API(apiBasePath, universeCode, boardLimit),
        nextSignal,
      )
        .then((nextItems) => {
          boardCacheRef.current[cacheKey] = nextItems;
          return nextItems;
        })
        .finally(() => {
          delete inflightBoardRef.current[cacheKey];
        });

      inflightBoardRef.current[cacheKey] = request;
      return request;
    },
    [apiBasePath, boardLimit, getBoardCacheKey],
  );

  useEffect(() => {
    if (!initializedFromServerRef.current) {
      initializedFromServerRef.current = true;

      setBoardItems(items);
      setLiveBoardError(boardError ?? null);

      const hasUsableServerSeed = !boardError && items.length > 0;

      if (hasUsableServerSeed) {
        boardCacheRef.current[getBoardCacheKey(boardUniverseCode)] = items;
        setStaleBoardUniverseCode(null);
        setIsBoardLoading(false);
        return;
      }

      delete boardCacheRef.current[getBoardCacheKey(boardUniverseCode)];
      setIsBoardLoading(true);
    }

    const cachedItems =
      boardCacheRef.current[getBoardCacheKey(boardUniverseCode)];
    if (cachedItems !== undefined) {
      setBoardItems(cachedItems);
      setLiveBoardError(null);
      setStaleBoardUniverseCode(null);
      setIsBoardLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const loadBoard = async () => {
      setIsBoardLoading(true);
      setLiveBoardError(null);

      try {
        const nextItems = await fetchBoardUniverse(
          boardUniverseCode,
          controller.signal,
        );

        if (cancelled) return;
        setBoardItems(nextItems);
        setStaleBoardUniverseCode(null);
      } catch (error) {
        if (controller.signal.aborted || cancelled || isAbortError(error)) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "보드 로딩 실패";

        setBoardItems((prev) => (prev.length > 0 ? prev : []));
        setLiveBoardError(message);

        console.warn("[RankingBoardClient] board fetch warn", {
          boardUniverseCode,
          message,
        });
      } finally {
        if (!cancelled) {
          setIsBoardLoading(false);
        }
      }
    };

    void loadBoard();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    boardUniverseCode,
    items,
    boardError,
    fetchBoardUniverse,
    getBoardCacheKey,
  ]);

  const handleUniverseChange = useCallback(
    (nextUniverseCode: string) => {
      const normalizedNext = resolveServiceUniverseCode(nextUniverseCode);

      if (normalizedNext === boardUniverseCode) {
        return;
      }

      const cachedNextItems =
        boardCacheRef.current[getBoardCacheKey(normalizedNext)];

      setComparisonItems([]);
      setComplexDetail(null);
      setSelectedComplexId(null);
      setDistrictQueryLocal("");

      setBoardItems(cachedNextItems ?? boardItems);
      setLiveBoardError(null);
      setStaleBoardUniverseCode(
        cachedNextItems === undefined ? boardUniverseCode : null,
      );
      setIsBoardLoading(cachedNextItems === undefined);

      replaceUrlParams((params) => {
        params.delete("district");
        params.delete("complexId");

        if (normalizedNext === DEFAULT_UNIVERSE_CODE) {
          params.delete("universe");
        } else {
          params.set("universe", normalizedNext);
        }
      }, "replace", true);

      setBoardUniverseCode(normalizedNext);
    },
    [boardItems, boardUniverseCode, replaceUrlParams, getBoardCacheKey],
  );

  const toggleComparisonItem = useCallback((item: RankingItem) => {
    setComparisonItems((prev) => {
      const isAlreadyIn = prev.some((p) => p.complexId === item.complexId);
      if (isAlreadyIn)
        return prev.filter((p) => p.complexId !== item.complexId);
      if (prev.length < 2) return [...prev, item];
      return [prev[1], item];
    });
  }, []);

  useEffect(() => {
    if (comparisonItems.length === 2) setIsComparisonOpen(true);
    else setIsComparisonOpen(false);
  }, [comparisonItems.length]);

  useEffect(() => {
    if (!selectedComplexId) {
      setComplexDetail(null);
      setIsComplexDetailLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const loadComplexDetail = async () => {
      setIsComplexDetailLoading(true);

      try {
        const detailPayload = await readApiData<ComplexDetail>(
          COMPLEX_DETAIL_API(selectedComplexId),
          controller.signal,
        );

        if (cancelled) return;

        if (!detailPayload) {
          setComplexDetail(null);
          return;
        }

        setComplexDetail(detailPayload);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (!cancelled) setComplexDetail(null);
        console.warn("[RankingBoardClient] detail fetch warn", error);
      } finally {
        if (!cancelled) setIsComplexDetailLoading(false);
      }
    };

    void loadComplexDetail();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedComplexId]);

  const clearDistrict = useCallback(() => {
    replaceUrlParams((params) => {
      params.delete("district");
    }, "replace");

    setDistrictQueryLocal("");
  }, [replaceUrlParams]);

  const filteredItems = useMemo(() => {
    let result = boardItems;

    if (enableTierFilters && selectedTierFilter !== "ALL") {
      result = result.filter((item) =>
        matchesTierFilter(item, selectedTierFilter),
      );
    }

    if (districtQueryLocal) {
      result = result.filter(
        (item) =>
          item.sigunguName?.includes(districtQueryLocal) ||
          item.locationLabel?.includes(districtQueryLocal),
      );
    }

    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(lowerQ) ||
          item.sigunguName?.toLowerCase().includes(lowerQ) ||
          item.legalDongName?.toLowerCase().includes(lowerQ) ||
          item.locationLabel?.toLowerCase().includes(lowerQ),
      );
    }

    if (showBookmarksOnly && isLoaded) {
      result = result.filter((item) => bookmarks.includes(item.complexId));
    }

    return result;
  }, [
    boardItems,
    enableTierFilters,
    selectedTierFilter,
    districtQueryLocal,
    searchQuery,
    showBookmarksOnly,
    bookmarks,
    isLoaded,
  ]);
  const activeDistrictLabel = useMemo(() => {
    if (!districtQueryLocal) return "";

    if (boardUniverseCode === DEFAULT_UNIVERSE_CODE) {
      return districtQueryLocal;
    }

    const scopeLabel = getUniverseLabel(boardUniverseCode).replace(/\s*전체$/, "");
    return `${scopeLabel} ${districtQueryLocal}`.trim();
  }, [boardUniverseCode, districtQueryLocal]);
  const selectedItem =
    boardItems.find((i) => i.complexId === selectedComplexId) ??
    items.find((i) => i.complexId === selectedComplexId) ??
    null;
  const isShowingStaleBoard =
    isBoardLoading && staleBoardUniverseCode !== null && boardItems.length > 0;
  const boardDeliveryState = isShowingStaleBoard
    ? "stale-while-syncing"
    : isBoardLoading
      ? "loading"
      : liveBoardError
        ? "degraded"
        : "ready";

  return (
    <>
      <div
        className={`flex min-h-0 flex-col rounded-2xl border border-slate-700/50 bg-[#0b1118]/90 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_40px_rgba(0,0,0,0.4)] backdrop-blur-sm ${useInternalScroll ? "h-full overflow-hidden" : "overflow-visible"
          }`}
        data-testid="ranking-board"
        data-universe-code={boardUniverseCode}
        data-api-base-path={apiBasePath}
        data-board-delivery-state={boardDeliveryState}
        data-board-stale-universe-code={staleBoardUniverseCode ?? ""}
      >
        <div className="shrink-0 flex flex-col gap-3 border-b border-slate-800/80 p-4 lg:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-slate-100 sm:text-lg">
              {title}
            </h2>

            <p className="mt-1 max-w-[280px] text-[11px] leading-5 text-slate-500">
              선택한 지역의 단지를 추정 시가총액과 순위 변화로 비교하는 전술 보드입니다.
            </p>

            {isBoardLoading && (
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                Syncing...
              </span>
            )}
          </div>

          <div className="mt-3">
            <UniverseSelector
              value={boardUniverseCode}
              options={universeOptions}
              onChange={handleUniverseChange}
            />
          </div>

          {enableTierFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {TIER_FILTER_OPTIONS.map((tier) => {
                const isActive = selectedTierFilter === tier.key;

                return (
                  <button
                    key={tier.key}
                    type="button"
                    onClick={() => setSelectedTierFilter(tier.key)}
                    className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all ${isActive
                      ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-300"
                      : "border-slate-700 bg-slate-800/30 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                      }`}
                  >
                    {tier.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full rounded-lg border border-slate-700/50 bg-black/40 p-1 lg:w-auto">
              <button
                onClick={() => setShowBookmarksOnly(false)}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${!showBookmarksOnly
                  ? "bg-slate-700 text-white shadow"
                  : "text-slate-500 hover:text-slate-300"
                  }`}
              >
                전체 스캔
              </button>
              <button
                onClick={() => setShowBookmarksOnly(true)}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${showBookmarksOnly
                  ? "bg-yellow-500/10 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.1)]"
                  : "text-slate-500 hover:text-slate-300"
                  }`}
              >
                ★ MY RADAR
              </button>
            </div>

            <div className="w-full lg:max-w-[200px]">
              <input
                type="text"
                placeholder="단지명·지역명 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-2 text-sm text-slate-200 outline-none transition-all focus:border-cyan-500/50 focus:bg-slate-800/60"
              />
            </div>
          </div>

          {liveBoardError && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {liveBoardError}
            </div>
          )}

          {isShowingStaleBoard && (
            <div
              className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
              data-testid="ranking-board-degraded-state"
              data-board-delivery-state={boardDeliveryState}
              data-board-stale-universe-code={staleBoardUniverseCode ?? ""}
            >
              Syncing {getUniverseLabel(boardUniverseCode)}. Keeping the last
              tactical board visible until fresh data arrives.
            </div>
          )}

          {(districtQueryLocal ||
            searchQuery ||
            (enableTierFilters && selectedTierFilter !== "ALL")) && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] uppercase tracking-widest text-slate-500">
                  Active:
                </span>

                {enableTierFilters && selectedTierFilter !== "ALL" && (
                  <div className="flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-300">
                    <span>🏷 {selectedTierFilter}</span>
                    <button
                      onClick={() => setSelectedTierFilter("ALL")}
                      className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-cyan-300/70 transition-all hover:bg-cyan-500/20 hover:text-cyan-200"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {districtQueryLocal && (
                  <div className="flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-400">
                    <span>📍 {activeDistrictLabel}</span>
                    <button
                      onClick={clearDistrict}
                      className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-cyan-400/60 transition-all hover:bg-cyan-500/20 hover:text-cyan-300"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {searchQuery && (
                  <div className="flex items-center gap-1 rounded-full border border-slate-600 bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                    <span>🔍 {searchQuery}</span>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-600 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}

          <div className="mt-1 flex justify-between text-[11px] text-slate-500">
            <span>표시 {filteredItems.length}개</span>
            <span>전체 {boardItems.length}개</span>
          </div>
        </div>

        <div
          className={useInternalScroll ? "min-h-0 flex-1 overflow-hidden" : "min-h-0"}
        >
          <div
            className={`min-h-0 p-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-500 sm:p-3 ${useInternalScroll
              ? "h-full overflow-y-auto overscroll-contain"
              : "h-auto overflow-visible"
              }`}
          >
            {isBoardLoading && boardItems.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-slate-500">
                <span className="text-2xl opacity-50">📡</span>
                <p className="text-sm">보드 데이터를 불러오는 중입니다.</p>
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="flex flex-col gap-2">
                {filteredItems.map((item) => (
                  <RankingCard
                    key={item.complexId}
                    item={item}
                    isBookmarked={bookmarks.includes(item.complexId)}
                    onToggleBookmark={toggleBookmark}
                    isCompared={comparisonItems.some(
                      (p) => p.complexId === item.complexId,
                    )}
                    onCompare={(e) => {
                      e.stopPropagation();
                      toggleComparisonItem(item);
                    }}
                    onClick={() => {
                      replaceUrlParams((params) => {
                        params.set("complexId", item.complexId);
                      }, "push");

                      setSelectedComplexId(item.complexId);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-slate-500">
                <span className="text-2xl opacity-50">📡</span>
                <p className="text-sm">{emptyMessage}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ComparisonSheet
        open={isComparisonOpen}
        items={comparisonItems}
        onClose={() => setIsComparisonOpen(false)}
        onRemoveItem={(item: any) => toggleComparisonItem(item)}
        onClear={() => {
          setComparisonItems([]);
          setIsComparisonOpen(false);
        }}
      />

      <ComplexDetailSheet
        open={!!selectedComplexId}
        item={selectedItem}
        detail={complexDetail}
        loading={isComplexDetailLoading}
        error={null}
        onClose={() => {
          replaceUrlParams((params) => {
            params.delete("complexId");
          }, "replace");

          setSelectedComplexId(null);
        }}
      />

      {comparisonItems.length === 2 && !isComparisonOpen && (
        <button
          onClick={() => setIsComparisonOpen(true)}
          className="fixed bottom-6 left-1/2 z-[990] -translate-x-1/2 rounded-full border border-slate-700 bg-slate-950/95 px-4 py-2 text-xs font-medium text-slate-200 shadow-2xl backdrop-blur transition hover:border-cyan-400/30 hover:text-cyan-300"
        >
          비교 다시 열기
        </button>
      )}
    </>
  );
}
