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
  ComplexChartPeriod,
  HistoryChartPoint,
  HistoryChartSeries,
} from "../../lib/koaptix/types";
import { deduplicateComplexHistoryObservations, hasComplexHistoryBoundary } from "../../lib/koaptix/mappers";

type ComplexHistoryMiniChartProps = {
  data?: HistoryChartPoint[];
  series?: HistoryChartSeries[];
  period?: ComplexChartPeriod;
  requestedStartDate?: string;
  basis?: "published" | "reference" | "restored-local-review";
};

const DEFAULT_COLORS = [
  "var(--ko-accent)",
  "var(--ko-purple)",
  "var(--ko-up)",
  "var(--ko-warning)",
];
const MIN_CHART_HEIGHT = 260;
const PERIOD_LABELS: Record<ComplexChartPeriod, string> = {
  weekly: "주간",
  monthly: "월간",
  yearly: "연간",
};
const HISTORY_COPY = {
  published: {
    label: "공개 시총",
    empty: "조회 기간에 공개된 시총 이력이 없습니다.",
    caption: "공개 시총 이력의 날짜별 저장 값",
  },
  reference: {
    label: "참고 재계산 시총",
    empty: "조회 기간에 검증 조건을 충족하는 참고 재계산 시총 이력이 없습니다.",
    caption: "참고 재계산 시총 이력의 날짜별 값 · 당시 공표 기록과 별도",
  },
  "restored-local-review": {
    label: "검토용 시총",
    empty: "조회 기간에 검토 가능한 시총 이력이 없습니다.",
    caption: "검토용 시총 이력의 날짜별 값",
  },
};

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

export function buildComplexHistoryChartModel(series: HistoryChartSeries[]) {
  const merged = new Map<string, Record<string, string | number | null>>();
  const lines: Array<{ key: string; name: string; color?: string; seriesIndex: number }> = [];

  for (const [seriesIndex, entry] of series.entries()) {
    let segmentIndex = -1;
    let lineKey = "";
    let previous: HistoryChartPoint | undefined;
    for (const point of deduplicateComplexHistoryObservations(entry.points)) {
      if (!previous || hasComplexHistoryBoundary(previous, point)) {
        segmentIndex += 1;
        lineKey = `__ko_line_${seriesIndex}_${segmentIndex}`;
        lines.push({ key: lineKey, name: entry.name, color: entry.color, seriesIndex });
      }
      const current = merged.get(point.snapshotDate) ?? {
        snapshotDate: point.snapshotDate,
        label: point.label,
        timestamp: Date.parse(`${point.snapshotDate}T00:00:00Z`),
      };

      current[entry.key] = point.value;
      current[lineKey] = point.value;
      merged.set(point.snapshotDate, current);
      previous = point;
    }
  }

  return {
    data: Array.from(merged.values()).sort((a, b) =>
      String(a.snapshotDate).localeCompare(String(b.snapshotDate)),
    ),
    lines,
  };
}

export function ComplexHistoryMiniChart({
  data,
  series,
  period = "weekly",
  requestedStartDate,
  basis = "published",
}: ComplexHistoryMiniChartProps) {
  const periodLabel = PERIOD_LABELS[period];
  const historyCopy = HISTORY_COPY[basis];
  const historyLabel = historyCopy.label;
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

  const { data: mergedData, lines } = useMemo(
    () => buildComplexHistoryChartModel(normalizedSeries),
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
        {historyCopy.empty} 현재 시총만으로 과거 추이를 만들 수 없습니다.
      </div>
    );
  }

  if (isSingleObservation) {
    const point = normalizedSeries[0].points[0];
    return (
      <div role="group" aria-label={`${historyLabel} 단일 기준일 값`} className="rounded-2xl border border-[var(--ko-border)] bg-surface p-4 sm:p-5">
        <p className="text-caption font-semibold text-accent">{periodLabel} 표시 1개 · 추이 비교 대기</p>
        <dl className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 tabular-nums">
          <dt className="text-sm text-muted"><time dateTime={point.snapshotDate}>{point.snapshotDate}</time></dt>
          <dd className="text-lg font-bold text-ink">{formatMarketCapFull(point.value)}</dd>
        </dl>
        <p className="mt-3 text-sm text-muted">
          조회 범위에서 {periodLabel}으로 묶어 표시한 값이 1개입니다. 두 기간 이상의 표시점이 있어야 변화 추이를 볼 수 있습니다.
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
  const requestedStart = requestedStartDate ? Date.parse(`${requestedStartDate}T00:00:00Z`) : NaN;
  const showRequestedRange = Number.isFinite(requestedStart);
  const axisStart = new Date(requestedStart);
  const axisStepMonths = period === "yearly" ? 12 : 6;
  const axisMonthSpan = (Number(lastDate.slice(0, 4)) - axisStart.getUTCFullYear()) * 12
    + Number(lastDate.slice(5, 7)) - 1 - axisStart.getUTCMonth();
  const axisTicks = showRequestedRange
    ? Array.from(
        { length: Math.floor(axisMonthSpan / axisStepMonths) + 1 },
        (_, i) => Date.UTC(axisStart.getUTCFullYear(), axisStart.getUTCMonth() + i * axisStepMonths, axisStart.getUTCDate()),
      )
    : undefined;
  const lastTimestamp = Date.parse(`${lastDate}T00:00:00Z`);
  if (axisTicks && period !== "yearly" && axisTicks[axisTicks.length - 1] !== lastTimestamp) {
    axisTicks.push(lastTimestamp);
  }

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-[var(--ko-border)] bg-surface text-ink">
      <div className="border-b border-[var(--ko-border)] px-3 py-3 sm:px-4">
        <p className="text-caption tabular-nums text-muted">
          <time dateTime={firstDate}>{firstDate}</time> ~ <time dateTime={lastDate}>{lastDate}</time>
          {" · "}{periodLabel} 표시 {mergedData.length}개
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
        aria-label={`${firstDate}부터 ${lastDate}까지 ${periodLabel} ${historyLabel} 이력 차트`}
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
              dataKey={showRequestedRange ? "timestamp" : "label"}
              type={showRequestedRange ? "number" : "category"}
              scale={showRequestedRange ? "time" : "auto"}
              domain={showRequestedRange ? [requestedStart, "dataMax"] : undefined}
              ticks={axisTicks}
              interval="preserveStartEnd"
              tickFormatter={showRequestedRange ? (value) => {
                const date = new Date(Number(value)).toISOString();
                return period === "yearly" ? date.slice(0, 4) : date.slice(0, 7).replace("-", ".");
              } : undefined}
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

            {lines.map((entry) => (
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
                strokeDasharray={entry.seriesIndex % 2 === 1 ? "5 4" : undefined}
              />
            ))}
          </LineChart>
        )}
      </div>

      {hasSparseStepSeries ? (
        <div className="border-t border-[var(--ko-border)] px-3 py-3 text-caption text-muted sm:px-4">
          표시된 이력의 서로 다른 금액은 {distinctValueCount}개입니다. 같은 값의 반복을 새로운 계산으로 해석하지 마세요.
        </div>
      ) : null}
      <details className="border-t border-[var(--ko-border)] px-3 py-3 sm:px-4">
        <summary className="cursor-pointer text-control font-semibold text-accent underline underline-offset-4">
          날짜별 시총 값 보기
        </summary>
        <div className="mt-3 max-h-64 overflow-auto" tabIndex={0} role="region" aria-label={`날짜별 ${historyLabel} 값`}>
          <table className="w-full text-left text-sm tabular-nums">
            <caption className="sr-only">{historyCopy.caption}</caption>
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
