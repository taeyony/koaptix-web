"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ComplexDetail,
  HistoryChartPoint,
  HistoryChartSeries,
  RankingItem,
} from "../../lib/koaptix/types";

const ComplexHistoryMiniChart = dynamic(
  () =>
    import("./ComplexHistoryMiniChart").then(
      (mod) => mod.ComplexHistoryMiniChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[220px] w-full animate-pulse rounded-2xl border border-white/8 bg-white/[0.03]" />
    ),
  }
);

type ComparisonSheetProps = {
  open: boolean;
  items: RankingItem[];
  onClose: () => void;
  onClear: () => void;
};

type Winner = "left" | "right" | "tie" | "none";

type PanelData = {
  complexId: string;
  name: string;
  locationLabel: string;
  rank: number | null;
  marketCapKrw: number | null;
  householdCount: number | null;
  approvalYear: number | null;
  ageYears: number | null;
  parkingCount: number | null;
  buildingCount: number | null;
};

function formatMarketCapKrw(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "-";

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

function formatNumber(value: number | null | undefined, suffix = ""): string {
  if (value == null) return "-";
  return `${new Intl.NumberFormat("ko-KR").format(value)}${suffix}`;
}

function getWinner(
  left: number | null | undefined,
  right: number | null | undefined,
  better: "higher" | "lower"
): Winner {
  if (left == null || right == null) return "none";
  if (left === right) return "tie";

  if (better === "higher") {
    return left > right ? "left" : "right";
  }

  return left < right ? "left" : "right";
}

function getTone(winner: Winner, side: "left" | "right"): string {
  if (winner === "none" || winner === "tie") {
    return "border-white/8 bg-white/[0.03] text-white";
  }

  if (winner === side) {
    return "border-cyan-300/30 bg-cyan-300/12 text-cyan-50 shadow-[0_0_0_1px_rgba(103,232,249,0.05)]";
  }

  return "border-white/6 bg-white/[0.02] text-white/75";
}

function resolvePanelData(
  item: RankingItem,
  detail?: ComplexDetail
): PanelData {
  return {
    complexId: item.complexId,
    name: detail?.name ?? item.name,
    locationLabel:
      detail?.locationLabel ?? item.locationLabel ?? "위치 정보 없음",
    rank: detail?.rank ?? item.rank,
    marketCapKrw: detail?.marketCapKrw ?? item.marketCapKrw,
    householdCount: detail?.householdCount ?? null,
    approvalYear: detail?.approvalYear ?? null,
    ageYears: detail?.ageYears ?? null,
    parkingCount: detail?.parkingCount ?? null,
    buildingCount: detail?.buildingCount ?? null,
  };
}

function StatTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: string;
}) {
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums sm:text-base">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] text-white/45 sm:text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

function PlaceholderColumn() {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-sm leading-6 text-white/45">
      비교할 단지를 하나 더 담으면 여기에 나란히 표시된다.
    </div>
  );
}

function ComparisonColumn({
  side,
  badge,
  panel,
  loading,
  rankWinner,
  marketCapWinner,
  householdWinner,
  approvalYearWinner,
  parkingWinner,
  buildingWinner,
}: {
  side: "left" | "right";
  badge: string;
  panel: PanelData;
  loading: boolean;
  rankWinner: Winner;
  marketCapWinner: Winner;
  householdWinner: Winner;
  approvalYearWinner: Winner;
  parkingWinner: Winner;
  buildingWinner: Winner;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/8 bg-white/[0.03] p-3 sm:p-4">
      <div className="flex items-start gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-[11px] font-semibold text-cyan-100">
          {badge}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-white sm:text-base">
              {panel.name}
            </h3>

            {loading ? (
              <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-white/45">
                SYNC
              </span>
            ) : null}
          </div>

          <p className="mt-1 truncate text-xs text-white/45 sm:text-sm">
            {panel.locationLabel}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <StatTile
          label="현재 순위"
          value={panel.rank != null ? `#${formatNumber(panel.rank)}` : "-"}
          tone={getTone(rankWinner, side)}
        />

        <StatTile
          label="시가총액"
          value={formatMarketCapKrw(panel.marketCapKrw)}
          tone={getTone(marketCapWinner, side)}
        />

        <StatTile
          label="세대수"
          value={formatNumber(panel.householdCount, "세대")}
          tone={getTone(householdWinner, side)}
        />

        <StatTile
          label="준공연도"
          value={panel.approvalYear != null ? `${panel.approvalYear}년` : "-"}
          hint={panel.ageYears != null ? `${panel.ageYears}년차` : undefined}
          tone={getTone(approvalYearWinner, side)}
        />

        <StatTile
          label="주차대수"
          value={formatNumber(panel.parkingCount, "대")}
          tone={getTone(parkingWinner, side)}
        />

        <StatTile
          label="동 수"
          value={formatNumber(panel.buildingCount, "동")}
          tone={getTone(buildingWinner, side)}
        />
      </div>
    </div>
  );
}

export function ComparisonSheet({
  open,
  items,
  onClose,
  onClear,
}: ComparisonSheetProps) {
  const activeItems = useMemo(() => items.slice(0, 2), [items]);
  const itemIdsKey = activeItems.map((item) => item.complexId).join("|");

  const [detailsById, setDetailsById] = useState<Record<string, ComplexDetail>>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [historyById, setHistoryById] = useState<Record<string, HistoryChartPoint[]>>(
    {}
  );
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const historyAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      historyAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || activeItems.length === 0) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    (async () => {
      const results = await Promise.allSettled(
        activeItems.map(async (item) => {
          const response = await fetch(
            `/api/complex-detail?complexId=${encodeURIComponent(item.complexId)}`,
            {
              method: "GET",
              signal: controller.signal,
              cache: "no-store",
            }
          );

          const payload = await response.json();

          if (!response.ok) {
            throw new Error(
              payload.error ?? "비교용 상세 정보를 불러오지 못했다."
            );
          }

          return payload.data as ComplexDetail;
        })
      );

      if (controller.signal.aborted) return;

      const nextDetails: Record<string, ComplexDetail> = {};
      let failedCount = 0;

      results.forEach((result, index) => {
        const item = activeItems[index];

        if (result.status === "fulfilled" && result.value) {
          nextDetails[item.complexId] = result.value;
        } else {
          failedCount += 1;
        }
      });

      setDetailsById(nextDetails);

      if (failedCount > 0) {
        setError(
          failedCount === activeItems.length
            ? "비교용 상세 정보를 불러오지 못했다."
            : "일부 상세 정보가 누락되어 기본 카드 데이터로 비교 중이다."
        );
      }
    })()
      .catch((fetchError) => {
        if (
          fetchError instanceof DOMException &&
          fetchError.name === "AbortError"
        ) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "비교용 상세 정보를 불러오지 못했다."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [activeItems, itemIdsKey, open]);

  useEffect(() => {
    if (!open || activeItems.length === 0) return;

    historyAbortRef.current?.abort();
    const controller = new AbortController();
    historyAbortRef.current = controller;

    setHistoryLoading(true);
    setHistoryError(null);

    (async () => {
      const response = await fetch(
        `/api/complex-history?complexId=${encodeURIComponent(
          activeItems.map((item) => item.complexId).join(",")
        )}&mode=weekly&days=180`,
        {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error ?? "비교용 히스토리 차트를 불러오지 못했다."
        );
      }

      const series = Array.isArray(payload.data?.series)
        ? payload.data.series
        : [];

      const nextHistoryById: Record<string, HistoryChartPoint[]> = {};

      for (const entry of series) {
        const complexId = String(entry?.complexId ?? "");
        if (!complexId) continue;
        nextHistoryById[complexId] = Array.isArray(entry?.points)
          ? (entry.points as HistoryChartPoint[])
          : [];
      }

      setHistoryById(nextHistoryById);
    })()
      .catch((fetchError) => {
        if (
          fetchError instanceof DOMException &&
          fetchError.name === "AbortError"
        ) {
          return;
        }

        setHistoryById({});
        setHistoryError(
          fetchError instanceof Error
            ? fetchError.message
            : "비교용 히스토리 차트를 불러오지 못했다."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setHistoryLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [activeItems, itemIdsKey, open]);

  const panels = useMemo(
    () =>
      activeItems.map((item) =>
        resolvePanelData(item, detailsById[item.complexId])
      ),
    [activeItems, detailsById]
  );

  const chartSeries = useMemo<HistoryChartSeries[]>(
    () =>
      activeItems
        .map((item, index) => ({
          key: item.complexId,
          name: item.name,
          color: index === 0 ? "#22d3ee" : "#e879f9",
          points: historyById[item.complexId] ?? [],
        }))
        .filter((entry) => entry.points.length > 0),
    [activeItems, historyById]
  );

  if (!open) return null;

  const left = panels[0] ?? null;
  const right = panels[1] ?? null;

  const rankWinner = getWinner(
    left?.rank ?? null,
    right?.rank ?? null,
    "lower"
  );

  const marketCapWinner = getWinner(
    left?.marketCapKrw ?? null,
    right?.marketCapKrw ?? null,
    "higher"
  );

  const householdWinner = getWinner(
    left?.householdCount ?? null,
    right?.householdCount ?? null,
    "higher"
  );

  const approvalYearWinner = getWinner(
    left?.approvalYear ?? null,
    right?.approvalYear ?? null,
    "higher"
  );

  const parkingWinner = getWinner(
    left?.parkingCount ?? null,
    right?.parkingCount ?? null,
    "higher"
  );

  const buildingWinner = getWinner(
    left?.buildingCount ?? null,
    right?.buildingCount ?? null,
    "higher"
  );

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="comparison-sheet-title"
        className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-hidden rounded-t-3xl border border-cyan-400/15 bg-[#0b1118] shadow-[0_-10px_50px_rgba(0,0,0,0.45)] md:left-1/2 md:top-1/2 md:bottom-auto md:w-[900px] md:max-w-[94vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl"
      >
        <div className="border-b border-white/5 bg-[#0b1118]/95 px-4 pb-4 pt-3 backdrop-blur md:px-5 md:pt-4">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/10 md:hidden" />

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/70 sm:text-xs">
                VS COMPARISON
              </p>
              <h3
                id="comparison-sheet-title"
                className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl"
              >
                2개 단지 스펙 비교
              </h3>
              <p className="mt-1 text-sm text-white/50 sm:text-[15px]">
                순위는 낮을수록, 시가총액·세대수·주차·준공연도는 높을수록 우위
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onClear}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70 transition hover:bg-white/[0.06]"
              >
                초기화
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/15"
              >
                닫기
              </button>
            </div>
          </div>
        </div>

        <div className="max-h-[calc(88vh-96px)] overflow-y-auto px-4 pb-6 pt-4 sm:px-5">
          {error ? (
            <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              {error}
            </div>
          ) : null}

          <div className="mb-4 overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#071018]">
            <div className="border-b border-white/5 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300/70">
                    CAPITAL DIVERGENCE
                  </p>
                  <h4 className="mt-1 text-sm font-semibold text-white sm:text-base">
                    듀얼 네온 라인 차트
                  </h4>
                  <p className="mt-1 text-xs text-white/45">
                    두 단지의 시가총액 해류가 어떻게 엇갈리는지 최근 6개월 기준으로 본다
                  </p>
                </div>

                <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/60">
                  Weekly View
                </span>
              </div>
            </div>

            <div className="px-3 py-3 sm:px-4">
              {historyError ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-200">
                  {historyError}
                </div>
              ) : historyLoading ? (
                <div className="h-[220px] w-full animate-pulse rounded-2xl border border-white/8 bg-white/[0.03]" />
              ) : chartSeries.length > 0 ? (
                <ComplexHistoryMiniChart series={chartSeries} />
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm leading-6 text-white/55">
                  비교 차트를 그릴 히스토리 데이터가 아직 충분하지 않다.
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {left ? (
              <ComparisonColumn
                side="left"
                badge="A"
                panel={left}
                loading={loading && !detailsById[left.complexId]}
                rankWinner={rankWinner}
                marketCapWinner={marketCapWinner}
                householdWinner={householdWinner}
                approvalYearWinner={approvalYearWinner}
                parkingWinner={parkingWinner}
                buildingWinner={buildingWinner}
              />
            ) : (
              <PlaceholderColumn />
            )}

            {right ? (
              <ComparisonColumn
                side="right"
                badge="B"
                panel={right}
                loading={loading && !detailsById[right.complexId]}
                rankWinner={rankWinner}
                marketCapWinner={marketCapWinner}
                householdWinner={householdWinner}
                approvalYearWinner={approvalYearWinner}
                parkingWinner={parkingWinner}
                buildingWinner={buildingWinner}
              />
            ) : (
              <PlaceholderColumn />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}