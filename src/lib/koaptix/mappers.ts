import { decorateRankingTiers } from "./tiers";
import type {
  ChartPoint,
  ComplexDetail,
  DbComplexDetailSheetWeeklyRow,
  DbIndexHistoryRow,
  DbLatestRankBoardWeeklyRow,
  RankingItem,
  KpiItem,
  ComplexChartMode,
  ComplexChartContinuity,
  DbComplexChartHistoryRow,
  HistoryChartPoint,
} from "./types";

function toNumber(value: number | string | null | undefined, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}
function deriveRecoveryRate52w(
  currentMarketCap: number,
  highMarketCap52w: number | null,
  recoveryRate52w: number | null
): number | null {
  if (recoveryRate52w != null && Number.isFinite(recoveryRate52w)) {
    return Number(recoveryRate52w.toFixed(1));
  }

  if (
    highMarketCap52w != null &&
    highMarketCap52w > 0 &&
    currentMarketCap > 0
  ) {
    return Number(((currentMarketCap / highMarketCap52w) * 100).toFixed(1));
  }

  return null;
}

function toNullableNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function toIdText(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function buildLocationLabel(sigunguName: string, legalDongName: string): string {
  return [sigunguName, legalDongName].filter(Boolean).join(" ").trim();
}

function formatChartLabel(snapshotDate: string): string {
  const [, month = "00", day = "00"] = snapshotDate.split("-");
  return `${month}.${day}`;
}

function getWeekBucket(snapshotDate: string): string {
  const date = new Date(`${snapshotDate}T00:00:00Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return date.toISOString().slice(0, 10);
}

// --- 인덱스 차트 헬퍼 ---
type NormalizedChartRow = {
  snapshotDate: string;
  value: number;
};

function normalizeChartRows(rows: DbIndexHistoryRow[]): NormalizedChartRow[] {
  return rows
    .map((row) => ({
      snapshotDate: row.snapshot_date,
      value: toNumber(row.total_market_cap, 0),
    }))
    .filter((row) => row.snapshotDate.length > 0)
    .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
}

function applyMovingAverage(
  rows: NormalizedChartRow[],
  windowSize = 7
): NormalizedChartRow[] {
  return rows.map((row, index) => {
    const start = Math.max(0, index - (windowSize - 1));
    const windowRows = rows.slice(start, index + 1);
    const average =
      windowRows.reduce((sum, current) => sum + current.value, 0) /
      windowRows.length;
    return {
      snapshotDate: row.snapshotDate,
      value: Math.round(average),
    };
  });
}

function selectWeeklyRows<T extends NormalizedChartRow>(rows: T[]): T[] {
  const latestByWeek = new Map<string, T>();
  for (const row of rows) {
    latestByWeek.set(getWeekBucket(row.snapshotDate), row);
  }
  return Array.from(latestByWeek.values()).sort((a, b) =>
    a.snapshotDate.localeCompare(b.snapshotDate)
  );
}

// --- 랭킹 및 상세 매퍼 ---
export function mapLatestRankBoardRow(
  row: DbLatestRankBoardWeeklyRow
): RankingItem {
  const complexId = toIdText(row.complex_id);
  const name = toText(row.apt_name_ko);
  const rank = toNumber(row.rank_all, 0);

  const marketCapTrillionKrw = toNullableNumber(row.market_cap_trillion_krw);
  const marketCapKrw = toNumber(
    row.market_cap_krw,
    marketCapTrillionKrw !== null
      ? Math.round(marketCapTrillionKrw * 1_000_000_000_000)
      : 0
  );

  const rankDelta7d = toNumber(row.rank_delta_7d, 0);
  const marketCapDelta7d = toNumber(row.market_cap_delta_7d, 0);
  const marketCapDeltaPct7d = toNumber(row.market_cap_delta_pct_7d, 0);

  const highMarketCap52w = toNullableNumber(row.high_market_cap_52w);
  const recoveryRate52w = deriveRecoveryRate52w(
    marketCapKrw,
    highMarketCap52w,
    toNullableNumber(row.recovery_rate_52w)
  );

  const sigunguName = toText(row.sigungu_name);
  const legalDongName = toText(row.legal_dong_name);
  const locationLabel = buildLocationLabel(sigunguName, legalDongName);

  return {
    complexId,
    name,
    rank,
    snapshotDate: row.snapshot_date,
    universeCode: row.universe_code,
    universeName: row.universe_name ?? null,
    marketCapKrw,
    marketCapTrillionKrw,

    sigunguName,
    legalDongName,
    locationLabel,
    searchText: [name, complexId, sigunguName, legalDongName, locationLabel]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),

    historySnapshotDate: row.history_snapshot_date ?? null,
    rankDelta7d,
    marketCapDelta7d,
    marketCapDeltaPct7d,
    deltaWindow: "7d",

    rankDelta1d: rankDelta7d,

    highMarketCap52w,
    recoveryRate52w,
  };
}

// 💡 페이즈 17: 티어 엔진을 통과시켜 훈장을 달아주는 로직 추가!
export function mapLatestRankBoardRows(
  rows: DbLatestRankBoardWeeklyRow[]
): RankingItem[] {
  const mapped = rows
    .map(mapLatestRankBoardRow)
    .filter((item) => item.complexId.length > 0 && item.rank > 0 && item.name.length > 0)
    .sort((a, b) => a.rank - b.rank);

  return decorateRankingTiers(mapped);
}

export function mapComplexDetailRow(
  row: DbComplexDetailSheetWeeklyRow
): ComplexDetail {
  const complexId = toIdText(row.complex_id);
  const name = toText(row.apt_name_ko);
  const rank = toNumber(row.rank_all, 0);

  const marketCapTrillionKrw = toNullableNumber(row.market_cap_trillion_krw);
  const marketCapKrw = toNumber(
    row.market_cap_krw,
    marketCapTrillionKrw !== null
      ? Math.round(marketCapTrillionKrw * 1_000_000_000_000)
      : 0
  );

  const sigunguName = toText(row.sigungu_name);
  const legalDongName = toText(row.legal_dong_name);
  const locationLabel = buildLocationLabel(sigunguName, legalDongName);

  const approvalYear = toNullableNumber(row.approval_year);
  const currentYear = new Date().getFullYear();

  const rankDelta7dNullable = toNullableNumber(row.rank_delta_7d);
  const marketCapDelta7dNullable = toNullableNumber(row.market_cap_delta_7d);
  const marketCapDeltaPct7dNullable = toNullableNumber(row.market_cap_delta_pct_7d);
  const weeklyComparisonAvailable =
    row.history_snapshot_date != null &&
    (rankDelta7dNullable != null ||
      marketCapDelta7dNullable != null ||
      marketCapDeltaPct7dNullable != null);
  const rankDelta7d = rankDelta7dNullable ?? 0;
  const marketCapDelta7d = marketCapDelta7dNullable ?? 0;
  const marketCapDeltaPct7d = marketCapDeltaPct7dNullable ?? 0;

  const highMarketCap52w = toNullableNumber(row.high_market_cap_52w);
  const recoveryRate52w = deriveRecoveryRate52w(
    marketCapKrw,
    highMarketCap52w,
    toNullableNumber(row.recovery_rate_52w)
  );

  return {
    complexId,
    name,
    rank,
    marketCapKrw,
    marketCapTrillionKrw,

    sigunguName,
    legalDongName,
    locationLabel,

    householdCount: toNullableNumber(row.household_count),
    approvalYear,
    ageYears: approvalYear != null ? Math.max(currentYear - approvalYear, 0) : null,
    buildingCount: toNullableNumber(row.building_count),
    parkingCount: toNullableNumber(row.parking_count),
    updatedAt: row.updated_at ?? null,

    historySnapshotDate: row.history_snapshot_date ?? null,
    rankDelta7d,
    marketCapDelta7d,
    marketCapDeltaPct7d,
    weeklyComparisonAvailable,
    rankDelta7dNullable,
    marketCapDelta7dNullable,
    marketCapDeltaPct7dNullable,
    deltaWindow: "7d",

    rankDelta1d: rankDelta7d,

    highMarketCap52w,
    recoveryRate52w,
  };
}
export function mapIndexChartRows(
  rows: DbIndexHistoryRow[],
  options: {
    mode?: "weekly" | "ma7";
    maxPoints?: number;
  } = {}
): ChartPoint[] {
  const mode = options.mode ?? "weekly";
  const maxPoints = options.maxPoints ?? 26;

  const normalized = normalizeChartRows(rows);
  if (normalized.length === 0) {
    return [];
  }

  const series =
    mode === "ma7"
      ? applyMovingAverage(normalized, 7)
      : selectWeeklyRows(normalized);

  return series.slice(-maxPoints).map((row) => ({
    label: formatChartLabel(row.snapshotDate),
    value: row.value,
  }));
}

// --- 페이즈 16, 17: 단지별 히스토리 멀티맵 매퍼 ---
type NormalizedComplexHistoryRow = ComplexChartContinuity & {
  snapshotDate: string;
  value: number;
};

export function hasComplexHistoryBoundary(
  previous: ComplexChartContinuity,
  current: ComplexChartContinuity,
): boolean {
  return current.breakBefore === true
    || previous.sourceKey !== current.sourceKey
    || previous.segmentKey !== current.segmentKey;
}

export function deduplicateComplexHistoryObservations<T extends ComplexChartContinuity & {
  snapshotDate: string;
  value: number | null;
}>(rows: readonly T[]): T[] {
  const byDate = new Map<string, T>();
  for (const row of rows) {
    const previous = byDate.get(row.snapshotDate);
    if (previous) {
      if (previous.value !== row.value) {
        throw new Error(`Conflicting complex history values at ${row.snapshotDate}`);
      }
      for (const key of ["sourceKey", "segmentKey"] as const) {
        if (previous[key] != null && row[key] != null && previous[key] !== row[key]) {
          throw new Error(`Conflicting complex history provenance at ${row.snapshotDate}`);
        }
      }
      byDate.set(row.snapshotDate, {
        ...previous,
        ...row,
        ...(previous.sourceKey != null || row.sourceKey != null ? { sourceKey: row.sourceKey ?? previous.sourceKey } : {}),
        ...(previous.segmentKey != null || row.segmentKey != null ? { segmentKey: row.segmentKey ?? previous.segmentKey } : {}),
        ...(previous.breakBefore || row.breakBefore ? { breakBefore: true } : {}),
      });
    } else {
      byDate.set(row.snapshotDate, { ...row });
    }
  }
  return Array.from(byDate.values()).sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
}

function normalizeComplexHistoryRows(
  rows: DbComplexChartHistoryRow[]
): NormalizedComplexHistoryRow[] {
  const observations = deduplicateComplexHistoryObservations(rows
    .filter((row) => row.snapshot_date.length > 0)
    .map((row) => {
      const amount = toNullableNumber(row.market_cap_krw);
      return {
        snapshotDate: row.snapshot_date,
        value: amount != null && amount > 0 ? amount : null,
        ...(row.sourceKey != null ? { sourceKey: row.sourceKey } : {}),
        ...(row.segmentKey != null ? { segmentKey: row.segmentKey } : {}),
        ...(row.breakBefore === true ? { breakBefore: true } : {}),
      };
    }));

  const normalized: NormalizedComplexHistoryRow[] = [];
  let pendingBreak = false;
  for (const row of observations) {
    if (row.value == null) {
      pendingBreak = true;
      continue;
    }
    const previous = normalized.at(-1);
    const breakBefore = pendingBreak || row.breakBefore === true
      || (previous != null && hasComplexHistoryBoundary(previous, row));
    normalized.push({ ...row, value: row.value, ...(breakBefore ? { breakBefore: true } : {}) });
    pendingBreak = false;
  }
  return normalized;
}

export function mapComplexChartHistoryRows(
  rows: DbComplexChartHistoryRow[],
  options: {
    mode?: ComplexChartMode;
    maxPoints?: number;
  } = {}
): HistoryChartPoint[] {
  const mode = options.mode ?? "weekly";
  const maxPoints = options.maxPoints ?? (mode === "ma7" ? 60 : 26);

  const normalized = normalizeComplexHistoryRows(rows);
  if (normalized.length === 0) {
    return [];
  }

  if (mode === "ma7" && normalized.some((row) => row.breakBefore || row.sourceKey != null || row.segmentKey != null)) {
    throw new Error("Moving averages are unavailable for segmented complex history");
  }

  // Calendar modes keep the last stored observation without aggregation or gap filling.
  const calendarRows = new Map<string, NormalizedComplexHistoryRow>();
  if (mode === "monthly" || mode === "yearly") {
    for (const row of normalized) {
      const bucket = row.snapshotDate.slice(0, mode === "monthly" ? 7 : 4);
      calendarRows.set(bucket, row);
    }
  }

  const series: NormalizedComplexHistoryRow[] =
    mode === "ma7"
      ? applyMovingAverage(normalized, 7)
      : mode === "monthly" || mode === "yearly"
        ? Array.from(calendarRows.values())
        : selectWeeklyRows(normalized);

  // A boundary within a calendar bucket must survive choosing its last value.
  // Missing dates alone do not establish a cadence or create a new boundary.
  let cursor = 0;
  return series.map((row) => {
    let breakBefore = false;
    while (cursor < normalized.length && normalized[cursor].snapshotDate <= row.snapshotDate) {
      breakBefore ||= normalized[cursor].breakBefore === true;
      cursor += 1;
    }
    return {
      snapshotDate: row.snapshotDate,
      label: mode === "monthly"
        ? row.snapshotDate.slice(0, 7).replace("-", ".")
        : mode === "yearly"
          ? row.snapshotDate.slice(0, 4)
          : formatChartLabel(row.snapshotDate),
      value: row.value,
      ...(row.sourceKey != null ? { sourceKey: row.sourceKey } : {}),
      ...(row.segmentKey != null ? { segmentKey: row.segmentKey } : {}),
      ...(breakBefore ? { breakBefore: true } : {}),
    };
  }).slice(-maxPoints);
}

export function mapComplexChartHistoryMap(
  rowsById: Record<string, DbComplexChartHistoryRow[]>,
  options: {
    mode?: ComplexChartMode;
    maxPoints?: number;
  } = {}
): Record<string, HistoryChartPoint[]> {
  return Object.fromEntries(
    Object.entries(rowsById).map(([complexId, rows]) => [
      complexId,
      mapComplexChartHistoryRows(rows, options),
    ])
  );
}

// --- 잃어버렸던 KPI 복구 매퍼 ---
export function mapHomeKpiToKpiCards(row: any): KpiItem[] {
  const totalMarketCap = row?.total_market_cap_krw || row?.market_cap_krw;
  let marketCapDisplay = "468.8조원";

  if (totalMarketCap && totalMarketCap >= 1_000_000_000_000) {
    marketCapDisplay = `${(totalMarketCap / 1_000_000_000_000).toFixed(1)}조원`;
  } else if (totalMarketCap) {
    marketCapDisplay = `${new Intl.NumberFormat("ko-KR").format(totalMarketCap)}원`;
  }

  const complexCount = row?.total_complex_count || row?.listed_units || 501;

  return [
    {
      label: "MARKET CAP",
      value: marketCapDisplay,
      subValue: "코앱틱스 전체 단지",
    },
    {
      label: "LISTED UNITS",
      value: `${new Intl.NumberFormat("ko-KR").format(complexCount)}개`,
      subValue: "2025년 1월 기준",
    },
  ];
}
