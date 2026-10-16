/** Compare existing calculation evidence; never calculate or publish a new cap. */
export type CapSnapshotEvidence = {
  snapshot_date: string; complex_id: number | string; market_cap_krw: number | string;
  total_household_count: number; priced_household_count: number;
  total_cluster_count: number; priced_cluster_count: number;
  calculation_version: string; price_method_summary: string | null;
};
export type CapComponentEvidence = {
  snapshot_date: string; complex_id: number | string; area_cluster_id: number | string;
  household_count: number; representative_price_krw: number | string | null;
  cluster_market_cap_krw: number | string | null; component_status: string;
  calculation_version: string;
};

export function hasComparableCapEvidence(
  current: CapSnapshotEvidence | undefined, previous: CapSnapshotEvidence | undefined,
  components: readonly CapComponentEvidence[], currentCap: number, previousCap: number,
): boolean {
  if (!current || !previous || current.complex_id == null || String(current.complex_id) !== String(previous.complex_id) ||
    !current.calculation_version || current.calculation_version !== previous.calculation_version ||
    !current.price_method_summary?.includes("last3_avg_12m") || current.price_method_summary !== previous.price_method_summary ||
    Number(current.market_cap_krw) !== currentCap || Number(previous.market_cap_krw) !== previousCap ||
    ![currentCap, previousCap].every(value => Number.isSafeInteger(value) && value > 0) ||
    new Date(current.snapshot_date + "T00:00:00Z").getTime() - new Date(previous.snapshot_date + "T00:00:00Z").getTime() !== 7 * 86_400_000) return false;

  const read = (snapshot: CapSnapshotEvidence) => {
    const rows = components.filter(row => String(row.complex_id) === String(snapshot.complex_id) && row.snapshot_date === snapshot.snapshot_date);
    if (!Number.isSafeInteger(snapshot.total_cluster_count) || snapshot.total_cluster_count < 1 || rows.length !== snapshot.total_cluster_count) return null;
    const weights = new Map<string, string>();
    let totalHouseholds = 0, pricedHouseholds = 0, pricedClusters = 0, sum = 0n;
    for (const row of rows) {
      const id = String(row.area_cluster_id), hh = Number(row.household_count);
      if (!/^[1-9]\d*$/.test(id) || weights.has(id) || !Number.isSafeInteger(hh) || hh < 0 || row.calculation_version !== snapshot.calculation_version) return null;
      if (row.component_status === "priced") {
        const price = Number(row.representative_price_krw), cap = Number(row.cluster_market_cap_krw);
        if (!Number.isSafeInteger(price) || price <= 0 || !Number.isSafeInteger(cap) || BigInt(price) * BigInt(hh) !== BigInt(cap)) return null;
        sum += BigInt(cap); pricedHouseholds += hh; pricedClusters += 1;
      } else if (row.component_status !== "unpriced" || row.representative_price_krw !== null || row.cluster_market_cap_krw !== null) return null;
      totalHouseholds += hh;
      weights.set(id, `${hh}:${row.component_status}`);
    }
    return totalHouseholds === snapshot.total_household_count && pricedHouseholds === snapshot.priced_household_count &&
      pricedClusters === snapshot.priced_cluster_count && sum === BigInt(snapshot.market_cap_krw) ? weights : null;
  };
  const now = read(current), before = read(previous);
  return Boolean(now && before && now.size === before.size && [...now].every(([id, weight]) => before.get(id) === weight));
}
