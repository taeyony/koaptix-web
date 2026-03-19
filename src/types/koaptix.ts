export type JsonPrimitive = string | number | boolean | null;

export interface KoaptixIndexCard {
  snapshot_date: string;
  index_code: string;
  universe_code: string;
  index_name: string;
  base_date: string;
  base_value: number | string;
  index_value: number | string;
  prev_month_snapshot_date: string | null;
  prev_month_index_value: number | string | null;
  change_1m: number | string | null;
  change_pct_1m: number | string | null;
  movement_1m: "new" | "up" | "down" | "flat" | string;
  base_market_cap_krw: number | string;
  total_market_cap_krw: number | string;
  prev_month_total_market_cap_krw: number | string | null;
  market_cap_change_1m: number | string | null;
  market_cap_change_pct_1m: number | string | null;
  component_complex_count: number;
}

export interface KoaptixIndexChartPoint {
  snapshot_date: string;
  index_value: number | string;
  prev_snapshot_date?: string | null;
  prev_index_value?: number | string | null;
  change_1m?: number | string | null;
  change_pct_1m?: number | string | null;
  total_market_cap_krw?: number | string | null;
  component_complex_count?: number | null;
}

export interface KoaptixRankItem {
  rank_all: number;
  tier_code: "S" | "A" | "B" | "C" | "D" | "E" | string;
  tier_label: string;
  complex_id: number;
  apt_name_ko: string;
  sigungu_name: string | null;
  legal_dong_name: string | null;
  address_road: string | null;
  address_jibun: string | null;
  market_cap_krw: number | string;
  market_cap_trillion_krw: number | string | null;
  market_cap_share_pct: number | string | null;
  previous_rank_all: number | null;
  rank_delta_1d: number | null;
  rank_movement: "new" | "up" | "down" | "same" | "stale" | string;
  priced_household_ratio: number | string | null;
  coverage_status: string | null;
}

export interface KoaptixHomePayloadViewRow {
  snapshot_date: string;
  index_code: string;
  universe_code: string;
  index_name: string;
  base_date: string;
  index_card: KoaptixIndexCard;
  index_chart: KoaptixIndexChartPoint[];
  top50: KoaptixRankItem[];
  top50_count: number;
  total_ranked_complexes: number;
}

export interface KoaptixHomeApiData {
  indexCard: KoaptixIndexCard;
  chart: KoaptixIndexChartPoint[];
  topRanks: KoaptixRankItem[];
  topN: number;
  chartPoints: number;
  top50Count: number;
  totalRankedComplexes: number;
  fetchedAt: string;
}

export interface KoaptixHomeApiResponse {
  ok: true;
  data: KoaptixHomeApiData;
}

export interface KoaptixHomeApiErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}
