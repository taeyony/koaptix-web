"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { RankingCard } from "./RankingCard";
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

type ApiEnvelope<T> = T | { data?: T | null } | null;
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
  discoveryCandidates?: DiscoveryCandidate[];
  message?: string;
};

type DiscoverySearchPayload = {
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

type CanonicalSidoIdentity =
  | "SEOUL_ALL"
  | "BUSAN_ALL"
  | "DAEGU_ALL"
  | "INCHEON_ALL"
  | "GWANGJU_ALL"
  | "DAEJEON_ALL"
  | "ULSAN_ALL"
  | "SEJONG_ALL"
  | "GYEONGGI_ALL"
  | "GANGWON_ALL"
  | "CHUNGBUK_ALL"
  | "CHUNGNAM_ALL"
  | "JEONBUK_ALL"
  | "JEONNAM_ALL"
  | "GYEONGBUK_ALL"
  | "GYEONGNAM_ALL"
  | "JEJU_ALL";

type DistrictIdentity = {
  sido: CanonicalSidoIdentity | null;
  sigungu: string;
};

type TierFilterKey = "ALL" | "S" | "A" | "B" | "C" | "D";
type MovementFilterKey = "ALL" | "UP" | "DOWN" | "NEW";

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

const MOVEMENT_FILTER_OPTIONS: Array<{
  key: MovementFilterKey;
  label: string;
}> = [
  { key: "ALL", label: "All" },
  { key: "UP", label: "Rising" },
  { key: "DOWN", label: "Falling" },
  { key: "NEW", label: "NEW" },
];

const SIDO_ALIAS_ENTRIES: ReadonlyArray<
  readonly [string, CanonicalSidoIdentity]
> = [
  ["세종특별자치시", "SEJONG_ALL"],
  ["강원특별자치도", "GANGWON_ALL"],
  ["전북특별자치도", "JEONBUK_ALL"],
  ["제주특별자치도", "JEJU_ALL"],
  ["서울특별시", "SEOUL_ALL"],
  ["부산광역시", "BUSAN_ALL"],
  ["대구광역시", "DAEGU_ALL"],
  ["인천광역시", "INCHEON_ALL"],
  ["광주광역시", "GWANGJU_ALL"],
  ["대전광역시", "DAEJEON_ALL"],
  ["울산광역시", "ULSAN_ALL"],
  ["경기도", "GYEONGGI_ALL"],
  ["강원도", "GANGWON_ALL"],
  ["충청북도", "CHUNGBUK_ALL"],
  ["충청남도", "CHUNGNAM_ALL"],
  ["전라북도", "JEONBUK_ALL"],
  ["전라남도", "JEONNAM_ALL"],
  ["경상북도", "GYEONGBUK_ALL"],
  ["경상남도", "GYEONGNAM_ALL"],
  ["제주도", "JEJU_ALL"],
  ["서울시", "SEOUL_ALL"],
  ["부산시", "BUSAN_ALL"],
  ["대구시", "DAEGU_ALL"],
  ["인천시", "INCHEON_ALL"],
  ["광주시", "GWANGJU_ALL"],
  ["대전시", "DAEJEON_ALL"],
  ["울산시", "ULSAN_ALL"],
  ["세종시", "SEJONG_ALL"],
  ["서울", "SEOUL_ALL"],
  ["부산", "BUSAN_ALL"],
  ["대구", "DAEGU_ALL"],
  ["인천", "INCHEON_ALL"],
  ["광주", "GWANGJU_ALL"],
  ["대전", "DAEJEON_ALL"],
  ["울산", "ULSAN_ALL"],
  ["세종", "SEJONG_ALL"],
  ["경기", "GYEONGGI_ALL"],
  ["강원", "GANGWON_ALL"],
  ["충북", "CHUNGBUK_ALL"],
  ["충남", "CHUNGNAM_ALL"],
  ["전북", "JEONBUK_ALL"],
  ["전남", "JEONNAM_ALL"],
  ["경북", "GYEONGBUK_ALL"],
  ["경남", "GYEONGNAM_ALL"],
  ["제주", "JEJU_ALL"],
];

const SIDO_BY_UNIVERSE_CODE: Readonly<
  Partial<Record<string, CanonicalSidoIdentity>>
> = {
  SEOUL_ALL: "SEOUL_ALL",
  BUSAN_ALL: "BUSAN_ALL",
  DAEGU_ALL: "DAEGU_ALL",
  INCHEON_ALL: "INCHEON_ALL",
  GWANGJU_ALL: "GWANGJU_ALL",
  DAEJEON_ALL: "DAEJEON_ALL",
  ULSAN_ALL: "ULSAN_ALL",
  SEJONG_ALL: "SEJONG_ALL",
  GYEONGGI_ALL: "GYEONGGI_ALL",
  GANGWON_ALL: "GANGWON_ALL",
  CHUNGBUK_ALL: "CHUNGBUK_ALL",
  CHUNGNAM_ALL: "CHUNGNAM_ALL",
  JEONBUK_ALL: "JEONBUK_ALL",
  JEONNAM_ALL: "JEONNAM_ALL",
  GYEONGBUK_ALL: "GYEONGBUK_ALL",
  GYEONGNAM_ALL: "GYEONGNAM_ALL",
  JEJU_ALL: "JEJU_ALL",
};

const SIDO_BY_ADMIN_PREFIX: Readonly<
  Partial<Record<string, CanonicalSidoIdentity>>
> = {
  "11": "SEOUL_ALL",
  "26": "BUSAN_ALL",
  "27": "DAEGU_ALL",
  "28": "INCHEON_ALL",
  "29": "GWANGJU_ALL",
  "30": "DAEJEON_ALL",
  "31": "ULSAN_ALL",
  "36": "SEJONG_ALL",
  "41": "GYEONGGI_ALL",
  "42": "GANGWON_ALL",
  "43": "CHUNGBUK_ALL",
  "44": "CHUNGNAM_ALL",
  "45": "JEONBUK_ALL",
  "46": "JEONNAM_ALL",
  "47": "GYEONGBUK_ALL",
  "48": "GYEONGNAM_ALL",
  "50": "JEJU_ALL",
  "51": "GANGWON_ALL",
  "52": "JEONBUK_ALL",
};

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

function normalizeAdministrativeLabel(value: unknown): string {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function resolveCanonicalSidoLabel(
  value: unknown,
): CanonicalSidoIdentity | null {
  const normalized = normalizeAdministrativeLabel(value);
  if (!normalized) return null;

  return (
    SIDO_ALIAS_ENTRIES.find(([alias]) => alias === normalized)?.[1] ?? null
  );
}

function resolveSidoFromUniverseCode(
  universeCode?: string | null,
): CanonicalSidoIdentity | null {
  const normalized = String(universeCode ?? "")
    .trim()
    .toUpperCase();
  const direct = SIDO_BY_UNIVERSE_CODE[normalized];
  if (direct) return direct;

  const sggMatch = normalized.match(/^SGG_(\d{2})\d{3}$/);
  return sggMatch ? SIDO_BY_ADMIN_PREFIX[sggMatch[1]] ?? null : null;
}

function parseDistrictIdentity(value: unknown): DistrictIdentity | null {
  const normalized = normalizeAdministrativeLabel(value);
  if (!normalized) return null;

  for (const [alias, sido] of SIDO_ALIAS_ENTRIES) {
    if (!normalized.startsWith(`${alias} `)) continue;

    const sigungu = normalizeAdministrativeLabel(
      normalized.slice(alias.length + 1),
    );

    return /[시군구]$/.test(sigungu) ? { sido, sigungu } : null;
  }

  return /[시군구]$/.test(normalized)
    ? { sido: null, sigungu: normalized }
    : null;
}

function matchesStructuredDistrict(
  item: RankingItem,
  selectedDistrict: string,
  boardUniverseCode: string,
): boolean {
  const selected = parseDistrictIdentity(selectedDistrict);
  const rowDistrict = parseDistrictIdentity(
    item.sigunguName ?? item.sigungu_name,
  );

  if (!selected || !rowDistrict) return false;
  if (selected.sigungu !== rowDistrict.sigungu) return false;

  const rawCityName = normalizeAdministrativeLabel(item.cityName);
  const cityFromField = resolveCanonicalSidoLabel(rawCityName);
  if (rawCityName && !cityFromField) return false;

  const rowSidoEvidence = [
    cityFromField,
    rowDistrict.sido,
    resolveSidoFromUniverseCode(item.universeCode ?? item.universe_code),
    resolveSidoFromUniverseCode(boardUniverseCode),
  ].filter((value): value is CanonicalSidoIdentity => value !== null);

  if (rowSidoEvidence.length === 0) return false;

  const rowSido = rowSidoEvidence[0];
  if (rowSidoEvidence.some((value) => value !== rowSido)) return false;

  const selectedSido =
    selected.sido ?? resolveSidoFromUniverseCode(boardUniverseCode);
  if (!selectedSido) return false;

  return rowSido === selectedSido;
}

function normalizeRankMovement(item: RankingItem): RankMovement | null {
  const value = item.rankMovement ?? item.rank_movement;
  if (value === "NEW" || value === "UP" || value === "DOWN" || value === "SAME") {
    return value;
  }

  return null;
}

function formatSnapshotDate(value: string | null): string | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : null;
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

const COMPLEX_DETAIL_API = (id: string) =>
  `/api/complex-detail?complexId=${encodeURIComponent(id)}`;

const KOREA_ALL_HOME_BOARD_LIMIT = 12;
const RANKING_DISCOVERY_SEARCH_LIMIT = 8;
const RANKING_DISCOVERY_SEARCH_MIN_QUERY_LENGTH = 2;
const RANKING_DISCOVERY_SEARCH_DEBOUNCE_MS = 250;
const RANKING_DISCOVERY_SEARCH_TIMEOUT_MS = 4500;

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
  `${apiBasePath}?universe_code=${encodeURIComponent(universeCode)}&limit=${limit}`;

function resolveBoardUniverseCode(input?: string | null) {
  return resolveUniverseRequest(input).requestedUniverseCode;
}

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
  const [selectedTierFilter, setSelectedTierFilter] =
    useState<TierFilterKey>(initialSelectedTierFilter);
  const [selectedMovementFilter, setSelectedMovementFilter] =
    useState<MovementFilterKey>(
      isWeeklyMovementFullBoard ? initialMovementFilter : "ALL",
    );

  const { bookmarks, toggleBookmark, isLoaded } = useBookmarks();
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  const [comparisonItems, setComparisonItems] = useState<RankingItem[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

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
    }, "replace");
  }, [
    isWeeklyMovementFullBoard,
    searchQuery,
    selectedMovementFilter,
    selectedTierFilter,
    syncRankingUrlState,
    replaceUrlParams,
  ]);

  useEffect(() => {
    const rawQuery = searchQuery.trim();
    const normalizedQuery = rawQuery.toLowerCase();

    if (normalizedQuery.length < RANKING_DISCOVERY_SEARCH_MIN_QUERY_LENGTH) {
      const resetId = window.setTimeout(() => {
        setDiscoveryCandidates([]);
        setSelectedDiscoveryCandidate(null);
        setSearchRegionResolution(null);
        setSearchClarificationChoices([]);
        setSearchRegionWarnings([]);
        setIsDiscoverySearchPending(false);
      }, 0);

      return () => window.clearTimeout(resetId);
    }

    const cacheKey = `${boardUniverseCode}::${normalizedQuery}`;
    const cached = discoverySearchCacheRef.current[cacheKey];

    if (cached) {
      const cacheId = window.setTimeout(() => {
        setDiscoveryCandidates(cached.discoveryCandidates);
        setSearchRegionResolution(cached.regionResolution);
        setSearchClarificationChoices(cached.clarificationChoices);
        setSearchRegionWarnings(cached.warnings);
        setSelectedDiscoveryCandidate(null);
        setIsDiscoverySearchPending(false);
      }, 0);

      return () => window.clearTimeout(cacheId);
    }

    const controller = new AbortController();
    let cancelled = false;
    let timedOut = false;
    let timeoutId: number | undefined;

    const debounceId = window.setTimeout(async () => {
      setIsDiscoverySearchPending(true);

      timeoutId = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, RANKING_DISCOVERY_SEARCH_TIMEOUT_MS);

      try {
        const nextPayload = await readDiscoveryCandidates(
          DISCOVERY_SEARCH_API(rawQuery, boardUniverseCode),
          controller.signal,
        );

        if (cancelled) return;

        discoverySearchCacheRef.current[cacheKey] = nextPayload;
        setDiscoveryCandidates(nextPayload.discoveryCandidates);
        setSearchRegionResolution(nextPayload.regionResolution);
        setSearchClarificationChoices(nextPayload.clarificationChoices);
        setSearchRegionWarnings(nextPayload.warnings);
        setSelectedDiscoveryCandidate(null);
      } catch (error) {
        if (!timedOut && (cancelled || isAbortError(error))) return;

        console.warn("[RankingBoardClient] discovery search skipped", {
          boardUniverseCode,
          queryLength: rawQuery.length,
          timedOut,
          message:
            error instanceof Error
              ? error.message
              : "discovery_search_unavailable",
        });
        setDiscoveryCandidates([]);
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
            : "보드 로딩 실패";

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

  const handleUniverseChange = useCallback(
    (nextUniverseCode: string) => {
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

        if (normalizedNext === DEFAULT_UNIVERSE_CODE) {
          params.delete("universe");
        } else {
          params.set("universe", normalizedNext);
        }
      }, "replace", true);

      setBoardUniverseCode(normalizedNext);
    },
    [
      boardDeliveryMeta,
      boardItems,
      boardLimit,
      apiBasePath,
      boardUniverseCode,
      replaceUrlParams,
      getBoardCacheKey,
    ],
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
        const detailPayload = await readApiData<ComplexDetail>(
          COMPLEX_DETAIL_API(selectedComplexId),
          controller.signal,
        );

        if (cancelled) return;

        if (!detailPayload) {
          setComplexDetail(null);
          setComplexDetailError("Detail unavailable");
          return;
        }

        setComplexDetail(detailPayload);
        setComplexDetailError(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (!cancelled) {
          setComplexDetail(null);
          setComplexDetailError("Detail unavailable");
        }
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
    presentationBoardItems,
    enableTierFilters,
    isWeeklyMovementFullBoard,
    selectedMovementFilter,
    selectedTierFilter,
    districtQueryLocal,
    boardUniverseCode,
    searchQuery,
    showBookmarksOnly,
    bookmarks,
    isLoaded,
    shouldSuppressSearchResults,
  ]);

  const filteredZeroMessage = useMemo(() => {
    if (presentationBoardItems.length === 0 || filteredItems.length > 0) {
      return null;
    }

    if (searchQuery.trim()) {
      return "현재 선택한 보드 안에서는 일치하는 단지가 없습니다.";
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

  const activeDistrictLabel = useMemo(() => {
    if (!districtQueryLocal) return "";

    if (boardUniverseCode === DEFAULT_UNIVERSE_CODE) {
      return districtQueryLocal;
    }

    const scopeLabel = getUniverseLabel(boardUniverseCode).replace(/\s*전체$/, "");
    return `${scopeLabel} ${districtQueryLocal}`.trim();
  }, [boardUniverseCode, districtQueryLocal]);
  const selectedItem =
    presentationBoardItems.find((i) => i.complexId === selectedComplexId) ??
    items.find((i) => i.complexId === selectedComplexId) ??
    null;
  const selectedDetail =
    complexDetail?.complexId === selectedComplexId ? complexDetail : null;
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
        <div className="mb-3 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-amber-200/80">
          <span>랭킹 산정 전 후보</span>
          <span>{visibleDiscoveryCandidates.length} ITEMS</span>
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
                  <span className="rounded-full border border-amber-300/40 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                    관측 준비중
                  </span>
                  <span className="min-w-0 truncate text-sm font-semibold text-slate-100">
                    {candidate.displayName}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] text-slate-500">
                  {candidate.regionLabel}
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-amber-100/80">
                  {candidate.copy.message}
                </p>
              </button>
            );
          })}
        </div>

        {selectedCandidateVisible && selectedDiscoveryCandidate && (
          <div className="mt-3 rounded-xl border border-amber-300/20 bg-black/25 px-3 py-3 text-[12px] leading-relaxed text-slate-300">
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
          <p className="mt-3 text-[11px] text-amber-100/60">
            관측 후보를 확인하는 중입니다.
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
                className={`break-words font-bold text-slate-100 [overflow-wrap:anywhere] ${
                  isHomeFlagship
                    ? "font-mono text-xl tracking-[-0.03em] sm:text-2xl"
                    : "text-base tracking-tight sm:text-lg"
                }`}
              >
                {title}
              </h2>

              {isWeeklyMovementFullBoard && (
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  Authoritative weekly universe-rank movement
                </p>
              )}

              {!isWeeklyMovementFullBoard && (
                <p
                  className={`mt-1 max-w-xl break-words text-[11px] leading-5 text-slate-500 [overflow-wrap:anywhere] ${
                    isHomeFlagship ? "hidden sm:block" : ""
                  }`}
                >
                  {isHomeFlagship
                    ? "단지별 추정 시가총액 순위와 공표된 주간 순위 이동을 함께 읽는 전술 보드입니다."
                    : LAUNCH_COPY.boardIntro}
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {isWeeklyMovementFullBoard && formattedLatestBoardDate && (
                <span
                  className="w-fit rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300"
                  data-testid="ranking-freshness"
                >
                  Updated {formattedLatestBoardDate}
                </span>
              )}
              {isHomeFlagship && formattedLatestBoardDate && (
                <span
                  className="w-fit rounded-full border border-slate-700 bg-slate-950/80 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300"
                  data-testid="home-ranking-freshness"
                >
                  Snapshot {formattedLatestBoardDate}
                </span>
              )}
              {isBoardLoading && (
                <span className="w-fit rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                  보드 새로고침 중
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
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  Weekly Rank Movement
                </span>
                <span className="text-[10px] text-slate-500">
                  Published state
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
                    className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all ${
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
                placeholder="보드 안에서 단지·지역 찾기"
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
              {getUniverseLabel(boardUniverseCode)} 보드를 다시 확인하는 중입니다.
              다른 유니버스의 이전 행은 새 관측값이 도착할 때까지 숨깁니다.
            </div>
          )}

          {(districtQueryLocal ||
            searchQuery ||
            (isWeeklyMovementFullBoard && selectedMovementFilter !== "ALL") ||
            (enableTierFilters && selectedTierFilter !== "ALL")) && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] uppercase tracking-widest text-slate-500">
                  적용 중
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

                {isWeeklyMovementFullBoard &&
                  selectedMovementFilter !== "ALL" && (
                    <div className="flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200">
                      <span>Weekly {selectedMovementFilter}</span>
                      <button
                        type="button"
                        aria-label="Clear weekly movement filter"
                        onClick={() => setSelectedMovementFilter("ALL")}
                        className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-cyan-300/70 transition-all hover:bg-cyan-500/20 hover:text-cyan-100"
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

          <div
            className={`mt-1 justify-between text-[11px] text-slate-500 ${
              isHomeFlagship ? "hidden sm:flex" : "flex"
            }`}
          >
            <span>표시 {filteredItems.length}개</span>
            <span>전체 {presentationBoardItems.length}개</span>
          </div>
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
            {isBoardLoading && presentationBoardItems.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-slate-500">
                <span className="text-2xl opacity-50">📡</span>
                <p className="text-sm">공개 랭킹 보드를 불러오는 중입니다.</p>
              </div>
            ) : liveBoardError && presentationBoardItems.length === 0 ? (
              <div
                className="flex h-32 flex-col items-center justify-center gap-2 text-rose-300"
                data-testid="ranking-board-error-state"
              >
                <span className="text-2xl opacity-60">!</span>
                <p className="text-sm">요청한 유니버스 보드를 표시할 수 없습니다.</p>
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="flex flex-col gap-2 pb-2">
                {filteredItems.map((item) => (
                  <RankingCard
                    key={item.complexId}
                    item={item}
                    variant={
                      isWeeklyMovementFullBoard ? "full-board" : "default"
                    }
                    currentSnapshotDate={boardDeliveryMeta.latestBoardDate}
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
                {renderDiscoveryCandidatesSection()}
              </div>
            ) : hasDiscoveryCandidates ? (
              <div className="flex flex-col gap-3 pb-2">
                <div className="rounded-2xl border border-slate-800 bg-black/20 px-4 py-4 text-sm leading-relaxed text-slate-400">
                  <p className="font-semibold text-slate-200">
                    현재 공개 랭킹 보드에는 일치하는 행이 없습니다.
                  </p>
                  <p className="mt-2">
                    단지 이름과 지역 정보가 확인된 관측 준비 후보만 별도로
                    표시합니다. 랭킹 편입, 시가총액, 상세 차트는 아직 열리지
                    않습니다.
                  </p>
                </div>
                {renderDiscoveryCandidatesSection()}
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
