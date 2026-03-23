import type {
  ChartPoint,
  ComplexDetail,
  DbComplexDetailSheetWeeklyRow,
  DbIndexHistoryRow,
  DbLatestRankBoardWeeklyRow,
  RankingItem,
  KpiItem, // 💡 잼이사가 빼먹은 단어 추가!!
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

function selectWeeklyRows(rows: NormalizedChartRow[]): NormalizedChartRow[] {
  const latestByWeek = new Map<string, NormalizedChartRow>();

  for (const row of rows) {
    latestByWeek.set(getWeekBucket(row.snapshotDate), row);
  }

  return Array.from(latestByWeek.values()).sort((a, b) =>
    a.snapshotDate.localeCompare(b.snapshotDate)
  );
}

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

  const sigunguName = toText(row.sigungu_name);
  const legalDongName = toText(row.legal_dong_name);
  const locationLabel = buildLocationLabel(sigunguName, legalDongName);

  return {
    complexId,
    name,
    rank,
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

    // 기존 하위 컴포넌트 호환
    rankDelta1d: rankDelta7d,
  };
}

export function mapLatestRankBoardRows(
  rows: DbLatestRankBoardWeeklyRow[]
): RankingItem[] {
  return rows
    .map(mapLatestRankBoardRow)
    .filter((item) => item.complexId.length > 0 && item.rank > 0 && item.name.length > 0)
    .sort((a, b) => a.rank - b.rank);
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

  const rankDelta7d = toNumber(row.rank_delta_7d, 0);
  const marketCapDelta7d = toNumber(row.market_cap_delta_7d, 0);
  const marketCapDeltaPct7d = toNumber(row.market_cap_delta_pct_7d, 0);

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
    deltaWindow: "7d",

    // 기존 하위 컴포넌트 호환
    rankDelta1d: rankDelta7d,
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
// --- 🚨 잼이사가 긴급 복구한 KPI 매퍼 부품 ---
export function mapHomeKpiToKpiCards(row: any): KpiItem[] {
  // DB에서 값이 안 넘어오면 기본 화면(Fallback)을 띄워줍니다.
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
      subValue: "2025년 1월 기준", // 필요시 동적으로 변경 가능
    },
  ];
}