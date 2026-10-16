import type { RankingItem } from "./types";

type CanonicalSidoIdentity =
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

type DistrictIdentity = {
  sido: CanonicalSidoIdentity | null;
  sigungu: string;
};

const SIDO_ALIAS_ENTRIES: ReadonlyArray<
  readonly [string, CanonicalSidoIdentity]
> = [
  ["세종특별자치시", "SEJONG_ALL"],
  ["강원특별자치도", "GANGWON_ALL"],
  ["전북특별자치도", "JEONBUK_ALL"],
  ["제주특별자치도", "JEJU_ALL"],
  ["서울특별시", "SEOUL_ALL"],
  ["부산광역시", "BUSAN_ALL"],
  ["대구광역시", "DAEGU_ALL"],
  ["인천광역시", "INCHEON_ALL"],
  ["광주광역시", "GWANGJU_ALL"],
  ["대전광역시", "DAEJEON_ALL"],
  ["울산광역시", "ULSAN_ALL"],
  ["경기도", "GYEONGGI_ALL"],
  ["강원도", "GANGWON_ALL"],
  ["충청북도", "CHUNGBUK_ALL"],
  ["충청남도", "CHUNGNAM_ALL"],
  ["전라북도", "JEONBUK_ALL"],
  ["전라남도", "JEONNAM_ALL"],
  ["경상북도", "GYEONGBUK_ALL"],
  ["경상남도", "GYEONGNAM_ALL"],
  ["제주도", "JEJU_ALL"],
  ["서울시", "SEOUL_ALL"],
  ["부산시", "BUSAN_ALL"],
  ["대구시", "DAEGU_ALL"],
  ["인천시", "INCHEON_ALL"],
  ["광주시", "GWANGJU_ALL"],
  ["대전시", "DAEJEON_ALL"],
  ["울산시", "ULSAN_ALL"],
  ["세종시", "SEJONG_ALL"],
  ["서울", "SEOUL_ALL"],
  ["부산", "BUSAN_ALL"],
  ["대구", "DAEGU_ALL"],
  ["인천", "INCHEON_ALL"],
  ["광주", "GWANGJU_ALL"],
  ["대전", "DAEJEON_ALL"],
  ["울산", "ULSAN_ALL"],
  ["세종", "SEJONG_ALL"],
  ["경기", "GYEONGGI_ALL"],
  ["강원", "GANGWON_ALL"],
  ["충북", "CHUNGBUK_ALL"],
  ["충남", "CHUNGNAM_ALL"],
  ["전북", "JEONBUK_ALL"],
  ["전남", "JEONNAM_ALL"],
  ["경북", "GYEONGBUK_ALL"],
  ["경남", "GYEONGNAM_ALL"],
  ["제주", "JEJU_ALL"],
];

const SIDO_BY_UNIVERSE_CODE: Readonly<
  Partial<Record<string, CanonicalSidoIdentity>>
> = {
  SEOUL_ALL: "SEOUL_ALL",
  BUSAN_ALL: "BUSAN_ALL",
  DAEGU_ALL: "DAEGU_ALL",
  INCHEON_ALL: "INCHEON_ALL",
  GWANGJU_ALL: "GWANGJU_ALL",
  DAEJEON_ALL: "DAEJEON_ALL",
  ULSAN_ALL: "ULSAN_ALL",
  SEJONG_ALL: "SEJONG_ALL",
  GYEONGGI_ALL: "GYEONGGI_ALL",
  GANGWON_ALL: "GANGWON_ALL",
  CHUNGBUK_ALL: "CHUNGBUK_ALL",
  CHUNGNAM_ALL: "CHUNGNAM_ALL",
  JEONBUK_ALL: "JEONBUK_ALL",
  JEONNAM_ALL: "JEONNAM_ALL",
  GYEONGBUK_ALL: "GYEONGBUK_ALL",
  GYEONGNAM_ALL: "GYEONGNAM_ALL",
  JEJU_ALL: "JEJU_ALL",
};

const SIDO_BY_ADMIN_PREFIX: Readonly<
  Partial<Record<string, CanonicalSidoIdentity>>
> = {
  "11": "SEOUL_ALL",
  "26": "BUSAN_ALL",
  "27": "DAEGU_ALL",
  "28": "INCHEON_ALL",
  "29": "GWANGJU_ALL",
  "30": "DAEJEON_ALL",
  "31": "ULSAN_ALL",
  "36": "SEJONG_ALL",
  "41": "GYEONGGI_ALL",
  "42": "GANGWON_ALL",
  "43": "CHUNGBUK_ALL",
  "44": "CHUNGNAM_ALL",
  "45": "JEONBUK_ALL",
  "46": "JEONNAM_ALL",
  "47": "GYEONGBUK_ALL",
  "48": "GYEONGNAM_ALL",
  "50": "JEJU_ALL",
  "51": "GANGWON_ALL",
  "52": "JEONBUK_ALL",
};

function normalizeAdministrativeLabel(value: unknown): string {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

export function isLegalDongName(value: unknown): value is string {
  return typeof value === "string" && /^[가-힣]/.test(value.trim()) && /(?:읍|면|동|리|가)$/.test(value.trim());
}

function shortSido(code: CanonicalSidoIdentity | null): string {
  return SIDO_ALIAS_ENTRIES.find(([label, sido]) => sido === code && label.length === 2)?.[0] ?? "";
}

/** Parse administrative words, never a lot number as a dong. Sejong has no gu. */
export function parsePublicAddress(value: unknown) {
  const tokens = normalizeAdministrativeLabel(value).replace(/^대한민국\s+/, "").split(" ");
  const sido = resolveCanonicalSidoLabel(tokens[0]);
  if (!sido) return { cityName: "", sigunguName: "", legalDongName: "" };
  const rest = tokens.slice(1).filter(token => resolveCanonicalSidoLabel(token) !== sido);
  const dongIndex = rest.findIndex(isLegalDongName);
  const district = (dongIndex < 0 ? rest : rest.slice(0, dongIndex)).filter(token => /[가-힣].*[시군구]$/.test(token));
  return {
    cityName: shortSido(sido),
    sigunguName: sido === "SEJONG_ALL" ? "" : [...new Set(district)].join(" "),
    legalDongName: dongIndex < 0 ? "" : rest[dongIndex],
  };
}

export function formatPublicLocation(item: Pick<RankingItem, "sigunguName" | "legalDongName"> & { cityName?: string | null; universeCode?: string }) {
  const parsed = parsePublicAddress([item.cityName, item.sigunguName, item.legalDongName].filter(Boolean).join(" "));
  const city = parsed.cityName || shortSido(resolveSidoFromUniverseCode(item.universeCode));
  const district = parsed.sigunguName || (city === "세종" ? "" : normalizeAdministrativeLabel(item.sigunguName));
  const dong = isLegalDongName(item.legalDongName) ? item.legalDongName.trim() : parsed.legalDongName;
  return [...new Set([city, district, dong].filter(Boolean))].join(" ") || "위치 정보 확인 중";
}

function resolveCanonicalSidoLabel(
  value: unknown,
): CanonicalSidoIdentity | null {
  const normalized = normalizeAdministrativeLabel(value);
  if (!normalized) return null;

  return (
    SIDO_ALIAS_ENTRIES.find(([alias]) => alias === normalized)?.[1] ?? null
  );
}

export function resolveSidoFromUniverseCode(
  universeCode?: string | null,
): CanonicalSidoIdentity | null {
  const normalized = String(universeCode ?? "")
    .trim()
    .toUpperCase();
  const direct = SIDO_BY_UNIVERSE_CODE[normalized];
  if (direct) return direct;

  const sggMatch = normalized.match(/^SGG_(\d{2})\d{3}$/);
  return sggMatch ? SIDO_BY_ADMIN_PREFIX[sggMatch[1]] ?? null : null;
}

export function parseDistrictIdentity(value: unknown): DistrictIdentity | null {
  const normalized = normalizeAdministrativeLabel(value);
  if (!normalized) return null;

  for (const [alias, sido] of SIDO_ALIAS_ENTRIES) {
    if (!normalized.startsWith(`${alias} `)) continue;

    const sigungu = normalizeAdministrativeLabel(
      normalized.slice(alias.length + 1),
    );

    return /[시군구]$/.test(sigungu) ? { sido, sigungu } : null;
  }

  return /[시군구]$/.test(normalized)
    ? { sido: null, sigungu: normalized }
    : null;
}

export function matchesStructuredDistrict(
  item: RankingItem,
  selectedDistrict: string,
  boardUniverseCode: string,
): boolean {
  const selected = parseDistrictIdentity(selectedDistrict);
  const rowDistrict = parseDistrictIdentity(
    item.sigunguName ?? item.sigungu_name,
  );

  if (!selected || !rowDistrict) return false;
  if (selected.sigungu !== rowDistrict.sigungu) return false;

  const rawCityName = normalizeAdministrativeLabel(item.cityName);
  const cityFromField = resolveCanonicalSidoLabel(rawCityName);
  if (rawCityName && !cityFromField) return false;

  const rowSidoEvidence = [
    cityFromField,
    rowDistrict.sido,
    resolveSidoFromUniverseCode(item.universeCode ?? item.universe_code),
    resolveSidoFromUniverseCode(boardUniverseCode),
  ].filter((value): value is CanonicalSidoIdentity => value !== null);

  if (rowSidoEvidence.length === 0) return false;

  const rowSido = rowSidoEvidence[0];
  if (rowSidoEvidence.some((value) => value !== rowSido)) return false;

  const selectedSido =
    selected.sido ?? resolveSidoFromUniverseCode(boardUniverseCode);
  if (!selectedSido) return false;

  return rowSido === selectedSido;
}
