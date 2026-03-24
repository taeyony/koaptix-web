"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Map, CustomOverlayMap, useKakaoLoader } from "react-kakao-maps-sdk";
import type { RankingItem } from "../../lib/koaptix/types";

const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  강남구: { lat: 37.5172, lng: 127.0473 },
  서초구: { lat: 37.4837, lng: 127.0324 },
  송파구: { lat: 37.5145, lng: 127.1066 },
  용산구: { lat: 37.5326, lng: 126.9900 },
  성동구: { lat: 37.5635, lng: 127.0365 },
  마포구: { lat: 37.5665, lng: 126.9015 },
  동작구: { lat: 37.5124, lng: 126.9393 },
  강동구: { lat: 37.5301, lng: 127.1238 },
  양천구: { lat: 37.5169, lng: 126.8664 },
  영등포구: { lat: 37.5264, lng: 126.8963 },
  중구: { lat: 37.5636, lng: 126.9976 },
  종로구: { lat: 37.5729, lng: 126.9793 },
  광진구: { lat: 37.5385, lng: 127.0823 },
  서대문구: { lat: 37.5791, lng: 126.9368 },
};

function buildUrlWithDistrict(districtName: string) {
  const params = new URLSearchParams(window.location.search);
  const currentDistrict = params.get("district");
  if (currentDistrict === districtName) params.delete("district");
  else params.set("district", districtName);
  return `${window.location.pathname}?${params.toString()}${window.location.hash}`;
}

function pushDistrictToUrl(districtName: string) {
  const nextUrl = buildUrlWithDistrict(districtName);
  if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
    window.history.pushState(null, "", nextUrl);
  }
}

export function NeonMap({ items }: { items: RankingItem[] }) {
  const searchParams = useSearchParams();
  const currentDistrict = searchParams?.get("district");

  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY as string,
  });

  const mapData = useMemo(() => {
    const grouped = new globalThis.Map<string, any>();
    items.forEach((item) => {
      const district = item.sigunguName?.trim() || "기타";
      if (!DISTRICT_COORDS[district]) return;
      const current = grouped.get(district) || { name: district, coords: DISTRICT_COORDS[district], totalMarketCap: 0, totalDelta: 0, count: 0 };
      current.totalMarketCap += item.marketCapKrw;
      current.totalDelta += item.rankDelta7d;
      current.count += 1;
      grouped.set(district, current);
    });
    return Array.from(grouped.values()).map((g) => ({ ...g, averageDelta: g.count > 0 ? g.totalDelta / g.count : 0 }));
  }, [items]);

  if (error) return <div className="p-4 text-sm text-rose-400">지도 로딩 에러</div>;
  if (loading) return <div className="h-[450px] w-full animate-pulse rounded-2xl border border-slate-800 bg-slate-900/50" />;

  return (
    // 🚨 구조선 색상 리셋: 튀는 Cyan 테두리를 차분한 Slate로 변경!
    <section className="overflow-hidden rounded-2xl border border-slate-700/50 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_40px_rgba(0,0,0,0.4)]">
      <div className="border-b border-slate-800/80 px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">TACTICAL RADAR</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-100">서울 자본 흐름 전술 맵</h2>
      </div>

      <div className="relative h-[450px] w-full bg-[#0b1118]">
        <div 
          className="absolute inset-0 z-0 [&>div]:h-full [&>div]:w-full opacity-80" 
          style={{ filter: 'invert(100%) hue-rotate(180deg) brightness(80%) contrast(110%) grayscale(30%)' }}
        >
          <Map center={{ lat: 37.525, lng: 126.99 }} style={{ width: "100%", height: "100%" }} level={8} disableDoubleClickZoom={true}>
            {mapData.map((data) => {
              const isRising = data.averageDelta >= 0;
              const isSelected = data.name === currentDistrict; 
              
              // 🚨 지차장 룰 적용: 기본은 에메랄드(상승)/로즈(하락), 선택(포커스) 시에만 시안(Cyan)!!
              let ringColor = isRising ? "border-emerald-500/60" : "border-rose-500/60";
              let glowColor = isRising ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)";
              let bgColor = isRising ? "bg-emerald-500/10" : "bg-rose-500/10";
              let textColor = isRising ? "text-emerald-400" : "text-rose-400";

              // 유저가 클릭(선택)했을 때만 네온 발광 폭발!! (인터랙션 피드백)
              if (isSelected) {
                ringColor = "border-cyan-400";
                glowColor = "rgba(34,211,238,0.7)";
                bgColor = "bg-cyan-500/30";
                textColor = "text-cyan-100";
              }
              
              const size = Math.max(60, Math.min(130, (data.totalMarketCap / 1000000000000) * 1.5));

              return (
                <CustomOverlayMap key={data.name} position={data.coords} yAnchor={0.5} xAnchor={0.5} zIndex={isSelected ? 50 : 1}>
                  <div
                    onClick={() => pushDistrictToUrl(data.name)}
                    // 🚨 hover 시에도 살짝 시안빛이 돌도록 통일!
                    className={`group flex flex-col items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-cyan-400/80 cursor-pointer ${ringColor} ${bgColor} ${isSelected ? 'ring-2 ring-white scale-110' : ''}`}
                    style={{
                      width: `${size}px`, height: `${size}px`,
                      boxShadow: `0 0 20px ${glowColor}, inset 0 0 10px ${glowColor}`,
                      filter: 'invert(100%) hue-rotate(180deg)',
                    }}
                  >
                    <span className="text-[11px] font-bold text-slate-100 drop-shadow-md pointer-events-none transition-colors group-hover:text-white">{data.name}</span>
                    <span className={`mt-0.5 text-[12px] font-black tracking-tighter ${textColor} drop-shadow-md pointer-events-none transition-colors group-hover:text-cyan-300`}>
                      {isRising ? "▲" : "▼"}{Math.abs(data.averageDelta).toFixed(1)}
                    </span>
                  </div>
                </CustomOverlayMap>
              );
            })}
          </Map>
        </div>
        <div className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_80px_rgba(11,17,24,1)]" />
      </div>
    </section>
  );
}