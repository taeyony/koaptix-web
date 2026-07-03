/**
 * Tactical ranking delivery route.
 * 특정 macro timeout은 readiness 문제와 분리해 cold-path delivery 이슈로 본다.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Route role marker:
 * - /api/rankings is the home lightweight tactical board endpoint.
 * - It is intentionally capped for fast regional transitions.
 * - Canonical request contract is universe_code.
 * - Do not merge with /api/ranking; TOP1000 uses the full-board route.
 */

import {
  DEFAULT_UNIVERSE_CODE,
  buildUniverseResolutionMetadata,
  resolveUniverseRequest,
  type UniverseRequestResolution,
} from "../../../lib/koaptix/universes";
import type { RankingItem } from "../../../lib/koaptix/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HOME_DEFAULT_LIMIT = 20;
const HOME_MAX_LIMIT = 20;

const BOARD_CACHE_FRESH_TTL_MS = 60_000;
const BOARD_CACHE_STALE_TTL_MS = 600_000;
const BOARD_SUCCESS_CACHE_CONTROL =
  "public, max-age=15, s-maxage=60, stale-while-revalidate=600";
const BOARD_ERROR_CACHE_CONTROL = "no-store";

const LATEST_BOARD_TIMEOUT_MS_KOREA = 1_800;
const LATEST_BOARD_TIMEOUT_MS_REGIONAL = 1_100;
const DYNAMIC_BOARD_TIMEOUT_MS_KOREA = 7_000;
const DYNAMIC_BOARD_TIMEOUT_MS_REGIONAL = 4_500;

const LATEST_BOARD_COOLDOWN_MS = 180_000;

type CachedBoardPayload = {
  ok: true;
  universeCode: string;
  requestedUniverseCode: string;
  renderedUniverseCode: string;
  requestedLimit: number;
  renderedLimit: number;
  resultCount: number;
  source: "live_dynamic_fallback" | "live_latest" | "empty_degraded";
  cacheState: "bypassed";
  fallbackMode:
    | "none"
    | "same_universe_dynamic_degraded"
    | "same_universe_empty_degraded";
  fallbackUsed: boolean;
  degraded: boolean;
  reason?: string | null;
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

// 🚨 지차장 지시 A: 로그 다이어트용 헬퍼 및 상수 추가 🚨
const QUIET_RANKINGS_LOG_WINDOW_MS = 180_000;
const quietRankingsLogAt = new Map<string, number>();

function shouldEmitQuietRankingsLog(key: string) {
  const now = Date.now();
  const last = quietRankingsLogAt.get(key) ?? 0;

  if (now - last < QUIET_RANKINGS_LOG_WINDOW_MS) {
    return false;
  }

  quietRankingsLogAt.set(key, now);
  return true;
}

function logQuietRankingsFallback(
  key: string,
  message: string,
  payload: Record<string, unknown>,
) {
  const verbose = process.env.KOAPTIX_VERBOSE_FALLBACK_LOGS === "1";

  if (verbose || shouldEmitQuietRankingsLog(key)) {
    console.info(message, payload);
  }
}

const latestBoardCooldownUntil = new Map<string, number>();

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

function getEffectiveBoardLimit(requestedLimit: number, universeCode: string) {
  if (universeCode === DEFAULT_UNIVERSE_CODE) {
    return Math.min(requestedLimit, 12);
  }

  return requestedLimit;
}

function getRetryLimits(requestedLimit: number) {
  const secondary = Math.max(8, Math.min(requestedLimit, 12));

  return Array.from(
    new Set(
      [requestedLimit, secondary].filter(
        (n) => Number.isFinite(n) && n > 0 && n <= requestedLimit,
      ),
    ),
  );
}

function isLatestBoardCoolingDown(universeCode: string) {
  if (universeCode === DEFAULT_UNIVERSE_CODE) return false;

  const until = latestBoardCooldownUntil.get(universeCode) ?? 0;
  if (until <= Date.now()) {
    latestBoardCooldownUntil.delete(universeCode);
    return false;
  }

  return true;
}

function markLatestBoardCooldown(universeCode: string) {
  if (universeCode === DEFAULT_UNIVERSE_CODE) return;
  latestBoardCooldownUntil.set(
    universeCode,
    Date.now() + LATEST_BOARD_COOLDOWN_MS,
  );
}

function clearLatestBoardCooldown(universeCode: string) {
  latestBoardCooldownUntil.delete(universeCode);
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

function withBoardDeliveryState(
  payload: CachedBoardPayload,
  options: {
    cacheState: "fresh" | "stale_exact" | "stale_any_limit";
    fallbackMode:
      | "none"
      | "exact_same_universe_stale"
      | "same_universe_stale_any_limit";
    source?: "stale_cache" | "stale_cache_any_limit";
  },
) {
  return {
    ...payload,
    requestedUniverseCode: payload.universeCode,
    renderedUniverseCode: payload.universeCode,
    resultCount: payload.items.length,
    cacheState: options.cacheState,
    fallbackMode: options.fallbackMode,
    source: options.source ?? payload.source,
    fallbackUsed: payload.fallbackUsed || options.fallbackMode !== "none",
    degraded: payload.degraded || options.fallbackMode !== "none",
  };
}

function buildEmptyDegradedBoardPayload(
  universeCode: string,
  requestedLimit: number,
  message?: string,
) {
  return {
    ok: true,
    universeCode,
    requestedUniverseCode: universeCode,
    renderedUniverseCode: universeCode,
    requestedLimit,
    renderedLimit: 0,
    resultCount: 0,
    source: "empty_degraded",
    cacheState: "miss",
    fallbackMode: "same_universe_empty_degraded",
    fallbackUsed: true,
    degraded: true,
    reason: message ?? null,
    count: 0,
    items: [],
    message,
  };
}

function buildUnavailableBoardPayload(
  resolution: UniverseRequestResolution,
  requestedLimit: number,
) {
  return {
    ok: true,
    ...buildUniverseResolutionMetadata(resolution),
    requestedLimit,
    renderedLimit: 0,
    resultCount: 0,
    source: "empty_degraded",
    cacheState: "miss",
    fallbackMode: "none",
    fallbackUsed: false,
    degraded: false,
    count: 0,
    items: [],
    message: resolution.reason ?? "universe_unavailable",
  };
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

function buildTierMeta(rankAll: number | null) {
  if (rankAll === null) {
    return {
      tier_code: "E",
      tier_label: "Top 1000+",
      tier_sort: 6,
      is_top1000: false,
    };
  }

  if (rankAll <= 10) {
    return {
      tier_code: "S",
      tier_label: "Top 10",
      tier_sort: 1,
      is_top1000: true,
    };
  }

  if (rankAll <= 50) {
    return {
      tier_code: "A",
      tier_label: "Top 50",
      tier_sort: 2,
      is_top1000: true,
    };
  }

  if (rankAll <= 100) {
    return {
      tier_code: "B",
      tier_label: "Top 100",
      tier_sort: 3,
      is_top1000: true,
    };
  }

  if (rankAll <= 300) {
    return {
      tier_code: "C",
      tier_label: "Top 300",
      tier_sort: 4,
      is_top1000: true,
    };
  }

  if (rankAll <= 1000) {
    return {
      tier_code: "D",
      tier_label: "Top 1000",
      tier_sort: 5,
      is_top1000: true,
    };
  }

  return {
    tier_code: "E",
    tier_label: "Top 1000+",
    tier_sort: 6,
    is_top1000: false,
  };
}

async function fetchBoardPayloadFromDynamic(
  supabase: ReturnType<typeof createServerSupabase>,
  universeCode: string,
  requestedLimit: number,
): Promise<CachedBoardPayload> {
  const effectiveLimit = getEffectiveBoardLimit(requestedLimit, universeCode);

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
      requestedLimit,
      renderedLimit: 0,
      resultCount: 0,
      source: "empty_degraded",
      cacheState: "bypassed",
      fallbackMode: "same_universe_empty_degraded",
      fallbackUsed: true,
      degraded: true,
      reason: "dynamic_latest_snapshot_missing",
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
        universe_name,
        universe_scope,
        complex_id,
        apt_name_ko,
        sigungu_name,
        legal_dong_name,
        build_year,
        household_count,
        total_household_count,
        recovery_52w,
        rank_all,
        market_cap_krw,
        market_cap_trillion_krw,
        market_cap_share,
        market_cap_share_pct
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

  const items = (data ?? []).map((row: any) => {
    const rankAll = toNullableNumber(row.rank_all);
    const tier = buildTierMeta(rankAll);

    return toRankingItem(
      {
        ...row,
        previous_rank_all: null,
        rank_delta_w: null,
        rank_movement: null,
        ...tier,
      },
      universeCode,
    );
  });

  return {
    ok: true,
    universeCode,
    requestedUniverseCode: universeCode,
    renderedUniverseCode: universeCode,
    requestedLimit,
    renderedLimit: effectiveLimit,
    resultCount: items.length,
    source: "live_dynamic_fallback",
    cacheState: "bypassed",
    fallbackMode: "same_universe_dynamic_degraded",
    fallbackUsed: true,
    degraded: true,
    reason: "latest_board_dynamic_fallback",
    count: items.length,
    items,
  };
}

async function fetchBoardPayloadFromLatestBoard(
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
      }>(
        queryPromise,
        universeCode === DEFAULT_UNIVERSE_CODE
          ? LATEST_BOARD_TIMEOUT_MS_KOREA
          : LATEST_BOARD_TIMEOUT_MS_REGIONAL,
      );

      const { data, error } = queryResult;
      if (error) throw error;

      clearLatestBoardCooldown(universeCode);

      const items = (data ?? []).map((row: any) =>
        toRankingItem(row, universeCode),
      );

      if (items.length === 0) {
        throw new Error("LATEST_BOARD_EMPTY_DYNAMIC_FALLBACK");
      }

      return {
        ok: true,
        universeCode,
        requestedUniverseCode: universeCode,
        renderedUniverseCode: universeCode,
        requestedLimit,
        renderedLimit: attemptLimit,
        resultCount: items.length,
        source: "live_latest",
        cacheState: "bypassed",
        fallbackMode: "none",
        fallbackUsed: false,
        degraded: false,
        reason: null,
        count: items.length,
        items,
      };
    } catch (error) {
      lastError = error;
      markLatestBoardCooldown(universeCode);

      // 🚨 지차장 지시 B: latest attempt failed warn 교체 🚨
      logQuietRankingsFallback(
        `rankings:latest-attempt:${universeCode}`,
        "[API /api/rankings] latest board attempt timed out",
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

async function fetchBoardPayload(
  supabase: ReturnType<typeof createServerSupabase>,
  universeCode: string,
  requestedLimit: number,
): Promise<CachedBoardPayload> {
  if (!isLatestBoardCoolingDown(universeCode)) {
    try {
      return await fetchBoardPayloadFromLatestBoard(
        supabase,
        universeCode,
        requestedLimit,
      );
    } catch (error) {
      logQuietRankingsFallback(
        `rankings:dynamic-fallback:${universeCode}`,
        "[API /api/rankings] using same-universe dynamic fallback",
        {
          universeCode,
          requestedLimit,
          message: getErrorMessage(error),
        },
      );
    }
  }

  const dynamicTimeoutMs =
    universeCode === DEFAULT_UNIVERSE_CODE
      ? DYNAMIC_BOARD_TIMEOUT_MS_KOREA
      : DYNAMIC_BOARD_TIMEOUT_MS_REGIONAL;

  return withTimeout<CachedBoardPayload>(
    fetchBoardPayloadFromDynamic(supabase, universeCode, requestedLimit),
    dynamicTimeoutMs,
  );
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const rawUniverseCode =
    searchParams.get("universe_code") ?? searchParams.get("universe");

  const limit = parseLimit(searchParams.get("limit"), HOME_DEFAULT_LIMIT);
  const universeResolution = resolveUniverseRequest(rawUniverseCode, {
    capability: "home",
  });

  if (universeResolution.universeUnavailable) {
    return NextResponse.json(
      buildUnavailableBoardPayload(universeResolution, limit),
      {
        headers: {
          "Cache-Control": BOARD_ERROR_CACHE_CONTROL,
          "X-Koaptix-Cache": "unavailable",
        },
      },
    );
  }

  const universeCode = universeResolution.renderedUniverseCode;
  const cacheKey = makeCacheKey(universeCode, limit);

  const freshCached = readFreshBoardCache(cacheKey);
  if (freshCached) {
    return NextResponse.json(
      withBoardDeliveryState(freshCached, {
        cacheState: "fresh",
        fallbackMode: "none",
      }),
      {
        headers: {
          "Cache-Control": BOARD_SUCCESS_CACHE_CONTROL,
          "X-Koaptix-Cache": "fresh",
        },
      },
    );
  }

  const reusedInflight = boardInflight.has(cacheKey);

  try {
    const supabase = createServerSupabase();
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

    return NextResponse.json(
      {
        ...payload,
        cacheState: "bypassed",
        resultCount: payload.items.length,
      },
      {
        headers: {
          "Cache-Control": BOARD_SUCCESS_CACHE_CONTROL,
          "X-Koaptix-Cache": reusedInflight ? "inflight" : "live",
        },
      },
    );
  } catch (error) {
    console.error("[API /api/rankings] failed:", {
      universeCode,
      limit,
      message: getErrorMessage(error),
      isTimeout: isTimeoutError(error),
    });

    const exactStaleCached = readStaleBoardCache(cacheKey);
    const anyLimitStaleCached =
      exactStaleCached ? null : readAnyUniverseBoardCache(universeCode);
    const staleCached = exactStaleCached ?? anyLimitStaleCached;

    if (staleCached) {
      if (staleCached.universeCode !== universeCode) {
        return NextResponse.json(
          buildEmptyDegradedBoardPayload(
            universeCode,
            limit,
            "Stale cache identity mismatch",
          ),
          {
            headers: {
              "Cache-Control": BOARD_ERROR_CACHE_CONTROL,
              "X-Koaptix-Cache": "miss",
            },
          },
        );
      }

      return NextResponse.json(
        withBoardDeliveryState(staleCached, {
          cacheState: exactStaleCached ? "stale_exact" : "stale_any_limit",
          fallbackMode: exactStaleCached
            ? "exact_same_universe_stale"
            : "same_universe_stale_any_limit",
          source: exactStaleCached ? "stale_cache" : "stale_cache_any_limit",
        }),
        {
          headers: {
            "Cache-Control": BOARD_SUCCESS_CACHE_CONTROL,
            "X-Koaptix-Cache": exactStaleCached
              ? "stale-exact"
              : "stale-any-limit",
          },
        },
      );
    }

    return NextResponse.json(
      buildEmptyDegradedBoardPayload(universeCode, limit, getErrorMessage(error)),
      {
        status: isTimeoutError(error) ? 504 : 500,
        headers: {
          "Cache-Control": BOARD_ERROR_CACHE_CONTROL,
          "X-Koaptix-Cache": "miss",
        },
      },
    );
  }
}
