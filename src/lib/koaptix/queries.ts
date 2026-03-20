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

export async function getLatestRankBoard(limit = 50): Promise<DbLatestRankBoardRow[]> {
  const supabase = createServerSupabase();
  const safeLimit = Math.max(1, Math.min(limit, 100));

  const { data, error } = await supabase
    .from("v_koaptix_latest_rank_board")
    .select(
      `
        complex_id,
        apt_name_ko,
        rank_all,
        market_cap_krw,
        market_cap_trillion_krw,
        rank_delta_1d,
        sigungu_name,
        legal_dong_name
      `
    )
    .order("rank_all", { ascending: true })
    .limit(safeLimit);

  if (error) {
    throw new Error(`Failed to fetch v_koaptix_latest_rank_board: ${error.message}`);
  }

  return (data ?? []) as DbLatestRankBoardRow[];
}