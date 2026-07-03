import { NextRequest, NextResponse } from "next/server";

/**
 * Route role marker:
 * - /api/ranking is the /ranking TOP1000 full-board endpoint.
 * - It accepts the canonical universe_code request contract.
 * - Do not merge with /api/rankings; home tactical board uses the capped route.
 */

import {
  buildUniverseResolutionMetadata,
  resolveUniverseRequest,
  type UniverseRequestResolution,
} from "../../../lib/koaptix/universes";
import {
  getLatestRankBoard,
  toNullableNumber,
} from "../../../lib/koaptix/queries";
import type {
  DbLatestRankBoardWeeklyRow,
  NullableNumberLike,
  RankingItem,
} from "../../../lib/koaptix/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FULL_DEFAULT_LIMIT = 1000;
const FULL_MAX_LIMIT = 1000;

type RankingApiResponse = {
  ok: boolean;
  universeCode: string;
  requestedUniverseCode: string;
  renderedUniverseCode: string;
  requestedLimit: number;
  renderedLimit: number;
  resultCount: number;
  source: "live_latest" | "live_dynamic_fallback" | "empty_degraded";
  cacheState: "bypassed" | "miss";
  fallbackMode:
    | "none"
    | "same_universe_dynamic_degraded"
    | "same_universe_empty_degraded";
  fallbackUsed: boolean;
  degraded: boolean;
  latestBoardDate: string | null;
  filters: {
    q: string;
    tier: TierFilterKey;
    complexId: string | null;
  };
  count: number;
  items: RankingItem[];
  message?: string;
};

type TierFilterKey = "ALL" | "S" | "A" | "B" | "C" | "D";

type RankingBoardRow = DbLatestRankBoardWeeklyRow & {
  id?: number | string | null;
  name?: string | null;
  snapshot_date?: string | null;
  snapshotDate?: string | null;
  sigungu_full_name?: string | null;
  location_search_label?: string | null;
  total_household_count?: NullableNumberLike;
  households?: NullableNumberLike;
  approval_year?: NullableNumberLike;
  recovery_52w?: NullableNumberLike;
  rank_delta_w?: NullableNumberLike;
  rank_delta_7d?: NullableNumberLike;
  previous_rank_all?: NullableNumberLike;
  market_cap_delta_7d?: NullableNumberLike;
  market_cap_delta_pct_7d?: NullableNumberLike;
  rank_movement?: string | null;
  __koaptixBoardSource?: string | null;
  __koaptixFallbackMode?: string | null;
};

function parseLimit(
  value: string | null,
  fallback: number,
  min = 50,
  max = FULL_MAX_LIMIT,
) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(Math.trunc(parsed), max));
}

function parseTier(value: string | null): TierFilterKey {
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

function normalizeQuery(value: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeBoardDate(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  if (!normalized) return null;

  const dateMatch = normalized.match(/^\d{4}-\d{2}-\d{2}/);
  return dateMatch ? dateMatch[0] : null;
}

function deriveLatestBoardDate(rows: RankingBoardRow[]): string | null {
  const dates = new Set(
    rows
      .map((row) => normalizeBoardDate(row.snapshot_date ?? row.snapshotDate))
      .filter((date): date is string => date !== null),
  );

  return dates.size === 1 ? Array.from(dates)[0] : null;
}

function deriveBoardSource(rows: RankingBoardRow[]): RankingApiResponse["source"] {
  const firstSource = rows
    .map((row) => row.__koaptixBoardSource)
    .find((value): value is string => Boolean(value));

  if (firstSource === "live_dynamic_fallback") {
    return "live_dynamic_fallback";
  }

  if (firstSource === "live_latest") {
    return "live_latest";
  }

  return rows.length > 0 ? "live_latest" : "empty_degraded";
}

function deriveFallbackMode(
  source: RankingApiResponse["source"],
): RankingApiResponse["fallbackMode"] {
  if (source === "live_dynamic_fallback") {
    return "same_universe_dynamic_degraded";
  }

  if (source === "empty_degraded") {
    return "same_universe_empty_degraded";
  }

  return "none";
}

function buildUnavailableRankingPayload(
  resolution: UniverseRequestResolution,
  options: {
    limit: number;
    q: string;
    tier: TierFilterKey;
    complexId: string | null;
  },
) {
  return {
    ok: true,
    ...buildUniverseResolutionMetadata(resolution),
    requestedLimit: options.limit,
    renderedLimit: 0,
    resultCount: 0,
    source: "empty_degraded",
    cacheState: "miss",
    fallbackMode: "none",
    fallbackUsed: false,
    degraded: false,
    latestBoardDate: null,
    filters: {
      q: options.q,
      tier: options.tier,
      complexId: options.complexId,
    },
    count: 0,
    items: [],
    message: resolution.reason ?? "universe_unavailable",
  } satisfies RankingApiResponse & {
    universeResolutionStatus: string;
    universeUnavailable: boolean;
    reason: string | null;
  };
}

function getRankValue(item: RankingItem): number | null {
  const value = item.rank_all ?? item.rank ?? null;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function matchesTier(item: RankingItem, tier: TierFilterKey) {
  if (tier === "ALL") return true;

  const rank = getRankValue(item);
  if (rank === null) return false;

  if (tier === "S") return rank >= 1 && rank <= 10;
  if (tier === "A") return rank >= 11 && rank <= 50;
  if (tier === "B") return rank >= 51 && rank <= 100;
  if (tier === "C") return rank >= 101 && rank <= 300;
  return rank >= 301 && rank <= 1000;
}

function matchesQuery(item: RankingItem, query: string) {
  if (!query) return true;

  return [
    item.searchText,
    item.name,
    item.apt_name_ko,
    item.sigunguName,
    item.sigungu_name,
    item.legalDongName,
    item.legal_dong_name,
    item.locationLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function toRankingItem(
  row: RankingBoardRow,
  fallbackUniverseCode: string,
): RankingItem {
  const buildYear = toNullableNumber(row.build_year ?? row.approval_year);
  const households = toNullableNumber(
    row.household_count ?? row.total_household_count ?? row.households,
  );
  const recovery = toNullableNumber(
    row.recovery_52w ?? row.recovery_rate_52w,
  );
  const rank = toNullableNumber(row.rank_all) ?? 0;
  const marketCapKrw = toNullableNumber(row.market_cap_krw) ?? 0;
  const marketCapTrillionKrw = toNullableNumber(
    row.market_cap_trillion_krw,
  );
  const rankDelta7d = toNullableNumber(
    row.rank_delta_w ?? row.rank_delta_7d,
  ) ?? 0;
  const marketCapDelta7d = toNullableNumber(row.market_cap_delta_7d) ?? 0;
  const marketCapDeltaPct7d =
    toNullableNumber(row.market_cap_delta_pct_7d) ?? 0;
  const sigunguName = row.sigungu_name ?? "";
  const legalDongName = row.legal_dong_name ?? "";
  const name = row.apt_name_ko ?? row.name ?? "";
  const locationLabel = [
    row.location_search_label,
    row.sigungu_full_name,
    sigunguName,
    legalDongName,
    name,
  ]
    .filter(Boolean)
    .join(" ");
  const searchText = [name, sigunguName, legalDongName, locationLabel]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    complexId: String(row.complex_id ?? row.id ?? ""),

    name,
    apt_name_ko: name,

    rank,
    rank_all: rank,

    sigunguName,
    sigungu_name: sigunguName,

    legalDongName,
    legal_dong_name: legalDongName,

    marketCapKrw,
    market_cap_krw: marketCapKrw,

    marketCapTrillionKrw,
    market_cap_trillion_krw: marketCapTrillionKrw,

    locationLabel,
    searchText,

    historySnapshotDate: row.history_snapshot_date ?? null,
    rankDelta7d,
    rank_delta_w: rankDelta7d,
    marketCapDelta7d,
    marketCapDeltaPct7d,
    deltaWindow: "7d",
    rankDelta1d: 0,

    rankMovement: row.rank_movement ?? null,
    rank_movement: row.rank_movement ?? null,

    previousRankAll: toNullableNumber(row.previous_rank_all),
    previous_rank_all: toNullableNumber(row.previous_rank_all),

    highMarketCap52w: toNullableNumber(row.high_market_cap_52w),
    recoveryRate52w: recovery,
    recovery_52w: recovery,

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
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const rawUniverseCode =
    searchParams.get("universe_code") ?? searchParams.get("universe");

  const limit = parseLimit(
    searchParams.get("limit"),
    FULL_DEFAULT_LIMIT,
    50,
    FULL_MAX_LIMIT,
  );
  const q = normalizeQuery(searchParams.get("q"));
  const tier = parseTier(searchParams.get("tier"));
  const complexId = searchParams.get("complexId")?.trim() || null;
  const universeResolution = resolveUniverseRequest(rawUniverseCode, {
    capability: "ranking",
  });

  if (universeResolution.universeUnavailable) {
    return NextResponse.json(
      buildUnavailableRankingPayload(universeResolution, {
        limit,
        q,
        tier,
        complexId,
      }),
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const universeCode = universeResolution.renderedUniverseCode;

  try {
    const rows = (await getLatestRankBoard(universeCode, limit)) as RankingBoardRow[];
    const latestBoardDate = deriveLatestBoardDate(rows);
    const source = deriveBoardSource(rows);
    const fallbackMode = deriveFallbackMode(source);
    const fallbackUsed = fallbackMode !== "none";
    const items = rows
      .map((row) => toRankingItem(row, universeCode))
      .filter((item) => matchesTier(item, tier))
      .filter((item) => matchesQuery(item, q));

    const payload: RankingApiResponse = {
      ok: true,
      universeCode,
      requestedUniverseCode: universeCode,
      renderedUniverseCode: universeCode,
      requestedLimit: limit,
      renderedLimit: rows.length,
      resultCount: items.length,
      source,
      cacheState: "bypassed",
      fallbackMode,
      fallbackUsed,
      degraded: fallbackUsed,
      latestBoardDate,
      filters: {
        q,
        tier,
        complexId,
      },
      count: items.length,
      items,
    };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown ranking error";

    return NextResponse.json(
      {
        ok: false,
        universeCode,
        requestedUniverseCode: universeCode,
        renderedUniverseCode: universeCode,
        requestedLimit: limit,
        renderedLimit: 0,
        resultCount: 0,
        source: "empty_degraded",
        cacheState: "miss",
        fallbackMode: "same_universe_empty_degraded",
        fallbackUsed: true,
        degraded: true,
        latestBoardDate: null,
        filters: {
          q,
          tier,
          complexId,
        },
        count: 0,
        items: [],
        message,
      } satisfies RankingApiResponse,
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
