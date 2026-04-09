export type UniverseCode =
  | "KOREA_ALL"
  | "SEOUL_ALL"
  | "BUSAN_ALL"
  | "GYEONGGI_ALL"
  | `SGG_${string}`;

export type UniverseOption = {
  code: UniverseCode;
  label: string;
};

export const DEFAULT_UNIVERSE_CODE: UniverseCode = "KOREA_ALL";

export const PUBLIC_UNIVERSE_OPTIONS: UniverseOption[] = [
  { code: "KOREA_ALL", label: "전국" },
  { code: "SEOUL_ALL", label: "서울" },
  { code: "BUSAN_ALL", label: "부산" },
  { code: "GYEONGGI_ALL", label: "경기" },
];

export const UNIVERSE_LABEL_MAP: Record<string, string> = {
  KOREA_ALL: "전국",
  SEOUL_ALL: "서울",
  BUSAN_ALL: "부산",
  GYEONGGI_ALL: "경기",
};

const SGG_CODE_PATTERN = /^SGG_\d{5}$/;

export function isSupportedUniverseCode(value: string): value is UniverseCode {
  return Boolean(UNIVERSE_LABEL_MAP[value]) || SGG_CODE_PATTERN.test(value);
}

export function normalizeUniverseCode(
  value: string | null | undefined,
): UniverseCode {
  const normalized = (value ?? "").trim().toUpperCase();
  if (!normalized) return DEFAULT_UNIVERSE_CODE;
  return isSupportedUniverseCode(normalized)
    ? normalized
    : DEFAULT_UNIVERSE_CODE;
}

export function getUniverseLabel(
  code: string | null | undefined,
): string {
  const safeCode = normalizeUniverseCode(code);
  return UNIVERSE_LABEL_MAP[safeCode] ?? safeCode;
}