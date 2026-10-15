/** Stable detail entry point; transient search/filter parameters are not shared. */
export function buildComplexSharePath(complexId: string, universeCode?: string | null) {
  if (!/^[1-9]\d*$/.test(complexId)) return null;
  const path = `/complex/${encodeURIComponent(complexId)}`;
  if (!universeCode || universeCode === "KOREA_ALL") return path;
  return `${path}?${new URLSearchParams({ universe: universeCode })}`;
}

export function parseComparisonIds(value: string | null | undefined): string[] {
  if (!value || value.length > 80) return [];
  const ids = value.split(",");
  return ids.length === 2 && ids[0] !== ids[1] && ids.every(id => /^[1-9]\d*$/.test(id)) ? ids : [];
}

export function isComparisonDate(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(new Date(value + "T00:00:00Z").getTime()) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value);
}

/** Caller supplies a registry-validated scope; the destination rechecks it. */
export function buildComparisonSharePath(ids: readonly string[], universeCode: string, snapshotDate: string) {
  if (ids.length !== 2 || parseComparisonIds(ids.join(",")).length !== 2 || !/^[A-Z][A-Z0-9_]*$/.test(universeCode) || !isComparisonDate(snapshotDate)) return null;
  return `/ranking?${new URLSearchParams({ universe: universeCode, compare: ids.join(","), comparisonDate: snapshotDate })}`;
}
