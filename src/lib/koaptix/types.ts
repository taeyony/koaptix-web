export type DbLatestRankBoardRow = {
  complex_id: number | string | null;
  apt_name_ko: string | null;
  rank_all: number | null;
  market_cap_krw: number | string | null;
  market_cap_trillion_krw: number | string | null;
  rank_delta_1d: number | null;
  sigungu_name: string | null;
  legal_dong_name: string | null;
};

export type RankingItem = {
  complexId: string;
  name: string;
  rank: number;
  marketCapKrw: number;
  marketCapTrillionKrw: number | null;
  rankDelta1d: number;
  sigunguName: string;
  legalDongName: string;
  locationLabel: string;
  searchText: string;
};

export type KpiItem = {
  label: string;
  value: string;
  subValue?: string;
};

export type ChartPoint = {
  label: string;
  value: number;
};

export type HomePageData = {
  kpis: KpiItem[];
  index: {
    valueLabel: string;
    changePct: number;
    chartData: ChartPoint[];
  };
  rankings: RankingItem[];
  rankingsError?: string | null;
};
export type RankingSortKey =
  | "rank_asc"
  | "market_cap_desc"
  | "delta_desc"
  | "name_asc";

export type DbComplexDetailSheetRow = {
  complex_id: number | string | null;
  apt_name_ko: string | null;
  rank_all: number | null;
  market_cap_krw: number | string | null;
  market_cap_trillion_krw: number | string | null;
  rank_delta_1d: number | null;
  sigungu_name: string | null;
  legal_dong_name: string | null;
  household_count: number | null;
  approval_year: number | null;
  building_count: number | null;
  parking_count: number | null;
  updated_at: string | null;
};

export type ComplexDetail = {
  complexId: string;
  name: string;
  rank: number;
  marketCapKrw: number;
  marketCapTrillionKrw: number | null;
  rankDelta1d: number;
  sigunguName: string;
  legalDongName: string;
  locationLabel: string;
  householdCount: number | null;
  approvalYear: number | null;
  ageYears: number | null;
  buildingCount: number | null;
  parkingCount: number | null;
  updatedAt: string | null;
};
export type DbHomeKpiRow = {
  total_market_cap: number | null;
  total_listed_units: number | null;
  base_date: string | null;
};
export type DbIndexChartRow = {
  snapshot_date: string | null;
  total_market_cap: number | null;
};