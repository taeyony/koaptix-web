import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_UNIVERSE_CODE,
  normalizeUniverseCode,
} from "./universes";
import type {
  DbComplexDetailSheetBaseRow,
  DbComplexDetailSheetWeeklyRow,
  DbComplexChartHistoryRow,
  DbIndexHistoryRow,
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
  return error.code === "57014" || (error.message ?? "").includes("statement timeout");
}

export async function getLatestRankBoard(
  universeCode = DEFAULT_UNIVERSE_CODE,
  limit = 500
): Promise<DbLatestRankBoardWeeklyRow[]> {
  const supabase = createServerSupabase();
  const requestedLimit = Math.max(1, Math.min(limit, 500));
  const safeUniverseCode = normalizeUniverseCode(
    universeCode ?? DEFAULT_UNIVERSE_CODE,
  );

  const retryLimits =
    safeUniverseCode === DEFAULT_UNIVERSE_CODE
      ? Array.from(new Set([requestedLimit, 200, 120, 60]))
      : Array.from(new Set([requestedLimit, 300, 200]));

  console.log("[QUERY DEBUG - INPUT]", {
    universeCode,
    safeUniverseCode,
    requestedLimit,
    retryLimits,
  });

  let data: any[] | null = null;
  let lastError: { code?: string | null; message?: string | null } | null = null;

  for (const attemptLimit of retryLimits) {
    const result = await supabase
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
        `
      )
      .eq("universe_code", safeUniverseCode)
      .order("rank_all", { ascending: true })
      .limit(attemptLimit);

    data = result.data ?? null;
    lastError = result.error ?? null;

    console.log("[QUERY DEBUG - ATTEMPT]", {
      safeUniverseCode,
      attemptLimit,
      rowCount: result.data?.length ?? 0,
      firstUniverse: (result.data?.[0] as any)?.universe_code ?? null,
      firstName: (result.data?.[0] as any)?.apt_name_ko ?? null,
      error: result.error?.message ?? null,
    });

    if (!lastError) break;
    if (!isStatementTimeout(lastError)) break;
  }

  if (lastError) {
    throw new Error(
      `Failed to fetch v_koaptix_latest_universe_rank_board_u: ${lastError.message}`
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

export async function getIndexChartRows(
  limit = 180
): Promise<DbIndexHistoryRow[]> {
  const supabase = createServerSupabase();
  const safeLimit = Math.max(12, Math.min(limit, 365));

  const { data, error } = await supabase
    .from("v_koaptix_total_market_cap_history")
    .select("snapshot_date, total_market_cap")
    .order("snapshot_date", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(`Failed to fetch v_koaptix_total_market_cap_history: ${error.message}`);
  }

  return (data ?? []) as DbIndexHistoryRow[];
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