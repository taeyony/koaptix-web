import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  EffectiveRegionScope,
  RegionResolutionState,
} from "./regionAliasV1.types";
import type { RankingItem } from "./types";

export const RANKED_SEARCH_REGION_CANDIDATE_CAP = 80;
export const KOREA_RANK_AUTHORITY_VIEW =
  "v_koaptix_latest_universe_rank_board_u";
export const KOREA_RANK_AUTHORITY_SELECT = [
  "snapshot_date",
  "universe_code",
  "universe_name",
  "complex_id",
  "apt_name_ko",
  "sigungu_name",
  "legal_dong_name",
  "build_year",
  "household_count",
  "total_household_count",
  "recovery_52w",
  "rank_all",
  "previous_rank_all",
  "rank_delta_w",
  "rank_movement",
  "market_cap_krw",
  "market_cap_trillion_krw",
  "is_top1000",
].join(", ");

const KOREA_ALL_UNIVERSE_CODE = "KOREA_ALL";
const MAP_ROWS_PER_CANDIDATE_CAP = 4;
const SCOPED_REGION_STATES = new Set<RegionResolutionState>([
  "EXACT_CANONICAL",
  "EXACT_QUALIFIED",
  "SAFE_VARIANT_UNIQUE",
  "CONTEXT_UNIQUE",
]);

type RegionMapRow = {
  complex_id?: number | string | null;
  lawd_cd?: number | string | null;
  sgg_cd?: number | string | null;
};

type AptComplexRegionRow = {
  complex_id?: number | string | null;
  region_id?: number | string | null;
};

type CanonicalRegionRow = {
  region_id?: number | string | null;
  region_code?: number | string | null;
};

export type KoreaRankAuthorityRow = {
  snapshot_date?: string | null;
  universe_code?: string | null;
  universe_name?: string | null;
  complex_id?: number | string | null;
  apt_name_ko?: string | null;
  sigungu_name?: string | null;
  legal_dong_name?: string | null;
  build_year?: number | string | null;
  household_count?: number | string | null;
  total_household_count?: number | string | null;
  recovery_52w?: number | string | null;
  rank_all?: number | string | null;
  previous_rank_all?: number | string | null;
  rank_delta_w?: number | string | null;
  rank_movement?: string | null;
  market_cap_krw?: number | string | null;
  market_cap_trillion_krw?: number | string | null;
  is_top1000?: boolean | null;
};

export type ScopedRankedSearchActivationInput = {
  requestedUniverseCode: string;
  renderedUniverseCode: string;
  regionState: RegionResolutionState;
  rankedSearchAllowed: boolean;
  effectiveRegionScope: EffectiveRegionScope | null;
  residualQuery: string;
  candidateCount: number;
};

export type ScopedKoreaRankAuthoritySeedInput = Omit<
  ScopedRankedSearchActivationInput,
  "candidateCount"
>;

export type BoundedKoreaRankAuthoritySeedPlan = {
  allCandidateIds: string[];
  authorityLookupIds: string[];
  authorityLookupSeeds: Array<{
    complexId: string;
    source: "REGIONAL_NAME_COMPANION";
  }>;
  failure: "CANDIDATE_LIMIT_EXCEEDED" | null;
  stats: {
    existingKoreaCandidateCount: number;
    regionalCompanionCandidateCount: number;
    sharedUniqueCandidateCount: number;
    authorityLookupIdCount: number;
  };
};

export type KoreaRankAuthorityLookupFailure =
  | "CANDIDATE_LIMIT_EXCEEDED"
  | "KOREA_RANK_AUTHORITY_LOOKUP_FAILED"
  | "KOREA_RANK_AUTHORITY_MALFORMED";

export type KoreaRankAuthorityLookupResult = {
  rows: KoreaRankAuthorityRow[];
  failure: KoreaRankAuthorityLookupFailure | null;
  stats: {
    requestedIdCount: number;
    queryCount: number;
    rowCount: number;
  };
};

export type RankedSearchRegionScopeFailure =
  | "CANDIDATE_LIMIT_EXCEEDED"
  | "UNSUPPORTED_REGION_SCOPE"
  | "MAP_LOOKUP_FAILED"
  | "MAP_EVIDENCE_LIMIT_EXCEEDED"
  | "APT_COMPLEX_LOOKUP_FAILED"
  | "REGION_DIM_LOOKUP_FAILED"
  | "REGION_EVIDENCE_LOOKUP_FAILED";

export type RankedSearchRegionScopeStats = {
  candidateCount: number;
  uniqueCandidateCount: number;
  queryCount: number;
  mapRowCount: number;
  aptComplexRowCount: number;
  regionDimRowCount: number;
  mapCanonicalDisagreementCount: number;
  restoredCount: number;
};

export type RankedSearchRegionScopeResult = {
  items: RankingItem[];
  failure: RankedSearchRegionScopeFailure | null;
  stats: RankedSearchRegionScopeStats;
};

function normalizeDecimalId(value: unknown) {
  const normalized = String(value ?? "").trim();
  return /^\d+$/.test(normalized) ? normalized : null;
}

function normalizeSggCode(value: unknown) {
  const normalized = String(value ?? "").trim();
  return /^\d{5}$/.test(normalized) ? normalized : null;
}

function normalizeMapSggCode(row: RegionMapRow) {
  const sggCode = normalizeSggCode(row.sgg_cd);
  if (sggCode) return sggCode;

  const lawdCode = String(row.lawd_cd ?? "").trim();
  return /^\d{5}(?:\d{5})?$/.test(lawdCode)
    ? lawdCode.slice(0, 5)
    : null;
}

function emptyStats(candidateCount: number): RankedSearchRegionScopeStats {
  return {
    candidateCount,
    uniqueCandidateCount: 0,
    queryCount: 0,
    mapRowCount: 0,
    aptComplexRowCount: 0,
    regionDimRowCount: 0,
    mapCanonicalDisagreementCount: 0,
    restoredCount: 0,
  };
}

function failResult(
  failure: RankedSearchRegionScopeFailure,
  stats: RankedSearchRegionScopeStats,
): RankedSearchRegionScopeResult {
  return { items: [], failure, stats: { ...stats, restoredCount: 0 } };
}

function addToSetMap(
  target: Map<string, Set<string>>,
  key: string,
  value: string,
) {
  const values = target.get(key) ?? new Set<string>();
  values.add(value);
  target.set(key, values);
}

function getOnlyValue(values: ReadonlySet<string> | undefined) {
  if (!values || values.size !== 1) return null;
  return values.values().next().value ?? null;
}

function toPositiveInteger(value: unknown) {
  const normalized = String(value ?? "").trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function shouldCollectScopedKoreaRankAuthoritySeeds(
  input: ScopedKoreaRankAuthoritySeedInput,
) {
  return (
    input.requestedUniverseCode === KOREA_ALL_UNIVERSE_CODE &&
    input.renderedUniverseCode === KOREA_ALL_UNIVERSE_CODE &&
    input.rankedSearchAllowed &&
    SCOPED_REGION_STATES.has(input.regionState) &&
    input.effectiveRegionScope !== null &&
    input.residualQuery.trim().length > 0
  );
}

export function shouldHydrateScopedKoreaRankedCandidates(
  input: ScopedRankedSearchActivationInput,
) {
  return (
    shouldCollectScopedKoreaRankAuthoritySeeds(input) &&
    input.candidateCount > 0
  );
}

export function buildBoundedKoreaRankAuthoritySeedPlan(
  existingKoreaCandidates: readonly RankingItem[],
  regionalCompanionCandidates: readonly RankingItem[],
): BoundedKoreaRankAuthoritySeedPlan {
  const existingIds = new Set<string>();
  const allCandidateIds: string[] = [];
  const authorityLookupIds: string[] = [];
  const authorityLookupSeeds: BoundedKoreaRankAuthoritySeedPlan["authorityLookupSeeds"] =
    [];
  let existingKoreaCandidateCount = 0;
  let regionalCompanionCandidateCount = 0;

  for (const candidate of existingKoreaCandidates) {
    const complexId = normalizeDecimalId(candidate.complexId);
    if (!complexId || existingIds.has(complexId)) continue;
    existingIds.add(complexId);
    allCandidateIds.push(complexId);
    existingKoreaCandidateCount += 1;
  }

  const allIds = new Set(allCandidateIds);
  for (const candidate of regionalCompanionCandidates) {
    const complexId = normalizeDecimalId(candidate.complexId);
    if (!complexId || allIds.has(complexId)) continue;
    allIds.add(complexId);
    allCandidateIds.push(complexId);
    authorityLookupIds.push(complexId);
    authorityLookupSeeds.push({
      complexId,
      source: "REGIONAL_NAME_COMPANION",
    });
    regionalCompanionCandidateCount += 1;
  }

  const stats = {
    existingKoreaCandidateCount,
    regionalCompanionCandidateCount,
    sharedUniqueCandidateCount: allCandidateIds.length,
    authorityLookupIdCount: authorityLookupIds.length,
  };

  if (allCandidateIds.length > RANKED_SEARCH_REGION_CANDIDATE_CAP) {
    return {
      allCandidateIds: [],
      authorityLookupIds: [],
      authorityLookupSeeds: [],
      failure: "CANDIDATE_LIMIT_EXCEEDED",
      stats,
    };
  }

  return {
    allCandidateIds,
    authorityLookupIds,
    authorityLookupSeeds,
    failure: null,
    stats,
  };
}

export async function fetchBoundedKoreaRankAuthorityRows(
  supabase: Pick<SupabaseClient, "from">,
  complexIds: readonly string[],
): Promise<KoreaRankAuthorityLookupResult> {
  const normalizedIds: string[] = [];
  const seenIds = new Set<string>();

  for (const value of complexIds) {
    const complexId = normalizeDecimalId(value);
    if (!complexId) {
      return {
        rows: [],
        failure: "KOREA_RANK_AUTHORITY_MALFORMED",
        stats: { requestedIdCount: 0, queryCount: 0, rowCount: 0 },
      };
    }
    if (!seenIds.has(complexId)) {
      seenIds.add(complexId);
      normalizedIds.push(complexId);
    }
  }

  const stats = {
    requestedIdCount: normalizedIds.length,
    queryCount: 0,
    rowCount: 0,
  };

  if (normalizedIds.length > RANKED_SEARCH_REGION_CANDIDATE_CAP) {
    return {
      rows: [],
      failure: "CANDIDATE_LIMIT_EXCEEDED",
      stats,
    };
  }
  if (normalizedIds.length === 0) {
    return { rows: [], failure: null, stats };
  }

  stats.queryCount = 1;
  let result;
  try {
    result = await supabase
      .from(KOREA_RANK_AUTHORITY_VIEW)
      .select(KOREA_RANK_AUTHORITY_SELECT)
      .eq("universe_code", KOREA_ALL_UNIVERSE_CODE)
      .in("complex_id", normalizedIds)
      .order("rank_all", { ascending: true })
      .limit(normalizedIds.length + 1);
  } catch {
    return {
      rows: [],
      failure: "KOREA_RANK_AUTHORITY_LOOKUP_FAILED",
      stats,
    };
  }

  if (result.error) {
    return {
      rows: [],
      failure: "KOREA_RANK_AUTHORITY_LOOKUP_FAILED",
      stats,
    };
  }

  const rows = (result.data ?? []) as KoreaRankAuthorityRow[];
  stats.rowCount = rows.length;
  if (rows.length > normalizedIds.length) {
    return {
      rows: [],
      failure: "KOREA_RANK_AUTHORITY_MALFORMED",
      stats,
    };
  }

  const requestedIds = new Set(normalizedIds);
  const returnedIds = new Set<string>();
  for (const row of rows) {
    const complexId = normalizeDecimalId(row.complex_id);
    const rankAll = toPositiveInteger(row.rank_all);
    const aptName = String(row.apt_name_ko ?? "").trim();
    if (
      !complexId ||
      !requestedIds.has(complexId) ||
      returnedIds.has(complexId) ||
      row.universe_code !== KOREA_ALL_UNIVERSE_CODE ||
      rankAll === null ||
      aptName.length === 0
    ) {
      return {
        rows: [],
        failure: "KOREA_RANK_AUTHORITY_MALFORMED",
        stats,
      };
    }
    returnedIds.add(complexId);
  }

  const orderedRows = [...rows].sort((left, right) => {
    const rankDelta =
      (toPositiveInteger(left.rank_all) ?? Number.MAX_SAFE_INTEGER) -
      (toPositiveInteger(right.rank_all) ?? Number.MAX_SAFE_INTEGER);
    if (rankDelta !== 0) return rankDelta;
    return String(left.complex_id).localeCompare(String(right.complex_id));
  });

  return { rows: orderedRows, failure: null, stats };
}

export function mergeKoreaRankedAuthorityCandidates(
  existingKoreaCandidates: readonly RankingItem[],
  recoveredKoreaCandidates: readonly RankingItem[],
) {
  const merged: RankingItem[] = [];
  const seenIds = new Set<string>();

  for (const candidate of existingKoreaCandidates) {
    const complexId = normalizeDecimalId(candidate.complexId);
    if (!complexId || seenIds.has(complexId)) continue;
    seenIds.add(complexId);
    merged.push(candidate);
  }

  const orderedRecovered = [...recoveredKoreaCandidates].sort((left, right) => {
    const rankDelta =
      (toPositiveInteger(left.rank) ?? Number.MAX_SAFE_INTEGER) -
      (toPositiveInteger(right.rank) ?? Number.MAX_SAFE_INTEGER);
    if (rankDelta !== 0) return rankDelta;
    return String(left.complexId).localeCompare(String(right.complexId));
  });

  for (const candidate of orderedRecovered) {
    const complexId = normalizeDecimalId(candidate.complexId);
    const universeCode = candidate.universeCode ?? candidate.universe_code;
    if (
      !complexId ||
      seenIds.has(complexId) ||
      universeCode !== KOREA_ALL_UNIVERSE_CODE ||
      toPositiveInteger(candidate.rank) === null
    ) {
      continue;
    }
    seenIds.add(complexId);
    merged.push(candidate);
  }

  return merged;
}

export function rankedSearchSggMatchesScope(
  candidateSggCode: unknown,
  scope: EffectiveRegionScope,
) {
  const sggCode = normalizeSggCode(candidateSggCode);
  const scopeCode = String(scope.regionCode ?? "").trim();
  if (!sggCode) return false;

  if (scope.regionLevel === "sigungu") {
    return /^\d{5}$/.test(scopeCode) && sggCode === scopeCode;
  }

  if (scope.regionLevel === "sido") {
    return /^\d{2}$/.test(scopeCode) && sggCode.startsWith(scopeCode);
  }

  return false;
}

export async function filterRankedSearchCandidatesByRegionScope(
  supabase: Pick<SupabaseClient, "from">,
  candidates: readonly RankingItem[],
  scope: EffectiveRegionScope,
): Promise<RankedSearchRegionScopeResult> {
  const stats = emptyStats(candidates.length);
  const orderedCandidates: RankingItem[] = [];
  const candidateIds: string[] = [];
  const seenCandidateIds = new Set<string>();

  for (const candidate of candidates) {
    const complexId = normalizeDecimalId(candidate.complexId);
    if (!complexId || seenCandidateIds.has(complexId)) continue;
    seenCandidateIds.add(complexId);
    candidateIds.push(complexId);
    orderedCandidates.push(candidate);
  }
  stats.uniqueCandidateCount = candidateIds.length;

  if (candidateIds.length > RANKED_SEARCH_REGION_CANDIDATE_CAP) {
    return failResult("CANDIDATE_LIMIT_EXCEEDED", stats);
  }
  if (candidateIds.length === 0) {
    return { items: [], failure: null, stats };
  }
  if (
    (scope.regionLevel !== "sigungu" ||
      !/^\d{5}$/.test(String(scope.regionCode ?? "").trim())) &&
    (scope.regionLevel !== "sido" ||
      !/^\d{2}$/.test(String(scope.regionCode ?? "").trim()))
  ) {
    return failResult("UNSUPPORTED_REGION_SCOPE", stats);
  }

  const mapRowCap = candidateIds.length * MAP_ROWS_PER_CANDIDATE_CAP;
  stats.queryCount = 2;

  let mapResult;
  let aptResult;
  try {
    [mapResult, aptResult] = await Promise.all([
      supabase
        .from("koaptix_complex_region_map")
        .select("complex_id, sgg_cd, lawd_cd")
        .in("complex_id", candidateIds)
        .limit(mapRowCap + 1),
      supabase
        .from("apt_complex")
        .select("complex_id, region_id")
        .in("complex_id", candidateIds)
        .limit(candidateIds.length),
    ]);
  } catch {
    return failResult("REGION_EVIDENCE_LOOKUP_FAILED", stats);
  }

  if (mapResult.error) return failResult("MAP_LOOKUP_FAILED", stats);
  if (aptResult.error) return failResult("APT_COMPLEX_LOOKUP_FAILED", stats);

  const mapRows = (mapResult.data ?? []) as RegionMapRow[];
  const aptRows = (aptResult.data ?? []) as AptComplexRegionRow[];
  stats.mapRowCount = mapRows.length;
  stats.aptComplexRowCount = aptRows.length;
  if (mapRows.length > mapRowCap) {
    return failResult("MAP_EVIDENCE_LIMIT_EXCEEDED", stats);
  }

  const requestedIds = new Set(candidateIds);
  const mapCodesByComplexId = new Map<string, Set<string>>();
  for (const row of mapRows) {
    const complexId = normalizeDecimalId(row.complex_id);
    const sggCode = normalizeMapSggCode(row);
    if (!complexId || !requestedIds.has(complexId) || !sggCode) continue;
    addToSetMap(mapCodesByComplexId, complexId, sggCode);
  }

  const regionIdsByComplexId = new Map<string, Set<string>>();
  const regionIds = new Set<string>();
  for (const row of aptRows) {
    const complexId = normalizeDecimalId(row.complex_id);
    const regionId = normalizeDecimalId(row.region_id);
    if (!complexId || !requestedIds.has(complexId) || !regionId) continue;
    addToSetMap(regionIdsByComplexId, complexId, regionId);
    regionIds.add(regionId);
  }

  const regionCodesByRegionId = new Map<string, Set<string>>();
  if (regionIds.size > 0) {
    stats.queryCount += 1;
    let regionResult;
    try {
      regionResult = await supabase
        .from("region_dim")
        .select("region_id, region_code")
        .eq("region_type", "sigungu")
        .in("region_id", Array.from(regionIds))
        .limit(regionIds.size);
    } catch {
      return failResult("REGION_EVIDENCE_LOOKUP_FAILED", stats);
    }

    if (regionResult.error) {
      return failResult("REGION_DIM_LOOKUP_FAILED", stats);
    }

    const regionRows = (regionResult.data ?? []) as CanonicalRegionRow[];
    stats.regionDimRowCount = regionRows.length;
    for (const row of regionRows) {
      const regionId = normalizeDecimalId(row.region_id);
      const regionCode = normalizeSggCode(row.region_code);
      if (!regionId || !regionIds.has(regionId) || !regionCode) continue;
      addToSetMap(regionCodesByRegionId, regionId, regionCode);
    }
  }

  const restoredItems: RankingItem[] = [];
  for (const candidate of orderedCandidates) {
    const complexId = normalizeDecimalId(candidate.complexId);
    if (!complexId) continue;

    const mapCodes = mapCodesByComplexId.get(complexId);
    if (mapCodes && mapCodes.size > 1) continue;
    const mapCode = getOnlyValue(mapCodes);

    const candidateRegionIds = regionIdsByComplexId.get(complexId);
    const canonicalRegionId = getOnlyValue(candidateRegionIds);
    const canonicalCode = canonicalRegionId
      ? getOnlyValue(regionCodesByRegionId.get(canonicalRegionId))
      : null;

    if (mapCode && canonicalCode && mapCode !== canonicalCode) {
      stats.mapCanonicalDisagreementCount += 1;
    }

    const effectiveSggCode = mapCode ?? canonicalCode;
    if (effectiveSggCode && rankedSearchSggMatchesScope(effectiveSggCode, scope)) {
      restoredItems.push(candidate);
    }
  }

  stats.restoredCount = restoredItems.length;
  return { items: restoredItems, failure: null, stats };
}
