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
import {
  requireUniformUniverseServicePublication,
  type KoaptixPublicationSelectionIdentity,
} from "../../../lib/koaptix/currentness";
import type { PublishedRankingItem } from "../../../lib/koaptix/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HOME_DEFAULT_LIMIT = 20;
const HOME_MAX_LIMIT = 20;

const BOARD_CACHE_CONTROL = "private, no-store, max-age=0";

const LATEST_BOARD_TIMEOUT_MS_KOREA = 1_800;
const LATEST_BOARD_TIMEOUT_MS_REGIONAL = 1_100;
const SIDO_IDENTITY_HYDRATION_TIMEOUT_MS = 700;
const SIDO_IDENTITY_ROWS_PER_COMPLEX_CAP = 4;

const SIDO_NAME_BY_ADMIN_PREFIX: Readonly<Record<string, string>> = {
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

type ComplexRegionIdentityRow = {
  complex_id: number | string | null;
  lawd_cd: number | string | null;
  sgg_cd: number | string | null;
};

type SidoIdentityAccumulator = {
  cityName: string | null;
  evidenceCount: number;
  invalidOrConflicting: boolean;
};

type BoardPayload = KoaptixPublicationSelectionIdentity & {
  ok: true;
  universeCode: string;
  requestedUniverseCode: string;
  renderedUniverseCode: string;
  requestedLimit: number;
  renderedLimit: number;
  resultCount: number;
  source: "live_latest";
  cacheState: "bypassed";
  fallbackMode: "none";
  fallbackUsed: boolean;
  degraded: boolean;
  reason?: string | null;
  count: number;
  items: PublishedRankingItem[];
};

// 🚨 지차장 지시 A: 로그 다이어트용 헬퍼 및 상수 추가 🚨
function logQuietRankingsFallback(
  key: string,
  message: string,
  payload: Record<string, unknown>,
) {
  console.info(message, { key, ...payload });
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
  min = 1,
  max = HOME_MAX_LIMIT,
) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(Math.trunc(parsed), max));
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

function toRankingItem(row: any, universeCode: string): PublishedRankingItem {
  const buildYear = toNullableNumber(row.build_year ?? row.approval_year);
  const cityName =
    typeof row.city_name === "string" && row.city_name.trim()
      ? row.city_name.trim()
      : undefined;

  return {
    generation_id: row.generation_id,
    publication_version: row.publication_version,
    publication_event_id: row.publication_event_id,
    published_at: row.published_at,
    surface_code: "UNIVERSE_SERVICE",
    complexId: String(row.complex_id ?? row.id),
    name: row.apt_name_ko ?? row.name ?? "",
    apt_name_ko: row.apt_name_ko ?? row.name ?? "",
    rank: row.rank_all ?? row.rank ?? 0,
    rank_all: row.rank_all ?? row.rank ?? 0,
    sigunguName: row.sigungu_name ?? "",
    sigungu_name: row.sigungu_name ?? "",
    legalDongName: row.legal_dong_name ?? "",
    legal_dong_name: row.legal_dong_name ?? "",
    cityName,
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
  };
}

function buildEmptyDegradedBoardPayload(
  universeCode: string,
  requestedLimit: number,
  message?: string,
) {
  return {
    ok: false,
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
    ok: false,
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

function normalizeComplexId(value: unknown): string | null {
  const normalized = String(value ?? "").trim();
  return /^\d+$/.test(normalized) ? normalized : null;
}

function resolveAuthoritativeSggCode(
  row: ComplexRegionIdentityRow,
): string | null {
  const rawSggCode = String(row.sgg_cd ?? "").trim();
  const rawLawdCode = String(row.lawd_cd ?? "").trim();
  const sggCode = /^\d{5}$/.test(rawSggCode) ? rawSggCode : null;
  const lawdSggCode = /^\d{5,10}$/.test(rawLawdCode)
    ? rawLawdCode.slice(0, 5)
    : null;

  if (rawSggCode && !sggCode) return null;
  if (rawLawdCode && !lawdSggCode) return null;
  if (sggCode && lawdSggCode && sggCode !== lawdSggCode) return null;

  return sggCode ?? lawdSggCode;
}

async function fetchAuthoritativeSidoByComplexId(
  supabase: ReturnType<typeof createServerSupabase>,
  rows: any[],
): Promise<Map<string, string>> {
  const complexIds = Array.from(
    new Set(
      rows
        .map((row) => normalizeComplexId(row.complex_id))
        .filter((value): value is string => value !== null),
    ),
  );

  if (complexIds.length === 0) return new Map();

  try {
    const hydrationQuery = supabase
      .from("koaptix_complex_region_map")
      .select("complex_id, lawd_cd, sgg_cd")
      .in("complex_id", complexIds)
      .limit(
        complexIds.length * SIDO_IDENTITY_ROWS_PER_COMPLEX_CAP + 1,
      );

    const { data, error } = await withTimeout<{
      data: ComplexRegionIdentityRow[] | null;
      error: { message: string } | null;
    }>(hydrationQuery, SIDO_IDENTITY_HYDRATION_TIMEOUT_MS);

    if (error) throw error;
    if (
      (data?.length ?? 0) >
      complexIds.length * SIDO_IDENTITY_ROWS_PER_COMPLEX_CAP
    ) {
      throw new Error("RANKINGS_SIDO_IDENTITY_HYDRATION_ROW_CAP_EXCEEDED");
    }

    const requestedIds = new Set(complexIds);
    const accumulated = new Map<string, SidoIdentityAccumulator>();

    for (const row of data ?? []) {
      const complexId = normalizeComplexId(row.complex_id);
      if (!complexId || !requestedIds.has(complexId)) continue;

      const sggCode = resolveAuthoritativeSggCode(row);
      const cityName = sggCode
        ? SIDO_NAME_BY_ADMIN_PREFIX[sggCode.slice(0, 2)] ?? null
        : null;
      const previous = accumulated.get(complexId);

      if (!previous) {
        accumulated.set(complexId, {
          cityName,
          evidenceCount: 1,
          invalidOrConflicting: cityName === null,
        });
        continue;
      }

      previous.evidenceCount += 1;
      if (previous.evidenceCount > SIDO_IDENTITY_ROWS_PER_COMPLEX_CAP) {
        previous.invalidOrConflicting = true;
        previous.cityName = null;
        continue;
      }

      if (
        cityName === null ||
        previous.cityName === null ||
        previous.cityName !== cityName
      ) {
        previous.invalidOrConflicting = true;
        previous.cityName = null;
      }
    }

    const result = new Map<string, string>();
    for (const [complexId, identity] of accumulated) {
      if (!identity.invalidOrConflicting && identity.cityName) {
        result.set(complexId, identity.cityName);
      }
    }

    return result;
  } catch (error) {
    logQuietRankingsFallback(
      "rankings:sido-identity-hydration",
      "[API /api/rankings] SIDO identity hydration unavailable",
      {
        complexCount: complexIds.length,
        message: getErrorMessage(error),
      },
    );
    return new Map();
  }
}

async function fetchBoardPayloadFromLatestBoard(
  supabase: ReturnType<typeof createServerSupabase>,
  universeCode: string,
  requestedLimit: number,
): Promise<BoardPayload> {
  const retryLimits = getRetryLimits(requestedLimit);
  let lastError: unknown = new Error("RANKINGS_FAILED");

  for (const attemptLimit of retryLimits) {
    try {
      const queryPromise = supabase
        .from("v_koaptix_latest_board_read_model_published")
        .select(
          `
            generation_id,
            publication_version,
            publication_event_id,
            published_at,
            surface_code,
            snapshot_date,
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
        .eq("surface_code", "UNIVERSE_SERVICE")
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
      const rows = data ?? [];
      const identity = requireUniformUniverseServicePublication(
        rows,
        universeCode,
      );
      const authoritativeSidoByComplexId =
        await fetchAuthoritativeSidoByComplexId(supabase, rows);
      const items = rows.map((row: any) => {
        const complexId = normalizeComplexId(row.complex_id);

        return toRankingItem(
          {
            ...row,
            ...identity,
            city_name: complexId
              ? authoritativeSidoByComplexId.get(complexId)
              : undefined,
          },
          universeCode,
        );
      });

      return {
        ...identity,
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
): Promise<BoardPayload> {
  return fetchBoardPayloadFromLatestBoard(
    supabase,
    universeCode,
    requestedLimit,
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
        status: 400,
        headers: {
          "Cache-Control": BOARD_CACHE_CONTROL,
          "X-Koaptix-Cache": "unavailable",
        },
      },
    );
  }

  const universeCode = universeResolution.renderedUniverseCode;
  try {
    const supabase = createServerSupabase();
    const payload = await fetchBoardPayload(supabase, universeCode, limit);

    return NextResponse.json(
      {
        ...payload,
        cacheState: "bypassed",
        resultCount: payload.items.length,
      },
      {
        headers: {
          "Cache-Control": BOARD_CACHE_CONTROL,
          "X-Koaptix-Cache": "live",
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

    return NextResponse.json(
      buildEmptyDegradedBoardPayload(universeCode, limit, getErrorMessage(error)),
      {
        status: isTimeoutError(error) ? 504 : 500,
        headers: {
          "Cache-Control": BOARD_CACHE_CONTROL,
          "X-Koaptix-Cache": "miss",
        },
      },
    );
  }
}
