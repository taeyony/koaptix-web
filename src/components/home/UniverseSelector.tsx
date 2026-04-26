"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { UniverseOption } from "../../lib/koaptix/universes";

type UniverseSelectorProps = {
  value?: string;
  options: UniverseOption[];
  onChange: (nextCode: string) => void;
};

const RECENT_STORAGE_KEY = "koaptix_recent_universe_codes_v1";
const MAX_RECENT_CODES = 6;

const MACRO_UNIVERSE_ORDER = [
  "KOREA_ALL",
  "SEOUL_ALL",
  "BUSAN_ALL",
  "DAEGU_ALL",
  "INCHEON_ALL",
  "GWANGJU_ALL",
  "DAEJEON_ALL",
  "ULSAN_ALL",
  "SEJONG_ALL",
  "GYEONGGI_ALL",
  "GANGWON_ALL",
  "CHUNGBUK_ALL",
  "CHUNGNAM_ALL",
  "JEONBUK_ALL",
  "JEONNAM_ALL",
  "GYEONGBUK_ALL",
  "GYEONGNAM_ALL",
  "JEJU_ALL",
] as const;

const MACRO_ORDER_MAP: Map<string, number> = new Map(
  MACRO_UNIVERSE_ORDER.map((code, index) => [code, index] as const),
);

const SIGUNGU_PREFIX_TO_MACRO_LABEL: Record<string, string> = {
  "11": "서울",
  "26": "부산",
  "27": "대구",
  "28": "인천",
  "29": "광주",
  "30": "대전",
  "31": "울산",
  "36": "세종",
  "41": "경기",
  "42": "강원",
  "43": "충북",
  "44": "충남",
  "45": "전북",
  "46": "전남",
  "47": "경북",
  "48": "경남",
  "50": "제주",
};

const SIGUNGU_PREFIX_TO_MACRO_CODE: Record<string, string> = {
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
};

function isMacroUniverseCode(code?: string | null) {
  return !!code && code.endsWith("_ALL");
}

function isSggUniverseCode(code?: string | null) {
  return !!code && /^SGG_\d{5}$/.test(code);
}

function getUniversePrefixLabel(code?: string | null) {
  if (!code) return null;
  if (!isSggUniverseCode(code)) return null;

  const prefix = code.slice(4, 6);
  return SIGUNGU_PREFIX_TO_MACRO_LABEL[prefix] ?? "기타";
}

function getParentMacroCode(code?: string | null) {
  if (!code) return null;

  if (isMacroUniverseCode(code)) {
    return code;
  }

  if (isSggUniverseCode(code)) {
    const prefix = code.slice(4, 6);
    return SIGUNGU_PREFIX_TO_MACRO_CODE[prefix] ?? null;
  }

  return null;
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function getUniverseKindLabel(code?: string | null) {
  if (isMacroUniverseCode(code)) return "광역";
  if (isSggUniverseCode(code)) return "시군구";
  return "지역";
}

function buildSearchText(option: UniverseOption) {
  const prefixLabel = getUniversePrefixLabel(option.code);
  const parentMacroCode = getParentMacroCode(option.code);

  return [option.label, option.code, prefixLabel, parentMacroCode]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function sortUniverseOptions(a: UniverseOption, b: UniverseOption) {
  const aIsMacro = isMacroUniverseCode(a.code);
  const bIsMacro = isMacroUniverseCode(b.code);

  if (aIsMacro && bIsMacro) {
    const aOrder = MACRO_ORDER_MAP.get(a.code) ?? 999;
    const bOrder = MACRO_ORDER_MAP.get(b.code) ?? 999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.label.localeCompare(b.label, "ko");
  }

  if (aIsMacro && !bIsMacro) return -1;
  if (!aIsMacro && bIsMacro) return 1;

  const aPrefix = getUniversePrefixLabel(a.code) ?? "";
  const bPrefix = getUniversePrefixLabel(b.code) ?? "";
  if (aPrefix !== bPrefix) return aPrefix.localeCompare(bPrefix, "ko");

  return a.label.localeCompare(b.label, "ko");
}

function readRecentCodes(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function writeRecentCodes(codes: string[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      RECENT_STORAGE_KEY,
      JSON.stringify(codes.slice(0, MAX_RECENT_CODES)),
    );
  } catch {
    // no-op
  }
}

export default function UniverseSelector({
  value,
  options,
  onChange,
}: UniverseSelectorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectGuardRef = useRef<{ code: string; at: number } | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentCodes, setRecentCodes] = useState<string[]>([]);

  const sortedOptions = useMemo(() => {
    return [...options].sort(sortUniverseOptions);
  }, [options]);

  const currentOption = useMemo(() => {
    return (
      sortedOptions.find((option) => option.code === value) ??
      sortedOptions[0] ??
      null
    );
  }, [sortedOptions, value]);

  const currentMacroCode = useMemo(() => {
    return getParentMacroCode(currentOption?.code ?? value ?? null);
  }, [currentOption, value]);

  const macroOptions = useMemo(() => {
    return sortedOptions.filter((option) => isMacroUniverseCode(option.code));
  }, [sortedOptions]);

  const sggOptions = useMemo(() => {
    return sortedOptions.filter((option) => isSggUniverseCode(option.code));
  }, [sortedOptions]);

  const recentOptions = useMemo(() => {
    const optionMap: Map<string, UniverseOption> = new Map(
      sortedOptions.map((option) => [option.code, option] as const),
    );

    return recentCodes
      .map((code) => optionMap.get(code) ?? null)
      .filter((option): option is UniverseOption => option !== null);
  }, [recentCodes, sortedOptions]);

  const contextualRecentOptions = useMemo(() => {
    return recentOptions.filter((option) => {
      const parent = getParentMacroCode(option.code);
      return parent === currentMacroCode;
    });
  }, [currentMacroCode, recentOptions]);

  const allRecentOptions = useMemo(() => {
    return recentOptions.slice(0, MAX_RECENT_CODES);
  }, [recentOptions]);

  const contextualSggOptions = useMemo(() => {
    return sggOptions.filter((option) => {
      const parent = getParentMacroCode(option.code);
      return parent === currentMacroCode;
    });
  }, [currentMacroCode, sggOptions]);

  const parentMacroOption = useMemo(() => {
    if (!currentMacroCode) return null;
    return (
      macroOptions.find((option) => option.code === currentMacroCode) ?? null
    );
  }, [currentMacroCode, macroOptions]);

  const filteredOptions = useMemo(() => {
    const q = normalizeQuery(query);
    if (!q) return contextualSggOptions;

    return sortedOptions.filter((option) => buildSearchText(option).includes(q));
  }, [query, contextualSggOptions, sortedOptions]);

  const groupedFilteredOptions = useMemo(() => {
    const q = normalizeQuery(query);

    if (!q) {
      if (contextualSggOptions.length === 0) return [];
      return [["현재 권역 시군구", contextualSggOptions]] as Array<
        [string, UniverseOption[]]
      >;
    }

    const groups = new Map<string, UniverseOption[]>();

    for (const option of filteredOptions) {
      const groupLabel = isMacroUniverseCode(option.code)
        ? "광역 / 도"
        : getUniversePrefixLabel(option.code) ?? "기타 시군구";

      const prev = groups.get(groupLabel) ?? [];
      prev.push(option);
      groups.set(groupLabel, prev);
    }

    return Array.from(groups.entries()).sort((a, b) => {
      if (a[0] === "광역 / 도") return -1;
      if (b[0] === "광역 / 도") return 1;
      return a[0].localeCompare(b[0], "ko");
    });
  }, [contextualSggOptions, filteredOptions, query]);

  useEffect(() => {
    setRecentCodes(readRecentCodes());
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 10);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (rootRef.current && !rootRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const pushRecentCode = useCallback((nextCode: string) => {
    setRecentCodes((prev) => {
      const next = [nextCode, ...prev.filter((code) => code !== nextCode)].slice(
        0,
        MAX_RECENT_CODES,
      );
      writeRecentCodes(next);
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (nextCode: string) => {
      const now = Date.now();
      const lastSelect = selectGuardRef.current;

      if (
        lastSelect &&
        lastSelect.code === nextCode &&
        now - lastSelect.at < 120
      ) {
        return;
      }

      selectGuardRef.current = { code: nextCode, at: now };
      onChange(nextCode);
      pushRecentCode(nextCode);
      setIsOpen(false);
      setQuery("");
    },
    [onChange, pushRecentCode],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onOptionPointerUp = (event: PointerEvent) => {
      if (event.button !== 0) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const option = target.closest<HTMLElement>(
        '[data-testid="universe-option"][data-universe-code]',
      );
      if (!option || !root.contains(option)) return;
      if (option.getAttribute("aria-disabled") === "true") return;
      if (option instanceof HTMLButtonElement && option.disabled) return;

      const nextCode = option.getAttribute("data-universe-code");
      if (!nextCode) return;

      handleSelect(nextCode);
    };

    root.addEventListener("pointerup", onOptionPointerUp, true);
    return () => {
      root.removeEventListener("pointerup", onOptionPointerUp, true);
    };
  }, [handleSelect]);

  const renderChip = useCallback(
    (
      option: UniverseOption,
      variant: "macro" | "recent" | "list" = "list",
    ) => {
      const isActive = option.code === value;

      const baseClass =
        variant === "macro"
          ? "rounded-xl border px-3 py-2 text-sm font-semibold transition-all"
          : "rounded-lg border px-3 py-1.5 text-sm transition-all";

      const activeClass =
        variant === "macro"
          ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-300"
          : "border-cyan-400/40 bg-cyan-500/12 text-cyan-300";
      const inactiveClass =
        variant === "macro"
          ? "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-500 hover:text-white"
          : "border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-500 hover:text-white";

      return (
        <button
          key={option.code}
          type="button"
          onClick={() => handleSelect(option.code)}
          data-testid="universe-option"
          data-universe-code={option.code}
          className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}
        >
          {option.label}
        </button>
      );
    },
    [handleSelect, value],
  );

  const currentRegionLabel = useMemo(() => {
    if (!currentMacroCode) return "현재 권역";
    const macroOption =
      macroOptions.find((option) => option.code === currentMacroCode) ?? null;
    return macroOption?.label ?? "현재 권역";
  }, [currentMacroCode, macroOptions]);

  const currentIsSgg = isSggUniverseCode(currentOption?.code ?? value ?? null);
  const currentKindLabel = getUniverseKindLabel(
    currentOption?.code ?? value ?? null,
  );
  const finderScopeLabel = query.trim()
    ? "전체 지역 검색"
    : `${currentRegionLabel} 시군구`;

  return (
    <div ref={rootRef} className="relative flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {macroOptions.map((option) => renderChip(option, "macro"))}

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          data-testid="universe-finder-toggle"
          className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
            isOpen
              ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-300"
              : "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-500 hover:text-white"
          }`}
        >
          시군구 / 광역 찾기
        </button>
      </div>

      {contextualRecentOptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Recent
          </span>
          {contextualRecentOptions.map((option) => renderChip(option, "recent"))}
        </div>
      )}

      <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
              현재 선택 지역
            </p>
            <p
              className="truncate text-sm font-semibold text-slate-100"
              data-testid="current-universe-label"
              data-universe-code={currentOption?.code ?? value ?? ""}
            >
              {currentOption?.label ?? "대한민국 전체"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            data-testid="universe-finder-toggle"
            className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-all hover:border-slate-500 hover:text-white"
          >
            {isOpen ? "닫기" : "찾기"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-slate-500">
        <span
          data-testid="universe-kind-chip"
          data-universe-kind={currentKindLabel}
          className="rounded-full border border-slate-700 px-2 py-0.5"
        >
          {currentKindLabel}
        </span>
        {currentIsSgg && parentMacroOption && (
          <button
            type="button"
            onClick={() => handleSelect(parentMacroOption.code)}
            data-testid="universe-parent-macro-option"
            data-universe-code={parentMacroOption.code}
            className="rounded-full border border-slate-700 px-2 py-0.5 transition-all hover:border-cyan-500/40 hover:text-cyan-300"
          >
            광역으로 보기
          </button>
        )}
        <span className="rounded-full border border-slate-700 px-2 py-0.5">
          시군구 범위 {contextualSggOptions.length}개
        </span>
        <span
          data-testid="universe-finder-scope"
          className="rounded-full border border-slate-700 px-2 py-0.5"
        >
          {finderScopeLabel}
        </span>
        <span className="rounded-full border border-slate-700 px-2 py-0.5">
          {sortedOptions.length}개 지역
        </span>
      </div>

      {isOpen && (
        <div className="absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-700/70 bg-[#0b1118] shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
          <div className="border-b border-slate-800/80 p-3">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="universe-search-input"
              placeholder="광역시·도 또는 시군구 검색..."
              className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-500 focus:border-cyan-500/50"
            />
          </div>

          <div className="max-h-[360px] overflow-y-auto p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-[11px] text-slate-500">
              <span data-testid="universe-finder-active-scope">
                {finderScopeLabel}
              </span>
              <span>{sortedOptions.length}개 지역에서 검색</span>
            </div>

            {!query && allRecentOptions.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  최근 본 지역
                </p>
                <div className="flex flex-wrap gap-2">
                  {allRecentOptions.map((option) =>
                    renderChip(option, "recent"),
                  )}
                </div>
              </div>
            )}

            {!query && macroOptions.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  주요 광역시 · 도
                </p>
                <div className="flex flex-wrap gap-2">
                  {macroOptions.map((option) => renderChip(option, "recent"))}
                </div>
              </div>
            )}

            {!query && contextualSggOptions.length === 0 && (
              <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-4 text-sm text-slate-400">
                {currentRegionLabel}은 아직 시군구 보드가 열리지 않았습니다.
              </div>
            )}

            {groupedFilteredOptions.length > 0 ? (
              <div className="space-y-4">
                {groupedFilteredOptions.map(([groupLabel, groupOptions]) => (
                  <div key={groupLabel}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {query ? groupLabel : `${currentRegionLabel} 시군구`}
                    </p>

                    <div className="space-y-2">
                      {groupOptions.map((option) => {
                        const isActive = option.code === value;

                        return (
                          <button
                            key={option.code}
                            type="button"
                            onClick={() => handleSelect(option.code)}
                            data-testid="universe-option"
                            data-universe-code={option.code}
                            className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-all ${
                              isActive
                                ? "border-cyan-400/40 bg-cyan-500/12"
                                : "border-slate-800 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800/50"
                            }`}
                          >
                            <div className="min-w-0">
                              <p
                                className={`truncate text-sm font-semibold ${
                                  isActive ? "text-cyan-300" : "text-slate-100"
                                }`}
                              >
                                {option.label}
                              </p>
                              <p className="truncate text-[11px] text-slate-500">
                                {option.code}
                              </p>
                              {!isMacroUniverseCode(option.code) && (
                                <p className="truncate text-[11px] text-slate-600">
                                  {getUniversePrefixLabel(option.code)} /{" "}
                                  {getParentMacroCode(option.code)}
                                </p>
                              )}
                            </div>

                            <div className="ml-3 shrink-0">
                              {isMacroUniverseCode(option.code) ? (
                                <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                                  광역
                                </span>
                              ) : (
                                <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                                  시군구
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : query ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-6 text-center text-sm text-slate-500">
                검색 결과가 없다.
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
