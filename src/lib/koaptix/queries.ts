import { createClient } from "@supabase/supabase-js";
import type {
  DbComplexDetailSheetBaseRow,
  DbComplexDetailSheetWeeklyRow,
  DbIndexHistoryRow,
  DbLatestRankBoardRow,
  DbLatestRankBoardWeeklyRow,
  DbRankHistoryRow,
  WeeklyDeltaPayload,
} from "./types";

const SEOUL_TIME_ZONE = "Asia/Seoul";
const DAY_MS = 24 * 60 * 60 * 1000;

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
): WeeklyDeltaPayload {
  if (!previous) {
    return {
      history_snapshot_date: null,
      rank_delta_7d: 0,
      market_cap_delta_7d: 0,
      market_cap_delta_pct_7d: 0,
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

  return {
    history_snapshot_date: previous.snapshot_date ?? null,
    rank_delta_7d: rankDelta7d,
    market_cap_delta_7d: marketCapDelta7d,
    market_cap_delta_pct_7d: marketCapDeltaPct7d,
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

    if (error) {
      throw error;
    }

    return data?.snapshot_date ?? toSeoulDateString(new Date());
  } catch {
    return toSeoulDateString(new Date());
  }
}

async function fetchWeeklyComparisonMap(
  supabase: ReturnType<typeof createServerSupabase>,
  complexIds: number[]
): Promise<Map<string, DbRankHistoryRow>> {
  if (complexIds.length === 0) {
    return new Map();
  }

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

    if (error) {
      throw error;
    }

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

    if (error) {
      throw error;
    }

    return (data ?? null) as DbRankHistoryRow | null;
  } catch (error) {
    console.warn("[KOAPTIX] weekly comparison detail lookup failed:", error);
    return null;
  }
}

export async function getLatestRankBoard(
  limit = 50
): Promise<DbLatestRankBoardWeeklyRow[]> {
  const supabase = createServerSupabase();
  const safeLimit = Math.max(1, Math.min(limit, 100));

  const { data, error } = await supabase
    .from("v_koaptix_latest_rank_board")
    .select(
      `
        complex_id,
        apt_name_ko,
        rank_all,
        market_cap_krw,
        market_cap_trillion_krw,
        sigungu_name,
        legal_dong_name
      `
    )
    .order("rank_all", { ascending: true })
    .limit(safeLimit);

  if (error) {
    throw new Error(`Failed to fetch v_koaptix_latest_rank_board: ${error.message}`);
  }

  const liveRows = (data ?? []) as DbLatestRankBoardRow[];
  if (liveRows.length === 0) {
    return [];
  }

  const comparisonMap = await fetchWeeklyComparisonMap(
    supabase,
    extractComplexIds(liveRows)
  );

  return liveRows.map((row) => {
    const key = row.complex_id == null ? "" : String(row.complex_id);
    const previous = comparisonMap.get(key) ?? null;

    const currentRank = toNumber(row.rank_all, 0);
    const currentMarketCap = toNumber(
      row.market_cap_krw,
      row.market_cap_trillion_krw != null
        ? Math.round(toNumber(row.market_cap_trillion_krw, 0) * 1_000_000_000_000)
        : 0
    );

    return {
      ...row,
      ...buildWeeklyDeltaPayload(currentRank, currentMarketCap, previous),
    };
  });
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
  if (!liveRow) {
    return null;
  }

  const previous = await fetchWeeklyComparisonByComplexId(
    supabase,
    complexId
  );

  const currentRank = toNumber(liveRow.rank_all, 0);
  const currentMarketCap = toNumber(
    liveRow.market_cap_krw,
    liveRow.market_cap_trillion_krw != null
      ? Math.round(toNumber(liveRow.market_cap_trillion_krw, 0) * 1_000_000_000_000)
      : 0
  );

  return {
    ...liveRow,
    ...buildWeeklyDeltaPayload(currentRank, currentMarketCap, previous),
  };
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
// --- 🚨 잼이사가 긴급 복구한 KPI 데이터 조회 엔진 ---
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