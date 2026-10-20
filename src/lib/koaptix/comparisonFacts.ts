import { requireUniformUniverseServicePublication, type KoaptixPublicationSelectionIdentity } from "./currentness";
import { buildComparisonSharePath, isComparisonDate, parseComparisonIds } from "./complexShare";
import { resolveSidoFromUniverseCode } from "./districtIdentity";
import { publicComplexName } from "./rankingPresentation";
import { getUniverseLabel, resolveUniverseRequest } from "./universes";
import { formatKrwCompact } from "../formatters";

type FactItem = { complexId: string; name: string; rank: number; marketCapKrw: number };
export type ComparisonFacts = {
  left: FactItem;
  right: FactItem;
  publication: KoaptixPublicationSelectionIdentity;
  scopeLabel: string;
  differenceKrw: number;
  differenceLabel: string;
  title: string;
  summary: string;
};

function alias(row: Record<string, unknown>, keys: string[], stringify = false): unknown {
  const values = keys.map(key => row[key]).filter(value => value !== undefined);
  const normalized = stringify ? values.map(String) : values;
  if (normalized.some(value => value !== normalized[0])) throw new Error("Conflicting comparison aliases");
  return normalized[0];
}

function comparisonRow(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Missing comparison row");
  const row = value as Record<string, unknown>;
  const complexId = alias(row, ["complexId", "complex_id"], true);
  const name = alias(row, ["name", "apt_name_ko"]);
  const rank = Number(alias(row, ["rank", "rank_all"]));
  const cap = Number(alias(row, ["marketCapKrw", "market_cap_krw"]));
  const code = alias(row, ["universeCode", "universe_code"]);
  if (typeof complexId !== "string" || !/^[1-9]\d*$/.test(complexId) || typeof name !== "string" || !name.trim() ||
      !Number.isSafeInteger(rank) || rank < 1 || rank > 1000 || !Number.isSafeInteger(cap) || cap <= 0 || typeof code !== "string") throw new Error("Invalid comparison value");
  const scope = resolveUniverseRequest(code, { capability: "ranking" });
  if (scope.universeUnavailable || scope.requestedUniverseCode !== code) throw new Error("Unavailable comparison scope");
  return { ...row, complexId, name: publicComplexName(name), rank, marketCapKrw: cap,
    universe_code: code, snapshot_date: alias(row, ["snapshotDate", "snapshot_date"]) };
}

/** UI handoff only; the destination must recheck this exact public selection. */
export function getComparisonStartPath(value: unknown): string | null {
  try {
    const row = comparisonRow(value);
    const publication = requireUniformUniverseServicePublication([row]);
    return `/ranking?${new URLSearchParams({
      universe: publication.universe_code,
      compareWith: row.complexId,
      comparisonDate: publication.snapshot_date,
      comparisonEvent: publication.publication_event_id,
    })}`;
  } catch { return null; }
}

export function publicRankScopeLabel(code?: string | null): string {
  const scope = resolveUniverseRequest(code, { capability: "ranking" });
  if (!code || !scope.registryItem || scope.requestedUniverseCode !== code) return "공개 순위 · 범위 확인 중";
  if (code === "KOREA_ALL") return "전국 공개 순위";
  const province = resolveSidoFromUniverseCode(code);
  const label = getUniverseLabel(code).replace(/\s*전체$/, "");
  return `${code.startsWith("SGG_") && province ? `${getUniverseLabel(province).replace(/\s*전체$/, "")} ` : ""}${label} 공개 순위`;
}

/** Only describe two actual rows of the same public publication. */
export function getComparisonFacts(values: readonly unknown[]): ComparisonFacts | null {
  if (values.length !== 2) return null;
  try {
    const rows = values.map(comparisonRow);
    if (rows[0].complexId === rows[1].complexId || rows[0].rank === rows[1].rank) return null;
    const publication = requireUniformUniverseServicePublication(rows);
    const [left, right] = rows;
    const scope = getUniverseLabel(publication.universe_code);
    const province = resolveSidoFromUniverseCode(publication.universe_code);
    const scopeLabel = publication.universe_code.startsWith("SGG_") && province ? `${getUniverseLabel(province).replace(/\s*전체$/, "")} ${scope}` : scope;
    const differenceKrw = Math.abs(left.marketCapKrw - right.marketCapKrw);
    const larger = left.marketCapKrw > right.marketCapKrw ? left : right;
    const differenceLabel = differenceKrw === 0 ? "두 단지의 추정 시가총액이 같아요." : `${larger.name}의 추정 시총이 ${formatKrwCompact(differenceKrw)} 더 커요.`;
    const title = `${left.name} vs ${right.name}`;
    const summary = [title, `${scopeLabel} · ${publication.snapshot_date} 기준`,
      `${left.name}: 공개 ${left.rank}위 · 추정 시총 ${formatKrwCompact(left.marketCapKrw)}`,
      `${right.name}: 공개 ${right.rank}위 · 추정 시총 ${formatKrwCompact(right.marketCapKrw)}`,
      differenceLabel, "단지 전체의 추정 가치예요. 집 한 채의 가격이나 투자 추천이 아닙니다."].join("\n");
    return { left, right, publication, scopeLabel, differenceKrw, differenceLabel, title, summary };
  } catch { return null; }
}

/** A stale selection may be reopened, but its destination rechecks public rows. */
export function getMatchupSelectionPath(items: readonly { complexId: string; universeCode?: string; snapshotDate?: string }[], universeCode: string): string | null {
  if (items.length !== 2 || parseComparisonIds(items.map(item => item.complexId).join(",")).length !== 2 ||
      items.some(item => item.universeCode !== universeCode) || !isComparisonDate(items[0].snapshotDate) || items[0].snapshotDate !== items[1].snapshotDate ||
      resolveUniverseRequest(universeCode, { capability: "ranking" }).universeUnavailable) return null;
  return buildComparisonSharePath(items.map(item => item.complexId), universeCode, items[0].snapshotDate);
}
