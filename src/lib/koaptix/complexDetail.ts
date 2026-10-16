import { requireUniformUniverseServicePublication } from "./currentness";
import { isLegalDongName } from "./districtIdentity";
import type { ComplexDetail, DbComplexDetailSheetWeeklyRow, DbLatestRankBoardWeeklyRow, RankingItem } from "./types";

export type ComplexBasicRow = {
  complex_id: number | string | null;
  household_count: number | null;
  total_household_count: number | null;
  build_year: number | null;
  legal_dong_name: string | null;
  address_jibun: string | null;
  updated_at: string | null;
};

function positiveInteger(value: unknown): number | null {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

// A missing comparison is meaningful. Do not fill it with another scope's
// detail values, even if that response arrives after the board was rendered.
export function publicDetailMetrics(item: RankingItem | null, detail: ComplexDetail | null) {
  return {
    rank: item ? item.rank : detail?.rank ?? null,
    marketCap: item ? item.marketCapKrw : detail?.marketCapKrw ?? 0,
    rankDelta7d: item ? item.rankDelta7d : detail?.rankDelta7dNullable,
    marketCapDelta7d: item ? item.marketCapDelta7d : detail?.marketCapDelta7dNullable,
    marketCapDeltaPct7d: item ? item.marketCapDeltaPct7d : detail?.marketCapDeltaPct7dNullable,
    historySnapshotDate: item ? item.historySnapshotDate : detail?.historySnapshotDate,
    highMarketCap52w: item ? item.highMarketCap52w : detail?.highMarketCap52w,
    recoveryRate52w: item ? item.recoveryRate52w : detail?.recoveryRate52w,
  };
}

// The public row authorizes the financial values. The master only supplements
// descriptive fields; it cannot promote a historical or unpublished valuation.
export function assemblePublicComplexDetail(
  published: DbLatestRankBoardWeeklyRow,
  basic: ComplexBasicRow | null,
): DbComplexDetailSheetWeeklyRow {
  const publication = requireUniformUniverseServicePublication([published]);
  if (!/^[1-9]\d*$/.test(String(published.complex_id)) ||
      !published.apt_name_ko?.trim() || !positiveInteger(published.rank_all) || Number(published.rank_all) > 1000 ||
      !positiveInteger(published.market_cap_krw)) throw new Error("Invalid public detail row");
  if (basic && String(basic.complex_id) !== String(published.complex_id)) throw new Error("Basic detail ID mismatch");

  return {
    publication,
    complex_id: published.complex_id,
    apt_name_ko: published.apt_name_ko,
    rank_all: published.rank_all,
    market_cap_krw: published.market_cap_krw,
    market_cap_trillion_krw: published.market_cap_trillion_krw,
    sigungu_name: published.sigungu_name,
    legal_dong_name: isLegalDongName(published.legal_dong_name)
      ? published.legal_dong_name : isLegalDongName(basic?.legal_dong_name) ? basic!.legal_dong_name : null,
    household_count: positiveInteger(published.household_count) ?? positiveInteger(basic?.household_count) ?? positiveInteger(basic?.total_household_count),
    approval_year: positiveInteger(published.build_year) ?? positiveInteger(basic?.build_year),
    building_count: null,
    parking_count: null,
    address_jibun: basic?.address_jibun ?? null,
    updated_at: basic?.updated_at ?? null,
    // Regional board comparisons already carry their own validated evidence.
    // Never borrow a national/global-date predecessor for this detail response.
    history_snapshot_date: null,
    rank_delta_7d: null,
    market_cap_delta_7d: null,
    market_cap_delta_pct_7d: null,
  };
}
