"use client";

import { useMemo } from "react";
import { Map, CustomOverlayMap, useKakaoLoader } from "react-kakao-maps-sdk";
import type { RankingItem } from "../../lib/koaptix/types";

// 💡 서울 주요 구 중심 좌표
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

// 💡 잼이사의 마법: URL 토글 통신선! (히트맵과 100% 동일한 로직)
function buildUrlWithDistrict(districtName: string) {
  const params = new URLSearchParams(window.location.search);
  const currentDistrict = params.get("district");

  if (currentDistrict === districtName) {
    params.delete("district"); // 이미 눌려있으면 해제!
  } else {
    params.set("district", districtName); // 아니면 새로 장착!
  }

  const queryString = params.toString();
  return `${window.location.pathname}${queryString ? `?${queryString}` : ""}${window.location.hash}`;
}

function pushDistrictToUrl(districtName: string) {
  const nextUrl = buildUrlWithDistrict(districtName);
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (currentUrl !== nextUrl) {
    window.history.pushState(null, "", nextUrl);
  }
}

export function NeonMap({ items }: { items: RankingItem[] }) {
  // 카카오맵 스크립트 강제 로딩!
  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY as string,
  });

  // 💡 잼이사의 처방: 동명이인 충돌 방지 및 데이터 계산
  const mapData = useMemo(() => {
    const grouped = new globalThis.Map<string, any>();

    items.forEach((item) => {
      const district = item.sigunguName?.trim() || "기타";
      if (!DISTRICT_COORDS[district]) return;

      const current = grouped.get(district) || {
        name: district,
        coords: DISTRICT_COORDS[district],
        totalMarketCap: 0,
        totalDelta: 0,
        count: 0,
      };

      current.totalMarketCap += item.marketCapKrw;
      current.totalDelta += item.rankDelta7d;
      current.count += 1;
      grouped.set(district, current);
    });

    return Array.from(grouped.values()).map((g) => ({
      ...g,
      averageDelta: g.count > 0 ? g.totalDelta / g.count : 0,
    }));
  }, [items]);

  if (error) return <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">지도 로딩 에러: API 키를 확인하세요.</div>;
  if (loading) return <div className="h-[450px] w-full animate-pulse rounded-2xl border border-white/10 bg-white/5" />;

  return (
    <section className="overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_50px_rgba(0,0,0,0.3)]">
      <div className="border-b border-white/5 px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/70">TACTICAL RADAR</p>
        <h2 className="mt-1 text-lg font-semibold text-white">서울 자본 흐름 전술 맵</h2>
      </div>

      <div className="relative h-[450px] w-full bg-[#0b1118]">
        {/* 다크모드 강제 튜닝 필터 */}
        <div 
          className="absolute inset-0 z-0 [&>div]:h-full [&>div]:w-full" 
          style={{ filter: 'invert(100%) hue-rotate(180deg) brightness(85%) contrast(110%) grayscale(20%)' }}
        >
          <Map
            center={{ lat: 37.525, lng: 126.99 }}
            style={{ width: "100%", height: "100%" }}
            level={8}
            disableDoubleClickZoom={true}
          >
            {mapData.map((data) => {
              const isRising = data.averageDelta >= 0;
              const ringColor = isRising ? "border-cyan-400" : "border-fuchsia-400";
              const glowColor = isRising ? "rgba(34,211,238,0.5)" : "rgba(232,121,249,0.5)";
              const bgColor = isRising ? "bg-cyan-400/20" : "bg-fuchsia-400/20";
              const textColor = isRising ? "text-cyan-100" : "text-fuchsia-100";
              
              // 시가총액 크기에 따라 네온 원 크기 조절 (최소 60px ~ 최대 130px)
              const size = Math.max(60, Math.min(130, (data.totalMarketCap / 1000000000000) * 1.5));

              return (
                <CustomOverlayMap
                  key={data.name}
                  position={data.coords}
                  yAnchor={0.5}
                  xAnchor={0.5}
                >
                  {/* 💡 전술 클릭 액션(onClick) 장착 완료!! */}
                  <div
                    onClick={() => pushDistrictToUrl(data.name)}
                    className={`flex flex-col items-center justify-center rounded-full border-[1.5px] backdrop-blur-md transition-transform hover:scale-110 cursor-pointer ${ringColor} ${bgColor}`}
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      boxShadow: `0 0 20px ${glowColor}, inset 0 0 10px ${glowColor}`,
                      filter: 'invert(100%) hue-rotate(180deg)',
                    }}
                  >
                    <span className="text-[11px] font-bold text-white drop-shadow-md pointer-events-none">{data.name}</span>
                    <span className={`mt-0.5 text-[12px] font-black tracking-tighter ${textColor} drop-shadow-md pointer-events-none`}>
                      {isRising ? "▲" : "▼"}{Math.abs(data.averageDelta).toFixed(1)}
                    </span>
                  </div>
                </CustomOverlayMap>
              );
            })}
          </Map>
        </div>
        {/* 상단 덮어씌우는 글래스 글로우 효과 */}
        <div className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_60px_rgba(11,17,24,1)]" />
      </div>
    </section>
  );
}