import type { ComparisonFacts } from "../../lib/koaptix/comparisonFacts";
import { formatKrwCompact } from "../../lib/formatters";

export function ComparisonShareImage({ facts }: { facts: ComparisonFacts | null }) {
  return <div style={{ display: "flex", width: "100%", height: "100%", padding: 40, background: "#05090f", color: "#eaf2ff", fontFamily: "sans-serif" }}>
    <div style={{ display: "flex", flexDirection: "column", width: "100%", padding: 32, border: "1px solid #234756", borderRadius: 28, background: "#0b141e" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#67e8f9", fontSize: 24 }}><span>KOAPTIX · 단지 맞대결</span><span style={{ color: "#bdccdc", fontSize: 22 }}>koaptix.com</span></div>
      {facts ? <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
        <div style={{ display: "flex", marginTop: 24, color: "#bdccdc", fontSize: 23 }}>{facts.scopeLabel} · {facts.publication.snapshot_date} 기준</div>
        <div style={{ display: "flex", width: "100%", gap: 24, marginTop: 24 }}>
          {[facts.left, facts.right].map((item, index) => <div key={item.complexId} style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, height: 220, padding: 24, borderRadius: 18, border: "1px solid #2d455a", background: "#112331" }}>
            <div style={{ display: "flex", fontSize: 20, color: "#b5c6d6" }}>{index === 0 ? "첫 번째 단지" : "두 번째 단지"} · 공개 {item.rank}위</div>
            <div style={{ display: "flex", marginTop: 14, fontWeight: 700, fontSize: item.name.length > 18 ? 27 : 34, lineHeight: 1.25, maxHeight: 90, overflow: "hidden" }}>{item.name}</div>
            <div style={{ display: "flex", marginTop: "auto", paddingTop: 12, color: "#67e8f9", fontSize: 39, fontWeight: 700 }}>{formatKrwCompact(item.marketCapKrw)}</div>
          </div>)}
        </div>
        <div style={{ display: "flex", marginTop: 22, fontSize: 28, lineHeight: 1.4 }}>{facts.differenceLabel}</div>
      </div> : <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
        <div style={{ display: "flex", marginTop: 70, fontSize: 52, fontWeight: 700 }}>어느 단지의 시총이 더 클까?</div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 28, color: "#bdccdc" }}>같은 기준일의 공개 자료를 확인한 뒤 비교해 주세요.</div>
      </div>}
      <div style={{ display: "flex", marginTop: "auto", paddingTop: 18, fontSize: 20, color: "#bdccdc" }}>단지 전체 추정 시가총액 · 집 한 채의 가격이나 투자 추천이 아닙니다</div>
    </div>
  </div>;
}
