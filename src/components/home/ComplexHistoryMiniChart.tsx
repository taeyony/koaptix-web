"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoryChartPoint } from "../../lib/koaptix/types";

function formatMarketCapCompact(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "-";

  const TRILLION = 1_000_000_000_000;
  const HUNDRED_MILLION = 100_000_000;

  if (value >= TRILLION) {
    const amount = value / TRILLION;
    return `${amount >= 100 ? amount.toFixed(0) : amount.toFixed(1)}조`;
  }

  if (value >= HUNDRED_MILLION) {
    const amount = value / HUNDRED_MILLION;
    return `${amount >= 100 ? amount.toFixed(0) : amount.toFixed(1)}억`;
  }

  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

function formatMarketCapFull(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

export function ComplexHistoryMiniChart({
  data,
}: {
  data: HistoryChartPoint[];
}) {
  const trend = useMemo(() => {
    if (data.length < 2) return 0;
    return data[data.length - 1].value - data[0].value;
  }, [data]);

  const isUp = trend >= 0;
  const stroke = isUp ? "#22d3ee" : "#e879f9";
  const shadow = isUp
    ? "drop-shadow(0 0 10px rgba(34,211,238,0.45))"
    : "drop-shadow(0 0 10px rgba(232,121,249,0.45))";

  return (
    <div className="relative h-[220px] w-full overflow-hidden rounded-2xl border border-white/8 bg-black/25 [background-image:linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px]">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background: isUp
            ? "radial-gradient(circle at top right, rgba(34,211,238,0.12), transparent 40%)"
            : "radial-gradient(circle at top right, rgba(232,121,249,0.12), transparent 40%)",
        }}
      />

      <div className="relative h-full w-full px-1 py-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid
              vertical={false}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="3 3"
            />

            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              minTickGap={18}
              tickMargin={10}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
            />

            <YAxis
              width={56}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatMarketCapCompact(Number(value))}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
            />

            <Tooltip
              cursor={{
                stroke: isUp ? "rgba(34,211,238,0.22)" : "rgba(232,121,249,0.22)",
                strokeWidth: 1,
              }}
              contentStyle={{
                background: "#081018",
                border: `1px solid ${
                  isUp ? "rgba(34,211,238,0.18)" : "rgba(232,121,249,0.18)"
                }`,
                borderRadius: 16,
              }}
              labelFormatter={(label, payload) => {
                const point = payload?.[0]?.payload as HistoryChartPoint | undefined;
                return point?.snapshotDate ?? String(label);
              }}
              formatter={(value) => formatMarketCapFull(Number(value))}
            />

            <Line
              type="monotone"
              dataKey="value"
              stroke={stroke}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: stroke, strokeWidth: 0 }}
              style={{ filter: shadow }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}