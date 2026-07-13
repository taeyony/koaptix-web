import "server-only";

import { createClient } from "@supabase/supabase-js";

import { buildRegionAliasV1Index } from "./regionAliasV1";
import type {
  CanonicalRegionInput,
  RegionAliasIndex,
  RegionAliasLevel,
  RegionAliasSourceResult,
} from "./regionAliasV1.types";

const REGION_ALIAS_CACHE_FRESH_MS = 30_000;
const REGION_ALIAS_CACHE_STALE_MS = 600_000;

type RegionDimRow = {
  region_id?: number | string | null;
  region_code?: string | number | null;
  region_level?: string | null;
  full_name_ko?: string | null;
  parent_region_id?: number | string | null;
};

type RegionAliasCacheEntry = {
  index: RegionAliasIndex;
  freshUntil: number;
  staleUntil: number;
};

let regionAliasCache: RegionAliasCacheEntry | null = null;
let regionAliasInflight: Promise<RegionAliasIndex> | null = null;

function createRegionAliasSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("REGION_ALIAS_SOURCE_CONFIGURATION_UNAVAILABLE");
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function normalizeLevel(value: unknown): RegionAliasLevel | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "country" || normalized === "sido" || normalized === "sigungu") {
    return normalized;
  }
  return null;
}

function toCanonicalRows(rows: readonly RegionDimRow[]) {
  const byId = new Map<string, RegionDimRow>();
  for (const row of rows) {
    const id = String(row.region_id ?? "").trim();
    if (!id || byId.has(id)) throw new Error("REGION_ALIAS_SOURCE_INVALID_ID");
    byId.set(id, row);
  }

  const canonicalRows: CanonicalRegionInput[] = rows.map((row) => {
    const regionCode = String(row.region_code ?? "").trim();
    const fullNameKo = String(row.full_name_ko ?? "").trim();
    const regionLevel = normalizeLevel(row.region_level);
    const parentId = String(row.parent_region_id ?? "").trim();
    const parent = parentId ? byId.get(parentId) : null;
    if (!regionCode || !fullNameKo || !regionLevel) {
      throw new Error("REGION_ALIAS_SOURCE_MALFORMED_ROW");
    }
    if (parentId && !parent) throw new Error("REGION_ALIAS_SOURCE_ORPHAN_PARENT");
    return {
      regionCode,
      regionLevel,
      fullNameKo,
      parentRegionCode: parent
        ? String(parent.region_code ?? "").trim() || null
        : null,
      parentFullNameKo: parent
        ? String(parent.full_name_ko ?? "").trim() || null
        : null,
      qualifiedNameKo: fullNameKo,
      sourceProvenance: "CURRENT_INTERNAL_REGION_DIM",
    };
  });

  return canonicalRows.sort((left, right) =>
    left.regionCode.localeCompare(right.regionCode),
  );
}

async function loadRegionAliasIndex() {
  const supabase = createRegionAliasSupabase();
    const { data, error } = await supabase
      .from("region_dim")
      .select(
        "region_id,region_code,region_level:region_type,full_name_ko,parent_region_id",
      )
      .order("region_code", { ascending: true });
  if (error || !data) throw new Error("REGION_ALIAS_SOURCE_LOAD_FAILED");
  return buildRegionAliasV1Index(toCanonicalRows(data as RegionDimRow[]));
}

export async function getRegionAliasV1Source(): Promise<RegionAliasSourceResult> {
  const now = Date.now();
  if (regionAliasCache && regionAliasCache.freshUntil > now) {
    return { status: "ready", index: regionAliasCache.index, warning: null };
  }

  try {
    regionAliasInflight ??= loadRegionAliasIndex();
    const index = await regionAliasInflight;
    regionAliasCache = {
      index,
      freshUntil: Date.now() + REGION_ALIAS_CACHE_FRESH_MS,
      staleUntil: Date.now() + REGION_ALIAS_CACHE_STALE_MS,
    };
    return { status: "ready", index, warning: null };
  } catch {
    if (regionAliasCache && regionAliasCache.staleUntil > now) {
      return {
        status: "stale",
        index: regionAliasCache.index,
        warning: "CANONICAL_REGION_SOURCE_STALE",
      };
    }
    return {
      status: "unavailable",
      index: null,
      warning: "CANONICAL_REGION_SOURCE_UNAVAILABLE",
    };
  } finally {
    regionAliasInflight = null;
  }
}
