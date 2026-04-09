import { getSupabaseAdminClient } from "../supabase/admin";
import type {
  KoaptixHomeApiData,
  KoaptixHomePayloadViewRow,
} from "../../types/koaptix";

export interface HomePayloadOptions {
  topN?: number;
  chartPoints?: number;
}

function clampInt(value: number | undefined, min: number, max: number, fallback: number): number {
  if (value === undefined || Number.isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

export async function getKoaptixHomePayload(
  options: HomePayloadOptions = {},
): Promise<KoaptixHomeApiData> {
  const topN = clampInt(options.topN, 1, 50, 50);
  const chartPoints = clampInt(options.chartPoints, 3, 36, 12);

  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("v_koaptix_home_latest_payload")
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to load KOAPTIX home payload: ${error.message}`);
  }

  if (!data) {
    throw new Error("KOAPTIX home payload view returned no rows");
  }

  const row = data as unknown as KoaptixHomePayloadViewRow;

  return {
    indexCard: row.index_card,
    chart: (row.index_chart ?? []).slice(-chartPoints),
    topRanks: (row.top50 ?? []).slice(0, topN),
    topN,
    chartPoints,
    top50Count: row.top50_count,
    totalRankedComplexes: row.total_ranked_complexes,
    fetchedAt: new Date().toISOString(),
  };
}
