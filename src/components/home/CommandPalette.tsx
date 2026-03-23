"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import type { RankingItem } from "../../lib/koaptix/types";

type CommandPaletteProps = {
  items: RankingItem[];
  resultLimit?: number;
};

const DEFAULT_RESULT_LIMIT = 8;
const TRIGGER_SELECTOR = [
  '[data-koaptix-command-trigger="true"]',
  'input[placeholder*="검색"]',
  'textarea[placeholder*="검색"]',
  'input[placeholder*="search" i]',
  'input[type="search"]',
].join(", ");

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function formatMarketCapKrw(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "-";

  const TRILLION = 1_000_000_000_000;
  const HUNDRED_MILLION = 100_000_000;

  if (value >= TRILLION) {
    const amount = value / TRILLION;
    const digits = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
    return `${amount.toFixed(digits)}조원`;
  }

  if (value >= HUNDRED_MILLION) {
    const amount = value / HUNDRED_MILLION;
    const digits = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
    return `${amount.toFixed(digits)}억원`;
  }

  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

function buildSearchText(item: RankingItem): string {
  return (
    item.searchText ||
    [
      item.name,
      item.locationLabel,
      item.sigunguName,
      item.legalDongName,
      item.complexId,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
  );
}

function scoreItem(item: RankingItem, query: string): number {
  const q = normalize(query);
  if (!q) return 0;

  const name = item.name.toLowerCase();
  const district = (item.sigunguName || "").toLowerCase();
  const dong = (item.legalDongName || "").toLowerCase();
  const location = (item.locationLabel || "").toLowerCase();
  const code = String(item.complexId).toLowerCase();
  const searchText = buildSearchText(item);

  let score = 0;

  if (name === q) score += 200;
  if (name.startsWith(q)) score += 120;
  if (name.includes(q)) score += 70;

  if (district === q) score += 90;
  if (district.startsWith(q)) score += 70;
  if (district.includes(q)) score += 45;

  if (dong === q) score += 65;
  if (dong.startsWith(q)) score += 55;
  if (dong.includes(q)) score += 35;

  if (location.includes(q)) score += 25;
  if (code === q) score += 110;
  if (code.includes(q)) score += 40;
  if (searchText.includes(q)) score += 15;

  score += Math.max(0, 30 - item.rank);

  return score;
}

function buildTargetUrl(complexId: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set("complexId", complexId);
  url.searchParams.set("id", complexId);

  const query = url.searchParams.toString();
  return `${url.pathname}${query ? `?${query}` : ""}${url.hash}`;
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CommandIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 6h2a3 3 0 1 1 0 6H6a3 3 0 1 1 0-6Z" />
      <path d="M16 6h2a3 3 0 1 1 0 6h-2a3 3 0 1 1 0-6Z" />
      <path d="M6 16h2a3 3 0 1 1 0 6H6a3 3 0 1 1 0-6Z" />
      <path d="M16 16h2a3 3 0 1 1 0 6h-2a3 3 0 1 1 0-6Z" />
    </svg>
  );
}

export function CommandPalette({
  items,
  resultLimit = DEFAULT_RESULT_LIMIT,
}: CommandPaletteProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const resultRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const results = useMemo(() => {
    const q = normalize(query);

    if (!q) {
      return [...items].sort((a, b) => a.rank - b.rank).slice(0, resultLimit);
    }

    return items
      .map((item) => ({
        item,
        score: scoreItem(item, q),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.item.rank !== b.item.rank) return a.item.rank - b.item.rank;
        return b.item.marketCapKrw - a.item.marketCapKrw;
      })
      .slice(0, resultLimit)
      .map((entry) => entry.item);
  }, [items, query, resultLimit]);

  function openPalette(initialQuery = "") {
    setQuery(initialQuery);
    setActiveIndex(0);
    setOpen(true);
  }

  function closePalette() {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }

  function selectItem(item: RankingItem) {
    const nextUrl = buildTargetUrl(item.complexId);
    closePalette();
    router.push(nextUrl, { scroll: false });
  }

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (results.length === 0) {
      setActiveIndex(-1);
      return;
    }

    setActiveIndex((prev) => {
      if (prev < 0) return 0;
      if (prev >= results.length) return results.length - 1;
      return prev;
    });
  }, [open, results.length]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    resultRefs.current[activeIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [activeIndex, open]);

  useEffect(() => {
    const onGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openPalette();
        return;
      }

      if (event.key === "Escape" && open) {
        event.preventDefault();
        closePalette();
      }
    };

    window.addEventListener("keydown", onGlobalKeyDown);
    return () => window.removeEventListener("keydown", onGlobalKeyDown);
  }, [open]);

  useEffect(() => {
    const shouldIgnoreTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return true;
      return Boolean(target.closest('[data-command-palette-root="true"]'));
    };

    const readTriggerValue = (element: HTMLElement | null): string => {
      if (!element) return "";
      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement
      ) {
        return element.value ?? "";
      }
      return "";
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (shouldIgnoreTarget(event.target)) return;
      if (!(event.target instanceof HTMLElement)) return;

      const trigger = event.target.closest(TRIGGER_SELECTOR) as HTMLElement | null;
      if (!trigger) return;

      const initialValue = readTriggerValue(trigger);

      window.requestAnimationFrame(() => {
        openPalette(initialValue);
      });
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (shouldIgnoreTarget(event.target)) return;
      if (!(event.target instanceof HTMLElement)) return;

      const trigger = event.target.closest(TRIGGER_SELECTOR) as HTMLElement | null;
      if (!trigger) return;

      const initialValue = readTriggerValue(trigger);

      window.requestAnimationFrame(() => {
        openPalette(initialValue);
      });
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("focusin", handleFocusIn, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("focusin", handleFocusIn, true);
    };
  }, []);

  function onInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (results.length === 0) return;
      setActiveIndex((prev) => (prev + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) return;
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex < 0 || !results[activeIndex]) return;
      selectItem(results[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closePalette();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => openPalette()}
        className="fixed bottom-4 right-4 z-[74] hidden items-center gap-2 rounded-full border border-cyan-300/20 bg-[#0b1118]/85 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur transition hover:border-cyan-300/35 hover:bg-[#0b1118] lg:inline-flex"
        aria-label="커맨드 팔레트 열기"
      >
        <CommandIcon />
        Command
      </button>

      {open ? (
        <div
          ref={rootRef}
          data-command-palette-root="true"
          className="fixed inset-0 z-[80]"
        >
          <div
            className="absolute inset-0 bg-black/72 backdrop-blur-md"
            onClick={closePalette}
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="koaptix-command-title"
            className="absolute left-1/2 top-[12vh] w-[min(92vw,760px)] -translate-x-1/2 overflow-hidden rounded-3xl border border-cyan-300/18 bg-[#0b1118]/92 shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_0_36px_rgba(34,211,238,0.12),0_26px_80px_rgba(0,0,0,0.42)] backdrop-blur"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-75"
              style={{
                backgroundImage:
                  "radial-gradient(circle at top right, rgba(34,211,238,0.14), transparent 34%), radial-gradient(circle at bottom left, rgba(232,121,249,0.10), transparent 28%), repeating-linear-gradient(180deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 8px)",
              }}
            />

            <div className="relative border-b border-white/6 px-4 py-4 sm:px-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/18 bg-cyan-300/10 text-cyan-100">
                  <SearchIcon />
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    id="koaptix-command-title"
                    className="text-[11px] uppercase tracking-[0.22em] text-cyan-300/70"
                  >
                    KOAPTIX COMMAND PALETTE
                  </p>

                  <div className="relative mt-2">
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={onInputKeyDown}
                      placeholder="단지명 또는 지역명을 입력해라..."
                      className="h-12 w-full rounded-2xl border border-white/10 bg-black/25 pl-4 pr-28 text-sm text-white outline-none placeholder:text-white/28 focus:border-cyan-300/35"
                      aria-controls="koaptix-command-results"
                      aria-expanded="true"
                      aria-activedescendant={
                        activeIndex >= 0 ? `koaptix-command-option-${activeIndex}` : undefined
                      }
                    />

                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] uppercase tracking-[0.16em] text-white/35">
                      [esc] to close
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative max-h-[58vh] overflow-y-auto p-2 sm:p-3">
              <div className="mb-2 flex items-center justify-between px-2 text-[11px] uppercase tracking-[0.18em] text-white/35">
                <span>{normalize(query) ? "Search Results" : "Quick Access"}</span>
                <span>{results.length} items</span>
              </div>

              {results.length > 0 ? (
                <div id="koaptix-command-results" role="listbox" className="grid gap-2">
                  {results.map((item, index) => {
                    const active = index === activeIndex;

                    return (
                      <button
                        key={item.complexId}
                        id={`koaptix-command-option-${index}`}
                        ref={(element) => {
                          resultRefs.current[index] = element;
                        }}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => selectItem(item)}
                        className={`grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                          active
                            ? "border-cyan-300/28 bg-cyan-300/[0.10] shadow-[0_0_0_1px_rgba(34,211,238,0.10),0_0_26px_rgba(34,211,238,0.14)]"
                            : "border-white/8 bg-white/[0.03] hover:border-cyan-300/16 hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-white/45">
                              #{item.rank}
                            </span>
                            <h3 className="truncate text-sm font-semibold text-white sm:text-base">
                              {item.name}
                            </h3>
                          </div>

                          <p className="mt-1 truncate text-xs text-white/45 sm:text-sm">
                            {item.locationLabel || "위치 정보 없음"} · ID {item.complexId}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">
                            Market Cap
                          </p>
                          <p className="mt-1 text-sm font-semibold text-cyan-100 sm:text-base">
                            {formatMarketCapKrw(item.marketCapKrw)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm leading-6 text-white/50">
                  검색 결과가 없다. 단지명, 구, 동 이름을 바꿔서 다시 입력해라.
                </div>
              )}
            </div>

            <div className="relative border-t border-white/6 px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-white/35 sm:px-5">
              ↑ ↓ navigate · enter open detail · esc close · cmd/ctrl + k reopen
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}