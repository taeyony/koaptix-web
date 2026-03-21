"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { RankingCard } from "./RankingCard";
import { ComplexDetailSheet } from "./ComplexDetailSheet";
import type { ComplexDetail, RankingItem } from "../../lib/koaptix/types";

type RankingSortKey = "rank_asc" | "market_cap_desc" | "delta_desc" | "name_asc";

type RankingBoardClientProps = {
  items: RankingItem[];
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

export function RankingBoardClient({ items, boardError = null }: RankingBoardClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const complexIdFromUrl = searchParams.get("complexId");

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<RankingSortKey>("rank_asc");
  
  // 💡 잼이사가 살려낸 지역 필터!
  const [districtFilter, setDistrictFilter] = useState<string>("전체");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RankingItem | null>(null);
  const [detail, setDetail] = useState<ComplexDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { return () => { abortRef.current?.abort(); }; }, []);

  // 💡 잼이사가 살려낸 구(District) 추출 로직!
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
      // 💡 잼이사가 살려낸 필터 적용 로직!
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

  const buildUrlWithComplexId = useCallback((complexId: string) => {
    const nextParams = new URLSearchParams(searchParamsKey);
    nextParams.set("complexId", complexId);
    const queryString = nextParams.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }, [pathname, searchParamsKey]);

  const buildUrlWithoutComplexId = useCallback(() => {
    const nextParams = new URLSearchParams(searchParamsKey);
    nextParams.delete("complexId");
    const queryString = nextParams.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
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

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_50px_rgba(0,0,0,0.3)]">
        <div className="border-b border-white/5 px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex flex-col gap-3">
            <div className="min-w-0">
              <h2 className="mt-1 truncate text-lg font-semibold tracking-tight sm:text-xl">KOAPTIX 500 Rankings</h2>
              <p className="mt-1 text-xs text-white/45 sm:text-sm">단지명·구·동 즉시 검색 / 클릭 시 URL 동기화</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_120px]">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="단지명, 구, 동 검색" className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-cyan-300/40" />
              
              {/* 💡 잼이사가 살려낸 지역 필터 & 하얀 글씨(style) 고정! */}
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

        <div className="grid grid-cols-1 gap-2 p-2 sm:gap-3 sm:p-3 lg:max-h-[600px] lg:overflow-y-auto">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div key={item.complexId} role="button" tabIndex={0} onClick={() => void openDetailByItem(item, { syncUrl: true })} className="rounded-xl outline-none transition hover:ring-1 hover:ring-white/10 cursor-pointer">
                <RankingCard item={item} />
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm leading-6 text-white/55 text-center">검색 결과가 없습니다.</div>
          )}
        </div>
      </section>

      <ComplexDetailSheet open={sheetOpen} item={selectedItem} detail={detail} loading={detailLoading} error={detailError} onClose={() => closeDetail({ syncUrl: true })} />
    </>
  );
}