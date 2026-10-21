import { cache } from "react";
import { getLatestRankBoard } from "./queries";
import { resolveUniverseRequest } from "./universes";
import type { DbLatestRankBoardWeeklyRow } from "./types";
import { comparisonScopeLabel, getComparisonFacts } from "./comparisonFacts";

export const PUBLIC_SITE_ORIGIN = "https://www.koaptix.com";

export function publicRegionLabel(code: string) {
  return comparisonScopeLabel(code);
}

export function isPublicPageRow(row: DbLatestRankBoardWeeklyRow) {
  return /^[1-9]\d*$/.test(String(row.complex_id ?? "")) && Boolean(row.apt_name_ko?.trim()) &&
    Number.isInteger(row.rank_all) && Number(row.rank_all) >= 1 && Number(row.rank_all) <= 1000 &&
    Number.isSafeInteger(Number(row.market_cap_krw)) && Number(row.market_cap_krw) > 0;
}

// Request-scoped deduplication only. The existing reader enforces publication
// identity; no legacy, master, discovery or historical fallback is exposed here.
export const getPublicPageBoard = cache(async (code: string, limit: number) => {
  const scope = resolveUniverseRequest(code, { capability: "ranking" });
  if (scope.universeUnavailable) return [];
  try { return (await getLatestRankBoard(scope.requestedUniverseCode, Math.min(1000, limit), undefined, { timeoutMs: 4000 })).filter(isPublicPageRow); }
  catch { return []; }
});

export const getPublicPageComplex = cache(async (id: string, code: string) => {
  const scope = resolveUniverseRequest(code, { capability: "ranking" });
  if (scope.universeUnavailable || !/^[1-9]\d*$/.test(id)) return null;
  try {
    const [row] = await getLatestRankBoard(scope.requestedUniverseCode, 1, { complexId: id }, { timeoutMs: 4000 });
    return row && isPublicPageRow(row) ? row : null;
  } catch { return null; }
});

export const getPublicPageComparison = cache(async (leftId: string, rightId: string, code: string) => {
  if (leftId === rightId || !/^[1-9]\d*$/.test(leftId) || !/^[1-9]\d*$/.test(rightId)) return null;
  const rows = await Promise.all([getPublicPageComplex(leftId, code), getPublicPageComplex(rightId, code)]);
  if (rows.some(row => !row) || String(rows[0]?.complex_id) !== leftId || String(rows[1]?.complex_id) !== rightId || rows.some(row => row?.universe_code !== code)) return null;
  return getComparisonFacts(rows);
});
