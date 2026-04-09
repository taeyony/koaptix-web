import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  DEFAULT_UNIVERSE_CODE,
  normalizeUniverseCode,
} from "../../../lib/koaptix/universes";
import type { RankingItem } from "../../../lib/koaptix/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
/**
 * Home tactical board delivery only.
 * Do not revert to legacy board source.
 * Source of truth:
 * koaptix_rank_snapshot
 * -> v_koaptix_universe_rank_history_dynamic
 * -> v_koaptix_latest_universe_rank_board_u
 */
const HOME_DEFAULT_LIMIT = 20;
const HOME_MAX_LIMIT = 20;

const BOARD_CACHE_FRESH_TTL_MS = 20_000;
const BOARD_CACHE_STALE_TTL_MS = 180_000;
const QUERY_TIMEOUT_MS = 3_400;

type CachedBoardPayload = {
  ok: true;
  universeCode: string;
  count: number;
  items: RankingItem[];
};

type CachedBoardEntry = {
  freshUntil: number;
  staleUntil: number;
  payload: CachedBoardPayload;
};

const boardCache = new Map<string, CachedBoardEntry>();
const boardInflight = new Map<string, Promise<CachedBoardPayload>>();

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
  min = 1,
  max = HOME_MAX_LIMIT,
) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(Math.trunc(parsed), max));
}

function getRetryLimits(requestedLimit: number) {
  const candidates = [requestedLimit, 16, 12, 8];
  return Array.from(
    new Set(
      candidates.filter(
        (n) => Number.isFinite(n) && n > 0 && n <= Math.max(requestedLimit, 8),
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

function toRankingItem(row: any, universeCode: string): RankingItem {
  const buildYear = toNullableNumber(row.build_year ?? row.approval_year);

  return {
    complexId: String(row.complex_id ?? row.id),

    name: row.apt_name_ko ?? row.name ?? "",
    apt_name_ko: row.apt_name_ko ?? row.name ?? "",

    rank: row.rank_all ?? row.rank ?? 0,
    rank_all: row.rank_all ?? row.rank ?? 0,

    sigunguName: row.sigungu_name ?? "",
    sigungu_name: row.sigungu_name ?? "",

    legalDongName: row.legal_dong_name ?? "",
    legal_dong_name: row.legal_dong_name ?? "",

    marketCapKrw: row.market_cap_krw ?? 0,
    market_cap_krw: row.market_cap_krw ?? 0,

    marketCapTrillionKrw: row.market_cap_trillion_krw ?? 0,
    market_cap_trillion_krw: row.market_cap_trillion_krw ?? 0,

    rankDelta7d: toNullableNumber(row.rank_delta_w ?? row.rank_delta_7d),
    rank_delta_w: toNullableNumber(row.rank_delta_w ?? row.rank_delta_7d),

    rankMovement: row.rank_movement ?? null,
    rank_movement: row.rank_movement ?? null,

    previousRankAll: toNullableNumber(row.previous_rank_all),
    previous_rank_all: toNullableNumber(row.previous_rank_all),

    recoveryRate52w: toNullableNumber(
      row.recovery_52w ?? row.recovery_rate_52w,
    ),
    recovery_52w: toNullableNumber(
      row.recovery_52w ?? row.recovery_rate_52w,
    ),

    locationLabel: [
      row.sigungu_name ?? "",
      row.legal_dong_name ?? "",
      row.apt_name_ko ?? "",
    ]
      .filter(Boolean)
      .join(" "),

    households: toNullableNumber(
      row.household_count ?? row.total_household_count ?? row.households,
    ),
    household_count: toNullableNumber(
      row.household_count ?? row.total_household_count ?? row.households,
    ),

    buildYear,
    build_year: buildYear,

    ageYears: buildYear ? new Date().getFullYear() - buildYear : null,
    age_years: buildYear ? new Date().getFullYear() - buildYear : null,

    universeCode: row.universe_code ?? universeCode,
    universe_code: row.universe_code ?? universeCode,
    universeName: row.universe_name ?? null,
    universe_name: row.universe_name ?? null,
  } as unknown as RankingItem;
}

function makeCacheKey(universeCode: string, limit: number) {
  return `${universeCode}::${limit}`;
}

function readFreshBoardCache(cacheKey: string): CachedBoardPayload | null {
  const cached = boardCache.get(cacheKey);
  if (!cached) return null;

  const now = Date.now();

  if (now > cached.staleUntil) {
    boardCache.delete(cacheKey);
    return null;
  }

  if (now > cached.freshUntil) {
    return null;
  }

  return cached.payload;
}

function readStaleBoardCache(cacheKey: string): CachedBoardPayload | null {
  const cached = boardCache.get(cacheKey);
  if (!cached) return null;

  const now = Date.now();

  if (now > cached.staleUntil) {
    boardCache.delete(cacheKey);
    return null;
  }

  return cached.payload;
}

function readAnyUniverseBoardCache(
  universeCode: string,
): CachedBoardPayload | null {
  const prefix = `${universeCode}::`;
  const now = Date.now();

  const candidates = Array.from(boardCache.entries())
    .filter(([key, entry]) => key.startsWith(prefix) && now <= entry.staleUntil)
    .sort((a, b) => b[1].freshUntil - a[1].freshUntil);

  if (candidates.length === 0) return null;
  return candidates[0][1].payload;
}

function writeBoardCache(cacheKey: string, payload: CachedBoardPayload) {
  const now = Date.now();

  boardCache.set(cacheKey, {
    freshUntil: now + BOARD_CACHE_FRESH_TTL_MS,
    staleUntil: now + BOARD_CACHE_STALE_TTL_MS,
    payload,
  });
}

async function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("RANKINGS_TIMEOUT"));
    }, ms);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isTimeoutError(error: unknown) {
  return error instanceof Error && error.message === "RANKINGS_TIMEOUT";
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

  return "Unknown rankings error";
}

async function fetchBoardPayload(
  supabase: ReturnType<typeof createServerSupabase>,
  universeCode: string,
  requestedLimit: number,
): Promise<CachedBoardPayload> {
  const retryLimits = getRetryLimits(requestedLimit);
  let lastError: unknown = new Error("RANKINGS_FAILED");

  for (const attemptLimit of retryLimits) {
    try {
      const queryPromise = supabase
        .from("v_koaptix_latest_universe_rank_board_u")
        .select(
          `
            universe_code,
            universe_name,
            complex_id,
            apt_name_ko,
            sigungu_name,
            legal_dong_name,
            rank_all,
            previous_rank_all,
            rank_delta_w,
            rank_movement,
            market_cap_krw,
            market_cap_trillion_krw,
            household_count,
            total_household_count,
            build_year,
            recovery_52w
          `,
        )
        .eq("universe_code", universeCode)
        .order("rank_all", { ascending: true })
        .limit(attemptLimit);

      const queryResult = await withTimeout<{
        data: any[] | null;
        error: { message: string } | null;
      }>(queryPromise, QUERY_TIMEOUT_MS);

      const { data, error } = queryResult;
      if (error) throw error;

      const items = (data ?? []).map((row: any) =>
        toRankingItem(row, universeCode),
      );

      return {
        ok: true,
        universeCode,
        count: items.length,
        items,
      };
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

  const limit = parseLimit(searchParams.get("limit"), HOME_DEFAULT_LIMIT);
  const cacheKey = makeCacheKey(universeCode, limit);

  const freshCached = readFreshBoardCache(cacheKey);
  if (freshCached) {
    return NextResponse.json(freshCached, {
      headers: {
        "Cache-Control": "no-store",
        "X-Koaptix-Cache": "fresh",
      },
    });
  }

  const reusedInflight = boardInflight.has(cacheKey);

  try {
    let inflight = boardInflight.get(cacheKey);

    if (!inflight) {
      inflight = fetchBoardPayload(supabase, universeCode, limit)
        .then((payload) => {
          writeBoardCache(cacheKey, payload);
          return payload;
        })
        .finally(() => {
          boardInflight.delete(cacheKey);
        });

      boardInflight.set(cacheKey, inflight);
    }

    const payload = await inflight;

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
        "X-Koaptix-Cache": reusedInflight ? "inflight" : "live",
      },
    });
  } catch (error) {
    console.error("[API /api/rankings] failed:", {
      universeCode,
      limit,
      message: getErrorMessage(error),
      isTimeout: isTimeoutError(error),
    });

    const staleCached =
      readStaleBoardCache(cacheKey) ?? readAnyUniverseBoardCache(universeCode);

    if (staleCached) {
      return NextResponse.json(staleCached, {
        headers: {
          "Cache-Control": "no-store",
          "X-Koaptix-Cache": "stale",
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
          "X-Koaptix-Cache": "miss",
        },
      },
    );
  }
}