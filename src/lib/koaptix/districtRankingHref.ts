import { parseDistrictIdentity, resolveSidoFromUniverseCode } from "./districtIdentity";
import { getRankingUniverseRegistry } from "./universes";

// Reuse the public regional boards. National rows without province evidence
// cannot safely be filtered by a bare district name (for example, 중구).
export function getDistrictRankingHref(name: string, universeCode: string): string | null {
  const district = parseDistrictIdentity(name);
  if (!district) return null;
  const scopeSido = resolveSidoFromUniverseCode(universeCode);
  if (scopeSido && district.sido && scopeSido !== district.sido) return null;
  const sido = district.sido ?? scopeSido;
  if (!sido) return null;
  const registry = getRankingUniverseRegistry();
  const candidates = registry.filter(item => item.scope === "SIGUNGU" &&
    parseDistrictIdentity(item.label)?.sigungu === district.sigungu &&
    resolveSidoFromUniverseCode(item.code) === sido);
  if (candidates.length === 1) {
    return `/ranking?${new URLSearchParams({ universe: candidates[0].code })}`;
  }
  const macro = registry.find(item => item.code === sido && item.scope === "MACRO");
  if (!macro) return null;
  return `/ranking?${new URLSearchParams({ universe: macro.code, district: district.sigungu })}`;
}
