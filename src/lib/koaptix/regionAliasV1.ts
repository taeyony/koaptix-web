import {
  REGION_ALIAS_VERSION,
  type BoundedLocalityHint,
  type CanonicalRegionInput,
  type EffectiveRegionScope,
  type NormalizedRegionAliasQuery,
  type RegionAliasClass,
  type RegionAliasEntry,
  type RegionAliasIndex,
  type RegionAliasLevel,
  type RegionClarificationChoice,
  type RegionResolutionReasonCode,
  type RegionResolutionResult,
  type RegionResolutionState,
  type UniverseCompatibilityInput,
  type UniverseCompatibilityState,
} from "./regionAliasV1.types";
import { LEGACY_DISCOVERY_REGION_CONTEXT_TERMS } from "./regionAliasLegacyCompatibility";

const ALIAS_PRIORITY: Record<RegionAliasClass, number> = {
  CURRENT_CANONICAL_FULL: 1,
  PARENT_QUALIFIED: 2,
  SAFE_SUFFIX_VARIANT: 3,
  CONTEXT_SHORTENED_TERMINAL: 4,
  BOUNDED_LOCALITY_HINT: 5,
  LEGACY_COMPATIBILITY: 6,
};

const LEVEL_DEPTH: Record<RegionAliasLevel, number> = {
  country: 0,
  sido: 1,
  sigungu: 2,
};

const TOP_LEVEL_SUFFIXES = [
  "특별자치도",
  "특별자치시",
  "특별시",
  "광역시",
  "자치도",
  "자치시",
  "도",
] as const;

const LOWER_LEVEL_SUFFIXES = ["시", "군", "구"] as const;

type AliasMatch = {
  entries: RegionAliasEntry[];
  consumedLength: number;
  matchedText: string;
  usedCompactKey: boolean;
};

export function normalizeRegionAliasQuery(
  value: unknown,
): NormalizedRegionAliasQuery {
  const originalQuery = String(value ?? "");
  const normalizedQuery = originalQuery
    .normalize("NFC")
    .trim()
    .replace(/\s+/gu, " ");

  return {
    aliasVersion: REGION_ALIAS_VERSION,
    originalQuery,
    normalizedQuery,
    compactQuery: normalizedQuery.replace(/\s+/gu, ""),
  };
}

function normalizeAliasKey(value: string) {
  return normalizeRegionAliasQuery(value).normalizedQuery.toLowerCase();
}

function compactAliasKey(value: string) {
  return normalizeAliasKey(value).replace(/\s+/gu, "");
}

function stripWhitelistedSuffix(
  value: string,
  suffixes: readonly string[],
) {
  const suffix = suffixes.find((candidate) => value.endsWith(candidate));
  if (!suffix) return null;
  const shortened = value.slice(0, -suffix.length).trim();
  return shortened.length >= 2 ? shortened : null;
}

function getParent(
  row: CanonicalRegionInput,
  byCode: ReadonlyMap<string, CanonicalRegionInput>,
) {
  return row.parentRegionCode
    ? (byCode.get(row.parentRegionCode) ?? null)
    : null;
}

function getCanonicalTerminalName(
  row: CanonicalRegionInput,
  parent: CanonicalRegionInput | null,
) {
  const full = row.fullNameKo.trim();
  const parentName = parent?.fullNameKo.trim();
  if (parentName && full.startsWith(`${parentName} `)) {
    return full.slice(parentName.length).trim();
  }
  const tokens = full.split(/\s+/u).filter(Boolean);
  return row.regionLevel === "sigungu" ? (tokens.at(-1) ?? full) : full;
}

function getQualifiedName(
  row: CanonicalRegionInput,
  parent: CanonicalRegionInput | null,
  canonicalName: string,
) {
  const explicit = row.qualifiedNameKo?.trim();
  if (explicit) return explicit;
  const parentName = row.parentFullNameKo?.trim() || parent?.fullNameKo.trim();
  if (!parentName || row.fullNameKo.trim().startsWith(`${parentName} `)) {
    return row.fullNameKo.trim();
  }
  return `${parentName} ${canonicalName}`.trim();
}

function pushAlias(
  target: RegionAliasEntry[],
  input: {
    row: CanonicalRegionInput;
    canonicalName: string;
    qualifiedName: string;
    aliasText: string | null | undefined;
    aliasClass: RegionAliasClass;
  },
) {
  const aliasText = input.aliasText?.trim();
  if (!aliasText) return;
  const normalizedAliasKey = normalizeAliasKey(aliasText);
  if (!normalizedAliasKey) return;

  const duplicate = target.some(
    (entry) =>
      entry.canonicalRegionCode === input.row.regionCode &&
      entry.normalizedAliasKey === normalizedAliasKey &&
      entry.aliasClass === input.aliasClass,
  );
  if (duplicate) return;

  target.push({
    aliasVersion: REGION_ALIAS_VERSION,
    canonicalRegionCode: input.row.regionCode,
    regionLevel: input.row.regionLevel,
    parentRegionCode: input.row.parentRegionCode,
    canonicalNameKo: input.canonicalName,
    qualifiedNameKo: input.qualifiedName,
    normalizedAliasKey,
    compactAliasKey: compactAliasKey(aliasText),
    aliasClass: input.aliasClass,
    provenance:
      input.aliasClass === "CURRENT_CANONICAL_FULL" ||
      input.aliasClass === "BOUNDED_LOCALITY_HINT"
        ? input.row.sourceProvenance
        : "GENERATED_FROM_CURRENT_INTERNAL_REGION_DIM",
    ambiguityGroup: null,
    priority: ALIAS_PRIORITY[input.aliasClass],
  });
}

function sortedEntries(entries: readonly RegionAliasEntry[]) {
  return [...entries].sort(
    (left, right) =>
      left.priority - right.priority ||
      LEVEL_DEPTH[right.regionLevel] - LEVEL_DEPTH[left.regionLevel] ||
      right.normalizedAliasKey.length - left.normalizedAliasKey.length ||
      left.canonicalRegionCode.localeCompare(right.canonicalRegionCode),
  );
}

function groupEntries(
  entries: readonly RegionAliasEntry[],
  keyOf: (entry: RegionAliasEntry) => string | null,
) {
  const grouped = new Map<string, RegionAliasEntry[]>();
  for (const entry of entries) {
    const key = keyOf(entry);
    if (!key) continue;
    const bucket = grouped.get(key) ?? [];
    bucket.push(entry);
    grouped.set(key, bucket);
  }

  for (const [key, bucket] of grouped) {
    const distinctCodes = new Set(bucket.map((entry) => entry.canonicalRegionCode));
    const ambiguityGroup = distinctCodes.size > 1 ? key : null;
    grouped.set(
      key,
      sortedEntries(
        bucket.map((entry) => ({ ...entry, ambiguityGroup })),
      ),
    );
  }
  return grouped;
}

export function buildRegionAliasV1Index(
  canonicalRows: readonly CanonicalRegionInput[],
  localityHints: readonly BoundedLocalityHint[] = [],
): RegionAliasIndex {
  const canonicalByCode = new Map<string, CanonicalRegionInput>();
  for (const row of [...canonicalRows].sort((a, b) =>
    a.regionCode.localeCompare(b.regionCode),
  )) {
    if (!row.regionCode.trim() || !row.fullNameKo.trim()) {
      throw new Error("REGION_ALIAS_INVALID_CANONICAL_ROW");
    }
    if (canonicalByCode.has(row.regionCode)) {
      throw new Error("REGION_ALIAS_DUPLICATE_REGION_CODE");
    }
    canonicalByCode.set(row.regionCode, { ...row });
  }

  for (const row of canonicalByCode.values()) {
    if (row.parentRegionCode && !canonicalByCode.has(row.parentRegionCode)) {
      throw new Error("REGION_ALIAS_ORPHAN_PARENT");
    }
  }

  const entries: RegionAliasEntry[] = [];
  for (const row of canonicalByCode.values()) {
    if (row.regionLevel === "country") continue;
    const parent = getParent(row, canonicalByCode);
    const canonicalName = getCanonicalTerminalName(row, parent);
    const qualifiedName = getQualifiedName(row, parent, canonicalName);

    pushAlias(entries, {
      row,
      canonicalName,
      qualifiedName,
      aliasText: row.fullNameKo,
      aliasClass: "CURRENT_CANONICAL_FULL",
    });
    if (qualifiedName !== row.fullNameKo.trim()) {
      pushAlias(entries, {
        row,
        canonicalName,
        qualifiedName,
        aliasText: qualifiedName,
        aliasClass: "PARENT_QUALIFIED",
      });
    }

    if (row.regionLevel === "sido") {
      pushAlias(entries, {
        row,
        canonicalName,
        qualifiedName,
        aliasText: stripWhitelistedSuffix(canonicalName, TOP_LEVEL_SUFFIXES),
        aliasClass: "SAFE_SUFFIX_VARIANT",
      });
    }

    if (row.regionLevel === "sigungu") {
      const parentCanonicalName = parent
        ? getCanonicalTerminalName(parent, getParent(parent, canonicalByCode))
        : null;
      const shortParent = parentCanonicalName
        ? stripWhitelistedSuffix(parentCanonicalName, TOP_LEVEL_SUFFIXES)
        : null;
      pushAlias(entries, {
        row,
        canonicalName,
        qualifiedName,
        aliasText: shortParent ? `${shortParent} ${canonicalName}` : null,
        aliasClass: "SAFE_SUFFIX_VARIANT",
      });
      pushAlias(entries, {
        row,
        canonicalName,
        qualifiedName,
        aliasText: canonicalName,
        aliasClass: "CONTEXT_SHORTENED_TERMINAL",
      });
      const shortTerminal = stripWhitelistedSuffix(
        canonicalName,
        LOWER_LEVEL_SUFFIXES,
      );
      pushAlias(entries, {
        row,
        canonicalName,
        qualifiedName,
        aliasText: shortTerminal,
        aliasClass: "CONTEXT_SHORTENED_TERMINAL",
      });
    }
  }

  for (const hint of localityHints) {
    const parent = canonicalByCode.get(hint.parentRegionCode);
    if (!parent || parent.regionLevel !== "sigungu") continue;
    pushAlias(entries, {
      row: { ...parent, sourceProvenance: hint.provenance },
      canonicalName: getCanonicalTerminalName(
        parent,
        getParent(parent, canonicalByCode),
      ),
      qualifiedName: getQualifiedName(
        parent,
        getParent(parent, canonicalByCode),
        getCanonicalTerminalName(parent, getParent(parent, canonicalByCode)),
      ),
      aliasText: hint.localityNameKo,
      aliasClass: "BOUNDED_LOCALITY_HINT",
    });
  }

  const stableEntries = sortedEntries(entries);
  const aliasesBySpacedKey = groupEntries(
    stableEntries,
    (entry) => entry.normalizedAliasKey,
  );
  const aliasesByCompactKey = groupEntries(
    stableEntries,
    (entry) => entry.compactAliasKey,
  );

  return {
    aliasVersion: REGION_ALIAS_VERSION,
    canonicalByCode,
    aliasesBySpacedKey,
    aliasesByCompactKey,
    entries: stableEntries,
  };
}

function matchSpacedPrefix(query: string, alias: string) {
  if (query === alias) return alias.length;
  return query.startsWith(`${alias} `) ? alias.length : null;
}

function matchCompactPrefix(query: string, compact: string) {
  let queryIndex = 0;
  let compactIndex = 0;
  while (queryIndex < query.length && compactIndex < compact.length) {
    if (/\s/u.test(query[queryIndex])) {
      queryIndex += 1;
      continue;
    }
    if (query[queryIndex].toLowerCase() !== compact[compactIndex]) return null;
    queryIndex += 1;
    compactIndex += 1;
  }
  if (compactIndex !== compact.length) return null;
  if (queryIndex < query.length && !/\s/u.test(query[queryIndex])) return null;
  return queryIndex;
}

function findLeadingAliasMatch(query: string, index: RegionAliasIndex) {
  const normalized = query.toLowerCase();
  const spacedMatches: AliasMatch[] = [];
  for (const [key, entries] of index.aliasesBySpacedKey) {
    const consumedLength = matchSpacedPrefix(normalized, key);
    if (consumedLength === null) continue;
    spacedMatches.push({
      entries: [...entries],
      consumedLength,
      matchedText: query.slice(0, consumedLength),
      usedCompactKey: false,
    });
  }

  const matches = spacedMatches.length > 0 ? spacedMatches : (() => {
    const compactMatches: AliasMatch[] = [];
    for (const [key, entries] of index.aliasesByCompactKey) {
      const consumedLength = matchCompactPrefix(normalized, key);
      if (consumedLength === null) continue;
      compactMatches.push({
        entries: [...entries],
        consumedLength,
        matchedText: query.slice(0, consumedLength),
        usedCompactKey: true,
      });
    }
    return compactMatches;
  })();

  return matches.sort((left, right) => {
    const leftCodes = dedupeEntries(left.entries).map(
      (entry) => entry.canonicalRegionCode,
    );
    const rightCodes = dedupeEntries(right.entries).map(
      (entry) => entry.canonicalRegionCode,
    );
    const rightIsMoreSpecific = rightCodes.some((rightCode) =>
      leftCodes.some((leftCode) => isAncestorCode(index, leftCode, rightCode)),
    );
    const leftIsMoreSpecific = leftCodes.some((leftCode) =>
      rightCodes.some((rightCode) => isAncestorCode(index, rightCode, leftCode)),
    );
    if (rightIsMoreSpecific && right.consumedLength > left.consumedLength) return 1;
    if (leftIsMoreSpecific && left.consumedLength > right.consumedLength) return -1;

    const leftPriority = Math.min(...left.entries.map((entry) => entry.priority));
    const rightPriority = Math.min(...right.entries.map((entry) => entry.priority));
    return (
      leftPriority - rightPriority ||
      right.consumedLength - left.consumedLength ||
      left.matchedText.localeCompare(right.matchedText)
    );
  })[0] ?? null;
}

function isAncestorCode(
  index: RegionAliasIndex,
  ancestorCode: string,
  descendantCode: string,
) {
  let current = index.canonicalByCode.get(descendantCode) ?? null;
  const visited = new Set<string>();
  while (current?.parentRegionCode && !visited.has(current.regionCode)) {
    if (current.parentRegionCode === ancestorCode) return true;
    visited.add(current.regionCode);
    current = index.canonicalByCode.get(current.parentRegionCode) ?? null;
  }
  return false;
}

function compatibilityForCode(
  index: RegionAliasIndex,
  regionCode: string,
  input: UniverseCompatibilityInput,
): UniverseCompatibilityState {
  if (input.selectedUniverseCode === "KOREA_ALL") return "COMPATIBLE";
  const sggMatch = /^SGG_(\d{5})$/.exec(input.selectedUniverseCode);
  if (sggMatch) {
    const selectedCode = sggMatch[1];
    if (regionCode === selectedCode) return "COMPATIBLE";
    if (isAncestorCode(index, regionCode, selectedCode)) return "COMPATIBLE";
    return "INCOMPATIBLE";
  }
  const prefix = input.macroRegionCodePrefix?.trim();
  if (prefix) {
    return regionCode.startsWith(prefix) ? "COMPATIBLE" : "INCOMPATIBLE";
  }
  return "NOT_APPLICABLE";
}

function dedupeEntries(entries: readonly RegionAliasEntry[]) {
  const byCode = new Map<string, RegionAliasEntry>();
  for (const entry of sortedEntries(entries)) {
    if (!byCode.has(entry.canonicalRegionCode)) {
      byCode.set(entry.canonicalRegionCode, entry);
    }
  }
  return [...byCode.values()];
}

function makeChoices(
  entries: readonly RegionAliasEntry[],
  residualQuery: string,
  index: RegionAliasIndex,
  universe: UniverseCompatibilityInput,
): RegionClarificationChoice[] {
  return dedupeEntries(entries)
    .map((entry) => {
      const compatibility = compatibilityForCode(
        index,
        entry.canonicalRegionCode,
        universe,
      );
      return {
        canonicalRegionCode: entry.canonicalRegionCode,
        qualifiedNameKo: entry.qualifiedNameKo,
        regionLevel: entry.regionLevel,
        compatibility:
          compatibility === "NOT_APPLICABLE" ? "UNKNOWN" : compatibility,
        replacementQuery: [entry.qualifiedNameKo, residualQuery]
          .filter(Boolean)
          .join(" "),
      } satisfies RegionClarificationChoice;
    })
    .sort(
      (left, right) =>
        left.qualifiedNameKo.localeCompare(right.qualifiedNameKo, "ko") ||
        left.canonicalRegionCode.localeCompare(right.canonicalRegionCode),
    );
}

function baseResult(
  normalized: NormalizedRegionAliasQuery,
  selectedUniverse: string,
  reasonCode: RegionResolutionReasonCode,
): RegionResolutionResult {
  return {
    aliasVersion: REGION_ALIAS_VERSION,
    state: "NO_REGION_RESOLUTION",
    reasonCode,
    originalQuery: normalized.originalQuery,
    normalizedQuery: normalized.normalizedQuery,
    matchedText: null,
    matchedSpan: null,
    residualQuery: normalized.normalizedQuery,
    canonicalRegionCode: null,
    canonicalRegionLevel: null,
    qualifiedNameKo: null,
    candidateChoices: [],
    selectedUniverse,
    compatibilityState: "NOT_APPLICABLE",
    effectiveRegionScope: null,
    rankedSearchAllowed: true,
    discoverySearchAllowed: true,
    globalFallbackAllowed: true,
    warning: null,
  };
}

function originalEndForNormalizedPrefix(original: string, normalizedPrefix: string) {
  for (let end = 1; end <= original.length; end += 1) {
    if (normalizeRegionAliasQuery(original.slice(0, end)).normalizedQuery === normalizedPrefix) {
      return end;
    }
  }
  return original.length;
}

function stateForEntry(entry: RegionAliasEntry): RegionResolutionState {
  if (entry.aliasClass === "CURRENT_CANONICAL_FULL") return "EXACT_CANONICAL";
  if (entry.aliasClass === "PARENT_QUALIFIED") return "EXACT_QUALIFIED";
  if (entry.aliasClass === "SAFE_SUFFIX_VARIANT") return "SAFE_VARIANT_UNIQUE";
  return "CONTEXT_UNIQUE";
}

export function resolveRegionAliasV1(
  query: unknown,
  index: RegionAliasIndex,
  universe: UniverseCompatibilityInput,
): RegionResolutionResult {
  const normalized = normalizeRegionAliasQuery(query);
  if (!normalized.normalizedQuery) {
    return baseResult(
      normalized,
      universe.selectedUniverseCode,
      "EMPTY_QUERY_AFTER_NORMALIZATION",
    );
  }

  let offset = 0;
  let selected: RegionAliasEntry | null = null;
  let selectedState: RegionResolutionState | null = null;
  let usedCompactKey = false;
  const matchedEntries: RegionAliasEntry[] = [];

  while (offset < normalized.normalizedQuery.length) {
    const remainingWithSpace = normalized.normalizedQuery.slice(offset);
    const leadingSpaces = remainingWithSpace.length - remainingWithSpace.trimStart().length;
    offset += leadingSpaces;
    const remaining = normalized.normalizedQuery.slice(offset);
    const match = findLeadingAliasMatch(remaining, index);
    if (!match) break;

    let candidates = dedupeEntries(match.entries);
    const localityOnly = candidates.every(
      (entry) => entry.aliasClass === "BOUNDED_LOCALITY_HINT",
    );
    if (localityOnly && universe.selectedUniverseCode === "KOREA_ALL") {
      return baseResult(
        normalized,
        universe.selectedUniverseCode,
        "LOCALITY_WITHOUT_DETERMINISTIC_PARENT",
      );
    }

    if (candidates.length > 1) {
      const compatible = candidates.filter(
        (entry) =>
          compatibilityForCode(index, entry.canonicalRegionCode, universe) ===
          "COMPATIBLE",
      );
      if (compatible.length === 1) {
        candidates = compatible;
        selectedState = "CONTEXT_UNIQUE";
      } else {
        const residual = remaining.slice(match.consumedLength).trim();
        const result = baseResult(
          normalized,
          universe.selectedUniverseCode,
          match.usedCompactKey
            ? "COMPACT_KEY_COLLISION"
            : "TERMINAL_NAME_COLLISION",
        );
        return {
          ...result,
          state: "AMBIGUOUS",
          matchedText: match.matchedText,
          matchedSpan: {
            start: 0,
            end: originalEndForNormalizedPrefix(
              normalized.originalQuery,
              normalized.normalizedQuery.slice(0, offset + match.consumedLength),
            ),
            matchedText: match.matchedText,
          },
          residualQuery: residual,
          candidateChoices: makeChoices(candidates, residual, index, universe),
          rankedSearchAllowed: false,
          discoverySearchAllowed: false,
          globalFallbackAllowed: false,
          warning: "지역명이 여러 행정구역과 일치합니다.",
        };
      }
    }

    const next = candidates[0];
    if (selected && selected.canonicalRegionCode !== next.canonicalRegionCode) {
      const selectedIsAncestor = isAncestorCode(
        index,
        selected.canonicalRegionCode,
        next.canonicalRegionCode,
      );
      const nextIsAncestor = isAncestorCode(
        index,
        next.canonicalRegionCode,
        selected.canonicalRegionCode,
      );
      if (!selectedIsAncestor && !nextIsAncestor) {
        const allEntries = [...matchedEntries, next];
        const result = baseResult(
          normalized,
          universe.selectedUniverseCode,
          "MULTIPLE_EXPLICIT_REGION_TOKENS",
        );
        return {
          ...result,
          state: "AMBIGUOUS",
          matchedText: normalized.normalizedQuery.slice(
            0,
            offset + match.consumedLength,
          ),
          residualQuery: normalized.normalizedQuery
            .slice(offset + match.consumedLength)
            .trim(),
          candidateChoices: makeChoices(allEntries, "", index, universe),
          rankedSearchAllowed: false,
          discoverySearchAllowed: false,
          globalFallbackAllowed: false,
          warning: "서로 다른 지역 표현이 함께 입력되었습니다.",
        };
      }
      if (selectedIsAncestor) selected = next;
    } else {
      selected = next;
    }

    matchedEntries.push(next);
    usedCompactKey ||= match.usedCompactKey;
    selectedState ??= stateForEntry(next);
    offset += match.consumedLength;
  }

  if (!selected) {
    const result = baseResult(
      normalized,
      universe.selectedUniverseCode,
      "NO_CANONICAL_ALIAS_MATCH",
    );
    if (/^[가-힣]+(?:동|읍|면|리)(?:\s|$)/u.test(normalized.normalizedQuery)) {
      result.reasonCode = "LOCALITY_WITHOUT_DETERMINISTIC_PARENT";
    }
    return result;
  }

  const compatibilityState = compatibilityForCode(
    index,
    selected.canonicalRegionCode,
    universe,
  );
  const matchedText = normalized.normalizedQuery.slice(0, offset).trim();
  const residualQuery = normalized.normalizedQuery.slice(offset).trim();
  const matchedSpan = {
    start: 0,
    end: originalEndForNormalizedPrefix(normalized.originalQuery, matchedText),
    matchedText,
  };

  if (compatibilityState === "INCOMPATIBLE") {
    return {
      ...baseResult(
        normalized,
        universe.selectedUniverseCode,
        "SELECTED_UNIVERSE_OUTSIDE_RESOLVED_REGION",
      ),
      state: "UNIVERSE_CONFLICT",
      matchedText,
      matchedSpan,
      residualQuery,
      canonicalRegionCode: selected.canonicalRegionCode,
      canonicalRegionLevel: selected.regionLevel,
      qualifiedNameKo: selected.qualifiedNameKo,
      candidateChoices: makeChoices([selected], residualQuery, index, universe),
      compatibilityState,
      rankedSearchAllowed: false,
      discoverySearchAllowed: false,
      globalFallbackAllowed: false,
      warning: "입력한 지역이 현재 선택한 검색 범위와 다릅니다.",
    };
  }

  let effectiveRegionScope: EffectiveRegionScope = {
    regionCode: selected.canonicalRegionCode,
    regionLevel: selected.regionLevel,
  };
  const selectedSgg = /^SGG_(\d{5})$/.exec(universe.selectedUniverseCode)?.[1];
  if (
    selectedSgg &&
    isAncestorCode(index, selected.canonicalRegionCode, selectedSgg)
  ) {
    effectiveRegionScope = { regionCode: selectedSgg, regionLevel: "sigungu" };
  }

  return {
    aliasVersion: REGION_ALIAS_VERSION,
    state:
      selectedState ??
      (usedCompactKey ? "SAFE_VARIANT_UNIQUE" : stateForEntry(selected)),
    reasonCode:
      selectedState === "CONTEXT_UNIQUE"
        ? "CONTEXT_DISAMBIGUATED"
        : "EXACT_ALIAS_MATCH",
    originalQuery: normalized.originalQuery,
    normalizedQuery: normalized.normalizedQuery,
    matchedText,
    matchedSpan,
    residualQuery,
    canonicalRegionCode: selected.canonicalRegionCode,
    canonicalRegionLevel: selected.regionLevel,
    qualifiedNameKo: selected.qualifiedNameKo,
    candidateChoices: [],
    selectedUniverse: universe.selectedUniverseCode,
    compatibilityState:
      compatibilityState === "NOT_APPLICABLE"
        ? "COMPATIBLE"
        : compatibilityState,
    effectiveRegionScope,
    rankedSearchAllowed: true,
    discoverySearchAllowed: true,
    globalFallbackAllowed: true,
    warning: null,
  };
}

export function createRegionAliasSourceUnavailableResolution(
  query: unknown,
  selectedUniverseCode: string,
): RegionResolutionResult {
  const normalized = normalizeRegionAliasQuery(query);
  const boundedRegionLike = normalized.normalizedQuery
    .toLowerCase()
    .split(/\s+/u)
    .some((token) =>
      LEGACY_DISCOVERY_REGION_CONTEXT_TERMS.some(
        (term) => normalizeAliasKey(term) === token,
      ),
    );

  return {
    ...baseResult(
      normalized,
      selectedUniverseCode,
      "CANONICAL_REGION_SOURCE_UNAVAILABLE",
    ),
    rankedSearchAllowed: !boundedRegionLike,
    discoverySearchAllowed: !boundedRegionLike,
    globalFallbackAllowed: false,
    warning: boundedRegionLike
      ? "지역 해석 정보를 불러오지 못해 지역 검색을 실행하지 않았습니다."
      : "지역 해석 정보를 불러오지 못해 기존 검색 방식으로 표시합니다.",
  };
}
