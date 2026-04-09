import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  DEFAULT_UNIVERSE_CODE,
  normalizeUniverseCode,
} from "../../../lib/koaptix/universes";
import type { RankingItem } from "../../../lib/koaptix/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SEARCH_CACHE_TTL_MS = 30_000;

type SearchMode = "LOCAL" | "GLOBAL";

type SearchCachePayload = {
  items: RankingItem[];
};

const searchSourceCache = new Map<
  string,
  { expiresAt: number; payload: SearchCachePayload }
>();

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

function parseLimit(value: string | null, fallback = 12, min = 5, max = 20) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(parsed, max));
}

function parseMode(value: string | null): SearchMode {
  return value === "GLOBAL" ? "GLOBAL" : "LOCAL";
}

function getSearchSourceLimit(mode: SearchMode, universeCode: string) {
  if (mode === "GLOBAL") {
    return 250;
  }

  return universeCode === DEFAULT_UNIVERSE_CODE ? 80 : 120;
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

function readSearchSourceCache(cacheKey: string) {
  const cached = searchSourceCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    searchSourceCache.delete(cacheKey);
    return null;
  }

  return cached.payload;
}

function writeSearchSourceCache(cacheKey: string, payload: SearchCachePayload) {
  searchSourceCache.set(cacheKey, {
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    payload,
  });
}

function filterItemsByQuery(items: RankingItem[], q: string) {
  const lowerQ = q.trim().toLowerCase();
  if (!lowerQ) return [];

  return items.filter((item) => {
    return (
      item.name.toLowerCase().includes(lowerQ) ||
      item.sigunguName?.toLowerCase().includes(lowerQ) ||
      item.legalDongName?.toLowerCase().includes(lowerQ) ||
      item.locationLabel?.toLowerCase().includes(lowerQ)
    );
  });
}

async function loadSourceItems(
  supabase: ReturnType<typeof createServerSupabase>,
  universeCode: string,
  mode: SearchMode,
) {
  const sourceLimit = getSearchSourceLimit(mode, universeCode);
  const cacheKey = `${mode}::${universeCode}::${sourceLimit}`;

  const cached = readSearchSourceCache(cacheKey);
  if (cached) {
    return cached.items;
  }

  const { data, error } = await supabase
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
      `
    )
    .eq("universe_code", universeCode)
    .lte("rank_all", sourceLimit)
    .order("rank_all", { ascending: true });

  if (error) {
    throw error;
  }

  const items = (data ?? []).map((row: any) =>
    toRankingItem(row, universeCode),
  );

  writeSearchSourceCache(cacheKey, { items });

  return items;
}

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();
  const searchParams = request.nextUrl.searchParams;

  const q = (searchParams.get("q") ?? "").trim();
  const rawUniverseCode =
    searchParams.get("universe_code") ?? searchParams.get("universe");

  const requestedUniverseCode = normalizeUniverseCode(
    rawUniverseCode ?? DEFAULT_UNIVERSE_CODE,
  );

  const limit = parseLimit(searchParams.get("limit"), 12, 5, 20);

  if (q.length < 1) {
    return NextResponse.json(
      {
        ok: true,
        universeCode: requestedUniverseCode,
        localItems: [],
        globalItems: [],
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  try {
    const localUniverseCode = requestedUniverseCode;
    const globalUniverseCode = DEFAULT_UNIVERSE_CODE;

    const [localSourceItems, globalSourceItems] = await Promise.all([
      loadSourceItems(supabase, localUniverseCode, "LOCAL"),
      requestedUniverseCode === DEFAULT_UNIVERSE_CODE
        ? Promise.resolve([] as RankingItem[])
        : loadSourceItems(supabase, globalUniverseCode, "GLOBAL"),
    ]);

    const localItems = filterItemsByQuery(localSourceItems, q).slice(0, limit);

    const localComplexIdSet = new Set(localItems.map((item) => item.complexId));

    const globalItems =
      requestedUniverseCode === DEFAULT_UNIVERSE_CODE
        ? []
        : filterItemsByQuery(globalSourceItems, q)
            .filter((item) => !localComplexIdSet.has(item.complexId))
            .slice(0, limit);

    return NextResponse.json(
      {
        ok: true,
        universeCode: requestedUniverseCode,
        localItems,
        globalItems,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown search error";

    console.error("[API /api/search] failed:", {
      universeCode: requestedUniverseCode,
      q,
      message,
    });

    return NextResponse.json(
      {
        ok: false,
        universeCode: requestedUniverseCode,
        localItems: [],
        globalItems: [],
        message,
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}