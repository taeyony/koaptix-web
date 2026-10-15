import type { ReactNode } from "react";
import "./globals.css";

const siteTitle = "KOAPTIX | 우리 아파트 순위 찾기";

export const metadata = {
  metadataBase: new URL('https://www.koaptix.com'),
  title: siteTitle,
  description: "우리 아파트는 몇 등일까요? 실제 거래와 세대수로 추정한 단지 전체의 가치와 전국·지역별 순위를 확인해 보세요. 공식 가격지수나 투자 추천이 아닙니다.",
  openGraph: {
    title: siteTitle,
    description: "우리 아파트는 몇 등일까요? KOAPTIX에서 단지 전체의 추정 가치와 전국·지역별 순위를 찾아보세요. 투자 추천이 아닌 참고 정보입니다.",
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
    <html lang="ko" data-theme="night" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try { document.documentElement.dataset.theme = localStorage.getItem("koaptix-theme-mode") === "day" ? "day" : "night"; } catch {}` }} />
        <link rel="preload" href="/fonts/pretendard/PretendardVariable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
