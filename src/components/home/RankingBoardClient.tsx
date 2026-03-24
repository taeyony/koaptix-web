"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { RankingCard } from "./RankingCard";
import type { RankingItem } from "../../lib/koaptix/types";
import { useBookmarks } from "../../hooks/useBookmarks";

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
    // 🚨 핵심 포인트: h-full을 주어 부모가 준 공간을 꽉 채우고, 밖으로 튀어나가지 않게 막습니다!
    <div className="flex h-full flex-col rounded-2xl border border-slate-700/50 bg-[#0b1118]/90 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_40px_rgba(0,0,0,0.4)] backdrop-blur-sm">
      
      {/* --- 상단 컨트롤 패널 (고정 영역) --- */}
      <div className="shrink-0 flex flex-col gap-3 border-b border-slate-800/80 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight text-slate-100 sm:text-lg">KOAPTIX 500 Rankings</h2>
        </div>

        {/* 탭 버튼 (색상 톤 다운 적용) */}
        <div className="flex rounded-lg border border-slate-700/50 bg-black/40 p-1">
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

        {/* 검색창 */}
        <input
          type="text"
          placeholder="단지명, 구, 동 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-2.5 text-sm text-slate-200 outline-none transition-all focus:border-cyan-500/50 focus:bg-slate-800/60"
        />

        {/* 상태 칩 */}
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

      {/* 🚨 하단 리스트 영역 (내부 스크롤 영역!!) 🚨 */}
      {/* 🚨 3. 여기도 'min-h-0' 추가!! */}
      <div className="flex-1 overflow-y-auto min-h-0 p-2 sm:p-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-500">
        {filteredItems.length > 0 ? (
          <div className="flex flex-col gap-2">
            {filteredItems.map((item) => (
// ... (이하 기존 코드 유지) ...
              <RankingCard 
                key={item.complexId} 
                item={item} 
                isBookmarked={bookmarks.includes(item.complexId)}
                onToggleBookmark={toggleBookmark}
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
  );
}