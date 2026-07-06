import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  metadataBase: new URL('https://www.koaptix.com'),
  title: "KOAPTIX | 전국 아파트 자본 흐름 랭킹",
  description: "KOAPTIX는 단지별 추정 시가총액과 순위 변화를 기준으로 전국·지역·시군구 아파트 흐름을 관측하는 랭킹 터미널입니다. 투자 추천이나 공식 가격지수가 아닙니다.",
  openGraph: {
    title: "KOAPTIX | 전국 아파트 랭킹 관측소",
    description: "관측자 Y가 전국 아파트 자본 흐름을 기록합니다. KOAPTIX는 추천하지 않고, 추정 시가총액과 순위 변화를 관측하고 비교합니다.",
    url: "https://www.koaptix.com", // 의장님의 본섭 주소!
    siteName: "KOAPTIX",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
