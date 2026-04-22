/**
 * Tactical map delivery route.
 * KOREA_ALL / macro map은 source of truth 체인을 유지한 채 delivery 최적화로 안정화한다.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  DEFAULT_UNIVERSE_CODE,
  getUniverseLabel,
  resolveServiceUniverseCode,
} from "../../../lib/koaptix/universes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HOME_BOARD_TACTICAL_LIMIT = 20;

const MAP_DEFAULT_LIMIT_KOREA = 32;
const MAP_DEFAULT_LIMIT_REGIONAL = 44;
const MAP_MAX_LIMIT = 120;

const MAP_CACHE_FRESH_TTL_MS = 90_000;
const MAP_CACHE_STALE_TTL_MS = 900_000;

const LATEST_MAP_TIMEOUT_MS_REGIONAL = 1_100;
const DYNAMIC_MAP_TIMEOUT_MS_KOREA = 8_500;
const DYNAMIC_MAP_TIMEOUT_MS_REGIONAL = 5_500;

const LATEST_MAP_COOLDOWN_MS = 180_000;

const UNIVERSE_SCOPE_LABELS: Record<string, string> = {
  SEOUL_ALL: "서울특별시",
  BUSAN_ALL: "부산광역시",
  DAEGU_ALL: "대구광역시",
  INCHEON_ALL: "인천광역시",
  GWANGJU_ALL: "광주광역시",
  DAEJEON_ALL: "대전광역시",
  ULSAN_ALL: "울산광역시",
  SEJONG_ALL: "세종특별자치시",
  GYEONGGI_ALL: "경기도",
  GANGWON_ALL: "강원특별자치도",
  CHUNGBUK_ALL: "충청북도",
  CHUNGNAM_ALL: "충청남도",
  JEONBUK_ALL: "전북특별자치도",
  JEONNAM_ALL: "전라남도",
  GYEONGBUK_ALL: "경상북도",
  GYEONGNAM_ALL: "경상남도",
  JEJU_ALL: "제주특별자치도",
};

const SGG_PREFIX_SCOPE_LABELS: Record<string, string> = {
  "11": "서울특별시",
  "26": "부산광역시",
  "27": "대구광역시",
  "28": "인천광역시",
  "29": "광주광역시",
  "30": "대전광역시",
  "31": "울산광역시",
  "36": "세종특별자치시",
  "41": "경기도",
  "42": "강원특별자치도",
  "43": "충청북도",
  "44": "충청남도",
  "45": "전북특별자치도",
  "46": "전라남도",
  "47": "경상북도",
  "48": "경상남도",
  "50": "제주특별자치도",
  "51": "강원특별자치도",
  "52": "전북특별자치도",
};

const SGG_PREFIX_SCOPE_SHORT_LABELS: Record<string, string> = {
  "11": "서울",
  "26": "부산",
  "27": "대구",
  "28": "인천",
  "29": "광주",
  "30": "대전",
  "31": "울산",
  "36": "세종",
  "41": "경기",
  "42": "강원",
  "43": "충북",
  "44": "충남",
  "45": "전북",
  "46": "전남",
  "47": "경북",
  "48": "경남",
  "50": "제주",
  "51": "강원",
  "52": "전북",
};

type MapDistrictItem = {
  name: string;
  query: string;
  totalMarketCap: number;
  averageDelta: number;
  count: number;

  boardCount: number;
  isBoardBacked: boolean;

  primaryComplexId: string | null;
  primaryComplexName: string | null;
  primaryRank: number | null;

  peakComplexMarketCap: number;
  peakComplexName: string | null;
};

type CachedMapPayload = {
  ok: true;
  universeCode: string;
  requestedUniverseCode: string;
  renderedUniverseCode: string;
  mapScopeLabel: string;
  isFallback: boolean;
  fallbackMode: "none" | "stale-cache";
  source: "dynamic" | "stale-cache";
  count: number;
  items: MapDistrictItem[];
};

type CachedMapEntry = {
  freshUntil: number;
  staleUntil: number;
  payload: CachedMapPayload;
};

type ComplexRegionMapRow = {
  complex_id: number | string | null;
  lawd_cd: number | string | null;
  sgg_cd: number | string | null;
};

type ComplexScopeMeta = {
  fullLabel: string | null;
  shortLabel: string | null;
};

const mapCache = new Map<string, CachedMapEntry>();
const mapInflight = new Map<string, Promise<CachedMapPayload>>();

// 🚨 지차장 지시 A: 로그 다이어트용 헬퍼 및 상수 추가 🚨
const QUIET_MAP_LOG_WINDOW_MS = 180_000;
const quietMapLogAt = new Map<string, number>();

function shouldEmitQuietMapLog(key: string) {
  const now = Date.now();
  const last = quietMapLogAt.get(key) ?? 0;

  if (now - last < QUIET_MAP_LOG_WINDOW_MS) {
    return false;
  }

  quietMapLogAt.set(key, now);
  return true;
}

function logQuietMapFallback(
  key: string,
  message: string,
  payload: Record<string, unknown>,
) {
  const verbose = process.env.KOAPTIX_VERBOSE_FALLBACK_LOGS === "1";

  if (verbose || shouldEmitQuietMapLog(key)) {
    console.info(message, payload);
  }
}

const latestMapCooldownUntil = new Map<string, number>();

function isLatestMapCoolingDown(universeCode: string) {
  if (universeCode === DEFAULT_UNIVERSE_CODE) return false;

  const until = latestMapCooldownUntil.get(universeCode) ?? 0;
  if (until <= Date.now()) {
    latestMapCooldownUntil.delete(universeCode);
    return false;
  }

  return true;
}

function markLatestMapCooldown(universeCode: string) {
  if (universeCode === DEFAULT_UNIVERSE_CODE) return;
  latestMapCooldownUntil.set(universeCode, Date.now() + LATEST_MAP_COOLDOWN_MS);
}

function createServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function parseLimit(
  value: string | null,
  fallback: number,
  min = 20,
  max = MAP_MAX_LIMIT,
) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(Math.trunc(parsed), max));
}

function getDefaultMapLimit(universeCode: string) {
  return universeCode === DEFAULT_UNIVERSE_CODE
    ? MAP_DEFAULT_LIMIT_KOREA
    : MAP_DEFAULT_LIMIT_REGIONAL;
}

function getEffectiveRequestedLimit(
  requestedLimit: number,
  universeCode: string,
) {
  if (universeCode !== DEFAULT_UNIVERSE_CODE) {
    return requestedLimit;
  }

  if (requestedLimit <= 32) return 32;
  if (requestedLimit <= 52) return 52;
  return 88;
}

function getRetryLimits(requestedLimit: number) {
  const secondary = Math.max(20, Math.floor(requestedLimit * 0.7));

  return Array.from(
    new Set(
      [requestedLimit, secondary].filter(
        (n) => Number.isFinite(n) && n > 0 && n <= requestedLimit,
      ),
    ),
  );
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    if (!normalized) return null;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toNumber(value: unknown) {
  return toNullableNumber(value) ?? 0;
}

function getUniverseScopeLabel(universeCode: string) {
  if (universeCode.startsWith("SGG_")) {
    const prefix = universeCode.slice(4, 6);
    return SGG_PREFIX_SCOPE_LABELS[prefix] ?? "";
  }

  return UNIVERSE_SCOPE_LABELS[universeCode] ?? "";
}

function resolveScopePrefix(row: ComplexRegionMapRow) {
  if (row.sgg_cd != null && String(row.sgg_cd).trim() !== "") {
    return String(row.sgg_cd).slice(0, 2);
  }

  if (row.lawd_cd != null && String(row.lawd_cd).trim() !== "") {
    return String(row.lawd_cd).slice(0, 2);
  }

  return null;
}

function getScopeMetaByPrefix(prefix: string | null): ComplexScopeMeta {
  if (!prefix) {
    return {
      fullLabel: null,
      shortLabel: null,
    };
  }

  return {
    fullLabel: SGG_PREFIX_SCOPE_LABELS[prefix] ?? null,
    shortLabel: SGG_PREFIX_SCOPE_SHORT_LABELS[prefix] ?? null,
  };
}

function extractComplexIds(rows: any[]): number[] {
  return rows
    .map((row) => {
      const parsed = Number(row.complex_id);
      return Number.isFinite(parsed) ? parsed : null;
    })
    .filter((value): value is number => value !== null);
}

async function fetchComplexScopeMetaMap(
  supabase: ReturnType<typeof createServerSupabase>,
  complexIds: number[],
): Promise<Map<string, ComplexScopeMeta>> {
  if (complexIds.length === 0) return new Map();

  try {
    const { data, error } = await supabase
      .from("koaptix_complex_region_map")
      .select("complex_id, lawd_cd, sgg_cd")
      .in("complex_id", complexIds);

    if (error) throw error;

    const result = new Map<string, ComplexScopeMeta>();

    for (const row of (data ?? []) as ComplexRegionMapRow[]) {
      const key =
        row.complex_id === null || row.complex_id === undefined
          ? ""
          : String(row.complex_id);

      if (!key || result.has(key)) continue;

      result.set(key, getScopeMetaByPrefix(resolveScopePrefix(row)));
    }

    return result;
  } catch (error) {
    console.warn("[API /api/map] scope meta lookup failed:", error);
    return new Map();
  }
}

function buildRepresentativeQuery(
  row: any,
  universeCode: string,
  explicitScopeLabel?: string | null,
) {
  const scopeLabel = explicitScopeLabel ?? getUniverseScopeLabel(universeCode);
  const sigungu = row.sigungu_name?.trim?.() ?? "";
  const dong = row.legal_dong_name?.trim?.() ?? "";
  const aptName = row.apt_name_ko?.trim?.() ?? "";

  if (scopeLabel && sigungu && dong) return `${scopeLabel} ${sigungu} ${dong}`;
  if (scopeLabel && sigungu && aptName)
    return `${scopeLabel} ${sigungu} ${aptName}`;
  if (scopeLabel && sigungu) return `${scopeLabel} ${sigungu}`;

  if (sigungu && dong) return `${sigungu} ${dong}`;
  if (sigungu && aptName) return `${sigungu} ${aptName}`;
  if (sigungu) return sigungu;
  if (dong) return dong;
  return aptName;
}

function buildDistrictIdentity(
  row: any,
  universeCode: string,
  scopeMeta: ComplexScopeMeta | null,
) {
  const district =
    typeof row.sigungu_name === "string" ? row.sigungu_name.trim() : "";

  if (!district) {
    return {
      groupKey: "",
      displayName: "",
      query: "",
    };
  }

  if (universeCode === DEFAULT_UNIVERSE_CODE && scopeMeta?.shortLabel) {
    const displayName = `${scopeMeta.shortLabel} ${district}`;

    return {
      groupKey: displayName,
      displayName,
      query: buildRepresentativeQuery(
        row,
        universeCode,
        scopeMeta.fullLabel ?? null,
      ),
    };
  }

  return {
    groupKey: district,
    displayName: district,
    query: buildRepresentativeQuery(
      row,
      universeCode,
      scopeMeta?.fullLabel ?? null,
    ),
  };
}

function makeCacheKey(universeCode: string, limit: number) {
  return `${universeCode}::${limit}`;
}

function readFreshMapCache(cacheKey: string): CachedMapPayload | null {
  const cached = mapCache.get(cacheKey);
  if (!cached) return null;

  const now = Date.now();

  if (now > cached.staleUntil) {
    mapCache.delete(cacheKey);
    return null;
  }

  if (now > cached.freshUntil) {
    return null;
  }

  return cached.payload;
}

function readStaleMapCache(cacheKey: string): CachedMapPayload | null {
  const cached = mapCache.get(cacheKey);
  if (!cached) return null;

  const now = Date.now();

  if (now > cached.staleUntil) {
    mapCache.delete(cacheKey);
    return null;
  }

  return cached.payload;
}

function readAnyUniverseMapCache(
  universeCode: string,
): CachedMapPayload | null {
  const prefix = `${universeCode}::`;
  const now = Date.now();

  const candidates = Array.from(mapCache.entries())
    .filter(([key, entry]) => key.startsWith(prefix) && now <= entry.staleUntil)
    .sort((a, b) => b[1].freshUntil - a[1].freshUntil);

  if (candidates.length === 0) return null;
  return candidates[0][1].payload;
}

function writeMapCache(cacheKey: string, payload: CachedMapPayload) {
  const now = Date.now();

  mapCache.set(cacheKey, {
    freshUntil: now + MAP_CACHE_FRESH_TTL_MS,
    staleUntil: now + MAP_CACHE_STALE_TTL_MS,
    payload,
  });
}

async function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("MAP_TIMEOUT"));
    }, ms);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isTimeoutError(error: unknown) {
  return error instanceof Error && error.message === "MAP_TIMEOUT";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return "Unknown map error";
}

async function rowsToMapPayload(
  supabase: ReturnType<typeof createServerSupabase>,
  rows: any[],
  universeCode: string,
): Promise<CachedMapPayload> {
  const complexIds = extractComplexIds(rows);
  const scopeMetaMap =
    universeCode === DEFAULT_UNIVERSE_CODE
      ? await fetchComplexScopeMetaMap(supabase, complexIds)
      : new Map<string, ComplexScopeMeta>();

  const grouped = new Map<
    string,
    {
      name: string;
      query: string;
      totalMarketCap: number;
      totalDelta: number;
      count: number;
      boardCount: number;
      primaryComplexId: string | null;
      primaryComplexName: string | null;
      primaryRank: number | null;
      peakComplexMarketCap: number;
      peakComplexName: string | null;
    }
  >();

  for (const row of rows) {
    const complexId =
      row.complex_id === null || row.complex_id === undefined
        ? null
        : String(row.complex_id);

    const scopeMeta = complexId ? scopeMetaMap.get(complexId) ?? null : null;

    const { groupKey, displayName, query } = buildDistrictIdentity(
      row,
      universeCode,
      scopeMeta,
    );

    if (!groupKey || !displayName) continue;

    const rankAll = toNullableNumber(row.rank_all);
    const marketCap = toNumber(row.market_cap_krw);
    const delta = toNullableNumber(row.rank_delta_w) ?? 0;
    const complexName =
      typeof row.apt_name_ko === "string" ? row.apt_name_ko : null;

    const existing = grouped.get(groupKey);

    if (existing) {
      existing.totalMarketCap += marketCap;
      existing.totalDelta += delta;
      existing.count += 1;

      if (rankAll !== null && rankAll <= HOME_BOARD_TACTICAL_LIMIT) {
        existing.boardCount += 1;
      }

      if (!existing.query && query) {
        existing.query = query;
      }

      if (marketCap > existing.peakComplexMarketCap) {
        existing.peakComplexMarketCap = marketCap;
        existing.peakComplexName = complexName;
      }

      if (
        rankAll !== null &&
        (existing.primaryRank === null || rankAll < existing.primaryRank)
      ) {
        existing.primaryRank = rankAll;
        existing.primaryComplexId = complexId;
        existing.primaryComplexName = complexName;

        if (query) {
          existing.query = query;
        }
      }

      continue;
    }

    grouped.set(groupKey, {
      name: displayName,
      query,
      totalMarketCap: marketCap,
      totalDelta: delta,
      count: 1,
      boardCount:
        rankAll !== null && rankAll <= HOME_BOARD_TACTICAL_LIMIT ? 1 : 0,
      primaryComplexId: complexId,
      primaryComplexName: complexName,
      primaryRank: rankAll,
      peakComplexMarketCap: marketCap,
      peakComplexName: complexName,
    });
  }

  const items: MapDistrictItem[] = Array.from(grouped.values())
    .map((group) => ({
      name: group.name,
      query: group.query,
      totalMarketCap: group.totalMarketCap,
      averageDelta: group.count > 0 ? group.totalDelta / group.count : 0,
      count: group.count,
      boardCount: group.boardCount,
      isBoardBacked: group.boardCount > 0,
      primaryComplexId: group.primaryComplexId,
      primaryComplexName: group.primaryComplexName,
      primaryRank: group.primaryRank,
      peakComplexMarketCap: group.peakComplexMarketCap,
      peakComplexName: group.peakComplexName,
    }))
    .sort((a, b) => b.totalMarketCap - a.totalMarketCap);

  return {
    ok: true,
    universeCode,
    requestedUniverseCode: universeCode,
    renderedUniverseCode: universeCode,
    mapScopeLabel: getUniverseLabel(universeCode),
    isFallback: false,
    fallbackMode: "none",
    source: "dynamic",
    count: items.length,
    items,
  };
}

function withStaleMapIdentity(
  payload: CachedMapPayload,
  requestedUniverseCode: string,
): CachedMapPayload {
  return {
    ...payload,
    requestedUniverseCode,
    renderedUniverseCode: payload.universeCode,
    mapScopeLabel: getUniverseLabel(payload.universeCode),
    isFallback: payload.universeCode !== requestedUniverseCode,
    fallbackMode: "stale-cache",
    source: "stale-cache",
  };
}

async function fetchMapPayloadFromDynamic(
  supabase: ReturnType<typeof createServerSupabase>,
  universeCode: string,
  requestedLimit: number,
): Promise<CachedMapPayload> {
  const effectiveLimit = getEffectiveRequestedLimit(requestedLimit, universeCode);

  const { data: latestSnapshot, error: latestSnapshotError } = await supabase
    .from("koaptix_rank_snapshot")
    .select("snapshot_date")
    .eq("universe_code", universeCode)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestSnapshotError) {
    throw latestSnapshotError;
  }

  if (!latestSnapshot?.snapshot_date) {
    return {
      ok: true,
      universeCode,
      requestedUniverseCode: universeCode,
      renderedUniverseCode: universeCode,
      mapScopeLabel: getUniverseLabel(universeCode),
      isFallback: false,
      fallbackMode: "none",
      source: "dynamic",
      count: 0,
      items: [],
    };
  }

  let query = supabase
    .from("v_koaptix_universe_rank_history_dynamic")
    .select(
      `
        snapshot_date,
        universe_code,
        complex_id,
        apt_name_ko,
        sigungu_name,
        legal_dong_name,
        rank_all,
        market_cap_krw
      `,
    )
    .eq("universe_code", universeCode)
    .eq("snapshot_date", latestSnapshot.snapshot_date);

  if (universeCode === DEFAULT_UNIVERSE_CODE) {
    query = query.lte("rank_all", effectiveLimit);
  }

  const { data, error } = await query
    .order("rank_all", { ascending: true })
    .limit(effectiveLimit);

  if (error) {
    throw error;
  }

  const normalizedRows = (data ?? []).map((row: any) => ({
    ...row,
    rank_delta_w: null,
  }));

  return rowsToMapPayload(supabase, normalizedRows, universeCode);
}

async function fetchMapPayloadFromLatestBoard(
  supabase: ReturnType<typeof createServerSupabase>,
  universeCode: string,
  requestedLimit: number,
): Promise<CachedMapPayload> {
  const retryLimits = getRetryLimits(requestedLimit);
  let lastError: unknown = new Error("MAP_FAILED");

  for (const attemptLimit of retryLimits) {
    try {
      const queryPromise = supabase
        .from("v_koaptix_latest_universe_rank_board_u")
        .select(
          `
            universe_code,
            complex_id,
            apt_name_ko,
            sigungu_name,
            legal_dong_name,
            rank_all,
            rank_delta_w,
            market_cap_krw
          `,
        )
        .eq("universe_code", universeCode)
        .order("rank_all", { ascending: true })
        .limit(attemptLimit);

      const queryResult = await withTimeout<{
        data: any[] | null;
        error: { message: string } | null;
      }>(queryPromise, LATEST_MAP_TIMEOUT_MS_REGIONAL);

      const { data, error } = queryResult;
      if (error) throw error;

      latestMapCooldownUntil.delete(universeCode);

      return rowsToMapPayload(supabase, data ?? [], universeCode);
    } catch (error) {
      lastError = error;
      markLatestMapCooldown(universeCode);

      // 🚨 지차장 지시 B: latest attempt failed warn을 logQuietMapFallback으로 교체 🚨
      logQuietMapFallback(
        `map:latest-attempt:${universeCode}`,
        "[API /api/map] latest board attempt timed out",
        {
          universeCode,
          attemptLimit,
          message: getErrorMessage(error),
        },
      );

      break;
    }
  }

  throw lastError;
}

async function fetchMapPayload(
  supabase: ReturnType<typeof createServerSupabase>,
  universeCode: string,
  requestedLimit: number,
): Promise<CachedMapPayload> {
  if (universeCode === DEFAULT_UNIVERSE_CODE) {
    const payload = await withTimeout(
      fetchMapPayloadFromDynamic(supabase, universeCode, requestedLimit),
      DYNAMIC_MAP_TIMEOUT_MS_KOREA,
    );

    if (process.env.KOAPTIX_VERBOSE_FALLBACK_LOGS === "1") {
      console.info("[API /api/map] KOREA_ALL dynamic-only path hit", {
        universeCode,
        requestedLimit,
        count: payload.items.length,
      });
    }

    return payload;
  }

  // Regional client transitions avoid the slow latest-board cold path.
  return withTimeout(
    fetchMapPayloadFromDynamic(supabase, universeCode, requestedLimit),
    DYNAMIC_MAP_TIMEOUT_MS_REGIONAL,
  );
}

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();
  const searchParams = request.nextUrl.searchParams;

  const rawUniverseCode =
    searchParams.get("universe_code") ?? searchParams.get("universe");

  const universeCode = resolveServiceUniverseCode(
    rawUniverseCode ?? DEFAULT_UNIVERSE_CODE,
  );

  const limit = parseLimit(
    searchParams.get("limit"),
    getDefaultMapLimit(universeCode),
  );

  const cacheKey = makeCacheKey(universeCode, limit);

  const freshCached = readFreshMapCache(cacheKey);
  if (freshCached) {
    return NextResponse.json(freshCached, {
      headers: {
        "Cache-Control": "no-store",
        "X-Koaptix-Map-Cache": "fresh",
      },
    });
  }

  const reusedInflight = mapInflight.has(cacheKey);

  try {
    let inflight = mapInflight.get(cacheKey);

    if (!inflight) {
      inflight = fetchMapPayload(supabase, universeCode, limit)
        .then((payload) => {
          writeMapCache(cacheKey, payload);
          return payload;
        })
        .finally(() => {
          mapInflight.delete(cacheKey);
        });

      mapInflight.set(cacheKey, inflight);
    }

    const payload = await inflight;

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
        "X-Koaptix-Map-Cache": reusedInflight ? "inflight" : "live",
      },
    });
  } catch (error) {
    console.error("[API /api/map] failed:", {
      universeCode,
      limit,
      message: getErrorMessage(error),
      isTimeout: isTimeoutError(error),
    });

    const staleCached =
      readStaleMapCache(cacheKey) ?? readAnyUniverseMapCache(universeCode);

    if (staleCached) {
      return NextResponse.json(withStaleMapIdentity(staleCached, universeCode), {
        headers: {
          "Cache-Control": "no-store",
          "X-Koaptix-Map-Cache": "stale",
        },
      });
    }

    return NextResponse.json(
      {
        ok: false,
        universeCode,
        requestedUniverseCode: universeCode,
        renderedUniverseCode: universeCode,
        mapScopeLabel: getUniverseLabel(universeCode),
        isFallback: false,
        fallbackMode: "miss",
        source: "miss",
        count: 0,
        items: [],
        message: getErrorMessage(error),
      },
      {
        status: isTimeoutError(error) ? 504 : 500,
        headers: {
          "Cache-Control": "no-store",
          "X-Koaptix-Map-Cache": "miss",
        },
      },
    );
  }
}
