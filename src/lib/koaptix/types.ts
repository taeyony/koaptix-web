export type NullableNumberLike = number | string | null;

export type WeeklyDeltaWindow = "7d";

export type WeeklyDeltaPayload = {
  history_snapshot_date: string | null;
  rank_delta_7d: number | null;
  market_cap_delta_7d: number | null;
  market_cap_delta_pct_7d: number | null;
};

export type DbLatestRankBoardRow = {
  complex_id: number | string | null;
  apt_name_ko: string | null;
  rank_all: number | null;
  market_cap_krw: number | string | null;
  market_cap_trillion_krw: number | string | null;
  sigungu_name: string | null;
  legal_dong_name: string | null;

  household_count?: NullableNumberLike;
  build_year?: NullableNumberLike;

  universe_code?: string | null;
  universe_name?: string | null;
};

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

export type DbIndexHistoryRow = {
  snapshot_date: string;
  total_market_cap: number | string | null;
};

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

export type DiscoveryStatus =
  | "OBSERVATION_READY"
  | "SOURCE_IDENTITY_AMBIGUOUS"
  | "SOURCE_PRESENT_REGION_MISSING"
  | "SOURCE_ABSENT";

export type DiscoveryWarning =
  | "SOURCE_IDENTITY_AMBIGUOUS"
  | "AREA_HOUSEHOLD_GAP"
  | "TRADE_CLEAN_GAP"
  | "MARKET_CAP_SOURCE_GAP"
  | "ELIGIBILITY_OR_RANK_GAP";

export type DiscoveryCandidate = {
  discoveryId: string;
  complexId: string;
  displayName: string;
  regionLabel: string;
  sigunguName?: string | null;
  umdName?: string | null;
  discoveryStatus: DiscoveryStatus;
  evidenceFlags: {
    hasComplex: boolean;
    hasAlias: boolean;
    hasExternalId: boolean;
    hasRegionMap: boolean;
    hasAreaHousehold: boolean;
    hasTradeClean: boolean;
    hasPriceSnapshot?: boolean;
    hasComponentSnapshot?: boolean;
    hasMarketCap: boolean;
    hasEligibility: boolean;
    hasRank: boolean;
    hasLatestBoard?: boolean;
    hasDetail: boolean;
  };
  warnings: DiscoveryWarning[];
  copy: {
    badge: string;
    message: string;
    helperText: string;
  };
  disabledActions: {
    openRankedDetail: true;
    showMarketCap: true;
    showRank: true;
    showChart: true;
  };
};

export type HistoryChartSeries = {
  key: string;
  name: string;
  color?: string;
  points: HistoryChartPoint[];
};

export type DbLatestRankBoardWeeklyRow = DbLatestRankBoardRow &
  WeeklyDeltaPayload & {
    high_market_cap_52w?: number | string | null;
    recovery_rate_52w?: number | string | null;
  };

export type DbComplexDetailSheetWeeklyRow =
  DbComplexDetailSheetBaseRow &
  WeeklyDeltaPayload & {
    high_market_cap_52w?: number | string | null;
    recovery_rate_52w?: number | string | null;
  };

export type RankingItem = {
  complexId: string;
  name: string;
  apt_name_ko?: string;

  rank: number;
  rank_all?: number;

  marketCapKrw: number;
  market_cap_krw?: number;

  marketCapTrillionKrw: number | null;
  market_cap_trillion_krw?: number | null;

  sigunguName: string;
  sigungu_name?: string;

  legalDongName: string;
  legal_dong_name?: string;

  cityName?: string;
  locationLabel: string;
  searchText?: string;

  historySnapshotDate?: string | null;
  rankDelta7d: number | null;
  rank_delta_w?: number | null;

  marketCapDelta7d?: number | null;
  marketCapDeltaPct7d?: number | null;
  deltaWindow?: "7d";

  rankDelta1d?: number | null;

  rankMovement?: string | null;
  rank_movement?: string | null;

  previousRankAll?: number | null;
  previous_rank_all?: number | null;

  tierBadges?: TierBadgeData[];
  tierStats?: TierStats;

  highMarketCap52w?: number | null;
  recoveryRate52w: number | null;
  recovery_52w?: number | null;

  households?: number | null;
  buildYear?: number | null;
  household_count?: number | null;
  build_year?: number | null;
  ageYears?: number | null;
  age_years?: number | null;

  universeCode?: string;
  universe_code?: string;
  universeName?: string | null;
  universe_name?: string | null;
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
  weeklyComparisonAvailable: boolean;
  rankDelta7dNullable: number | null;
  marketCapDelta7dNullable: number | null;
  marketCapDeltaPct7dNullable: number | null;
  deltaWindow: "7d";

  rankDelta1d: number;

  tierBadges?: TierBadgeData[];
  tierStats?: TierStats;

  highMarketCap52w: number | null;
  recoveryRate52w: number | null;
};

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
