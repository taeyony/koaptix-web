import {
  formatDateLabel,
  formatIndexValue,
  formatKrwCompact,
  formatPercent,
  formatSignedNumber,
  movementColor,
} from "../../lib/formatters";
import type { KoaptixIndexCard } from "../../types/koaptix";

interface Props {
  card: KoaptixIndexCard;
}

export function HomeHero({ card }: Props) {
  const movement = card.movement_1m ?? "flat";
  const accent = movementColor(movement);

  return (
    <section
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 24,
        background:
          "linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(17,24,39,1) 38%, rgba(30,41,59,1) 100%)",
        color: "#f8fafc",
        padding: 28,
        display: "grid",
        gap: 20,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 14, letterSpacing: "0.08em", color: "#cbd5e1", textTransform: "uppercase" }}>
            KOAPTIX 서울
          </div>
          <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1 }}>{formatIndexValue(card.index_value)}</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.12)",
                color: accent,
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              {formatSignedNumber(card.change_1m)} ({formatPercent(card.change_pct_1m)})
            </span>
            <span style={{ color: "#cbd5e1", fontSize: 14 }}>
              기준일 {formatDateLabel(card.base_date)} = {formatIndexValue(card.base_value)}
            </span>
          </div>
        </div>

        <div style={{ minWidth: 280, display: "grid", gap: 8 }}>
          <MetricRow label="스냅샷 기준일" value={formatDateLabel(card.snapshot_date)} />
          <MetricRow label="전월 시가총액" value={formatKrwCompact(card.prev_month_total_market_cap_krw)} />
          <MetricRow label="현재 시가총액" value={formatKrwCompact(card.total_market_cap_krw)} />
          <MetricRow label="전월 대비 시총" value={`${formatKrwCompact(card.market_cap_change_1m)} / ${formatPercent(card.market_cap_change_pct_1m)}`} />
          <MetricRow label="편입 단지 수" value={`${card.component_complex_count.toLocaleString("ko-KR")}개`} />
        </div>
      </div>
    </section>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 14 }}>
      <span style={{ color: "#94a3b8" }}>{label}</span>
      <strong style={{ color: "#f8fafc" }}>{value}</strong>
    </div>
  );
}
