import {
  requireUniformUniverseServicePublication,
  type KoaptixPublicationSelectionIdentity,
} from "./currentness";
import { parseDistrictIdentity, parsePublicAddress, resolveSidoFromUniverseCode } from "./districtIdentity";
import { getRankingUniverseRegistry, resolveUniverseRequest } from "./universes";
import type { PublishedRankingItem, RankingItem } from "./types";

export type MyHomeBoard = {
  items: PublishedRankingItem[];
  publication: KoaptixPublicationSelectionIdentity;
};

export type MyHomeNeighbors = {
  selected: PublishedRankingItem | null;
  above: PublishedRankingItem | null;
  below: PublishedRankingItem | null;
};

type UnknownRow = Record<string, unknown>;

function record(value: unknown): UnknownRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid public ranking object");
  return value as UnknownRow;
}

function matchingAliases(values: unknown[], label: string): unknown {
  const present = values.filter(value => value !== undefined);
  if (present.some(value => value !== present[0])) throw new Error(`Conflicting ${label}`);
  return present[0];
}

function nullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function normalizedItems(values: readonly unknown[]): (RankingItem & UnknownRow)[] {
  if (values.length > 1000) throw new Error("Public ranking exceeds TOP1000");
  const ids = new Set<string>();
  const ranks = new Set<number>();
  return values.map(value => {
    const row = record(value);
    const rank = matchingAliases([row.rank, row.rank_all], "rank");
    const cap = matchingAliases([row.marketCapKrw, row.market_cap_krw], "market cap");
    const universeCode = matchingAliases([row.universe_code, row.universeCode], "item universe");
    const snapshotDate = matchingAliases([row.snapshot_date, row.snapshotDate], "item snapshot date");
    if (typeof row.complexId !== "string" || !/^[1-9]\d*$/.test(row.complexId) ||
        typeof rank !== "number" || !Number.isInteger(rank) || rank < 1 || rank > 1000 ||
        typeof cap !== "number" || !Number.isSafeInteger(cap) || cap <= 0 ||
        typeof row.name !== "string" || !row.name.trim() ||
        typeof universeCode !== "string" || typeof snapshotDate !== "string" ||
        typeof row.sigunguName !== "string" || typeof row.legalDongName !== "string" || typeof row.locationLabel !== "string" ||
        !nullableNumber(row.marketCapTrillionKrw) || !nullableNumber(row.rankDelta7d) ||
        !nullableNumber(row.recoveryRate52w)) throw new Error("Invalid public ranking item");
    if (ids.has(row.complexId) || ranks.has(rank)) throw new Error("Duplicate public ranking ID or rank");
    ids.add(row.complexId);
    ranks.add(rank);
    return {
      ...row,
      complexId: row.complexId,
      name: row.name,
      rank,
      rank_all: rank,
      marketCapKrw: cap,
      marketCapTrillionKrw: row.marketCapTrillionKrw,
      sigunguName: row.sigunguName,
      legalDongName: row.legalDongName,
      locationLabel: row.locationLabel,
      rankDelta7d: row.rankDelta7d,
      recoveryRate52w: row.recoveryRate52w,
      universe_code: universeCode,
      snapshot_date: snapshotDate,
    };
  });
}

/** Reuse the public endpoint's identity; no dates, scopes or ranks are inferred. */
export function readMyHomeBoard(payload: unknown, expectedUniverse: string): MyHomeBoard {
  const envelope = record(payload);
  const scope = resolveUniverseRequest(expectedUniverse, { capability: "ranking" });
  if (scope.universeUnavailable || scope.requestedUniverseCode !== expectedUniverse ||
      envelope.ok !== true || envelope.requestedUniverseCode !== expectedUniverse ||
      envelope.renderedUniverseCode !== expectedUniverse || !Array.isArray(envelope.items)) {
    throw new Error("Public ranking scope unavailable or mismatched");
  }
  const items = normalizedItems(envelope.items);
  if (!items.length) throw new Error("Public ranking returned no identity-bearing items");
  const publication = requireUniformUniverseServicePublication([
    ...items,
    {
      ...envelope,
      universe_code: matchingAliases([
        envelope.universe_code, envelope.universeCode, envelope.requestedUniverseCode,
      ], "board universe"),
      snapshot_date: matchingAliases([envelope.snapshot_date, envelope.latestBoardDate], "board snapshot date"),
    },
  ], expectedUniverse);
  return {
    items: items.map(item => ({
      ...item,
      ...publication,
      universeCode: publication.universe_code,
      snapshotDate: publication.snapshot_date,
    })),
    publication,
  };
}

/** Missing ranks remain missing, including gaps and a truncated board edge. */
export function findMyHomeNeighbors(board: MyHomeBoard, complexId: string): MyHomeNeighbors {
  const rows = normalizedItems(board.items);
  requireUniformUniverseServicePublication([board.publication, ...rows], board.publication.universe_code);
  const selected = board.items.find(item => item.complexId === complexId) ?? null;
  return {
    selected,
    above: selected ? board.items.find(item => item.rank === selected.rank - 1) ?? null : null,
    below: selected ? board.items.find(item => item.rank === selected.rank + 1) ?? null : null,
  };
}

/** A fallback macro is its full published board, never a re-ranked district filter. */
export function resolveMyHomeRegion(item: RankingItem): { code: string; label: string } | null {
  const city = (item.cityName ?? "").normalize("NFC").trim();
  const rawDistrict = (item.sigunguName || item.sigungu_name || "").normalize("NFC").trim();
  if (item.sigunguName && item.sigungu_name && item.sigunguName.trim() !== item.sigungu_name.trim()) return null;
  if (item.universeCode && item.universe_code && item.universeCode !== item.universe_code) return null;
  const district = parseDistrictIdentity(rawDistrict);
  const registry = getRankingUniverseRegistry();
  const parsedCity = parsePublicAddress(city);
  // cityName is province evidence only when it is a recognized single label.
  if (city && (!parsedCity.cityName || /\s/.test(city))) return null;
  const cityMacro = city ? registry.find(entry => entry.scope === "MACRO" &&
    parsePublicAddress(entry.label).cityName === parsedCity.cityName) : undefined;
  const sido = cityMacro?.code ?? district?.sido;
  if (!sido || (district?.sido && district.sido !== sido)) return null;
  const boardSido = resolveSidoFromUniverseCode(item.universeCode ?? item.universe_code);
  if (boardSido && boardSido !== sido) return null;
  const macro = registry.find(entry => entry.scope === "MACRO" && entry.code === sido);
  if (!macro) return null;
  const candidates = district ? registry.filter(entry => entry.scope === "SIGUNGU" &&
    parseDistrictIdentity(entry.label)?.sigungu === district.sigungu &&
    resolveSidoFromUniverseCode(entry.code) === sido) : [];
  const selected = candidates.length === 1 ? candidates[0] : macro;
  return { code: selected.code, label: selected.label };
}
