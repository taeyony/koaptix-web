import type { DbLatestRankBoardRow, RankingItem, ComplexDetail, DbComplexDetailSheetRow } from "./types";

function toNumber(value: number | string | null | undefined, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toNullableNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toOptionalNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function toIdText(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function buildLocationLabel(sigunguName: string, legalDongName: string): string {
  return [sigunguName, legalDongName].filter(Boolean).join(" ").trim();
}

export function mapLatestRankBoardRow(row: DbLatestRankBoardRow): RankingItem {
  const complexId = toIdText(row.complex_id);
  const name = toText(row.apt_name_ko);
  const rank = toNumber(row.rank_all);
  const marketCapTrillionKrw = toNullableNumber(row.market_cap_trillion_krw);
  const marketCapKrw = toNumber(
    row.market_cap_krw,
    marketCapTrillionKrw !== null ? Math.round(marketCapTrillionKrw * 1_000_000_000_000) : 0
  );
  const rankDelta1d = toNumber(row.rank_delta_1d);
  const sigunguName = toText(row.sigungu_name);
  const legalDongName = toText(row.legal_dong_name);
  const locationLabel = buildLocationLabel(sigunguName, legalDongName);

  return {
    complexId,
    name,
    rank,
    marketCapKrw,
    marketCapTrillionKrw,
    rankDelta1d,
    sigunguName,
    legalDongName,
    locationLabel,
    searchText: [name, complexId, sigunguName, legalDongName, locationLabel]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  };
}

export function mapLatestRankBoardRows(rows: DbLatestRankBoardRow[]): RankingItem[] {
  return rows
    .map(mapLatestRankBoardRow)
    .filter((item) => item.complexId.length > 0 && item.rank > 0 && item.name.length > 0)
    .sort((a, b) => a.rank - b.rank);
}

export function mapComplexDetailRow(row: DbComplexDetailSheetRow): ComplexDetail {
  const complexId = String(row.complex_id ?? "").trim();
  const name = toText(row.apt_name_ko);
  const rank = toOptionalNumber(row.rank_all) ?? 0;
  const marketCapTrillionKrw = toOptionalNumber(row.market_cap_trillion_krw);

  const marketCapKrw =
    toOptionalNumber(row.market_cap_krw) ??
    (marketCapTrillionKrw != null ? Math.round(marketCapTrillionKrw * 1_000_000_000_000) : 0);

  const rankDelta1d = toOptionalNumber(row.rank_delta_1d) ?? 0;
  const sigunguName = toText(row.sigungu_name);
  const legalDongName = toText(row.legal_dong_name);
  const locationLabel = buildLocationLabel(sigunguName, legalDongName);

  const householdCount = toOptionalNumber(row.household_count);
  const approvalYear = toOptionalNumber(row.approval_year);
  const buildingCount = toOptionalNumber(row.building_count);
  const parkingCount = toOptionalNumber(row.parking_count);

  const currentYear = new Date().getFullYear();
  const ageYears = approvalYear != null ? Math.max(currentYear - approvalYear, 0) : null;

  return {
    complexId,
    name,
    rank,
    marketCapKrw,
    marketCapTrillionKrw,
    rankDelta1d,
    sigunguName,
    legalDongName,
    locationLabel,
    householdCount,
    approvalYear,
    ageYears,
    buildingCount,
    parkingCount,
    updatedAt: row.updated_at ?? null,
  };
}
import type { DbHomeKpiRow } from "./types";

export function mapHomeKpiToKpiCards(row: DbHomeKpiRow | null) {
  if (!row) {
    return [
      { label: "Market Cap", value: "-", subValue: "데이터 없음" },
      { label: "Listed Units", value: "-", subValue: "데이터 없음" },
    ];
  }

  // 1. 총 시가총액 포맷팅 (조 단위)
  const marketCapKrw = Number(row.total_market_cap) || 0;
  const TRILLION = 1_000_000_000_000;
  let formattedMarketCap = "-";
  
  if (marketCapKrw >= TRILLION) {
    const amount = marketCapKrw / TRILLION;
    formattedMarketCap = `${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(amount)}조원`;
  } else if (marketCapKrw > 0) {
    formattedMarketCap = `${new Intl.NumberFormat("ko-KR").format(marketCapKrw)}원`;
  }

  // 2. 상장 단지 수 포맷팅
  const listedUnits = Number(row.total_listed_units) || 0;
  const formattedUnits = `${new Intl.NumberFormat("ko-KR").format(listedUnits)}개`;

  // 3. 기준일 포맷팅
  let formattedDate = "-";
  if (row.base_date) {
    const date = new Date(row.base_date);
    if (!Number.isNaN(date.getTime())) {
      formattedDate = `${date.getFullYear()}년 ${date.getMonth() + 1}월 기준`;
    }
  }

  return [
    { label: "Market Cap", value: formattedMarketCap, subValue: "코앱틱스 전체 단지" },
    { label: "Listed Units", value: formattedUnits, subValue: formattedDate },
  ];
}
import type { DbIndexChartRow } from "./types";

export function mapIndexChartData(rows: DbIndexChartRow[]) {
  if (!rows || rows.length === 0) {
    return { valueLabel: "-", changePct: 0, chartData: [] };
  }

  // 1. 차트에 들어갈 [날짜, 값] 배열 만들기
  const chartData = rows.map((row) => {
    const d = row.date_label ? new Date(row.date_label) : new Date();
    // "01.31" 형태로 날짜 포맷팅
    const label = `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    return {
      label,
      value: Number(row.index_value) || 0,
    };
  });

  // 2. 최신 지수 및 전일 대비 증감률(%) 계산
  const latestValue = chartData[chartData.length - 1].value;
  let changePct = 0;
  
  if (chartData.length > 1) {
    const prevValue = chartData[chartData.length - 2].value;
    if (prevValue > 0) {
      changePct = ((latestValue - prevValue) / prevValue) * 100;
    }
  }

  return {
    valueLabel: latestValue.toFixed(2), // 소수점 2자리까지
    changePct: Number(changePct.toFixed(2)),
    chartData,
  };
}