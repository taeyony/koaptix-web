import { ImageResponse } from "next/og";
import { getLatestRankBoard } from "../../../lib/koaptix/queries";
import { formatKrwCompact } from "../../../lib/formatters";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

type RouteParams = Promise<{ id: string }> | { id: string };

export default async function OpenGraphImage({ params }: { params: RouteParams }) {
  const { id } = await params;
  let row: Awaited<ReturnType<typeof getLatestRankBoard>>[number] | null = null;
  try {
    [row] = await getLatestRankBoard("KOREA_ALL", 1, { complexId: id });
  } catch {
    // No legacy detail, unverified candidate, zero or invented rank fallback.
  }
  const title = row?.apt_name_ko ?? "우리 아파트, 전국에서 몇 등일까?";
  const location = row ? [row.sigungu_name, row.legal_dong_name].filter(Boolean).join(" ") : "공개된 아파트의 추정 시가총액과 순위를 확인해 보세요.";
  const metrics = row ? [
    { label: "전국 공개 순위", value: Number(row.rank_all).toLocaleString("ko-KR") + "위" },
    { label: "단지 전체 추정 시가총액", value: formatKrwCompact(row.market_cap_krw) },
  ] : [];

  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", padding: 40, background: "#05090f", color: "#eaf2ff", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", width: "100%", padding: 36, border: "1px solid #234756", borderRadius: 30, background: "#0b141e" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 24, color: "#67e8f9" }}>
          <span style={{ fontWeight: 700, letterSpacing: "0.08em" }}>KOAPTIX</span>
          <span style={{ fontSize: 22, color: "#b5c6d6" }}>아파트 시가총액 랭킹</span>
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: title.length > 16 ? 48 : 64, fontWeight: 700, lineHeight: 1.25, flexShrink: 0 }}>{title}</div>
        <div style={{ display: "flex", marginTop: 12, fontSize: 26, color: "#c1cedb", lineHeight: 1.4, flexShrink: 0 }}>{location}</div>
        {metrics.length ? <div style={{ display: "flex", gap: 20, marginTop: 28, flexShrink: 0 }}>
          {metrics.map(metric => <div key={metric.label} style={{ display: "flex", flexDirection: "column", flex: 1, padding: "18px 22px", border: "1px solid #2d455a", borderRadius: 18, background: "#112331" }}>
            <div style={{ display: "flex", fontSize: 22, color: "#bdccdc" }}>{metric.label}</div>
            <div style={{ display: "flex", marginTop: 8, fontSize: 46, fontWeight: 700, color: "#f2f7fc" }}>{metric.value}</div>
          </div>)}
        </div> : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: "auto", paddingTop: 22 }}>
          <div style={{ display: "flex", fontSize: 24, color: "#67e8f9" }}>{row ? row.snapshot_date + " 기준 · 전국 공개 랭킹" : "공개 순위가 확인된 단지를 안내합니다"}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 20, color: "#b3c2d1" }}>
            <span>실거래가·세대수 기반 참고 정보 · 집 한 채의 가격이 아닙니다</span>
            <span>koaptix.com</span>
          </div>
        </div>
      </div>
    </div>,
    { ...size, headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
