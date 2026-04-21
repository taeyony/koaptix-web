"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RankingItem } from "../../lib/koaptix/types";
import {
  DEFAULT_UNIVERSE_CODE,
  normalizeUniverseCode,
} from "../../lib/koaptix/universes";

interface CommandPaletteProps {
  items: RankingItem[];
  initialUniverseCode?: string;
}

type SearchApiResponse = {
  ok?: boolean;
  universeCode?: string;
  localItems?: RankingItem[];
  globalItems?: RankingItem[];
  message?: string;
};

const SEARCH_API = (query: string, universeCode: string, limit = 12) =>
  `/api/search?q=${encodeURIComponent(query)}&universe_code=${encodeURIComponent(
    universeCode,
  )}&limit=${limit}`;

async function readSearchResult(
  input: string,
  signal: AbortSignal,
): Promise<{ localItems: RankingItem[]; globalItems: RankingItem[] }> {
  const response = await fetch(input, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  const json = (await response.json()) as SearchApiResponse;

  if (!response.ok || json.ok === false) {
    throw new Error(
      json.message ?? `Request failed: ${response.status} ${input}`,
    );
  }

  return {
    localItems: json.localItems ?? [],
    globalItems: json.globalItems ?? [],
  };
}

export function CommandPalette({
  items,
  initialUniverseCode = DEFAULT_UNIVERSE_CODE,
}: CommandPaletteProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlUniverseCode = normalizeUniverseCode(
    searchParams?.get("universe") ?? initialUniverseCode,
  );

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [localItems, setLocalItems] = useState<RankingItem[]>([]);
  const [globalItems, setGlobalItems] = useState<RankingItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const cacheRef = useRef<
    Record<string, { localItems: RankingItem[]; globalItems: RankingItem[] }>
  >({});

  const replaceUrlParams = useCallback(
    (
      updater: (params: URLSearchParams) => void,
      mode: "replace" | "push" = "replace",
    ) => {
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      updater(params);

      const nextQuery = params.toString();
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;

      if (mode === "push") {
        window.history.pushState(null, "", nextUrl);
      } else {
        window.history.replaceState(null, "", nextUrl);
      }

      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    [pathname],
  );

  const localFallbackItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return items
      .filter((item) => {
        return (
          item.name.toLowerCase().includes(q) ||
          item.sigunguName?.toLowerCase().includes(q) ||
          item.legalDongName?.toLowerCase().includes(q) ||
          item.locationLabel?.toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [items, query]);

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
    const onKeyDown = (event: KeyboardEvent) => {
      const isMetaK =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      const isEsc = event.key === "Escape";

      if (isMetaK) {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }

      if (isEsc) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const q = query.trim();
    if (q.length < 2) {
      setLocalItems([]);
      setGlobalItems([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const cacheKey = `${urlUniverseCode}::${q.toLowerCase()}`;
    const cached = cacheRef.current[cacheKey];
    if (cached) {
      setLocalItems(cached.localItems);
      setGlobalItems(cached.globalItems);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);

      try {
        const next = await readSearchResult(
          SEARCH_API(q, urlUniverseCode, 12),
          controller.signal,
        );

        if (cancelled) return;

        cacheRef.current[cacheKey] = next;
        setLocalItems(next.localItems);
        setGlobalItems(next.globalItems);
      } catch (error) {
        if (controller.signal.aborted || cancelled) return;

        const message =
          error instanceof Error ? error.message : "검색 실패";

        console.error("[CommandPalette] search failed", {
          urlUniverseCode,
          q,
          message,
        });

        setSearchError(message);
        setLocalItems([]);
        setGlobalItems([]);
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 180);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [isOpen, query, urlUniverseCode]);

  const visibleLocalItems = useMemo(() => {
    if (query.trim().length < 2) {
      return localFallbackItems;
    }
    return localItems;
  }, [localFallbackItems, localItems, query]);

  const visibleGlobalItems = useMemo(() => {
    if (query.trim().length < 2) return [];
    return globalItems;
  }, [globalItems, query]);

  const rankingSearchHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("universe", urlUniverseCode);

    const q = query.trim();
    if (q) {
      params.set("q", q);
    }

    return `/ranking?${params.toString()}`;
  }, [query, urlUniverseCode]);

  const handleSelectItem = useCallback(
    (item: RankingItem) => {
      replaceUrlParams((params) => {
        if (item.universeCode && item.universeCode !== DEFAULT_UNIVERSE_CODE) {
          params.set("universe", item.universeCode);
        } else {
          params.delete("universe");
        }

        params.set("complexId", item.complexId);
      }, "push");

      setIsOpen(false);
    },
    [replaceUrlParams],
  );

  const handleOpenRankingSearch = useCallback(() => {
    router.push(rankingSearchHref);
    setIsOpen(false);
  }, [rankingSearchHref, router]);

  const renderResultCard = (item: RankingItem) => (
    <button
      key={`${item.universeCode ?? "KOREA_ALL"}::${item.complexId}`}
      type="button"
      onClick={() => handleSelectItem(item)}
      data-testid="command-result-card"
      data-complex-id={item.complexId}
      data-universe-code={item.universeCode ?? item.universe_code ?? ""}
      className="group flex w-full items-start justify-between rounded-2xl border border-slate-800 bg-[#0f1620] px-4 py-4 text-left transition hover:border-cyan-500/30 hover:bg-[#111b27]"
    >
      <div className="min-w-0 pr-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-400">
            #{item.rank_all ?? item.rank ?? "-"}
          </span>
          <span className="truncate text-[28px] font-semibold leading-none text-white">
            {item.name}
          </span>
        </div>

        <p className="mt-2 truncate text-sm text-slate-400">
          {item.locationLabel || `${item.sigunguName ?? ""} ${item.legalDongName ?? ""}`}
          {" · "}
          ID {item.complexId}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
          MARKET CAP
        </p>
        <p className="mt-1 text-3xl font-semibold text-slate-100">
          {typeof item.marketCapTrillionKrw === "number" && item.marketCapTrillionKrw > 0
            ? `${item.marketCapTrillionKrw.toFixed(2)}조원`
            : `${Math.round((item.marketCapKrw ?? 0) / 100000000).toLocaleString()}억원`}
        </p>
      </div>
    </button>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        data-testid="command-palette-open"
        className="fixed bottom-6 right-6 z-[980] rounded-full border border-slate-700 bg-slate-950/95 px-4 py-2 text-xs font-medium text-slate-200 shadow-2xl backdrop-blur transition hover:border-cyan-400/30 hover:text-cyan-300"
      >
        ⌘ COMMAND
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm">
          <div className="mx-auto mt-24 w-[92%] max-w-[820px] rounded-[28px] border border-cyan-500/20 bg-[#0b1118]/95 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_24px_80px_rgba(0,0,0,0.55)]">
            <div className="border-b border-slate-800/80 px-6 py-5">
              <p className="text-[12px] uppercase tracking-[0.24em] text-cyan-300/80">
                KOAPTIX COMMAND PALETTE
              </p>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                  🔎
                </div>

                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  data-testid="command-palette-input"
                  placeholder="단지명, 구, 동으로 바로 검색..."
                  className="h-12 w-full rounded-2xl border border-slate-700 bg-black/30 px-4 text-lg text-white outline-none transition focus:border-cyan-400/50"
                />

                <button
                  type="button"
                  onClick={handleOpenRankingSearch}
                  data-testid="command-open-ranking-search"
                  className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-cyan-300 transition hover:border-cyan-400/50 hover:bg-cyan-500/20"
                >
                  TOP1000
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-400 transition hover:border-slate-500 hover:text-white"
                >
                  [ESC] TO CLOSE
                </button>
              </div>
            </div>

            <div className="px-6 py-4">
              {(query.trim().length < 2) && (
                <div className="mb-4 rounded-2xl border border-slate-800 bg-black/20 px-4 py-3 text-sm text-slate-400">
                  두 글자 이상 입력하면 현재 유니버스 결과를 먼저 보여주고, 부족하면 전국 결과까지 자동으로 이어서 보여준다.
                </div>
              )}

              {isSearching ? (
                <div className="rounded-2xl border border-slate-800 bg-black/20 px-5 py-8 text-center text-slate-400">
                  검색 중...
                </div>
              ) : searchError ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-8 text-center text-rose-300">
                  {searchError}
                </div>
              ) : query.trim().length < 2 ? (
                <div className="space-y-3">
                  {visibleLocalItems.length > 0 ? (
                    <>
                      <div className="mb-2 flex items-center justify-between text-[12px] uppercase tracking-[0.18em] text-slate-500">
                        <span>현재 보드 미리보기</span>
                        <span>{visibleLocalItems.length} ITEMS</span>
                      </div>
                      <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                        {visibleLocalItems.map(renderResultCard)}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-slate-800 bg-black/20 px-5 py-8 text-center text-slate-400">
                      두 글자 이상 입력해 검색을 시작해라.
                    </div>
                  )}
                </div>
              ) : visibleLocalItems.length > 0 || visibleGlobalItems.length > 0 ? (
                <div className="max-h-[520px] space-y-5 overflow-y-auto pr-1">
                  {visibleLocalItems.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center justify-between text-[12px] uppercase tracking-[0.18em] text-cyan-300/80">
                        <span>현재 유니버스 결과</span>
                        <span>{visibleLocalItems.length} ITEMS</span>
                      </div>
                      <div className="space-y-3">
                        {visibleLocalItems.map(renderResultCard)}
                      </div>
                    </div>
                  )}

                  {visibleGlobalItems.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center justify-between text-[12px] uppercase tracking-[0.18em] text-slate-400">
                        <span>전국 결과</span>
                        <span>{visibleGlobalItems.length} ITEMS</span>
                      </div>
                      <div className="space-y-3">
                        {visibleGlobalItems.map(renderResultCard)}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-black/20 px-5 py-8 text-center text-slate-400">
                  검색 결과가 없다. 단지명, 구, 동 이름을 바꿔서 다시 입력해라.
                </div>
              )}
            </div>

            <div className="border-t border-slate-800/80 px-6 py-3 text-[12px] uppercase tracking-[0.18em] text-slate-500">
              ↑ ↓ NAVIGATE · ENTER OPEN DETAIL · ESC CLOSE · CMD/CTRL + K REOPEN
            </div>
          </div>
        </div>
      )}
    </>
  );
}
