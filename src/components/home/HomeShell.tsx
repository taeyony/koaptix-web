import { HomeHero } from "./HomeHero";
import { IndexSparkline } from "./IndexSparkline";
import { RankBoard } from "./RankBoard";
import type { KoaptixHomeApiData } from "../../types/koaptix";

export function HomeShell({ data }: { data: KoaptixHomeApiData }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "32px 20px 64px",
          display: "grid",
          gap: 24,
        }}
      >
        <header style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 13, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            KOAPTIX · 서울 아파트 시가총액 랭킹 / 지수
          </div>
          <h1 style={{ margin: 0, fontSize: 42, lineHeight: 1.05, fontWeight: 900 }}>
            KOAPTIX 500 우량주 지수
          </h1>
          <p style={{ margin: 0, fontSize: 16, color: "#475569", maxWidth: 820 }}>
            메인 화면은 랭킹이 주인공이고, KOAPTIX 지수는 시장 온도계입니다. 톤은 약간 B급 증권소, 계산은 진지한 원칙을 그대로 유지합니다.
          </p>
        </header>

        <HomeHero card={data.indexCard} />
        <IndexSparkline points={data.chart} />
        <RankBoard items={data.topRanks} totalRankedComplexes={data.totalRankedComplexes} />
      </div>
    </main>
  );
}
