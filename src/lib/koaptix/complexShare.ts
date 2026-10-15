/** Stable detail entry point; transient search/filter parameters are not shared. */
export function buildComplexSharePath(complexId: string, universeCode?: string | null) {
  if (!/^[1-9]\d*$/.test(complexId)) return null;
  const path = `/complex/${encodeURIComponent(complexId)}`;
  if (!universeCode || universeCode === "KOREA_ALL") return path;
  return `${path}?${new URLSearchParams({ universe: universeCode })}`;
}
