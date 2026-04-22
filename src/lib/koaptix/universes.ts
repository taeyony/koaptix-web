/**
 * KOAPTIX public universe registry.
 * 노출 여부는 registry가 쥐지만, 실제 visible 운영은 DB readiness와 정렬해서 관리한다.
 */

export const DEFAULT_UNIVERSE_CODE = "KOREA_ALL";

export type MacroUniverseCode =
  | "KOREA_ALL"
  | "SEOUL_ALL"
  | "BUSAN_ALL"
  | "DAEGU_ALL"
  | "INCHEON_ALL"
  | "GWANGJU_ALL"
  | "DAEJEON_ALL"
  | "ULSAN_ALL"
  | "SEJONG_ALL"
  | "GYEONGGI_ALL"
  | "GANGWON_ALL"
  | "CHUNGBUK_ALL"
  | "CHUNGNAM_ALL"
  | "JEONBUK_ALL"
  | "JEONNAM_ALL"
  | "GYEONGBUK_ALL"
  | "GYEONGNAM_ALL"
  | "JEJU_ALL";

export type SggUniverseCode = `SGG_${string}`;

export type KnownUniverseCode = MacroUniverseCode | SggUniverseCode;

export type PrimaryServiceUniverseCode = KnownUniverseCode;

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
    code: "DAEGU_ALL",
    label: "대구 전체",
    scope: "MACRO",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 4,
  },
  {
    code: "INCHEON_ALL",
    label: "인천 전체",
    scope: "MACRO",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 5,
  },
  {
    code: "GWANGJU_ALL",
    label: "광주 전체",
    scope: "MACRO",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 6,
  },
  {
    code: "DAEJEON_ALL",
    label: "대전 전체",
    scope: "MACRO",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 7,
  },
  {
    code: "ULSAN_ALL",
    label: "울산 전체",
    scope: "MACRO",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 8,
  },
  {
    code: "SEJONG_ALL",
    label: "세종 전체",
    scope: "MACRO",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 9,
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
    order: 10,
  },
   {
    code: "GANGWON_ALL",
    label: "강원 전체",
    scope: "MACRO",
    enabled: false,
    homeEnabled: false,
    searchEnabled: false,
    rankingEnabled: false,
    mapEnabled: false,
    order: 11,
  },
  {
    code: "CHUNGBUK_ALL",
    label: "충북 전체",
    scope: "MACRO",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 12,
  },
  {
    code: "CHUNGNAM_ALL",
    label: "충남 전체",
    scope: "MACRO",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 13,
  },
  {
    code: "JEONBUK_ALL",
    label: "전북 전체",
    scope: "MACRO",
    enabled: false,
    homeEnabled: false,
    searchEnabled: false,
    rankingEnabled: false,
    mapEnabled: false,
    order: 14,
  },
  {
    code: "JEONNAM_ALL",
    label: "전남 전체",
    scope: "MACRO",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 15,
  },
  {
    code: "GYEONGBUK_ALL",
    label: "경북 전체",
    scope: "MACRO",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 16,
  },
  {
    code: "GYEONGNAM_ALL",
    label: "경남 전체",
    scope: "MACRO",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 17,
  },
  {
    code: "JEJU_ALL",
    label: "제주 전체",
    scope: "MACRO",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 18,
  },
];

/**
 * SGG는 additive only 2차 확장 대상.
 * 현재는 실제 DB readiness가 확인된 일부만 staged exposure 한다.
 */
const SGG_UNIVERSE_REGISTRY: UniverseRegistryItem[] = [
  {
    code: "SGG_11710",
    label: "송파구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 101,
  },
  {
    code: "SGG_11650",
    label: "서초구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 102,
  },
  {
    code: "SGG_11680",
    label: "강남구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 103,
  },
  {
    code: "SGG_41135",
    label: "분당구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 104,
  },
  {
    code: "SGG_11440",
    label: "마포구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 105,
  },
  {
    code: "SGG_11560",
    label: "영등포구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 106,
  },
  {
    code: "SGG_11590",
    label: "동작구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 107,
  },
  {
    code: "SGG_11500",
    label: "강서구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 108,
  },
  {
    code: "SGG_11290",
    label: "성북구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 109,
  },
  {
    code: "SGG_11230",
    label: "동대문구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 110,
  },

  // Batch 2 — Seoul core SGG staged exposure
  {
    code: "SGG_11740",
    label: "강동구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 111,
  },
  {
    code: "SGG_11470",
    label: "양천구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 112,
  },
  {
    code: "SGG_11170",
    label: "용산구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 113,
  },
  {
    code: "SGG_11410",
    label: "서대문구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 114,
  },
  {
    code: "SGG_11200",
    label: "성동구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 115,
  },

  // Batch 1 — 2026-04-19 staged exposure from confirmed SGG candidates
  {
    code: "SGG_11110",
    label: "종로구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 116,
  },
  {
    code: "SGG_11140",
    label: "중구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 117,
  },
  {
    code: "SGG_11215",
    label: "광진구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 118,
  },

  // Batch 2 — 2026-04-19 staged exposure from confirmed SGG candidates
  {
    code: "SGG_11260",
    label: "중랑구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 119,
  },
  {
    code: "SGG_11305",
    label: "강북구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 120,
  },
  {
    code: "SGG_11320",
    label: "도봉구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 121,
  },

  // Batch 3 - 2026-04-20 staged exposure from confirmed SGG candidates
  {
    code: "SGG_11350",
    label: "노원구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 122,
  },
  {
    code: "SGG_11380",
    label: "은평구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 123,
  },
  {
    code: "SGG_11530",
    label: "구로구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 124,
  },

  // Batch 4 - 2026-04-21 staged exposure from confirmed SGG candidates
  {
    code: "SGG_11545",
    label: "금천구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 125,
  },
  {
    code: "SGG_11620",
    label: "관악구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 126,
  },

  // Batch 5 - 2026-04-21 staged exposure from confirmed SGG candidates
  {
    code: "SGG_41360",
    label: "남양주시",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 127,
  },
  {
    code: "SGG_48250",
    label: "김해시",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 128,
  },

  // Batch 6 - 2026-04-22 staged exposure from confirmed SGG candidates
  {
    code: "SGG_41465",
    label: "수지구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 129,
  },
  {
    code: "SGG_41220",
    label: "평택시",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 130,
  },

  // Batch 7 - 2026-04-22 staged exposure from confirmed SGG candidates
  {
    code: "SGG_41463",
    label: "기흥구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 131,
  },
  {
    code: "SGG_29170",
    label: "북구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 132,
  },

  // Batch 8 - 2026-04-22 staged exposure from confirmed SGG candidates
  {
    code: "SGG_28260",
    label: "서구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 133,
  },
  {
    code: "SGG_27290",
    label: "달서구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 134,
  },

  // Batch 9 - 2026-04-22 staged exposure from confirmed SGG candidates
  {
    code: "SGG_31140",
    label: "남구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 135,
  },
  {
    code: "SGG_27260",
    label: "수성구",
    scope: "SIGUNGU",
    enabled: true,
    homeEnabled: true,
    searchEnabled: true,
    rankingEnabled: true,
    mapEnabled: true,
    order: 136,
  },
];

/**
 * KOAPTIX service-exposed universe registry.
 *
 * 원칙:
 * - canonical contract는 universe_code 하나로 통일한다.
 * - 사용자 표시는 한글 Alias로 분리한다.
 * - 실제 서비스에 노출할 universe는 이 registry에서만 관리한다.
 * - DB에 snapshot/board가 존재해도 registry enabled가 아니면 화면에 노출하지 않는다.
 */
export const PUBLIC_UNIVERSE_REGISTRY: UniverseRegistryItem[] = [
  ...MACRO_UNIVERSE_REGISTRY,
  ...SGG_UNIVERSE_REGISTRY,
].sort((a, b) => a.order - b.order);

const ENABLED_UNIVERSE_SET = new Set(
  PUBLIC_UNIVERSE_REGISTRY.filter((u) => u.enabled).map((u) => u.code),
);

const PRIMARY_SERVICE_UNIVERSE_SET = new Set<PrimaryServiceUniverseCode>(
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
  if (code === "DAEGU" || code === "DAEGU_ALL") return "DAEGU_ALL";
  if (code === "INCHEON" || code === "INCHEON_ALL") return "INCHEON_ALL";
  if (code === "GWANGJU" || code === "GWANGJU_ALL") return "GWANGJU_ALL";
  if (code === "DAEJEON" || code === "DAEJEON_ALL") return "DAEJEON_ALL";
  if (code === "ULSAN" || code === "ULSAN_ALL") return "ULSAN_ALL";
  if (code === "SEJONG" || code === "SEJONG_ALL") return "SEJONG_ALL";
  if (code === "GYEONGGI" || code === "GYEONGGI_ALL") return "GYEONGGI_ALL";
  if (code === "GANGWON" || code === "GANGWON_ALL") return "GANGWON_ALL";
  if (code === "CHUNGBUK" || code === "CHUNGBUK_ALL") return "CHUNGBUK_ALL";
  if (code === "CHUNGNAM" || code === "CHUNGNAM_ALL") return "CHUNGNAM_ALL";
  if (code === "JEONBUK" || code === "JEONBUK_ALL") return "JEONBUK_ALL";
  if (code === "JEONNAM" || code === "JEONNAM_ALL") return "JEONNAM_ALL";
  if (code === "GYEONGBUK" || code === "GYEONGBUK_ALL") return "GYEONGBUK_ALL";
  if (code === "GYEONGNAM" || code === "GYEONGNAM_ALL") return "GYEONGNAM_ALL";
  if (code === "JEJU" || code === "JEJU_ALL") return "JEJU_ALL";

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

export function resolveServiceUniverseCode(
  input?: string | null,
): PrimaryServiceUniverseCode {
  const normalized = normalizeUniverseCode(input);

  if (PRIMARY_SERVICE_UNIVERSE_SET.has(normalized)) {
    return normalized;
  }

  return DEFAULT_UNIVERSE_CODE;
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
