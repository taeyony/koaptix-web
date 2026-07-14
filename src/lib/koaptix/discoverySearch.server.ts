import type { SupabaseClient } from "@supabase/supabase-js";

import {
  normalizeBoundedDiscoveryComplexIds,
  type DiscoveryRegionEvidence,
} from "./discoverySearch";

type AptComplexRegionRow = {
  complex_id?: number | string | null;
  region_id?: number | string | null;
};

type CanonicalRegionRow = {
  region_id?: number | string | null;
  region_code?: number | string | null;
  region_name_ko?: string | null;
  full_name_ko?: string | null;
};

export type DiscoveryRegionFallbackFailure =
  | "APT_COMPLEX_REGION_LOOKUP_FAILED"
  | "REGION_DIM_LOOKUP_FAILED";

export type DiscoveryRegionFallbackHydration = {
  evidence: DiscoveryRegionEvidence[];
  failure: DiscoveryRegionFallbackFailure | null;
};

function normalizeRegionId(value: unknown) {
  const normalized = String(value ?? "").trim();
  return /^\d+$/.test(normalized) ? normalized : null;
}

export async function hydrateDiscoveryRegionFallbacks(
  supabase: Pick<SupabaseClient, "from">,
  missingCandidateIds: readonly unknown[],
): Promise<DiscoveryRegionFallbackHydration> {
  const complexIds = normalizeBoundedDiscoveryComplexIds(missingCandidateIds);
  if (complexIds.length === 0) return { evidence: [], failure: null };

  const aptResult = await supabase
    .from("apt_complex")
    .select("complex_id, region_id")
    .in("complex_id", complexIds)
    .limit(complexIds.length);

  if (aptResult.error) {
    return { evidence: [], failure: "APT_COMPLEX_REGION_LOOKUP_FAILED" };
  }

  const aptRows = (aptResult.data ?? []) as AptComplexRegionRow[];
  const regionIds = normalizeBoundedDiscoveryComplexIds(
    aptRows.map((row) => row.region_id),
  );
  if (regionIds.length === 0) return { evidence: [], failure: null };

  const regionResult = await supabase
    .from("region_dim")
    .select("region_id, region_code, region_name_ko, full_name_ko")
    .eq("region_type", "sigungu")
    .in("region_id", regionIds)
    .limit(regionIds.length);

  if (regionResult.error) {
    return { evidence: [], failure: "REGION_DIM_LOOKUP_FAILED" };
  }

  const regionById = new Map<string, CanonicalRegionRow>();
  for (const row of (regionResult.data ?? []) as CanonicalRegionRow[]) {
    const regionId = normalizeRegionId(row.region_id);
    const regionCode = String(row.region_code ?? "").trim();
    const sigunguName = String(row.region_name_ko ?? "").trim();
    if (!regionId || !/^\d{5}$/.test(regionCode) || !sigunguName) continue;
    if (!regionById.has(regionId)) regionById.set(regionId, row);
  }

  const requestedIds = new Set(complexIds);
  const evidence: DiscoveryRegionEvidence[] = [];
  const seen = new Set<string>();
  for (const row of aptRows) {
    const complexId = String(row.complex_id ?? "").trim();
    const regionId = normalizeRegionId(row.region_id);
    if (!requestedIds.has(complexId) || !regionId || seen.has(complexId)) continue;

    const region = regionById.get(regionId);
    if (!region) continue;
    const regionCode = String(region.region_code ?? "").trim();
    const sigunguName = String(region.region_name_ko ?? "").trim();
    const qualifiedRegionName = String(region.full_name_ko ?? "").trim();
    seen.add(complexId);
    evidence.push({
      complexId,
      regionCode,
      lawdCode: regionCode,
      sggCode: regionCode,
      sigunguName,
      umdName: null,
      qualifiedRegionName: qualifiedRegionName || sigunguName,
      source: "APT_COMPLEX_REGION_FALLBACK",
    });
  }

  return { evidence, failure: null };
}
