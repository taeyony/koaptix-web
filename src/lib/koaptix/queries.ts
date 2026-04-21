/**
 * Query layer for KOAPTIX home/ranking/detail.
 * KOREA_ALL cold-path는 민감할 수 있으므로 source rollback 없이 fallback / delivery 최적화로 다룬다.
 */

import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_UNIVERSE_CODE,
  getUniverseLabel,
  resolveServiceUniverseCode,
  type KnownUniverseCode,
} from "./universes";

import type {
  DbComplexDetailSheetBaseRow,
  DbComplexDetailSheetWeeklyRow,
  DbComplexChartHistoryRow,
  DbLatestRankBoardRow,
  DbLatestRankBoardWeeklyRow,
  DbRankHistoryRow,
} from "./types";

const SEOUL_TIME_ZONE = "Asia/Seoul";
const DAY_MS = 24 * 60 * 60 * 1000;

type RegionFallbackRow = {
  complex_id: number | string | null;
  sigungu_name: string | null;
  sigungu_full_name: string | null;
  umd_nm: string | null;
  address_jibun: string | null;
};

type RegionMapRawRow = {
  complex_id: number | string | null;
  lawd_cd: number | string | null;
  sgg_cd: number | string | null;
  umd_nm: string | null;
  sigungu_name: string | null;
};

type AptComplexRegionRawRow = {
  complex_id: number | string | null;
  region_id: number | null;
  address_jibun: string | null;
};

type RegionDimRawRow = {
  region_id: number | null;
  region_code: string | null;
  region_name_ko: string | null;
  full_name_ko: string | null;
};

type WeeklyDerivedPayload = {
  history_snapshot_date: string | null;
  previous_rank_all: number | null;
  rank_delta_7d: number | null;
  market_cap_delta_7d: number | null;
  market_cap_delta_pct_7d: number | null;
  rank_movement: "NEW" | "UP" | "DOWN" | "SAME";
};

function createServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function toNumber(value: number | string | null | undefined, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
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

function toSeoulDateString(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function shiftSeoulDateString(baseDate: string, diffDays: number): string {
  const seeded = new Date(`${baseDate}T00:00:00+09:00`);
  return toSeoulDateString(new Date(seeded.getTime() + diffDays * DAY_MS));
}

function normalizeComplexId(complexId: string | number) {
  if (typeof complexId === "number") return complexId;
  const parsed = Number(complexId);
  return Number.isFinite(parsed) ? parsed : complexId;
}

function extractComplexIds(rows: DbLatestRankBoardRow[]): number[] {
  return rows
    .map((row) => {
      if (row.complex_id == null) return null;
      const parsed = Number(row.complex_id);
      return Number.isFinite(parsed) ? parsed : null;
    })
    .filter((value): value is number => value !== null);
}

function buildWeeklyDeltaPayload(
  currentRank: number,
  currentMarketCap: number,
  previous: DbRankHistoryRow | null
): WeeklyDerivedPayload {
  if (!previous) {
    return {
      history_snapshot_date: null,
      previous_rank_all: null,
      rank_delta_7d: null,
      market_cap_delta_7d: null,
      market_cap_delta_pct_7d: null,
      rank_movement: "NEW",
    };
  }

  const previousRank = toNumber(previous.rank_all, currentRank);
  const previousMarketCap = toNumber(previous.market_cap_krw, currentMarketCap);

  const rankDelta7d = previousRank - currentRank;
  const marketCapDelta7d = currentMarketCap - previousMarketCap;
  const marketCapDeltaPct7d =
    previousMarketCap > 0
      ? Number(((marketCapDelta7d / previousMarketCap) * 100).toFixed(2))
      : 0;

  const rankMovement: WeeklyDerivedPayload["rank_movement"] =
    rankDelta7d > 0 ? "UP" : rankDelta7d < 0 ? "DOWN" : "SAME";

  return {
    history_snapshot_date: previous.snapshot_date ?? null,
    previous_rank_all: previousRank,
    rank_delta_7d: rankDelta7d,
    market_cap_delta_7d: marketCapDelta7d,
    market_cap_delta_pct_7d: marketCapDeltaPct7d,
    rank_movement: rankMovement,
  };
}

function parseSigunguFromAddress(address: string | null | undefined): {
  sigungu_name: string | null;
  sigungu_full_name: string | null;
} {
  if (!address) {
    return {
      sigungu_name: null,
      sigungu_full_name: null,
    };
  }

  const tokens = address.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) {
    return {
      sigungu_name: null,
      sigungu_full_name: null,
    };
  }

  const first = tokens[0] ?? "";
  const second = tokens[1] ?? "";

  const isProvinceLike =
    first.endsWith("시") ||
    first.endsWith("도") ||
    first.endsWith("특별시") ||
    first.endsWith("광역시") ||
    first.endsWith("특별자치시") ||
    first.endsWith("특별자치도");

  const isSigunguLike =
    second.endsWith("구") ||
    second.endsWith("군") ||
    second.endsWith("시");

  if (isProvinceLike && isSigunguLike) {
    return {
      sigungu_name: second,
      sigungu_full_name: `${first} ${second}`,
    };
  }

  return {
    sigungu_name: isSigunguLike ? second : null,
    sigungu_full_name: isProvinceLike && isSigunguLike ? `${first} ${second}` : null,
  };
}

async function getWeeklyAnchorDate(
  supabase: ReturnType<typeof createServerSupabase>
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("complex_rank_history")
      .select("snapshot_date")
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data?.snapshot_date ?? toSeoulDateString(new Date());
  } catch {
    return toSeoulDateString(new Date());
  }
}

async function fetchWeeklyComparisonMap(
  supabase: ReturnType<typeof createServerSupabase>,
  complexIds: number[]
): Promise<Map<string, DbRankHistoryRow>> {
  if (complexIds.length === 0) return new Map();

  const anchorDate = await getWeeklyAnchorDate(supabase);
  const targetDate = shiftSeoulDateString(anchorDate, -7);
  const floorDate = shiftSeoulDateString(targetDate, -14);

  try {
    const { data, error } = await supabase
      .from("complex_rank_history")
      .select("snapshot_date, complex_id, market_cap_krw, rank_all")
      .in("complex_id", complexIds)
      .gte("snapshot_date", floorDate)
      .lte("snapshot_date", targetDate)
      .order("snapshot_date", { ascending: false })
      .limit(Math.min(Math.max(complexIds.length * 14, 50), 1000));

    if (error) throw error;

    const result = new Map<string, DbRankHistoryRow>();
    for (const row of (data ?? []) as DbRankHistoryRow[]) {
      const key = row.complex_id == null ? "" : String(row.complex_id);
      if (!key || result.has(key)) continue;
      result.set(key, row);
    }
    return result;
  } catch (error) {
    console.warn("[KOAPTIX] weekly comparison history lookup failed:", error);
    return new Map();
  }
}

async function fetchWeeklyComparisonByComplexId(
  supabase: ReturnType<typeof createServerSupabase>,
  complexId: string | number
): Promise<DbRankHistoryRow | null> {
  const anchorDate = await getWeeklyAnchorDate(supabase);
  const targetDate = shiftSeoulDateString(anchorDate, -7);
  const floorDate = shiftSeoulDateString(targetDate, -14);

  try {
    const { data, error } = await supabase
      .from("complex_rank_history")
      .select("snapshot_date, complex_id, market_cap_krw, rank_all")
      .eq("complex_id", normalizeComplexId(complexId))
      .gte("snapshot_date", floorDate)
      .lte("snapshot_date", targetDate)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return (data ?? null) as DbRankHistoryRow | null;
  } catch (error) {
    console.warn("[KOAPTIX] weekly comparison detail lookup failed:", error);
    return null;
  }
}

async function fetchRegionFallbackMap(
  supabase: ReturnType<typeof createServerSupabase>,
  complexIds: number[]
): Promise<Map<string, RegionFallbackRow>> {
  if (complexIds.length === 0) return new Map();

  try {
    const [{ data: regionMapData, error: regionMapError }, { data: aptComplexData, error: aptComplexError }] =
      await Promise.all([
        supabase
          .from("koaptix_complex_region_map")
          .select("complex_id, lawd_cd, sgg_cd, umd_nm, sigungu_name")
          .in("complex_id", complexIds),
        supabase
          .from("apt_complex")
          .select("complex_id, region_id, address_jibun")
          .in("complex_id", complexIds),
      ]);

    if (regionMapError) throw regionMapError;
    if (aptComplexError) throw aptComplexError;

    const regionMapRows = (regionMapData ?? []) as RegionMapRawRow[];
    const aptComplexRows = (aptComplexData ?? []) as AptComplexRegionRawRow[];

    const regionIds = Array.from(
      new Set(
        aptComplexRows
          .map((row) => row.region_id)
          .filter((value): value is number => typeof value === "number")
      )
    );

    const regionCodes = Array.from(
      new Set(
        regionMapRows
          .map((row) => {
            if (row.sgg_cd != null && String(row.sgg_cd).trim() !== "") return String(row.sgg_cd);
            if (row.lawd_cd != null && String(row.lawd_cd).trim() !== "") return String(row.lawd_cd).slice(0, 5);
            return null;
          })
          .filter((value): value is string => value !== null)
      )
    );

    const regionDimById = new Map<number, RegionDimRawRow>();
    const regionDimByCode = new Map<string, RegionDimRawRow>();

    if (regionIds.length > 0) {
      const { data: regionByIdData, error: regionByIdError } = await supabase
        .from("region_dim")
        .select("region_id, region_code, region_name_ko, full_name_ko")
        .eq("region_type", "sigungu")
        .in("region_id", regionIds);

      if (regionByIdError) throw regionByIdError;

      for (const row of (regionByIdData ?? []) as RegionDimRawRow[]) {
        if (row.region_id != null) {
          regionDimById.set(row.region_id, row);
        }
      }
    }

    if (regionCodes.length > 0) {
      const { data: regionByCodeData, error: regionByCodeError } = await supabase
        .from("region_dim")
        .select("region_id, region_code, region_name_ko, full_name_ko")
        .eq("region_type", "sigungu")
        .in("region_code", regionCodes);

      if (regionByCodeError) throw regionByCodeError;

      for (const row of (regionByCodeData ?? []) as RegionDimRawRow[]) {
        if (row.region_code) {
          regionDimByCode.set(row.region_code, row);
        }
      }
    }

    const aptComplexById = new Map<string, AptComplexRegionRawRow>();
    for (const row of aptComplexRows) {
      const key = row.complex_id == null ? "" : String(row.complex_id);
      if (!key) continue;
      aptComplexById.set(key, row);
    }

    const result = new Map<string, RegionFallbackRow>();

    for (const row of regionMapRows) {
      const key = row.complex_id == null ? "" : String(row.complex_id);
      if (!key || result.has(key)) continue;

      const aptComplex = aptComplexById.get(key) ?? null;
      const code =
        row.sgg_cd != null && String(row.sgg_cd).trim() !== ""
          ? String(row.sgg_cd)
          : row.lawd_cd != null && String(row.lawd_cd).trim() !== ""
            ? String(row.lawd_cd).slice(0, 5)
            : null;

      const byCode = code ? regionDimByCode.get(code) ?? null : null;
      const byRegionId =
        aptComplex?.region_id != null ? regionDimById.get(aptComplex.region_id) ?? null : null;
      const parsedAddress = parseSigunguFromAddress(aptComplex?.address_jibun ?? null);

      result.set(key, {
        complex_id: row.complex_id,
        sigungu_name:
          row.sigungu_name ??
          byCode?.region_name_ko ??
          byRegionId?.region_name_ko ??
          parsedAddress.sigungu_name,
        sigungu_full_name:
          byCode?.full_name_ko ??
          byRegionId?.full_name_ko ??
          parsedAddress.sigungu_full_name,
        umd_nm: row.umd_nm ?? null,
        address_jibun: aptComplex?.address_jibun ?? null,
      });
    }

    return result;
  } catch (error) {
    console.warn("[KOAPTIX] region fallback map lookup failed:", error);
    return new Map();
  }
}

async function fetchRegionFallbackByComplexId(
  supabase: ReturnType<typeof createServerSupabase>,
  complexId: string | number
): Promise<RegionFallbackRow | null> {
  const normalized = normalizeComplexId(complexId);
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  const map = await fetchRegionFallbackMap(supabase, [parsed]);
  return map.get(String(parsed)) ?? null;
}

function isStatementTimeout(
  error: { code?: string | null; message?: string | null } | null | undefined
) {
  if (!error) return false;
  return (
    error.code === "57014" ||
    (error.message ?? "").includes("statement timeout")
  );
}

function isLocalLatestBoardTimeout(
  error: { code?: string | null; message?: string | null } | null | undefined
) {
  if (!error) return false;

  return (
    error.code === "LOCAL_TIMEOUT" ||
    (error.message ?? "").includes("LATEST_BOARD_LOCAL_TIMEOUT") ||
    (error.message ?? "").includes("DYNAMIC_FALLBACK_LOCAL_TIMEOUT")
  );
}

async function withLocalQueryTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(label));
    }, ms);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const MAX_LATEST_RANK_BOARD_LIMIT = 1000;

const latestRankBoardCooldownUntil = new Map<string, number>();
const LATEST_RANK_BOARD_COOLDOWN_MS = 180_000;

function isLatestRankBoardCoolingDown(universeCode: string) {
  if (universeCode === DEFAULT_UNIVERSE_CODE) return false;

  const until = latestRankBoardCooldownUntil.get(universeCode) ?? 0;
  if (until <= Date.now()) {
    latestRankBoardCooldownUntil.delete(universeCode);
    return false;
  }

  return true;
}

function markLatestRankBoardCooldown(universeCode: string) {
  if (universeCode === DEFAULT_UNIVERSE_CODE) return;
  latestRankBoardCooldownUntil.set(
    universeCode,
    Date.now() + LATEST_RANK_BOARD_COOLDOWN_MS,
  );
}

function clearLatestRankBoardCooldown(universeCode: string) {
  latestRankBoardCooldownUntil.delete(universeCode);
}

function buildRankBoardRetryLimits(
  requestedLimit: number,
  universeCode: string,
): number[] {
  const ladder =
    universeCode === DEFAULT_UNIVERSE_CODE
      ? [requestedLimit, 20, 12]
      : [requestedLimit, 30, 20];

  return Array.from(
    new Set(
      ladder.filter(
        (n) => Number.isFinite(n) && n > 0 && n <= requestedLimit,
      ),
    ),
  );
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

async function fetchLatestRankBoardFallbackFromDynamic(
  supabase: ReturnType<typeof createServerSupabase>,
  universeCode: KnownUniverseCode | string,
  limit: number,
) {
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
    return [] as any[];
  }

  const { data, error } = await supabase
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
    .eq("snapshot_date", latestSnapshot.snapshot_date)
    .order("rank_all", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row: any) => {
    const rankAll = toNullableNumber(row.rank_all);
    const tier = buildTierMeta(rankAll);

    return {
      ...row,
      previous_rank_all: null,
      rank_delta_w: null,
      rank_movement: null,
      ...tier,
    };
  });
}

/**
 * Home initial SSR seed path.
 */
export async function getLatestRankBoard(
  universeCode: KnownUniverseCode | string = DEFAULT_UNIVERSE_CODE,
  limit: number = 500,
): Promise<DbLatestRankBoardWeeklyRow[]> {
  const supabase = createServerSupabase();

  const safeUniverseCode = resolveServiceUniverseCode(
    universeCode ?? DEFAULT_UNIVERSE_CODE,
  );

  const requestedLimit = Math.max(
    1,
    Math.min(limit, MAX_LATEST_RANK_BOARD_LIMIT),
  );

  // KOREA_ALL home SSR seed is more stable through the dynamic read layer.
  if (safeUniverseCode === DEFAULT_UNIVERSE_CODE) {
    const fallbackRows = await withLocalQueryTimeout<any[]>(
      fetchLatestRankBoardFallbackFromDynamic(
        supabase,
        safeUniverseCode,
        requestedLimit,
      ),
      6500,
      "DYNAMIC_FALLBACK_LOCAL_TIMEOUT",
    );

    return fallbackRows.map((row: any) => ({
      ...row,
      universe_code: row.universe_code ?? safeUniverseCode,
      universe_name: row.universe_name ?? null,
      location_search_label: [
        row.sigungu_name ?? null,
        row.legal_dong_name ?? null,
        row.apt_name_ko ?? null,
      ]
        .filter(Boolean)
        .join(" "),
    })) as DbLatestRankBoardWeeklyRow[];
  }

  const retryLimits = buildRankBoardRetryLimits(
    requestedLimit,
    safeUniverseCode,
  );

  const latestBoardAttemptTimeoutMs = 900;
  const dynamicFallbackTimeoutMs = 5200;
  const shouldTryLatestBoard = !isLatestRankBoardCoolingDown(safeUniverseCode);

  let data: any[] | null = null;
  let lastError: { code?: string | null; message?: string | null } | null =
    null;

  if (shouldTryLatestBoard) {
    for (const attemptLimit of retryLimits) {
      try {
        const result = await withLocalQueryTimeout<{
          data: any[] | null;
          error: { code?: string | null; message?: string | null } | null;
        }>(
          supabase
            .from("v_koaptix_latest_universe_rank_board_u")
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
                previous_rank_all,
                rank_delta_w,
                rank_movement,
                market_cap_krw,
                market_cap_trillion_krw,
                market_cap_share,
                market_cap_share_pct,
                tier_code,
                tier_label,
                tier_sort,
                is_top1000
              `,
            )
            .eq("universe_code", safeUniverseCode)
            .order("rank_all", { ascending: true })
            .limit(attemptLimit),
          latestBoardAttemptTimeoutMs,
          "LATEST_BOARD_LOCAL_TIMEOUT",
        );

        data = result.data ?? null;
        lastError = result.error ?? null;

        if (!lastError && data && data.length > 0) {
          clearLatestRankBoardCooldown(safeUniverseCode);
          break;
        }

        markLatestRankBoardCooldown(safeUniverseCode);
        lastError = lastError ?? {
          code: "LOCAL_TIMEOUT",
          message: "LATEST_BOARD_EMPTY_DYNAMIC_FALLBACK",
        };
        break;
      } catch (error) {
        data = null;
        lastError = {
          code: "LOCAL_TIMEOUT",
          message:
            error instanceof Error
              ? error.message
              : "LATEST_BOARD_LOCAL_TIMEOUT",
        };

        markLatestRankBoardCooldown(safeUniverseCode);
        break;
      }
    }
  } else {
    lastError = {
      code: "LOCAL_TIMEOUT",
      message: "LATEST_BOARD_COOLDOWN_SKIP",
    };
  }

  if (
    lastError &&
    (isStatementTimeout(lastError) ||
      isLocalLatestBoardTimeout(lastError) ||
      lastError.message === "LATEST_BOARD_COOLDOWN_SKIP" ||
      lastError.message === "LATEST_BOARD_EMPTY_DYNAMIC_FALLBACK")
  ) {
    const fallbackRows = await withLocalQueryTimeout<any[]>(
      fetchLatestRankBoardFallbackFromDynamic(
        supabase,
        safeUniverseCode,
        requestedLimit,
      ),
      dynamicFallbackTimeoutMs,
      "DYNAMIC_FALLBACK_LOCAL_TIMEOUT",
    );

    data = fallbackRows;
    lastError = null;
  }

  if (lastError) {
    throw new Error(
      `Failed to fetch v_koaptix_latest_universe_rank_board_u: ${lastError.message}`,
    );
  }

  const liveRows = (data ?? []) as any[];

  return liveRows.map((row: any) => ({
    ...row,
    universe_code: row.universe_code ?? safeUniverseCode,
    universe_name: row.universe_name ?? null,
    location_search_label: [
      row.sigungu_name ?? null,
      row.legal_dong_name ?? null,
      row.apt_name_ko ?? null,
    ]
      .filter(Boolean)
      .join(" "),
  })) as DbLatestRankBoardWeeklyRow[];
}

export async function getComplexDetailById(
  complexId: string | number
): Promise<DbComplexDetailSheetWeeklyRow | null> {
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("v_koaptix_complex_detail_sheet")
    .select(
      `
        complex_id,
        apt_name_ko,
        rank_all,
        market_cap_krw,
        market_cap_trillion_krw,
        sigungu_name,
        legal_dong_name,
        household_count,
        approval_year,
        building_count,
        parking_count,
        updated_at
      `
    )
    .eq("complex_id", normalizeComplexId(complexId))
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch complex detail: ${error.message}`);
  }

  const liveRow = (data ?? null) as DbComplexDetailSheetBaseRow | null;
  if (!liveRow) return null;

  const [previous, regionFallback] = await Promise.all([
    fetchWeeklyComparisonByComplexId(supabase, complexId),
    fetchRegionFallbackByComplexId(supabase, complexId),
  ]);

  const currentRank = toNumber(liveRow.rank_all, 0);
  const currentMarketCap = toNumber(
    liveRow.market_cap_krw,
    liveRow.market_cap_trillion_krw != null
      ? Math.round(toNumber(liveRow.market_cap_trillion_krw, 0) * 1_000_000_000_000)
      : 0
  );

  const resolvedSigungu = liveRow.sigungu_name ?? regionFallback?.sigungu_name ?? null;
  const resolvedDong = liveRow.legal_dong_name ?? regionFallback?.umd_nm ?? null;
  const resolvedSigunguFull =
    regionFallback?.sigungu_full_name ??
    resolvedSigungu ??
    null;

  return {
    ...liveRow,
    sigungu_name: resolvedSigungu,
    sigungu_full_name: resolvedSigunguFull,
    legal_dong_name: resolvedDong,
    location_search_label: [
      resolvedSigunguFull,
      resolvedSigungu,
      resolvedDong,
      regionFallback?.address_jibun ?? null,
    ]
      .filter(Boolean)
      .join(" "),
    ...buildWeeklyDeltaPayload(currentRank, currentMarketCap, previous),
  } as DbComplexDetailSheetWeeklyRow;
}

type DbIndexLatestCardRow = {
  snapshot_date: string;
  universe_code: string | null;
  index_code: string | null;
  index_name: string | null;
  index_value: number | string | null;
  change_1m: number | string | null;
  change_pct_1m: number | string | null;
  total_market_cap_krw: number | string | null;
  component_complex_count: number | string | null;
  movement_1m: string | null;
};

type DbIndexTimeseriesRow = {
  snapshot_date: string;
  universe_code: string | null;
  index_code: string | null;
  index_name: string | null;
  index_value: number | string | null;
  total_market_cap_krw: number | string | null;
  component_complex_count: number | string | null;
};

export type HomeIndexChartRow = {
  snapshotDate: string;
  value: number;
  totalMarketCapKrw: number | null;
  componentComplexCount: number | null;
};

export type HomeIndexChartPayload = {
  requestedUniverseCode: string;
  renderedUniverseCode: string;
  renderedUniverseLabel: string;
  isFallbackToKorea: boolean;

  indexCode: string | null;
  indexName: string | null;

  latestSnapshotDate: string | null;
  indexValue: number | null;
  change1m: number | null;
  changePct1m: number | null;
  totalMarketCapKrw: number | null;
  componentComplexCount: number | null;
  movement1m: string | null;

  rows: HomeIndexChartRow[];
};

async function fetchIndexChartChain(
  supabase: ReturnType<typeof createServerSupabase>,
  universeCode: string,
  limit: number,
): Promise<{
  latestCard: DbIndexLatestCardRow | null;
  rows: DbIndexTimeseriesRow[];
}> {
  const [latestCardResult, rowsResult] = await Promise.all([
    supabase
      .from("v_koaptix_latest_index_card")
      .select(
        `
          snapshot_date,
          universe_code,
          index_code,
          index_name,
          index_value,
          change_1m,
          change_pct_1m,
          total_market_cap_krw,
          component_complex_count,
          movement_1m
        `,
      )
      .eq("universe_code", universeCode)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("v_koaptix_index_timeseries")
      .select(
        `
          snapshot_date,
          universe_code,
          index_code,
          index_name,
          index_value,
          total_market_cap_krw,
          component_complex_count
        `,
      )
      .eq("universe_code", universeCode)
      .order("snapshot_date", { ascending: false })
      .limit(limit),
  ]);

  if (latestCardResult.error) {
    throw new Error(
      `Failed to fetch v_koaptix_latest_index_card: ${latestCardResult.error.message}`,
    );
  }

  if (rowsResult.error) {
    throw new Error(
      `Failed to fetch v_koaptix_index_timeseries: ${rowsResult.error.message}`,
    );
  }

  return {
    latestCard: (latestCardResult.data ?? null) as DbIndexLatestCardRow | null,
    rows: (rowsResult.data ?? []) as DbIndexTimeseriesRow[],
  };
}

function buildHomeIndexChartPayload(
  requestedUniverseCode: string,
  renderedUniverseCode: string,
  latestCard: DbIndexLatestCardRow | null,
  rawRows: DbIndexTimeseriesRow[],
): HomeIndexChartPayload {
  const scopedLatestCard =
    latestCard?.universe_code === renderedUniverseCode ? latestCard : null;

  const rows = [...rawRows]
    .filter((row) => row.universe_code === renderedUniverseCode)
    .filter((row) => {
      const snapshotDate = row.snapshot_date?.slice?.(0, 10) ?? "";
      const value = toNullableNumber(row.index_value);
      return Boolean(snapshotDate) && value !== null;
    })
    .sort((a, b) => a.snapshot_date.slice(0, 10).localeCompare(b.snapshot_date.slice(0, 10)))
    .map((row) => ({
      snapshotDate: row.snapshot_date.slice(0, 10),
      value: toNullableNumber(row.index_value) ?? 0,
      totalMarketCapKrw: toNullableNumber(row.total_market_cap_krw),
      componentComplexCount: toNullableNumber(row.component_complex_count),
    }));

  return {
    requestedUniverseCode,
    renderedUniverseCode,
    renderedUniverseLabel: getUniverseLabel(renderedUniverseCode),
    isFallbackToKorea:
      requestedUniverseCode !== renderedUniverseCode &&
      renderedUniverseCode === DEFAULT_UNIVERSE_CODE,

    indexCode: scopedLatestCard?.index_code ?? null,
    indexName: scopedLatestCard?.index_name ?? null,

    latestSnapshotDate: scopedLatestCard?.snapshot_date?.slice?.(0, 10) ?? null,
    indexValue: toNullableNumber(scopedLatestCard?.index_value),
    change1m: toNullableNumber(scopedLatestCard?.change_1m),
    changePct1m: toNullableNumber(scopedLatestCard?.change_pct_1m),
    totalMarketCapKrw: toNullableNumber(scopedLatestCard?.total_market_cap_krw),
    componentComplexCount: toNullableNumber(scopedLatestCard?.component_complex_count),
    movement1m: scopedLatestCard?.movement_1m ?? null,

    rows,
  };
}

export async function getIndexChartPayload(
  universeCode: KnownUniverseCode | string = DEFAULT_UNIVERSE_CODE,
  limit = 24,
): Promise<HomeIndexChartPayload> {
  const supabase = createServerSupabase();
  const requestedUniverseCode = resolveServiceUniverseCode(
    universeCode ?? DEFAULT_UNIVERSE_CODE,
  );
  const safeLimit = Math.max(6, Math.min(limit, 60));

  // Product policy: regional index cards preserve the requested universe
  // identity and show History Building for sparse data instead of falling
  // back to KOREA_ALL. Do not reintroduce regional -> KOREA chart fallback
  // unless the product direction changes explicitly.
  const renderedUniverseCode = requestedUniverseCode;
  const { latestCard, rows } = await fetchIndexChartChain(
    supabase,
    requestedUniverseCode,
    safeLimit,
  );

  return buildHomeIndexChartPayload(
    requestedUniverseCode,
    renderedUniverseCode,
    latestCard,
    rows,
  );
}

export async function getHomeKpi() {
  const supabase = createServerSupabase();
  try {
    const { data, error } = await supabase
      .from("v_koaptix_home_kpi")
      .select("*")
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.warn("[KOAPTIX] Failed to fetch KPI:", error);
    return null;
  }
}

export async function getComplexChartHistories(
  complexIds: Array<string | number>,
  options: { days?: number } = {}
): Promise<Record<string, DbComplexChartHistoryRow[]>> {
  const supabase = createServerSupabase();
  const safeDays = Math.max(90, Math.min(options.days ?? 180, 180));

  const normalizedIds = Array.from(
    new Set(
      complexIds
        .map((id) => normalizeComplexId(id))
        .filter((id) => id !== "" && id !== null && id !== undefined)
    )
  );

  if (normalizedIds.length === 0) return {};

  const anchorDate = await getWeeklyAnchorDate(supabase);
  const startDate = shiftSeoulDateString(anchorDate, -safeDays);

  const { data, error } = await supabase
    .from("complex_rank_history")
    .select("snapshot_date, complex_id, market_cap_krw, rank_all")
    .in("complex_id", normalizedIds)
    .gte("snapshot_date", startDate)
    .lte("snapshot_date", anchorDate)
    .order("snapshot_date", { ascending: true })
    .limit(Math.min(normalizedIds.length * (safeDays + 14), 2500));

  if (error) {
    throw new Error(`Failed to fetch complex chart histories: ${error.message}`);
  }

  const grouped: Record<string, DbComplexChartHistoryRow[]> = {};
  for (const rawId of normalizedIds) {
    grouped[String(rawId)] = [];
  }

  for (const row of (data ?? []) as DbComplexChartHistoryRow[]) {
    const key = row.complex_id == null ? "" : String(row.complex_id);
    if (!key) continue;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  }

  return grouped;
}

export async function getComplexChartHistory(
  complexId: string | number,
  options: { days?: number } = {}
): Promise<DbComplexChartHistoryRow[]> {
  const grouped = await getComplexChartHistories([complexId], options);
  return grouped[String(normalizeComplexId(complexId))] ?? [];
}
