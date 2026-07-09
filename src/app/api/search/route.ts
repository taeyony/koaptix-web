import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  DEFAULT_UNIVERSE_CODE,
  buildUniverseResolutionMetadata,
  resolveUniverseRequest,
  type UniverseRequestResolution,
} from "../../../lib/koaptix/universes";
import { getLatestRankBoard } from "../../../lib/koaptix/queries";
import { getKoaptixCurrentnessHeaders } from "../../../lib/koaptix/currentness";
import type {
  DiscoveryCandidate,
  DiscoveryWarning,
  RankingItem,
} from "../../../lib/koaptix/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SEARCH_CACHE_TTL_MS = 30_000;
const SEARCH_STALE_CACHE_TTL_MS = 600_000;
const SEARCH_REGIONAL_RETRY_LIMIT = 40;
const SEARCH_EXACT_NAME_FALLBACK_SOURCE_LIMIT = 1_000;
const SEARCH_RANK_VISIBLE_FALLBACK_RESULT_LIMIT = 8;
const SEARCH_KOREA_ALL_DONG_AUXILIARY_RESULT_LIMIT = 10;
const SEARCH_REGIONAL_NAME_AUXILIARY_RESULT_LIMIT = 8;
const SEARCH_REGIONAL_NAME_AUXILIARY_PER_UNIVERSE_LIMIT = 8;
const SEARCH_DISCOVERY_CANDIDATE_LIMIT = 5;
const SEARCH_DISCOVERY_NAME_SOURCE_LIMIT = 120;
const SEARCH_DISCOVERY_REGION_SOURCE_LIMIT = 80;
const SEARCH_DISCOVERY_HYDRATION_LIMIT = 120;
const SEARCH_DISCOVERY_QUERY_TERM_LIMIT = 8;
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

type SearchBoardRow = {
  complex_id?: number | string | null;
  id?: number | string | null;
  apt_name_ko?: string | null;
  name?: string | null;
  rank_all?: number | string | null;
  rank?: number | string | null;
  sigungu_name?: string | null;
  legal_dong_name?: string | null;
  build_year?: number | string | null;
  approval_year?: number | string | null;
  household_count?: number | string | null;
  total_household_count?: number | string | null;
  households?: number | string | null;
  recovery_52w?: number | string | null;
  recovery_rate_52w?: number | string | null;
  rank_delta_w?: number | string | null;
  rank_delta_7d?: number | string | null;
  rank_movement?: string | null;
  previous_rank_all?: number | string | null;
  market_cap_krw?: number | string | null;
  market_cap_trillion_krw?: number | string | null;
  universe_code?: string | null;
  universe_name?: string | null;
  is_top1000?: boolean | null;
};

type DiscoveryAptComplexRow = {
  complex_id?: number | string | null;
  apt_name_ko?: string | null;
  region_id?: number | string | null;
  address_jibun?: string | null;
};

type DiscoveryRegionMapRow = {
  complex_id?: number | string | null;
  lawd_cd?: number | string | null;
  sgg_cd?: number | string | null;
  sigungu_name?: string | null;
  umd_nm?: string | null;
};

type DiscoveryAliasRow = {
  complex_id?: number | string | null;
  alias_name?: string | null;
};

type DiscoveryExternalIdRow = {
  complex_id?: number | string | null;
  source_system?: string | null;
  external_id?: string | null;
};

type DiscoveryFixtureSeed = {
  complexId: string;
  fallbackName: string;
  fallbackRegionLabel: string;
  warnings: DiscoveryWarning[];
};

type DiscoverySeed = DiscoveryFixtureSeed & {
  matchScore: number;
  source: "fixture" | "generic";
};

type DiscoveryMatchAssessment = {
  passes: boolean;
  score: number;
  warnings: DiscoveryWarning[];
};

type DiscoveryMode =
  | "DISABLED_FOR_BROAD_NATIONAL"
  | "SCOPED_ONLY"
  | "CONTEXT_RICH_ALLOWED"
  | "POSITIVE_CONTROL_ALLOWED";

type SearchQueryClassification = {
  normalizedQuery: string;
  compactQuery: string;
  tokens: string[];
  hasRegionToken: boolean;
  hasDongToken: boolean;
  hasSigunguToken: boolean;
  hasApartmentSuffix: boolean;
  hasSelectedScopedUniverse: boolean;
  isKoreaAllUnscoped: boolean;
  isBroadGenericTerm: boolean;
  isPositiveControlIntent: boolean;
  isContextRichIntent: boolean;
  discoveryMode: DiscoveryMode;
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

const DISCOVERY_ACCEPTANCE_SEEDS: DiscoveryFixtureSeed[] = [
  {
    complexId: "168804",
    fallbackName: "진월한국아델리움",
    fallbackRegionLabel: "광주 남구 진월동",
    warnings: ["SOURCE_IDENTITY_AMBIGUOUS"],
  },
  {
    complexId: "168810",
    fallbackName: "진월한국아델리움",
    fallbackRegionLabel: "광주 남구 진월동",
    warnings: ["SOURCE_IDENTITY_AMBIGUOUS", "AREA_HOUSEHOLD_GAP"],
  },
  {
    complexId: "168815",
    fallbackName: "진월한국아델리움",
    fallbackRegionLabel: "광주 남구 진월동",
    warnings: ["SOURCE_IDENTITY_AMBIGUOUS", "AREA_HOUSEHOLD_GAP"],
  },
];

const DISCOVERY_ACCEPTANCE_TERMS = [
  "한국아델리움",
  "한국 아델리움",
  "아델리움",
  "진월한국아델리움",
  "진월 한국아델리움",
  "진월동한국아델리움",
  "진월동 한국아델리움",
  "한국아델리움1차",
  "진월동한국아델리움1차",
  "진월동 한국아델리움1차",
  "진월2차한국아델리움",
  "진월2차 한국아델리움",
  "진월한국아델리움57",
  "한국아델리움57",
  "아델리움57",
];

const DISCOVERY_COMPATIBLE_UNIVERSE_CODES = new Set([
  DEFAULT_UNIVERSE_CODE,
  "GWANGJU_ALL",
]);

const DISCOVERY_MACRO_SGG_PREFIX: Record<string, string> = {
  SEOUL_ALL: "11",
  BUSAN_ALL: "26",
  DAEGU_ALL: "27",
  INCHEON_ALL: "28",
  GWANGJU_ALL: "29",
  DAEJEON_ALL: "30",
  ULSAN_ALL: "31",
  SEJONG_ALL: "36",
  GYEONGGI_ALL: "41",
  GANGWON_ALL: "42",
  CHUNGBUK_ALL: "43",
  CHUNGNAM_ALL: "44",
  JEONBUK_ALL: "52",
  JEONNAM_ALL: "46",
  GYEONGBUK_ALL: "47",
  GYEONGNAM_ALL: "48",
  JEJU_ALL: "50",
};

const DISCOVERY_REGION_CONTEXT_TERMS = [
  "광주",
  "광주광역시",
  "광주특별시",
  "전남광주",
  "전남광주통합특별시",
  "전남",
  "전라남도",
  "남구",
  "진월동",
  "진월",
];

const DISCOVERY_BROAD_GENERIC_BASE_TERMS = new Set([
  "새한",
  "현대",
  "우성",
  "주공",
  "자이",
  "푸르지오",
  "래미안",
  "아이파크",
  "더샵",
  "롯데캐슬",
  "힐스테이트",
]);

function parseLimit(value: string | null, fallback = 12, min = 5, max = 20) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(parsed, max));
}

function createDiscoverySupabase() {
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

function normalizeDiscoveryComplexId(value: unknown) {
  return String(value ?? "").trim();
}

function keyRowsByComplexId<T extends { complex_id?: number | string | null }>(
  rows: T[] | null | undefined,
) {
  const result = new Map<string, T>();
  for (const row of rows ?? []) {
    const complexId = normalizeDiscoveryComplexId(row.complex_id);
    if (complexId && !result.has(complexId)) {
      result.set(complexId, row);
    }
  }
  return result;
}

function groupRowsByComplexId<T extends { complex_id?: number | string | null }>(
  rows: T[] | null | undefined,
) {
  const result = new Map<string, T[]>();
  for (const row of rows ?? []) {
    const complexId = normalizeDiscoveryComplexId(row.complex_id);
    if (!complexId) continue;
    const existing = result.get(complexId) ?? [];
    existing.push(row);
    result.set(complexId, existing);
  }
  return result;
}

function complexIdSetFromRows(
  rows: { complex_id?: number | string | null }[] | null | undefined,
) {
  return new Set(
    (rows ?? [])
      .map((row) => normalizeDiscoveryComplexId(row.complex_id))
      .filter(Boolean),
  );
}

function normalizeDiscoveryNameTerm(value: unknown) {
  let normalized = normalizeSearchToken(value)
    .replace(/아파트$/i, "")
    .replace(/apt$/i, "")
    .replace(/단지$/i, "");

  // Handle common context-glued Korean searches such as "진월동새한아파트".
  const lastLocationSuffixIndex = Math.max(
    normalized.lastIndexOf("동"),
    normalized.lastIndexOf("구"),
    normalized.lastIndexOf("시"),
    normalized.lastIndexOf("군"),
    normalized.lastIndexOf("읍"),
    normalized.lastIndexOf("면"),
    normalized.lastIndexOf("리"),
  );

  if (
    lastLocationSuffixIndex >= 0 &&
    lastLocationSuffixIndex < normalized.length - 1
  ) {
    normalized = normalized.slice(lastLocationSuffixIndex + 1);
    normalized = normalized
      .replace(/아파트$/i, "")
      .replace(/apt$/i, "")
      .replace(/단지$/i, "");
  }

  return normalized;
}

function isDiscoveryLocationTerm(value: string) {
  const normalized = normalizeSearchToken(value);
  if (normalized.length < 2) return false;

  return (
    /[시군구동읍면리]$/.test(normalized) ||
    normalized === "광주" ||
    normalized === "진월"
  );
}

function getDiscoveryNameTerms(q: string) {
  const terms = new Set<string>();
  const raw = String(q ?? "").trim();
  const normalizedQuery = normalizeSearchToken(raw);

  if (normalizedQuery) {
    terms.add(normalizeDiscoveryNameTerm(normalizedQuery));
  }

  const compactWithoutKnownContext = normalizedQuery.replace(
    /(광주광역시|광주|남구|진월동|진월)/g,
    "",
  );
  if (compactWithoutKnownContext) {
    terms.add(normalizeDiscoveryNameTerm(compactWithoutKnownContext));
  }

  for (const token of raw.split(/\s+/)) {
    const normalizedToken = normalizeSearchToken(token);
    if (!normalizedToken || isDiscoveryLocationTerm(normalizedToken)) continue;
    terms.add(normalizedToken);
    terms.add(normalizeDiscoveryNameTerm(normalizedToken));
  }

  return Array.from(terms)
    .filter((term) => term.length >= 2 && hasHangul(term))
    .slice(0, SEARCH_DISCOVERY_QUERY_TERM_LIMIT);
}

function getDiscoveryLocationTerms(q: string) {
  const terms = new Set<string>();
  const raw = String(q ?? "").trim();
  const normalizedQuery = normalizeSearchToken(raw);

  for (const token of raw.split(/\s+/)) {
    const normalizedToken = normalizeSearchToken(token);
    if (!normalizedToken) continue;
    if (isDiscoveryLocationTerm(normalizedToken)) {
      terms.add(normalizedToken);
      terms.add(stripKoreanLocationSuffix(normalizedToken));
    }
  }

  for (const knownTerm of ["광주", "남구", "진월동", "진월"]) {
    if (normalizedQuery.includes(knownTerm)) {
      terms.add(knownTerm);
      terms.add(stripKoreanLocationSuffix(knownTerm));
    }
  }

  return Array.from(terms)
    .map(normalizeSearchToken)
    .filter((term) => term.length >= 2 && hasHangul(term))
    .slice(0, SEARCH_DISCOVERY_QUERY_TERM_LIMIT);
}

function normalizeBroadGenericBaseTerm(value: string) {
  return normalizeSearchToken(value)
    .replace(/아파트$/i, "")
    .replace(/apt$/i, "")
    .replace(/단지$/i, "");
}

function hasPositiveControlDiscoveryIntent(normalizedQuery: string) {
  return DISCOVERY_ACCEPTANCE_TERMS.some((term) => {
    const normalizedTerm = normalizeSearchToken(term);
    return (
      normalizedQuery.includes(normalizedTerm) ||
      normalizedTerm.includes(normalizedQuery)
    );
  });
}

function getNormalizedSearchTokens(q: string) {
  return String(q ?? "")
    .trim()
    .split(/\s+/)
    .map(normalizeSearchToken)
    .filter(Boolean);
}

function includesNormalizedTerm(normalizedQuery: string, terms: string[]) {
  return terms
    .map(normalizeSearchToken)
    .some((term) => term.length >= 2 && normalizedQuery.includes(term));
}

function classifySearchQuery(
  q: string,
  universeCode: string,
): SearchQueryClassification {
  const normalizedQuery = normalizeSearchToken(q);
  const compactQuery = normalizedQuery;
  const tokens = getNormalizedSearchTokens(q);
  const nameTerms = getDiscoveryNameTerms(q);
  const hasKnownRegionToken = includesNormalizedTerm(
    normalizedQuery,
    DISCOVERY_REGION_CONTEXT_TERMS,
  );
  const hasLocationTerm = getDiscoveryLocationTerms(q).length > 0;
  const hasDongToken =
    /[\uAC00-\uD7A3]+동/.test(normalizedQuery) ||
    tokens.some((token) => token.endsWith("동"));
  const hasSigunguToken =
    /[\uAC00-\uD7A3]+[시군구]/.test(normalizedQuery) ||
    tokens.some((token) => /[시군구]$/.test(token));
  const hasRegionToken = hasKnownRegionToken || hasLocationTerm;
  const hasApartmentSuffix =
    /(아파트|apt|단지)$/i.test(String(q ?? "").trim()) ||
    /(아파트|apt|단지)/i.test(normalizedQuery);
  const hasSelectedScopedUniverse = universeCode !== DEFAULT_UNIVERSE_CODE;
  const isPositiveControlIntent = hasPositiveControlDiscoveryIntent(normalizedQuery);
  const hasSpecificNameTerm = nameTerms.some(
    (term) => normalizeBroadGenericBaseTerm(term).length >= 2,
  );
  const isContextRichIntent =
    hasRegionToken && (hasSpecificNameTerm || hasApartmentSuffix);
  const isKoreaAllUnscoped =
    universeCode === DEFAULT_UNIVERSE_CODE &&
    !hasRegionToken &&
    !isPositiveControlIntent;
  const genericBaseTerm = normalizeBroadGenericBaseTerm(normalizedQuery);
  const isBroadGenericTerm =
    !hasRegionToken &&
    !hasSelectedScopedUniverse &&
    !isPositiveControlIntent &&
    (genericBaseTerm.length <= 4 ||
      DISCOVERY_BROAD_GENERIC_BASE_TERMS.has(genericBaseTerm));

  let discoveryMode: DiscoveryMode = "DISABLED_FOR_BROAD_NATIONAL";
  if (isPositiveControlIntent) {
    discoveryMode = "POSITIVE_CONTROL_ALLOWED";
  } else if (isContextRichIntent) {
    discoveryMode = "CONTEXT_RICH_ALLOWED";
  } else if (hasSelectedScopedUniverse) {
    discoveryMode = "SCOPED_ONLY";
  } else if (!isKoreaAllUnscoped && !isBroadGenericTerm) {
    discoveryMode = "CONTEXT_RICH_ALLOWED";
  }

  return {
    normalizedQuery,
    compactQuery,
    tokens,
    hasRegionToken,
    hasDongToken,
    hasSigunguToken,
    hasApartmentSuffix,
    hasSelectedScopedUniverse,
    isKoreaAllUnscoped,
    isBroadGenericTerm,
    isPositiveControlIntent,
    isContextRichIntent,
    discoveryMode,
  };
}

function shouldLoadGenericDiscoverySeeds(classification: SearchQueryClassification) {
  if (classification.discoveryMode === "DISABLED_FOR_BROAD_NATIONAL") {
    return false;
  }

  if (
    classification.discoveryMode === "POSITIVE_CONTROL_ALLOWED" &&
    !classification.isContextRichIntent &&
    !classification.hasSelectedScopedUniverse
  ) {
    return false;
  }

  return true;
}

function getDiscoveryNameSourceLimit(classification: SearchQueryClassification) {
  if (classification.discoveryMode === "DISABLED_FOR_BROAD_NATIONAL") return 0;
  if (classification.isContextRichIntent) return SEARCH_DISCOVERY_NAME_SOURCE_LIMIT;
  if (classification.discoveryMode === "SCOPED_ONLY") return 32;
  return 48;
}

function getDiscoveryRegionSourceLimit(classification: SearchQueryClassification) {
  if (classification.discoveryMode === "DISABLED_FOR_BROAD_NATIONAL") return 0;
  if (!classification.hasRegionToken) return 0;
  if (classification.isContextRichIntent) return SEARCH_DISCOVERY_REGION_SOURCE_LIMIT;
  return 32;
}

function getDiscoveryHydrationLimit(classification: SearchQueryClassification) {
  if (classification.discoveryMode === "DISABLED_FOR_BROAD_NATIONAL") return 0;
  if (classification.isContextRichIntent) {
    return Math.min(48, SEARCH_DISCOVERY_HYDRATION_LIMIT);
  }
  if (classification.discoveryMode === "SCOPED_ONLY") {
    return Math.min(32, SEARCH_DISCOVERY_HYDRATION_LIMIT);
  }
  return Math.min(SEARCH_DISCOVERY_CANDIDATE_LIMIT, SEARCH_DISCOVERY_HYDRATION_LIMIT);
}

function sggPrefixForDiscoveryUniverse(universeCode: string) {
  if (universeCode === DEFAULT_UNIVERSE_CODE) return null;
  if (/^SGG_\d{5}$/.test(universeCode)) return universeCode.slice(4);
  return DISCOVERY_MACRO_SGG_PREFIX[universeCode] ?? null;
}

function regionMapMatchesDiscoveryScope(
  regionMap: DiscoveryRegionMapRow | null,
  universeCode: string,
) {
  if (!regionMap || universeCode === DEFAULT_UNIVERSE_CODE) return true;

  const scopeCode = sggPrefixForDiscoveryUniverse(universeCode);
  if (!scopeCode) return true;

  const sggCode = normalizeSearchToken(regionMap.sgg_cd);
  const lawdCode = normalizeSearchToken(regionMap.lawd_cd);

  if (/^SGG_\d{5}$/.test(universeCode)) {
    return sggCode === scopeCode || lawdCode.startsWith(scopeCode);
  }

  return sggCode.startsWith(scopeCode) || lawdCode.startsWith(scopeCode);
}

function intersectDiscoveryIds(left: Set<string>, right: Set<string>) {
  return Array.from(left).filter((id) => right.has(id));
}

function hasStrongDiscoveryContext(q: string, regionMap: DiscoveryRegionMapRow | null) {
  if (!regionMap) return false;

  const locationTerms = getDiscoveryLocationTerms(q);
  if (locationTerms.length === 0) return false;

  const regionValues = [
    regionMap.sigungu_name,
    regionMap.umd_nm,
    stripKoreanLocationSuffix(regionMap.umd_nm ?? ""),
    regionMap.sgg_cd,
    regionMap.lawd_cd,
  ]
    .map(normalizeSearchToken)
    .filter(Boolean);

  return locationTerms.some((term) =>
    regionValues.some((value) => value === term || value.includes(term)),
  );
}

function scoreDiscoveryNameMatch(
  q: string,
  complex: DiscoveryAptComplexRow | null,
  aliases: DiscoveryAliasRow[],
) {
  const nameTerms = getDiscoveryNameTerms(q);
  if (nameTerms.length === 0) return { matched: false, exact: false, score: 0 };

  const names = [complex?.apt_name_ko, ...aliases.map((row) => row.alias_name)]
    .map((value) => normalizeDiscoveryNameTerm(value))
    .filter(Boolean);

  const exact = nameTerms.some((term) => names.some((name) => name === term));
  if (exact) return { matched: true, exact: true, score: 120 };

  const contains = nameTerms.some((term) =>
    names.some((name) => name.includes(term) || term.includes(name)),
  );
  if (contains) return { matched: true, exact: false, score: 80 };

  return { matched: false, exact: false, score: 0 };
}

function assessDiscoveryCandidate(
  q: string,
  complex: DiscoveryAptComplexRow | null,
  regionMap: DiscoveryRegionMapRow | null,
  aliases: DiscoveryAliasRow[],
  flags: {
    hasAlias: boolean;
    hasExternalId: boolean;
    hasAreaHousehold: boolean;
    hasTradeClean: boolean;
    hasPriceSnapshot: boolean;
    hasComponentSnapshot: boolean;
    hasMarketCap: boolean;
    hasEligibility: boolean;
    hasLatestBoard: boolean;
    hasDetail: boolean;
  },
): DiscoveryMatchAssessment {
  if (!complex || !regionMap || flags.hasLatestBoard || flags.hasDetail) {
    return { passes: false, score: 0, warnings: [] };
  }

  const nameMatch = scoreDiscoveryNameMatch(q, complex, aliases);
  if (!nameMatch.matched) return { passes: false, score: 0, warnings: [] };

  const hasRegionContext = hasStrongDiscoveryContext(q, regionMap);
  const normalizedQuery = normalizeSearchToken(q);
  const broadNameOnly = normalizedQuery.length <= 4 && !hasRegionContext;
  const downstreamEvidence =
    flags.hasAreaHousehold ||
    flags.hasTradeClean ||
    flags.hasPriceSnapshot ||
    flags.hasComponentSnapshot ||
    flags.hasMarketCap;

  if (
    broadNameOnly &&
    (!nameMatch.exact || !flags.hasExternalId || !downstreamEvidence)
  ) {
    return { passes: false, score: 0, warnings: [] };
  }

  const warnings = new Set<DiscoveryWarning>();
  if (!flags.hasAreaHousehold) warnings.add("AREA_HOUSEHOLD_GAP");
  if (!flags.hasTradeClean) warnings.add("TRADE_CLEAN_GAP");
  if (!flags.hasMarketCap) warnings.add("MARKET_CAP_SOURCE_GAP");
  if (
    (flags.hasPriceSnapshot || flags.hasComponentSnapshot || flags.hasMarketCap) &&
    !flags.hasEligibility
  ) {
    warnings.add("ELIGIBILITY_OR_RANK_GAP");
  }

  const score =
    nameMatch.score +
    (hasRegionContext ? 80 : 0) +
    (flags.hasExternalId ? 40 : 0) +
    (flags.hasTradeClean ? 20 : 0) +
    (flags.hasPriceSnapshot || flags.hasComponentSnapshot ? 20 : 0);

  return {
    passes: score >= (hasRegionContext ? 140 : 180),
    score,
    warnings: Array.from(warnings),
  };
}

async function fetchDiscoveryCandidateIds(
  supabase: ReturnType<typeof createDiscoverySupabase>,
  q: string,
  classification: SearchQueryClassification,
) {
  if (classification.discoveryMode === "DISABLED_FOR_BROAD_NATIONAL") {
    return [];
  }

  const candidateIds = new Set<string>();
  const nameCandidateIds = new Set<string>();
  const locationCandidateIds = new Set<string>();
  const nameTerms = getDiscoveryNameTerms(q);
  const locationTerms = getDiscoveryLocationTerms(q);
  const nameSourceLimit = getDiscoveryNameSourceLimit(classification);
  const regionSourceLimit = getDiscoveryRegionSourceLimit(classification);

  for (const term of nameSourceLimit > 0 ? nameTerms : []) {
    const [complexResult, aliasResult] = await Promise.all([
      supabase
        .from("apt_complex")
        .select("complex_id")
        .ilike("apt_name_ko", `%${term}%`)
        .order("complex_id", { ascending: true })
        .limit(nameSourceLimit),
      supabase
        .from("complex_name_alias")
        .select("complex_id")
        .ilike("alias_name", `%${term}%`)
        .order("complex_id", { ascending: true })
        .limit(nameSourceLimit),
    ]);

    if (complexResult.error) {
      console.info("[API /api/search] discovery complex-name probe skipped", {
        queryLength: q.length,
        message: complexResult.error.message,
      });
    }

    if (aliasResult.error) {
      console.info("[API /api/search] discovery alias-name probe skipped", {
        queryLength: q.length,
        message: aliasResult.error.message,
      });
    }

    for (const id of complexIdSetFromRows(complexResult.data)) {
      nameCandidateIds.add(id);
      candidateIds.add(id);
    }
    for (const id of complexIdSetFromRows(aliasResult.data)) {
      nameCandidateIds.add(id);
      candidateIds.add(id);
    }
  }

  for (const term of regionSourceLimit > 0 ? locationTerms : []) {
    const regionResult = await supabase
      .from("koaptix_complex_region_map")
      .select("complex_id")
      .or(`umd_nm.ilike.%${term}%,sigungu_name.ilike.%${term}%`)
      .order("complex_id", { ascending: true })
      .limit(regionSourceLimit);

    if (regionResult.error) {
      console.info("[API /api/search] discovery region probe skipped", {
        queryLength: q.length,
        message: regionResult.error.message,
      });
      continue;
    }

    for (const id of complexIdSetFromRows(regionResult.data)) {
      locationCandidateIds.add(id);
      candidateIds.add(id);
    }
  }

  if (
    classification.isContextRichIntent &&
    nameCandidateIds.size > 0 &&
    locationCandidateIds.size > 0
  ) {
    const intersectedIds = intersectDiscoveryIds(
      nameCandidateIds,
      locationCandidateIds,
    );
    if (intersectedIds.length > 0) {
      return intersectedIds.slice(0, getDiscoveryHydrationLimit(classification));
    }
  }

  return Array.from(candidateIds).slice(0, getDiscoveryHydrationLimit(classification));
}

function mergeDiscoverySeeds(seeds: DiscoverySeed[]) {
  const byId = new Map<string, DiscoverySeed>();

  for (const seed of seeds) {
    const existing = byId.get(seed.complexId);
    if (!existing || seed.matchScore > existing.matchScore) {
      byId.set(seed.complexId, {
        ...seed,
        warnings: Array.from(
          new Set([...(existing?.warnings ?? []), ...seed.warnings]),
        ),
      });
    } else {
      byId.set(seed.complexId, {
        ...existing,
        warnings: Array.from(
          new Set([...existing.warnings, ...seed.warnings]),
        ),
      });
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) => b.matchScore - a.matchScore || a.complexId.localeCompare(b.complexId),
  );
}

function getDiscoveryFixtureSeeds(q: string, universeCode: string) {
  if (!DISCOVERY_COMPATIBLE_UNIVERSE_CODES.has(universeCode)) return [];

  const normalizedQuery = normalizeSearchToken(q);
  if (normalizedQuery.length < 2) return [];

  const hasAcceptanceIntent = DISCOVERY_ACCEPTANCE_TERMS.some((term) => {
    const normalizedTerm = normalizeSearchToken(term);
    return (
      normalizedQuery.includes(normalizedTerm) ||
      normalizedTerm.includes(normalizedQuery)
    );
  });

  return hasAcceptanceIntent ? DISCOVERY_ACCEPTANCE_SEEDS : [];
}

async function fetchDiscoveryEvidenceSet(
  supabase: ReturnType<typeof createDiscoverySupabase>,
  tableName: string,
  complexIds: string[],
) {
  if (complexIds.length === 0) return new Set<string>();

  const { data, error } = await supabase
    .from(tableName)
    .select("complex_id")
    .in("complex_id", complexIds)
    .limit(complexIds.length * 4);

  if (error) {
    console.info("[API /api/search] discovery evidence skipped", {
      tableName,
      message: error.message,
    });
    return new Set<string>();
  }

  return complexIdSetFromRows(data);
}

async function fetchDiscoveryLatestBoardSet(
  supabase: ReturnType<typeof createDiscoverySupabase>,
  complexIds: string[],
) {
  if (complexIds.length === 0) return new Set<string>();

  const { data, error } = await supabase
    .from("v_koaptix_latest_universe_rank_board_u")
    .select("complex_id")
    .in("complex_id", complexIds)
    .limit(complexIds.length * 4);

  if (error) {
    console.info("[API /api/search] discovery latest-board evidence skipped", {
      message: error.message,
    });
    return new Set<string>();
  }

  return complexIdSetFromRows(data);
}

async function loadGenericDiscoverySeeds(
  supabase: ReturnType<typeof createDiscoverySupabase>,
  q: string,
  universeCode: string,
  alreadyRankedIds: Set<string>,
  classification: SearchQueryClassification,
): Promise<DiscoverySeed[]> {
  if (!universeCode) return [];
  if (!shouldLoadGenericDiscoverySeeds(classification)) return [];

  const normalizedQuery = normalizeSearchToken(q);
  if (normalizedQuery.length < 2) return [];

  const candidateIds = await fetchDiscoveryCandidateIds(
    supabase,
    q,
    classification,
  );
  if (candidateIds.length === 0) return [];

  const [
    complexResult,
    regionMapResult,
    aliasResult,
    externalIdResult,
    areaHouseholdIds,
    tradeCleanIds,
    priceSnapshotIds,
    componentSnapshotIds,
    marketCapIds,
    eligibilityIds,
    latestBoardIds,
    detailIds,
  ] = await Promise.all([
    supabase
      .from("apt_complex")
      .select("complex_id, apt_name_ko, region_id, address_jibun")
      .in("complex_id", candidateIds)
      .limit(candidateIds.length),
    supabase
      .from("koaptix_complex_region_map")
      .select("complex_id, lawd_cd, sgg_cd, sigungu_name, umd_nm")
      .in("complex_id", candidateIds)
      .limit(candidateIds.length),
    supabase
      .from("complex_name_alias")
      .select("complex_id, alias_name")
      .in("complex_id", candidateIds)
      .limit(candidateIds.length * 4),
    supabase
      .from("complex_external_id")
      .select("complex_id, source_system, external_id")
      .in("complex_id", candidateIds)
      .limit(candidateIds.length * 4),
    fetchDiscoveryEvidenceSet(
      supabase,
      "apt_complex_area_cluster_household",
      candidateIds,
    ),
    fetchDiscoveryEvidenceSet(supabase, "apt_trade_clean", candidateIds),
    fetchDiscoveryEvidenceSet(
      supabase,
      "apt_area_cluster_price_snapshot",
      candidateIds,
    ),
    fetchDiscoveryEvidenceSet(
      supabase,
      "apt_market_cap_cluster_component_snapshot",
      candidateIds,
    ),
    fetchDiscoveryEvidenceSet(supabase, "apt_market_cap_snapshot", candidateIds),
    fetchDiscoveryEvidenceSet(
      supabase,
      "complex_eligibility_snapshot",
      candidateIds,
    ),
    fetchDiscoveryLatestBoardSet(supabase, candidateIds),
    fetchDiscoveryEvidenceSet(
      supabase,
      "v_koaptix_complex_detail_sheet",
      candidateIds,
    ),
  ]);

  if (complexResult.error) throw complexResult.error;
  if (regionMapResult.error) throw regionMapResult.error;

  if (aliasResult.error) {
    console.info("[API /api/search] discovery generic alias evidence skipped", {
      message: aliasResult.error.message,
    });
  }

  if (externalIdResult.error) {
    console.info("[API /api/search] discovery generic external-id evidence skipped", {
      message: externalIdResult.error.message,
    });
  }

  const complexById = keyRowsByComplexId(
    (complexResult.data ?? []) as DiscoveryAptComplexRow[],
  );
  const regionMapById = keyRowsByComplexId(
    (regionMapResult.data ?? []) as DiscoveryRegionMapRow[],
  );
  const aliasesById = groupRowsByComplexId(
    (aliasResult.data ?? []) as DiscoveryAliasRow[],
  );
  const externalIdIds = complexIdSetFromRows(
    ((externalIdResult.data ?? []) as DiscoveryExternalIdRow[]).filter((row) =>
      String(row.source_system ?? "").toLowerCase().includes("kapt"),
    ),
  );

  return candidateIds
    .map((complexId): DiscoverySeed | null => {
      if (alreadyRankedIds.has(complexId)) return null;

      const complex = complexById.get(complexId) ?? null;
      const regionMap = regionMapById.get(complexId) ?? null;
      if (!regionMapMatchesDiscoveryScope(regionMap, universeCode)) return null;

      const aliases = aliasesById.get(complexId) ?? [];
      const flags = {
        hasAlias: aliases.length > 0,
        hasExternalId: externalIdIds.has(complexId),
        hasAreaHousehold: areaHouseholdIds.has(complexId),
        hasTradeClean: tradeCleanIds.has(complexId),
        hasPriceSnapshot: priceSnapshotIds.has(complexId),
        hasComponentSnapshot: componentSnapshotIds.has(complexId),
        hasMarketCap: marketCapIds.has(complexId),
        hasEligibility: eligibilityIds.has(complexId),
        hasLatestBoard: latestBoardIds.has(complexId),
        hasDetail: detailIds.has(complexId),
      };
      const assessment = assessDiscoveryCandidate(
        q,
        complex,
        regionMap,
        aliases,
        flags,
      );

      if (!assessment.passes || !complex || !regionMap) return null;

      const regionLabel =
        [regionMap.sigungu_name ?? null, regionMap.umd_nm ?? null]
          .filter(Boolean)
          .join(" ") || "지역 확인";

      return {
        complexId,
        fallbackName: complex.apt_name_ko ?? "관측 후보",
        fallbackRegionLabel: regionLabel,
        warnings: assessment.warnings,
        matchScore: assessment.score,
        source: "generic",
      };
    })
    .filter((seed): seed is DiscoverySeed => seed !== null)
    .sort((a, b) => b.matchScore - a.matchScore || a.complexId.localeCompare(b.complexId))
    .slice(0, SEARCH_DISCOVERY_CANDIDATE_LIMIT);
}

function buildDiscoveryCopy(warnings: DiscoveryWarning[]) {
  const hasSourceWarning = warnings.includes("SOURCE_IDENTITY_AMBIGUOUS");

  return {
    badge: "관측 준비중",
    message:
      "단지 이름과 지역 정보는 확인됐지만, 아직 KOAPTIX 랭킹 산정에 필요한 실거래·세대수 연결이 끝나지 않았어요.",
    helperText: hasSourceWarning
      ? "랭킹 보드에 올리기 전 원천 연결과 공개 검증 상태를 더 확인하고 있습니다. 일부 원천 연결은 추가 확인이 필요합니다."
      : "랭킹 보드에 올리기 전 원천 연결과 공개 검증 상태를 더 확인하고 있습니다.",
  };
}

async function loadDiscoveryCandidates(
  q: string,
  universeCode: string,
  alreadyRankedIds: Set<string>,
  classification: SearchQueryClassification,
): Promise<DiscoveryCandidate[]> {
  if (classification.discoveryMode === "DISABLED_FOR_BROAD_NATIONAL") {
    return [];
  }

  try {
    const supabase = createDiscoverySupabase();
    const fixtureSeeds: DiscoverySeed[] = getDiscoveryFixtureSeeds(
      q,
      universeCode,
    ).map((seed) => ({
      ...seed,
      matchScore: 10_000,
      source: "fixture",
    }));
    const genericSeeds = await loadGenericDiscoverySeeds(
      supabase,
      q,
      universeCode,
      alreadyRankedIds,
      classification,
    );
    const seeds = mergeDiscoverySeeds([...fixtureSeeds, ...genericSeeds]);
    if (seeds.length === 0) return [];

    const candidateIds = seeds.map((seed) => seed.complexId);

    const [
      complexResult,
      regionMapResult,
      aliasResult,
      externalIdResult,
      areaHouseholdIds,
      tradeCleanIds,
      priceSnapshotIds,
      componentSnapshotIds,
      marketCapIds,
      eligibilityIds,
      latestBoardIds,
      detailIds,
    ] = await Promise.all([
      supabase
        .from("apt_complex")
        .select("complex_id, apt_name_ko, region_id, address_jibun")
        .in("complex_id", candidateIds),
      supabase
        .from("koaptix_complex_region_map")
        .select("complex_id, lawd_cd, sgg_cd, sigungu_name, umd_nm")
        .in("complex_id", candidateIds),
      supabase
        .from("complex_name_alias")
        .select("complex_id, alias_name")
        .in("complex_id", candidateIds),
      supabase
        .from("complex_external_id")
        .select("complex_id, source_system, external_id")
        .in("complex_id", candidateIds),
      fetchDiscoveryEvidenceSet(
        supabase,
        "apt_complex_area_cluster_household",
        candidateIds,
      ),
      fetchDiscoveryEvidenceSet(supabase, "apt_trade_clean", candidateIds),
      fetchDiscoveryEvidenceSet(
        supabase,
        "apt_area_cluster_price_snapshot",
        candidateIds,
      ),
      fetchDiscoveryEvidenceSet(
        supabase,
        "apt_market_cap_cluster_component_snapshot",
        candidateIds,
      ),
      fetchDiscoveryEvidenceSet(supabase, "apt_market_cap_snapshot", candidateIds),
      fetchDiscoveryEvidenceSet(
        supabase,
        "complex_eligibility_snapshot",
        candidateIds,
      ),
      fetchDiscoveryLatestBoardSet(supabase, candidateIds),
      fetchDiscoveryEvidenceSet(
        supabase,
        "v_koaptix_complex_detail_sheet",
        candidateIds,
      ),
    ]);

    if (complexResult.error) throw complexResult.error;
    if (regionMapResult.error) throw regionMapResult.error;

    const complexById = keyRowsByComplexId(
      (complexResult.data ?? []) as DiscoveryAptComplexRow[],
    );
    const regionMapById = keyRowsByComplexId(
      (regionMapResult.data ?? []) as DiscoveryRegionMapRow[],
    );
    const aliasIds = complexIdSetFromRows(
      (aliasResult.data ?? []) as DiscoveryAliasRow[],
    );
    const externalIdIds = complexIdSetFromRows(
      ((externalIdResult.data ?? []) as DiscoveryExternalIdRow[]).filter((row) =>
        String(row.source_system ?? "").toLowerCase().includes("kapt"),
      ),
    );

    if (aliasResult.error) {
      console.info("[API /api/search] discovery alias evidence skipped", {
        message: aliasResult.error.message,
      });
    }

    if (externalIdResult.error) {
      console.info("[API /api/search] discovery external-id evidence skipped", {
        message: externalIdResult.error.message,
      });
    }

    return seeds
      .map((seed): DiscoveryCandidate | null => {
        const complexId = seed.complexId;
        if (alreadyRankedIds.has(complexId)) return null;

        const complex = complexById.get(complexId) ?? null;
        const regionMap = regionMapById.get(complexId) ?? null;
        if (!complex || !regionMap) return null;

        const hasRank = alreadyRankedIds.has(complexId);
        const hasDetail = detailIds.has(complexId);
        const hasLatestBoard = latestBoardIds.has(complexId);
        if (hasRank || hasLatestBoard || hasDetail) return null;

        const sigunguName = regionMap.sigungu_name ?? null;
        const umdName = regionMap.umd_nm ?? null;
        const regionLabel =
          [sigunguName, umdName].filter(Boolean).join(" ") ||
          seed.fallbackRegionLabel;
        const warnings = Array.from(new Set(seed.warnings));

        return {
          discoveryId: `observation-ready:${complexId}`,
          complexId,
          displayName: complex.apt_name_ko ?? seed.fallbackName,
          regionLabel,
          sigunguName,
          umdName,
          discoveryStatus: "OBSERVATION_READY",
          evidenceFlags: {
            hasComplex: true,
            hasAlias: aliasIds.has(complexId),
            hasExternalId: externalIdIds.has(complexId),
            hasRegionMap: true,
            hasAreaHousehold: areaHouseholdIds.has(complexId),
            hasTradeClean: tradeCleanIds.has(complexId),
            hasPriceSnapshot: priceSnapshotIds.has(complexId),
            hasComponentSnapshot: componentSnapshotIds.has(complexId),
            hasMarketCap: marketCapIds.has(complexId),
            hasEligibility: eligibilityIds.has(complexId),
            hasRank,
            hasLatestBoard,
            hasDetail,
          },
          warnings,
          copy: buildDiscoveryCopy(warnings),
          disabledActions: {
            openRankedDetail: true,
            showMarketCap: true,
            showRank: true,
            showChart: true,
          },
        };
      })
      .filter((candidate): candidate is DiscoveryCandidate => candidate !== null)
      .slice(0, SEARCH_DISCOVERY_CANDIDATE_LIMIT);
  } catch (error) {
    console.info("[API /api/search] discovery candidates skipped", {
      universeCode,
      queryLength: q.length,
      message: getErrorMessage(error),
    });

    return [];
  }
}

function getSearchSourceLimit() {
  // Keep the source window modest so command/search does not hit the slower
  // large regional board path during cold starts.
  return 80;
}

type RegionAuxiliaryCandidate = {
  universeCode: string;
  aliases: string[];
  broadAliases?: string[];
  fallbackSearchTerms?: string[];
};

type RegionalNameCompanionIntent = {
  normalizedNameTerms: string[];
  normalizedLocationTerms: string[];
  candidateUniverseCodes: string[];
};

type ScoredRegionalNameCompanionItem = {
  item: RankingItem;
  score: number;
  universeIndex: number;
  sourceIndex: number;
};

const REGION_AUXILIARY_CANDIDATES: RegionAuxiliaryCandidate[] = [
  {
    universeCode: "SEOUL_ALL",
    aliases: ["\uC11C\uC6B8", "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC", "seoul"],
    broadAliases: ["\uC11C\uC6B8", "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC", "seoul"],
  },
  {
    universeCode: "BUSAN_ALL",
    aliases: [
      "\uBD80\uC0B0",
      "\uBD80\uC0B0\uAD11\uC5ED\uC2DC",
      "\uD574\uC6B4\uB300",
      "\uD574\uC6B4\uB300\uAD6C",
      "\uBD80\uC0B0\uC9C4",
      "\uBD80\uC0B0\uC9C4\uAD6C",
      "\uC218\uC601",
      "\uC218\uC601\uAD6C",
      "\uB3D9\uB798",
      "\uB3D9\uB798\uAD6C",
      "\uC6B0\uB3D9",
      "\uC911\uB3D9",
      "\uC7A5\uC804\uB3D9",
      "busan",
      "haeundae",
    ],
    broadAliases: ["\uBD80\uC0B0", "\uBD80\uC0B0\uAD11\uC5ED\uC2DC", "busan"],
  },
  {
    universeCode: "BUSAN_ALL",
    aliases: ["\uB9C8\uB9B0\uC2DC\uD2F0"],
    fallbackSearchTerms: ["\uC6B0\uB3D9", "\uD574\uC6B4\uB300"],
  },
  {
    universeCode: "DAEGU_ALL",
    aliases: [
      "\uB300\uAD6C",
      "\uB300\uAD6C\uAD11\uC5ED\uC2DC",
      "\uC218\uC131",
      "\uC218\uC131\uAD6C",
      "\uB2EC\uC11C",
      "\uB2EC\uC11C\uAD6C",
      "\uBC94\uC5B4",
      "\uBC94\uC5B4\uB3D9",
      "daegu",
    ],
    broadAliases: ["\uB300\uAD6C", "\uB300\uAD6C\uAD11\uC5ED\uC2DC", "daegu"],
  },
  {
    universeCode: "INCHEON_ALL",
    aliases: [
      "\uC778\uCC9C",
      "\uC778\uCC9C\uAD11\uC5ED\uC2DC",
      "\uBBF8\uCD94\uD640",
      "\uBBF8\uCD94\uD640\uAD6C",
      "\uC5F0\uC218",
      "\uC5F0\uC218\uAD6C",
      "\uBD80\uD3C9",
      "\uBD80\uD3C9\uAD6C",
      "\uC1A1\uB3C4",
      "\uC1A1\uB3C4\uB3D9",
      "\uCCAD\uB77C",
      "incheon",
    ],
    broadAliases: ["\uC778\uCC9C", "\uC778\uCC9C\uAD11\uC5ED\uC2DC", "incheon"],
  },
  {
    universeCode: "GWANGJU_ALL",
    aliases: [
      "\uAD11\uC8FC",
      "\uAD11\uC8FC\uAD11\uC5ED\uC2DC",
      "\uAD11\uC0B0",
      "\uAD11\uC0B0\uAD6C",
      "\uBD09\uC120",
      "\uBD09\uC120\uB3D9",
      "gwangju",
    ],
    broadAliases: ["\uAD11\uC8FC", "\uAD11\uC8FC\uAD11\uC5ED\uC2DC", "gwangju"],
  },
  {
    universeCode: "DAEJEON_ALL",
    aliases: [
      "\uB300\uC804",
      "\uB300\uC804\uAD11\uC5ED\uC2DC",
      "\uB454\uC0B0",
      "\uB454\uC0B0\uB3D9",
      "\uC720\uC131",
      "\uC720\uC131\uAD6C",
      "daejeon",
    ],
    broadAliases: ["\uB300\uC804", "\uB300\uC804\uAD11\uC5ED\uC2DC", "daejeon"],
  },
  {
    universeCode: "SEJONG_ALL",
    aliases: [
      "\uC138\uC885",
      "\uC138\uC885\uC2DC",
      "\uC138\uC885\uD2B9\uBCC4\uC790\uCE58\uC2DC",
      "sejong",
    ],
    broadAliases: [
      "\uC138\uC885",
      "\uC138\uC885\uC2DC",
      "\uC138\uC885\uD2B9\uBCC4\uC790\uCE58\uC2DC",
      "sejong",
    ],
  },
  {
    universeCode: "GYEONGGI_ALL",
    aliases: [
      "\uACBD\uAE30",
      "\uACBD\uAE30\uB3C4",
      "\uC218\uC6D0",
      "\uC218\uC6D0\uC2DC",
      "\uACE0\uC591",
      "\uACE0\uC591\uC2DC",
      "\uC77C\uC0B0",
      "\uC77C\uC0B0\uB3D9\uAD6C",
      "\uC77C\uC0B0\uC11C\uAD6C",
      "\uC131\uB0A8",
      "\uC131\uB0A8\uC2DC",
      "\uBD84\uB2F9",
      "\uBD84\uB2F9\uAD6C",
      "\uC815\uC790",
      "\uC815\uC790\uB3D9",
      "\uD310\uAD50",
      "\uD310\uAD50\uB3D9",
      "\uB9C8\uB450",
      "\uB9C8\uB450\uB3D9",
      "\uC6A9\uC778",
      "\uC6A9\uC778\uC2DC",
      "\uD654\uC131",
      "\uD654\uC131\uC2DC",
      "\uBD80\uCC9C",
      "\uBD80\uCC9C\uC2DC",
      "\uC548\uC591",
      "\uC548\uC591\uC2DC",
      "\uB0A8\uC591\uC8FC",
      "\uB0A8\uC591\uC8FC\uC2DC",
      "\uAE40\uD3EC",
      "\uAE40\uD3EC\uC2DC",
      "\uD30C\uC8FC",
      "\uD30C\uC8FC\uC2DC",
      "\uAD11\uC8FC",
      "\uAD11\uC8FC\uC2DC",
      "\uACBD\uAE30\uAD11\uC8FC",
      "gyeonggi",
      "suwon",
      "goyang",
    ],
    broadAliases: ["\uACBD\uAE30", "\uACBD\uAE30\uB3C4", "gyeonggi"],
  },
  {
    universeCode: "SEJONG_ALL",
    aliases: ["\uC5B4\uC9C4", "\uC5B4\uC9C4\uB3D9"],
  },
];

const SUPPORTED_MACRO_AUXILIARY_UNIVERSE_CODES = Array.from(
  new Set(
    REGION_AUXILIARY_CANDIDATES.map((candidate) => candidate.universeCode),
  ),
).filter((universeCode) => universeCode !== DEFAULT_UNIVERSE_CODE);

const STRICT_REGION_QUERY_ALIASES = new Set(
  REGION_AUXILIARY_CANDIDATES.flatMap((candidate) =>
    candidate.aliases.map(normalizeSearchToken),
  ),
);

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

function toRankingItem(
  row: SearchBoardRow,
  fallbackUniverseCode: string,
): RankingItem {
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

function normalizeSearchToken(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function stripKoreanLocationSuffix(value: unknown) {
  const normalized = String(value ?? "").trim();
  if (normalized.length <= 2) return normalized;

  return normalized.replace(/(\uB3D9|\uAC00)$/, "");
}

function hasHangul(value: string) {
  return /[\uAC00-\uD7A3]/.test(value);
}

function isKoreanLocationToken(value: string) {
  return /[\uB3D9\uAC00\uC74D\uBA74\uB9AC\uAD6C\uAD70\uC2DC]$/.test(
    value.trim(),
  );
}

function getSearchTextFields(item: RankingItem) {
  const names = [item.name, item.apt_name_ko].filter(Boolean);
  const regions = [item.sigunguName, item.sigungu_name].filter(Boolean);
  const districts = [item.legalDongName, item.legal_dong_name].filter(Boolean);
  const districtBases = districts
    .map(stripKoreanLocationSuffix)
    .filter((value) => value.length >= 2);
  const regionDistrictCombos = [
    ...regions.flatMap((region) =>
      districts.map((district) => `${region} ${district}`),
    ),
    ...regions.flatMap((region) =>
      districtBases.map((district) => `${region} ${district}`),
    ),
  ];
  const locationCombos = [
    ...districts.flatMap((district) =>
      names.map((name) => `${district} ${name}`),
    ),
    ...districtBases.flatMap((district) =>
      names.map((name) => `${district} ${name}`),
    ),
    ...regions.flatMap((region) => names.map((name) => `${region} ${name}`)),
  ];

  return {
    name: names,
    region: regions,
    district: districts,
    location: [item.locationLabel, ...regionDistrictCombos, ...locationCombos],
  };
}

function isStrictRegionIntentQuery(normalizedQuery: string) {
  return STRICT_REGION_QUERY_ALIASES.has(normalizedQuery);
}

function scoreFieldMatch(
  values: unknown[],
  normalizedQuery: string,
  scores: { exact: number; startsWith: number; includes: number },
  allowContains: boolean,
) {
  const normalizedValues = values
    .map(normalizeSearchToken)
    .filter(Boolean);

  if (normalizedValues.some((value) => value === normalizedQuery)) {
    return scores.exact;
  }

  if (normalizedValues.some((value) => value.startsWith(normalizedQuery))) {
    return scores.startsWith;
  }

  if (
    allowContains &&
    normalizedValues.some((value) => value.includes(normalizedQuery))
  ) {
    return scores.includes;
  }

  return null;
}

function scoreItemSearchMatch(item: RankingItem, q: string) {
  const normalizedQuery = normalizeSearchToken(q);
  if (!normalizedQuery) return null;

  const fields = getSearchTextFields(item);
  const strictRegionIntent = isStrictRegionIntentQuery(normalizedQuery);
  const nameScore = scoreFieldMatch(
    fields.name,
    normalizedQuery,
    { exact: 1000, startsWith: 900, includes: 800 },
    true,
  );

  if (nameScore !== null) return nameScore;

  const regionScore = scoreFieldMatch(
    fields.region,
    normalizedQuery,
    { exact: 760, startsWith: 720, includes: 520 },
    !strictRegionIntent,
  );

  if (regionScore !== null) return regionScore;

  const districtScore = scoreFieldMatch(
    fields.district,
    normalizedQuery,
    { exact: 700, startsWith: 660, includes: 460 },
    !strictRegionIntent,
  );

  if (districtScore !== null) return districtScore;

  return scoreFieldMatch(
    fields.location,
    normalizedQuery,
    { exact: 640, startsWith: 600, includes: 400 },
    !strictRegionIntent,
  );
}

function filterItemsByQuery(items: RankingItem[], q: string) {
  return items
    .map((item, index) => ({
      item,
      index,
      score: scoreItemSearchMatch(item, q),
    }))
    .filter(
      (entry): entry is { item: RankingItem; index: number; score: number } =>
        entry.score !== null,
    )
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}

function scoreItemRegionalAuxiliaryMatch(item: RankingItem, terms: string[]) {
  const normalizedTerms = terms.map(normalizeSearchToken).filter(Boolean);
  if (normalizedTerms.length === 0) return null;

  const fields = getSearchTextFields(item);
  let bestScore: number | null = null;

  for (const normalizedTerm of normalizedTerms) {
    const regionScore = scoreFieldMatch(
      fields.region,
      normalizedTerm,
      { exact: 760, startsWith: 720, includes: 0 },
      false,
    );
    const districtScore = scoreFieldMatch(
      fields.district,
      normalizedTerm,
      { exact: 800, startsWith: 760, includes: 0 },
      false,
    );
    const locationScore = scoreFieldMatch(
      fields.location,
      normalizedTerm,
      { exact: 740, startsWith: 700, includes: 560 },
      normalizedTerm.length >= 3,
    );
    const score = Math.max(
      regionScore ?? -1,
      districtScore ?? -1,
      locationScore ?? -1,
    );

    if (score >= 0) {
      bestScore = Math.max(bestScore ?? 0, score);
    }
  }

  return bestScore;
}

function filterItemsByRegionalAuxiliaryTerms(
  items: RankingItem[],
  terms: string[],
) {
  return items
    .map((item, index) => ({
      item,
      index,
      score: scoreItemRegionalAuxiliaryMatch(item, terms),
    }))
    .filter(
      (entry): entry is { item: RankingItem; index: number; score: number } =>
        entry.score !== null,
    )
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}

function normalizeExactName(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function isRankingVisibleTop1000(row: SearchBoardRow) {
  if (typeof row?.is_top1000 === "boolean") {
    return row.is_top1000;
  }

  const rankAll = toNullableNumber(row?.rank_all ?? row?.rank);
  return (
    rankAll !== null &&
    rankAll >= 1 &&
    rankAll <= SEARCH_EXACT_NAME_FALLBACK_SOURCE_LIMIT
  );
}

function mergeUniqueByComplexId(items: RankingItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = String(item.complexId ?? "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function excludeAlreadyShownItems(
  items: RankingItem[],
  alreadyShownItems: RankingItem[],
) {
  const shownIds = new Set(alreadyShownItems.map((item) => item.complexId));
  return items.filter((item) => !shownIds.has(item.complexId));
}

function getRegionAuxiliaryUniverseCodes(q: string) {
  return Array.from(
    new Set(
      getRegionAuxiliaryCandidateMatches(q).map(
        (candidate) => candidate.universeCode,
      ),
    ),
  );
}

function getRegionAuxiliaryCandidateMatches(q: string) {
  const normalizedQuery = normalizeSearchToken(q);
  if (normalizedQuery.length < 2) return [];

  return REGION_AUXILIARY_CANDIDATES.filter((candidate) =>
    candidate.aliases.some((alias) => {
      const normalizedAlias = normalizeSearchToken(alias);
      return (
        normalizedQuery === normalizedAlias ||
        normalizedAlias.startsWith(normalizedQuery)
      );
    }),
  );
}

function getUniqueNormalizedTerms(values: string[]) {
  return Array.from(
    new Set(values.map(normalizeSearchToken).filter((value) => value.length >= 2)),
  );
}

function getQueryTokens(q: string) {
  return q.trim().split(/\s+/).filter(Boolean);
}

function getMacroUniverseCodesForRegionToken(token: string) {
  const normalizedToken = normalizeSearchToken(token);
  if (normalizedToken.length < 2) return [];

  return Array.from(
    new Set(
      REGION_AUXILIARY_CANDIDATES.filter((candidate) =>
        [...candidate.aliases, ...(candidate.broadAliases ?? [])].some(
          (alias) => normalizeSearchToken(alias) === normalizedToken,
        ),
      ).map((candidate) => candidate.universeCode),
    ),
  ).filter((universeCode) => universeCode !== DEFAULT_UNIVERSE_CODE);
}

function isMacroRegionToken(token: string) {
  return getMacroUniverseCodesForRegionToken(token).length > 0;
}

function isExplicitRegionalNameLocationToken(token: string) {
  return isKoreanLocationToken(token) || isMacroRegionToken(token);
}

function buildRegionalNameCompanionIntent(
  q: string,
): RegionalNameCompanionIntent | null {
  const trimmed = q.trim();
  const normalizedQuery = normalizeSearchToken(trimmed);
  if (normalizedQuery.length < 2 || !hasHangul(trimmed)) return null;

  const tokens = getQueryTokens(trimmed);
  const locationTokens = tokens.filter(isExplicitRegionalNameLocationToken);
  const nameTokens = tokens.filter(
    (token) => !isExplicitRegionalNameLocationToken(token),
  );

  if (locationTokens.length > 0 && nameTokens.length === 0) return null;

  const rawNameTerms = [
    ...(locationTokens.length === 0 ? [trimmed] : []),
    ...(nameTokens.length > 0 ? [nameTokens.join(" ")] : []),
    ...(nameTokens.length === 1 ? nameTokens : []),
  ];
  const normalizedNameTerms = getUniqueNormalizedTerms(rawNameTerms);

  if (normalizedNameTerms.length === 0) return null;

  const macroCandidateCodes = Array.from(
    new Set(locationTokens.flatMap(getMacroUniverseCodesForRegionToken)),
  );

  return {
    normalizedNameTerms,
    normalizedLocationTerms: getUniqueNormalizedTerms(locationTokens),
    candidateUniverseCodes:
      macroCandidateCodes.length > 0
        ? macroCandidateCodes
        : SUPPORTED_MACRO_AUXILIARY_UNIVERSE_CODES,
  };
}

function isMacroLocationTermSatisfiedByUniverse(
  normalizedLocationTerm: string,
  universeCode: string,
) {
  return REGION_AUXILIARY_CANDIDATES.some(
    (candidate) =>
      candidate.universeCode === universeCode &&
      [...candidate.aliases, ...(candidate.broadAliases ?? [])].some(
        (alias) => normalizeSearchToken(alias) === normalizedLocationTerm,
      ),
  );
}

function scoreRegionalNameCompanionLocationTerm(
  item: RankingItem,
  normalizedLocationTerm: string,
  universeCode: string,
) {
  if (
    isMacroLocationTermSatisfiedByUniverse(normalizedLocationTerm, universeCode)
  ) {
    return 900;
  }

  const fields = getSearchTextFields(item);
  const regionScore = scoreFieldMatch(
    fields.region,
    normalizedLocationTerm,
    { exact: 820, startsWith: 760, includes: 0 },
    false,
  );
  const districtScore = scoreFieldMatch(
    fields.district,
    normalizedLocationTerm,
    { exact: 860, startsWith: 800, includes: 0 },
    false,
  );
  const locationScore = scoreFieldMatch(
    fields.location,
    normalizedLocationTerm,
    { exact: 780, startsWith: 740, includes: 620 },
    normalizedLocationTerm.length >= 3,
  );
  const score = Math.max(
    regionScore ?? -1,
    districtScore ?? -1,
    locationScore ?? -1,
  );

  return score >= 0 ? score : null;
}

function scoreRegionalNameCompanionLocationMatch(
  item: RankingItem,
  normalizedLocationTerms: string[],
  universeCode: string,
) {
  if (normalizedLocationTerms.length === 0) return 0;

  let totalScore = 0;

  for (const normalizedLocationTerm of normalizedLocationTerms) {
    const termScore = scoreRegionalNameCompanionLocationTerm(
      item,
      normalizedLocationTerm,
      universeCode,
    );

    if (termScore === null) return null;
    totalScore += termScore;
  }

  return totalScore;
}

function scoreRegionalNameCompanionNameMatch(
  item: RankingItem,
  normalizedNameTerms: string[],
) {
  const fields = getSearchTextFields(item);
  let bestScore: number | null = null;

  normalizedNameTerms.forEach((normalizedNameTerm, index) => {
    const score = scoreFieldMatch(
      fields.name,
      normalizedNameTerm,
      { exact: 1120, startsWith: 1040, includes: 920 },
      true,
    );

    if (score !== null) {
      bestScore = Math.max(bestScore ?? 0, score - index * 20);
    }
  });

  return bestScore;
}

function scoreRegionalNameCompanionItem(
  item: RankingItem,
  intent: RegionalNameCompanionIntent,
  universeCode: string,
) {
  const nameScore = scoreRegionalNameCompanionNameMatch(
    item,
    intent.normalizedNameTerms,
  );
  if (nameScore === null) return null;

  const locationScore = scoreRegionalNameCompanionLocationMatch(
    item,
    intent.normalizedLocationTerms,
    universeCode,
  );
  if (locationScore === null) return null;

  return nameScore + locationScore;
}

function getRegionAuxiliaryFallbackSearchTerms(q: string, universeCode: string) {
  return Array.from(
    new Set(
      getRegionAuxiliaryCandidateMatches(q)
        .filter((candidate) => candidate.universeCode === universeCode)
        .flatMap((candidate) => candidate.fallbackSearchTerms ?? []),
    ),
  );
}

function getKoreaAllDongAuxiliarySearchTerms(q: string) {
  const trimmed = q.trim();
  const normalizedQuery = normalizeSearchToken(trimmed);
  if (normalizedQuery.length < 2 || !hasHangul(trimmed)) return [];

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const lastToken = tokens[tokens.length - 1] ?? trimmed;
  const explicitLocationTokens = tokens.filter(isKoreanLocationToken);
  const hasNonLocationNameToken = tokens.some(
    (token) => !isKoreanLocationToken(token) && !isMacroRegionToken(token),
  );

  if (explicitLocationTokens.length > 0 && hasNonLocationNameToken) {
    return [];
  }

  const looksLocationLike =
    isKoreanLocationToken(lastToken) ||
    explicitLocationTokens.length > 0 ||
    normalizedQuery.length <= 3;

  if (!looksLocationLike) return [];

  const terms = new Set<string>([trimmed]);

  if (tokens.length >= 2) {
    terms.add(tokens.slice(-2).join(" "));
  }

  terms.add(lastToken);

  const lastTokenBase = stripKoreanLocationSuffix(lastToken);
  if (lastTokenBase.length >= 2 && lastTokenBase !== lastToken) {
    terms.add(lastTokenBase);
  }

  return Array.from(terms);
}

function isBroadRegionUniverseQuery(q: string, universeCode: string) {
  const normalizedQuery = normalizeSearchToken(q);
  const candidate = REGION_AUXILIARY_CANDIDATES.find(
    (entry) => entry.universeCode === universeCode,
  );

  return Boolean(
    candidate?.broadAliases?.some(
      (alias) => normalizeSearchToken(alias) === normalizedQuery,
    ),
  );
}

async function loadRegionAuxiliaryItems(
  q: string,
  localItems: RankingItem[],
  limit: number,
) {
  let candidateCodes = getRegionAuxiliaryUniverseCodes(q);
  const dongAuxiliarySearchTerms =
    candidateCodes.length === 0 && localItems.length === 0
      ? getKoreaAllDongAuxiliarySearchTerms(q)
      : [];
  const auxiliaryLimit = Math.max(
    0,
    Math.min(
      dongAuxiliarySearchTerms.length > 0
        ? SEARCH_KOREA_ALL_DONG_AUXILIARY_RESULT_LIMIT
        : 8,
      limit,
    ),
  );
  if (auxiliaryLimit <= 0) return [];

  if (candidateCodes.length === 0 && dongAuxiliarySearchTerms.length > 0) {
    // V2.1 bounded dong fallback: only for KOREA_ALL misses and only across
    // macro universes already proven usable by the current search route.
    candidateCodes = SUPPORTED_MACRO_AUXILIARY_UNIVERSE_CODES;
  }

  if (candidateCodes.length === 0) return [];

  const candidateResults = await Promise.all(
    candidateCodes.map(async (candidateCode) => {
      const resolution = resolveUniverseRequest(candidateCode, {
        capability: "search",
      });

      if (resolution.universeUnavailable) {
        return [] as RankingItem[];
      }

      try {
        const source = await loadSourceItems(resolution.renderedUniverseCode);
        let matchedItems =
          dongAuxiliarySearchTerms.length > 0
            ? filterItemsByRegionalAuxiliaryTerms(
                source.items,
                dongAuxiliarySearchTerms,
              )
            : filterItemsByQuery(source.items, q);

        if (
          matchedItems.length === 0 &&
          dongAuxiliarySearchTerms.length === 0
        ) {
          const fallbackTerms = getRegionAuxiliaryFallbackSearchTerms(
            q,
            resolution.renderedUniverseCode,
          );
          matchedItems = mergeUniqueByComplexId(
            fallbackTerms.flatMap((term) => filterItemsByQuery(source.items, term)),
          );
        }

        if (
          matchedItems.length === 0 &&
          dongAuxiliarySearchTerms.length > 0
        ) {
          matchedItems = await fetchRankVisibleRegionalAuxiliaryItems(
            resolution.renderedUniverseCode,
            dongAuxiliarySearchTerms,
          );
        }

        if (
          matchedItems.length === 0 &&
          isBroadRegionUniverseQuery(q, resolution.renderedUniverseCode)
        ) {
          return source.items;
        }

        return matchedItems;
      } catch (error) {
        console.info("[API /api/search] regional auxiliary skipped", {
          candidateCode,
          queryLength: q.length,
          message: getErrorMessage(error),
        });

        return [] as RankingItem[];
      }
    }),
  );

  return excludeAlreadyShownItems(
    mergeUniqueByComplexId(candidateResults.flat()),
    localItems,
  ).slice(0, auxiliaryLimit);
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
    resultOrder: ["localItems", "globalItems"],
    localItems: [],
    globalItems: [],
    discoveryCandidates: [],
    message: resolution.reason ?? "universe_unavailable",
  };
}

async function fetchSourceItems(
  universeCode: string,
  sourceLimit: number,
) {
  const rows: SearchBoardRow[] = await getLatestRankBoard(
    universeCode,
    sourceLimit,
  );
  const items = rows.map((row) =>
    toRankingItem(row, universeCode),
  );

  return items;
}

async function fetchRankVisibleFallbackItems(
  universeCode: string,
  q: string,
): Promise<RankingItem[]> {
  const normalizedQ = normalizeExactName(q);
  if (!normalizedQ) return [];

  const rows: SearchBoardRow[] = await getLatestRankBoard(
    universeCode,
    SEARCH_EXACT_NAME_FALLBACK_SOURCE_LIMIT,
  );

  // Bounded rank-visible fallback: search only the approved Top1000-style
  // rank-board path, never apt_complex-only discovery or unranked rows.
  return filterItemsByQuery(
    rows
      .filter(isRankingVisibleTop1000)
      .map((row) => toRankingItem(row, universeCode)),
    q,
  ).slice(0, SEARCH_RANK_VISIBLE_FALLBACK_RESULT_LIMIT);
}

async function fetchRankVisibleRegionalAuxiliaryItems(
  universeCode: string,
  terms: string[],
): Promise<RankingItem[]> {
  if (terms.length === 0) return [];

  const rows: SearchBoardRow[] = await getLatestRankBoard(
    universeCode,
    SEARCH_EXACT_NAME_FALLBACK_SOURCE_LIMIT,
  );

  return filterItemsByRegionalAuxiliaryTerms(
    rows
      .filter(isRankingVisibleTop1000)
      .map((row) => toRankingItem(row, universeCode)),
    terms,
  ).slice(0, SEARCH_KOREA_ALL_DONG_AUXILIARY_RESULT_LIMIT);
}

async function fetchRankVisibleRegionalNameCompanionItems(
  universeCode: string,
  intent: RegionalNameCompanionIntent,
  universeIndex: number,
): Promise<ScoredRegionalNameCompanionItem[]> {
  const rows: SearchBoardRow[] = await getLatestRankBoard(
    universeCode,
    SEARCH_EXACT_NAME_FALLBACK_SOURCE_LIMIT,
  );

  // KOREA_ALL companion search stays bounded to rank-visible regional boards.
  return rows
    .filter(isRankingVisibleTop1000)
    .map((row, sourceIndex) => ({
      item: toRankingItem(row, universeCode),
      sourceIndex,
    }))
    .map(({ item, sourceIndex }) => ({
      item,
      sourceIndex,
      universeIndex,
      score: scoreRegionalNameCompanionItem(item, intent, universeCode),
    }))
    .filter(
      (
        entry,
      ): entry is ScoredRegionalNameCompanionItem =>
        entry.score !== null,
    )
    .sort((a, b) => b.score - a.score || a.sourceIndex - b.sourceIndex)
    .slice(0, SEARCH_REGIONAL_NAME_AUXILIARY_PER_UNIVERSE_LIMIT);
}

async function loadRegionalNameCompanionItems(
  q: string,
  alreadyShownItems: RankingItem[],
  limit: number,
) {
  const intent = buildRegionalNameCompanionIntent(q);
  const auxiliaryLimit = Math.max(
    0,
    Math.min(SEARCH_REGIONAL_NAME_AUXILIARY_RESULT_LIMIT, limit),
  );
  if (!intent || auxiliaryLimit <= 0) return [];

  const candidateResults = await Promise.all(
    intent.candidateUniverseCodes.map(async (candidateCode, universeIndex) => {
      const resolution = resolveUniverseRequest(candidateCode, {
        capability: "search",
      });

      if (resolution.universeUnavailable) {
        return [] as ScoredRegionalNameCompanionItem[];
      }

      try {
        return await fetchRankVisibleRegionalNameCompanionItems(
          resolution.renderedUniverseCode,
          intent,
          universeIndex,
        );
      } catch (error) {
        console.info("[API /api/search] regional name companion skipped", {
          candidateCode,
          queryLength: q.length,
          message: getErrorMessage(error),
        });

        return [] as ScoredRegionalNameCompanionItem[];
      }
    }),
  );

  const orderedItems = candidateResults
    .flat()
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.universeIndex - b.universeIndex ||
        a.sourceIndex - b.sourceIndex,
    )
    .map((entry) => entry.item);

  return excludeAlreadyShownItems(
    mergeUniqueByComplexId(orderedItems),
    alreadyShownItems,
  ).slice(0, auxiliaryLimit);
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
    const regionalAuxiliaryItems = await loadRegionAuxiliaryItems(
      q,
      localItems,
      limit,
    );
    const regionalNameCompanionItems = await loadRegionalNameCompanionItems(
      q,
      [...localItems, ...regionalAuxiliaryItems],
      limit,
    );

    return mergeUniqueByComplexId([
      ...regionalAuxiliaryItems,
      ...regionalNameCompanionItems,
    ]).slice(0, limit);
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
        headers: {
          "Cache-Control": SEARCH_ERROR_CACHE_CONTROL,
          ...getKoaptixCurrentnessHeaders(),
        },
      },
    );
  }

  const requestedUniverseCode = universeResolution.renderedUniverseCode;

  if (normalizeSearchToken(q).length < 2) {
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
        resultOrder: ["localItems", "globalItems"],
        localItems: [],
        globalItems: [],
        discoveryCandidates: [],
      },
      {
        headers: {
          "Cache-Control": SEARCH_SUCCESS_CACHE_CONTROL,
          ...getKoaptixCurrentnessHeaders(),
        },
      },
    );
  }

  try {
    const queryClassification = classifySearchQuery(q, requestedUniverseCode);
    const localSource = await loadSourceItems(requestedUniverseCode);
    let matchedLocalItems = filterItemsByQuery(localSource.items, q);
    let rankVisibleFallbackItems: RankingItem[] = [];

    if (matchedLocalItems.length === 0) {
      const localFallbackTerms = getRegionAuxiliaryFallbackSearchTerms(
        q,
        requestedUniverseCode,
      );
      matchedLocalItems = mergeUniqueByComplexId(
        localFallbackTerms.flatMap((term) =>
          filterItemsByQuery(localSource.items, term),
        ),
      );
    }

    if (
      matchedLocalItems.length < limit &&
      !isStrictRegionIntentQuery(queryClassification.normalizedQuery)
    ) {
      try {
        rankVisibleFallbackItems = await fetchRankVisibleFallbackItems(
          requestedUniverseCode,
          q,
        );
      } catch (fallbackError) {
        console.info("[API /api/search] rank-visible fallback skipped", {
          universeCode: requestedUniverseCode,
          queryLength: q.length,
          message: getErrorMessage(fallbackError),
        });
      }
    }

    const localItems = mergeUniqueByComplexId([
      ...rankVisibleFallbackItems,
      ...matchedLocalItems,
    ]).slice(0, limit);
    const globalItems = await loadGlobalAuxiliaryItems(
      q,
      requestedUniverseCode,
      localItems,
      limit,
    );
    const discoveryCandidates = await loadDiscoveryCandidates(
      q,
      requestedUniverseCode,
      new Set(
        [...localItems, ...globalItems]
          .map((item) => String(item.complexId ?? "").trim())
          .filter(Boolean),
      ),
      queryClassification,
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
        discoveryCandidates,
      },
      {
        headers: {
          "Cache-Control": SEARCH_SUCCESS_CACHE_CONTROL,
          ...getKoaptixCurrentnessHeaders(),
        },
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
        resultOrder: ["localItems", "globalItems"],
        localItems: [],
        globalItems: [],
        discoveryCandidates: [],
        degraded: true,
        message,
      },
      {
        headers: {
          "Cache-Control": SEARCH_ERROR_CACHE_CONTROL,
          ...getKoaptixCurrentnessHeaders(),
        },
      },
    );
  }
}
