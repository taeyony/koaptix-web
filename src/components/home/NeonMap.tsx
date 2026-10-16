"use client";

import { type KeyboardEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getMapGeocodeQueries, groupMapProvinces, mapChangeLabel, spreadMapLabels, summarizePublishedMap } from "../../lib/koaptix/mapPresentation";
import { getDistrictRankingHref } from "../../lib/koaptix/districtRankingHref";
import { Map, CustomOverlayMap, ZoomControl, useKakaoLoader } from "react-kakao-maps-sdk";
import type { DiscoveryCandidate, RankingItem } from "../../lib/koaptix/types";
import { SearchProgress } from "./SearchProgress";
import { DISCOVERY_SEARCH_REQUEST_TIMEOUT_MS as MAP_LOCAL_SEARCH_REMOTE_TIMEOUT_MS } from "../../lib/koaptix/discoverySearch";
import type {
  RegionAliasApiMetadata,
  RegionClarificationChoice,
  RegionResolutionResult,
} from "../../lib/koaptix/regionAliasV1.types";
import {
  DEFAULT_UNIVERSE_CODE,
  getUniverseLabel,
  resolveServiceUniverseCode,
  resolveUniverseRequest,
} from "../../lib/koaptix/universes";

type Coord = { lat: number; lng: number };

const MAP_AGGREGATION_BASIS = "PUBLISHED_TOP1000" as const;
const MAP_AGGREGATION_GRAIN = "DISTRICT_GROUP" as const;

type DistrictAggregate = {
  name: string;
  query: string;
  totalMarketCap: number;
  averageDelta: number;
  marketCapChangePct7d?: number | null;
  comparableComplexCount?: number;
  comparisonDate?: string | null;
  comparableCurrentMarketCapKrw?: number;
  comparablePreviousMarketCapKrw?: number;
  count: number;

  boardCount?: number;
  isBoardBacked?: boolean;

  primaryComplexId?: string | null;
  primaryComplexName?: string | null;
  primaryRank?: number | null;

  peakComplexMarketCap?: number;
  peakComplexName?: string | null;
};

type ResolvedMapItem = DistrictAggregate & {
  coords: Coord;
  visualRank: number;
  bubbleSize: number;
  members?: DistrictAggregate[];
};

type TopNOption = {
  label: string;
  value: number;
};

type MapApiResponse = {
  snapshot_date?: string;
  ok?: boolean;
  universeCode?: string;
  requestedUniverseCode?: string;
  renderedUniverseCode?: string;
  mapScopeLabel?: string;
  isFallback?: boolean;
  fallbackMode?: string;
  source?: string;
  cacheState?: string;
  aggregationBasis?: typeof MAP_AGGREGATION_BASIS;
  isCompleteDistrictTotal?: false;
  aggregationGrain?: typeof MAP_AGGREGATION_GRAIN;
  sourceRowLimit?: number | null;
  sourceRowsUsed?: number | null;
  count?: number;
  items?: DistrictAggregate[];
  message?: string;
};

type MapSearchApiResponse = RegionAliasApiMetadata & {
  ok?: boolean;
  localItems?: RankingItem[];
  globalItems?: RankingItem[];
  discoveryCandidates?: DiscoveryCandidate[];
  message?: string;
};

type MapSearchResultPayload = {
  items: RankingItem[];
  discoveryCandidates: DiscoveryCandidate[];
  regionResolution: RegionResolutionResult | null;
  clarificationChoices: RegionClarificationChoice[];
  warnings: string[];
};

type MapDeliveryState = {
  snapshotDate: string | null;
  requestedUniverseCode: string;
  renderedUniverseCode: string;
  mapScopeLabel: string;
  fallbackMode: string;
  cacheState: string;
  source: string;
  itemCount: number;
  aggregationBasis: typeof MAP_AGGREGATION_BASIS | "BOUNDED_PUBLISHED_RANK_SAMPLE";
  isCompleteDistrictTotal: false;
  aggregationGrain: typeof MAP_AGGREGATION_GRAIN;
  sourceRowLimit: number | null;
  sourceRowsUsed: number | null;
};

type MapLocalSearchSuggestion =
  | {
      kind: "complex";
      key: string;
      label: string;
      meta: string;
      source: "local" | "remote";
      item: RankingItem;
    }
  | {
      kind: "district";
      key: string;
      label: string;
      meta: string;
      source?: "district";
      district: DistrictAggregate;
    };

const SEOUL_DISTRICT_COORDS: Record<string, Coord> = {
  강남구: { lat: 37.5172, lng: 127.0473 },
  서초구: { lat: 37.4837, lng: 127.0324 },
  송파구: { lat: 37.5145, lng: 127.1066 },
  용산구: { lat: 37.5326, lng: 126.99 },
  성동구: { lat: 37.5635, lng: 127.0365 },
  마포구: { lat: 37.5665, lng: 126.9015 },
  동작구: { lat: 37.5124, lng: 126.9393 },
  강동구: { lat: 37.5301, lng: 127.1238 },
  양천구: { lat: 37.5169, lng: 126.8664 },
  영등포구: { lat: 37.5264, lng: 126.8963 },
  중구: { lat: 37.5636, lng: 126.9976 },
  종로구: { lat: 37.5729, lng: 126.9793 },
  광진구: { lat: 37.5385, lng: 127.0823 },
  서대문구: { lat: 37.5791, lng: 126.9368 },
};

const DEFAULT_KOREA_CENTER: Coord = { lat: 36.35, lng: 127.85 };
const REGIONAL_MAP_FETCH_TIMEOUT_MS = 7000;
const KOREA_ALL_MAP_FETCH_TIMEOUT_MS = 10000;

function getFixedDistrictCoords(
  universeCode: string,
  districtName: string,
): Coord | null {
  if (universeCode === "SEOUL_ALL") {
    return SEOUL_DISTRICT_COORDS[districtName.replace(/^서울\s+/, "")] ?? null;
  }

  if (universeCode === DEFAULT_UNIVERSE_CODE && /^서울\s+/.test(districtName)) {
    const normalizedName = districtName.replace(/^서울\s+/, "").trim();
    return SEOUL_DISTRICT_COORDS[normalizedName] ?? null;
  }

  return null;
}

const TOP_N_OPTIONS: TopNOption[] = [
  { label: "20", value: 20 },
  { label: "40", value: 40 },
  { label: "80", value: 80 },
];
const MAP_LOCAL_SEARCH_COMPLEX_LIMIT = 3;
const MAP_LOCAL_SEARCH_DISTRICT_LIMIT = 3;
const MAP_LOCAL_SEARCH_REMOTE_LIMIT = 10;
const MAP_LOCAL_SEARCH_TOTAL_COMPLEX_LIMIT = 10;
const MAP_LOCAL_SEARCH_REMOTE_MIN_QUERY_LENGTH = 2;
const MAP_LOCAL_SEARCH_REMOTE_DEBOUNCE_MS = 300;

const MAP_SEARCH_API = (query: string, universeCode: string, limit = MAP_LOCAL_SEARCH_REMOTE_LIMIT) =>
  `/api/search?q=${encodeURIComponent(query)}&universe_code=${encodeURIComponent(
    universeCode,
  )}&limit=${limit}`;

const MAP_API = (universeCode: string) =>
  `/api/map?universe_code=${encodeURIComponent(universeCode)}&aggregation=top1000&include_changes=1`;

function formatMarketCapKrw(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0원";

  const trillion = value / 1_000_000_000_000;
  if (trillion >= 1) {
    return `${trillion.toFixed(2)}조`;
  }

  const hundredMillion = Math.round(value / 100_000_000);
  return `${hundredMillion.toLocaleString()}억`;
}

function formatCompactCap(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";

  const trillion = value / 1_000_000_000_000;
  if (trillion >= 1) {
    if (trillion >= 100) return `${trillion.toFixed(0)}조`;
    if (trillion >= 10) return `${trillion.toFixed(1)}조`;
    return `${trillion.toFixed(2)}조`;
  }

  const hundredMillion = value / 100_000_000;
  return `${Math.round(hundredMillion)}억`;
}

function buildUrlWithDistrict(districtName: string) {
  const params = new URLSearchParams(window.location.search);
  const currentDistrict = params.get("district");

  params.delete("complexId");

  if (currentDistrict === districtName) {
    params.delete("district");
  } else {
    params.set("district", districtName);
  }

  const nextQuery = params.toString();
  return nextQuery
    ? `${window.location.pathname}?${nextQuery}${window.location.hash}`
    : `${window.location.pathname}${window.location.hash}`;
}

function pushDistrictToUrl(districtName: string) {
  const nextUrl = buildUrlWithDistrict(districtName);

  if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
    window.history.pushState(null, "", nextUrl);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

function getRankingItemRankLabel(item: RankingItem) {
  const rankAll =
    typeof item.rank_all === "number"
      ? item.rank_all
      : typeof item.rank === "number"
        ? item.rank
        : null;

  return rankAll !== null ? `#${rankAll}` : "현재 보드";
}

function getRankingItemLocationLabel(item: RankingItem) {
  return (
    item.locationLabel ||
    `${item.sigungu_name ?? ""} ${item.legal_dong_name ?? ""}`.trim() ||
    item.sigunguName ||
    "현재 지도"
  );
}

function getRankingItemUniverseCode(item: RankingItem, fallbackUniverseCode: string) {
  const universeItem = item as RankingItem & {
    universeCode?: string | null;
    universe_code?: string | null;
  };

  return resolveServiceUniverseCode(
    universeItem.universeCode ?? universeItem.universe_code ?? fallbackUniverseCode,
  );
}

function buildRepresentativeComplexItem(
  district: DistrictAggregate,
  fallbackUniverseCode: string,
): RankingItem | null {
  const complexId = district.primaryComplexId?.trim();
  const name = district.primaryComplexName?.trim();

  if (!complexId || !name) return null;

  const rank = district.primaryRank ?? 0;
  const marketCapKrw = district.peakComplexMarketCap ?? 0;

  return {
    complexId,
    name,
    apt_name_ko: name,
    rank,
    rank_all: rank,
    sigunguName: district.name,
    sigungu_name: district.name,
    legalDongName: "",
    legal_dong_name: "",
    marketCapKrw,
    market_cap_krw: marketCapKrw,
    marketCapTrillionKrw: marketCapKrw ? marketCapKrw / 1_000_000_000_000 : null,
    market_cap_trillion_krw: marketCapKrw
      ? marketCapKrw / 1_000_000_000_000
      : null,
    rankDelta7d: null,
    rank_delta_w: null,
    rankMovement: null,
    rank_movement: null,
    previousRankAll: null,
    previous_rank_all: null,
    recoveryRate52w: null,
    recovery_52w: null,
    locationLabel: district.name,
    universeCode: fallbackUniverseCode,
    universe_code: fallbackUniverseCode,
    universeName: null,
    universe_name: null,
  } as RankingItem;
}

function buildUrlWithComplex(item: RankingItem, fallbackUniverseCode: string) {
  const params = new URLSearchParams(window.location.search);
  const universeCode = getRankingItemUniverseCode(item, fallbackUniverseCode);

  params.delete("district");
  params.set("complexId", item.complexId);

  if (universeCode === DEFAULT_UNIVERSE_CODE) {
    params.delete("universe");
  } else {
    params.set("universe", universeCode);
  }

  const nextQuery = params.toString();
  return nextQuery
    ? `${window.location.pathname}?${nextQuery}${window.location.hash}`
    : `${window.location.pathname}${window.location.hash}`;
}

function pushComplexToUrl(item: RankingItem, fallbackUniverseCode: string) {
  if (window.location.pathname === "/map") {
    window.location.assign("/ranking?" + new URLSearchParams({ universe: getRankingItemUniverseCode(item, fallbackUniverseCode), complexId: item.complexId }));
    return;
  }
  const nextUrl = buildUrlWithComplex(item, fallbackUniverseCode);

  if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
    window.history.pushState(null, "", nextUrl);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

function normalizeMapSearchText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function includesMapSearchText(value: unknown, normalizedQuery: string) {
  if (!normalizedQuery) return false;
  return normalizeMapSearchText(value).includes(normalizedQuery);
}

async function readMapSearchItems(
  input: string,
  signal: AbortSignal,
): Promise<MapSearchResultPayload> {
  const response = await fetch(input, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  const json = (await response.json()) as MapSearchApiResponse;

  if (!response.ok || json.ok === false) {
    throw new Error(
      json.message ?? `Request failed: ${response.status} ${input}`,
    );
  }

  return {
    items: [...(json.localItems ?? []), ...(json.globalItems ?? [])],
    discoveryCandidates: json.discoveryCandidates ?? [],
    regionResolution: json.regionResolution ?? null,
    clarificationChoices: json.clarificationChoices ?? [],
    warnings: json.warnings ?? [],
  };
}

function buildFallbackAggregate(items: RankingItem[]): DistrictAggregate[] {
  const grouped = new globalThis.Map<string, DistrictAggregate>();

  items.forEach((item) => {
    const district = item.sigunguName?.trim();
    if (!district) return;

    const query =
      `${item.sigungu_name ?? ""} ${item.legal_dong_name ?? ""}`.trim() ||
      item.locationLabel ||
      "";

    const rankAll =
      typeof item.rank_all === "number"
        ? item.rank_all
        : typeof item.rank === "number"
          ? item.rank
          : null;

    const marketCap = Number(item.marketCapKrw ?? 0);

    const existing = grouped.get(district);

    if (existing) {
      existing.totalMarketCap += marketCap;
      existing.averageDelta +=
        typeof item.rankDelta7d === "number" ? item.rankDelta7d : 0;
      existing.count += 1;
      existing.boardCount = (existing.boardCount ?? 0) + 1;
      existing.isBoardBacked = true;

      if (!existing.query && query) {
        existing.query = query;
      }

      if ((existing.peakComplexMarketCap ?? 0) < marketCap) {
        existing.peakComplexMarketCap = marketCap;
        existing.peakComplexName = item.name;
      }

      if (
        rankAll !== null &&
        ((existing.primaryRank ?? null) === null ||
          rankAll < (existing.primaryRank as number))
      ) {
        existing.primaryRank = rankAll;
        existing.primaryComplexId = item.complexId;
        existing.primaryComplexName = item.name;

        if (query) {
          existing.query = query;
        }
      }

      return;
    }

    grouped.set(district, {
      name: district,
      query,
      totalMarketCap: marketCap,
      averageDelta: typeof item.rankDelta7d === "number" ? item.rankDelta7d : 0,
      count: 1,
      boardCount: 1,
      isBoardBacked: true,
      primaryComplexId: item.complexId,
      primaryComplexName: item.name,
      primaryRank: rankAll,
      peakComplexMarketCap: marketCap,
      peakComplexName: item.name,
    });
  });

  return Array.from(grouped.values()).map((group) => ({
    ...group,
    averageDelta: group.count > 0 ? group.averageDelta / group.count : 0,
  }));
}

function countMapAggregateSourceRows(items: DistrictAggregate[]) {
  return items.reduce((total, group) => total + group.count, 0);
}

function toNonNegativeSafeIntegerOrNull(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : null;
}

async function readMapItems(input: string, signal: AbortSignal) {
  const response = await fetch(input, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  const json = (await response.json()) as MapApiResponse;
  const cacheState = response.headers.get("x-koaptix-map-cache") ?? "unknown";

  if (!response.ok || json.ok === false) {
    throw new Error(
      json.message ?? `Request failed: ${response.status} ${input}`,
    );
  }

  const items = json.items ?? [];
  const renderedUniverseCode = json.renderedUniverseCode ?? json.universeCode ?? "";
  const requestedUniverseCode = json.requestedUniverseCode ?? json.universeCode ?? "";
  const parsedSourceRowLimit = toNonNegativeSafeIntegerOrNull(json.sourceRowLimit);
  const parsedSourceRowsUsed = toNonNegativeSafeIntegerOrNull(json.sourceRowsUsed);
  const hasConsistentSourceRows =
    parsedSourceRowLimit === null ||
    parsedSourceRowsUsed === null ||
    parsedSourceRowsUsed <= parsedSourceRowLimit;

  if (requestedUniverseCode && renderedUniverseCode !== requestedUniverseCode) {
    throw new Error("Map response universe identity mismatch");
  }
  if (!summarizePublishedMap({ ...json, sourceRowsUsed: parsedSourceRowsUsed ?? undefined }, requestedUniverseCode)) {
    throw new Error("Incomplete published map aggregation");
  }

  return {
    items,
    delivery: {
      snapshotDate: json.snapshot_date ?? null,
      requestedUniverseCode,
      renderedUniverseCode,
      mapScopeLabel: json.mapScopeLabel ?? getUniverseLabel(renderedUniverseCode),
      fallbackMode: json.fallbackMode ?? "none",
      cacheState: json.cacheState ?? cacheState,
      source: json.source ?? "api",
      itemCount: Number(json.count ?? items.length),
      aggregationBasis:
        json.aggregationBasis === MAP_AGGREGATION_BASIS
          ? json.aggregationBasis
          : MAP_AGGREGATION_BASIS,
      isCompleteDistrictTotal: false,
      aggregationGrain:
        json.aggregationGrain === MAP_AGGREGATION_GRAIN
          ? json.aggregationGrain
          : MAP_AGGREGATION_GRAIN,
      sourceRowLimit: hasConsistentSourceRows ? parsedSourceRowLimit : null,
      sourceRowsUsed: hasConsistentSourceRows ? parsedSourceRowsUsed : null,
    } satisfies MapDeliveryState,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getBubbleSizeRange(universeCode: string, frameWidth: number, zoom: number) {
  const safeFrameWidth =
    Number.isFinite(frameWidth) && frameWidth > 0 ? frameWidth : 900;

  if (universeCode === DEFAULT_UNIVERSE_CODE && zoom >= 12) {
    return {
      min: 44,
      max: 68,
    };
  }

  return {
    min: Math.round(clamp(safeFrameWidth * 0.025, 40, 44)),
    max: zoom >= 10 ? 50 : 64,
  };
}

function buildMapDeliveryState(
  universeCode: string,
  overrides: Partial<MapDeliveryState> = {},
): MapDeliveryState {
  const renderedUniverseCode = overrides.renderedUniverseCode ?? universeCode;

  return {
    snapshotDate: overrides.snapshotDate ?? null,
    requestedUniverseCode: overrides.requestedUniverseCode ?? universeCode,
    renderedUniverseCode,
    mapScopeLabel:
      overrides.mapScopeLabel ?? getUniverseLabel(renderedUniverseCode),
    fallbackMode: overrides.fallbackMode ?? "client-board-seed",
    cacheState: overrides.cacheState ?? "client",
    source: overrides.source ?? "home-board-seed",
    itemCount: overrides.itemCount ?? 0,
    aggregationBasis: overrides.aggregationBasis ?? "BOUNDED_PUBLISHED_RANK_SAMPLE",
    isCompleteDistrictTotal: false,
    aggregationGrain: MAP_AGGREGATION_GRAIN,
    sourceRowLimit: overrides.sourceRowLimit ?? null,
    sourceRowsUsed: overrides.sourceRowsUsed ?? null,
  };
}

function buildUnavailableMapDeliveryState(
  requestedUniverseCode: string,
): MapDeliveryState {
  return buildMapDeliveryState(requestedUniverseCode, {
    renderedUniverseCode: "",
    mapScopeLabel: "Unavailable",
    fallbackMode: "universe-unavailable",
    cacheState: "unavailable",
    source: "none",
    itemCount: 0,
    sourceRowLimit: null,
    sourceRowsUsed: 0,
  });
}

/**
 * Home tactical radar.
 */
export function NeonMap({ items, toolbar }: { items: RankingItem[]; toolbar?: ReactNode }) {
  const searchParams = useSearchParams();
  const currentDistrict = searchParams?.get("district");
  const universeResolution = resolveUniverseRequest(
    searchParams?.get("universe") ?? null,
    { capability: "map" },
  );
  const currentUniverseCode = universeResolution.requestedUniverseCode;
  const effectiveUniverseCode = universeResolution.universeUnavailable
    ? null
    : universeResolution.renderedUniverseCode;
  const universeBoundaryUnavailable =
    universeResolution.universeUnavailable || !effectiveUniverseCode;

  const [showBubbles, setShowBubbles] = useState(true);
  const [topN, setTopN] = useState<number>(() =>
    currentUniverseCode === DEFAULT_UNIVERSE_CODE ? 20 : 40,
  );

  useEffect(() => {
    setTopN(currentUniverseCode === DEFAULT_UNIVERSE_CODE ? 20 : 40);
  }, [currentUniverseCode]);

  const [rangeMinTrillion, setRangeMinTrillion] = useState(0);
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [isMapSearchOpen, setIsMapSearchOpen] = useState(false);
  const [mapSearchRemoteItems, setMapSearchRemoteItems] = useState<RankingItem[]>([]);
  const [mapSearchDiscoveryCandidates, setMapSearchDiscoveryCandidates] = useState<
    DiscoveryCandidate[]
  >([]);
  const [selectedMapDiscoveryCandidate, setSelectedMapDiscoveryCandidate] =
    useState<DiscoveryCandidate | null>(null);
  const [mapSearchRegionResolution, setMapSearchRegionResolution] =
    useState<RegionResolutionResult | null>(null);
  const [mapSearchClarificationChoices, setMapSearchClarificationChoices] =
    useState<RegionClarificationChoice[]>([]);
  const [mapSearchRegionWarnings, setMapSearchRegionWarnings] = useState<
    string[]
  >([]);
  const [mapSearchResultUniverseCode, setMapSearchResultUniverseCode] = useState<
    string | null
  >(null);
  const [isMapSearchRemotePending, setIsMapSearchRemotePending] = useState(false);
  const [mapSearchError, setMapSearchError] = useState<string | null>(null);
  const mapSearchRemoteCacheRef = useRef<Record<string, MapSearchResultPayload>>({});

  const scopedHomeItems = useMemo(() => {
    if (universeBoundaryUnavailable || !effectiveUniverseCode) return [];

    return items.filter((item) => {
      const itemUniverseCode = item.universeCode ?? item.universe_code;
      if (!itemUniverseCode) return true;

      const itemUniverseResolution = resolveUniverseRequest(itemUniverseCode, {
        capability: "map",
      });

      return (
        !itemUniverseResolution.universeUnavailable &&
        itemUniverseResolution.renderedUniverseCode === effectiveUniverseCode
      );
    });
  }, [effectiveUniverseCode, items, universeBoundaryUnavailable]);

  const fallbackMapItems = useMemo(
    () => buildFallbackAggregate(scopedHomeItems),
    [scopedHomeItems],
  );

  const fallbackMapItemsRef = useRef<DistrictAggregate[]>(fallbackMapItems);
  fallbackMapItemsRef.current = fallbackMapItems;
  const fallbackSourceRowsUsed = countMapAggregateSourceRows(fallbackMapItems);

  const [mapItems, setMapItems] = useState<DistrictAggregate[]>(
    fallbackMapItems,
  );
  const [mapItemsError, setMapItemsError] = useState<string | null>(null);
  const [mapDelivery, setMapDelivery] = useState<MapDeliveryState>(() =>
    universeBoundaryUnavailable
      ? buildUnavailableMapDeliveryState(currentUniverseCode)
      : buildMapDeliveryState(currentUniverseCode, {
          itemCount: fallbackMapItems.length,
          sourceRowsUsed: fallbackSourceRowsUsed,
        }),
  );
  const mapStateMatchesCurrentUniverse =
    !universeBoundaryUnavailable &&
    mapDelivery.requestedUniverseCode === currentUniverseCode &&
    mapDelivery.renderedUniverseCode === currentUniverseCode;

  useEffect(() => {
    const rawQuery = mapSearchQuery.trim();
    const normalizedQuery = normalizeMapSearchText(rawQuery);

    if (
      universeBoundaryUnavailable ||
      !effectiveUniverseCode ||
      !isMapSearchOpen ||
      normalizedQuery.length < MAP_LOCAL_SEARCH_REMOTE_MIN_QUERY_LENGTH
    ) {
      const resetId = window.setTimeout(() => {
        setMapSearchError(null);
        setMapSearchRemoteItems([]);
        setMapSearchDiscoveryCandidates([]);
        setSelectedMapDiscoveryCandidate(null);
        setMapSearchRegionResolution(null);
        setMapSearchClarificationChoices([]);
        setMapSearchRegionWarnings([]);
        setMapSearchResultUniverseCode(null);
        setIsMapSearchRemotePending(false);
      }, 0);

      return () => {
        window.clearTimeout(resetId);
      };
    }

    const cacheKey = `${effectiveUniverseCode}::${normalizedQuery}`;
    const cached = mapSearchRemoteCacheRef.current[cacheKey];

    if (cached) {
      const cacheId = window.setTimeout(() => {
        setMapSearchError(null);
        setMapSearchRemoteItems(cached.items);
        setMapSearchDiscoveryCandidates(cached.discoveryCandidates);
        setMapSearchRegionResolution(cached.regionResolution);
        setMapSearchClarificationChoices(cached.clarificationChoices);
        setMapSearchRegionWarnings(cached.warnings);
        setMapSearchResultUniverseCode(effectiveUniverseCode);
        setSelectedMapDiscoveryCandidate(null);
        setIsMapSearchRemotePending(false);
      }, 0);

      return () => {
        window.clearTimeout(cacheId);
      };
    }

    const controller = new AbortController();
    let cancelled = false;
    let timedOut = false;
    let timeoutId: number | undefined;

    const debounceId = window.setTimeout(async () => {
      setIsMapSearchRemotePending(true);
      setMapSearchError(null);

      timeoutId = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, MAP_LOCAL_SEARCH_REMOTE_TIMEOUT_MS);

      try {
        const remotePayload = await readMapSearchItems(
          MAP_SEARCH_API(rawQuery, effectiveUniverseCode),
          controller.signal,
        );

        if (cancelled) return;

        mapSearchRemoteCacheRef.current[cacheKey] = remotePayload;
        setMapSearchRemoteItems(remotePayload.items);
        setMapSearchDiscoveryCandidates(remotePayload.discoveryCandidates);
        setMapSearchRegionResolution(remotePayload.regionResolution);
        setMapSearchClarificationChoices(remotePayload.clarificationChoices);
        setMapSearchRegionWarnings(remotePayload.warnings);
        setMapSearchResultUniverseCode(effectiveUniverseCode);
        setSelectedMapDiscoveryCandidate(null);
      } catch (searchError) {
        if (cancelled || (!timedOut && controller.signal.aborted)) return;
        setMapSearchError(timedOut ? "검색 응답이 지연됐어요. 전체 랭킹에서도 찾아볼 수 있어요." : "검색 결과를 불러오지 못했어요. 전체 랭킹에서도 찾아볼 수 있어요.");

        console.warn("[NeonMap] map search bridge skipped", {
          currentUniverseCode: effectiveUniverseCode,
          queryLength: rawQuery.length,
          timedOut,
          message:
            searchError instanceof Error
              ? searchError.message
              : "search_bridge_unavailable",
        });
        setMapSearchRemoteItems([]);
        setMapSearchDiscoveryCandidates([]);
        setSelectedMapDiscoveryCandidate(null);
        setMapSearchRegionResolution(null);
        setMapSearchClarificationChoices([]);
        setMapSearchRegionWarnings([]);
        setMapSearchResultUniverseCode(null);
      } finally {
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        if (!cancelled) {
          setIsMapSearchRemotePending(false);
        }
      }
    }, MAP_LOCAL_SEARCH_REMOTE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(debounceId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [
    effectiveUniverseCode,
    isMapSearchOpen,
    mapSearchQuery,
    universeBoundaryUnavailable,
  ]);

  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY as string,
    libraries: ["services"],
    retries: 0,
  });

  const [mapView, setMapView] = useState<{
    center: Coord;
    level: number;
  }>({
    center: DEFAULT_KOREA_CENTER,
    level: 13,
  });
  const [mapInstance, setMapInstance] = useState<kakao.maps.Map | null>(null);
  const [mapZoom, setMapZoom] = useState(13);
  const [mapBounds, setMapBounds] = useState<{ south: number; north: number; west: number; east: number } | null>(null);
  const mapTouched = useRef(false);
  const mapFrameRef = useRef<HTMLDivElement | null>(null);
  const [mapFrameWidth, setMapFrameWidth] = useState(900);
  const [mapFrameHeight, setMapFrameHeight] = useState(620);

  useEffect(() => {
    const node = mapFrameRef.current;
    if (!node || !mapInstance) return;

    const updateFrameWidth = () => {
      const width = node.getBoundingClientRect().width;
      if (Number.isFinite(width) && width > 0) {
        setMapFrameWidth(Math.round(width));
        setMapFrameHeight(Math.round(node.getBoundingClientRect().height));
      }
      const center = mapInstance.getCenter();
      mapInstance.relayout();
      if (currentUniverseCode === DEFAULT_UNIVERSE_CODE && !currentDistrict && !mapTouched.current) {
        mapInstance.setBounds(new kakao.maps.LatLngBounds(new kakao.maps.LatLng(33.0, 125.7), new kakao.maps.LatLng(38.7, 130.0)), 24, 24, 24, 24);
      } else mapInstance.setCenter(center);
    };

    updateFrameWidth();

    const resizeObserver = new ResizeObserver(updateFrameWidth);
    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
    };
  }, [mapInstance, currentUniverseCode, currentDistrict]);

  // 🚨 지차장 지시 A: 고유 좌표 키 생성을 위한 헬퍼 추가
  // Universe-scoped coord cache: never reuse geocoded coordinates across
  // universe transitions, because region labels can repeat with different map
  // identity.
  const resolvedCoordStorageKey = useMemo(
    () => `koaptix:neon-map:coords:v2:${currentUniverseCode}`,
    [currentUniverseCode],
  );

  function getCoordCacheKey(
    universeCode: string,
    group: Pick<DistrictAggregate, "name" | "query">,
  ) {
    const base = (group.query || group.name || "").trim();
    return `${universeCode}::${base}`;
  }

  const [resolvedCoords, setResolvedCoords] = useState<Record<string, Coord>>(
    {},
  );
  const resolvedCoordsRef = useRef<Record<string, Coord>>({});
  resolvedCoordsRef.current = resolvedCoords;

  // 🚨 지차장 지시 B: sessionStorage 복원 로직 교체 (정밀한 리셋 및 복구)
  useEffect(() => {
    setResolvedCoords({});

    try {
      const raw = window.sessionStorage.getItem(resolvedCoordStorageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Record<string, Coord>;
      if (!parsed || typeof parsed !== "object") return;

      setResolvedCoords(parsed);
    } catch {
      setResolvedCoords({});
    }
  }, [resolvedCoordStorageKey]);

  useEffect(() => {
    if (Object.keys(resolvedCoords).length === 0) return;

    try {
      window.sessionStorage.setItem(
        resolvedCoordStorageKey,
        JSON.stringify(resolvedCoords),
      );
    } catch {
      // no-op
    }
  }, [resolvedCoords, resolvedCoordStorageKey]);

  useEffect(() => {
    const resetId = window.setTimeout(() => {
      if (universeBoundaryUnavailable) {
        setMapItems([]);
        setMapItemsError(null);
        setMapDelivery(buildUnavailableMapDeliveryState(currentUniverseCode));
        return;
      }

      setMapItems(fallbackMapItemsRef.current);
      setMapItemsError(null);
      setMapDelivery(
        buildMapDeliveryState(currentUniverseCode, {
          itemCount: fallbackMapItemsRef.current.length,
          sourceRowsUsed: countMapAggregateSourceRows(
            fallbackMapItemsRef.current,
          ),
        }),
      );
    }, 0);

    return () => {
      window.clearTimeout(resetId);
    };
  }, [currentUniverseCode, universeBoundaryUnavailable]);

  useEffect(() => {
    if (universeBoundaryUnavailable || !effectiveUniverseCode) return;

    const controller = new AbortController();
    let cancelled = false;
    let timedOut = false;

    const mapFetchTimeoutMs =
      effectiveUniverseCode === DEFAULT_UNIVERSE_CODE
        ? KOREA_ALL_MAP_FETCH_TIMEOUT_MS
        : REGIONAL_MAP_FETCH_TIMEOUT_MS;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, mapFetchTimeoutMs);

    const loadMapItems = async () => {
      setMapItemsError(null);

      try {
        const result = await readMapItems(
          MAP_API(effectiveUniverseCode),
          controller.signal,
        );

        if (cancelled) return;
        setMapItems(result.items);
        setMapDelivery(result.delivery);
      } catch {
        // Unmount abort: return silently, board-seed fallback already rendered.
        if (cancelled || (!timedOut && controller.signal.aborted)) return;

        const message = timedOut
          ? "지도 자료 조회가 지연되고 있어요. 새로고침해 주세요."
          : "지도 자료를 불러오지 못했어요. 새로고침해 주세요.";

        console.warn("[NeonMap] map fetch warn", {
          currentUniverseCode: effectiveUniverseCode,
          message,
        });

        setMapItems(fallbackMapItemsRef.current);
        setMapDelivery(
          buildMapDeliveryState(currentUniverseCode, {
            fallbackMode: timedOut ? "client-timeout-fallback" : "client-board-fallback",
            cacheState: "client",
            source: "home-board-seed",
            itemCount: fallbackMapItemsRef.current.length,
            sourceRowsUsed: countMapAggregateSourceRows(fallbackMapItemsRef.current),
          }),
        );

        setMapItemsError(message);
      } finally {
        clearTimeout(timeoutId);
      }
    };

    void loadMapItems();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    currentUniverseCode,
    effectiveUniverseCode,
    universeBoundaryUnavailable,
  ]);

  useEffect(() => {
    if (
      loading ||
      error ||
      !mapStateMatchesCurrentUniverse
    ) {
      return;
    }

    const kakao = (window as any).kakao;
    if (!kakao?.maps?.services) return;

    const geocoder = new kakao.maps.services.Geocoder();
    let cancelled = false;

    // 🚨 지차장 지시 C: geocoder 필터 시 고유 coordKey 사용
    // Filter unresolved geocoding work by the universe-scoped coord key.
    const unresolved = mapItems
      .filter((group) => {
        if (!group.query) return false;
        if (getFixedDistrictCoords(currentUniverseCode, group.name)) return false;

        const coordKey = getCoordCacheKey(currentUniverseCode, group);
        if (resolvedCoordsRef.current[coordKey]) return false;

        return true;
      });

    if (unresolved.length === 0) return;

    const geocodeOne = async (group: DistrictAggregate) => {
      const tryQueries = getMapGeocodeQueries(group);

      for (const query of tryQueries) {
        const coord = await new Promise<Coord | null>((resolve) => {
          geocoder.addressSearch(query, (result: any[], status: string) => {
            if (status === kakao.maps.services.Status.OK && result?.[0]) {
              resolve({
                lat: Number(result[0].y),
                lng: Number(result[0].x),
              });
              return;
            }
            resolve(null);
          });
        });

        if (!coord) continue;
        if (cancelled) return;

        // 🚨 지차장 지시 D: geocoder 결과 저장 시 고유 coordKey 사용
        // Store geocoder results under the universe-scoped coord key.
        setResolvedCoords((prev) => {
          const coordKey = getCoordCacheKey(currentUniverseCode, group);
          if (prev[coordKey]) return prev;

          return {
            ...prev,
            [coordKey]: coord,
          };
        });

        return;
      }
    };

    // Finish the complete published set with at most four requests in flight.
    let cursor = 0;
    const worker = async () => {
      while (!cancelled && cursor < unresolved.length) await geocodeOne(unresolved[cursor++]);
    };
    void Promise.all(Array.from({ length: Math.min(4, unresolved.length) }, worker));

    return () => {
      cancelled = true;
    };
  }, [
    currentUniverseCode,
    error,
    loading,
    mapItems,
    mapStateMatchesCurrentUniverse,
  ]);

  // 🚨 지차장 지시 E: baseMapData에서 좌표를 읽을 때 고유 coordKey 사용
  // Read coordinates through the same universe-scoped key when rendering.
  const baseMapData = useMemo(() => {
    if (!mapStateMatchesCurrentUniverse) {
      return [];
    }

    return mapItems
      .map((group) => {
        const coordKey = getCoordCacheKey(currentUniverseCode, group);

        const coords =
          getFixedDistrictCoords(currentUniverseCode, group.name) ??
          resolvedCoords[coordKey] ??
          null;

        if (!coords) return null;

        return {
          ...group,
          coords,
        };
      })
      .filter(
        (value): value is Omit<ResolvedMapItem, "visualRank" | "bubbleSize"> =>
          value !== null,
      );
  }, [
    currentUniverseCode,
    mapItems,
    mapStateMatchesCurrentUniverse,
    resolvedCoords,
  ]);

  const universeAnchorCenter = useMemo(() => {
    if (baseMapData.length === 0) return DEFAULT_KOREA_CENTER;

    const sum = baseMapData.reduce(
      (acc, item) => {
        acc.lat += item.coords.lat;
        acc.lng += item.coords.lng;
        return acc;
      },
      { lat: 0, lng: 0 },
    );

    return {
      lat: sum.lat / baseMapData.length,
      lng: sum.lng / baseMapData.length,
    };
  }, [baseMapData]);

  const selectedDistrictDataFromAll = useMemo(() => {
    if (!currentDistrict) return null;
    return baseMapData.find((data) => data.name === currentDistrict) ?? null;
  }, [baseMapData, currentDistrict]);
  const districtRankingHref = currentDistrict ? getDistrictRankingHref(currentDistrict, currentUniverseCode) : null;

  useEffect(() => {
    if (selectedDistrictDataFromAll) {
      setMapView({
        center: selectedDistrictDataFromAll.coords,
        level: 7,
      });
      return;
    }

    if (currentUniverseCode === DEFAULT_UNIVERSE_CODE || mapTouched.current) return;
    setMapView({
      center: currentUniverseCode === DEFAULT_UNIVERSE_CODE ? DEFAULT_KOREA_CENTER : universeAnchorCenter,
      level: currentUniverseCode === DEFAULT_UNIVERSE_CODE ? 13 : currentUniverseCode.startsWith("SGG_") ? 7 : /GYEONG|GANGWON|CHUNG|JEON/.test(currentUniverseCode) ? 10 : 8,
    });
  }, [
    currentUniverseCode,
    currentDistrict,
    selectedDistrictDataFromAll,
    universeAnchorCenter,
  ]);

  const nationalView = currentUniverseCode === DEFAULT_UNIVERSE_CODE && mapZoom >= 12;
  const displayGroups = useMemo(() => {
    if (!nationalView) return baseMapData;
    return groupMapProvinces(mapItems).flatMap(group => {
      const names = new Set(group.members.map(row => row.name));
      const located = baseMapData.filter(row => names.has(row.name));
      if (!located.length) return [];
      return [{ ...group, coords: {
        lat: located.reduce((sum, row) => sum + row.coords.lat, 0) / located.length,
        lng: located.reduce((sum, row) => sum + row.coords.lng, 0) / located.length,
      }}];
    });
  }, [nationalView, mapItems, baseMapData]);
  const filteredMapData = useMemo(() => displayGroups
    .filter(row => row.totalMarketCap >= rangeMinTrillion * 1e12)
    .filter(row => nationalView || !mapBounds || (row.coords.lat >= mapBounds.south && row.coords.lat <= mapBounds.north && row.coords.lng >= mapBounds.west && row.coords.lng <= mapBounds.east))
    .sort((a, b) => b.totalMarketCap - a.totalMarketCap).slice(0, nationalView ? 17 : topN),
    [displayGroups, rangeMinTrillion, nationalView, mapBounds, topN]);

  const visualizedMapData = useMemo<ResolvedMapItem[]>(() => {
    if (filteredMapData.length === 0) return [];

    const sortedDesc = [...filteredMapData].sort(
      (a, b) => b.totalMarketCap - a.totalMarketCap,
    );

    const values = sortedDesc.map((item) =>
      Math.log1p(Math.max(item.totalMarketCap, 0)),
    );
    const min = Math.min(...values);
    const max = Math.max(...values);
    const bubbleRange = getBubbleSizeRange(currentUniverseCode, mapFrameWidth, mapZoom);

    return sortedDesc.map((item, index) => {
      const displayValue = Math.log1p(Math.max(item.totalMarketCap, 0));
      const normalized =
        max === min ? 1 : (displayValue - min) / (max - min);

      const size =
        bubbleRange.min +
        Math.pow(normalized, currentUniverseCode === DEFAULT_UNIVERSE_CODE ? 0.86 : 0.64) *
          (bubbleRange.max - bubbleRange.min);

      return {
        ...item,
        visualRank: index + 1,
        bubbleSize: Math.round(size),
      };
    });
  }, [filteredMapData, currentUniverseCode, mapFrameWidth, mapZoom]);

  const renderOrderMapData = useMemo(() => {
    return [...visualizedMapData].sort(
      (a, b) => b.totalMarketCap - a.totalMarketCap,
    );
  }, [visualizedMapData]);
  const labelOffsets = useMemo(() => {
    if (!nationalView || !mapInstance || !mapBounds) return new globalThis.Map<string, { x: number; y: number }>();
    const projection = mapInstance.getProjection();
    return spreadMapLabels(visualizedMapData.map(row => {
      const point = projection.containerPointFromCoords(new kakao.maps.LatLng(row.coords.lat, row.coords.lng));
      return { key: row.name, x: point.x, y: point.y, size: row.bubbleSize };
    }), mapFrameWidth, mapFrameHeight);
  }, [nationalView, mapInstance, visualizedMapData, mapBounds, mapFrameWidth, mapFrameHeight]);

  const hasCurrentMapSearchResultScope =
    effectiveUniverseCode !== null &&
    mapSearchResultUniverseCode === effectiveUniverseCode;
  const currentMapSearchRegionResolution = hasCurrentMapSearchResultScope
    ? mapSearchRegionResolution
    : null;
  const currentMapSearchClarificationChoices = hasCurrentMapSearchResultScope
    ? mapSearchClarificationChoices
    : [];
  const currentMapSearchRegionWarnings = hasCurrentMapSearchResultScope
    ? mapSearchRegionWarnings
    : [];
  const hasMapSearchRegionBlock =
    currentMapSearchRegionResolution?.state === "AMBIGUOUS" ||
    currentMapSearchRegionResolution?.state === "UNIVERSE_CONFLICT";
  const shouldSuppressMapSearchSuggestions =
    universeBoundaryUnavailable ||
    !mapStateMatchesCurrentUniverse ||
    hasMapSearchRegionBlock ||
    isMapSearchRemotePending;

  const mapSearchSuggestions = useMemo(() => {
    const normalizedQuery = normalizeMapSearchText(mapSearchQuery);

    if (!normalizedQuery || shouldSuppressMapSearchSuggestions) {
      return {
        complexes: [] as MapLocalSearchSuggestion[],
        districts: [] as MapLocalSearchSuggestion[],
        discoveryCandidates: [] as DiscoveryCandidate[],
      };
    }

    const currentMapSearchRemoteItems = hasCurrentMapSearchResultScope
      ? mapSearchRemoteItems
      : [];
    const currentMapSearchDiscoveryCandidates = hasCurrentMapSearchResultScope
      ? mapSearchDiscoveryCandidates
      : [];
    const seenComplexIds = new Set<string>();
    const itemComplexes = scopedHomeItems
      .filter((item) => {
        if (!item.complexId || seenComplexIds.has(item.complexId)) return false;

        const matched =
          includesMapSearchText(item.complexId, normalizedQuery) ||
          includesMapSearchText(item.name, normalizedQuery) ||
          includesMapSearchText(item.locationLabel, normalizedQuery) ||
          includesMapSearchText(item.sigunguName, normalizedQuery) ||
          includesMapSearchText(item.sigungu_name, normalizedQuery) ||
          includesMapSearchText(item.legal_dong_name, normalizedQuery);

        if (matched) {
          seenComplexIds.add(item.complexId);
        }

        return matched;
      })
      .slice(0, MAP_LOCAL_SEARCH_COMPLEX_LIMIT)
      .map<MapLocalSearchSuggestion>((item) => ({
        kind: "complex",
        key: `complex-${item.complexId}`,
        label: item.name,
        meta: [getRankingItemLocationLabel(item), getRankingItemRankLabel(item)]
          .filter(Boolean)
          .join(" · "),
        source: "local",
        item,
      }));

    const mapRepresentativeComplexes = mapItems
      .filter((district) => {
        const isActionable =
          district.isBoardBacked === true || (district.boardCount ?? 0) > 0;
        if (!isActionable || !district.primaryComplexId || !district.primaryComplexName) {
          return false;
        }

        if (seenComplexIds.has(district.primaryComplexId)) return false;

        const matched =
          includesMapSearchText(district.primaryComplexName, normalizedQuery) ||
          includesMapSearchText(district.name, normalizedQuery) ||
          includesMapSearchText(district.query, normalizedQuery);

        if (matched) {
          seenComplexIds.add(district.primaryComplexId);
        }

        return matched;
      })
      .slice(0, Math.max(MAP_LOCAL_SEARCH_COMPLEX_LIMIT - itemComplexes.length, 0))
      .map<MapLocalSearchSuggestion | null>((district) => {
        const item = buildRepresentativeComplexItem(district, currentUniverseCode);
        if (!item) return null;

        return {
          kind: "complex",
          key: `map-primary-complex-${item.complexId}`,
          label: item.name,
          meta: [
            district.name,
            "지도 관측 대표 단지",
            district.primaryRank ? `#${district.primaryRank}` : "현재 지도 데이터 기준",
          ]
            .filter(Boolean)
            .join(" · "),
          source: "local",
          item,
        };
      })
      .filter((suggestion): suggestion is MapLocalSearchSuggestion => suggestion !== null);

    const localComplexes = [...itemComplexes, ...mapRepresentativeComplexes];
    const remoteComplexes = currentMapSearchRemoteItems
      .filter((item) => {
        const complexId = String(item.complexId ?? "").trim();
        if (!complexId || seenComplexIds.has(complexId)) return false;

        seenComplexIds.add(complexId);
        return true;
      })
      .slice(0, Math.max(MAP_LOCAL_SEARCH_TOTAL_COMPLEX_LIMIT - localComplexes.length, 0))
      .map<MapLocalSearchSuggestion>((item) => {
        const universeCode = getRankingItemUniverseCode(item, currentUniverseCode);

        return {
          kind: "complex",
          key: `remote-complex-${universeCode}-${item.complexId}`,
          label: item.name,
          meta: [
            getRankingItemLocationLabel(item),
            getRankingItemRankLabel(item),
            universeCode !== DEFAULT_UNIVERSE_CODE ? getUniverseLabel(universeCode) : "TOP1000",
          ]
            .filter(Boolean)
            .join(" · "),
          source: "remote",
          item,
        };
      });

    const complexes = [...localComplexes, ...remoteComplexes];

    const districts = mapItems
      .filter((district) => {
        const isActionable =
          district.isBoardBacked === true || (district.boardCount ?? 0) > 0;
        if (!isActionable) return false;

        return (
          includesMapSearchText(district.name, normalizedQuery) ||
          includesMapSearchText(district.query, normalizedQuery) ||
          includesMapSearchText(district.primaryComplexName, normalizedQuery) ||
          includesMapSearchText(district.peakComplexName, normalizedQuery)
        );
      })
      .slice(0, MAP_LOCAL_SEARCH_DISTRICT_LIMIT)
      .map<MapLocalSearchSuggestion>((district) => ({
        kind: "district",
        key: `district-${district.name}`,
        label: district.name,
        meta: `집계 표본 ${district.count}행 · 표시 시총 ${formatCompactCap(
          district.totalMarketCap,
        )}`,
        district,
      }));

    const discoveryCandidates = currentMapSearchDiscoveryCandidates
      .filter((candidate) => {
        if (candidate.discoveryStatus !== "OBSERVATION_READY") return false;

        const complexId = String(candidate.complexId ?? "").trim();
        if (!complexId || seenComplexIds.has(complexId)) return false;

        return true;
      })
      .slice(0, 5);

    return {
      complexes,
      districts,
      discoveryCandidates,
    };
  }, [
    scopedHomeItems,
    hasCurrentMapSearchResultScope,
    mapItems,
    mapSearchQuery,
    mapSearchRemoteItems,
    mapSearchDiscoveryCandidates,
    currentUniverseCode,
    shouldSuppressMapSearchSuggestions,
  ]);

  const hasMapSearchQuery = mapSearchQuery.trim().length > 0;
  const hasMapSearchSuggestions =
    mapSearchSuggestions.complexes.length > 0 ||
    mapSearchSuggestions.districts.length > 0 ||
    mapSearchSuggestions.discoveryCandidates.length > 0;
  const firstMapSearchSuggestion =
    mapSearchSuggestions.complexes[0] ?? mapSearchSuggestions.districts[0] ?? null;

  const handleDistrictClick = useCallback((data: ResolvedMapItem) => {
    if (data.members?.length && mapInstance) {
      const names = new Set(data.members.map(row => row.name));
      const members = baseMapData.filter(row => names.has(row.name));
      const bounds = new kakao.maps.LatLngBounds();
      for (const row of members) bounds.extend(new kakao.maps.LatLng(row.coords.lat, row.coords.lng));
      mapTouched.current = true;
      mapInstance.setBounds(bounds, 64, 64, 64, 64);
      if (mapInstance.getLevel() > 11) mapInstance.setLevel(11);
      return;
    }
    if (!data.primaryComplexId || !data.primaryRank) {
      return;
    }

    pushDistrictToUrl(data.name);
  }, [mapInstance, baseMapData]);

  const handleMapSearchSelect = useCallback(
    (suggestion: MapLocalSearchSuggestion) => {
      if (suggestion.kind === "complex") {
        pushComplexToUrl(suggestion.item, currentUniverseCode);
      } else {
        pushDistrictToUrl(suggestion.district.name);
      }

      setMapSearchQuery(suggestion.label);
      setIsMapSearchOpen(false);
    },
    [currentUniverseCode],
  );

  const handleMapDiscoverySelect = useCallback((candidate: DiscoveryCandidate) => {
    setSelectedMapDiscoveryCandidate(candidate);
  }, []);

  const handleMapClarificationSelect = useCallback(
    (choice: RegionClarificationChoice) => {
      if (choice.compatibility === "INCOMPATIBLE") return;
      setMapSearchQuery(choice.replacementQuery);
    },
    [],
  );

  const renderMapRegionResolutionNotice = () => {
    if (!hasMapSearchRegionBlock && currentMapSearchRegionWarnings.length === 0) {
      return null;
    }

    return (
      <div
        data-testid="neon-map-region-resolution"
        className="mb-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-3 text-[12px] text-amber-100"
      >
        <p className="font-semibold">
          {currentMapSearchRegionResolution?.state === "UNIVERSE_CONFLICT"
            ? "입력한 지역이 현재 지도 범위와 다릅니다."
            : currentMapSearchRegionResolution?.state === "AMBIGUOUS"
              ? "표시할 지역을 구체적으로 선택해 주세요."
              : "지역 해석 없이 기존 검색을 사용합니다."}
        </p>
        {currentMapSearchClarificationChoices.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {currentMapSearchClarificationChoices.map((choice) => (
              <button
                key={choice.canonicalRegionCode}
                type="button"
                disabled={choice.compatibility === "INCOMPATIBLE"}
                aria-label={`${choice.qualifiedNameKo} 지역으로 지도 검색어 구체화`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleMapClarificationSelect(choice)}
                className="rounded-lg border border-amber-300/30 px-2 py-1 text-left text-[13px] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {choice.qualifiedNameKo}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderMapDiscoveryCandidatesSection = () => {
    if (mapSearchSuggestions.discoveryCandidates.length === 0) return null;

    return (
      <div>
        <p className="px-2 pb-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-200/80">
          랭킹 산정 전 후보
        </p>
        <div className="space-y-1">
          {mapSearchSuggestions.discoveryCandidates.map((candidate) => {
            const isSelected =
              selectedMapDiscoveryCandidate?.discoveryId === candidate.discoveryId;

            return (
              <button
                key={candidate.discoveryId}
                type="button"
                data-testid="neon-map-local-search-discovery-candidate"
                data-complex-id={candidate.complexId}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleMapDiscoverySelect(candidate)}
                className={`w-full min-w-0 rounded-xl border px-2.5 py-2 text-left transition focus:outline-none ${
                  isSelected
                    ? "border-amber-300/60 bg-amber-500/15"
                    : "border-amber-400/25 bg-amber-500/10 hover:border-amber-300/50 hover:bg-amber-500/15 focus:border-amber-300/50 focus:bg-amber-500/15"
                }`}
              >
                <span className="flex min-w-0 items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="mb-1 inline-flex rounded-full border border-amber-300/40 px-2 py-0.5 text-xs font-semibold text-amber-200">
                      관측 준비중
                    </span>
                    <span className="block truncate font-semibold text-slate-100">
                      {candidate.displayName}
                    </span>
                    <span className="block truncate text-[13px] text-slate-400">
                      {candidate.regionLabel}
                    </span>
                  </span>
                </span>
                <span className="mt-2 block text-[13px] leading-relaxed text-amber-100/80">
                  {candidate.copy.message}
                </span>
                {isSelected && (
                  <span className="mt-2 block rounded-lg border border-amber-300/20 bg-black/20 px-2 py-2 text-[13px] leading-relaxed text-slate-300">
                    {candidate.copy.helperText}
                    <span className="mt-1 block text-slate-400">
                      랭킹 상세는 아직 열리지 않습니다.
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const handleMapSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        setIsMapSearchOpen(false);
        return;
      }

      if (event.key === "Enter" && firstMapSearchSuggestion) {
        event.preventDefault();
        handleMapSearchSelect(firstMapSearchSuggestion);
      }
    },
    [firstMapSearchSuggestion, handleMapSearchSelect],
  );

  const displayMapDelivery = mapStateMatchesCurrentUniverse
    ? mapDelivery
    : universeBoundaryUnavailable
      ? buildUnavailableMapDeliveryState(currentUniverseCode)
      : buildMapDeliveryState(currentUniverseCode, {
          fallbackMode: "client-scope-transition",
          cacheState: "client",
          source: "none",
          itemCount: 0,
          sourceRowsUsed: 0,
        });
  const mapScopeLabel =
    displayMapDelivery.mapScopeLabel ||
    getUniverseLabel(displayMapDelivery.renderedUniverseCode);
  const requestedUniverseLabel =
    universeResolution.registryItem?.label ?? currentUniverseCode;
  const renderedUniverseLabel =
    mapScopeLabel || displayMapDelivery.renderedUniverseCode || currentUniverseCode;
  const sampledAggregationLabel =
    displayMapDelivery.sourceRowsUsed !== null &&
    displayMapDelivery.sourceRowLimit !== null
      ? `공개 랭킹 표본 ${displayMapDelivery.sourceRowsUsed}행(조회 상한 ${displayMapDelivery.sourceRowLimit}행)`
      : displayMapDelivery.sourceRowsUsed !== null
        ? `공개 랭킹 표본 ${displayMapDelivery.sourceRowsUsed}행`
        : displayMapDelivery.sourceRowLimit !== null
          ? `조회 상한 ${displayMapDelivery.sourceRowLimit}행의 공개 랭킹 표본`
          : "제한된 공개 랭킹 표본";

  if (universeBoundaryUnavailable) {
    const boundaryMessage =
      universeResolution.reason === "invalid_or_unknown_universe"
        ? `요청한 universe 식별자가 유효하지 않습니다: ${currentUniverseCode}`
        : `요청한 universe는 현재 지도에서 사용할 수 없습니다: ${requestedUniverseLabel}`;

    return (
      <section
        className="flex h-full min-h-[360px] flex-col overflow-hidden rounded-2xl border border-slate-700/50 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_40px_rgba(0,0,0,0.4)]"
        data-testid="neon-map"
        data-universe-code={currentUniverseCode}
        data-requested-universe-code={currentUniverseCode}
        data-rendered-universe-code=""
        data-universe-resolution-status={
          universeResolution.universeResolutionStatus
        }
        data-universe-unavailable="true"
        data-map-scope="Unavailable"
        data-map-fallback-mode="universe-unavailable"
        data-map-cache-state="unavailable"
        data-map-source="none"
        data-map-item-count="0"
        data-map-aggregation-basis={MAP_AGGREGATION_BASIS}
        data-map-is-complete-district-total="false"
        data-map-aggregation-grain={MAP_AGGREGATION_GRAIN}
        data-map-source-row-limit="unknown"
        data-map-source-rows-used="0"
      >
        <div className="shrink-0 border-b border-slate-800/80 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
          <p className="text-[13px] uppercase tracking-[0.24em] text-slate-400">
            KAKAO NEON MAP
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-100">
            지역별 시가총액 네온맵
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-2 text-[13px] sm:grid-cols-2 lg:max-w-xl">
            <div
              className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2"
              data-testid="neon-map-requested-universe"
              data-universe-code={currentUniverseCode}
            >
              <span className="block uppercase tracking-[0.16em] text-slate-400">
                Requested
              </span>
              <span className="mt-1 block truncate font-semibold text-slate-300">
                {requestedUniverseLabel}
              </span>
            </div>
            <div
              className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2"
              data-testid="neon-map-rendered-universe"
              data-universe-code=""
            >
              <span className="block uppercase tracking-[0.16em] text-slate-400">
                Map scope
              </span>
              <span className="mt-1 block truncate font-semibold text-slate-300">
                Unavailable
              </span>
            </div>
          </div>
        </div>
        <div className="flex min-h-[220px] flex-1 items-center justify-center bg-[#0b1118] px-5 py-8 text-center">
          <div
            data-testid="neon-map-universe-unavailable"
            className="max-w-md rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-4 text-sm leading-relaxed text-amber-100"
          >
            <p>{boundaryMessage}</p>
            <p className="mt-2 text-amber-100/70">
              다른 universe의 지도·검색·홈 표본으로 대체하지 않았습니다.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="flex h-full min-h-[360px] flex-col overflow-hidden rounded-2xl border border-slate-700/50 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_40px_rgba(0,0,0,0.4)]"
        data-testid="neon-map"
        data-universe-code={currentUniverseCode}
        data-requested-universe-code={displayMapDelivery.requestedUniverseCode}
        data-rendered-universe-code={displayMapDelivery.renderedUniverseCode}
        data-map-scope={mapScopeLabel}
        data-map-fallback-mode="loader-error"
        data-map-cache-state="client"
        data-map-source={displayMapDelivery.source}
        data-map-item-count={displayMapDelivery.itemCount}
        data-map-aggregation-basis={displayMapDelivery.aggregationBasis}
        data-map-is-complete-district-total={String(
          displayMapDelivery.isCompleteDistrictTotal,
        )}
        data-map-aggregation-grain={displayMapDelivery.aggregationGrain}
        data-map-source-row-limit={displayMapDelivery.sourceRowLimit ?? "unknown"}
        data-map-source-rows-used={displayMapDelivery.sourceRowsUsed ?? "unknown"}
      >
        <div className="shrink-0 flex flex-col gap-4 border-b border-slate-800/80 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
          <div>
            <p className="mt-2 text-[13px] text-slate-400">
              지도 제공자가 잠시 응답하지 않아도 검색은 현재 관측 데이터 기준으로 계속 사용할 수 있어요.
            </p>

            <div
              className="relative z-40 mt-4 w-full"
              data-testid="neon-map-local-search"
            >
              <label
                htmlFor="neon-map-local-search-input"
                className="sr-only"
              >
                지도 검색
              </label>
              <div className="flex min-h-16 w-full min-w-0 items-center gap-3 rounded-2xl border border-cyan-400/35 bg-slate-950/90 px-4 py-3 text-sm shadow-[0_16px_42px_rgba(0,0,0,0.34)] ring-1 ring-cyan-400/10">
                <span className="shrink-0 rounded-full border border-cyan-400/35 bg-cyan-400/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">
                  Map
                </span>
                <input
                  id="neon-map-local-search-input"
                  data-testid="neon-map-local-search-input"
                  type="search"
                  value={mapSearchQuery}
                  onChange={(event) => {
                    setMapSearchQuery(event.target.value);
                    setMapSearchError(null);
                    setIsMapSearchRemotePending(event.target.value.trim().length >= 2);
                    setIsMapSearchOpen(true);
                  }}
                  onFocus={() => setIsMapSearchOpen(true)}
                  onBlur={() => {
                    window.setTimeout(() => setIsMapSearchOpen(false), 120);
                  }}
                  onKeyDown={handleMapSearchKeyDown}
                  placeholder="단지·지역 검색"
                  className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-slate-100 outline-none placeholder:text-slate-400 sm:text-base"
                />
                {mapSearchQuery && (
                  <button
                    type="button"
                    data-testid="neon-map-local-search-clear"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setMapSearchQuery("");
                      setIsMapSearchOpen(true);
                    }}
                    className="shrink-0 rounded-full border border-slate-700 bg-slate-900/85 px-3 py-2 text-[13px] font-semibold text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-200"
                  >
                    지우기
                  </button>
                )}
              </div>

              {isMapSearchOpen && hasMapSearchQuery && (
                <div
                  id="neon-map-local-search-suggestions"
                  data-testid="neon-map-local-search-suggestions"
                  className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-700/80 bg-[#101720] p-2 text-sm shadow-2xl"
                >
                  {renderMapRegionResolutionNotice()}
                  {hasMapSearchSuggestions ? (
                    <div className="space-y-2">
                      {mapSearchSuggestions.complexes.length > 0 && (
                        <div>
                          <p className="px-2 pb-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                            단지
                          </p>
                          <div className="space-y-1">
                            {mapSearchSuggestions.complexes.map((suggestion) => (
                              <button
                                key={suggestion.key}
                                type="button"
                                data-testid="neon-map-local-search-complex-result"
                                data-search-source={suggestion.source}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => handleMapSearchSelect(suggestion)}
                                className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-cyan-400/10 focus:bg-cyan-400/10 focus:outline-none"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate font-semibold text-slate-100">
                                    {suggestion.label}
                                  </span>
                                  <span className="block truncate text-[13px] text-slate-400">
                                    {suggestion.meta}
                                  </span>
                                </span>
                                <span className="shrink-0 rounded-full bg-cyan-400/10 px-2 py-0.5 text-xs font-semibold text-cyan-200">
                                  보기
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {mapSearchSuggestions.districts.length > 0 && (
                        <div>
                          <p className="px-2 pb-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                            지역
                          </p>
                          <div className="space-y-1">
                            {mapSearchSuggestions.districts.map((suggestion) => (
                              <button
                                key={suggestion.key}
                                type="button"
                                data-testid="neon-map-local-search-district-result"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => handleMapSearchSelect(suggestion)}
                                className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-cyan-400/10 focus:bg-cyan-400/10 focus:outline-none"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate font-semibold text-slate-100">
                                    {suggestion.label}
                                  </span>
                                  <span className="block truncate text-[13px] text-slate-400">
                                    {suggestion.meta}
                                  </span>
                                </span>
                                <span className="shrink-0 rounded-full bg-slate-700/60 px-2 py-0.5 text-xs font-semibold text-slate-200">
                                  지도
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {renderMapDiscoveryCandidatesSection()}
                    </div>
                  ) : (
                    isMapSearchRemotePending ? <SearchProgress label="공개 단지와 지역을 찾고 있어요" /> : mapSearchError ? <div role="alert" className="p-3 text-sm text-slate-300"><p>{mapSearchError}</p><Link className="ko-text-link" href={"/ranking?" + new URLSearchParams({ universe: currentUniverseCode, q: mapSearchQuery.trim() })}>전체 랭킹에서 검색 ↗</Link></div> : <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-3 text-sm leading-relaxed text-slate-400">검색 결과가 없어요. 단지 이름을 줄이거나 지역 이름도 함께 입력해 보세요.</div>
                  )}



                  <p className="mt-2 border-t border-slate-800 px-2 pt-2 text-xs leading-relaxed text-slate-400">
                    공개 랭킹 기준 상위 결과를 보여드려요.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 text-[13px] sm:grid-cols-2 lg:max-w-xl">
              <div
                className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2"
                data-testid="neon-map-requested-universe"
                data-universe-code={displayMapDelivery.requestedUniverseCode}
              >
                <span className="block uppercase tracking-[0.16em] text-slate-400">
                  선택 지역
                </span>
                <span className="mt-1 block truncate font-semibold text-slate-300">
                  {requestedUniverseLabel}
                </span>
              </div>

              <div
                className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2"
                data-testid="neon-map-rendered-universe"
                data-universe-code={displayMapDelivery.renderedUniverseCode}
              >
                <span className="block uppercase tracking-[0.16em] text-slate-400">
                  지도 표시 지역
                </span>
                <span className="mt-1 block truncate font-semibold text-slate-300">
                  {renderedUniverseLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-[220px] flex-1 items-center justify-center bg-[#0b1118] px-5 py-8 text-center">
          <div className="max-w-sm rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-sm leading-relaxed text-rose-200">
            지도 제공자가 잠시 응답하지 않습니다. 검색은 현재 관측 데이터 기준으로 계속 사용할 수 있어요.
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <div
        className="flex min-h-[520px] w-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50"
        role="status" aria-live="polite"
        data-testid="neon-map"
        data-universe-code={currentUniverseCode}
        data-requested-universe-code={currentUniverseCode}
        data-rendered-universe-code={currentUniverseCode}
        data-map-scope={getUniverseLabel(currentUniverseCode)}
        data-map-fallback-mode="loading"
        data-map-cache-state="client"
        data-map-aggregation-basis={displayMapDelivery.aggregationBasis}
        data-map-is-complete-district-total={String(
          displayMapDelivery.isCompleteDistrictTotal,
        )}
        data-map-aggregation-grain={displayMapDelivery.aggregationGrain}
        data-map-source-row-limit={displayMapDelivery.sourceRowLimit ?? "unknown"}
        data-map-source-rows-used={displayMapDelivery.sourceRowsUsed ?? "unknown"}
      ><span className="flex items-center gap-3 text-base text-slate-200"><span aria-hidden="true" className="size-6 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-300 motion-reduce:animate-none" />카카오 지도를 불러오고 있어요…</span></div>
    );
  }

  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-700/50 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_40px_rgba(0,0,0,0.4)]"
      data-testid="neon-map"
      data-universe-code={currentUniverseCode}
      data-requested-universe-code={displayMapDelivery.requestedUniverseCode}
      data-rendered-universe-code={displayMapDelivery.renderedUniverseCode}
      data-map-scope={mapScopeLabel}
      data-map-fallback-mode={displayMapDelivery.fallbackMode}
      data-map-cache-state={displayMapDelivery.cacheState}
      data-map-source={displayMapDelivery.source}
      data-map-item-count={displayMapDelivery.itemCount}
      data-map-aggregation-basis={displayMapDelivery.aggregationBasis}
      data-map-is-complete-district-total={String(
        displayMapDelivery.isCompleteDistrictTotal,
      )}
      data-map-aggregation-grain={displayMapDelivery.aggregationGrain}
      data-map-source-row-limit={displayMapDelivery.sourceRowLimit ?? "unknown"}
      data-map-source-rows-used={displayMapDelivery.sourceRowsUsed ?? "unknown"}
    >
      <div className="ko-neon-controls">
        {toolbar}
            <div
              className="relative z-40 mt-2 w-full sm:mt-4"
              data-testid="neon-map-local-search"
            >
              <label
                htmlFor="neon-map-local-search-input"
                className="sr-only"
              >
                지도 검색
              </label>
              <div className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-2xl border border-cyan-400/35 bg-slate-950/90 px-3 py-2 text-sm shadow-[0_16px_42px_rgba(0,0,0,0.34)] ring-1 ring-cyan-400/10 sm:min-h-16 sm:gap-3 sm:px-4 sm:py-3">
                <span className="shrink-0 rounded-full border border-cyan-400/35 bg-cyan-400/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">
                  Map
                </span>
                <input
                  id="neon-map-local-search-input"
                  data-testid="neon-map-local-search-input"
                  type="search"
                  value={mapSearchQuery}
                  onChange={(event) => {
                    setMapSearchQuery(event.target.value);
                    setMapSearchError(null);
                    setIsMapSearchRemotePending(event.target.value.trim().length >= 2);
                    setIsMapSearchOpen(true);
                  }}
                  onFocus={() => setIsMapSearchOpen(true)}
                  onBlur={() => {
                    window.setTimeout(() => setIsMapSearchOpen(false), 120);
                  }}
                  onKeyDown={handleMapSearchKeyDown}
                  placeholder="단지·지역 검색"
                  className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-slate-100 outline-none placeholder:text-slate-400 sm:text-base"
                />
                {mapSearchQuery && (
                  <button
                    type="button"
                    data-testid="neon-map-local-search-clear"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setMapSearchQuery("");
                      setIsMapSearchOpen(true);
                    }}
                    className="shrink-0 rounded-full border border-slate-700 bg-slate-900/85 px-3 py-2 text-[13px] font-semibold text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-200"
                  >
                    지우기
                  </button>
                )}
              </div>

              {isMapSearchOpen && hasMapSearchQuery && (
                <div
                  id="neon-map-local-search-suggestions"
                  data-testid="neon-map-local-search-suggestions"
                  className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-700/80 bg-[#101720] p-2 text-sm shadow-2xl"
                >
                  {renderMapRegionResolutionNotice()}
                  {hasMapSearchSuggestions ? (
                    <div className="space-y-2">
                      {mapSearchSuggestions.complexes.length > 0 && (
                        <div>
                          <p className="px-2 pb-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                            단지
                          </p>
                          <div className="space-y-1">
                            {mapSearchSuggestions.complexes.map((suggestion) => (
                              <button
                                key={suggestion.key}
                                type="button"
                                data-testid="neon-map-local-search-complex-result"
                                data-search-source={suggestion.source}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => handleMapSearchSelect(suggestion)}
                                className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-cyan-400/10 focus:bg-cyan-400/10 focus:outline-none"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate font-semibold text-slate-100">
                                    {suggestion.label}
                                  </span>
                                  <span className="block truncate text-[13px] text-slate-400">
                                    {suggestion.meta}
                                  </span>
                                </span>
                                <span className="shrink-0 rounded-full bg-cyan-400/10 px-2 py-0.5 text-xs font-semibold text-cyan-200">
                                  보기
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {mapSearchSuggestions.districts.length > 0 && (
                        <div>
                          <p className="px-2 pb-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                            지역
                          </p>
                          <div className="space-y-1">
                            {mapSearchSuggestions.districts.map((suggestion) => (
                              <button
                                key={suggestion.key}
                                type="button"
                                data-testid="neon-map-local-search-district-result"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => handleMapSearchSelect(suggestion)}
                                className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-cyan-400/10 focus:bg-cyan-400/10 focus:outline-none"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate font-semibold text-slate-100">
                                    {suggestion.label}
                                  </span>
                                  <span className="block truncate text-[13px] text-slate-400">
                                    {suggestion.meta}
                                  </span>
                                </span>
                                <span className="shrink-0 rounded-full bg-slate-700/60 px-2 py-0.5 text-xs font-semibold text-slate-200">
                                  지도
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {renderMapDiscoveryCandidatesSection()}
                    </div>
                  ) : (
                    isMapSearchRemotePending ? <SearchProgress label="공개 단지와 지역을 찾고 있어요" /> : mapSearchError ? <div role="alert" className="p-3 text-sm text-slate-300"><p>{mapSearchError}</p><Link className="ko-text-link" href={"/ranking?" + new URLSearchParams({ universe: currentUniverseCode, q: mapSearchQuery.trim() })}>전체 랭킹에서 검색 ↗</Link></div> : <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-3 text-sm leading-relaxed text-slate-400">검색 결과가 없어요. 단지 이름을 줄이거나 지역 이름도 함께 입력해 보세요.</div>
                  )}



                  <p className="mt-2 border-t border-slate-800 px-2 pt-2 text-xs leading-relaxed text-slate-400">
                    공개 랭킹 기준 상위 결과를 보여드려요.
                  </p>
                </div>
              )}
            </div>
        <details className="ko-neon-settings text-sm text-slate-300"><summary className="cursor-pointer py-2 font-semibold"><span className="sm:hidden">설정 · {visualizedMapData.length}곳</span><span className="hidden sm:inline">표시 설정 · {visualizedMapData.length}개 지역 {showBubbles ? "표시 중" : "숨김"}</span></summary>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-2">
              {TOP_N_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTopN(option.value)}
                  aria-pressed={topN === option.value}
                  className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${topN === option.value
                    ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                    : "border-slate-700 bg-slate-800/30 text-slate-400 hover:text-slate-200"
                    }`}
                >
                  확대 시 최대 {option.label}개 지역
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowBubbles((prev) => !prev)}
              aria-pressed={showBubbles}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${showBubbles
                ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                : "border-slate-700 bg-slate-800/30 text-slate-400"
                }`}
            >
              표시 {showBubbles ? "ON" : "OFF"}
            </button>
          </div>
          <div className="mt-3 border-t border-slate-700 pt-3">
            <p className="mb-2 text-sm text-slate-300">지역 내 공개 단지의 시가총액 합계</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="지역 합계 시총 필터">
              {[0, 1, 5, 10].map(value => <button key={value} type="button" aria-pressed={rangeMinTrillion === value}
                onClick={() => setRangeMinTrillion(value)} className="ko-map-preset">{value === 0 ? "전체" : value + "조 이상"}</button>)}
            </div>
          </div>
        </details>
        {displayMapDelivery.source === "home-board-seed" && displayMapDelivery.fallbackMode === "client-board-seed" ? <p role="status" className="text-sm text-cyan-300">공개 시총 자료를 불러오고 있어요…</p> : null}
        {mapItemsError ? <p role="alert" className="text-sm text-rose-300">{mapItemsError}</p> : null}
      </div>

      <div className="ko-neon-legend" data-testid="neon-map-legend">
        <p className="font-semibold">{displayMapDelivery.snapshotDate ?? "조회 중"} · 공개 {displayMapDelivery.sourceRowsUsed ?? 0}개 단지<span className="hidden sm:inline"> · {nationalView ? "시도별 보기 · 원을 누르면 확대" : "화면 안 시군구별 보기"}</span></p>
        <details><summary className="cursor-pointer underline underline-offset-4">지도 읽는 법 · 위치 {baseMapData.length}/{mapItems.length}</summary>
        <p>{sampledAggregationLabel}의 합계예요. 지역 전체 시총이나 실제 자금 이동이 아닙니다.</p>
        <p>원 크기: 공개 단지 시총 합계 · 색: 검증된 7일 시총 변화</p>
        <p><span style={{ color: "#6ee7b7" }}>▲ 증가</span>{" · "}<span style={{ color: "#fda4af" }}>▼ 감소</span>{" · "}회색: 변동 없음 또는 비교 자료 없음</p>
          <p className="mt-2">같은 단지의 7일 전 값이 있는 경우만 비교해요. 원의 위치는 지역 대표 위치이며, 단지의 정확한 주소가 아닙니다. 가까운 지역의 원은 겹칠 수 있어요. 지도를 확대해 보세요.</p>
          <p>크기는 읽기 쉽게 로그 비율로 조정했어요. 위치를 확인하지 못한 지역은 지도에 표시하지 않아요.</p>
          <p>전국 보기에서 겹치는 이름표는 대표 위치와 선으로 연결해 옆에 배치해요.</p>
        </details>
        {currentUniverseCode === DEFAULT_UNIVERSE_CODE ? <button type="button" className="ko-text-link" onClick={() => {
          if (currentDistrict) pushDistrictToUrl(currentDistrict);
          mapTouched.current = false;
          mapInstance?.setBounds(new kakao.maps.LatLngBounds(new kakao.maps.LatLng(33.0, 125.7), new kakao.maps.LatLng(38.7, 130.0)), 24, 24, 24, 24);
        }}>전국 보기</button> : null}
      </div>
      <div ref={mapFrameRef} onPointerDown={() => { mapTouched.current = true; }} className="relative min-h-[320px] flex-1 bg-[#0b1118]">
        {currentDistrict ? <div className="absolute bottom-3 left-3 right-14 z-20 flex max-w-lg flex-wrap items-center gap-3 rounded-xl border border-cyan-500/40 bg-slate-950/95 p-3 text-sm text-slate-100" aria-live="polite">
          <strong>{currentDistrict}</strong>
          {selectedDistrictDataFromAll ? <span>{formatCompactCap(selectedDistrictDataFromAll.totalMarketCap)} · 공개 {selectedDistrictDataFromAll.count}개 단지</span> : null}
          {districtRankingHref ? <Link className="ko-text-link" href={districtRankingHref}>이 지역 랭킹 보기 ↗</Link> : <span>이 지역의 공개 랭킹 연결을 확인하지 못했어요.</span>}
          {selectedDistrictDataFromAll?.primaryComplexId ? <Link className="ko-text-link" href={"/ranking?" + new URLSearchParams({ universe: currentUniverseCode, complexId: selectedDistrictDataFromAll.primaryComplexId })}>{selectedDistrictDataFromAll.primaryComplexName} 상세 ↗</Link> : null}
        </div> : null}
        <div
          className="neon-map-tiles absolute inset-0 z-0 [&>div]:h-full [&>div]:w-full"
        >
          <Map
            center={mapView.center}
            style={{ width: "100%", height: "100%" }}
            level={mapView.level}
            disableDoubleClickZoom={true}
            onCreate={setMapInstance}
            onZoomChanged={map => setMapZoom(map.getLevel())}
            onIdle={map => {
              const bounds = map.getBounds(), sw = bounds.getSouthWest(), ne = bounds.getNorthEast();
              setMapBounds({ south: sw.getLat(), west: sw.getLng(), north: ne.getLat(), east: ne.getLng() });
            }}
          >
            <ZoomControl position="RIGHT" />
            {showBubbles &&
              renderOrderMapData.map((data) => {
                const change = data.marketCapChangePct7d;
                const known = typeof change === "number" && Number.isFinite(change);
                const isSelected = data.name === currentDistrict;
                const isActionable = Boolean(data.primaryComplexId && data.primaryRank);
                const tone = known && change > 0 ? "#6ee7b7" : known && change < 0 ? "#fda4af" : "#cbd5e1";
                const ring = isSelected ? "#67e8f9" : tone;
                const comparisonLabel = mapChangeLabel(change);
                const titleParts = [data.name, "공개 시총 " + formatMarketCapKrw(data.totalMarketCap) + " · " + data.count + "개 단지", comparisonLabel,
                  "비교 가능 " + (data.comparableComplexCount ?? 0) + "/" + data.count + "개", data.comparisonDate ? data.comparisonDate + " 대비" : "7일 비교 자료 없음",
                  data.primaryComplexName ? "대표 단지 " + data.primaryComplexName : ""].filter(Boolean);
                const offset = labelOffsets.get(data.name) ?? { x: 0, y: 0 };

                return (
                  <CustomOverlayMap
                    key={data.name}
                    position={data.coords}
                    yAnchor={0.5}
                    xAnchor={0.5}
                    zIndex={isSelected ? 999 : 100 + data.visualRank}
                  >
                    <div className="pointer-events-none relative" style={{ width: 0, height: 0 }}>
                    {offset.x || offset.y ? <svg aria-hidden="true" className="pointer-events-none absolute overflow-visible" width="1" height="1"><line x1="0" y1="0" x2={offset.x} y2={offset.y} stroke="#cbd5e1" strokeWidth="1.5" /><circle r="3" fill="#cbd5e1" /></svg> : null}
                    <button type="button" disabled={!isActionable}
                      onClick={() => handleDistrictClick(data)}
                      onMouseDown={(event) => event.stopPropagation()}
                      onTouchStart={(event) => event.stopPropagation()}
                      aria-label={titleParts.join(" · ") + " · 지역 선택"}
                      aria-pressed={isSelected}
                      className="neon-map-bubble pointer-events-auto absolute flex flex-col items-center justify-center rounded-full border-2 p-0.5 leading-tight transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 disabled:cursor-default"
                      style={{ width: data.bubbleSize, height: data.bubbleSize, borderColor: ring, transform: "translate(-50%, -50%)", translate: `${offset.x}px ${offset.y}px`,
                        background: "rgba(6,16,25,0.68)", color: "#f1f5f9", boxShadow: "0 0 " + (isSelected ? 20 : 8) + "px " + ring + "66" }}
                      title={titleParts.join(" · ")}>
                      <span className="max-w-full truncate text-xs font-semibold">{data.members ? data.name : data.name.replace(/^\S+\s+/, "")}</span>
                      {data.members ? <span className="font-mono text-xs font-bold tabular-nums">{formatCompactCap(data.totalMarketCap)}</span> : null}
                    </button>
                    </div>
                  </CustomOverlayMap>
                );
              })}
          </Map>
        </div>

        {!visualizedMapData.length && displayMapDelivery.source === "live_latest" ? <p className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg bg-slate-950/90 p-3 text-sm text-slate-100">현재 화면·필터에 표시할 지역이 없어요. 지도를 이동하거나 조건을 바꿔 보세요.</p> : null}
        <div className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_24px_rgba(11,17,24,0.45)]" />
      </div>

      <style jsx>{`
        :global([data-theme="night"]) .neon-map-tiles { filter: invert(100%) hue-rotate(180deg); }
        :global([data-theme="night"] .neon-map-bubble) { filter: invert(100%) hue-rotate(180deg); }
      `}</style>
    </section>
  );
}
