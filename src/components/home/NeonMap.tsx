"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Map, CustomOverlayMap, useKakaoLoader } from "react-kakao-maps-sdk";
import type { RankingItem } from "../../lib/koaptix/types";
import {
  DEFAULT_UNIVERSE_CODE,
  getUniverseLabel,
  normalizeUniverseCode,
} from "../../lib/koaptix/universes";

type Coord = { lat: number; lng: number };

type DistrictAggregate = {
  name: string;
  query: string;
  totalMarketCap: number;
  averageDelta: number;
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
};

type TopNOption = {
  label: string;
  value: number;
};

type MapApiResponse = {
  ok?: boolean;
  universeCode?: string;
  requestedUniverseCode?: string;
  renderedUniverseCode?: string;
  mapScopeLabel?: string;
  isFallback?: boolean;
  fallbackMode?: string;
  source?: string;
  count?: number;
  items?: DistrictAggregate[];
  message?: string;
};

type MapDeliveryState = {
  requestedUniverseCode: string;
  renderedUniverseCode: string;
  mapScopeLabel: string;
  fallbackMode: string;
  cacheState: string;
  source: string;
  itemCount: number;
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
function getFixedDistrictCoords(
  universeCode: string,
  districtName: string,
): Coord | null {
  if (universeCode === "SEOUL_ALL") {
    return SEOUL_DISTRICT_COORDS[districtName] ?? null;
  }

  if (universeCode === DEFAULT_UNIVERSE_CODE) {
    const normalizedName = districtName.replace(/^서울\s+/, "").trim();
    return SEOUL_DISTRICT_COORDS[normalizedName] ?? null;
  }

  return null;
}
const RANGE_STEP_TRILLION = 0.05;
const RANGE_MIN_TRILLION = 0.1;
const MIN_GAP_TRILLION = RANGE_STEP_TRILLION;

const TOP_N_OPTIONS: TopNOption[] = [
  { label: "20", value: 20 },
  { label: "40", value: 40 },
  { label: "80", value: 80 },
];

function getDesiredMapSourceLimit(topN: number, universeCode: string) {
  if (universeCode === DEFAULT_UNIVERSE_CODE) {
    if (topN <= 20) return 32;
    if (topN <= 40) return 52;
    return 72;
  }

  if (topN <= 20) return 28;
  if (topN <= 40) return 44;
  return 60;
}

const MAP_API = (universeCode: string, limit: number) =>
  `/api/map?universe_code=${encodeURIComponent(universeCode)}&limit=${encodeURIComponent(limit)}`;

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

function formatRangeLabel(trillionValue: number) {
  if (trillionValue >= 1) {
    return `${trillionValue.toFixed(1).replace(/\.0$/, "")}조`;
  }

  return `${Math.round(trillionValue * 10000)}억`;
}

function formatSliderChipLabel(trillionValue: number) {
  if (trillionValue >= 100) {
    return `${Math.round(trillionValue)}조`;
  }

  if (trillionValue >= 10) {
    return `${trillionValue.toFixed(1)}조`;
  }

  return formatRangeLabel(trillionValue);
}

function formatEditableInputValue(trillionValue: number) {
  const scaled = trillionValue * 10;

  if (Number.isInteger(scaled)) {
    return String(scaled);
  }

  return scaled.toFixed(1).replace(/\.0$/, "");
}

function parseInputToTrillion(input: string): number | null {
  const cleanInput = input.replace(/,/g, "").trim();
  const value = parseFloat(cleanInput);

  if (Number.isNaN(value)) return null;

  if (cleanInput.includes("조")) {
    return value;
  }

  if (cleanInput.includes("억")) {
    return value / 10000;
  }

  return value / 10;
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

  return {
    items,
    delivery: {
      requestedUniverseCode: json.requestedUniverseCode ?? json.universeCode ?? "",
      renderedUniverseCode,
      mapScopeLabel: json.mapScopeLabel ?? getUniverseLabel(renderedUniverseCode),
      fallbackMode: json.fallbackMode ?? "none",
      cacheState,
      source: json.source ?? "api",
      itemCount: Number(json.count ?? items.length),
    } satisfies MapDeliveryState,
  };
}

function roundUpToStep(value: number, step: number) {
  return Math.ceil(value / step) * step;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildMapDeliveryState(
  universeCode: string,
  overrides: Partial<MapDeliveryState> = {},
): MapDeliveryState {
  const renderedUniverseCode = overrides.renderedUniverseCode ?? universeCode;

  return {
    requestedUniverseCode: overrides.requestedUniverseCode ?? universeCode,
    renderedUniverseCode,
    mapScopeLabel:
      overrides.mapScopeLabel ?? getUniverseLabel(renderedUniverseCode),
    fallbackMode: overrides.fallbackMode ?? "client-board-seed",
    cacheState: overrides.cacheState ?? "client",
    source: overrides.source ?? "home-board-seed",
    itemCount: overrides.itemCount ?? 0,
  };
}

/**
 * Home tactical radar.
 */
export function NeonMap({ items }: { items: RankingItem[] }) {
  const searchParams = useSearchParams();
  const currentDistrict = searchParams?.get("district");
  const currentUniverseCode = normalizeUniverseCode(
    searchParams?.get("universe") ?? DEFAULT_UNIVERSE_CODE,
  );

  const [showBubbles, setShowBubbles] = useState(true);
  const [topN, setTopN] = useState<number>(() =>
    currentUniverseCode === DEFAULT_UNIVERSE_CODE ? 20 : 40,
  );

  useEffect(() => {
    setTopN(currentUniverseCode === DEFAULT_UNIVERSE_CODE ? 20 : 40);
  }, [currentUniverseCode]);

  const mapSourceLimit = useMemo(
    () => getDesiredMapSourceLimit(topN, currentUniverseCode),
    [topN, currentUniverseCode],
  );

  const [rangeMinTrillion, setRangeMinTrillion] =
    useState<number>(RANGE_MIN_TRILLION);
  const [rangeMaxTrillion, setRangeMaxTrillion] = useState<number>(10);

  const [editingMin, setEditingMin] = useState<string | null>(null);
  const [editingMax, setEditingMax] = useState<string | null>(null);

  const fallbackMapItems = useMemo(
    () => buildFallbackAggregate(items),
    [items],
  );

  const fallbackMapItemsRef = useRef<DistrictAggregate[]>(fallbackMapItems);
  fallbackMapItemsRef.current = fallbackMapItems;

  const [mapItems, setMapItems] = useState<DistrictAggregate[]>(
    fallbackMapItems,
  );
  const [mapItemsError, setMapItemsError] = useState<string | null>(null);
  const [mapDelivery, setMapDelivery] = useState<MapDeliveryState>(() =>
    buildMapDeliveryState(currentUniverseCode, {
      itemCount: fallbackMapItems.length,
    }),
  );

  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY as string,
    libraries: ["services"],
  });

  const [mapView, setMapView] = useState<{
    center: Coord;
    level: number;
  }>({
    center: DEFAULT_KOREA_CENTER,
    level: 13,
  });

  // 🚨 지차장 지시 A: 고유 좌표 키 생성을 위한 헬퍼 추가
  // Universe-scoped coord cache: never reuse geocoded coordinates across
  // universe transitions, because region labels can repeat with different map
  // identity.
  const resolvedCoordStorageKey = useMemo(
    () => `koaptix:neon-map:coords:${currentUniverseCode}`,
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
    setMapItems(fallbackMapItemsRef.current);
    setMapItemsError(null);
    setMapDelivery(
      buildMapDeliveryState(currentUniverseCode, {
        itemCount: fallbackMapItemsRef.current.length,
      }),
    );
  }, [currentUniverseCode]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const loadMapItems = async () => {
      setMapItemsError(null);

      try {
        const result = await readMapItems(
          MAP_API(currentUniverseCode, mapSourceLimit),
          controller.signal,
        );

        if (cancelled) return;
        setMapItems(result.items);
        setMapDelivery(result.delivery);
      } catch (error) {
        if (controller.signal.aborted || cancelled) return;

        const message =
          error instanceof Error ? error.message : "맵 데이터 로딩 실패";

        console.warn("[NeonMap] map fetch warn", {
          currentUniverseCode,
          mapSourceLimit,
          message,
        });

        setMapItemsError(message);
        setMapItems(fallbackMapItemsRef.current);
        setMapDelivery(
          buildMapDeliveryState(currentUniverseCode, {
            fallbackMode: "client-board-fallback",
            cacheState: "client",
            source: "home-board-seed",
            itemCount: fallbackMapItemsRef.current.length,
          }),
        );
      }
    };

    void loadMapItems();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [currentUniverseCode, mapSourceLimit]);

  useEffect(() => {
    if (loading || error) return;

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
      })
      .slice(0, 12);

    if (unresolved.length === 0) return;

    const geocodeOne = async (group: DistrictAggregate) => {
      const tryQueries = [group.query, group.name].filter(Boolean);

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

    unresolved.forEach((group) => {
      void geocodeOne(group);
    });

    return () => {
      cancelled = true;
    };
  }, [mapItems, loading, error, currentUniverseCode]);

  // 🚨 지차장 지시 E: baseMapData에서 좌표를 읽을 때 고유 coordKey 사용
  // Read coordinates through the same universe-scoped key when rendering.
  const baseMapData = useMemo(() => {
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
  }, [mapItems, resolvedCoords, currentUniverseCode]);

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

  useEffect(() => {
    if (selectedDistrictDataFromAll) {
      setMapView({
        center: selectedDistrictDataFromAll.coords,
        level: 8,
      });
      return;
    }

    setMapView({
      center: universeAnchorCenter,
      level: 13,
    });
  }, [
    currentUniverseCode,
    currentDistrict,
    selectedDistrictDataFromAll,
    universeAnchorCenter,
  ]);

  const maxMapMarketCapTrillion = useMemo(() => {
    const maxKrw = baseMapData.reduce(
      (acc, item) => Math.max(acc, item.totalMarketCap),
      0,
    );

    const maxTrillion = maxKrw / 1_000_000_000_000;
    return Math.max(5, roundUpToStep(maxTrillion, RANGE_STEP_TRILLION));
  }, [baseMapData]);

  useEffect(() => {
    setRangeMinTrillion(RANGE_MIN_TRILLION);
    setRangeMaxTrillion(maxMapMarketCapTrillion);
  }, [currentUniverseCode, maxMapMarketCapTrillion]);

  const minMarketCapKrw = rangeMinTrillion * 1_000_000_000_000;
  const maxMarketCapKrw = rangeMaxTrillion * 1_000_000_000_000;

  const filteredMapData = useMemo(() => {
    return [...baseMapData]
      .filter((item) => item.totalMarketCap >= minMarketCapKrw)
      .filter((item) => item.totalMarketCap <= maxMarketCapKrw)
      .sort((a, b) => b.totalMarketCap - a.totalMarketCap)
      .slice(0, topN);
  }, [baseMapData, minMarketCapKrw, maxMarketCapKrw, topN]);

  const visualizedMapData = useMemo<ResolvedMapItem[]>(() => {
    if (filteredMapData.length === 0) return [];

    const sortedDesc = [...filteredMapData].sort(
      (a, b) => b.totalMarketCap - a.totalMarketCap,
    );

    const values = sortedDesc.map((item) => item.totalMarketCap);
    const min = Math.min(...values);
    const max = Math.max(...values);

    return sortedDesc.map((item, index) => {
      const normalized =
        max === min ? 1 : (item.totalMarketCap - min) / (max - min);

      const size = 70 + Math.pow(normalized, 0.58) * 86;

      return {
        ...item,
        visualRank: index + 1,
        bubbleSize: Math.round(size),
      };
    });
  }, [filteredMapData]);

  const renderOrderMapData = useMemo(() => {
    return [...visualizedMapData].sort(
      (a, b) => a.totalMarketCap - b.totalMarketCap,
    );
  }, [visualizedMapData]);

  const actionableCount = useMemo(() => {
    return visualizedMapData.filter(
      (item) => item.isBoardBacked && (item.boardCount ?? 0) > 0,
    ).length;
  }, [visualizedMapData]);

  const sliderRange = Math.max(
    maxMapMarketCapTrillion - RANGE_MIN_TRILLION,
    RANGE_STEP_TRILLION,
  );

  const minThumbPercent =
    ((rangeMinTrillion - RANGE_MIN_TRILLION) / sliderRange) * 100;
  const maxThumbPercent =
    ((rangeMaxTrillion - RANGE_MIN_TRILLION) / sliderRange) * 100;

  const handleMinSubmit = () => {
    if (editingMin !== null) {
      const parsed = parseInputToTrillion(editingMin);

      if (parsed !== null) {
        const nextMin = clamp(
          parsed,
          RANGE_MIN_TRILLION,
          rangeMaxTrillion - MIN_GAP_TRILLION,
        );
        setRangeMinTrillion(nextMin);
      }

      setEditingMin(null);
    }
  };

  const handleMaxSubmit = () => {
    if (editingMax !== null) {
      const parsed = parseInputToTrillion(editingMax);

      if (parsed !== null) {
        const nextMax = clamp(
          parsed,
          rangeMinTrillion + MIN_GAP_TRILLION,
          maxMapMarketCapTrillion,
        );
        setRangeMaxTrillion(nextMax);
      }

      setEditingMax(null);
    }
  };

  const handleDistrictClick = useCallback((data: ResolvedMapItem) => {
    if (!data.isBoardBacked || (data.boardCount ?? 0) <= 0) {
      return;
    }

    pushDistrictToUrl(data.name);
  }, []);

  const isMapFallback = mapDelivery.fallbackMode !== "none";
  const mapScopeLabel =
    mapDelivery.mapScopeLabel || getUniverseLabel(mapDelivery.renderedUniverseCode);
  const requestedUniverseLabel = getUniverseLabel(
    mapDelivery.requestedUniverseCode || currentUniverseCode,
  );
  const renderedUniverseLabel =
    mapScopeLabel || mapDelivery.renderedUniverseCode || currentUniverseCode;

  if (error) {
    return (
      <div
        className="p-4 text-sm text-rose-400"
        data-testid="neon-map"
        data-universe-code={currentUniverseCode}
        data-requested-universe-code={currentUniverseCode}
        data-rendered-universe-code={currentUniverseCode}
        data-map-scope={getUniverseLabel(currentUniverseCode)}
        data-map-fallback-mode="loader-error"
        data-map-cache-state="client"
      >
        지도 로딩 에러
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="h-[650px] w-full animate-pulse rounded-2xl border border-slate-800 bg-slate-900/50"
        data-testid="neon-map"
        data-universe-code={currentUniverseCode}
        data-requested-universe-code={currentUniverseCode}
        data-rendered-universe-code={currentUniverseCode}
        data-map-scope={getUniverseLabel(currentUniverseCode)}
        data-map-fallback-mode="loading"
        data-map-cache-state="client"
      />
    );
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border border-slate-700/50 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_40px_rgba(0,0,0,0.4)]"
      data-testid="neon-map"
      data-universe-code={currentUniverseCode}
      data-requested-universe-code={mapDelivery.requestedUniverseCode}
      data-rendered-universe-code={mapDelivery.renderedUniverseCode}
      data-map-scope={mapScopeLabel}
      data-map-fallback-mode={mapDelivery.fallbackMode}
      data-map-cache-state={mapDelivery.cacheState}
      data-map-source={mapDelivery.source}
      data-map-item-count={mapDelivery.itemCount}
    >
      <div className="flex flex-col gap-4 border-b border-slate-800/80 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
              TACTICAL RADAR
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-100">
              전국 자본 흐름 맵
            </h2>
            <p className="mt-2 text-[11px] text-slate-500">
              원 안 큰 숫자는 해당 구의 총 시가총액이다. 레인지와 TOP N을 바꿔도 지도 위치는 유지된다.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2 lg:max-w-xl">
              <div
                className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2"
                data-testid="neon-map-requested-universe"
                data-universe-code={mapDelivery.requestedUniverseCode}
              >
                <span className="block uppercase tracking-[0.16em] text-slate-500">
                  Requested
                </span>
                <span className="mt-1 block truncate font-semibold text-slate-300">
                  {requestedUniverseLabel}
                </span>
              </div>

              <div
                className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2"
                data-testid="neon-map-rendered-universe"
                data-universe-code={mapDelivery.renderedUniverseCode}
              >
                <span className="block uppercase tracking-[0.16em] text-slate-500">
                  Map scope
                </span>
                <span className="mt-1 block truncate font-semibold text-slate-300">
                  {renderedUniverseLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-2">
              {TOP_N_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTopN(option.value)}
                  className={`rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition ${topN === option.value
                    ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                    : "border-slate-700 bg-slate-800/30 text-slate-400 hover:text-slate-200"
                    }`}
                >
                  TOP {option.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowBubbles((prev) => !prev)}
              className={`rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition ${showBubbles
                ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                : "border-slate-700 bg-slate-800/30 text-slate-400"
                }`}
            >
              표시 {showBubbles ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-cyan-300">
            홈 보드 연동 {actionableCount}
          </span>
          <span className="rounded-full border border-slate-700 bg-slate-800/30 px-2.5 py-1 text-slate-400">
            레이더 전용 {Math.max(visualizedMapData.length - actionableCount, 0)}
          </span>
          <span
            className="rounded-full border border-slate-700 bg-slate-800/30 px-2.5 py-1 text-slate-400"
            data-testid="neon-map-cache-state"
            data-map-cache-state={mapDelivery.cacheState}
          >
            Cache {mapDelivery.cacheState}
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 ${
              isMapFallback
                ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
            }`}
            data-testid="neon-map-fallback-state"
            data-map-fallback-mode={mapDelivery.fallbackMode}
          >
            {isMapFallback ? `Fallback ${mapDelivery.fallbackMode}` : "Same-universe live"}
          </span>
          {mapItemsError && (
            <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-rose-300">
              {mapItemsError}
            </span>
          )}
        </div>

        <div className="flex w-full flex-col gap-3 self-end lg:max-w-2xl">
          <div className="flex items-center justify-between text-[10px] font-medium text-slate-400">
            <span className="flex flex-col">
              <span className="text-[9px] text-slate-500">MIN</span>
              <span>{formatRangeLabel(RANGE_MIN_TRILLION)}</span>
            </span>

            <span className="rounded-full bg-slate-800/50 px-2.5 py-1 text-[9px] text-slate-400">
              💡 숫자 입력창 (1 = 천억, 10 = 1조)
            </span>

            <span className="flex flex-col text-right">
              <span className="text-[9px] text-slate-500">MAX</span>
              <span>{formatRangeLabel(maxMapMarketCapTrillion)}</span>
            </span>
          </div>

          <div className="relative pb-8 pt-4">
            <div className="absolute left-0 right-0 top-[24px] h-[4px] rounded-full bg-slate-700/80" />
            <div
              className="absolute top-[24px] h-[4px] rounded-full bg-cyan-400"
              style={{
                left: `${minThumbPercent}%`,
                width: `${Math.max(maxThumbPercent - minThumbPercent, 1)}%`,
              }}
            />

            <div
              className="absolute top-[-2px] z-30"
              style={{
                left: `calc(${minThumbPercent}% + 14px)`,
                transform: "translateX(0)",
              }}
            >
              {editingMin !== null ? (
                <input
                  type="text"
                  autoFocus
                  value={editingMin}
                  onChange={(e) => setEditingMin(e.target.value)}
                  onBlur={handleMinSubmit}
                  onKeyDown={(e) => e.key === "Enter" && handleMinSubmit()}
                  className="w-[72px] rounded bg-slate-800 px-2 py-1 text-center text-[11px] font-semibold text-white outline-none ring-1 ring-cyan-500"
                />
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setEditingMin(formatEditableInputValue(rangeMinTrillion))
                  }
                  className="inline-flex whitespace-nowrap items-center justify-center rounded bg-cyan-500/90 px-2 py-1 text-[11px] font-semibold leading-none text-white shadow hover:bg-cyan-400"
                >
                  {formatSliderChipLabel(rangeMinTrillion)}
                </button>
              )}
            </div>

            <div
              className="absolute top-[36px] z-30"
              style={{
                left: `calc(${maxThumbPercent}% - 14px)`,
                transform: "translateX(-100%)",
              }}
            >
              {editingMax !== null ? (
                <input
                  type="text"
                  autoFocus
                  value={editingMax}
                  onChange={(e) => setEditingMax(e.target.value)}
                  onBlur={handleMaxSubmit}
                  onKeyDown={(e) => e.key === "Enter" && handleMaxSubmit()}
                  className="w-[72px] rounded bg-slate-800 px-2 py-1 text-center text-[11px] font-semibold text-white outline-none ring-1 ring-cyan-500"
                />
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setEditingMax(formatEditableInputValue(rangeMaxTrillion))
                  }
                  className="inline-flex whitespace-nowrap items-center justify-center rounded bg-cyan-500/90 px-2 py-1 text-[11px] font-semibold leading-none text-white shadow hover:bg-cyan-400"
                >
                  {formatSliderChipLabel(rangeMaxTrillion)}
                </button>
              )}
            </div>

            <input
              type="range"
              min={RANGE_MIN_TRILLION}
              max={maxMapMarketCapTrillion}
              step={RANGE_STEP_TRILLION}
              value={rangeMinTrillion}
              onChange={(e) => {
                const next = clamp(
                  Number(e.target.value),
                  RANGE_MIN_TRILLION,
                  rangeMaxTrillion - MIN_GAP_TRILLION,
                );
                setRangeMinTrillion(next);
              }}
              className="range-slider pointer-events-none absolute left-0 top-[12px] z-20 w-full"
            />

            <input
              type="range"
              min={RANGE_MIN_TRILLION}
              max={maxMapMarketCapTrillion}
              step={RANGE_STEP_TRILLION}
              value={rangeMaxTrillion}
              onChange={(e) => {
                const next = clamp(
                  Number(e.target.value),
                  rangeMinTrillion + MIN_GAP_TRILLION,
                  maxMapMarketCapTrillion,
                );
                setRangeMaxTrillion(next);
              }}
              className="range-slider pointer-events-none absolute left-0 top-[12px] z-20 w-full"
            />
          </div>
        </div>
      </div>

      <div className="relative h-[650px] w-full bg-[#0b1118]">
        <div
          className="absolute inset-0 z-0 [&>div]:h-full [&>div]:w-full opacity-80"
          style={{
            filter:
              "invert(100%) hue-rotate(180deg) brightness(80%) contrast(110%) grayscale(30%)",
          }}
        >
          <Map
            center={mapView.center}
            style={{ width: "100%", height: "100%" }}
            level={mapView.level}
            disableDoubleClickZoom={true}
          >
            {showBubbles &&
              renderOrderMapData.map((data) => {
                const isRising = data.averageDelta >= 0;
                const isSelected = data.name === currentDistrict;
                const isActionable =
                  !!data.isBoardBacked && (data.boardCount ?? 0) > 0;
                const isTopTier = data.visualRank <= 5;

                let ringColor = isRising
                  ? "border-rose-500/70"
                  : "border-blue-500/70";
                let glowColor = isRising
                  ? "rgba(244,63,94,0.32)"
                  : "rgba(59,130,246,0.32)";
                let bgColor = isRising
                  ? "bg-rose-500/12"
                  : "bg-blue-500/12";
                let capColor = "text-white";
                let deltaBadgeColor = isRising
                  ? "bg-rose-500/20 text-rose-200"
                  : "bg-blue-500/20 text-blue-200";

                if (!isActionable && !isSelected) {
                  ringColor = isRising
                    ? "border-rose-500/18"
                    : "border-blue-500/18";
                  glowColor = isRising
                    ? "rgba(244,63,94,0.08)"
                    : "rgba(59,130,246,0.08)";
                  bgColor = "bg-slate-700/20";
                  capColor = "text-slate-300";
                  deltaBadgeColor = "bg-slate-700/50 text-slate-300";
                }

                if (isTopTier && !isSelected) {
                  ringColor = isRising
                    ? "border-rose-400/90"
                    : "border-blue-400/90";
                  glowColor = isRising
                    ? "rgba(244,63,94,0.44)"
                    : "rgba(59,130,246,0.44)";
                }

                if (isSelected) {
                  ringColor = "border-cyan-300";
                  glowColor = "rgba(34,211,238,0.55)";
                  bgColor = "bg-cyan-500/20";
                  capColor = "text-cyan-50";
                  deltaBadgeColor = "bg-cyan-500/20 text-cyan-100";
                }

                const finalBoxShadow = `${isSelected ? "0 0 0 2px rgba(255,255,255,0.75), " : ""
                  }0 0 18px ${glowColor}, inset 0 0 10px ${glowColor}`;

                const titleParts = [
                  data.name,
                  formatMarketCapKrw(data.totalMarketCap),
                  `${data.count}개 단지`,
                  isRising
                    ? `주간 흐름 ▲${Math.abs(data.averageDelta).toFixed(1)}`
                    : `주간 흐름 ▼${Math.abs(data.averageDelta).toFixed(1)}`,
                  data.primaryComplexName ? `대표 ${data.primaryComplexName}` : "",
                  isActionable
                    ? `홈 보드 ${data.boardCount ?? 0}개 연동`
                    : "레이더 전용",
                ].filter(Boolean);

                return (
                  <CustomOverlayMap
                    key={data.name}
                    position={data.coords}
                    yAnchor={0.5}
                    xAnchor={0.5}
                    zIndex={isSelected ? 999 : 100 + (100 - data.visualRank)}
                  >
                    <div
                      onClick={() => handleDistrictClick(data)}
                      className={`group relative flex flex-col items-center justify-center rounded-full border transition-all duration-300 ${isActionable
                        ? "cursor-pointer hover:scale-110 hover:border-cyan-300/80"
                        : "cursor-default opacity-75"
                        } ${ringColor} ${bgColor} ${isSelected ? "scale-110" : ""}`}
                      style={{
                        width: `${data.bubbleSize}px`,
                        height: `${data.bubbleSize}px`,
                        boxShadow: finalBoxShadow,
                        filter: "invert(100%) hue-rotate(180deg)",
                      }}
                      title={titleParts.join(" · ")}
                    >
                      <div className="absolute inset-0 z-0 overflow-hidden rounded-full backdrop-blur-md" />

                      {isTopTier && (
                        <div className="pointer-events-none absolute -top-2 z-20 rounded-full border border-amber-300/40 bg-amber-300/10 px-1.5 py-0.5 text-[8px] font-bold text-amber-200">
                          TOP {data.visualRank}
                        </div>
                      )}

                      <span className="pointer-events-none relative z-10 max-w-[92%] truncate text-[12px] font-bold text-slate-100 drop-shadow-md">
                        {data.name}
                      </span>

                      <span
                        className={`pointer-events-none relative z-10 mt-0.5 text-[15px] font-black tracking-tight ${capColor} drop-shadow-md`}
                      >
                        {formatCompactCap(data.totalMarketCap)}
                      </span>

                      <span
                        className={`pointer-events-none relative z-10 mt-1 rounded-full px-1.5 py-[2px] text-[9px] font-semibold ${deltaBadgeColor}`}
                      >
                        {isRising ? "▲" : "▼"}
                        {Math.abs(data.averageDelta).toFixed(1)}
                      </span>
                    </div>
                  </CustomOverlayMap>
                );
              })}
          </Map>
        </div>

        <div className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_80px_rgba(11,17,24,1)]" />
      </div>

      <style jsx>{`
        .range-slider {
          appearance: none;
          background: transparent;
          height: 26px;
        }

        .range-slider::-webkit-slider-runnable-track {
          height: 4px;
          background: transparent;
        }

        .range-slider::-webkit-slider-thumb {
          appearance: none;
          pointer-events: auto;
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background: #22d3ee;
          border: 2px solid #0b1118;
          box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.22);
          margin-top: -8px;
          cursor: pointer;
        }

        .range-slider::-moz-range-track {
          height: 4px;
          background: transparent;
        }

        .range-slider::-moz-range-thumb {
          pointer-events: auto;
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background: #22d3ee;
          border: 2px solid #0b1118;
          box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.22);
          cursor: pointer;
        }
      `}</style>
    </section>
  );
}
