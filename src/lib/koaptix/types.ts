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