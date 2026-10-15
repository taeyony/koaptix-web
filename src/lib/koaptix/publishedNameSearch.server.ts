import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUniformUniverseServicePublication } from "./currentness";
import type { DbLatestRankBoardRow } from "./types";

const VIEW = "v_koaptix_latest_board_read_model_published";
const CANDIDATE_LIMIT = 48;
const RESULT_LIMIT = 80;
const SELECT = "generation_id,publication_version,publication_event_id,published_at,surface_code,snapshot_date,universe_code,universe_name,complex_id,apt_name_ko,rank_all,market_cap_krw,market_cap_trillion_krw,sigungu_name,legal_dong_name,build_year,household_count,total_household_count,recovery_52w,previous_rank_all,rank_delta_w,rank_movement";

export type PublishedNameSearchRow = DbLatestRankBoardRow & { searchText?: string };

function compact(value: unknown) {
  return String(value ?? "").normalize("NFC").toLowerCase().replace(/\s+/g, "");
}

function likePattern(value: string) {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

/** Names and existing aliases select IDs; only the public board supplies values. */
export async function loadPublishedNameMatches(
  supabase: Pick<SupabaseClient, "from">,
  query: string,
  universeCodes: readonly string[],
): Promise<PublishedNameSearchRow[]> {
  const term = compact(query);
  const codes = [...new Set(universeCodes)];
  if (term.length < 2 || term.length > 100 || !codes.length || codes.length > 18) return [];
  const pattern = likePattern(term);
  const board = () => supabase.from(VIEW).select(SELECT)
    .eq("surface_code", "UNIVERSE_SERVICE").in("universe_code", codes)
    .gte("rank_all", 1).lte("rank_all", 1000).order("rank_all", { ascending: true });
  const [direct, names, aliases] = await Promise.all([
    board().ilike("apt_name_ko", pattern).limit(RESULT_LIMIT),
    supabase.from("apt_complex").select("complex_id,apt_name_ko")
      .ilike("apt_name_norm", pattern).order("complex_id", { ascending: true }).limit(CANDIDATE_LIMIT),
    supabase.from("complex_name_alias").select("complex_id,alias_name")
      .ilike("alias_name_norm", pattern).order("complex_id", { ascending: true }).limit(CANDIDATE_LIMIT),
  ]);
  if (direct.error || names.error || aliases.error) throw new Error("Published name search lookup failed");
  const matchedNames = new Map<string, Set<string>>();
  for (const row of [...(names.data ?? []), ...(aliases.data ?? [])]) {
    const id = String(row.complex_id ?? "");
    const name = String(("apt_name_ko" in row ? row.apt_name_ko : row.alias_name) ?? "");
    if (!/^[1-9]\d*$/.test(id) || !compact(name).includes(term)) continue;
    if (!matchedNames.has(id) && matchedNames.size >= CANDIDATE_LIMIT) continue;
    const values = matchedNames.get(id) ?? new Set<string>();
    values.add(name);
    matchedNames.set(id, values);
  }
  const ids = [...matchedNames.keys()];
  const byId = ids.length ? await board().in("complex_id", ids).limit(RESULT_LIMIT) : { data: [], error: null };
  if (byId.error) throw new Error("Published alias search lookup failed");
  const result = new Map<string, PublishedNameSearchRow>();
  for (const raw of [...(direct.data ?? []), ...(byId.data ?? [])] as DbLatestRankBoardRow[]) {
    const id = String(raw.complex_id ?? "");
    if (!codes.includes(raw.universe_code) || !/^[1-9]\d*$/.test(id)
      || !Number.isInteger(raw.rank_all) || Number(raw.rank_all) < 1 || Number(raw.rank_all) > 1000
      || !Number.isSafeInteger(Number(raw.market_cap_krw)) || Number(raw.market_cap_krw) <= 0
      || (!compact(raw.apt_name_ko).includes(term) && !matchedNames.has(id))) {
      throw new Error("Invalid published name search result");
    }
    const key = `${raw.universe_code}:${id}`;
    const previous = result.get(key);
    if (previous && JSON.stringify(previous) !== JSON.stringify({ ...raw, searchText: [...(matchedNames.get(id) ?? [])].join(" ") })) {
      throw new Error("Conflicting published name search result");
    }
    result.set(key, { ...raw, searchText: [...(matchedNames.get(id) ?? [])].join(" ") });
  }
  // Each universe retains its own observed date; publication identity must be
  // uniform within each board, and the route checks the selected publication.
  for (const code of codes) {
    const rows = [...result.values()].filter(row => row.universe_code === code);
    if (rows.length) requireUniformUniverseServicePublication(rows, code);
  }
  return [...result.values()];
}
