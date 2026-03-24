import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "KOAPTIX | 아파트 시가총액 지수",
  description: "당신의 아파트 모멘텀은 안전합니까? 서울 주요 단지의 실시간 시가총액 흐름과 하락 압력을 즉시 스캔하십시오.",
  openGraph: {
    title: "KOAPTIX 500 | 실시간 아파트 자본 흐름 레이더",
    description: "자본의 흐름을 읽는 자가 살아남는다. HAPI가 제공하는 서울 아파트 시총지수.",
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
