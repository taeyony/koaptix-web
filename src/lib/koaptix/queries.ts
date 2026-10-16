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
  RankMovement,
} from "./types";
import { requireUniformUniverseServicePublication } from "./currentness";
import { buildCommonRankComparisons, previousWeekDate, type CommonRankSourceRow } from "./weeklyRankComparison";
import { hasComparableCapEvidence, type CapSnapshotEvidence, type CapComponentEvidence } from "./weeklyCapComparison";
import { parsePublicAddress, isLegalDongName } from "./districtIdentity";
import {
  KOAPTIX_OFFICIAL_BASE_DATE,
  KOAPTIX_PUBLIC_EXPOSURE_BLOCKED,
  KOAPTIX_PUBLIC_INDEX_BASELINE_MODE,
  KOAPTIX_PUBLIC_INDEX_SOURCE_MODE,
  KOAPTIX_PUBLIC_SERVICE_BASE_DATE,
  KOAPTIX_PUBLIC_SERVICE_BASE_VALUE,
  type KoaptixIndexBaselineMode,
  type KoaptixIndexSourceMode,
  type KoaptixPublicExposureStatus,
} from "../../types/koaptix";

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
  rank_movement: RankMovement;
};

export type ExactWeeklyMarketCapComparison = {
  history_snapshot_date: string;
  market_cap_delta_7d: number;
  market_cap_delta_pct_7d: number;
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
  const rankDelta7d = previousRank - currentRank;

  const rankMovement: WeeklyDerivedPayload["rank_movement"] =
    rankDelta7d > 0 ? "UP" : rankDelta7d < 0 ? "DOWN" : "SAME";

  return {
    history_snapshot_date: previous.snapshot_date ?? null,
    previous_rank_all: previousRank,
    rank_delta_7d: rankDelta7d,
    // This detail path has no matching calculation evidence. The dated public
    // board reader supplies capital differences only after verification.
    market_cap_delta_7d: null,
    market_cap_delta_pct_7d: null,
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

export async function getExactWeeklyMarketCapComparisonMap(
  currentBoardDate: string,
  currentRows: DbLatestRankBoardRow[],
): Promise<Map<string, ExactWeeklyMarketCapComparison>> {
  const complexIds = Array.from(new Set(extractComplexIds(currentRows))).slice(
    0,
    1000,
  );
  if (complexIds.length === 0) return new Map();

  const normalizedBoardDate = currentBoardDate.match(/^\d{4}-\d{2}-\d{2}$/)?.[0];
  if (!normalizedBoardDate) return new Map();

  const previousSnapshotDate = shiftSeoulDateString(normalizedBoardDate, -7);
  const currentMarketCapByComplexId = new Map<string, number>();

  for (const row of currentRows) {
    const key = row.complex_id == null ? "" : String(row.complex_id);
    const marketCap = toNullableNumber(row.market_cap_krw);
    if (!key || marketCap === null) continue;
    currentMarketCapByComplexId.set(key, marketCap);
  }

  const supabase = createServerSupabase();

  try {
    const { data, error } = await withLocalQueryTimeout(
      supabase
        .from("complex_rank_history")
        .select("snapshot_date, complex_id, market_cap_krw")
        .eq("snapshot_date", previousSnapshotDate)
        .in("complex_id", complexIds)
        .limit(complexIds.length),
      900,
      "EXACT_WEEKLY_MARKET_CAP_LOCAL_TIMEOUT",
    );

    if (error) throw error;

    // A previous total alone does not establish the same calculation basis.
    // Short-circuit on absent prior snapshots before reading any components.
    const previousEvidence = await withLocalQueryTimeout(supabase.from("apt_market_cap_snapshot")
      .select("snapshot_date,complex_id,market_cap_krw,total_household_count,priced_household_count,total_cluster_count,priced_cluster_count,calculation_version,price_method_summary")
      .eq("snapshot_date", previousSnapshotDate).in("complex_id", complexIds).limit(complexIds.length), 1200, "WEEKLY_CAP_EVIDENCE_TIMEOUT");
    if (previousEvidence.error || !previousEvidence.data?.length) return new Map();
    const eligibleIds = previousEvidence.data.map(row => Number(row.complex_id));
    const currentEvidence = await withLocalQueryTimeout(supabase.from("apt_market_cap_snapshot")
      .select("snapshot_date,complex_id,market_cap_krw,total_household_count,priced_household_count,total_cluster_count,priced_cluster_count,calculation_version,price_method_summary")
      .eq("snapshot_date", normalizedBoardDate).in("complex_id", eligibleIds).limit(eligibleIds.length), 1200, "WEEKLY_CAP_EVIDENCE_TIMEOUT");
    if (currentEvidence.error) return new Map();
    const components: CapComponentEvidence[] = [];
    for (let offset = 0; offset < 20000; offset += 1000) {
      const page = await withLocalQueryTimeout(supabase.from("apt_market_cap_cluster_component_snapshot")
        .select("snapshot_date,complex_id,area_cluster_id,household_count,representative_price_krw,cluster_market_cap_krw,component_status,calculation_version", { count: "exact" })
        .in("snapshot_date", [previousSnapshotDate, normalizedBoardDate]).in("complex_id", eligibleIds)
        .order("snapshot_date").order("complex_id").order("area_cluster_id").range(offset, offset + 999), 1200, "WEEKLY_CAP_COMPONENT_TIMEOUT");
      if (page.error || page.count == null || page.count > 20000) return new Map();
      components.push(...((page.data ?? []) as CapComponentEvidence[]));
      if (components.length === page.count) break;
      if (!page.data?.length || components.length > page.count || offset + 1000 >= 20000) return new Map();
    }
    const currentById = new Map((currentEvidence.data ?? []).map(row => [String(row.complex_id), row as CapSnapshotEvidence]));
    const previousById = new Map(previousEvidence.data.map(row => [String(row.complex_id), row as CapSnapshotEvidence]));

    const comparisons = new Map<string, ExactWeeklyMarketCapComparison>();
    for (const row of (data ?? []) as DbRankHistoryRow[]) {
      const key = row.complex_id == null ? "" : String(row.complex_id);
      const currentMarketCap = currentMarketCapByComplexId.get(key);
      const previousMarketCap = toNullableNumber(row.market_cap_krw);

      if (
        !key ||
        row.snapshot_date !== previousSnapshotDate ||
        currentMarketCap === undefined ||
        previousMarketCap === null ||
        previousMarketCap <= 0
      ) {
        continue;
      }

      if (!hasComparableCapEvidence(currentById.get(key), previousById.get(key), components, currentMarketCap, previousMarketCap)) continue;

      const marketCapDelta7d = currentMarketCap - previousMarketCap;
      const marketCapDeltaPct7d = Number(
        ((marketCapDelta7d / previousMarketCap) * 100).toFixed(2),
      );

      comparisons.set(key, {
        history_snapshot_date: previousSnapshotDate,
        market_cap_delta_7d: marketCapDelta7d,
        market_cap_delta_pct_7d: marketCapDeltaPct7d,
      });
    }

    return comparisons;
  } catch (error) {
    console.warn("[KOAPTIX] exact weekly market-cap lookup failed:", error);
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

export async function fetchRegionFallbackMap(
  supabase: ReturnType<typeof createServerSupabase>,
  complexIds: number[]
): Promise<Map<string, RegionFallbackRow>> {
  if (complexIds.length === 0) return new Map();

  if (complexIds.length > 200) {
    const result = new Map<string, RegionFallbackRow>();
    const chunks = Array.from({ length: Math.ceil(complexIds.length / 200) }, (_, i) => complexIds.slice(i * 200, (i + 1) * 200));
    const pages = await Promise.all(chunks.map(chunk => fetchRegionFallbackMap(supabase, chunk)));
    for (const page of pages) for (const [id, row] of page) result.set(id, row);
    return result;
  }

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

    const joinedRows = [...regionMapRows, ...aptComplexRows.filter(apt => !regionMapRows.some(row => String(row.complex_id) === String(apt.complex_id)))
      .map(apt => ({ complex_id: apt.complex_id, sgg_cd: null, lawd_cd: null, sigungu_name: null, umd_nm: null }))];
    for (const row of joinedRows) {
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
      const publicAddress = parsePublicAddress(aptComplex?.address_jibun);

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
        umd_nm: isLegalDongName(row.umd_nm) ? row.umd_nm : publicAddress.legalDongName || null,
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
const HOME_KPI_LOG_WINDOW_MS = 180_000;
const LATEST_RANK_BOARD_TIMEOUT_MS_KOREA = 1_800;
const LATEST_RANK_BOARD_TIMEOUT_MS_REGIONAL = 900;
let lastHomeKpiWarningAt = 0;

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

const HOME_TACTICAL_RANK_BOARD_LIMIT = 20;
const PUBLISHED_UNIVERSE_SERVICE_VIEW =
  "v_koaptix_latest_board_read_model_published";

/** Read the complete current population, pinned to the caller's publication.
 * Stored exact-week predecessors are reused; no price/eligibility recalculation.
 */
export async function getCommonWeeklyRankComparisons(currentRows: DbLatestRankBoardRow[]) {
  const identity = requireUniformUniverseServicePublication(currentRows);
  const supabase = createServerSupabase();
  const pageSize = 1000;
  const readPage = (offset: number) => withLocalQueryTimeout(
    supabase.from(PUBLISHED_UNIVERSE_SERVICE_VIEW)
      .select("generation_id,publication_version,publication_event_id,published_at,surface_code,snapshot_date,universe_code,complex_id,rank_all,previous_rank_all", { count: "exact" })
      .eq("surface_code", "UNIVERSE_SERVICE").eq("universe_code", identity.universe_code)
      .eq("generation_id", identity.generation_id).eq("publication_version", identity.publication_version)
      .eq("snapshot_date", identity.snapshot_date).order("rank_all", { ascending: true })
      .range(offset, offset + pageSize - 1),
    4000, "COMMON_RANK_POPULATION_TIMEOUT",
  );
  const [first, currentness] = await Promise.all([
    readPage(0),
    withLocalQueryTimeout(supabase.from("v_koaptix_latest_board_publication_currentness")
      .select("generation_id,publication_version,publication_event_id,published_at,surface_code,snapshot_date,universe_code,source_previous_snapshot_date,row_count")
      .eq("surface_code", "UNIVERSE_SERVICE").eq("universe_code", identity.universe_code)
      .eq("generation_id", identity.generation_id).eq("publication_version", identity.publication_version).maybeSingle(),
    4000, "COMMON_RANK_CURRENTNESS_TIMEOUT"),
  ]);
  const pages = [first];
  if (first.error || first.count == null || first.count < 1 || first.count > 20_000) throw new Error("Common rank population unavailable");
  if (currentness.error || !currentness.data || Number(currentness.data.row_count) !== first.count || currentness.data.source_previous_snapshot_date !== previousWeekDate(identity.snapshot_date)) {
    throw new Error("Exact weekly population provenance unavailable");
  }
  // At most three requests at once; never calculate from a truncated population.
  for (let offset = pageSize; offset < first.count; offset += pageSize * 3) {
    const offsets = [offset, offset + pageSize, offset + pageSize * 2].filter(value => value < first.count!);
    pages.push(...await Promise.all(offsets.map(readPage)));
  }
  if (pages.some(page => page.error || page.count !== first.count)) throw new Error("Incomplete common rank pages");
  const rows = pages.flatMap(page => page.data ?? []);
  const selected = requireUniformUniverseServicePublication([...currentRows, currentness.data, ...rows], identity.universe_code);
  if (selected.generation_id !== identity.generation_id) throw new Error("Common rank publication changed");
  const byId = new Map(rows.map(row => [String(row.complex_id), row]));
  if (currentRows.some(row => {
    const other = byId.get(String(row.complex_id));
    return !other || Number(other.rank_all) !== Number(row.rank_all) || Number(other.previous_rank_all) !== Number(row.previous_rank_all);
  })) throw new Error("Common rank input mismatch");
  return buildCommonRankComparisons(rows.map(row => ({ ...row, source_previous_snapshot_date: currentness.data!.source_previous_snapshot_date })) as CommonRankSourceRow[], first.count, identity.snapshot_date);
}

/**
 * Home initial SSR seed path.
 */
export async function getLatestRankBoard(
  universeCode: KnownUniverseCode | string = DEFAULT_UNIVERSE_CODE,
  limit: number = HOME_TACTICAL_RANK_BOARD_LIMIT,
  selection?: { complexId: string },
  options?: { timeoutMs?: number },
): Promise<DbLatestRankBoardWeeklyRow[]> {
  if (selection && !/^[1-9]\d*$/.test(selection.complexId)) throw new Error("Invalid public complex ID");
  const supabase = createServerSupabase();

  const safeUniverseCode = resolveServiceUniverseCode(
    universeCode ?? DEFAULT_UNIVERSE_CODE,
  );

  const requestedLimit = Math.max(
    1,
    Math.min(limit, MAX_LATEST_RANK_BOARD_LIMIT),
  );

  const retryLimits = buildRankBoardRetryLimits(
    requestedLimit,
    safeUniverseCode,
  );

  const defaultAttemptTimeoutMs =
    safeUniverseCode === DEFAULT_UNIVERSE_CODE
      ? LATEST_RANK_BOARD_TIMEOUT_MS_KOREA
      : LATEST_RANK_BOARD_TIMEOUT_MS_REGIONAL;
  const latestBoardAttemptTimeoutMs = typeof options?.timeoutMs === "number" && Number.isFinite(options.timeoutMs)
    ? Math.max(defaultAttemptTimeoutMs, Math.min(4000, options.timeoutMs))
    : defaultAttemptTimeoutMs;
  let lastError: { code?: string | null; message?: string | null } | null =
    null;

  for (const attemptLimit of retryLimits) {
    try {
      const query = supabase
          .from(PUBLISHED_UNIVERSE_SERVICE_VIEW)
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
          .eq("surface_code", "UNIVERSE_SERVICE")
          .eq("universe_code", safeUniverseCode)
          .order("rank_all", { ascending: true })
          .limit(attemptLimit);
      if (selection) {
        query.eq("complex_id", normalizeComplexId(selection.complexId)).gte("rank_all", 1).lte("rank_all", 1000);
      }
      const result = await withLocalQueryTimeout<{
        data: any[] | null;
        error: { code?: string | null; message?: string | null } | null;
      }>(
        query,
        latestBoardAttemptTimeoutMs,
        "LATEST_BOARD_LOCAL_TIMEOUT",
      );

      if (result.error) {
        lastError = result.error;
        continue;
      }

      const liveRows = result.data ?? [];
      const identity = requireUniformUniverseServicePublication(
        liveRows,
        safeUniverseCode,
      );
      if (selection && liveRows.some((row) =>
        String(row.complex_id) !== selection.complexId || !row.apt_name_ko?.trim() ||
        !Number.isInteger(Number(row.rank_all)) || Number(row.rank_all) < 1 || Number(row.rank_all) > 1000 ||
        !Number.isSafeInteger(Number(row.market_cap_krw)) || Number(row.market_cap_krw) <= 0
      )) throw new Error("Invalid published share row");

      return liveRows.map((row: any) => ({
        ...row,
        ...identity,
        history_snapshot_date: row.history_snapshot_date ?? null,
        rank_delta_7d: toNullableNumber(row.rank_delta_w),
        market_cap_delta_7d: null,
        market_cap_delta_pct_7d: null,
        __koaptixBoardSource: "live_latest",
        __koaptixFallbackMode: "none",
        universe_name: row.universe_name ?? null,
        location_search_label: [
          row.sigungu_name ?? null,
          row.legal_dong_name ?? null,
          row.apt_name_ko ?? null,
        ]
          .filter(Boolean)
          .join(" "),
      })) as DbLatestRankBoardWeeklyRow[];
    } catch (error) {
      lastError = {
        code: "LOCAL_TIMEOUT",
        message:
          error instanceof Error ? error.message : "LATEST_BOARD_LOCAL_TIMEOUT",
      };
    }
  }

  throw new Error(
    `Failed to fetch ${PUBLISHED_UNIVERSE_SERVICE_VIEW}: ${lastError?.message ?? "unknown error"}`,
  );
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
  const resolvedDong = isLegalDongName(liveRow.legal_dong_name) ? liveRow.legal_dong_name : regionFallback?.umd_nm ?? null;
  const resolvedSigunguFull =
    regionFallback?.sigungu_full_name ??
    resolvedSigungu ??
    null;

  return {
    ...liveRow,
    sigungu_name: resolvedSigungu,
    sigungu_full_name: resolvedSigunguFull,
    legal_dong_name: resolvedDong,
    address_jibun: regionFallback?.address_jibun ?? null,
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
  base_date?: string | null;
  base_value?: number | string | null;
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
  base_date?: string | null;
  base_value?: number | string | null;
  index_value: number | string | null;
  total_market_cap_krw: number | string | null;
  component_complex_count: number | string | null;
};

export type HomeIndexChartRow = {
  snapshotDate: string;
  baseDate: string | null;
  baseValue: number | null;
  indexSourceMode: KoaptixIndexSourceMode;
  baselineMode: KoaptixIndexBaselineMode;
  publicExposureStatus: KoaptixPublicExposureStatus;
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
  baseDate: string;
  baseValue: number;
  indexSourceMode: KoaptixIndexSourceMode;
  baselineMode: KoaptixIndexBaselineMode;
  publicExposureStatus: KoaptixPublicExposureStatus;
  officialGenesisPublicExposureBlocked: boolean;
  mixedBaselineGuard: "passed" | "blocked_official_genesis" | "filtered_mixed_rows";

  latestSnapshotDate: string | null;
  indexValue: number | null;
  change1m: number | null;
  changePct1m: number | null;
  totalMarketCapKrw: number | null;
  componentComplexCount: number | null;
  movement1m: string | null;

  rows: HomeIndexChartRow[];
};

function toDateOnly(value: string | null | undefined): string | null {
  return value?.slice?.(0, 10) ?? null;
}

function firstDefinedBaseDate(
  latestCard: DbIndexLatestCardRow | null,
  rows: DbIndexTimeseriesRow[],
): string | null {
  const rowBaseDate = rows
    .map((row) => toDateOnly(row.base_date))
    .find((baseDate): baseDate is string => Boolean(baseDate));

  return toDateOnly(latestCard?.base_date) ?? rowBaseDate ?? null;
}

function firstDefinedBaseValue(
  latestCard: DbIndexLatestCardRow | null,
  rows: DbIndexTimeseriesRow[],
): number | null {
  const rowBaseValue = rows
    .map((row) => toNullableNumber(row.base_value))
    .find((baseValue): baseValue is number => baseValue !== null);

  return toNullableNumber(latestCard?.base_value) ?? rowBaseValue ?? null;
}

async function fetchIndexChartChain(
  supabase: ReturnType<typeof createServerSupabase>,
  universeCode: string,
  limit: number,
): Promise<{
  latestCard: DbIndexLatestCardRow | null;
  rows: DbIndexTimeseriesRow[];
}> {
  if (universeCode === DEFAULT_UNIVERSE_CODE) {
    // This is the same 80-point service series already exposed by /api/home.
    // Scope BEFORE choosing latest/limiting: the generic latest card currently
    // points at the separately held official genesis. Reuse the existing public
    // read client without opening the protected rank-payload wrapper to anon.
    const result = await supabase
      .from("v_koaptix_index_timeseries")
      .select("*")
      .eq("universe_code", universeCode)
      .eq("index_code", "KOAPTIX_KOREA")
      .eq("base_date", KOAPTIX_PUBLIC_SERVICE_BASE_DATE)
      .order("snapshot_date", { ascending: false })
      .limit(200);
    if (result.error) throw new Error("Failed to fetch public service index history");
    const rows = (result.data ?? []) as DbIndexTimeseriesRow[];
    const latest = rows[0];
    return {
      rows,
      latestCard: latest ? {
        ...latest,
        // The legacy view's lag fields are not an exact one-month comparison.
        change_1m: null,
        change_pct_1m: null,
        movement_1m: null,
      } : null,
    };
  }

  const [latestCardResult, rowsResult] = await Promise.all([
    supabase
      .from("v_koaptix_latest_index_card")
      .select("*")
      .eq("universe_code", universeCode)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("v_koaptix_index_timeseries")
      .select("*")
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
  const scopedRawRows = rawRows.filter(
    (row) => row.universe_code === renderedUniverseCode,
  );
  const indexSourceMode = KOAPTIX_PUBLIC_INDEX_SOURCE_MODE;
  const exposedBaseDate = firstDefinedBaseDate(scopedLatestCard, scopedRawRows);
  const exposedBaseValue = firstDefinedBaseValue(scopedLatestCard, scopedRawRows);
  const officialGenesisPublicExposureBlocked =
    exposedBaseDate === KOAPTIX_OFFICIAL_BASE_DATE;
  const unsupportedPublicBaseDate =
    exposedBaseDate !== null && exposedBaseDate !== KOAPTIX_PUBLIC_SERVICE_BASE_DATE;
  const baselineBlocked = unsupportedPublicBaseDate;
  const publicServiceBaseDate = KOAPTIX_PUBLIC_SERVICE_BASE_DATE;
  const publicServiceBaseValue =
    exposedBaseDate === KOAPTIX_PUBLIC_SERVICE_BASE_DATE
      ? exposedBaseValue ?? KOAPTIX_PUBLIC_SERVICE_BASE_VALUE
      : KOAPTIX_PUBLIC_SERVICE_BASE_VALUE;

  const baselineScopedRows = scopedRawRows.filter((row) => {
    const rowBaseDate = toDateOnly(row.base_date);
    if (!rowBaseDate) return true;
    return rowBaseDate === publicServiceBaseDate;
  });

  const rows = baselineScopedRows
    .filter((row) => {
      const snapshotDate = row.snapshot_date?.slice?.(0, 10) ?? "";
      const value = toNullableNumber(row.index_value);
      return (
        !baselineBlocked &&
        Boolean(snapshotDate) &&
        value !== null
      );
    })
    .sort((a, b) => a.snapshot_date.slice(0, 10).localeCompare(b.snapshot_date.slice(0, 10)))
    .map((row) => ({
      snapshotDate: row.snapshot_date.slice(0, 10),
      baseDate: toDateOnly(row.base_date) ?? publicServiceBaseDate,
      baseValue: toNullableNumber(row.base_value) ?? publicServiceBaseValue,
      indexSourceMode,
      baselineMode: KOAPTIX_PUBLIC_INDEX_BASELINE_MODE,
      publicExposureStatus: KOAPTIX_PUBLIC_EXPOSURE_BLOCKED,
      value: toNullableNumber(row.index_value) ?? 0,
      totalMarketCapKrw: toNullableNumber(row.total_market_cap_krw),
      componentComplexCount: toNullableNumber(row.component_complex_count),
    }));
  const mixedBaselineGuard =
    officialGenesisPublicExposureBlocked
      ? "blocked_official_genesis"
      : baselineBlocked || baselineScopedRows.length < scopedRawRows.length
        ? "filtered_mixed_rows"
        : "passed";
  const canRenderPublicCard = !baselineBlocked;

  return {
    requestedUniverseCode,
    renderedUniverseCode,
    renderedUniverseLabel: getUniverseLabel(renderedUniverseCode),
    isFallbackToKorea:
      requestedUniverseCode !== renderedUniverseCode &&
      renderedUniverseCode === DEFAULT_UNIVERSE_CODE,

    indexCode: canRenderPublicCard ? scopedLatestCard?.index_code ?? null : null,
    indexName: canRenderPublicCard ? scopedLatestCard?.index_name ?? null : null,
    baseDate: publicServiceBaseDate,
    baseValue: publicServiceBaseValue,
    indexSourceMode,
    baselineMode: KOAPTIX_PUBLIC_INDEX_BASELINE_MODE,
    publicExposureStatus: KOAPTIX_PUBLIC_EXPOSURE_BLOCKED,
    officialGenesisPublicExposureBlocked,
    mixedBaselineGuard,

    latestSnapshotDate: canRenderPublicCard
      ? scopedLatestCard?.snapshot_date?.slice?.(0, 10) ?? null
      : null,
    indexValue: canRenderPublicCard
      ? toNullableNumber(scopedLatestCard?.index_value)
      : null,
    change1m: canRenderPublicCard
      ? toNullableNumber(scopedLatestCard?.change_1m)
      : null,
    changePct1m: canRenderPublicCard
      ? toNullableNumber(scopedLatestCard?.change_pct_1m)
      : null,
    totalMarketCapKrw: canRenderPublicCard
      ? toNullableNumber(scopedLatestCard?.total_market_cap_krw)
      : null,
    componentComplexCount: canRenderPublicCard
      ? toNullableNumber(scopedLatestCard?.component_complex_count)
      : null,
    movement1m: canRenderPublicCard ? scopedLatestCard?.movement_1m ?? null : null,

    rows,
  };
}

function formatKpiTrillionKrw(value: number | null) {
  if (value === null) return null;
  return `${value.toLocaleString("ko-KR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}조원`;
}

function formatKpiCount(value: number | null) {
  if (value === null) return null;
  return `${Math.round(value).toLocaleString("ko-KR")}개`;
}

function shouldLogHomeKpiWarning() {
  const now = Date.now();
  if (now - lastHomeKpiWarningAt < HOME_KPI_LOG_WINDOW_MS) {
    return false;
  }

  lastHomeKpiWarningAt = now;
  return true;
}

function normalizeHomeKpiPayload(data: any | null) {
  if (!data) return null;

  const totalMarketCapTrillion =
    toNullableNumber(data.market_cap_trillion_krw) ??
    toNullableNumber(data.total_market_cap_trillion_krw) ??
    (() => {
      const totalMarketCap = toNullableNumber(data.total_market_cap);
      return totalMarketCap === null ? null : totalMarketCap / 1_000_000_000_000;
    })();

  const listedUnits =
    toNullableNumber(data.listed_units) ??
    toNullableNumber(data.listed_complex_count);

  return {
    ...data,
    total_market_cap_krw_string:
      data.total_market_cap_krw_string ??
      formatKpiTrillionKrw(totalMarketCapTrillion),
    total_household_count_string:
      data.total_household_count_string ?? formatKpiCount(listedUnits),
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
    return normalizeHomeKpiPayload(data);
  } catch (error) {
    if (shouldLogHomeKpiWarning()) {
      console.info("[KOAPTIX] Home KPI unavailable; using fallback:", {
        message: error instanceof Error ? error.message : String(error),
        code:
          error && typeof error === "object" && "code" in error
            ? (error as { code?: unknown }).code
            : null,
      });
    }

    return null;
  }
}

export const COMPLEX_CHART_HISTORY_ROW_LIMIT = 2500;

// Reuse the public board's current surface and publication identity. Historic
// rows alone cannot prove that a complex remains in the current public cohort.
export async function getComplexHistoryPublicAnchors(complexIds: string[]) {
  const supabase = createServerSupabase();
  const ids = [...new Set(complexIds)];
  if (ids.length === 0 || ids.length > 10 || ids.some((id) => !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)))) {
    throw new Error("Reference history requires 1 to 10 valid complex IDs");
  }
  const { data, error } = await supabase
    .from(PUBLISHED_UNIVERSE_SERVICE_VIEW)
    .select("complex_id, snapshot_date, market_cap_krw, generation_id, publication_version")
    .eq("surface_code", "UNIVERSE_SERVICE")
    .eq("universe_code", "KOREA_ALL")
    .in("complex_id", ids)
    .limit(11);
  if (error) throw new Error("Could not verify the current public chart reference");
  const anchors: Record<string, { snapshotDate: string; marketCapKrw: number | null; generationId: string; publicationVersion: number }> = {};
  for (const row of data ?? []) {
    const id = String(row.complex_id);
    if (!ids.includes(id) || anchors[id]) throw new Error("Ambiguous public chart reference");
    anchors[id] = {
      snapshotDate: row.snapshot_date,
      marketCapKrw: row.market_cap_krw == null ? null : Number(row.market_cap_krw),
      generationId: row.generation_id,
      publicationVersion: Number(row.publication_version),
    };
  }
  return anchors;
}

export async function getComplexChartHistories(
  complexIds: Array<string | number>,
  options: { days?: number; sinceBase?: boolean } = {}
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
  const startDate = options.sinceBase
    ? KOAPTIX_OFFICIAL_BASE_DATE
    : shiftSeoulDateString(anchorDate, -safeDays);

  const historyQuery = () => supabase
    .from("complex_rank_history")
    .select("snapshot_date, complex_id, market_cap_krw, rank_all", options.sinceBase ? { count: "exact" } : undefined)
    .in("complex_id", normalizedIds)
    .gte("snapshot_date", startDate)
    .lte("snapshot_date", anchorDate)
    .order("snapshot_date", { ascending: true })
    .order("complex_id", { ascending: true });

  const historyRows: DbComplexChartHistoryRow[] = [];
  if (options.sinceBase) {
    // Bounded pages and an exact count prevent a REST row cap from silently
    // dropping newer history. Partial results are never returned as complete.
    const pageSize = 500;
    for (let offset = 0; offset < COMPLEX_CHART_HISTORY_ROW_LIMIT;) {
      const end = Math.min(offset + pageSize - 1, COMPLEX_CHART_HISTORY_ROW_LIMIT - 1);
      const { data, error, count } = await historyQuery().range(offset, end);
      if (error) throw new Error(`Failed to fetch complex chart histories: ${error.message}`);
      if (count == null || count > COMPLEX_CHART_HISTORY_ROW_LIMIT) {
        throw new Error("Cannot return complete complex history within the row budget; request fewer complexes");
      }
      const page = (data ?? []) as DbComplexChartHistoryRow[];
      historyRows.push(...page);
      if (historyRows.length === count) break;
      if (page.length === 0 || historyRows.length > count) throw new Error("Incomplete complex history page");
      offset += page.length;
    }
  } else {
    const { data, error } = await historyQuery()
      .limit(Math.min(normalizedIds.length * (safeDays + 14), COMPLEX_CHART_HISTORY_ROW_LIMIT));
    if (error) throw new Error(`Failed to fetch complex chart histories: ${error.message}`);
    historyRows.push(...((data ?? []) as DbComplexChartHistoryRow[]));
  }

  const grouped: Record<string, DbComplexChartHistoryRow[]> = {};
  for (const rawId of normalizedIds) {
    grouped[String(rawId)] = [];
  }

  for (const row of historyRows) {
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
