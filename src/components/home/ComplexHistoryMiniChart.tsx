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

const DEFAULT_COLORS = [
  "var(--ko-accent)",
  "var(--ko-purple)",
  "var(--ko-up)",
  "var(--ko-warning)",
];
const MIN_CHART_HEIGHT = 260;

function formatMarketCapCompact(value: number): string {
  if (value === 0) return "0";
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

  return [
    {
      key: "series_0",
      name: "추정 시가총액",
      color: DEFAULT_COLORS[0],
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

  const distinctValueCount = useMemo(() => {
    const values = new Set<number>();

    for (const entry of normalizedSeries) {
      for (const point of entry.points) {
        if (Number.isFinite(point.value) && point.value > 0) {
          values.add(point.value);
        }
      }
    }

    return values.size;
  }, [normalizedSeries]);

  const [isMounted, setIsMounted] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [chartBox, setChartBox] = useState({ width: 0, height: 0 });
  const isSingleObservation = normalizedSeries.length === 1 && mergedData.length === 1;
  const hasTimeline = mergedData.length > 0 && !isSingleObservation;

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
  }, [isMounted, hasTimeline]);

  if (normalizedSeries.length === 0 || mergedData.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm leading-copy text-white/55">
        조회 기간에 공개된 시총 이력이 없습니다. 현재 시총만으로 과거 추이를 만들 수 없습니다.
      </div>
    );
  }

  if (isSingleObservation) {
    const point = normalizedSeries[0].points[0];
    return (
      <div className="rounded-2xl border border-[var(--ko-border)] bg-surface p-4 sm:p-5">
        <p className="text-caption font-semibold text-accent">공개 이력 1개 · 추이 비교 대기</p>
        <dl className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 tabular-nums">
          <dt className="text-sm text-muted"><time dateTime={point.snapshotDate}>{point.snapshotDate}</time></dt>
          <dd className="text-lg font-bold text-ink">{formatMarketCapFull(point.value)}</dd>
        </dl>
        <p className="mt-3 text-sm text-muted">
          공개 이력이 한 시점뿐입니다. 서로 다른 두 날짜 이상의 이력이 있어야 변화 추이를 볼 수 있습니다.
        </p>
      </div>
    );
  }

  const canRenderMeasuredChart = isMounted && chartBox.width > 0;
  const renderWidth = Math.max(chartBox.width, 1);
  const renderHeight = Math.max(chartBox.height, MIN_CHART_HEIGHT);
  const hasSparseStepSeries =
    mergedData.length >= 4 && distinctValueCount > 0 && distinctValueCount <= 3;
  const firstDate = String(mergedData[0].snapshotDate);
  const lastDate = String(mergedData[mergedData.length - 1].snapshotDate);

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-[var(--ko-border)] bg-surface text-ink">
      <div className="border-b border-[var(--ko-border)] px-3 py-3 sm:px-4">
        <p className="text-caption tabular-nums text-muted">
          <time dateTime={firstDate}>{firstDate}</time> ~ <time dateTime={lastDate}>{lastDate}</time>
          {" · "}주간 표시 {mergedData.length}개
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {normalizedSeries.map((entry) => (
            <span
              key={entry.key}
              className="inline-flex items-center gap-2 text-caption font-semibold text-ink"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: entry.color,
                }}
              />
              <span>{entry.name}</span>
            </span>
          ))}
        </div>
      </div>

      <div
        ref={chartContainerRef}
        role="group"
        aria-label={`${firstDate}부터 ${lastDate}까지 공개 시총 이력 차트`}
        className="h-[260px] min-h-[260px] w-full min-w-0 overflow-hidden"
      >
        {!canRenderMeasuredChart ? (
          <div className="h-full w-full animate-pulse bg-[var(--ko-accent-soft)]" />
        ) : (
          <LineChart
            width={renderWidth}
            height={renderHeight}
            data={mergedData}
            margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--ko-chart-grid)"
              strokeDasharray="3 3"
            />

            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              minTickGap={18}
              tickMargin={10}
              tick={{ fill: "var(--ko-muted)", fontSize: "var(--ko-size-label)" }}
            />

            <YAxis
              width={56}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatMarketCapCompact(Number(value))}
              tick={{ fill: "var(--ko-muted)", fontSize: "var(--ko-size-label)" }}
            />

            <Tooltip
              cursor={{
                stroke: "var(--ko-border)",
                strokeWidth: 1,
              }}
              contentStyle={{
                background: "var(--ko-surface)",
                color: "var(--ko-ink)",
                fontSize: "var(--ko-size-body)",
                border: "1px solid var(--ko-border)",
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
                type="linear"
                dataKey={entry.key}
                name={entry.name}
                stroke={entry.color}
                strokeWidth={2.5}
                dot={{ r: 2.5, fill: entry.color, strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={false}
                activeDot={{
                  r: 4,
                  fill: entry.color,
                  strokeWidth: 0,
                }}
                strokeDasharray={index % 2 === 1 ? "5 4" : undefined}
              />
            ))}
          </LineChart>
        )}
      </div>

      {hasSparseStepSeries ? (
        <div className="border-t border-[var(--ko-border)] px-3 py-3 text-caption text-muted sm:px-4">
          표시된 이력의 서로 다른 금액은 {distinctValueCount}개입니다. 같은 값의 반복을 매주 새로운 계산으로 해석하지 마세요.
        </div>
      ) : null}
      <details className="border-t border-[var(--ko-border)] px-3 py-3 sm:px-4">
        <summary className="cursor-pointer text-control font-semibold text-accent underline underline-offset-4">
          날짜별 시총 값 보기
        </summary>
        <div className="mt-3 max-h-64 overflow-auto" tabIndex={0} role="region" aria-label="날짜별 공개 시총 값">
          <table className="w-full text-left text-sm tabular-nums">
            <caption className="sr-only">공개 시총 이력의 날짜별 저장 값</caption>
            <thead>
              <tr>
                <th scope="col" className="py-2 pr-3 text-caption text-muted">기준일</th>
                {normalizedSeries.map((entry) => <th scope="col" key={entry.key} className="py-2 text-right text-caption text-muted">{entry.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {mergedData.map((point) => (
                <tr key={String(point.snapshotDate)} className="border-t border-[var(--ko-border)]">
                  <th scope="row" className="py-3 pr-3 font-medium"><time dateTime={String(point.snapshotDate)}>{point.snapshotDate}</time></th>
                  {normalizedSeries.map((entry) => <td key={entry.key} className="py-3 text-right">{point[entry.key] != null ? formatMarketCapFull(Number(point[entry.key])) : "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
