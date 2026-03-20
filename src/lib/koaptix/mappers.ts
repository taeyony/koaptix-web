import type { DbLatestRankBoardRow, RankingItem } from "./types";

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

export function mapLatestRankBoardRow(row: DbLatestRankBoardRow): RankingItem {
  const complexId = toIdText(row.complex_id);
  const name = toText(row.apt_name_ko);
  const rank = toNumber(row.rank_all);
  const marketCapTrillionKrw = toNullableNumber(row.market_cap_trillion_krw);
  const marketCapKrw = toNumber(
    row.market_cap_krw,
    marketCapTrillionKrw !== null
      ? Math.round(marketCapTrillionKrw * 1_000_000_000_000)
      : 0
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