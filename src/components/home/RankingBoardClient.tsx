"use client";

import Link from "next/link";
import { startTransition, useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { RankingCard } from "./RankingCard";
import { DISCOVERY_SEARCH_REQUEST_TIMEOUT_MS } from "../../lib/koaptix/discoverySearch";
import { matchesComplexNameQuery } from "../../lib/koaptix/nameSearch";
import { SearchProgress } from "./SearchProgress";
import type {
  DiscoveryCandidate,
  RankingItem,
  ComplexDetail,
  RankMovement,
} from "../../lib/koaptix/types";
import type {
  RegionAliasApiMetadata,
  RegionClarificationChoice,
  RegionResolutionResult,
} from "../../lib/koaptix/regionAliasV1.types";
import type { UniverseOption } from "../../lib/koaptix/universes";
import { useBookmarks } from "../../hooks/useBookmarks";
import ComparisonSheet from "./ComparisonSheet";
import { parseRankingSort, sortRankingItems, type RankingSort } from "../../lib/koaptix/rankingPresentation";
import { commonRankMovement } from "../../lib/koaptix/weeklyRankComparison";
import { parseComparisonIds, isComparisonDate } from "../../lib/koaptix/complexShare";
import { matchesStructuredDistrict } from "../../lib/koaptix/districtIdentity";
export { parseDistrictIdentity, resolveSidoFromUniverseCode } from "../../lib/koaptix/districtIdentity";
import { ComplexDetailSheet } from "./ComplexDetailSheet";
import UniverseSelector from "./UniverseSelector";
import {
  BetaDisclosure,
  LAUNCH_COPY,
} from "./BetaDisclosure";
import {
  DEFAULT_UNIVERSE_CODE,
  getUniverseLabel,
  resolveUniverseRequest,
  RANKING_UNIVERSE_OPTIONS,
} from "../../lib/koaptix/universes";

interface RankingBoardClientProps {
  items: RankingItem[];
  initialUniverseCode?: string;
  boardError?: string | null;
  initialLatestBoardDate?: string | null;

  title?: string;
  apiBasePath?: string;
  universeOptions?: UniverseOption[];
  boardLimit?: number;
  emptyMessage?: string;

  enableTierFilters?: boolean;
  useInternalScroll?: boolean;
  presentation?: "default" | "home-flagship" | "weekly-movement-full-board";
}

type UniverseCodeValue = string;

type RankingsApiResponse = {
  ok?: boolean;
  universeCode?: string;
  requestedUniverseCode?: string;
  renderedUniverseCode?: string;
  requestedLimit?: number;
  renderedLimit?: number;
  resultCount?: number;
  source?: string;
  cacheState?: string;
  fallbackMode?: string;
  fallbackUsed?: boolean;
  degraded?: boolean;
  latestBoardDate?: string | null;
  snapshot_date?: string | null;
  reason?: string | null;
  count?: number;
  items?: RankingItem[];
  message?: string;
};

type DiscoverySearchApiResponse = RegionAliasApiMetadata & {
  ok?: boolean;
  localItems?: RankingItem[];
  globalItems?: RankingItem[];
  discoveryCandidates?: DiscoveryCandidate[];
  message?: string;
};

type DiscoverySearchPayload = {
  rankedMatchIds: string[];
  globalItems: RankingItem[];
  discoveryCandidates: DiscoveryCandidate[];
  regionResolution: RegionResolutionResult | null;
  clarificationChoices: RegionClarificationChoice[];
  warnings: string[];
};

type RankingBoardDeliveryMeta = {
  requestedUniverseCode: string;
  renderedUniverseCode: string;
  requestedLimit: number | null;
  renderedLimit: number | null;
  resultCount: number | null;
  source: string;
  cacheState: string;
  fallbackMode: string;
  fallbackUsed: boolean;
  degraded: boolean;
  latestBoardDate: string | null;
  reason: string | null;
};

type RankingBoardPayload = {
  items: RankingItem[];
  delivery: RankingBoardDeliveryMeta;
};

type BoardRequestStatus =
  | "pending"
  | "fulfilled"
  | "aborted"
  | "rejected";

type InflightBoardRequest = {
  promise: Promise<RankingBoardPayload>;
  ownerSignal: AbortSignal;
  status: BoardRequestStatus;
};

type TierFilterKey = "ALL" | "S" | "A" | "B" | "C" | "D";
type MovementFilterKey = "ALL" | "UP" | "DOWN" | "NEW";

const TIER_FILTER_OPTIONS: Array<{
  key: TierFilterKey;
  label: string;
}> = [
    { key: "ALL", label: "전체" },
    { key: "S", label: "1~10위" },
    { key: "A", label: "11~50위" },
    { key: "B", label: "51~100위" },
    { key: "C", label: "101~300위" },
    { key: "D", label: "301~1,000위" },
  ];

const MOVEMENT_FILTER_OPTIONS: Array<{
  key: MovementFilterKey;
  label: string;
}> = [
  { key: "ALL", label: "전체" },
  { key: "UP", label: "순위 ▲" },
  { key: "DOWN", label: "순위 ▼" },
  { key: "NEW", label: "새로 진입" },
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

function parseMovementFilter(value?: string | null): MovementFilterKey {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "up") return "UP";
  if (normalized === "down") return "DOWN";
  if (normalized === "new") return "NEW";
  return "ALL";
}

function normalizeRankMovement(item: RankingItem): RankMovement | null {
  if ("weeklyRankComparison" in item) {
    return commonRankMovement(item);
  }
  const value = item.rankMovement ?? item.rank_movement;
  if (value === "NEW" || value === "UP" || value === "DOWN" || value === "SAME") {
    return value;
  }

  return null;
}

function formatSnapshotDate(value: string | null): string | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
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

function toFiniteNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildLocalRankingPayload(
  items: RankingItem[],
  universeCode: string,
  requestedLimit: number,
  delivery?: Partial<RankingBoardDeliveryMeta>,
): RankingBoardPayload {
  return {
    items,
    delivery: {
      requestedUniverseCode:
        delivery?.requestedUniverseCode ?? universeCode,
      renderedUniverseCode: delivery?.renderedUniverseCode ?? universeCode,
      requestedLimit:
        delivery?.requestedLimit ?? requestedLimit,
      renderedLimit:
        delivery?.renderedLimit ?? items.length,
      resultCount: delivery?.resultCount ?? items.length,
      source: delivery?.source ?? "client_state",
      cacheState: delivery?.cacheState ?? "client_state",
      fallbackMode: delivery?.fallbackMode ?? "none",
      fallbackUsed: delivery?.fallbackUsed ?? false,
      degraded: delivery?.degraded ?? false,
      latestBoardDate: delivery?.latestBoardDate ?? null,
      reason: delivery?.reason ?? null,
    },
  };
}

function buildRankingPayload(
  json: RankingsApiResponse,
  expectedUniverseCode: string,
  requestedLimit: number,
): RankingBoardPayload {
  const items = json.items ?? [];
  const requestedUniverseCode =
    json.requestedUniverseCode ?? expectedUniverseCode;
  const renderedUniverseCode =
    json.renderedUniverseCode ?? json.universeCode ?? requestedUniverseCode;
  const resultCount =
    toFiniteNumberOrNull(json.resultCount) ??
    toFiniteNumberOrNull(json.count) ??
    items.length;
  const fallbackMode = json.fallbackMode ?? "unknown";
  const fallbackUsed =
    typeof json.fallbackUsed === "boolean"
      ? json.fallbackUsed
      : fallbackMode !== "none" && fallbackMode !== "unknown";
  const degraded =
    typeof json.degraded === "boolean" ? json.degraded : fallbackUsed;
  const latestBoardDate = json.latestBoardDate ?? null;

  return {
    items,
    delivery: {
      requestedUniverseCode,
      renderedUniverseCode,
      requestedLimit:
        toFiniteNumberOrNull(json.requestedLimit) ?? requestedLimit,
      renderedLimit:
        toFiniteNumberOrNull(json.renderedLimit) ??
        toFiniteNumberOrNull(json.count) ??
        items.length,
      resultCount,
      source: json.source ?? "unknown",
      cacheState: json.cacheState ?? "unknown",
      fallbackMode,
      fallbackUsed,
      degraded,
      latestBoardDate: latestBoardDate ?? json.snapshot_date ?? null,
      reason: json.reason ?? json.message ?? null,
    },
  };
}

const COMPLEX_DETAIL_API = (id: string, universe: string, snapshotDate: string | null) =>
  `/api/complex-detail?${new URLSearchParams({ complexId: id, universe_code: universe,
    ...(snapshotDate ? { snapshot_date: snapshotDate } : {}) })}`;

const KOREA_ALL_HOME_BOARD_LIMIT = 12;
const RANKING_DISCOVERY_SEARCH_LIMIT = 8;
const RANKING_DISCOVERY_SEARCH_MIN_QUERY_LENGTH = 2;
const RANKING_DISCOVERY_SEARCH_DEBOUNCE_MS = 250;

const DISCOVERY_SEARCH_API = (
  query: string,
  universeCode: string,
  limit = RANKING_DISCOVERY_SEARCH_LIMIT,
) =>
  `/api/search?q=${encodeURIComponent(query)}&universe_code=${encodeURIComponent(
    universeCode,
  )}&limit=${limit}`;

function getHomeBoardRequestLimit(
  apiBasePath: string,
  universeCode: string,
  requestedLimit: number,
) {
  if (apiBasePath === "/api/rankings" && universeCode === DEFAULT_UNIVERSE_CODE) {
    return Math.min(requestedLimit, KOREA_ALL_HOME_BOARD_LIMIT);
  }

  return requestedLimit;
}

const RANKINGS_API = (
  apiBasePath: string,
  universeCode: string,
  limit: number,
) =>
  // Canonical contract: both tactical (/api/rankings) and TOP1000
  // (/api/ranking) use universe_code in API requests.
  `${apiBasePath}?universe_code=${encodeURIComponent(universeCode)}&limit=${limit}${apiBasePath === "/api/ranking" ? "&comparison=common" : ""}`;

function resolveBoardUniverseCode(input?: string | null) {
  return resolveUniverseRequest(input).requestedUniverseCode;
}


function hasValidClarificationChoices(
  value: unknown,
): value is RegionClarificationChoice[] {
  return (
    Array.isArray(value) &&
    value.every(
      (choice) =>
        choice !== null &&
        typeof choice === "object" &&
        "canonicalRegionCode" in choice &&
        "qualifiedNameKo" in choice &&
        "regionLevel" in choice &&
        "replacementQuery" in choice &&
        "compatibility" in choice &&
        typeof choice.canonicalRegionCode === "string" &&
        typeof choice.qualifiedNameKo === "string" &&
        typeof choice.regionLevel === "string" &&
        typeof choice.replacementQuery === "string" &&
        (choice.compatibility === "COMPATIBLE" ||
          choice.compatibility === "INCOMPATIBLE" ||
          choice.compatibility === "UNKNOWN"),
    )
  );
}

async function readDiscoveryCandidates(
  input: string,
  signal: AbortSignal,
  universeCode: string,
): Promise<DiscoverySearchPayload> {
  const response = await fetch(input, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  const json = (await response.json()) as DiscoverySearchApiResponse;

  const isValidClarificationConflict =
    response.status === 409 &&
    (json.regionResolution?.state === "AMBIGUOUS" ||
      json.regionResolution?.state === "UNIVERSE_CONFLICT") &&
    hasValidClarificationChoices(json.clarificationChoices);

  if ((!response.ok || json.ok === false) && !isValidClarificationConflict) {
    throw new Error(
      json.message ?? `Request failed: ${response.status} ${input}`,
    );
  }

  return {
    rankedMatchIds: (json.localItems ?? []).filter(item => item.universeCode === universeCode).map(item => item.complexId),
    globalItems: (json.globalItems ?? []).filter(item => item.universeCode && item.universeCode !== universeCode),
    discoveryCandidates: json.discoveryCandidates ?? [],
    regionResolution: json.regionResolution ?? null,
    clarificationChoices: json.clarificationChoices ?? [],
    warnings: json.warnings ?? [],
  };
}

async function readRankingPayload(
  input: string,
  signal: AbortSignal,
  expectedUniverseCode: string,
  requestedLimit: number,
  strictUniverseIdentity: boolean,
): Promise<RankingBoardPayload> {
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

  const payload = buildRankingPayload(
    json,
    expectedUniverseCode,
    requestedLimit,
  );

  if (
    strictUniverseIdentity &&
    (payload.delivery.requestedUniverseCode !== expectedUniverseCode ||
      payload.delivery.renderedUniverseCode !== expectedUniverseCode)
  ) {
    throw new Error(
      `Ranking universe mismatch: requested ${expectedUniverseCode}, api-requested ${payload.delivery.requestedUniverseCode}, rendered ${payload.delivery.renderedUniverseCode}`,
    );
  }

  return payload;
}

export function RankingBoardClient({
  items,
  initialUniverseCode = DEFAULT_UNIVERSE_CODE,
  boardError,
  initialLatestBoardDate = null,

  title = "KOAPTIX 500",
  apiBasePath = "/api/rankings",
  universeOptions = RANKING_UNIVERSE_OPTIONS,
  boardLimit = 20,
  emptyMessage = "데이터가 없습니다.",
  enableTierFilters = false,
  useInternalScroll = true,
  presentation = "default",
}: RankingBoardClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialDistrictQuery = searchParams?.get("district") ?? "";
  const initialSelectedComplexId = searchParams?.get("complexId") ?? null;
  const initialSearchQuery = searchParams?.get("q") ?? "";
  const initialSelectedTierFilter = parseTierFilter(searchParams?.get("tier"));
  const initialMovementFilter = parseMovementFilter(
    searchParams?.get("movement"),
  );
  const isWeeklyMovementFullBoard =
    presentation === "weekly-movement-full-board";
  const isHomeFlagship = presentation === "home-flagship";

  const urlUniverseCode = resolveBoardUniverseCode(
    searchParams?.get("universe") ?? initialUniverseCode,
  );

  const syncRankingUrlState =
    apiBasePath === "/api/ranking" || enableTierFilters;
  const initialBoardRequestLimit = getHomeBoardRequestLimit(
    apiBasePath,
    urlUniverseCode,
    boardLimit,
  );

  const [boardUniverseCode, setBoardUniverseCode] =
    useState<UniverseCodeValue>(urlUniverseCode);
  const [boardItems, setBoardItems] = useState<RankingItem[]>(items);
  const [boardDeliveryMeta, setBoardDeliveryMeta] =
    useState<RankingBoardDeliveryMeta>(
      () =>
        buildLocalRankingPayload(items, urlUniverseCode, initialBoardRequestLimit, {
          source: items.length > 0 ? "server_seed" : "client_pending",
          cacheState: items.length > 0 ? "server_seed" : "miss",
          fallbackMode: boardError ? "server_seed_degraded" : "none",
          latestBoardDate: initialLatestBoardDate,
        }).delivery,
    );
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
  const [rankedNameMatches, setRankedNameMatches] = useState<{ scopeKey: string; ids: string[]; globalItems: RankingItem[] } | null>(null);
  const [discoveryCandidates, setDiscoveryCandidates] = useState<
    DiscoveryCandidate[]
  >([]);
  const [selectedDiscoveryCandidate, setSelectedDiscoveryCandidate] =
    useState<DiscoveryCandidate | null>(null);
  const [searchRegionResolution, setSearchRegionResolution] =
    useState<RegionResolutionResult | null>(null);
  const [searchClarificationChoices, setSearchClarificationChoices] = useState<
    RegionClarificationChoice[]
  >([]);
  const [searchRegionWarnings, setSearchRegionWarnings] = useState<string[]>([]);
  const [isDiscoverySearchPending, setIsDiscoverySearchPending] = useState(false);
  const [discoverySearchError, setDiscoverySearchError] = useState<{
    scopeKey: string;
    message: string;
  } | null>(null);
  const [selectedTierFilter, setSelectedTierFilter] =
    useState<TierFilterKey>(initialSelectedTierFilter);
  const [selectedMovementFilter, setSelectedMovementFilter] =
    useState<MovementFilterKey>(
      isWeeklyMovementFullBoard ? initialMovementFilter : "ALL",
    );

  const { bookmarks, toggleBookmark, isLoaded } = useBookmarks();
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(searchParams?.get("view") === "watchlist");

  const [comparisonItems, setComparisonItems] = useState<RankingItem[]>([]);
  const [rankingSort, setRankingSort] = useState<RankingSort>(() => parseRankingSort(searchParams?.get("sort")));
  const [listPage, setListPage] = useState({ key: "", count: 50 });
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const comparisonRestoreRef = useRef("");
  const [comparisonLinkError, setComparisonLinkError] = useState<{ key: string; message: string } | null>(null);
  const requestedComparison = searchParams?.get("compare") ?? "";
  const requestedComparisonDate = searchParams?.get("comparisonDate") ?? null;
  const comparisonRequestKey = `${boardUniverseCode}:${requestedComparison}`;

  const [complexDetail, setComplexDetail] = useState<ComplexDetail | null>(
    null,
  );
  const [isComplexDetailLoading, setIsComplexDetailLoading] = useState(false);
  const [complexDetailError, setComplexDetailError] = useState<string | null>(
    null,
  );

  const initialItemsRef = useRef(items);
  const initialBoardErrorRef = useRef(boardError ?? null);
  const initialLatestBoardDateRef = useRef(initialLatestBoardDate);
  const initializedFromServerRef = useRef(false);
  const boardCacheRef = useRef<Partial<Record<string, RankingBoardPayload>>>(
    {},
  );
  const inflightBoardRef = useRef<
    Partial<Record<string, InflightBoardRequest>>
  >({});
  const discoverySearchCacheRef = useRef<Record<string, DiscoverySearchPayload>>({});

  const getBoardCacheKey = useCallback(
    (universeCode: UniverseCodeValue) => {
      const requestLimit = getHomeBoardRequestLimit(
        apiBasePath,
        universeCode,
        boardLimit,
      );

      return `${apiBasePath}::${requestLimit}::${universeCode}`;
    },
    [apiBasePath, boardLimit],
  );

  const syncLocalStateFromUrl = useCallback(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);

    setBoardUniverseCode(
      resolveBoardUniverseCode(params.get("universe") ?? initialUniverseCode),
    );
    setDistrictQueryLocal(params.get("district") ?? "");
    setSelectedComplexId(params.get("complexId"));
    setShowBookmarksOnly(params.get("view") === "watchlist");

    if (syncRankingUrlState) {
      setSearchQuery(params.get("q") ?? "");
      setSelectedTierFilter(parseTierFilter(params.get("tier")));
      setSelectedMovementFilter(
        isWeeklyMovementFullBoard
          ? parseMovementFilter(params.get("movement"))
          : "ALL",
      );
    } else {
      setSearchQuery("");
      setSelectedTierFilter("ALL");
      setSelectedMovementFilter("ALL");
    }
  }, [
    initialUniverseCode,
    isWeeklyMovementFullBoard,
    syncRankingUrlState,
  ]);

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

      if (isWeeklyMovementFullBoard && selectedMovementFilter !== "ALL") {
        params.set("movement", selectedMovementFilter.toLowerCase());
      } else {
        params.delete("movement");
      }
      if (rankingSort !== "rank") params.set("sort", rankingSort);
      else params.delete("sort");
    }, "replace");
  }, [
    isWeeklyMovementFullBoard,
    searchQuery,
    selectedMovementFilter,
    selectedTierFilter,
    rankingSort,
    syncRankingUrlState,
    replaceUrlParams,
  ]);

  useEffect(() => {
    const rawQuery = searchQuery.trim();
    const normalizedQuery = rawQuery.toLowerCase();

    if (normalizedQuery.length < RANKING_DISCOVERY_SEARCH_MIN_QUERY_LENGTH) {
      const resetId = window.setTimeout(() => {
        setDiscoveryCandidates([]);
        setRankedNameMatches(null);
        setSelectedDiscoveryCandidate(null);
        setSearchRegionResolution(null);
        setSearchClarificationChoices([]);
        setSearchRegionWarnings([]);
        setIsDiscoverySearchPending(false);
        setDiscoverySearchError(null);
      }, 0);

      return () => window.clearTimeout(resetId);
    }

    const cacheKey = `${boardUniverseCode}::${normalizedQuery}`;
    const cached = discoverySearchCacheRef.current[cacheKey];

    if (cached) {
      const cacheId = window.setTimeout(() => {
        setDiscoveryCandidates(cached.discoveryCandidates);
        setRankedNameMatches({ scopeKey: cacheKey, ids: cached.rankedMatchIds, globalItems: cached.globalItems });
        setSearchRegionResolution(cached.regionResolution);
        setSearchClarificationChoices(cached.clarificationChoices);
        setSearchRegionWarnings(cached.warnings);
        setSelectedDiscoveryCandidate(null);
        setIsDiscoverySearchPending(false);
        setDiscoverySearchError(null);
      }, 0);

      return () => window.clearTimeout(cacheId);
    }

    const controller = new AbortController();
    let cancelled = false;
    let timedOut = false;
    let timeoutId: number | undefined;

    const debounceId = window.setTimeout(async () => {
      setIsDiscoverySearchPending(true);
      setDiscoverySearchError(null);

      timeoutId = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, DISCOVERY_SEARCH_REQUEST_TIMEOUT_MS);

      try {
        const nextPayload = await readDiscoveryCandidates(
          DISCOVERY_SEARCH_API(rawQuery, boardUniverseCode),
          controller.signal,
          boardUniverseCode,
        );

        if (cancelled) return;

        discoverySearchCacheRef.current[cacheKey] = nextPayload;
        setDiscoveryCandidates(nextPayload.discoveryCandidates);
        setRankedNameMatches({ scopeKey: cacheKey, ids: nextPayload.rankedMatchIds, globalItems: nextPayload.globalItems });
        setSearchRegionResolution(nextPayload.regionResolution);
        setSearchClarificationChoices(nextPayload.clarificationChoices);
        setSearchRegionWarnings(nextPayload.warnings);
        setSelectedDiscoveryCandidate(null);
      } catch (error) {
        if (cancelled || (!timedOut && isAbortError(error))) return;

        console.warn("[RankingBoardClient] discovery search skipped", {
          boardUniverseCode,
          queryLength: rawQuery.length,
          timedOut,
          message:
            error instanceof Error
              ? error.message
              : "discovery_search_unavailable",
        });
        setDiscoverySearchError({
          scopeKey: cacheKey,
          message: timedOut
            ? "단지를 찾는 데 시간이 걸리고 있어요. 잠시 후 다시 검색해 주세요."
            : "단지를 불러오지 못했어요. 잠시 후 다시 검색해 주세요.",
        });
        setDiscoveryCandidates([]);
        setRankedNameMatches(null);
        setSelectedDiscoveryCandidate(null);
        setSearchRegionResolution(null);
        setSearchClarificationChoices([]);
        setSearchRegionWarnings([]);
      } finally {
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        if (!cancelled) {
          setIsDiscoverySearchPending(false);
        }
      }
    }, RANKING_DISCOVERY_SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(debounceId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [boardUniverseCode, searchQuery]);

  const fetchBoardUniverse = useCallback(
    async (universeCode: UniverseCodeValue, signal?: AbortSignal) => {
      const cacheKey = getBoardCacheKey(universeCode);

      const cached = boardCacheRef.current[cacheKey];
      if (cached !== undefined) {
        return cached;
      }

      const inflight = inflightBoardRef.current[cacheKey];
      if (
        inflight !== undefined &&
        inflight.status === "pending" &&
        !inflight.ownerSignal.aborted
      ) {
        return inflight.promise;
      }

      if (
        inflight !== undefined &&
        inflightBoardRef.current[cacheKey] === inflight
      ) {
        delete inflightBoardRef.current[cacheKey];
      }

      const localController = signal ? null : new AbortController();
      const nextSignal = signal ?? localController!.signal;
      const strictUniverseIdentity =
        apiBasePath === "/api/rankings" || apiBasePath === "/api/ranking";
      const requestLimit = getHomeBoardRequestLimit(
        apiBasePath,
        universeCode,
        boardLimit,
      );

      const baseRequest = readRankingPayload(
        RANKINGS_API(apiBasePath, universeCode, requestLimit),
        nextSignal,
        universeCode,
        requestLimit,
        strictUniverseIdentity,
      );

      const entry: InflightBoardRequest = {
        promise: baseRequest,
        ownerSignal: nextSignal,
        status: "pending",
      };

      const request = baseRequest
        .then(
          (nextPayload) => {
            entry.status = "fulfilled";

            if (inflightBoardRef.current[cacheKey] === entry) {
              boardCacheRef.current[cacheKey] = nextPayload;
            }

            return nextPayload;
          },
          (error: unknown) => {
            entry.status =
              nextSignal.aborted || isAbortError(error)
                ? "aborted"
                : "rejected";
            throw error;
          },
        )
        .finally(() => {
          if (inflightBoardRef.current[cacheKey] === entry) {
            delete inflightBoardRef.current[cacheKey];
          }
        });

      entry.promise = request;
      inflightBoardRef.current[cacheKey] = entry;
      return request;
    },
    [apiBasePath, boardLimit, getBoardCacheKey],
  );

  useEffect(() => {
    if (!initializedFromServerRef.current) {
      initializedFromServerRef.current = true;

      const initialItems = initialItemsRef.current;
      const initialBoardError = initialBoardErrorRef.current;

      setBoardItems(initialItems);
      setLiveBoardError(initialBoardError);

      const hasUsableServerSeed = !initialBoardError && initialItems.length > 0;
      const boardRequestLimit = getHomeBoardRequestLimit(
        apiBasePath,
        boardUniverseCode,
        boardLimit,
      );

      if (hasUsableServerSeed) {
        const serverSeedPayload = buildLocalRankingPayload(
          initialItems,
          boardUniverseCode,
          boardRequestLimit,
          {
            source: "server_seed",
            cacheState: "server_seed",
            fallbackMode: "none",
            fallbackUsed: false,
            degraded: false,
            latestBoardDate: initialLatestBoardDateRef.current,
            reason: null,
          },
        );

        boardCacheRef.current[getBoardCacheKey(boardUniverseCode)] =
          serverSeedPayload;
        setBoardDeliveryMeta(serverSeedPayload.delivery);
        setStaleBoardUniverseCode(null);
        setIsBoardLoading(false);
        return;
      }

      delete boardCacheRef.current[getBoardCacheKey(boardUniverseCode)];
      setBoardDeliveryMeta(
        buildLocalRankingPayload([], boardUniverseCode, boardRequestLimit, {
          source: "client_pending",
          cacheState: "miss",
          fallbackMode: initialBoardError ? "server_seed_degraded" : "none",
          fallbackUsed: Boolean(initialBoardError),
          degraded: Boolean(initialBoardError),
          reason: initialBoardError,
        }).delivery,
      );
      setIsBoardLoading(true);
    }

    const cachedPayload =
      boardCacheRef.current[getBoardCacheKey(boardUniverseCode)];
    if (cachedPayload !== undefined) {
      setBoardItems(cachedPayload.items);
      setBoardDeliveryMeta(cachedPayload.delivery);
      setLiveBoardError(null);
      setStaleBoardUniverseCode(null);
      setIsBoardLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    let timedOut = false;

    const boardFetchTimeoutMs = 7000;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, boardFetchTimeoutMs);

    const loadBoard = async () => {
      setIsBoardLoading(true);
      setLiveBoardError(null);

      const acquireBoard = () =>
        fetchBoardUniverse(boardUniverseCode, controller.signal);

      const acquireBoardWithOneReacquisition = async () => {
        try {
          return await acquireBoard();
        } catch (error) {
          const borrowedAbort =
            !timedOut &&
            !cancelled &&
            !controller.signal.aborted &&
            isAbortError(error);

          if (!borrowedAbort) throw error;
          return acquireBoard();
        }
      };

      try {
        const nextPayload = await acquireBoardWithOneReacquisition();

        if (cancelled) return;
        setBoardItems(nextPayload.items);
        setBoardDeliveryMeta(nextPayload.delivery);
        setStaleBoardUniverseCode(null);
      } catch (error) {
        // Only cancellation owned by this effect may exit silently.
        if (cancelled || (!timedOut && controller.signal.aborted)) {
          return;
        }

        const message = timedOut
          ? "Ranking request timed out"
          : error instanceof Error
            ? error.message
            : "랭킹을 불러오지 못했어요";

        setBoardItems((prev) => (prev.length > 0 ? prev : []));
        setBoardDeliveryMeta((prev) => ({
          ...prev,
          requestedUniverseCode: boardUniverseCode,
          cacheState: timedOut ? "client_timeout" : "client_error",
          fallbackMode: timedOut
            ? "client_timeout_preserve_previous"
            : "client_error_preserve_previous",
          fallbackUsed: true,
          degraded: true,
          reason: message,
        }));
        setLiveBoardError(message);

        if (timedOut) {
          console.warn("[RankingBoardClient] board fetch timeout", {
            boardUniverseCode,
            boardFetchTimeoutMs,
          });
        } else {
          console.warn("[RankingBoardClient] board fetch warn", {
            boardUniverseCode,
            message,
          });
        }
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) {
          setIsBoardLoading(false);
        }
      }
    };

    void loadBoard();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    boardUniverseCode,
    boardLimit,
    apiBasePath,
    fetchBoardUniverse,
    getBoardCacheKey,
  ]);

  function handleUniverseChange(nextUniverseCode: string) {
      const normalizedNext = resolveBoardUniverseCode(nextUniverseCode);

      if (normalizedNext === boardUniverseCode) {
        return;
      }

      const cachedNextPayload =
        boardCacheRef.current[getBoardCacheKey(normalizedNext)];

      setComparisonItems([]);
      setComplexDetail(null);
      setComplexDetailError(null);
      setSelectedComplexId(null);
      setDistrictQueryLocal("");

      setBoardItems(cachedNextPayload?.items ?? boardItems);
      setBoardDeliveryMeta(
        cachedNextPayload?.delivery ?? {
          requestedUniverseCode: normalizedNext,
          renderedUniverseCode: boardDeliveryMeta.renderedUniverseCode,
          requestedLimit: getHomeBoardRequestLimit(
            apiBasePath,
            normalizedNext,
            boardLimit,
          ),
          renderedLimit: boardItems.length,
          resultCount: boardItems.length,
          source: boardDeliveryMeta.source,
          cacheState: "client_stale",
          fallbackMode: "stale_while_syncing",
          fallbackUsed: true,
          degraded: true,
          latestBoardDate: null,
          reason: "stale_while_syncing",
        },
      );
      setLiveBoardError(null);
      setStaleBoardUniverseCode(
        cachedNextPayload === undefined ? boardUniverseCode : null,
      );
      setIsBoardLoading(cachedNextPayload === undefined);

      replaceUrlParams((params) => {
        params.delete("district");
        params.delete("complexId");
        params.delete("compare");
        params.delete("comparisonDate");

        if (normalizedNext === DEFAULT_UNIVERSE_CODE) {
          params.delete("universe");
        } else {
          params.set("universe", normalizedNext);
        }
      }, "replace", true);

      setBoardUniverseCode(normalizedNext);
  }

  const toggleComparisonItem = useCallback((item: RankingItem) => {
    replaceUrlParams(params => { params.delete("compare"); params.delete("comparisonDate"); });
    setComparisonItems((prev) => {
      const isAlreadyIn = prev.some((p) => p.complexId === item.complexId);
      if (isAlreadyIn)
        return prev.filter((p) => p.complexId !== item.complexId);
      if (prev.length < 2) return [...prev, item];
      return [prev[1], item];
    });
  }, [replaceUrlParams]);

  useEffect(() => {
    if (comparisonItems.length === 2) setIsComparisonOpen(true);
    else setIsComparisonOpen(false);
  }, [comparisonItems.length]);

  const clearDistrict = useCallback(() => {
    replaceUrlParams((params) => {
      params.delete("district");
    }, "replace");

    setDistrictQueryLocal("");
  }, [replaceUrlParams]);

  const hasSearchRegionBlock =
    searchRegionResolution?.state === "AMBIGUOUS" ||
    searchRegionResolution?.state === "UNIVERSE_CONFLICT";
  const shouldSuppressSearchResults =
    hasSearchRegionBlock ||
    (searchQuery.trim().length >= RANKING_DISCOVERY_SEARCH_MIN_QUERY_LENGTH &&
      isDiscoverySearchPending);

  const presentationBoardItems = useMemo(() => {
    const deliveryIdentityMatches =
      boardDeliveryMeta.requestedUniverseCode === boardUniverseCode &&
      boardDeliveryMeta.renderedUniverseCode === boardUniverseCode;
    if (!deliveryIdentityMatches) return [];

    const containsMismatchedUniverse = boardItems.some((item) => {
      const itemUniverseCode = item.universeCode ?? item.universe_code;
      return Boolean(itemUniverseCode && itemUniverseCode !== boardUniverseCode);
    });

    return containsMismatchedUniverse ? [] : boardItems;
  }, [boardDeliveryMeta, boardItems, boardUniverseCode]);

  useEffect(() => {
    if (!requestedComparison) { comparisonRestoreRef.current = ""; return; }
    if (isBoardLoading || boardDeliveryMeta.source === "client_pending" ||
      boardDeliveryMeta.renderedUniverseCode !== boardUniverseCode || comparisonRestoreRef.current === comparisonRequestKey) return;
    comparisonRestoreRef.current = comparisonRequestKey;
    const ids = parseComparisonIds(requestedComparison);
    const selected = ids.map(id => presentationBoardItems.find(item => item.complexId === id));
    if (ids.length !== 2 || selected.some(item => !item)) {
      startTransition(() => setComparisonLinkError({ key: comparisonRequestKey, message: "공유한 두 단지를 현재 지역의 공개 TOP1000에서 모두 확인하지 못했어요. 검색하거나 다른 단지를 선택해 주세요." }));
      return;
    }
    startTransition(() => {
      setComparisonLinkError(null);
      setComparisonItems(selected as RankingItem[]);
      setIsComparisonOpen(true);
    });
  }, [requestedComparison, comparisonRequestKey, boardUniverseCode, boardDeliveryMeta, presentationBoardItems, isBoardLoading]);

  const filteredItems = useMemo(() => {
    if (shouldSuppressSearchResults) return [];
    let result = presentationBoardItems;

    if (isWeeklyMovementFullBoard && selectedMovementFilter !== "ALL") {
      result = result.filter(
        (item) => normalizeRankMovement(item) === selectedMovementFilter,
      );
    }

    if (enableTierFilters && selectedTierFilter !== "ALL") {
      result = result.filter((item) =>
        matchesTierFilter(item, selectedTierFilter),
      );
    }

    if (districtQueryLocal) {
      result = result.filter((item) =>
        matchesStructuredDistrict(
          item,
          districtQueryLocal,
          boardUniverseCode,
        ),
      );
    }

    if (searchQuery) {
      const lowerQ = searchQuery.trim().toLowerCase();
      const apiMatches = new Set(rankedNameMatches?.scopeKey === `${boardUniverseCode}::${lowerQ}` ? rankedNameMatches.ids : []);
      result = result.filter(
        (item) =>
          apiMatches.has(item.complexId) ||
          matchesComplexNameQuery(item.name, searchQuery) ||
          item.name.toLowerCase().includes(lowerQ) ||
          item.sigunguName?.toLowerCase().includes(lowerQ) ||
          item.legalDongName?.toLowerCase().includes(lowerQ) ||
          item.locationLabel?.toLowerCase().includes(lowerQ),
      );
    }

    if (showBookmarksOnly && isLoaded) {
      result = result.filter((item) => bookmarks.includes(item.complexId));
    }

    return sortRankingItems(result, rankingSort);
  }, [
    presentationBoardItems,
    rankingSort,
    enableTierFilters,
    isWeeklyMovementFullBoard,
    selectedMovementFilter,
    selectedTierFilter,
    districtQueryLocal,
    boardUniverseCode,
    searchQuery,
    rankedNameMatches,
    showBookmarksOnly,
    bookmarks,
    isLoaded,
    shouldSuppressSearchResults,
  ]);

  const listPageKey = JSON.stringify([boardUniverseCode, boardDeliveryMeta.latestBoardDate, selectedMovementFilter,
    selectedTierFilter, districtQueryLocal, searchQuery, rankingSort, showBookmarksOnly]);
  const listVisibleCount = isWeeklyMovementFullBoard ? listPage.key === listPageKey ? listPage.count : 50 : filteredItems.length;
  const visibleItems = isWeeklyMovementFullBoard ? filteredItems.slice(0, listVisibleCount) : filteredItems;
  const hasCapComparisons = presentationBoardItems.some(item => typeof item.marketCapDeltaPct7d === "number" && Number.isFinite(item.marketCapDeltaPct7d));

  const filteredZeroMessage = useMemo(() => {
    if (presentationBoardItems.length === 0 || filteredItems.length > 0) {
      return null;
    }

    if (searchQuery.trim()) {
      return "선택한 지역의 랭킹에서는 일치하는 단지를 찾지 못했어요.";
    }

    const hasMovementFilter =
      isWeeklyMovementFullBoard && selectedMovementFilter !== "ALL";
    const hasOtherLocalFilter =
      (enableTierFilters && selectedTierFilter !== "ALL") ||
      Boolean(districtQueryLocal) ||
      (showBookmarksOnly && isLoaded);

    if (hasMovementFilter && !hasOtherLocalFilter) {
      if (selectedMovementFilter === "UP") {
        return "현재 상승 조건에 해당하는 단지가 없습니다.";
      }
      if (selectedMovementFilter === "DOWN") {
        return "현재 하락 조건에 해당하는 단지가 없습니다.";
      }
      if (selectedMovementFilter === "NEW") {
        return "현재 신규 진입 조건에 해당하는 단지가 없습니다.";
      }
    }

    if (hasMovementFilter || hasOtherLocalFilter) {
      return "현재 선택한 조건에 해당하는 단지가 없습니다.";
    }

    return null;
  }, [
    districtQueryLocal,
    enableTierFilters,
    filteredItems.length,
    isLoaded,
    isWeeklyMovementFullBoard,
    presentationBoardItems.length,
    searchQuery,
    selectedMovementFilter,
    selectedTierFilter,
    showBookmarksOnly,
  ]);

  const visibleDiscoveryCandidates = useMemo(() => {
    if (searchQuery.trim().length < RANKING_DISCOVERY_SEARCH_MIN_QUERY_LENGTH) {
      return [];
    }

    const rankedComplexIds = new Set(
      presentationBoardItems
        .map((item) => String(item.complexId ?? "").trim())
        .filter(Boolean),
    );

    return discoveryCandidates
      .filter((candidate) => {
        if (candidate.discoveryStatus !== "OBSERVATION_READY") return false;

        const complexId = String(candidate.complexId ?? "").trim();
        if (!complexId || rankedComplexIds.has(complexId)) return false;

        return true;
      })
      .slice(0, RANKING_DISCOVERY_SEARCH_LIMIT);
  }, [presentationBoardItems, discoveryCandidates, searchQuery]);

  const hasDiscoveryCandidates = visibleDiscoveryCandidates.length > 0;
  const otherRegionSearchItems = !shouldSuppressSearchResults && rankedNameMatches?.scopeKey === `${boardUniverseCode}::${searchQuery.trim().toLowerCase()}`
    ? rankedNameMatches.globalItems : [];
  const currentDiscoverySearchError =
    discoverySearchError?.scopeKey ===
    `${boardUniverseCode}::${searchQuery.trim().toLowerCase()}`
      ? discoverySearchError.message
      : null;

  const activeDistrictLabel = useMemo(() => {
    if (!districtQueryLocal) return "";

    if (boardUniverseCode === DEFAULT_UNIVERSE_CODE) {
      return districtQueryLocal;
    }

    const scopeLabel = getUniverseLabel(boardUniverseCode).replace(/\s*전체$/, "");
    return `${scopeLabel} ${districtQueryLocal}`.trim();
  }, [boardUniverseCode, districtQueryLocal]);
  const selectedItem = presentationBoardItems.find((i) => i.complexId === selectedComplexId) ?? null;
  const selectedDetailDate = selectedItem?.snapshotDate ??
    (boardDeliveryMeta.renderedUniverseCode === boardUniverseCode ? boardDeliveryMeta.latestBoardDate : null);
  const selectedDetail = complexDetail?.complexId === selectedComplexId &&
    complexDetail.publication.universe_code === boardUniverseCode &&
    (!selectedDetailDate || complexDetail.publication.snapshot_date === selectedDetailDate) ? complexDetail : null;

  useEffect(() => {
    if (!selectedComplexId) {
      setComplexDetail(null);
      setIsComplexDetailLoading(false);
      setComplexDetailError(null);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    const loadComplexDetail = async () => {
      setComplexDetail(null);
      setComplexDetailError(null);
      setIsComplexDetailLoading(true);
      try {
        const response = await fetch(COMPLEX_DETAIL_API(selectedComplexId, boardUniverseCode, selectedDetailDate), {
          method: "GET", cache: "no-store", signal: controller.signal,
        });
        const payload = await response.json() as { data?: ComplexDetail; error?: string };
        if (cancelled) return;
        if (!response.ok || !payload.data) {
          setComplexDetailError(response.status === 404
            ? "선택한 지역의 공개 랭킹에서 이 단지의 기본정보 연결을 확인하지 못했어요."
            : response.status === 409 ? "공개 기준일이 바뀌었어요. 랭킹을 새로고침해 주세요."
            : "기본정보를 불러오지 못했어요. 잠시 후 다시 열어 주세요.");
          return;
        }
        const detail = payload.data;
        if (detail.complexId !== selectedComplexId || detail.publication?.universe_code !== boardUniverseCode ||
            (selectedDetailDate && detail.publication.snapshot_date !== selectedDetailDate)) {
          setComplexDetailError("선택한 지역·기준일의 정보와 일치하지 않아 기본정보를 표시하지 않았어요.");
          return;
        }
        setComplexDetail(detail);
      } catch {
        if (!cancelled && !controller.signal.aborted) setComplexDetailError("기본정보 연결이 지연되고 있어요. 잠시 후 다시 열어 주세요.");
      } finally {
        if (!cancelled) setIsComplexDetailLoading(false);
      }
    };
    void loadComplexDetail();
    return () => { cancelled = true; controller.abort(); };
  }, [selectedComplexId, boardUniverseCode, selectedDetailDate]);
  const isSuppressingStaleBoard =
    staleBoardUniverseCode !== null &&
    boardItems.length > 0 &&
    presentationBoardItems.length === 0;
  const boardDeliveryState = isBoardLoading
    ? isSuppressingStaleBoard
      ? "stale-suppressed"
      : "loading"
    : liveBoardError
      ? "degraded"
      : "ready";
  const formattedLatestBoardDate =
    boardDeliveryMeta.requestedUniverseCode === boardUniverseCode &&
    boardDeliveryMeta.renderedUniverseCode === boardUniverseCode
      ? formatSnapshotDate(boardDeliveryMeta.latestBoardDate)
      : null;
  const renderDiscoveryCandidatesSection = () => {
    if (!hasDiscoveryCandidates) return null;

    const selectedCandidateVisible = visibleDiscoveryCandidates.some(
      (candidate) =>
        candidate.discoveryId === selectedDiscoveryCandidate?.discoveryId,
    );

    return (
      <div
        data-testid="ranking-discovery-section"
        className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-3 py-3 text-left sm:px-4"
      >
        <div className="mb-3 flex items-center justify-between gap-3 text-caption uppercase tracking-label text-amber-200/80">
          <span>순위 확인 중인 단지</span>
          <span>{visibleDiscoveryCandidates.length}개 단지</span>
        </div>

        <div className="space-y-2">
          {visibleDiscoveryCandidates.map((candidate) => {
            const isSelected =
              selectedDiscoveryCandidate?.discoveryId === candidate.discoveryId;

            return (
              <button
                key={candidate.discoveryId}
                type="button"
                data-testid="ranking-discovery-candidate"
                data-complex-id={candidate.complexId}
                onClick={() => setSelectedDiscoveryCandidate(candidate)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition focus:outline-none ${
                  isSelected
                    ? "border-amber-300/60 bg-amber-500/15"
                    : "border-amber-400/25 bg-black/20 hover:border-amber-300/50 hover:bg-amber-500/15 focus:border-amber-300/50 focus:bg-amber-500/15"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-amber-300/40 px-2 py-0.5 text-caption font-semibold text-amber-200">
                    순위 준비 중
                  </span>
                  <span className="min-w-0 truncate text-sm font-semibold text-slate-100">
                    {candidate.displayName}
                  </span>
                </div>
                <p className="mt-1 truncate text-caption text-slate-500">
                  {candidate.regionLabel}
                </p>
                <p className="mt-2 text-sm leading-copy text-amber-100/80">
                  {candidate.copy.message}
                </p>
              </button>
            );
          })}
        </div>

        {selectedCandidateVisible && selectedDiscoveryCandidate && (
          <div className="mt-3 rounded-xl border border-amber-300/20 bg-black/25 px-3 py-3 text-sm leading-copy text-slate-300">
            <p className="font-semibold text-amber-100">
              {selectedDiscoveryCandidate.displayName}
            </p>
            <p className="mt-1 text-slate-500">
              {selectedDiscoveryCandidate.regionLabel}
            </p>
            <p className="mt-2">{selectedDiscoveryCandidate.copy.helperText}</p>
            <p className="mt-2 text-slate-500">
              랭킹 상세는 아직 열리지 않습니다.
            </p>
          </div>
        )}

        {isDiscoverySearchPending && (
          <p className="mt-3 text-caption text-amber-100/60">
            추가로 찾은 단지를 확인하고 있어요.
          </p>
        )}
      </div>
    );
  };

  const renderRegionResolutionNotice = () => {
    if (!hasSearchRegionBlock && searchRegionWarnings.length === 0) return null;

    return (
      <div
        data-testid="ranking-region-resolution"
        className="mb-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
      >
        <p className="font-semibold">
          {searchRegionResolution?.state === "UNIVERSE_CONFLICT"
            ? "입력한 지역이 현재 선택한 랭킹 범위와 다릅니다."
            : searchRegionResolution?.state === "AMBIGUOUS"
              ? "검색할 지역을 구체적으로 선택해 주세요."
              : "지역 해석 없이 기존 검색을 사용합니다."}
        </p>
        {searchClarificationChoices.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {searchClarificationChoices.map((choice) => (
              <button
                key={choice.canonicalRegionCode}
                type="button"
                disabled={choice.compatibility === "INCOMPATIBLE"}
                aria-label={`${choice.qualifiedNameKo} 지역으로 랭킹 검색어 구체화`}
                onClick={() => setSearchQuery(choice.replacementQuery)}
                className="rounded-lg border border-amber-300/30 px-3 py-1.5 text-left text-xs disabled:cursor-not-allowed disabled:opacity-45"
              >
                {choice.qualifiedNameKo}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className={`flex w-full min-w-0 max-w-full min-h-0 flex-col border backdrop-blur-sm ${
          isHomeFlagship
            ? "rounded-[1.35rem] border-slate-600/70 bg-[#090f16] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_50px_rgba(0,0,0,0.42)]"
            : "rounded-2xl border-slate-700/50 bg-[#0b1118]/90 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_40px_rgba(0,0,0,0.4)]"
        } ${useInternalScroll ? "h-full overflow-hidden" : "overflow-visible"
          }`}
        data-testid="ranking-board"
        data-universe-code={boardUniverseCode}
        data-api-base-path={apiBasePath}
        data-requested-universe-code={boardDeliveryMeta.requestedUniverseCode}
        data-rendered-universe-code={boardDeliveryMeta.renderedUniverseCode}
        data-board-delivery-state={boardDeliveryState}
        data-board-source={boardDeliveryMeta.source}
        data-board-cache-state={boardDeliveryMeta.cacheState}
        data-board-fallback-mode={boardDeliveryMeta.fallbackMode}
        data-board-fallback-used={boardDeliveryMeta.fallbackUsed ? "true" : "false"}
        data-board-degraded={boardDeliveryMeta.degraded ? "true" : "false"}
        data-board-stale-universe-code={staleBoardUniverseCode ?? ""}
        data-latest-board-date={boardDeliveryMeta.latestBoardDate ?? ""}
        data-ranking-presentation={presentation}
      >
        <div
          className={`flex min-w-0 max-w-full shrink-0 flex-col border-b border-slate-800/80 ${
            isWeeklyMovementFullBoard
              ? "gap-2 p-3 sm:p-4 lg:p-4"
              : isHomeFlagship
                ? "gap-1 p-2 sm:gap-2 sm:p-4"
                : "gap-3 p-4 lg:p-5"
          }`}
        >
          {isWeeklyMovementFullBoard ? <>
            <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(160px,0.9fr)_minmax(200px,1.4fr)_minmax(190px,1fr)]" data-testid="ranking-toolbar">
              <UniverseSelector value={boardUniverseCode} options={universeOptions} onChange={handleUniverseChange} density="toolbar" />
              <label className="min-w-0"><span className="sr-only">아파트 이름·지역 검색</span><input aria-label="아파트 이름·지역 검색" aria-busy={isDiscoverySearchPending} placeholder="아파트 이름·지역 검색" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} className="min-h-11 w-full rounded-lg border border-[var(--ko-border)] bg-surface px-3 py-2 text-input text-ink outline-none focus:border-accent" /></label>
              <label className="min-w-0"><span className="sr-only">랭킹 정렬</span><select aria-label="랭킹 정렬" className="ko-index-select min-h-11 w-full rounded-lg border border-[var(--ko-border)] px-3 py-2 text-control font-semibold" value={rankingSort} onChange={event => setRankingSort(parseRankingSort(event.target.value))}>
                <option value="rank">시가총액 순위순</option><option value="rank-up">순위가 많이 오른 순</option><option value="rank-down">순위가 많이 내린 순</option><option value="cap-up" disabled={!hasCapComparisons}>시총 증가율순{hasCapComparisons ? "" : " · 비교 준비 중"}</option><option value="cap-down" disabled={!hasCapComparisons}>시총 감소율순{hasCapComparisons ? "" : " · 비교 준비 중"}</option>
              </select></label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2" role="group" aria-label="공통 단지 순위 비교" data-testid="ranking-movement-filters">
                {MOVEMENT_FILTER_OPTIONS.map(movement => <button key={movement.key} type="button" data-movement-filter={movement.key.toLowerCase()} aria-pressed={selectedMovementFilter === movement.key} onClick={() => setSelectedMovementFilter(movement.key)} className={`min-h-11 rounded-lg border px-3 py-2 text-control font-semibold ${selectedMovementFilter === movement.key ? "border-accent bg-[var(--ko-accent-soft)] text-accent" : "border-[var(--ko-border)] bg-surface text-muted"}`}>{movement.label}</button>)}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-caption text-muted">
                {formattedLatestBoardDate ? <span data-testid="ranking-freshness">기준일 {formattedLatestBoardDate}</span> : null}
                {isBoardLoading || boardDeliveryMeta.source === "client_pending" ? <span role="status">랭킹 불러오는 중</span> : null}
                <span aria-live="polite" data-testid="ranking-visible-count">표시 {visibleItems.length}개 / 검색·필터 결과 {filteredItems.length}개 / 전체 {presentationBoardItems.length}개</span>
              </div>
            </div>
            <details className="text-caption text-muted" data-testid="ranking-extra-filters">
              <summary className="w-fit cursor-pointer py-1 font-semibold text-ink">등급·관심 단지 필터{selectedTierFilter !== "ALL" || showBookmarksOnly || districtQueryLocal ? " · 적용 중" : ""}</summary>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {enableTierFilters ? TIER_FILTER_OPTIONS.map(tier => <button key={tier.key} type="button" aria-pressed={selectedTierFilter === tier.key} onClick={() => setSelectedTierFilter(tier.key)} className={`min-h-10 rounded-lg border px-3 py-2 text-control ${selectedTierFilter === tier.key ? "border-accent text-accent" : "border-[var(--ko-border)] text-muted"}`}>{tier.label}</button>) : null}
                <button type="button" aria-pressed={showBookmarksOnly} onClick={() => setShowBookmarksOnly(value => !value)} className="min-h-10 rounded-lg border border-[var(--ko-border)] px-3 py-2 text-control">★ 관심 단지만{showBookmarksOnly ? " · 켜짐" : ""}</button>
                {districtQueryLocal ? <button type="button" onClick={clearDistrict} className="min-h-10 rounded-lg border border-[var(--ko-border)] px-3 py-2 text-control">{activeDistrictLabel} 조건 지우기 ×</button> : null}
              </div>
            </details>
            <p className="text-caption text-muted">순위 차이는 두 기록의 공통 단지끼리 비교해요. 시총 변화율은 계산 근거가 확인된 경우에만 표시해요.</p>
            {liveBoardError ? <p role="alert" className="text-caption text-down">{liveBoardError}</p> : null}
            {comparisonLinkError?.key === comparisonRequestKey ? <p role="alert" className="text-caption text-down">{comparisonLinkError.message}</p> : null}
            {isSuppressingStaleBoard ? <p data-testid="ranking-board-degraded-state" className="text-caption text-muted">선택한 지역의 랭킹을 불러오고 있어요.</p> : null}
          </> : <>
          <div
            className={
              isHomeFlagship
                ? "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 sm:flex sm:items-start sm:justify-between"
                : `flex flex-col sm:flex-row sm:items-start sm:justify-between ${
                    isWeeklyMovementFullBoard ? "gap-2" : "gap-3"
                  }`
            }
          >
            <div className="w-full min-w-0 max-w-full">
              <h2
                className={`ko-section-title break-words font-bold text-slate-100 [overflow-wrap:break-word] ${
                  isHomeFlagship
                    ? "font-mono tabular-nums text-xl tracking-heading sm:text-2xl"
                    : "text-section tracking-heading"
                }`}
              >
                {title}
              </h2>

              {isWeeklyMovementFullBoard && (
                <p className="mt-1 text-caption font-semibold uppercase tracking-label text-cyan-300">
                  전주·금주에 모두 있던 단지 안에서 순위를 비교해요. 현재 공표 순위와는 별개예요.
                </p>
              )}

              {!isWeeklyMovementFullBoard && (
                <p
                  className={`ko-copy mt-1 max-w-copy break-words text-sm leading-copy text-slate-500 [overflow-wrap:break-word] ${
                    isHomeFlagship ? "hidden sm:block" : ""
                  }`}
                >
                  {isHomeFlagship
                    ? "단지 전체의 추정 가치 순위와 지난주보다 얼마나 달라졌는지 함께 확인해 보세요."
                    : LAUNCH_COPY.boardIntro}
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {isWeeklyMovementFullBoard && formattedLatestBoardDate && (
                <span
                  className="w-fit rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-caption font-semibold uppercase tracking-label text-slate-300"
                  data-testid="ranking-freshness"
                >
                  기준일 {formattedLatestBoardDate}
                </span>
              )}
              {isHomeFlagship && formattedLatestBoardDate && (
                <span
                  className="w-fit rounded-full border border-slate-700 bg-slate-950/80 px-2.5 py-1 font-mono tabular-nums text-caption font-semibold uppercase tracking-label text-slate-300"
                  data-testid="home-ranking-freshness"
                >
                  기준일 {formattedLatestBoardDate}
                </span>
              )}
              {isBoardLoading && (
                <span className="w-fit rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-caption font-semibold uppercase tracking-label text-cyan-300">
                  랭킹 불러오는 중
                </span>
              )}
            </div>
          </div>

          {!isHomeFlagship && <BetaDisclosure variant="compact" />}

          <div
            className={
              isWeeklyMovementFullBoard || isHomeFlagship ? "" : "mt-3"
            }
          >
            <UniverseSelector
              value={boardUniverseCode}
              options={universeOptions}
              onChange={handleUniverseChange}
              density={
                isWeeklyMovementFullBoard || isHomeFlagship
                  ? "compact"
                  : "default"
              }
            />
          </div>

          {isWeeklyMovementFullBoard && (
            <div
              className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] p-2.5"
              data-testid="ranking-movement-filters"
            >
              {comparisonLinkError?.key === comparisonRequestKey ? <p role="alert" className="mb-3 text-control text-amber-300">{comparisonLinkError.message}</p> : null}
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-caption font-semibold uppercase tracking-label text-cyan-300">
                  이번 주 순위 변화
                </span>
                <span className="text-caption text-slate-500">
                  공개된 자료 기준
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap">
                {MOVEMENT_FILTER_OPTIONS.map((movement) => {
                  const isActive = selectedMovementFilter === movement.key;

                  return (
                    <button
                      key={movement.key}
                      type="button"
                      data-movement-filter={movement.key.toLowerCase()}
                      aria-pressed={isActive}
                      onClick={() => setSelectedMovementFilter(movement.key)}
                      className={`min-h-11 rounded-lg border px-2 py-2 text-xs font-semibold transition-all sm:min-h-0 sm:px-3 ${
                        isActive
                          ? "border-cyan-300/60 bg-cyan-400/15 text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.08)]"
                          : "border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                      }`}
                    >
                      {movement.label}
                    </button>
                  );
                })}
              </div>
              <label className="mt-3 flex flex-wrap items-center gap-3 text-control text-slate-300">
                정렬
                <select aria-label="랭킹 정렬" className="ko-index-select min-h-11 max-w-full rounded-lg border border-[var(--ko-border)] px-3 py-2 font-semibold text-ink" value={rankingSort} onChange={event => setRankingSort(parseRankingSort(event.target.value))}>
                  <option value="rank">시가총액 순위순</option><option value="rank-up">순위가 많이 오른 순</option><option value="rank-down">순위가 많이 내린 순</option><option value="cap-up">시총 증가율이 큰 순</option><option value="cap-down">시총 감소율이 큰 순</option>
                </select>
              </label>
              <p className="mt-2 text-caption text-slate-400">현재 지역의 공개 랭킹 안에서 정렬해요. 변동은 7일 전과 비교하며, 비교 자료가 없는 단지는 마지막에 표시해요.</p>
            </div>
          )}

          {enableTierFilters && (
            <div
              className={
                isWeeklyMovementFullBoard
                  ? "flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
                  : "mt-3 flex flex-wrap items-center gap-2"
              }
            >
              {TIER_FILTER_OPTIONS.map((tier) => {
                const isActive = selectedTierFilter === tier.key;

                return (
                  <button
                    key={tier.key}
                    type="button"
                    onClick={() => setSelectedTierFilter(tier.key)}
                    className={`rounded-lg border px-3 py-1.5 text-caption font-semibold transition-all ${
                      isWeeklyMovementFullBoard
                        ? "min-h-11 shrink-0 whitespace-nowrap sm:min-h-0 "
                        : ""
                    }${isActive
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

          <div
            className={
              isHomeFlagship
                ? "grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] items-stretch gap-2 sm:flex sm:items-center sm:justify-between"
                : "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
            }
          >
            <div
              className={`flex min-w-0 w-full rounded-lg border border-slate-700/50 bg-black/40 p-1 ${
                isHomeFlagship ? "sm:w-auto" : "lg:w-auto"
              }`}
            >
              <button
                onClick={() => setShowBookmarksOnly(false)}
                className={`min-h-11 flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold transition-all sm:min-h-0 ${!showBookmarksOnly
                  ? "bg-slate-700 text-white shadow"
                  : "text-slate-500 hover:text-slate-300"
                  }`}
              >
                전체 보기
              </button>
              <button
                onClick={() => setShowBookmarksOnly(true)}
                className={`min-h-11 flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold transition-all sm:min-h-0 ${showBookmarksOnly
                  ? "bg-yellow-500/10 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.1)]"
                  : "text-slate-500 hover:text-slate-300"
                  }`}
              >
                ★ 관심 단지
              </button>
            </div>

            <div
              className={
                isHomeFlagship
                  ? "min-w-0 w-full sm:max-w-[200px]"
                  : "w-full lg:max-w-[200px]"
              }
            >
              <input
                type="text"
                placeholder="아파트 이름·지역 검색"
                aria-label="아파트 이름·지역 검색"
                aria-busy={isDiscoverySearchPending}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-2 text-sm text-slate-200 outline-none transition-all focus:border-cyan-500/50 focus:bg-slate-800/60 sm:min-h-0"
              />
            </div>
          </div>

          {liveBoardError && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {liveBoardError}
            </div>
          )}

          {isBoardLoading && isSuppressingStaleBoard && (
            <div
              className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
              data-testid="ranking-board-degraded-state"
              data-board-delivery-state={boardDeliveryState}
              data-requested-universe-code={boardDeliveryMeta.requestedUniverseCode}
              data-rendered-universe-code={boardDeliveryMeta.renderedUniverseCode}
              data-board-fallback-mode={boardDeliveryMeta.fallbackMode}
              data-board-fallback-used={boardDeliveryMeta.fallbackUsed ? "true" : "false"}
              data-board-degraded={boardDeliveryMeta.degraded ? "true" : "false"}
              data-board-stale-universe-code={staleBoardUniverseCode ?? ""}
            >
              {getUniverseLabel(boardUniverseCode)} 랭킹을 다시 불러오고 있어요.
              선택한 지역의 자료가 준비되면 표시할게요.
            </div>
          )}

          {(districtQueryLocal ||
            searchQuery ||
            (isWeeklyMovementFullBoard && selectedMovementFilter !== "ALL") ||
            (enableTierFilters && selectedTierFilter !== "ALL")) && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-caption uppercase tracking-label text-slate-500">
                  적용 중
                </span>

                {enableTierFilters && selectedTierFilter !== "ALL" && (
                  <div className="flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-caption font-semibold text-cyan-300">
                    <span>🏷 {TIER_FILTER_OPTIONS.find((option) => option.key === selectedTierFilter)?.label}</span>
                    <button
                      onClick={() => setSelectedTierFilter("ALL")}
                      className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-cyan-300/70 transition-all hover:bg-cyan-500/20 hover:text-cyan-200"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {isWeeklyMovementFullBoard &&
                  selectedMovementFilter !== "ALL" && (
                    <div className="flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-caption font-semibold text-cyan-200">
                      <span>{MOVEMENT_FILTER_OPTIONS.find((option) => option.key === selectedMovementFilter)?.label}</span>
                      <button
                        type="button"
                        aria-label="순위 변화 조건 지우기"
                        onClick={() => setSelectedMovementFilter("ALL")}
                        className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-cyan-300/70 transition-all hover:bg-cyan-500/20 hover:text-cyan-100"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                {districtQueryLocal && (
                  <div className="flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-caption font-semibold text-cyan-400">
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
                  <div className="flex items-center gap-1 rounded-full border border-slate-600 bg-slate-700 px-2.5 py-1 text-caption font-semibold text-slate-200">
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

          <div
            className={`mt-1 justify-between text-caption text-slate-500 ${
              isHomeFlagship ? "hidden sm:flex" : "flex"
            }`}
          >
            <span>표시 {filteredItems.length}개</span>
            <span>전체 {presentationBoardItems.length}개</span>
          </div>
          </>}
        </div>

        <div
          className={useInternalScroll ? "min-h-0 flex-1 overflow-hidden rounded-b-2xl" : "min-h-0"}
        >
          <div
            className={`min-h-0 p-2 sm:p-3 ${useInternalScroll
              ? "ranking-board-scroll h-full overflow-y-auto overscroll-contain pr-1 sm:pr-2"
              : "h-auto overflow-visible"
              }`}
          >
            {renderRegionResolutionNotice()}
            {(isBoardLoading || boardDeliveryMeta.source === "client_pending") && presentationBoardItems.length === 0 ? (
              <div aria-busy="true" className="flex h-32 items-center justify-center"><SearchProgress label="공개 랭킹을 불러오고 있어요" /></div>
            ) : liveBoardError && presentationBoardItems.length === 0 ? (
              <div
                className="flex h-32 flex-col items-center justify-center gap-2 text-rose-300"
                data-testid="ranking-board-error-state"
              >
                <span className="text-2xl opacity-60">!</span>
                <p className="text-sm">선택한 지역의 랭킹을 불러오지 못했어요.</p>
              </div>
            ) : isDiscoverySearchPending ? (
              <div aria-busy="true" className="flex h-32 items-center justify-center"><SearchProgress /></div>
            ) : filteredItems.length > 0 || otherRegionSearchItems.length > 0 ? (
              <div className="flex flex-col gap-2 pb-2">
                {visibleItems.map((item) => (
                  <RankingCard
                    key={item.complexId}
                    item={item}
                    variant={
                      isWeeklyMovementFullBoard ? "full-board" : "default"
                    }
                    currentSnapshotDate={boardDeliveryMeta.latestBoardDate}
                    isBookmarked={bookmarks.includes(item.complexId)}
                    onToggleBookmark={(id) => toggleBookmark(id, { name: item.name, locationLabel: [item.sigunguName, item.legalDongName].filter(Boolean).join(" ") })}
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
                {isWeeklyMovementFullBoard && visibleItems.length < filteredItems.length ? <button type="button" data-testid="ranking-load-more" onClick={() => setListPage({ key: listPageKey, count: listVisibleCount + 50 })} className="min-h-12 rounded-xl border border-[var(--ko-border)] bg-surface px-4 py-3 text-control font-semibold text-accent">50개 더 보기 · {filteredItems.length - visibleItems.length}개 남음</button> : null}
                {otherRegionSearchItems.length > 0 ? (
                  <section aria-label="다른 지역의 공개 검색 결과" className="rounded-xl border border-[var(--ko-border)] bg-surface p-4">
                    <h3 className="text-control font-semibold text-ink">다른 지역의 공개 결과에서 찾았어요</h3>
                    <p className="mt-1 text-caption text-muted">전국 순위가 아니라, 해당 지역 안에서의 순위예요.</p>
                    {otherRegionSearchItems.map(item => (
                      <Link key={`${item.universeCode}:${item.complexId}`} href={`/ranking?${new URLSearchParams({ universe: item.universeCode!, complexId: item.complexId })}`}
                        className="mt-3 flex min-h-11 items-center justify-between gap-4 rounded-lg border border-[var(--ko-border)] px-4 py-3 hover:bg-[var(--ko-accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--ko-focus)]">
                        <span className="min-w-0"><strong className="block text-control text-ink">{item.name}</strong><span className="text-caption text-muted">{item.locationLabel}</span></span>
                        <span className="shrink-0 text-right text-control font-semibold text-accent">{getUniverseLabel(item.universeCode!)} · {item.rank}위{item.snapshotDate ? <span className="block text-caption font-normal text-muted">{item.snapshotDate} 기준</span> : null}</span>
                      </Link>
                    ))}
                  </section>
                ) : null}
                {renderDiscoveryCandidatesSection()}
              </div>
            ) : hasDiscoveryCandidates ? (
              <div className="flex flex-col gap-3 pb-2">
                <div className="rounded-2xl border border-slate-800 bg-black/20 px-4 py-4 text-sm leading-copy text-slate-400">
                  <p className="font-semibold text-slate-200">
                    현재 공개된 랭킹에서는 일치하는 단지를 찾지 못했어요.
                  </p>
                  <p className="mt-2">
                    이름과 위치가 확인된 단지를 아래에 따로
                    보여드려요. 순위·시가총액·상세 차트는 아직 제공하지
                    않습니다.
                  </p>
                </div>
                {renderDiscoveryCandidatesSection()}
              </div>
            ) : currentDiscoverySearchError ? (
              <div role="status" className="flex h-32 items-center justify-center px-4 text-center text-sm text-amber-200">
                {currentDiscoverySearchError}
              </div>
            ) : (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-slate-500">
                <span className="text-2xl opacity-50">
                  {filteredZeroMessage ? "⌕" : "📡"}
                </span>
                <p
                  className="text-center text-sm"
                  data-testid="ranking-empty-message"
                >
                  {filteredZeroMessage ?? emptyMessage}
                </p>
                {searchQuery.trim() && presentationBoardItems.length > 0 && (
                  <p className="text-xs text-slate-600">
                    더 넓은 공개 결과는 화면 우하단 단지·지역 검색에서 이어서 볼 수 있습니다.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ComparisonSheet
        open={isComparisonOpen}
        items={comparisonItems}
        sharedDate={isComparisonDate(requestedComparisonDate) && parseComparisonIds(requestedComparison).length === 2 && parseComparisonIds(requestedComparison).every(id => comparisonItems.some(item => item.complexId === id)) ? requestedComparisonDate : null}
        onClose={() => setIsComparisonOpen(false)}
        onRemoveItem={(item: any) => toggleComparisonItem(item)}
        onClear={() => {
          setComparisonItems([]);
          setIsComparisonOpen(false);
        }}
      />

      <ComplexDetailSheet
        open={!!selectedComplexId}
        complexId={selectedComplexId}
        item={selectedItem}
        detail={selectedDetail}
        loading={isComplexDetailLoading}
        error={complexDetailError}
        onClose={() => {
          replaceUrlParams((params) => {
            params.delete("complexId");
          }, "replace");

          setSelectedComplexId(null);
          setComplexDetailError(null);
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
