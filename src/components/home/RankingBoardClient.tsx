"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RankingCard } from "./RankingCard";
import { ComplexDetailSheet } from "./ComplexDetailSheet";
import type { ComplexDetail, RankingItem, RankingSortKey } from "../../lib/koaptix/types";

type RankingBoardClientProps = {
  items: RankingItem[];
};

const SORT_OPTIONS: Array<{ value: RankingSortKey; label: string }> = [
  { value: "rank_asc", label: "순위순" },
  { value: "market_cap_desc", label: "시총순" },
  { value: "delta_desc", label: "상승폭순" },
  { value: "name_asc", label: "이름순" },
];

export function RankingBoardClient({ items: initialItems }: RankingBoardClientProps) {
  const [items, setItems] = useState<RankingItem[]>(initialItems);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialItems.length >= 40);

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<RankingSortKey>("rank_asc");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RankingItem | null>(null);
  const [detail, setDetail] = useState<ComplexDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    const searched = items.filter((item) => {
      if (!normalizedQuery) return true;
      return item.searchText.includes(normalizedQuery);
    });
    return [...searched].sort((a, b) => {
      switch (sortKey) {
        case "market_cap_desc": return b.marketCapKrw - a.marketCapKrw;
        case "delta_desc": return b.rankDelta1d - a.rankDelta1d;
        case "name_asc": return a.name.localeCompare(b.name, "ko");
        case "rank_asc":
        default: return a.rank - b.rank;
      }
    });
  }, [items, normalizedQuery, sortKey]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const response = await fetch(`/api/rankings?offset=${items.length}&limit=50`);
      const payload = await response.json();
      if (payload.data) {
        setItems((prev) => [...prev, ...payload.data]);
        if (payload.data.length < 50) {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error("더보기 로딩 실패:", error);
    } finally {
      setLoadingMore(false);
    }
  }

  async function openDetail(item: RankingItem) {
    setSelectedItem(item);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    setSheetOpen(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`/api/complex-detail?complexId=${encodeURIComponent(item.complexId)}`, {
        method: "GET", signal: controller.signal,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "상세 정보를 불러오지 못했다.");
      setDetail(payload.data ?? null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setDetailError(error instanceof Error ? error.message : "상세 정보를 불러오지 못했다.");
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false);
    }
  }

  function closeDetail() { setSheetOpen(false); }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_50px_rgba(0,0,0,0.3)] flex flex-col h-full lg:max-h-[800px]">
        <div className="border-b border-white/5 px-3 py-3 sm:px-4 sm:py-4 shrink-0">
          <div className="flex flex-col gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/70 sm:text-xs">LEADERS BOARD</p>
              <h2 className="mt-1 truncate text-lg font-semibold tracking-tight sm:text-xl">KOAPTIX 500 Rankings</h2>
              <p className="mt-1 text-xs text-white/45 sm:text-sm">단지명·구·동 즉시 검색 / 클릭 시 상세 바텀 시트</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="단지명, 구, 동 검색 (현재 로드된 단지 내)"
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40"
              />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as RankingSortKey)}
                className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-cyan-300/40"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#0b1118]">{option.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between text-xs text-white/45 sm:text-sm">
              <span>검색 결과 {filteredItems.length}개</span>
              <span>현재 로드됨 {items.length}개</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 sm:space-y-3">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const isActive = sheetOpen && selectedItem?.complexId === item.complexId;
              return (
                <div
                  key={item.complexId}
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetail(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void openDetail(item); }
                  }}
                  className={`rounded-xl outline-none transition ${
                    isActive ? "ring-2 ring-cyan-300/50" : "hover:ring-1 hover:ring-white/10 focus-visible:ring-2 focus-visible:ring-cyan-300/50"
                  }`}
                >
                  <RankingCard item={item} />
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm leading-6 text-white/55 text-center">
              검색 결과가 없습니다.
            </div>
          )}

          {hasMore && !query && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/10 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/20 disabled:opacity-50"
            >
              {loadingMore ? "데이터를 불러오는 중입니다..." : "더보기 (Load More)"}
            </button>
          )}
        </div>
      </section>

      <ComplexDetailSheet
        open={sheetOpen}
        item={selectedItem}
        detail={detail}
        loading={detailLoading}
        error={detailError}
        onClose={closeDetail}
      />
    </>
  );
}