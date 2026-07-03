import { NextRequest, NextResponse } from "next/server";

import {
  DEFAULT_UNIVERSE_CODE,
  buildUniverseResolutionMetadata,
  resolveUniverseRequest,
  type UniverseRequestResolution,
} from "../../../lib/koaptix/universes";
import { getLatestRankBoard } from "../../../lib/koaptix/queries";
import type { RankingItem } from "../../../lib/koaptix/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SEARCH_CACHE_TTL_MS = 30_000;
const SEARCH_STALE_CACHE_TTL_MS = 600_000;
const SEARCH_REGIONAL_RETRY_LIMIT = 40;
const SEARCH_SUCCESS_CACHE_CONTROL =
  "public, max-age=10, s-maxage=30, stale-while-revalidate=300";
const SEARCH_ERROR_CACHE_CONTROL = "no-store";

type SearchCachePayload = {
  items: RankingItem[];
};

type SearchSourceResult = {
  items: RankingItem[];
  source: "live_dynamic" | "stale_cache" | "stale_cache_any_limit";
  cacheState: "bypassed" | "fresh" | "stale_exact" | "stale_any_limit";
  fallbackMode:
    | "none"
    | "exact_same_universe_stale"
    | "same_universe_stale_any_limit";
};

const searchSourceCache = new Map<
  string,
  {
    freshUntil: number;
    staleUntil: number;
    payload: SearchCachePayload;
  }
>();
const searchSourceInflight = new Map<string, Promise<RankingItem[]>>();

function parseLimit(value: string | null, fallback = 12, min = 5, max = 20) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(parsed, max));
}

function getSearchSourceLimit() {
  // Keep the source window modest so command/search does not hit the slower
  // large regional board path during cold starts.
  return 80;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toRankingItem(row: any, fallbackUniverseCode: string): RankingItem {
  const buildYear = toNullableNumber(row.build_year ?? row.approval_year);
  const households = toNullableNumber(
    row.household_count ?? row.total_household_count ?? row.households,
  );
  const recovery = toNullableNumber(
    row.recovery_52w ?? row.recovery_rate_52w,
  );

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

    recoveryRate52w: recovery,
    recovery_52w: recovery,

    locationLabel: [
      row.sigungu_name ?? "",
      row.legal_dong_name ?? "",
      row.apt_name_ko ?? "",
    ]
      .filter(Boolean)
      .join(" "),

    households,
    household_count: households,

    buildYear,
    build_year: buildYear,

    ageYears: buildYear ? new Date().getFullYear() - buildYear : null,
    age_years: buildYear ? new Date().getFullYear() - buildYear : null,

    universeCode: row.universe_code ?? fallbackUniverseCode,
    universe_code: row.universe_code ?? fallbackUniverseCode,
    universeName: row.universe_name ?? null,
    universe_name: row.universe_name ?? null,
  } as unknown as RankingItem;
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

  return "Unknown search error";
}

function makeCacheKey(universeCode: string, sourceLimit: number) {
  return `LOCAL::${universeCode}::${sourceLimit}`;
}

function readFreshSearchSourceCache(cacheKey: string) {
  const cached = searchSourceCache.get(cacheKey);
  if (!cached) return null;

  const now = Date.now();

  if (now > cached.staleUntil) {
    searchSourceCache.delete(cacheKey);
    return null;
  }

  if (now > cached.freshUntil) {
    return null;
  }

  return cached.payload;
}

function readStaleSearchSourceCache(cacheKey: string) {
  const cached = searchSourceCache.get(cacheKey);
  if (!cached) return null;

  const now = Date.now();

  if (now > cached.staleUntil) {
    searchSourceCache.delete(cacheKey);
    return null;
  }

  return cached.payload;
}

function readAnyUniverseSearchSourceCache(universeCode: string) {
  const prefix = `LOCAL::${universeCode}::`;
  const now = Date.now();

  const candidates = Array.from(searchSourceCache.entries())
    .filter(([key, entry]) => key.startsWith(prefix) && now <= entry.staleUntil)
    .sort((a, b) => b[1].freshUntil - a[1].freshUntil);

  return candidates[0]?.[1].payload ?? null;
}

function writeSearchSourceCache(cacheKey: string, payload: SearchCachePayload) {
  const now = Date.now();

  searchSourceCache.set(cacheKey, {
    freshUntil: now + SEARCH_CACHE_TTL_MS,
    staleUntil: now + SEARCH_STALE_CACHE_TTL_MS,
    payload,
  });
}

function filterItemsByQuery(items: RankingItem[], q: string) {
  const lowerQ = q.trim().toLowerCase();
  if (!lowerQ) return [];

  return items.filter((item) => {
    return (
      String(item.name ?? "").toLowerCase().includes(lowerQ) ||
      String(item.sigunguName ?? "").toLowerCase().includes(lowerQ) ||
      String(item.legalDongName ?? "").toLowerCase().includes(lowerQ) ||
      String(item.locationLabel ?? "").toLowerCase().includes(lowerQ)
    );
  });
}

function excludeAlreadyShownItems(
  items: RankingItem[],
  alreadyShownItems: RankingItem[],
) {
  const shownIds = new Set(alreadyShownItems.map((item) => item.complexId));
  return items.filter((item) => !shownIds.has(item.complexId));
}

function buildUnavailableSearchPayload(
  resolution: UniverseRequestResolution,
  limit: number,
) {
  return {
    ok: true,
    ...buildUniverseResolutionMetadata(resolution),
    requestedLimit: limit,
    resultCount: 0,
    source: "empty_degraded",
    cacheState: "miss",
    fallbackMode: "none",
    fallbackUsed: false,
    degraded: false,
    localItems: [],
    globalItems: [],
    message: resolution.reason ?? "universe_unavailable",
  };
}

async function fetchSourceItems(
  universeCode: string,
  sourceLimit: number,
) {
  const rows = await getLatestRankBoard(universeCode, sourceLimit);
  const items = rows.map((row: any) =>
    toRankingItem(row, universeCode),
  );

  return items;
}

async function loadSourceItems(
  universeCode: string,
): Promise<SearchSourceResult> {
  const sourceLimit = getSearchSourceLimit();
  const cacheKey = makeCacheKey(universeCode, sourceLimit);

  const freshCached = readFreshSearchSourceCache(cacheKey);
  if (freshCached) {
    return {
      items: freshCached.items,
      source: "live_dynamic",
      cacheState: "fresh",
      fallbackMode: "none",
    };
  }

  let inflight = searchSourceInflight.get(cacheKey);
  if (!inflight) {
    inflight = fetchSourceItems(universeCode, sourceLimit)
      .then((items) => {
        writeSearchSourceCache(cacheKey, { items });
        return items;
      })
      .finally(() => {
        searchSourceInflight.delete(cacheKey);
      });

    searchSourceInflight.set(cacheKey, inflight);
  }

  try {
    return {
      items: await inflight,
      source: "live_dynamic",
      cacheState: "bypassed",
      fallbackMode: "none",
    };
  } catch (primaryError) {
    const retryLimit = Math.min(sourceLimit, SEARCH_REGIONAL_RETRY_LIMIT);
    const retryCacheKey = makeCacheKey(universeCode, retryLimit);
    const freshRetryCached = readFreshSearchSourceCache(retryCacheKey);

    if (freshRetryCached) {
      return {
        items: freshRetryCached.items,
        source: "live_dynamic",
        cacheState: "fresh",
        fallbackMode: "none",
      };
    }

    try {
      const retryItems = await fetchSourceItems(universeCode, retryLimit);
      writeSearchSourceCache(retryCacheKey, { items: retryItems });
      return {
        items: retryItems,
        source: "live_dynamic",
        cacheState: "bypassed",
        fallbackMode: "none",
      };
    } catch (retryError) {
      const exactStaleCached =
        readStaleSearchSourceCache(cacheKey) ??
        readStaleSearchSourceCache(retryCacheKey);
      const anyLimitStaleCached =
        exactStaleCached ? null : readAnyUniverseSearchSourceCache(universeCode);
      const staleCached = exactStaleCached ?? anyLimitStaleCached;

      if (staleCached) {
        console.info("[API /api/search] serving stale local search source", {
          universeCode,
          sourceLimit,
          retryLimit,
          cacheState: exactStaleCached ? "stale_exact" : "stale_any_limit",
          primaryMessage: getErrorMessage(primaryError),
          retryMessage: getErrorMessage(retryError),
        });
        return {
          items: staleCached.items,
          source: exactStaleCached ? "stale_cache" : "stale_cache_any_limit",
          cacheState: exactStaleCached ? "stale_exact" : "stale_any_limit",
          fallbackMode: exactStaleCached
            ? "exact_same_universe_stale"
            : "same_universe_stale_any_limit",
        };
      }

      throw retryError;
    }
  }
}

async function loadGlobalAuxiliaryItems(
  q: string,
  requestedUniverseCode: string,
  localItems: RankingItem[],
  limit: number,
) {
  if (requestedUniverseCode === DEFAULT_UNIVERSE_CODE) {
    return [];
  }

  const globalLimit = Math.max(0, Math.min(4, limit));
  if (globalLimit <= 0) {
    return [];
  }

  try {
    const globalSource = await loadSourceItems(DEFAULT_UNIVERSE_CODE);
    const matchedGlobalItems = filterItemsByQuery(globalSource.items, q);
    return excludeAlreadyShownItems(matchedGlobalItems, localItems).slice(
      0,
      globalLimit,
    );
  } catch (error) {
    console.info("[API /api/search] global auxiliary skipped", {
      requestedUniverseCode,
      q,
      message: getErrorMessage(error),
    });

    return [];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const q = (searchParams.get("q") ?? "").trim();
  const rawUniverseCode =
    searchParams.get("universe_code") ?? searchParams.get("universe");

  const limit = parseLimit(searchParams.get("limit"), 12, 5, 20);
  const universeResolution = resolveUniverseRequest(rawUniverseCode, {
    capability: "search",
  });

  if (universeResolution.universeUnavailable) {
    return NextResponse.json(
      buildUnavailableSearchPayload(universeResolution, limit),
      {
        headers: { "Cache-Control": SEARCH_ERROR_CACHE_CONTROL },
      },
    );
  }

  const requestedUniverseCode = universeResolution.renderedUniverseCode;

  if (q.length < 1) {
    return NextResponse.json(
      {
        ok: true,
        universeCode: requestedUniverseCode,
        requestedUniverseCode,
        renderedUniverseCode: requestedUniverseCode,
        requestedLimit: limit,
        resultCount: 0,
        source: "empty_degraded",
        cacheState: "bypassed",
        fallbackMode: "same_universe_empty_degraded",
        localItems: [],
        globalItems: [],
      },
      {
        headers: { "Cache-Control": SEARCH_SUCCESS_CACHE_CONTROL },
      },
    );
  }

  try {
    const localSource = await loadSourceItems(requestedUniverseCode);
    const localItems = filterItemsByQuery(localSource.items, q).slice(0, limit);
    const globalItems = await loadGlobalAuxiliaryItems(
      q,
      requestedUniverseCode,
      localItems,
      limit,
    );

    return NextResponse.json(
      {
        ok: true,
        universeCode: requestedUniverseCode,
        requestedUniverseCode,
        renderedUniverseCode: requestedUniverseCode,
        requestedLimit: limit,
        resultCount: localItems.length,
        source: localSource.source,
        cacheState: localSource.cacheState,
        fallbackMode: localSource.fallbackMode,
        resultOrder: ["localItems", "globalItems"],
        localItems,
        globalItems,
      },
      {
        headers: { "Cache-Control": SEARCH_SUCCESS_CACHE_CONTROL },
      },
    );
  } catch (error) {
    const message = getErrorMessage(error);

    console.error("[API /api/search] failed:", {
      universeCode: requestedUniverseCode,
      q,
      message,
    });

    // Search keeps the requested universe identity and never revives global fallback.
    // On local source timeout/cold miss, degrade to an empty same-universe payload
    // instead of surfacing an intermittent 500 to the command/search path.
    return NextResponse.json(
      {
        ok: true,
        universeCode: requestedUniverseCode,
        requestedUniverseCode,
        renderedUniverseCode: requestedUniverseCode,
        requestedLimit: limit,
        resultCount: 0,
        source: "empty_degraded",
        cacheState: "miss",
        fallbackMode: "same_universe_empty_degraded",
        localItems: [],
        globalItems: [],
        degraded: true,
        message,
      },
      {
        headers: { "Cache-Control": SEARCH_ERROR_CACHE_CONTROL },
      },
    );
  }
}
