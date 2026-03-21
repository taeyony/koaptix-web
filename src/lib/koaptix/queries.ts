import { createClient } from "@supabase/supabase-js";
import type { DbLatestRankBoardRow } from "./types";

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

// 기존 getLatestRankBoard 함수를 이걸로 교체!
export async function getLatestRankBoard(limit: number = 50, offset: number = 0): Promise<DbLatestRankBoardRow[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("v_koaptix_latest_rank_board")
    .select("*")
    .order("rank_all", { ascending: true })
    .range(offset, offset + limit - 1); // 💡 여기서 지정한 구간(예: 51위~100위)만큼만 잘라서 가져옵니다!

  if (error) {
    console.error("Failed to fetch latest rank board:", error);
    throw error;
  }

  return (data ?? []) as DbLatestRankBoardRow[];
}
import type { DbComplexDetailSheetRow } from "./types";

function normalizeComplexId(complexId: string | number) {
  if (typeof complexId === "number") return complexId;

  const parsed = Number(complexId);
  return Number.isFinite(parsed) ? parsed : complexId;
}

export async function getComplexDetailById(
  complexId: string | number
): Promise<DbComplexDetailSheetRow | null> {
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
        rank_delta_1d,
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

  return (data ?? null) as DbComplexDetailSheetRow | null;
}
import type { DbHomeKpiRow } from "./types";

export async function getHomeKpi(): Promise<DbHomeKpiRow | null> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("v_koaptix_home_kpi")
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch home KPI:", error);
    return null;
  }
  return data as DbHomeKpiRow | null;
}
import type { DbIndexChartRow } from "./types";

export async function getIndexChart(): Promise<DbIndexChartRow[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("v_koaptix_index_chart")
    .select("*")
    .order("date_label", { ascending: true });

  if (error) {
    console.error("Failed to fetch chart data:", error);
    return [];
  }
  return data || [];
}