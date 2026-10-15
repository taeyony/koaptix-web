// Presentation of an existing published sample and its exact seven-day comparison.
// Never average percentage changes or substitute missing comparisons with zero.
type Comparison = { history_snapshot_date: string; market_cap_delta_7d: number };
type Member = { complex_id: unknown; market_cap_krw: unknown };

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
  };
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
