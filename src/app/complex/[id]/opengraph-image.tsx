import { ImageResponse } from "next/og";
import { mapComplexDetailRow } from "../../../lib/koaptix/mappers";
import { getComplexDetailById } from "../../../lib/koaptix/queries";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

type RouteParams =
  | Promise<{ id: string }>
  | { id: string };

function formatMarketCapKrw(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "-";

  const TRILLION = 1_000_000_000_000;
  const HUNDRED_MILLION = 100_000_000;

  if (value >= TRILLION) {
    const amount = value / TRILLION;
    const digits = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
    return `${amount.toFixed(digits)}조원`;
  }

  if (value >= HUNDRED_MILLION) {
    const amount = value / HUNDRED_MILLION;
    const digits = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
    return `${amount.toFixed(digits)}억원`;
  }

  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

function formatWeeklyRankDelta(delta: number): string {
  if (delta > 0) return `▲ +${delta}`;
  if (delta < 0) return `▼ ${delta}`;
  return "— 0";
}

function formatMomentumW(value: number): string {
  if (value > 0) return `+${value.toFixed(2)}%`;
  if (value < 0) return `${value.toFixed(2)}%`;
  return "0.00%";
}

function deltaColor(delta: number): string {
  if (delta > 0) return "#34d399";
  if (delta < 0) return "#fb7185";
  return "rgba(234,242,255,0.55)";
}

function momentumColor(value: number): string {
  if (value > 0) return "#67e8f9";
  if (value < 0) return "#f0abfc";
  return "rgba(234,242,255,0.55)";
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        width: "48%",
        padding: "20px 24px",
        borderRadius: 24,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <div
        style={{
          fontSize: 22,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(234,242,255,0.45)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 38,
          fontWeight: 700,
          color: color ?? "#eaf2ff",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default async function OpenGraphImage({
  params,
}: {
  params: RouteParams;
}) {
  const resolvedParams = await Promise.resolve(params);

  let detail:
    | ReturnType<typeof mapComplexDetailRow>
    | null = null;

  try {
    const row = await getComplexDetailById(resolvedParams.id);
    detail = row ? mapComplexDetailRow(row) : null;
  } catch {
    detail = null;
  }

  const title = detail?.name ?? "KOAPTIX";
  const location = detail?.locationLabel ?? "서울 아파트 주간 모멘텀 보드";
  const rankLabel = detail ? `#${detail.rank}` : "LIVE";
  const marketCapLabel = detail
    ? formatMarketCapKrw(detail.marketCapKrw)
    : "주간 자본 흐름";
  const weeklyRankDeltaLabel = detail
    ? formatWeeklyRankDelta(detail.rankDelta7d)
    : "— 0";
  const weeklyRankDeltaTone = detail
    ? deltaColor(detail.rankDelta7d)
    : "rgba(234,242,255,0.55)";
  const momentumLabel = detail
    ? formatMomentumW(detail.marketCapDeltaPct7d)
    : "0.00%";
  const momentumTone = detail
    ? momentumColor(detail.marketCapDeltaPct7d)
    : "rgba(234,242,255,0.55)";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(circle at top left, rgba(34,211,238,0.16), transparent 30%), #05070b",
          color: "#eaf2ff",
          padding: 44,
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            borderRadius: 32,
            border: "1px solid rgba(34,211,238,0.14)",
            background:
              "linear-gradient(180deg, rgba(11,17,24,0.96) 0%, rgba(8,12,18,0.98) 100%)",
            padding: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "rgba(103,232,249,0.78)",
            }}
          >
            KOAPTIX LIVE BOARD
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            {title}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 16,
              fontSize: 30,
              color: "rgba(234,242,255,0.6)",
            }}
          >
            {location}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 18,
              marginTop: 42,
            }}
          >
            <Metric label="현재 순위" value={rankLabel} />
            <Metric label="시가총액" value={marketCapLabel} />
            <Metric
              label="주간 순위 변동"
              value={weeklyRankDeltaLabel}
              color={weeklyRankDeltaTone}
            />
            <Metric
              label="Momentum (W)"
              value={momentumLabel}
              color={momentumTone}
            />
          </div>

          <div
            style={{
              display: "flex",
              marginTop: "auto",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 24,
                color: "rgba(234,242,255,0.48)",
              }}
            >
              최근 7일 기준 모멘텀 분석 · koaptix.com
            </div>

            <div
              style={{
                display: "flex",
                padding: "14px 22px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                fontSize: 24,
                color: "#67e8f9",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              Weekly Share
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}