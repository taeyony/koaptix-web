// Presentation of an existing published sample and its exact seven-day comparison.
// Never average percentage changes or substitute missing comparisons with zero.
type Comparison = { history_snapshot_date: string; market_cap_delta_7d: number };
type Member = { complex_id: unknown; market_cap_krw: unknown };

export type PublishedMapSummary = { universeCode: string; snapshotDate: string; complexCount: number; totalMarketCapKrw: number };

export function summarizePublishedMap(payload: {
  ok?: boolean; requestedUniverseCode?: string; renderedUniverseCode?: string;
  aggregationBasis?: string; snapshot_date?: string | null; sourceRowsUsed?: number;
  items?: { name: string; count: number; totalMarketCap: number }[];
}, universeCode: string): PublishedMapSummary | null {
  const rows = payload.items;
  if (payload.ok !== true || payload.aggregationBasis !== "PUBLISHED_TOP1000" ||
    payload.requestedUniverseCode !== universeCode || payload.renderedUniverseCode !== universeCode ||
    !/^\d{4}-\d{2}-\d{2}$/.test(payload.snapshot_date ?? "") || !rows?.length ||
    !Number.isSafeInteger(payload.sourceRowsUsed) || payload.sourceRowsUsed! < 1 || payload.sourceRowsUsed! > 1000 ||
    new Set(rows.map(row => row.name)).size !== rows.length || rows.some(row => !Number.isSafeInteger(row.count) || row.count < 1 || !Number.isSafeInteger(row.totalMarketCap) || row.totalMarketCap <= 0)) return null;
  const complexCount = rows.reduce((sum, row) => sum + row.count, 0);
  const totalMarketCapKrw = rows.reduce((sum, row) => sum + row.totalMarketCap, 0);
  if (complexCount !== payload.sourceRowsUsed || !Number.isSafeInteger(totalMarketCapKrw)) return null;
  return { universeCode, snapshotDate: payload.snapshot_date!, complexCount, totalMarketCapKrw };
}

export function summarizeMapComparison(
  members: Member[],
  comparisons: ReadonlyMap<string, Comparison>,
  snapshotDate: string,
) {
  const previous = new Date(`${snapshotDate}T00:00:00Z`);
  previous.setUTCDate(previous.getUTCDate() - 7);
  const expectedDate = Number.isFinite(previous.getTime()) ? previous.toISOString().slice(0, 10) : "";
  let currentTotal = 0;
  let previousTotal = 0;
  let comparableComplexCount = 0;
  const seen = new Set<string>();
  for (const member of members) {
    const id = String(member.complex_id ?? "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const comparison = comparisons.get(id);
    const current = Number(member.market_cap_krw);
    if (!comparison || comparison.history_snapshot_date !== expectedDate ||
        !Number.isFinite(current) || current <= 0 || !Number.isFinite(comparison.market_cap_delta_7d)) continue;
    const prior = current - comparison.market_cap_delta_7d;
    if (prior <= 0) continue;
    currentTotal += current;
    previousTotal += prior;
    comparableComplexCount += 1;
  }
  return {
    marketCapChangePct7d: previousTotal > 0 ? Number(((currentTotal / previousTotal - 1) * 100).toFixed(2)) : null,
    comparableComplexCount,
    comparisonDate: comparableComplexCount > 0 ? expectedDate : null,
    comparableCurrentMarketCapKrw: currentTotal,
    comparablePreviousMarketCapKrw: previousTotal,
  };
}

type MapGroup = {
  name: string; query: string; totalMarketCap: number; count: number;
  comparableComplexCount?: number; comparisonDate?: string | null;
  comparableCurrentMarketCapKrw?: number; comparablePreviousMarketCapKrw?: number;
  primaryComplexId?: string | null; primaryComplexName?: string | null; primaryRank?: number | null;
};

/** Group published district totals for a national view. Percentages use sums, never averages. */
export function groupMapProvinces<T extends MapGroup>(rows: readonly T[]) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const province = row.name.split(" ")[0];
    if (!/^(서울|경기|부산|대구|인천|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)$/.test(province)) continue;
    groups.set(province, [...(groups.get(province) ?? []), row]);
  }
  return [...groups].map(([province, members]) => {
    const representative = [...members].filter(row => row.primaryRank != null).sort((a, b) => a.primaryRank! - b.primaryRank!)[0];
    const verified = members.filter(row => (row.comparableComplexCount ?? 0) > 0 && row.comparisonDate &&
      (row.comparablePreviousMarketCapKrw ?? 0) > 0 && (row.comparableCurrentMarketCapKrw ?? 0) > 0);
    const sameDate = new Set(verified.map(row => row.comparisonDate)).size === 1;
    const current = sameDate ? verified.reduce((sum, row) => sum + row.comparableCurrentMarketCapKrw!, 0) : 0;
    const previous = sameDate ? verified.reduce((sum, row) => sum + row.comparablePreviousMarketCapKrw!, 0) : 0;
    return {
      name: province, query: province, averageDelta: 0,
      totalMarketCap: members.reduce((sum, row) => sum + row.totalMarketCap, 0),
      count: members.reduce((sum, row) => sum + row.count, 0),
      comparableComplexCount: sameDate ? verified.reduce((sum, row) => sum + row.comparableComplexCount!, 0) : 0,
      comparableCurrentMarketCapKrw: current, comparablePreviousMarketCapKrw: previous,
      marketCapChangePct7d: previous > 0 ? Number(((current / previous - 1) * 100).toFixed(2)) : null,
      comparisonDate: sameDate ? verified[0]?.comparisonDate ?? null : null,
      primaryComplexId: representative?.primaryComplexId ?? null,
      primaryComplexName: representative?.primaryComplexName ?? null,
      primaryRank: representative?.primaryRank ?? null,
      members,
    };
  });
}

/** Place a small set of national labels without hiding another label's click target. */
export function spreadMapLabels(points: readonly { key: string; x: number; y: number; size: number }[], width: number, height: number) {
  const placed: { x: number; y: number; radius: number }[] = [];
  const result = new Map<string, { x: number; y: number }>();
  for (const point of points) {
    const radius = point.size / 2 + 4;
    let offset = { x: 0, y: 0 };
    let found = false;
    for (let distance = 0; distance <= 180 && !found; distance += 16) {
      for (let step = 0; step < (distance ? 16 : 1); step++) {
        const angle = step * Math.PI / 8;
        const dx = Math.round(Math.cos(angle) * distance), dy = Math.round(Math.sin(angle) * distance);
        const x = point.x + dx, y = point.y + dy;
        if (x < radius || x > width - radius || y < radius || y > height - radius) continue;
        if (placed.some(other => Math.hypot(x - other.x, y - other.y) < radius + other.radius)) continue;
        offset = { x: dx, y: dy }; found = true; break;
      }
    }
    placed.push({ x: point.x + offset.x, y: point.y + offset.y, radius });
    result.set(point.key, offset);
  }
  return result;
}

export function mapChangeLabel(change: number | null | undefined) {
  if (typeof change !== "number" || !Number.isFinite(change)) return "시총 비교 자료 없음";
  if (change === 0) return "시총 변동 없음";
  return `시총 ${change > 0 ? "▲ +" : "▼ −"}${Math.abs(change).toFixed(2)}%`;
}

// A bare name such as '중구' must never resolve to a different province.
export function getMapGeocodeQueries(group: { name: string; query: string }) {
  const qualified = /^(서울(?:특별시)?|부산(?:광역시)?|대구(?:광역시)?|인천(?:광역시)?|광주(?:광역시)?|대전(?:광역시)?|울산(?:광역시)?|세종(?:특별자치시)?|경기(?:도)?|강원(?:도|특별자치도)?|충북|충청북도|충남|충청남도|전북(?:특별자치도)?|전라북도|전남|전라남도|경북|경상북도|경남|경상남도|제주(?:도|특별자치도)?)\s/;
  return Array.from(new Set([group.query, group.name].filter((value) => qualified.test(value))));
}
