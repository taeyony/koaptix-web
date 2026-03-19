import {
  formatKrwCompact,
  formatMarketCapTrillion,
  formatRankDelta,
  formatRatio,
  movementColor,
} from "../../lib/formatters";
import type { KoaptixRankItem } from "../../types/koaptix";
import { TierBadge } from "./TierBadge";

interface Props {
  items: KoaptixRankItem[];
  totalRankedComplexes: number;
}

export function RankBoard({ items, totalRankedComplexes }: Props) {
  return (
    <section
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 24,
        background: "#ffffff",
        padding: 20,
        display: "grid",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 14, color: "#64748b", marginBottom: 6 }}>서울 최신 랭킹</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a" }}>KOAPTIX Top 50</div>
        </div>
        <div style={{ fontSize: 14, color: "#64748b" }}>
          현재 랭크 편입 단지 <strong style={{ color: "#0f172a" }}>{totalRankedComplexes.toLocaleString("ko-KR")}개</strong>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((item) => (
          <article
            key={item.complex_id}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 20,
              padding: 16,
              display: "grid",
              gridTemplateColumns: "92px minmax(0, 1fr) minmax(220px, 280px)",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
              <TierBadge tierCode={item.tier_code} />
              <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a" }}>#{item.rank_all}</div>
              <div style={{ fontSize: 12, color: movementColor(item.rank_movement), fontWeight: 800 }}>
                {formatRankDelta(item)}
              </div>
            </div>

            <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.apt_name_ko}
              </div>
              <div style={{ color: "#475569", fontSize: 14 }}>
                {(item.sigungu_name ?? "-")} · {(item.legal_dong_name ?? "-")}
              </div>
              <div style={{ color: "#64748b", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.address_road ?? item.address_jibun ?? "-"}
              </div>
            </div>

            <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a" }}>
                {formatMarketCapTrillion(item.market_cap_trillion_krw)}
              </div>
              <div style={{ color: "#475569", fontSize: 14 }}>시총 비중 {item.market_cap_share_pct ?? "-"}%</div>
              <div style={{ color: "#64748b", fontSize: 13 }}>가치 {formatKrwCompact(item.market_cap_krw)}</div>
              <div style={{ color: "#64748b", fontSize: 13 }}>세대 커버리지 {formatRatio(item.priced_household_ratio)}</div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
