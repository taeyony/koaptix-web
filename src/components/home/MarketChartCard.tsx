"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MarketChartRow = {
  snapshot_date: string;
  total_market_cap: number | null;
};

type MarketChartCardProps = {
  data?: MarketChartRow[] | null;
};

type PeriodKey = "1W" | "1M" | "3M" | "1Y";

const PERIOD_OPTIONS = [
  { key: "1W", label: "1W", days: 7 },
  { key: "1M", label: "1M", days: 30 },
  { key: "3M", label: "3M", days: 90 },
  { key: "1Y", label: "1Y", days: 365 },
] as const;

const PALETTES = {
  up: {
    stroke: "#10b981",
    fill: "#10b981",
    fillTopOpacity: 0.24,
    fillBottomOpacity: 0.02,
    textClassName: "text-emerald-300",
    dot: "#34d399",
  },
  down: {
    stroke: "#f43f5e",
    fill: "#f43f5e",
    fillTopOpacity: 0.24,
    fillBottomOpacity: 0.02,
    textClassName: "text-rose-300",
    dot: "#fb7185",
  },
  flat: {
    stroke: "#94a3b8",
    fill: "#94a3b8",
    fillTopOpacity: 0.18,
    fillBottomOpacity: 0.02,
    textClassName: "text-slate-300",
    dot: "#cbd5e1",
  },
} as const;

type ChartPoint = {
  snapshot_date: string;
  total_market_cap: number;
  shortLabel: string;
  fullLabel: string;
};

function toShortLabel(snapshotDate: string): string {
  const safe = snapshotDate.slice(0, 10);
  const [, month = "--", day = "--"] = safe.split("-");
  return `${month}.${day}`;
}

function toFullLabel(snapshotDate: string): string {
  return snapshotDate.slice(0, 10).replace(/-/g, ".");
}

function formatValue(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactValue(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("ko-KR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDelta(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatCompactValue(value)}`;
}

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "-";
  if (value === 0) return "0.00%";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function getPalette(delta: number) {
  if (delta > 0) return PALETTES.up;
  if (delta < 0) return PALETTES.down;
  return PALETTES.flat;
}

function EmptyState({
  title = "표시할 지수 데이터가 없습니다.",
  description = "일별 스냅샷이 쌓이면 이 영역에 KOAPTIX 500 시가총액 지수가 표시됩니다.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/60">
      <div className="px-6 text-center">
        <p className="text-sm font-medium text-slate-200">{title}</p>
        <p className="mt-2 text-xs leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export default function MarketChartCard({
  data = [],
}: MarketChartCardProps) {
  const [activePeriod, setActivePeriod] = useState<PeriodKey>("3M");
  const [isMounted, setIsMounted] = useState(false);
  const gradientId = useId().replace(/:/g, "");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const normalizedData = useMemo<ChartPoint[]>(() => {
    return [...(data || [])] // 🚨 (data || []) 로 감싸서 null 붕괴를 막습니다!!
      .filter(
        (row): row is { snapshot_date: string; total_market_cap: number } =>
          Boolean(row?.snapshot_date) &&
          typeof row?.total_market_cap === "number" &&
          Number.isFinite(row.total_market_cap),
      )
      .sort((a, b) =>
        a.snapshot_date.slice(0, 10).localeCompare(b.snapshot_date.slice(0, 10)),
      )
      .map((row) => ({
        snapshot_date: row.snapshot_date.slice(0, 10),
        total_market_cap: row.total_market_cap,
        shortLabel: toShortLabel(row.snapshot_date),
        fullLabel: toFullLabel(row.snapshot_date),
      }));
  }, [data]);

  const selectedData = useMemo(() => {
    const period =
      PERIOD_OPTIONS.find((option) => option.key === activePeriod) ??
      PERIOD_OPTIONS[2];

    if (normalizedData.length <= period.days) {
      return normalizedData;
    }

    return normalizedData.slice(-period.days);
  }, [activePeriod, normalizedData]);

  const firstValue = selectedData[0]?.total_market_cap ?? null;
  const lastValue = selectedData[selectedData.length - 1]?.total_market_cap ?? null;

  const delta =
    firstValue !== null && lastValue !== null ? lastValue - firstValue : 0;

  const deltaPercent =
    firstValue !== null && lastValue !== null && firstValue !== 0
      ? ((lastValue - firstValue) / firstValue) * 100
      : null;

  const palette = getPalette(delta);
  const hasUsableData = selectedData.length >= 2;

  return (
    <section className="flex h-full min-h-0 flex-col rounded-3xl border border-slate-800 bg-slate-950/90 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">
            Market Index
          </p>

          <h2 className="mt-2 text-lg font-semibold text-slate-100">
            KOAPTIX 500 시가총액 지수
          </h2>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-2xl font-semibold tracking-tight text-slate-50">
              {lastValue !== null ? formatCompactValue(lastValue) : "-"}
            </span>

            <span className={`text-sm font-medium ${palette.textClassName}`}>
              {hasUsableData
                ? `${activePeriod} ${formatDelta(delta)} · ${formatPercent(deltaPercent)}`
                : "히스토리 대기"}
            </span>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            기준일 {selectedData[selectedData.length - 1]?.fullLabel ?? "-"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1 rounded-2xl border border-slate-800 bg-slate-900/80 p-1">
          {PERIOD_OPTIONS.map((option) => {
            const isActive = option.key === activePeriod;

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setActivePeriod(option.key)}
                aria-pressed={isActive}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "border border-cyan-400/30 bg-slate-800 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]"
                    : "border border-transparent bg-transparent text-slate-400 hover:text-slate-200 focus-visible:border-cyan-400/30 focus-visible:text-cyan-300"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex-1 min-h-0">
        {!hasUsableData ? (
          <EmptyState />
        ) : !isMounted ? (
          <div className="h-full min-h-0 animate-pulse rounded-2xl border border-slate-800 bg-slate-950/60" />
        ) : (
          <div className="h-full min-h-0 w-full overflow-visible">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={selectedData}
                margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id={`market-chart-gradient-${gradientId}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={palette.fill}
                      stopOpacity={palette.fillTopOpacity}
                    />
                    <stop
                      offset="100%"
                      stopColor={palette.fill}
                      stopOpacity={palette.fillBottomOpacity}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  vertical={false}
                  stroke="#1e293b"
                  strokeOpacity={0.7}
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="shortLabel"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  minTickGap={24}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />

                <YAxis hide domain={["dataMin", "dataMax"]} />

                <Tooltip
                  cursor={{
                    stroke: palette.stroke,
                    strokeOpacity: 0.18,
                    strokeWidth: 1,
                  }}
                  isAnimationActive={false}
                  allowEscapeViewBox={{ x: true, y: true }}
                  wrapperStyle={{ zIndex: 30 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;

                    const point = payload[0]?.payload as ChartPoint | undefined;
                    if (!point) return null;

                    return (
                      <div className="rounded-2xl border border-slate-700/80 bg-slate-950/95 px-3 py-2 shadow-2xl backdrop-blur">
                        <p className="text-[11px] tracking-wide text-slate-400">
                          {point.fullLabel}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          총 시가총액
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-100">
                          {formatValue(point.total_market_cap)}
                        </p>
                      </div>
                    );
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="total_market_cap"
                  stroke={palette.stroke}
                  fill={`url(#market-chart-gradient-${gradientId})`}
                  strokeWidth={2.25}
                  dot={false}
                  activeDot={{
                    r: 4,
                    stroke: palette.dot,
                    strokeWidth: 2,
                    fill: "#020617",
                  }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}