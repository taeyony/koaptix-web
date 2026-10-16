import type { Metadata } from "next";
import { Suspense } from "react";
import { NeonMapPage } from "../../components/home/NeonMapPage";

export const metadata: Metadata = {
  title: "지역별 시가총액 네온맵 | KOAPTIX",
  description: "공개 랭킹 최대 1,000개 아파트의 시가총액 분포를 카카오 지도에서 확인하세요. 지역 전체 시장의 합계가 아닌 공개 단지 표본입니다.",
  alternates: { canonical: "/map" },
};

export default function MapPage() {
  return <Suspense fallback={<p className="p-8 text-ink" role="status">상세 지도를 준비하고 있어요…</p>}><NeonMapPage /></Suspense>;
}
