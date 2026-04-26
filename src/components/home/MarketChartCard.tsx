/**
 * KOAPTIX universe-aware index chart card.
 * index chain: koaptix_index_snapshot -> v_koaptix_index_timeseries -> v_koaptix_latest_index_card
 */

"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MarketChartPoint = {
  snapshotDate: string;
  value: number;
  totalMarketCapKrw: number | null;
  componentComplexCount: number | null;
};

type MarketChartPayload = {
  requestedUniverseCode: string;
  renderedUniverseCode: string;
  renderedUniverseLabel: string;
  isFallbackToKorea: boolean;

  indexCode: string | null;
  indexName: string | null;

  latestSnapshotDate: string | null;
  indexValue: number | null;
  change1m: number | null;
  changePct1m: number | null;
  totalMarketCapKrw: number | null;
  componentComplexCount: number | null;
  movement1m: string | null;

  rows: MarketChartPoint[];
};

type MarketChartCardProps = {
  payload?: MarketChartPayload | null;
};

type PeriodKey = "3M" | "6M" | "1Y" | "ALL";
type ChartScopeKind =
  | "selected-universe"
  | "national-fallback"
  | "alternate-universe"
  | "empty";

const PERIOD_OPTIONS = [
  { key: "3M", label: "3M", points: 3 },
  { key: "6M", label: "6M", points: 6 },
  { key: "1Y", label: "1Y", points: 12 },
  { key: "ALL", label: "ALL", points: null },
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

const MIN_HISTORY_POINTS = 4;
const MIN_CHART_HEIGHT = 260;

type ChartPoint = {
  snapshotDate: string;
  value: number;
  shortLabel: string;
  fullLabel: string;
  totalMarketCapKrw: number | null;
  componentComplexCount: number | null;
};

function toShortLabel(snapshotDate: string): string {
  const safe = snapshotDate.slice(0, 10);
  const [, month = "--", day = "--"] = safe.split("-");
  return `${month}.${day}`;
}

function toFullLabel(snapshotDate: string): string {
  return snapshotDate.slice(0, 10).replace(/-/g, ".");
}

function formatIndexValue(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatIndexDelta(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0.00";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatIndexValue(value)}`;
}

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "-";
  if (value === 0) return "0.00%";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatCompactWon(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("ko-KR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCount(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function getPalette(delta: number) {
  if (delta > 0) return PALETTES.up;
  if (delta < 0) return PALETTES.down;
  return PALETTES.flat;
}

function getDistinctValueCount(points: ChartPoint[]): number {
  return new Set(points.map((point) => point.value.toFixed(4))).size;
}

function formatUniverseCodeLabel(code?: string | null): string {
  if (!code) return "";
  return code.replace(/_ALL$/, "").replace(/^SGG_/, "SGG ");
}

function getChartScopeKind(
  hasPayload: boolean,
  isFallbackToKorea: boolean,
  isSameUniverse: boolean,
): ChartScopeKind {
  if (!hasPayload) return "empty";
  if (isFallbackToKorea) return "national-fallback";
  if (isSameUniverse) return "selected-universe";
  return "alternate-universe";
}

function getChartScopeLabel(scope: ChartScopeKind): string {
  if (scope === "selected-universe") return "선택 지역 지수";
  if (scope === "national-fallback") return "전국 지수 대체 표시";
  if (scope === "alternate-universe") return "다른 지역 지수";
  return "지수 준비 중";
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full min-h-[260px] min-w-0 items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/60">
      <div className="px-6 text-center">
        <p className="text-sm font-medium text-slate-200">{title}</p>
        <p className="mt-2 text-xs leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export default function MarketChartCard({
  payload,
}: MarketChartCardProps) {
  const [activePeriod, setActivePeriod] = useState<PeriodKey>("1Y");
  const [isMounted, setIsMounted] = useState(false);
  const gradientId = useId().replace(/:/g, "");

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

  const normalizedData = useMemo<ChartPoint[]>(() => {
    return [...(payload?.rows ?? [])]
      .filter(
        (row): row is MarketChartPoint =>
          Boolean(row?.snapshotDate) &&
          typeof row?.value === "number" &&
          Number.isFinite(row.value),
      )
      .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate))
      .map((row) => ({
        snapshotDate: row.snapshotDate.slice(0, 10),
        value: row.value,
        shortLabel: toShortLabel(row.snapshotDate),
        fullLabel: toFullLabel(row.snapshotDate),
        totalMarketCapKrw: row.totalMarketCapKrw,
        componentComplexCount: row.componentComplexCount,
      }));
  }, [payload]);

  const selectedData = useMemo(() => {
    const period =
      PERIOD_OPTIONS.find((option) => option.key === activePeriod) ??
      PERIOD_OPTIONS[2];

    if (period.points === null) {
      return normalizedData;
    }

    if (normalizedData.length <= period.points) {
      return normalizedData;
    }

    return normalizedData.slice(-period.points);
  }, [activePeriod, normalizedData]);

  const firstValue = selectedData[0]?.value ?? null;
  const lastValue = selectedData[selectedData.length - 1]?.value ?? null;

  const rangeDelta =
    firstValue !== null && lastValue !== null ? lastValue - firstValue : 0;

  const rangeDeltaPercent =
    firstValue !== null && lastValue !== null && firstValue !== 0
      ? ((lastValue - firstValue) / firstValue) * 100
      : null;

  const palette = getPalette(rangeDelta);
  const hasUsableData = selectedData.length >= 2;
  const totalRowCount = normalizedData.length;
  const distinctValueCount = getDistinctValueCount(normalizedData);

  const isHistoryBuilding =
    totalRowCount > 0 &&
    !payload?.isFallbackToKorea &&
    (totalRowCount < MIN_HISTORY_POINTS || distinctValueCount < 2);

  const canRenderChart = hasUsableData && !isHistoryBuilding;
  const canRenderMeasuredChart =
    canRenderChart &&
    isMounted &&
    chartBox.width > 0 &&
    chartBox.height >= MIN_CHART_HEIGHT;

  const requestedCode = payload?.requestedUniverseCode ?? "";
  const renderedCode = payload?.renderedUniverseCode ?? "";
  const requestedCodeLabel = formatUniverseCodeLabel(requestedCode);
  const codeLabel = formatUniverseCodeLabel(renderedCode);
  const universeLabel = payload?.renderedUniverseLabel || codeLabel;
  const hasChartPayload = payload != null;
  const isSameUniverse =
    hasChartPayload && requestedCode !== "" && requestedCode === renderedCode;
  const chartScope = getChartScopeKind(
    hasChartPayload,
    payload?.isFallbackToKorea ?? false,
    isSameUniverse,
  );
  const chartScopeLabel = getChartScopeLabel(chartScope);
  const title =
    payload?.indexName ?? (codeLabel ? `KOAPTIX ${codeLabel}` : "KOAPTIX INDEX");
  const latestValue = payload?.indexValue ?? lastValue ?? null;
  const latestSnapshotDate =
    payload?.latestSnapshotDate ??
    selectedData[selectedData.length - 1]?.snapshotDate ??
    null;

  const deltaLabel = isHistoryBuilding
    ? `시계열 ${formatCount(totalRowCount)}개 · 히스토리 축적 중`
    : hasUsableData
      ? `${activePeriod} ${formatIndexDelta(rangeDelta)} · ${formatPercent(rangeDeltaPercent)}`
      : payload?.changePct1m !== null && payload?.changePct1m !== undefined
        ? `1M ${formatIndexDelta(payload?.change1m ?? 0)} · ${formatPercent(payload?.changePct1m ?? null)}`
        : "히스토리 대기";

  const emptyStateTitle = !hasUsableData
    ? "표시할 KOAPTIX 지수 데이터가 없습니다."
    : "현재 유니버스 지수 히스토리 축적 중입니다.";

  const emptyStateDescription = !hasUsableData
    ? payload?.isFallbackToKorea
      ? "현재 유니버스 index 준비 전까지 전국 KOAPTIX 지수로 대체 표시됩니다."
      : "지수 스냅샷이 충분히 쌓이면 이 영역에 현재 유니버스 기준 KOAPTIX 지수가 표시됩니다."
    : distinctValueCount < 2
      ? `현재 시계열은 ${formatCount(totalRowCount)}개이며 값 변동이 아직 없습니다. 추세가 형성되면 차트로 전환됩니다.`
      : `현재 시계열은 ${formatCount(totalRowCount)}개로 아직 짧습니다. 스냅샷이 더 쌓이면 추세 차트가 표시됩니다.`;

  return (
    <section
      className="flex h-full min-h-0 min-w-0 w-full flex-col rounded-3xl border border-slate-800 bg-slate-950/90 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]"
      data-testid="market-chart-card"
      data-requested-universe-code={payload?.requestedUniverseCode ?? ""}
      data-rendered-universe-code={payload?.renderedUniverseCode ?? ""}
      data-chart-scope={chartScope}
      data-chart-same-universe={isSameUniverse ? "true" : "false"}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">
            Market Index
          </p>

          <h2 className="mt-2 text-lg font-semibold text-slate-100">
            {title}
          </h2>

          <p className="mt-1 max-w-xl text-[11px] leading-5 text-slate-500">
            KOAPTIX 지수는 시장 전체 온도를 보는 숫자입니다. 개별 단지 순위는
            오른쪽 KOAPTIX 500 보드에서 확인하세요.
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {universeLabel ? (
              <span className="rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-300">
                {universeLabel}
              </span>
            ) : null}

            {payload?.isFallbackToKorea ? (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-amber-300">
                전국 fallback
              </span>
            ) : null}

            <span
              className="rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-400"
              data-testid="market-chart-scope-chip"
              data-chart-scope={chartScope}
            >
              {chartScopeLabel}
            </span>

            {isHistoryBuilding ? (
              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-cyan-300">
                History Building
              </span>
            ) : null}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
            <div
              className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2"
              data-testid="market-chart-requested-universe"
              data-universe-code={requestedCode}
            >
              <span className="block uppercase tracking-[0.16em] text-slate-500">
                선택 요청
              </span>
              <span className="mt-1 block truncate font-semibold text-slate-300">
                {requestedCodeLabel || requestedCode || "-"}
              </span>
            </div>

            <div
              className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2"
              data-testid="market-chart-rendered-universe"
              data-universe-code={renderedCode}
            >
              <span className="block uppercase tracking-[0.16em] text-slate-500">
                표시 범위
              </span>
              <span className="mt-1 block truncate font-semibold text-slate-300">
                {universeLabel || codeLabel || renderedCode || "-"}
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-2xl font-semibold tracking-tight text-slate-50">
              {latestValue !== null ? formatIndexValue(latestValue) : "-"}
            </span>

            <span
              className={`text-sm font-medium ${isHistoryBuilding ? "text-cyan-300" : palette.textClassName
                }`}
            >
              {deltaLabel}
            </span>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            기준일 {latestSnapshotDate ? toFullLabel(latestSnapshotDate) : "-"}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            총 시가총액 {formatCompactWon(payload?.totalMarketCapKrw ?? null)} · 구성 단지{" "}
            {formatCount(payload?.componentComplexCount ?? null)}개
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1 rounded-2xl border border-slate-800 bg-slate-900/80 p-1">
          {PERIOD_OPTIONS.map((option) => {
            const isActive = option.key === activePeriod;
            const isDisabled = !canRenderChart;

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setActivePeriod(option.key)}
                aria-pressed={isActive}
                disabled={isDisabled}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${isDisabled
                    ? "cursor-default text-slate-600"
                    : isActive
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

      <div className="mt-5 flex-1 min-h-[260px] min-w-0">
        {!canRenderChart ? (
          <EmptyState
            title={emptyStateTitle}
            description={emptyStateDescription}
          />
        ) : (
          <div
            ref={chartContainerRef}
            className="h-full min-h-[260px] w-full min-w-0 overflow-hidden rounded-2xl"
          >
            {!canRenderMeasuredChart ? (
              <div className="h-full min-h-[260px] animate-pulse rounded-2xl border border-slate-800 bg-slate-950/60" />
            ) : (
              <AreaChart
                width={Math.max(chartBox.width, 1)}
                height={Math.max(chartBox.height, MIN_CHART_HEIGHT)}
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
                  content={({ active, payload: tooltipPayload }) => {
                    if (!active || !tooltipPayload?.length) return null;

                    const point =
                      tooltipPayload[0]?.payload as ChartPoint | undefined;
                    if (!point) return null;

                    return (
                      <div className="rounded-2xl border border-slate-700/80 bg-slate-950/95 px-3 py-2 shadow-2xl backdrop-blur">
                        <p className="text-[11px] tracking-wide text-slate-400">
                          {point.fullLabel}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          KOAPTIX INDEX
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-100">
                          {formatIndexValue(point.value)}
                        </p>
                        <p className="mt-2 text-[11px] text-slate-400">
                          시가총액 {formatCompactWon(point.totalMarketCapKrw)}
                        </p>
                      </div>
                    );
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="value"
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
            )}
          </div>
        )}
      </div>
    </section>
  );
}
