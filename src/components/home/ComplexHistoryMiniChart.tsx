"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  HistoryChartPoint,
  HistoryChartSeries,
} from "../../lib/koaptix/types";

type ComplexHistoryMiniChartProps = {
  data?: HistoryChartPoint[];
  series?: HistoryChartSeries[];
};

const DEFAULT_COLORS = ["#22d3ee", "#e879f9", "#34d399", "#f59e0b"];
const MIN_CHART_HEIGHT = 220;

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

function buildSingleSeries(data?: HistoryChartPoint[]): HistoryChartSeries[] {
  if (!data || data.length === 0) return [];

  const trend = data[data.length - 1].value - data[0].value;
  const color = trend >= 0 ? "#22d3ee" : "#e879f9";

  return [
    {
      key: "series_0",
      name: "Market Cap",
      color,
      points: data,
    },
  ];
}

function buildMergedDataset(series: HistoryChartSeries[]) {
  const merged = new Map<string, Record<string, string | number | null>>();

  for (const entry of series) {
    for (const point of entry.points) {
      const current = merged.get(point.snapshotDate) ?? {
        snapshotDate: point.snapshotDate,
        label: point.label,
      };

      current[entry.key] = point.value;
      merged.set(point.snapshotDate, current);
    }
  }

  return Array.from(merged.values()).sort((a, b) =>
    String(a.snapshotDate).localeCompare(String(b.snapshotDate)),
  );
}

export function ComplexHistoryMiniChart({
  data,
  series,
}: ComplexHistoryMiniChartProps) {
  const normalizedSeries = useMemo(() => {
    const base =
      series && series.length > 0 ? series : buildSingleSeries(data);

    return base
      .filter((entry) => entry.points.length > 0)
      .map((entry, index) => ({
        ...entry,
        color: entry.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      }));
  }, [data, series]);

  const mergedData = useMemo(
    () => buildMergedDataset(normalizedSeries),
    [normalizedSeries],
  );

  const [isMounted, setIsMounted] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [chartBox, setChartBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const node = chartContainerRef.current;
    if (!node) return;

    const updateBox = () => {
      const rect = node.getBoundingClientRect();
      setChartBox({
        width: Math.max(0, Math.floor(rect.width)),
        height: Math.max(0, Math.floor(rect.height)),
      });
    };

    updateBox();

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      setChartBox({
        width: Math.max(0, Math.floor(entry.contentRect.width)),
        height: Math.max(0, Math.floor(entry.contentRect.height)),
      });
    });

    observer.observe(node);
    window.addEventListener("resize", updateBox);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateBox);
    };
  }, [isMounted]);

  if (normalizedSeries.length === 0 || mergedData.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm leading-6 text-white/55">
        차트를 그릴 히스토리 데이터가 아직 충분하지 않다.
      </div>
    );
  }

  const canRenderMeasuredChart =
    isMounted && chartBox.width > 0 && chartBox.height >= MIN_CHART_HEIGHT;

  return (
    <div className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-white/8 bg-black/25 [background-image:linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px]">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            normalizedSeries.length > 1
              ? "radial-gradient(circle at top left, rgba(34,211,238,0.10), transparent 34%), radial-gradient(circle at top right, rgba(232,121,249,0.10), transparent 34%)"
              : `radial-gradient(circle at top right, ${normalizedSeries[0].color}22, transparent 40%)`,
        }}
      />

      <div className="relative border-b border-white/6 px-3 py-2.5">
        <div className="flex flex-wrap gap-2">
          {normalizedSeries.map((entry) => (
            <span
              key={entry.key}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/75"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: entry.color,
                  boxShadow: `0 0 14px ${entry.color}`,
                }}
              />
              <span>{entry.name}</span>
            </span>
          ))}
        </div>
      </div>

      <div
        ref={chartContainerRef}
        className="relative h-[220px] min-h-[220px] w-full min-w-0 overflow-hidden px-1 py-2"
      >
        {!canRenderMeasuredChart ? (
          <div className="h-full min-h-[220px] w-full animate-pulse rounded-xl border border-white/8 bg-white/[0.02]" />
        ) : (
          <LineChart
            width={Math.max(chartBox.width, 1)}
            height={Math.max(chartBox.height, MIN_CHART_HEIGHT)}
            data={mergedData}
            margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
          >
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
                stroke: "rgba(255,255,255,0.16)",
                strokeWidth: 1,
              }}
              contentStyle={{
                background: "#081018",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 16,
              }}
              labelFormatter={(label, payload) => {
                const point = payload?.[0]?.payload as
                  | { snapshotDate?: string }
                  | undefined;
                return point?.snapshotDate ?? String(label);
              }}
              formatter={(value, name) => [
                formatMarketCapFull(Number(value)),
                String(name),
              ]}
            />

            {normalizedSeries.map((entry, index) => (
              <Line
                key={entry.key}
                type="monotone"
                dataKey={entry.key}
                name={entry.name}
                stroke={entry.color}
                strokeWidth={2.5}
                dot={false}
                connectNulls
                activeDot={{
                  r: 4,
                  fill: entry.color,
                  strokeWidth: 0,
                }}
                style={{
                  filter: `drop-shadow(0 0 10px ${entry.color}88)`,
                }}
                strokeDasharray={index % 2 === 1 ? "5 4" : undefined}
              />
            ))}
          </LineChart>
        )}
      </div>
    </div>
  );
}