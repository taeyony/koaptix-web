import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  DEFAULT_UNIVERSE_CODE,
  normalizeUniverseCode,
} from "../../../lib/koaptix/universes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Home tactical radar delivery only.
 * Keep source of truth on v_koaptix_latest_universe_rank_board_u.
 * Solve timeouts by lighter limits / cache / retry, not by source rollback.
 */
const HOME_BOARD_TACTICAL_LIMIT = 20;

const MAP_DEFAULT_LIMIT_KOREA = 160;
const MAP_DEFAULT_LIMIT_REGIONAL = 72;
const MAP_MAX_LIMIT = 220;

const MAP_CACHE_FRESH_TTL_MS = 45_000;
const MAP_CACHE_STALE_TTL_MS = 300_000;
const MAP_QUERY_TIMEOUT_MS = 2_200;

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
  count: number;
  items: MapDistrictItem[];
};

type CachedMapEntry = {
  freshUntil: number;
  staleUntil: number;
  payload: CachedMapPayload;
};

const mapCache = new Map<string, CachedMapEntry>();
const mapInflight = new Map<string, Promise<CachedMapPayload>>();

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

function getRetryLimits(requestedLimit: number, universeCode: string) {
  const floor = universeCode === DEFAULT_UNIVERSE_CODE ? 60 : 36;

  const candidates = [
    requestedLimit,
    Math.max(Math.floor(requestedLimit * 0.75), floor),
    Math.max(Math.floor(requestedLimit * 0.56), floor),
    floor,
  ];

  return Array.from(
    new Set(
      candidates
        .map((n) => Math.max(20, Math.min(n, requestedLimit)))
        .filter((n) => Number.isFinite(n) && n > 0),
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

function buildRepresentativeQuery(row: any) {
  const sigungu = row.sigungu_name?.trim?.() ?? "";
  const dong = row.legal_dong_name?.trim?.() ?? "";
  const aptName = row.apt_name_ko?.trim?.() ?? "";

  if (sigungu && dong) return `${sigungu} ${dong}`;
  if (sigungu && aptName) return `${sigungu} ${aptName}`;
  if (sigungu) return sigungu;
  if (dong) return dong;
  return aptName;
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

function rowsToMapPayload(
  rows: any[],
  universeCode: string,
): CachedMapPayload {
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
    const district =
      typeof row.sigungu_name === "string" ? row.sigungu_name.trim() : "";

    if (!district) continue;

    const rankAll = toNullableNumber(row.rank_all);
    const marketCap = toNumber(row.market_cap_krw);
    const delta = toNullableNumber(row.rank_delta_w) ?? 0;
    const query = buildRepresentativeQuery(row);
    const complexId =
      row.complex_id === null || row.complex_id === undefined
        ? null
        : String(row.complex_id);
    const complexName =
      typeof row.apt_name_ko === "string" ? row.apt_name_ko : null;

    const existing = grouped.get(district);

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

    grouped.set(district, {
      name: district,
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
    count: items.length,
    items,
  };
}

async function fetchMapPayload(
  supabase: ReturnType<typeof createServerSupabase>,
  universeCode: string,
  requestedLimit: number,
): Promise<CachedMapPayload> {
  const retryLimits = getRetryLimits(requestedLimit, universeCode);
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
      }>(queryPromise, MAP_QUERY_TIMEOUT_MS);

      const { data, error } = queryResult;
      if (error) throw error;

      return rowsToMapPayload(data ?? [], universeCode);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();
  const searchParams = request.nextUrl.searchParams;

  const rawUniverseCode =
    searchParams.get("universe_code") ?? searchParams.get("universe");

  const universeCode = normalizeUniverseCode(
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
      return NextResponse.json(staleCached, {
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