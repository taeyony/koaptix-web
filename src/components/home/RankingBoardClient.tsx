"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { RankingCard } from "./RankingCard";
import { ComplexDetailSheet } from "./ComplexDetailSheet";
import { ComparisonSheet } from "./ComparisonSheet";
import type { ComplexDetail, RankingItem } from "../../lib/koaptix/types";

type RankingSortKey = "rank_asc" | "market_cap_desc" | "delta_desc" | "name_asc";

type RankingBoardClientProps = {
  items: RankingItem[]; // 💡 초기 데이터를 받습니다
  boardError?: string | null;
};

const SORT_OPTIONS: Array<{ value: RankingSortKey; label: string }> = [
  { value: "rank_asc", label: "순위순" },
  { value: "market_cap_desc", label: "시총순" },
  { value: "delta_desc", label: "상승폭순" },
  { value: "name_asc", label: "이름순" },
];

function createFallbackItem(complexId: string): RankingItem {
  return {
    complexId, name: "단지 정보 불러오는 중", rank: 0, marketCapKrw: 0, marketCapTrillionKrw: null,
    rankDelta1d: 0, sigunguName: "", legalDongName: "", locationLabel: "", searchText: complexId.toLowerCase(),
  };
}

export function RankingBoardClient({ items: initialItems, boardError = null }: RankingBoardClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const complexIdFromUrl = searchParams.get("complexId");

  // 🚨 잼이사가 복구한 1번: 무한 스크롤을 위한 State 부활!
  const [items, setItems] = useState<RankingItem[]>(initialItems);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialItems.length >= 50);

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<RankingSortKey>("rank_asc");
  const [districtFilter, setDistrictFilter] = useState<string>("전체");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RankingItem | null>(null);
  const [detail, setDetail] = useState<ComplexDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // 비교 기능 State
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [comparisonSheetOpen, setComparisonSheetOpen] = useState(false);
  const [compareToast, setCompareToast] = useState<string | null>(null);
  const compareToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (compareToastTimerRef.current) clearTimeout(compareToastTimerRef.current);
    };
  }, []);

  const uniqueDistricts = useMemo(() => {
    const districts = new Set<string>();
    items.forEach(item => {
      const gu = item.locationLabel?.split(' ')[0];
      if (gu && gu.endsWith('구')) districts.add(gu);
    });
    return ["전체", ...Array.from(districts).sort()];
  }, [items]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    const searched = items.filter((item) => {
      if (normalizedQuery && !item.searchText.includes(normalizedQuery)) return false;
      if (districtFilter !== "전체" && !item.locationLabel.startsWith(districtFilter)) return false;
      return true;
    });

    return [...searched].sort((a, b) => {
      switch (sortKey) {
        case "market_cap_desc": return b.marketCapKrw - a.marketCapKrw;
        case "delta_desc": return b.rankDelta1d - a.rankDelta1d;
        case "name_asc": return a.name.localeCompare(b.name, "ko");
        case "rank_asc": default: return a.rank - b.rank;
      }
    });
  }, [items, normalizedQuery, districtFilter, sortKey]);

  const selectedCompareItems = useMemo(
    () => selectedCompareIds.map((id) => items.find((item) => item.complexId === id)).filter((item): item is RankingItem => Boolean(item)),
    [items, selectedCompareIds]
  );

  // 🚨 잼이사가 복구한 2번: 더보기(Load More) 데이터 요청 함수 부활!
  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const response = await fetch(`/api/rankings?offset=${items.length}&limit=50`);
      const payload = await response.json();
      if (payload.data && payload.data.length > 0) {
        setItems((prev) => [...prev, ...payload.data]);
        if (payload.data.length < 50) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("더보기 로딩 실패:", error);
    } finally {
      setLoadingMore(false);
    }
  }

  const buildUrlWithComplexId = useCallback((complexId: string) => {
    const nextParams = new URLSearchParams(searchParamsKey);
    nextParams.set("complexId", complexId);
    return nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
  }, [pathname, searchParamsKey]);

  const buildUrlWithoutComplexId = useCallback(() => {
    const nextParams = new URLSearchParams(searchParamsKey);
    nextParams.delete("complexId");
    return nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
  }, [pathname, searchParamsKey]);

  const requestDetail = useCallback(async (complexId: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const response = await fetch(`/api/complex-detail?complexId=${encodeURIComponent(complexId)}`, { method: "GET", signal: controller.signal, cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "상세 정보를 불러오지 못했다.");
    return payload.data as ComplexDetail;
  }, []);

  const openDetailByItem = useCallback(async (item: RankingItem, options: { syncUrl?: boolean } = {}) => {
    const { syncUrl = true } = options;
    if (sheetOpen && selectedItem?.complexId === item.complexId) return;

    setSelectedItem(item); setDetail(null); setDetailError(null); setDetailLoading(true); setSheetOpen(true);

    if (syncUrl) {
      const nextUrl = buildUrlWithComplexId(item.complexId);
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (currentUrl !== nextUrl) window.history.pushState(null, "", nextUrl);
    }

    try {
      const nextDetail = await requestDetail(item.complexId);
      setDetail(nextDetail);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setDetailError(error instanceof Error ? error.message : "상세 정보를 불러오지 못했다.");
    } finally {
      setDetailLoading(false);
    }
  }, [buildUrlWithComplexId, requestDetail, selectedItem?.complexId, sheetOpen]);

  const openDetailByComplexId = useCallback(async (complexId: string, options: { syncUrl?: boolean } = {}) => {
    const targetItem = items.find((item) => item.complexId === complexId) ?? createFallbackItem(complexId);
    await openDetailByItem(targetItem, options);
  }, [items, openDetailByItem]);

  const closeDetail = useCallback((options: { syncUrl?: boolean } = {}) => {
    const { syncUrl = true } = options;
    abortRef.current?.abort();
    setSheetOpen(false); setSelectedItem(null); setDetail(null); setDetailError(null); setDetailLoading(false);

    if (syncUrl) {
      const nextUrl = buildUrlWithoutComplexId();
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (currentUrl !== nextUrl) window.history.replaceState(null, "", nextUrl);
    }
  }, [buildUrlWithoutComplexId]);

  useEffect(() => {
    if (!complexIdFromUrl) {
      if (sheetOpen || selectedItem) closeDetail({ syncUrl: false });
      return;
    }
    if (sheetOpen && selectedItem?.complexId === complexIdFromUrl) return;
    void openDetailByComplexId(complexIdFromUrl, { syncUrl: false });
  }, [closeDetail, complexIdFromUrl, openDetailByComplexId, selectedItem, sheetOpen]);

  function showCompareToast(message: string) {
    if (compareToastTimerRef.current) clearTimeout(compareToastTimerRef.current);
    setCompareToast(message);
    compareToastTimerRef.current = setTimeout(() => setCompareToast(null), 2200);
  }

  function toggleCompareSelection(item: RankingItem) {
    const isSelected = selectedCompareIds.includes(item.complexId);
    if (isSelected) {
      setSelectedCompareIds((prev) => prev.filter((id) => id !== item.complexId));
      return;
    }
    if (selectedCompareIds.length >= 2) {
      showCompareToast("비교는 최대 2개까지만 가능합니다");
      return;
    }
    setSelectedCompareIds((prev) => [...prev, item.complexId]);
  }

  function clearCompareSelection() {
    setSelectedCompareIds([]);
    setComparisonSheetOpen(false);
  }

  function openComparisonSheet() {
    if (selectedCompareItems.length < 2) {
      showCompareToast("비교할 단지를 2개 선택해라");
      return;
    }
    if (sheetOpen) closeDetail({ syncUrl: true });
    setComparisonSheetOpen(true);
  }

  const showFloatingBar = selectedCompareItems.length > 0 && !comparisonSheetOpen;

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_50px_rgba(0,0,0,0.3)]">
        <div className="border-b border-white/5 px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex flex-col gap-3">
            <div className="min-w-0">
              <h2 className="mt-1 truncate text-lg font-semibold tracking-tight sm:text-xl">KOAPTIX 500 Rankings</h2>
              <p className="mt-1 text-xs text-white/45 sm:text-sm">단지명·구·동 검색 / 클릭 시 URL 동기화 / VS 클릭 시 비교 담기</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_120px]">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="단지명, 구, 동 검색" className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-cyan-300/40" />
              
              <select value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)} className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-cyan-300/40">
                {uniqueDistricts.map((gu) => (
                  <option key={gu} value={gu} style={{ backgroundColor: "#0b1118", color: "#ffffff" }}>{gu}</option>
                ))}
              </select>

              <select value={sortKey} onChange={(e) => setSortKey(e.target.value as RankingSortKey)} className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-cyan-300/40">
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} style={{ backgroundColor: "#0b1118", color: "#ffffff" }}>{option.label}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center justify-between text-xs text-white/45 sm:text-sm">
              <span>표시 {filteredItems.length}개</span>
              <span>전체 {items.length}개</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 sm:space-y-3 lg:max-h-[600px]">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const isActive = sheetOpen && selectedItem?.complexId === item.complexId;
              const isCompared = selectedCompareIds.includes(item.complexId);

              return (
                <div key={item.complexId} className="grid grid-cols-[minmax(0,1fr)_50px] gap-2 sm:grid-cols-[minmax(0,1fr)_56px]">
                  <div role="button" tabIndex={0} onClick={() => void openDetailByItem(item, { syncUrl: true })} className={`rounded-xl outline-none transition cursor-pointer ${isActive ? "ring-2 ring-cyan-300/50" : "hover:ring-1 hover:ring-white/10"}`}>
                    <RankingCard item={item} />
                  </div>

                  <button type="button" onClick={(e) => { e.stopPropagation(); toggleCompareSelection(item); }} className={`flex h-full min-h-[108px] flex-col items-center justify-center rounded-xl border text-[10px] font-semibold tracking-[0.18em] transition sm:min-h-[116px] ${isCompared ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-100 shadow-[0_0_0_1px_rgba(103,232,249,0.05)]" : "border-white/10 bg-white/[0.04] text-white/65 hover:bg-white/[0.08]"}`}>
                    <span className="text-sm leading-none sm:text-base">{isCompared ? "✓" : "VS"}</span>
                    <span className="mt-1">{isCompared ? "담김" : "추가"}</span>
                  </button>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm leading-6 text-white/55 text-center">검색 결과가 없습니다.</div>
          )}

          {/* 🚨 잼이사가 복구한 3번: 무한 스크롤 더보기 버튼 부활! */}
          {hasMore && !query && districtFilter === "전체" && (
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

      <ComplexDetailSheet open={sheetOpen} item={selectedItem} detail={detail} loading={detailLoading} error={detailError} onClose={() => closeDetail({ syncUrl: true })} />

     {/* 🚨 잼이사가 강제 주입한 무적의 플로팅 바 (Inline Style) */}
      <div 
        style={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: selectedCompareItems.length > 0 && !comparisonSheetOpen ? '24px' : '-100px',
          opacity: selectedCompareItems.length > 0 && !comparisonSheetOpen ? 1 : 0,
          visibility: selectedCompareItems.length > 0 && !comparisonSheetOpen ? 'visible' : 'hidden',
          zIndex: 99999,
          transition: 'all 0.3s ease',
          width: '90%',
          maxWidth: '600px',
          backgroundColor: 'rgba(11, 17, 24, 0.95)',
          border: '1px solid rgba(103, 232, 249, 0.3)',
          borderRadius: '16px',
          padding: '16px 20px',
          boxShadow: '0 18px 50px rgba(0,0,0,0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: selectedCompareItems.length > 0 && !comparisonSheetOpen ? 'auto' : 'none'
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: '11px', color: '#67e8f9', fontWeight: 'bold', letterSpacing: '1px' }}>COMPARISON CART</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '16px', color: 'white', fontWeight: 'bold' }}>{selectedCompareItems.length}개 단지 선택됨</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={clearCompareSelection} style={{ padding: '8px 16px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>초기화</button>
          <button onClick={openComparisonSheet} disabled={selectedCompareItems.length < 2} style={{ padding: '8px 16px', backgroundColor: selectedCompareItems.length < 2 ? 'rgba(103,232,249,0.1)' : 'rgba(103,232,249,0.2)', color: selectedCompareItems.length < 2 ? 'rgba(255,255,255,0.3)' : '#cffafe', border: 'none', borderRadius: '8px', cursor: selectedCompareItems.length < 2 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>비교하기</button>
        </div>
      </div>

      <div aria-live="polite" aria-atomic="true" className="pointer-events-none fixed inset-x-0 z-[99999] flex justify-center px-4 transition-all" style={{ bottom: selectedCompareItems.length > 0 ? "100px" : "24px" }}>
        {compareToast ? <div style={{ padding: '8px 24px', borderRadius: '30px', border: '1px solid rgba(103, 232, 249, 0.2)', backgroundColor: 'rgba(11, 17, 24, 0.95)', color: '#cffafe', fontSize: '14px', fontWeight: 'bold', boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}>{compareToast}</div> : null}
      </div>

      <ComparisonSheet open={comparisonSheetOpen} items={selectedCompareItems} onClose={() => setComparisonSheetOpen(false)} onClear={clearCompareSelection} />
    </>
  );
}