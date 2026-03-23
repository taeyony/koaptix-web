export type WeeklyDeltaWindow = "7d";

export type WeeklyDeltaPayload = {
  history_snapshot_date: string | null;
  rank_delta_7d: number;
  market_cap_delta_7d: number;
  market_cap_delta_pct_7d: number;
};

export type DbLatestRankBoardRow = {
  complex_id: number | string | null;
  apt_name_ko: string | null;
  rank_all: number | null;
  market_cap_krw: number | string | null;
  market_cap_trillion_krw: number | string | null;
  sigungu_name: string | null;
  legal_dong_name: string | null;
};

export type DbLatestRankBoardWeeklyRow = DbLatestRankBoardRow & WeeklyDeltaPayload;

export type DbRankHistoryRow = {
  snapshot_date: string;
  complex_id: number | string | null;
  market_cap_krw: number | string | null;
  rank_all: number | null;
  total_market_cap?: number | string | null;
};

export type DbComplexDetailSheetBaseRow = {
  complex_id: number | string | null;
  apt_name_ko: string | null;
  rank_all: number | null;
  market_cap_krw: number | string | null;
  market_cap_trillion_krw: number | string | null;
  sigungu_name: string | null;
  legal_dong_name: string | null;
  household_count: number | null;
  approval_year: number | null;
  building_count: number | null;
  parking_count: number | null;
  updated_at: string | null;
};

export type DbComplexDetailSheetWeeklyRow = DbComplexDetailSheetBaseRow & WeeklyDeltaPayload;

export type DbIndexHistoryRow = {
  snapshot_date: string;
  total_market_cap: number | string | null;
};

// --- Phase 17: 티어 및 다중 차트 부품 ---
export type TierBadgeTone = "gold" | "cyan" | "fuchsia" | "steel";

export type TierBadgeData = {
  key: "national" | "district" | "city";
  label: string;
  icon: "👑" | "💠" | "⚡";
  tone: TierBadgeTone;
};

export type TierStats = {
  nationalRank: number;
  nationalTierCode: string;
  localRank?: number;
  cityRank?: number;
  districtLabel?: string;
  cityLabel?: string;
};

export type HistoryChartSeries = {
  key: string;
  name: string;
  color?: string;
  points: HistoryChartPoint[];
};

export type RankingItem = {
  complexId: string;
  name: string;
  rank: number;
  marketCapKrw: number;
  marketCapTrillionKrw: number | null;

  sigunguName: string;
  legalDongName: string;
  cityName?: string;
  locationLabel: string;
  searchText: string;

  historySnapshotDate: string | null;
  rankDelta7d: number;
  marketCapDelta7d: number;
  marketCapDeltaPct7d: number;
  deltaWindow: "7d";

  rankDelta1d: number;

  tierBadges?: TierBadgeData[];
  tierStats?: TierStats;
};

export type ComplexDetail = {
  complexId: string;
  name: string;
  rank: number;
  marketCapKrw: number;
  marketCapTrillionKrw: number | null;

  sigunguName: string;
  legalDongName: string;
  cityName?: string;
  locationLabel: string;

  householdCount: number | null;
  approvalYear: number | null;
  ageYears: number | null;
  buildingCount: number | null;
  parkingCount: number | null;
  updatedAt: string | null;

  historySnapshotDate: string | null;
  rankDelta7d: number;
  marketCapDelta7d: number;
  marketCapDeltaPct7d: number;
  deltaWindow: "7d";

  rankDelta1d: number;

  tierBadges?: TierBadgeData[];
  tierStats?: TierStats;
};

// --- Phase 16: 차트 데이터 부품 ---
export type DbComplexChartHistoryRow = {
  snapshot_date: string;
  complex_id: number | string | null;
  market_cap_krw: number | string | null;
  rank_all: number | null;
};

export type HistoryChartPoint = {
  snapshotDate: string;
  label: string;
  value: number;
};

export type ComplexChartMode = "weekly" | "ma7";

// --- 기타 KPI 및 차트 헬퍼 ---
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