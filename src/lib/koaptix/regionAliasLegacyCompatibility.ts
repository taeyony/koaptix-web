import type { DiscoveryWarning } from "./types";

export type LegacyDiscoveryFixtureSeed = {
  complexId: string;
  fallbackName: string;
  fallbackRegionLabel: string;
  warnings: DiscoveryWarning[];
};

export type LegacyRegionAuxiliaryCandidate = {
  universeCode: string;
  aliases: string[];
  broadAliases?: string[];
  fallbackSearchTerms?: string[];
};

export const LEGACY_DISCOVERY_ACCEPTANCE_SEEDS: LegacyDiscoveryFixtureSeed[] = [
  {
    complexId: "168804",
    fallbackName: "진월한국아델리움",
    fallbackRegionLabel: "광주 남구 진월동",
    warnings: ["SOURCE_IDENTITY_AMBIGUOUS"],
  },
  {
    complexId: "168810",
    fallbackName: "진월한국아델리움",
    fallbackRegionLabel: "광주 남구 진월동",
    warnings: ["SOURCE_IDENTITY_AMBIGUOUS", "AREA_HOUSEHOLD_GAP"],
  },
  {
    complexId: "168815",
    fallbackName: "진월한국아델리움",
    fallbackRegionLabel: "광주 남구 진월동",
    warnings: ["SOURCE_IDENTITY_AMBIGUOUS", "AREA_HOUSEHOLD_GAP"],
  },
];

export const LEGACY_DISCOVERY_ACCEPTANCE_TERMS = [
  "한국아델리움",
  "한국 아델리움",
  "아델리움",
  "진월한국아델리움",
  "진월 한국아델리움",
  "진월동한국아델리움",
  "진월동 한국아델리움",
  "한국아델리움1차",
  "진월동한국아델리움1차",
  "진월동 한국아델리움1차",
  "진월2차한국아델리움",
  "진월2차 한국아델리움",
  "진월한국아델리움57",
  "한국아델리움57",
  "아델리움57",
];

export const LEGACY_DISCOVERY_COMPATIBLE_UNIVERSE_CODES = new Set([
  "KOREA_ALL",
  "GWANGJU_ALL",
]);

export const LEGACY_OPERATIONAL_MACRO_SGG_PREFIX: Readonly<
  Record<string, string>
> = {
  SEOUL_ALL: "11",
  BUSAN_ALL: "26",
  DAEGU_ALL: "27",
  INCHEON_ALL: "28",
  GWANGJU_ALL: "29",
  DAEJEON_ALL: "30",
  ULSAN_ALL: "31",
  SEJONG_ALL: "36",
  GYEONGGI_ALL: "41",
  GANGWON_ALL: "42",
  CHUNGBUK_ALL: "43",
  CHUNGNAM_ALL: "44",
  JEONBUK_ALL: "52",
  JEONNAM_ALL: "46",
  GYEONGBUK_ALL: "47",
  GYEONGNAM_ALL: "48",
  JEJU_ALL: "50",
};

export const LEGACY_DISCOVERY_REGION_CONTEXT_TERMS = [
  "광주",
  "광주광역시",
  "광주특별시",
  "전남광주",
  "전남광주통합특별시",
  "전남",
  "전라남도",
  "남구",
  "진월동",
  "진월",
];

export const LEGACY_DISCOVERY_BROAD_GENERIC_BASE_TERMS = new Set([
  "새한",
  "현대",
  "우성",
  "주공",
  "자이",
  "푸르지오",
  "래미안",
  "아이파크",
  "더샵",
  "롯데캐슬",
  "힐스테이트",
]);

export const LEGACY_REGION_AUXILIARY_CANDIDATES: LegacyRegionAuxiliaryCandidate[] = [
  {
    universeCode: "SEOUL_ALL",
    aliases: ["서울", "서울특별시", "seoul"],
    broadAliases: ["서울", "서울특별시", "seoul"],
  },
  {
    universeCode: "BUSAN_ALL",
    aliases: [
      "부산", "부산광역시", "해운대", "해운대구", "부산진", "부산진구",
      "수영", "수영구", "동래", "동래구", "우동", "중동", "장전동",
      "busan", "haeundae",
    ],
    broadAliases: ["부산", "부산광역시", "busan"],
  },
  {
    universeCode: "BUSAN_ALL",
    aliases: ["마린시티"],
    fallbackSearchTerms: ["우동", "해운대"],
  },
  {
    universeCode: "DAEGU_ALL",
    aliases: ["대구", "대구광역시", "수성", "수성구", "달서", "달서구", "범어", "범어동", "daegu"],
    broadAliases: ["대구", "대구광역시", "daegu"],
  },
  {
    universeCode: "INCHEON_ALL",
    aliases: ["인천", "인천광역시", "미추홀", "미추홀구", "연수", "연수구", "부평", "부평구", "송도", "송도동", "청라", "incheon"],
    broadAliases: ["인천", "인천광역시", "incheon"],
  },
  {
    universeCode: "GWANGJU_ALL",
    aliases: ["광주", "광주광역시", "광산", "광산구", "봉선", "봉선동", "gwangju"],
    broadAliases: ["광주", "광주광역시", "gwangju"],
  },
  {
    universeCode: "DAEJEON_ALL",
    aliases: ["대전", "대전광역시", "둔산", "둔산동", "유성", "유성구", "daejeon"],
    broadAliases: ["대전", "대전광역시", "daejeon"],
  },
  {
    universeCode: "SEJONG_ALL",
    aliases: ["세종", "세종시", "세종특별자치시", "sejong"],
    broadAliases: ["세종", "세종시", "세종특별자치시", "sejong"],
  },
  {
    universeCode: "GYEONGGI_ALL",
    aliases: [
      "경기", "경기도", "수원", "수원시", "고양", "고양시", "일산",
      "일산동구", "일산서구", "성남", "성남시", "분당", "분당구",
      "정자", "정자동", "판교", "판교동", "마두", "마두동", "용인",
      "용인시", "화성", "화성시", "부천", "부천시", "안양", "안양시",
      "남양주", "남양주시", "김포", "김포시", "파주", "파주시", "광주",
      "광주시", "경기광주", "gyeonggi", "suwon", "goyang",
    ],
    broadAliases: ["경기", "경기도", "gyeonggi"],
  },
  {
    universeCode: "SEJONG_ALL",
    aliases: ["어진", "어진동"],
  },
];

export function getLegacyOperationalMacroRegionCodePrefix(
  universeCode: string,
) {
  return LEGACY_OPERATIONAL_MACRO_SGG_PREFIX[universeCode] ?? null;
}
