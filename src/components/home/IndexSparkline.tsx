import { formatMonthLabel, movementColor, toNumber } from "../../lib/formatters";
import type { KoaptixIndexChartPoint } from "../../types/koaptix";

interface Props {
  points: KoaptixIndexChartPoint[];
  width?: number;
  height?: number;
}

export function IndexSparkline({ points, width = 920, height = 260 }: Props) {
  if (!points.length) {
    return (
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 20,
          background: "#ffffff",
          padding: 24,
          color: "#64748b",
        }}
      >
        차트 데이터가 없습니다.
      </div>
    );
  }

  const numeric = points
    .map((point) => ({
      ...point,
      value: toNumber(point.index_value),
    }))
    .filter((point): point is KoaptixIndexChartPoint & { value: number } => point.value !== null);

  if (!numeric.length) {
    return (
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 20,
          background: "#ffffff",
          padding: 24,
          color: "#64748b",
        }}
      >
        차트 값을 숫자로 읽지 못했습니다.
      </div>
    );
  }

  const padding = { top: 20, right: 24, bottom: 38, left: 28 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const min = Math.min(...numeric.map((p) => p.value));
  const max = Math.max(...numeric.map((p) => p.value));
  const range = Math.max(max - min, 1);

  const linePath = numeric
    .map((point, index) => {
      const x = padding.left + (numeric.length === 1 ? innerWidth / 2 : (index / (numeric.length - 1)) * innerWidth);
      const y = padding.top + innerHeight - ((point.value - min) / range) * innerHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const latest = numeric[numeric.length - 1];
  const latestChange = toNumber(latest.change_1m);
  const stroke = movementColor(
    latestChange === null ? "flat" : latestChange > 0 ? "up" : latestChange < 0 ? "down" : "flat",
  );

  return (
    <section
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 24,
        background: "#ffffff",
        padding: 20,
        display: "grid",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}>
        <div>
          <div style={{ fontSize: 14, color: "#64748b", marginBottom: 6 }}>KOAPTIX 서울 추이</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>KOAPTIX 500 우량주 지수</div>
        </div>
        <div style={{ fontSize: 13, color: "#64748b" }}>
          {formatMonthLabel(numeric[0].snapshot_date)} ~ {formatMonthLabel(latest.snapshot_date)}
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="auto" role="img" aria-label="KOAPTIX line chart">
        <defs>
          <linearGradient id="koaptix-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerHeight} stroke="#e2e8f0" />
        <line
          x1={padding.left}
          y1={padding.top + innerHeight}
          x2={padding.left + innerWidth}
          y2={padding.top + innerHeight}
          stroke="#e2e8f0"
        />

        {[0, 0.5, 1].map((ratio) => {
          const y = padding.top + innerHeight - ratio * innerHeight;
          const value = min + ratio * range;
          return (
            <g key={ratio}>
              <line x1={padding.left} y1={y} x2={padding.left + innerWidth} y2={y} stroke="#f1f5f9" />
              <text x={4} y={y + 4} fontSize="11" fill="#94a3b8">
                {value.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}
              </text>
            </g>
          );
        })}

        <path
          d={`${linePath} L ${padding.left + innerWidth} ${padding.top + innerHeight} L ${padding.left} ${
            padding.top + innerHeight
          } Z`}
          fill="url(#koaptix-fill)"
          opacity="0.8"
        />
        <path d={linePath} fill="none" stroke={stroke} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

        {numeric.map((point, index) => {
          const x = padding.left + (numeric.length === 1 ? innerWidth / 2 : (index / (numeric.length - 1)) * innerWidth);
          const y = padding.top + innerHeight - ((point.value - min) / range) * innerHeight;
          const isLast = index === numeric.length - 1;
          return (
            <g key={point.snapshot_date}>
              <circle cx={x} cy={y} r={isLast ? 5 : 3.5} fill={isLast ? "#ffffff" : stroke} stroke={stroke} strokeWidth="2" />
              <text x={x} y={height - 10} textAnchor="middle" fontSize="11" fill="#94a3b8">
                {formatMonthLabel(point.snapshot_date)}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}
