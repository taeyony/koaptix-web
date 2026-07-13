export const REGION_ALIAS_VERSION = "REGION_ALIAS_V1" as const;

export type RegionAliasVersion = typeof REGION_ALIAS_VERSION;
export type RegionAliasLevel = "country" | "sido" | "sigungu";

export type RegionAliasClass =
  | "CURRENT_CANONICAL_FULL"
  | "PARENT_QUALIFIED"
  | "SAFE_SUFFIX_VARIANT"
  | "CONTEXT_SHORTENED_TERMINAL"
  | "BOUNDED_LOCALITY_HINT"
  | "LEGACY_COMPATIBILITY";

export type RegionResolutionState =
  | "EXACT_CANONICAL"
  | "EXACT_QUALIFIED"
  | "SAFE_VARIANT_UNIQUE"
  | "CONTEXT_UNIQUE"
  | "AMBIGUOUS"
  | "UNIVERSE_CONFLICT"
  | "NO_REGION_RESOLUTION";

export type RegionResolutionReasonCode =
  | "EXACT_ALIAS_MATCH"
  | "CONTEXT_DISAMBIGUATED"
  | "TERMINAL_NAME_COLLISION"
  | "COMPACT_KEY_COLLISION"
  | "MULTIPLE_EXPLICIT_REGION_TOKENS"
  | "SELECTED_UNIVERSE_OUTSIDE_RESOLVED_REGION"
  | "NO_CANONICAL_ALIAS_MATCH"
  | "CANONICAL_REGION_SOURCE_UNAVAILABLE"
  | "LOCALITY_WITHOUT_DETERMINISTIC_PARENT"
  | "UNSUPPORTED_VARIANT"
  | "EMPTY_QUERY_AFTER_NORMALIZATION";

export type RegionAliasSourceProvenance =
  | "CURRENT_INTERNAL_REGION_DIM"
  | "GENERATED_FROM_CURRENT_INTERNAL_REGION_DIM"
  | "BOUNDED_RECORD_LINKED_LOCALITY"
  | "TRACKED_LEGACY_COMPATIBILITY";

export type CanonicalRegionInput = {
  regionCode: string;
  regionLevel: RegionAliasLevel;
  fullNameKo: string;
  parentRegionCode: string | null;
  parentFullNameKo?: string | null;
  qualifiedNameKo?: string | null;
  sourceProvenance: RegionAliasSourceProvenance;
};

export type BoundedLocalityHint = {
  localityNameKo: string;
  parentRegionCode: string;
  provenance: "BOUNDED_RECORD_LINKED_LOCALITY";
};

export type RegionAliasEntry = {
  aliasVersion: RegionAliasVersion;
  canonicalRegionCode: string;
  regionLevel: RegionAliasLevel;
  parentRegionCode: string | null;
  canonicalNameKo: string;
  qualifiedNameKo: string;
  normalizedAliasKey: string;
  compactAliasKey: string | null;
  aliasClass: RegionAliasClass;
  provenance: RegionAliasSourceProvenance;
  ambiguityGroup: string | null;
  priority: number;
};

export type RegionAliasIndex = {
  aliasVersion: RegionAliasVersion;
  canonicalByCode: ReadonlyMap<string, CanonicalRegionInput>;
  aliasesBySpacedKey: ReadonlyMap<string, readonly RegionAliasEntry[]>;
  aliasesByCompactKey: ReadonlyMap<string, readonly RegionAliasEntry[]>;
  entries: readonly RegionAliasEntry[];
};

export type NormalizedRegionAliasQuery = {
  aliasVersion: RegionAliasVersion;
  originalQuery: string;
  normalizedQuery: string;
  compactQuery: string;
};

export type RegionMatchedSpan = {
  start: number;
  end: number;
  matchedText: string;
};

export type RegionClarificationChoice = {
  canonicalRegionCode: string;
  qualifiedNameKo: string;
  regionLevel: RegionAliasLevel;
  compatibility: "COMPATIBLE" | "INCOMPATIBLE" | "UNKNOWN";
  replacementQuery: string;
};

export type UniverseCompatibilityInput = {
  selectedUniverseCode: string;
  macroRegionCodePrefix?: string | null;
};

export type UniverseCompatibilityState =
  | "NOT_APPLICABLE"
  | "COMPATIBLE"
  | "INCOMPATIBLE";

export type EffectiveRegionScope = {
  regionCode: string;
  regionLevel: RegionAliasLevel;
};

export type RegionResolutionResult = {
  aliasVersion: RegionAliasVersion;
  state: RegionResolutionState;
  reasonCode: RegionResolutionReasonCode;
  originalQuery: string;
  normalizedQuery: string;
  matchedText: string | null;
  matchedSpan: RegionMatchedSpan | null;
  residualQuery: string;
  canonicalRegionCode: string | null;
  canonicalRegionLevel: RegionAliasLevel | null;
  qualifiedNameKo: string | null;
  candidateChoices: RegionClarificationChoice[];
  selectedUniverse: string;
  compatibilityState: UniverseCompatibilityState;
  effectiveRegionScope: EffectiveRegionScope | null;
  rankedSearchAllowed: boolean;
  discoverySearchAllowed: boolean;
  globalFallbackAllowed: boolean;
  warning: string | null;
};

export type RegionAliasApiMetadata = {
  regionResolution?: RegionResolutionResult;
  clarificationChoices?: RegionClarificationChoice[];
  selectedUniverse?: string;
  effectiveSearchScope?: EffectiveRegionScope | null;
  warnings?: string[];
};

export type RegionAliasSourceResult =
  | {
      status: "ready" | "stale";
      index: RegionAliasIndex;
      warning: string | null;
    }
  | {
      status: "unavailable";
      index: null;
      warning: "CANONICAL_REGION_SOURCE_UNAVAILABLE";
    };
