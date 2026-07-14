export const DISCOVERY_REGION_FALLBACK_CANDIDATE_CAP = 48;

export type DiscoveryRegionEvidenceSource =
  | "REGION_MAP"
  | "APT_COMPLEX_REGION_FALLBACK";

export type DiscoveryRegionEvidence = {
  complexId: string;
  regionCode: string | null;
  lawdCode: string | null;
  sggCode: string | null;
  sigunguName: string | null;
  umdName: string | null;
  qualifiedRegionName: string | null;
  source: DiscoveryRegionEvidenceSource;
};

export function prioritizeExistingFullExactDiscoveryTerm(
  terms: readonly string[],
  fullExactTerm: string,
): string[] {
  const exactIndex = terms.indexOf(fullExactTerm);
  if (exactIndex <= 0) return [...terms];

  return [
    terms[exactIndex],
    ...terms.slice(0, exactIndex),
    ...terms.slice(exactIndex + 1),
  ];
}

function normalizeComplexId(value: unknown) {
  const normalized = String(value ?? "").trim();
  return /^\d+$/.test(normalized) ? normalized : null;
}

export function normalizeBoundedDiscoveryComplexIds(
  values: readonly unknown[],
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const complexId = normalizeComplexId(value);
    if (!complexId || seen.has(complexId)) continue;
    seen.add(complexId);
    result.push(complexId);
    if (result.length === DISCOVERY_REGION_FALLBACK_CANDIDATE_CAP) break;
  }

  return result;
}

function indexEvidenceByComplexId(
  evidence: readonly DiscoveryRegionEvidence[],
) {
  const result = new Map<string, DiscoveryRegionEvidence>();
  for (const row of evidence) {
    const complexId = normalizeComplexId(row.complexId);
    if (!complexId || result.has(complexId)) continue;
    result.set(complexId, { ...row, complexId });
  }
  return result;
}

export function getMissingDiscoveryRegionComplexIds(
  candidateIds: readonly unknown[],
  mapEvidence: readonly DiscoveryRegionEvidence[],
) {
  const boundedIds = normalizeBoundedDiscoveryComplexIds(candidateIds);
  const mapById = indexEvidenceByComplexId(
    mapEvidence.filter((row) => row.source === "REGION_MAP"),
  );
  return boundedIds.filter((complexId) => !mapById.has(complexId));
}

function hasValidFallbackRegion(row: DiscoveryRegionEvidence) {
  return (
    row.source === "APT_COMPLEX_REGION_FALLBACK" &&
    /^\d{5}$/.test(String(row.regionCode ?? "")) &&
    Boolean(String(row.sigunguName ?? "").trim())
  );
}

export function mergeDiscoveryRegionEvidence(
  candidateIds: readonly unknown[],
  mapEvidence: readonly DiscoveryRegionEvidence[],
  fallbackEvidence: readonly DiscoveryRegionEvidence[],
) {
  const boundedIds = normalizeBoundedDiscoveryComplexIds(candidateIds);
  const mapById = indexEvidenceByComplexId(
    mapEvidence.filter((row) => row.source === "REGION_MAP"),
  );
  const fallbackById = indexEvidenceByComplexId(
    fallbackEvidence.filter(hasValidFallbackRegion),
  );
  const resolved = new Map<string, DiscoveryRegionEvidence>();

  for (const complexId of boundedIds) {
    const mapRow = mapById.get(complexId);
    if (mapRow) {
      resolved.set(complexId, mapRow);
      continue;
    }

    const fallbackRow = fallbackById.get(complexId);
    if (fallbackRow) resolved.set(complexId, fallbackRow);
  }

  return resolved;
}

export function isDiscoveryOnlyEligible(
  complexId: unknown,
  rankedIds: ReadonlySet<string>,
  latestBoardIds: ReadonlySet<string>,
  detailIds: ReadonlySet<string>,
) {
  const normalized = normalizeComplexId(complexId);
  return Boolean(
    normalized &&
      !rankedIds.has(normalized) &&
      !latestBoardIds.has(normalized) &&
      !detailIds.has(normalized),
  );
}

export function dedupeDiscoveryByComplexId<T extends { complexId: unknown }>(
  rows: readonly T[],
  rankedIds: ReadonlySet<string> = new Set<string>(),
) {
  const result: T[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const complexId = normalizeComplexId(row.complexId);
    if (!complexId || rankedIds.has(complexId) || seen.has(complexId)) continue;
    seen.add(complexId);
    result.push(row);
  }

  return result;
}

export function getDiscoveryRegionEvidencePriority(
  source: DiscoveryRegionEvidenceSource | null | undefined,
) {
  if (source === "REGION_MAP") return 0;
  if (source === "APT_COMPLEX_REGION_FALLBACK") return 1;
  return 2;
}
