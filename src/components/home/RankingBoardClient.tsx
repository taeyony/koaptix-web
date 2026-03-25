"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { RankingCard } from "./RankingCard";
import type { RankingItem } from "../../lib/koaptix/types";
import { useBookmarks } from "../../hooks/useBookmarks";
import ComparisonSheet from "./ComparisonSheet";

interface RankingBoardClientProps {
  items: RankingItem[];
  boardError?: string | null;
}

export function RankingBoardClient({ items, boardError }: RankingBoardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const districtQuery = searchParams?.get("district");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { bookmarks, toggleBookmark, isLoaded } = useBookmarks();
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  const [comparisonItems, setComparisonItems] = useState<RankingItem[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  const toggleComparisonItem = useCallback((item: RankingItem) => {
    setComparisonItems((prev) => {
      const isAlreadyIn = prev.some((p) => p.complexId === item.complexId);
      if (isAlreadyIn) return prev.filter((p) => p.complexId !== item.complexId);
      if (prev.length < 2) return [...prev, item];
      return [prev[1], item];
    });
  }, []);

  useEffect(() => {
    if (comparisonItems.length === 2) setIsComparisonOpen(true);
    else setIsComparisonOpen(false);
  }, [comparisonItems.length]);

  const clearDistrict = () => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("district");
    router.push(`${pathname}?${params.toString()}`);
  };

  const filteredItems = useMemo(() => {
    let result = items;
    if (districtQuery) result = result.filter(item => item.sigunguName?.includes(districtQuery) || item.locationLabel?.includes(districtQuery));
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(item => item.name.toLowerCase().includes(lowerQ) || item.sigunguName?.toLowerCase().includes(lowerQ) || item.legalDongName?.toLowerCase().includes(lowerQ));
    }
    if (showBookmarksOnly && isLoaded) result = result.filter(item => bookmarks.includes(item.complexId));
    return result;
  }, [items, districtQuery, searchQuery, showBookmarksOnly, bookmarks, isLoaded]);

  if (boardError) return <div className="p-4 text-sm text-rose-400">Error: {boardError}</div>;

  return (
    <>
      {/* 🚨 반응형 박스 래퍼: 모바일에서도 삐져나가지 않도록 flex-col 과 overflow-hidden 으로 꽉 묶습니다! */}
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-700/50 bg-[#0b1118]/90 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_40px_rgba(0,0,0,0.4)] backdrop-blur-sm">
        
        {/* --- 상단 컨트롤 패널 --- */}
        <div className="shrink-0 flex flex-col gap-3 border-b border-slate-800/80 p-4 lg:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-slate-100 sm:text-lg">KOAPTIX 500 Rankings</h2>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* 스위치 탭 */}
            <div className="flex w-full lg:w-auto rounded-lg border border-slate-700/50 bg-black/40 p-1">
              <button
                onClick={() => setShowBookmarksOnly(false)}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                  !showBookmarksOnly ? "bg-slate-700 text-white shadow" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                전체 스캔
              </button>
              <button
                onClick={() => setShowBookmarksOnly(true)}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                  showBookmarksOnly ? "bg-yellow-500/10 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.1)]" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                ★ MY RADAR
              </button>
            </div>

            {/* 🚨 검색창 폭 제어 (모바일: 100% / PC: 최대 폭 제한) */}
            <div className="w-full lg:max-w-[200px]">
              <input
                type="text"
                placeholder="단지명, 구, 동 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-2 text-sm text-slate-200 outline-none transition-all focus:border-cyan-500/50 focus:bg-slate-800/60"
              />
            </div>
          </div>

          {(districtQuery || searchQuery) && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500">Active:</span>
              {districtQuery && (
                <div className="flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-400">
                  <span>📍 {districtQuery}</span>
                  <button onClick={clearDistrict} className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-cyan-400/60 transition-all hover:bg-cyan-500/20 hover:text-cyan-300">✕</button>
                </div>
              )}
              {searchQuery && (
                <div className="flex items-center gap-1 rounded-full border border-slate-600 bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                  <span>🔍 {searchQuery}</span>
                  <button onClick={() => setSearchQuery("")} className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-600 hover:text-white">✕</button>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-1 flex justify-between text-[11px] text-slate-500">
            <span>표시 {filteredItems.length}개</span>
            <span>전체 {items.length}개</span>
          </div>
        </div>

        {/* --- 하단 리스트 영역 --- */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {/* 🚨 내부 스크롤 안전장치 (overscroll-contain) 적용! */}
          <div className="h-full min-h-0 overflow-y-auto overscroll-contain p-2 sm:p-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-500">
            {filteredItems.length > 0 ? (
              <div className="flex flex-col gap-2">
                {filteredItems.map((item) => (
                  <RankingCard 
                    key={item.complexId} 
                    item={item} 
                    isBookmarked={bookmarks.includes(item.complexId)}
                    onToggleBookmark={toggleBookmark}
                    isCompared={comparisonItems.some(p => p.complexId === item.complexId)}
                    onCompare={(e) => {
                      e.stopPropagation();
                      toggleComparisonItem(item);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-slate-500">
                <span className="text-2xl opacity-50">📡</span>
                <p className="text-sm">데이터가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ComparisonSheet
        open={isComparisonOpen}
        items={comparisonItems}
        onClose={() => setIsComparisonOpen(false)}
        onRemoveItem={(item: any) => toggleComparisonItem(item)}
        onClear={() => { setComparisonItems([]); setIsComparisonOpen(false); }}
      />
      
      {comparisonItems.length === 2 && !isComparisonOpen && (
        <button
          onClick={() => setIsComparisonOpen(true)}
          className="fixed bottom-6 left-1/2 z-[990] -translate-x-1/2 rounded-full border border-slate-700 bg-slate-950/95 px-4 py-2 text-xs font-medium text-slate-200 shadow-2xl backdrop-blur transition hover:border-cyan-400/30 hover:text-cyan-300"
        >
          비교 다시 열기
        </button>
      )}
    </>
  );
}