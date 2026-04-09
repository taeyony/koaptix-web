export const DEFAULT_UNIVERSE_CODE = "KOREA_ALL";

export type MacroUniverseCode =
  | "KOREA_ALL"
  | "SEOUL_ALL"
  | "BUSAN_ALL"
  | "GYEONGGI_ALL";

export type SggUniverseCode = `SGG_${string}`;

export type KnownUniverseCode = MacroUniverseCode | SggUniverseCode;

/**
 * 기존 UniverseSelector / 기타 컴포넌트 하위호환용 alias
 */
export type UniverseCode = KnownUniverseCode;

export type UniverseOption = {
  code: UniverseCode;
  label: string;
};

export type UniverseScope = "MACRO" | "SIGUNGU" | "CUSTOM";

export type UniverseRegistryItem = {
  code: KnownUniverseCode;
  label: string;
  scope: UniverseScope;

  enabled: boolean;

  homeEnabled: boolean;
  searchEnabled: boolean;
  rankingEnabled: boolean;
  mapEnabled: boolean;

  order: number;
};

const MACRO_UNIVERSE_REGISTRY: UniverseRegistryItem[] = [
  {
    code: "KOREA_ALL",
    label: "대한민국 전체",
    scope: "MACRO",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 1,
  },
  {
    code: "SEOUL_ALL",
    label: "서울 전체",
    scope: "MACRO",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 2,
  },
  {
    code: "BUSAN_ALL",
    label: "부산 전체",
    scope: "MACRO",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 3,
  },
  {
    code: "GYEONGGI_ALL",
    label: "경기 전체",
    scope: "MACRO",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 4,
  },
];

/**
 * SGG는 2차 확장용.
 * 지금은 광역 4종만 우선 노출.
 */
const SGG_UNIVERSE_REGISTRY: UniverseRegistryItem[] = [];
/**
 * KOAPTIX service-exposed universe registry.
 *
 * 원칙:
 * - canonical contract는 universe_code 하나로 통일한다.
 * - 사용자 표시는 한글 Alias로 분리한다.
 * - 실제 서비스에 노출할 universe는 이 registry에서만 관리한다.
 * - DB에 snapshot/board가 존재해도 registry enabled가 아니면 화면에 노출하지 않는다.
 *
 * 현재 1차 노출 대상:
 * - KOREA_ALL
 * - SEOUL_ALL
 * - BUSAN_ALL
 * - GYEONGGI_ALL
 *
 * SGG는 2차 additive 확장 대상으로 본다.
 *
 * 하위호환:
 * - UniverseCode / UniverseOption / { code, label } shape는
 *   UniverseSelector 등 기존 소비자 호환을 위해 유지한다.
 */
export const PUBLIC_UNIVERSE_REGISTRY: UniverseRegistryItem[] = [
  ...MACRO_UNIVERSE_REGISTRY,
  ...SGG_UNIVERSE_REGISTRY,
].sort((a, b) => a.order - b.order);

const ENABLED_UNIVERSE_SET = new Set(
  PUBLIC_UNIVERSE_REGISTRY.filter((u) => u.enabled).map((u) => u.code),
);

const UNIVERSE_REGISTRY_MAP = new Map(
  PUBLIC_UNIVERSE_REGISTRY.map((u) => [u.code, u]),
);

const UNIVERSE_LABEL_MAP = new Map(
  PUBLIC_UNIVERSE_REGISTRY.map((u) => [u.code, u.label]),
);

function toNormalizedUpperCode(input: string) {
  return input.trim().toUpperCase();
}

function isSggUniverseCode(code: string): code is SggUniverseCode {
  return /^SGG_\d{5}$/.test(code);
}

export function normalizeUniverseCode(
  input?: string | null,
): KnownUniverseCode {
  if (!input) return DEFAULT_UNIVERSE_CODE;

  const code = toNormalizedUpperCode(input);

  if (code === "KOREA" || code === "KOREA_ALL") return "KOREA_ALL";
  if (code === "SEOUL" || code === "SEOUL_ALL") return "SEOUL_ALL";
  if (code === "BUSAN" || code === "BUSAN_ALL") return "BUSAN_ALL";
  if (code === "GYEONGGI" || code === "GYEONGGI_ALL") return "GYEONGGI_ALL";

  if (isSggUniverseCode(code)) return code;

  return DEFAULT_UNIVERSE_CODE;
}

export function getUniverseLabel(code?: string | null) {
  const normalized = normalizeUniverseCode(code);
  return UNIVERSE_LABEL_MAP.get(normalized) ?? normalized;
}

export function getUniverseScope(code?: string | null): UniverseScope {
  const normalized = normalizeUniverseCode(code);
  return UNIVERSE_REGISTRY_MAP.get(normalized)?.scope ?? "CUSTOM";
}

export function isEnabledUniverseCode(code?: string | null) {
  const normalized = normalizeUniverseCode(code);
  return ENABLED_UNIVERSE_SET.has(normalized);
}

export function getEnabledUniverseRegistry() {
  return PUBLIC_UNIVERSE_REGISTRY.filter((u) => u.enabled);
}

export function getHomeUniverseRegistry() {
  return PUBLIC_UNIVERSE_REGISTRY.filter((u) => u.enabled && u.homeEnabled);
}

export function getSearchUniverseRegistry() {
  return PUBLIC_UNIVERSE_REGISTRY.filter((u) => u.enabled && u.searchEnabled);
}

export function getRankingUniverseRegistry() {
  return PUBLIC_UNIVERSE_REGISTRY.filter((u) => u.enabled && u.rankingEnabled);
}

export function getMapUniverseRegistry() {
  return PUBLIC_UNIVERSE_REGISTRY.filter((u) => u.enabled && u.mapEnabled);
}

export const PUBLIC_UNIVERSE_OPTIONS: UniverseOption[] =
  getHomeUniverseRegistry().map((u) => ({
    code: u.code,
    label: u.label,
  }));

export const HOME_UNIVERSE_OPTIONS: UniverseOption[] =
  getHomeUniverseRegistry().map((u) => ({
    code: u.code,
    label: u.label,
  }));

export const SEARCH_UNIVERSE_OPTIONS: UniverseOption[] =
  getSearchUniverseRegistry().map((u) => ({
    code: u.code,
    label: u.label,
  }));

export const RANKING_UNIVERSE_OPTIONS: UniverseOption[] =
  getRankingUniverseRegistry().map((u) => ({
    code: u.code,
    label: u.label,
  }));

export const MAP_UNIVERSE_OPTIONS: UniverseOption[] =
  getMapUniverseRegistry().map((u) => ({
    code: u.code,
    label: u.label,
  }));

export function buildUniverseOption(code: string, label?: string): UniverseOption {
  const normalized = normalizeUniverseCode(code);
  return {
    code: normalized,
    label: label ?? getUniverseLabel(normalized),
  };
}