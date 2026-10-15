import { cache } from "react";
import { getLatestRankBoard } from "./queries";
import { getUniverseLabel, resolveUniverseRequest } from "./universes";
import { resolveSidoFromUniverseCode } from "./districtIdentity";
import type { DbLatestRankBoardWeeklyRow } from "./types";

export const PUBLIC_SITE_ORIGIN = "https://www.koaptix.com";

export function publicRegionLabel(code: string) {
  const label = getUniverseLabel(code);
  const sido = resolveSidoFromUniverseCode(code);
  return code.startsWith("SGG_") && sido
    ? `${getUniverseLabel(sido).replace(/\s*전체$/, "")} ${label}` : label;
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
  try { return (await getLatestRankBoard(scope.requestedUniverseCode, Math.min(1000, limit))).filter(isPublicPageRow); }
  catch { return []; }
});

export const getPublicPageComplex = cache(async (id: string, code: string) => {
  const scope = resolveUniverseRequest(code, { capability: "ranking" });
  if (scope.universeUnavailable || !/^[1-9]\d*$/.test(id)) return null;
  try {
    const [row] = await getLatestRankBoard(scope.requestedUniverseCode, 1, { complexId: id });
    return row && isPublicPageRow(row) ? row : null;
  } catch { return null; }
});
