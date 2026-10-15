"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
// 🚨 react-dom에서 createPortal을 가져옵니다!!
import { createPortal } from "react-dom";
import { RecoveryGauge } from "./RecoveryGauge";
import { TierBadge } from "./TierBadge";
import { BetaDisclosure } from "./BetaDisclosure";
import type {
  ComplexDetail,
  HistoryChartPoint,
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
      <div className="h-[260px] w-full animate-pulse rounded-2xl bg-[var(--ko-accent-soft)]" />
    ),
  }
);

type ComplexDetailSheetProps = {
  open: boolean;
  complexId?: string | null;
  item: RankingItem | null;
  detail: ComplexDetail | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
};

type ToastState = {
  message: string;
  tone: "success" | "error";
} | null;

type ChartState = {
  complexId: string;
  points: HistoryChartPoint[];
  loading: boolean;
  error: string | null;
};

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

function formatSignedNumber(value: number): string {
  if (value > 0) return `+${new Intl.NumberFormat("ko-KR").format(value)}`;
  if (value < 0) return new Intl.NumberFormat("ko-KR").format(value);
  return "0";
}

function formatPercent(value: number): string {
  if (value > 0) return `+${value.toFixed(2)}%`;
  if (value < 0) return `${value.toFixed(2)}%`;
  return "0.00%";
}

function formatDeltaUnavailable(): string {
  return "기준 없음";
}

function formatRankDelta(delta: number): string {
  if (delta > 0) return `▲ +${delta}`;
  if (delta < 0) return `▼ ${delta}`;
  return "— 0";
}

function rankDeltaTone(delta: number): string {
  if (delta > 0) return "text-emerald-400";
  if (delta < 0) return "text-rose-400";
  return "text-white/45";
}

function momentumTone(value: number): string {
  if (value > 0) return "text-cyan-200";
  if (value < 0) return "text-fuchsia-200";
  return "text-white/45";
}

function recoveryTone(value: number | null | undefined): string {
  if (value == null) return "text-white/50";
  if (value >= 100) return "text-amber-200";
  if (value >= 80) return "text-emerald-200";
  return "text-fuchsia-200";
}

function formatRecoveryGap(value: number | null | undefined): string {
  if (value == null) return "-";
  if (value > 100) return `+${(value - 100).toFixed(1)}% breakout`;
  if (value < 100) return `-${(100 - value).toFixed(1)}% to high`;
  return "At high";
}

function formatCount(value: number | null | undefined): string {
  if (value == null) return "-";
  return `${new Intl.NumberFormat("ko-KR").format(value)}개`;
}

function formatPlainNumber(value: number | null | undefined): string {
  if (value == null) return "-";
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatYear(value: number | null | undefined): string {
  if (value == null) return "-";
  return `${value}년`;
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 sm:p-4">
      <p className="text-caption uppercase tracking-label text-white/40 sm:text-xs">
        {label}
      </p>
      <p className={`mt-1 text-base font-semibold tabular-nums sm:text-lg ${tone ?? ""}`}>
        {value}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 py-3 last:border-b-0">
      <span className="text-sm text-white/45">{label}</span>
      <span className="text-right text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 12v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7" />
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
    </svg>
  );
}

export function ComplexDetailSheet({
  open,
  complexId: fallbackComplexId,
  item,
  detail,
  loading,
  error,
  onClose,
}: ComplexDetailSheetProps) {
  // 🚨 순간이동을 위한 마운트 상태를 추가합니다!
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  
  const [sharePending, setSharePending] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [chartState, setChartState] = useState<ChartState | null>(null);

  const chartAbortRef = useRef<AbortController | null>(null);
  const chartCacheRef = useRef<Record<string, HistoryChartPoint[]>>({});
  const activeComplexId =
    item?.complexId ?? detail?.complexId ?? fallbackComplexId ?? null;
  const chartComplexId = item?.complexId ?? detail?.complexId ?? null;
  const matchingChart = chartState?.complexId === chartComplexId ? chartState : null;
  const chartData = matchingChart?.points ?? [];
  const chartLoading = chartComplexId != null && (matchingChart?.loading ?? true);
  const chartError = matchingChart?.error ?? null;

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    return () => {
      chartAbortRef.current?.abort();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  function showToast(message: string, tone: "success" | "error") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, tone });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 2200);
  }

  useEffect(() => {
    if (!open || !chartComplexId) {
      chartAbortRef.current?.abort();
      return;
    }

    const complexId = chartComplexId;
    const cached = chartCacheRef.current[complexId];

    if (cached) {
      setChartState({ complexId, points: cached, loading: false, error: null });
      return;
    }

    chartAbortRef.current?.abort();
    const controller = new AbortController();
    chartAbortRef.current = controller;

    setChartState({ complexId, points: [], loading: true, error: null });

    (async () => {
      const response = await fetch(
        `/api/complex-history?complexId=${encodeURIComponent(complexId)}&mode=weekly&days=180`,
        { method: "GET", signal: controller.signal, cache: "no-store" }
      );
      const payload = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error(payload.error ?? "히스토리 차트를 불러오지 못했다.");

      const series = Array.isArray(payload.data?.series) ? payload.data.series : [];
      const matchingSeries = series.find((entry: { complexId?: string }) => String(entry.complexId) === complexId);
      const nextData = Array.isArray(matchingSeries?.points) ? (matchingSeries.points as HistoryChartPoint[]) : [];

      chartCacheRef.current[complexId] = nextData;
      setChartState({ complexId, points: nextData, loading: false, error: null });
    })()
      .catch((fetchError) => {
        if (controller.signal.aborted) return;
        setChartState({
          complexId,
          points: [],
          loading: false,
          error: fetchError instanceof Error ? fetchError.message : "히스토리 차트를 불러오지 못했다.",
        });
      });

    return () => controller.abort();
  }, [open, chartComplexId]);

  async function handleShare() {
    if (!activeComplexId || typeof window === "undefined") return;
    const shareTitle = detail?.name ?? item?.name ?? "KOAPTIX detail";
    const shareUrl = window.location.href;

    if (!shareUrl) {
      showToast("공유 링크를 만들지 못했다.", "error");
      return;
    }

    setSharePending(true);
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          await navigator.share({ title: shareTitle, url: shareUrl });
          return;
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === "AbortError") return;
        }
      }
      if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(shareUrl);
        showToast("링크가 복사되었습니다!", "success");
        return;
      }
      showToast("이 브라우저에서는 링크 공유를 지원하지 않는다.", "error");
    } catch {
      showToast("링크를 복사하지 못했습니다. 잠시 후 다시 시도해주세요.", "error");
    } finally {
      setSharePending(false);
    }
  }

  // 🚨 마운트가 완료되었는지, 그리고 open과 item이 있는지 확인! (없으면 렌더링 X)
  if (!isMounted || !open) return null;

  if (!item && !detail) {
    if (!loading && !error) return null;

    const emptyContent = (
      <>
        <div className="fixed inset-0 z-[1000] isolate">
          <div
            className="absolute inset-0 z-[1000] bg-[#06090f]/90 backdrop-blur-lg"
            onClick={onClose}
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="complex-detail-title"
            data-testid="complex-detail-sheet"
            data-complex-id={activeComplexId ?? ""}
            className="absolute inset-x-0 bottom-0 z-[1001] flex max-h-[90dvh] flex-col overflow-hidden rounded-t-3xl border border-cyan-400/15 bg-[#0b1118] shadow-[0_-10px_50px_rgba(0,0,0,0.45)] md:left-1/2 md:top-1/2 md:bottom-auto md:w-[840px] md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl"
          >
            <div className="shrink-0 border-b border-white/5 bg-[#0b1118] px-4 pb-4 pt-3 md:px-5 md:pt-4">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/10 md:hidden" />

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-caption uppercase tracking-label text-cyan-300/70 sm:text-xs">
                    COMPLEX DETAIL
                  </p>
                  <h3 id="complex-detail-title" className="mt-1 truncate text-xl font-semibold tracking-heading sm:text-2xl">
                    {error ? "Detail unavailable" : "Loading detail"}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  data-testid="complex-detail-close"
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70 transition hover:bg-white/[0.06]"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto px-4 pb-6 pt-4 sm:px-5">
              {error ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-200">
                  {error}
                </div>
              ) : (
                <div className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="h-4 w-28 animate-pulse rounded bg-white/10" />
                  <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                  <div className="h-4 w-4/5 animate-pulse rounded bg-white/10" />
                  <div className="h-4 w-3/5 animate-pulse rounded bg-white/10" />
                </div>
              )}
            </div>
          </section>
        </div>
      </>
    );

    return createPortal(emptyContent, document.body);
  }

  const title = detail?.name ?? item?.name ?? "Complex detail";
  const location = (detail?.locationLabel ?? item?.locationLabel) || "위치 정보 없음";
  const rank = detail?.rank ?? item?.rank ?? null;
  const marketCap = detail?.marketCapKrw ?? item?.marketCapKrw ?? 0;
  const rankDelta7d = detail?.rankDelta7d ?? item?.rankDelta7d;
  const marketCapDelta7d = detail?.marketCapDelta7d ?? item?.marketCapDelta7d;
  const marketCapDeltaPct7d = detail?.marketCapDeltaPct7d ?? item?.marketCapDeltaPct7d;
  const historySnapshotDate = detail?.historySnapshotDate ?? item?.historySnapshotDate;
  const highMarketCap52w = detail?.highMarketCap52w ?? item?.highMarketCap52w;
  const recoveryRate52w = detail?.recoveryRate52w ?? item?.recoveryRate52w;
  const tierBadges = item?.tierBadges?.slice(0, 2) ?? [];
  const weeklyComparisonAvailable =
    detail?.weeklyComparisonAvailable ??
    (historySnapshotDate != null &&
      (rankDelta7d != null ||
        marketCapDelta7d != null ||
        marketCapDeltaPct7d != null));
  const displayRankDelta7d = weeklyComparisonAvailable
    ? detail?.rankDelta7dNullable ?? rankDelta7d ?? 0
    : null;
  const displayMarketCapDelta7d = weeklyComparisonAvailable
    ? detail?.marketCapDelta7dNullable ?? marketCapDelta7d ?? 0
    : null;
  const displayMarketCapDeltaPct7d = weeklyComparisonAvailable
    ? detail?.marketCapDeltaPct7dNullable ?? marketCapDeltaPct7d ?? 0
    : null;
  const householdCount = detail?.householdCount ?? item?.households ?? null;
  const approvalYear = detail?.approvalYear ?? item?.buildYear ?? null;
  const ageYears = detail?.ageYears ?? item?.ageYears ?? null;

  // 🚨 리턴될 JSX 전체를 'content' 라는 바구니에 담습니다!
  const content = (
    <>
      <div className="fixed inset-0 z-[1000] isolate">
        <div
          className="absolute inset-0 z-[1000] bg-[#06090f]/90 backdrop-blur-lg"
          onClick={onClose}
        />

        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="complex-detail-title"
          data-testid="complex-detail-sheet"
          data-complex-id={activeComplexId ?? ""}
          className="absolute inset-x-0 bottom-0 z-[1001] flex max-h-[90dvh] flex-col overflow-hidden rounded-t-3xl border border-cyan-400/15 bg-[#0b1118] shadow-[0_-10px_50px_rgba(0,0,0,0.45)] md:left-1/2 md:top-1/2 md:bottom-auto md:w-[840px] md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl"
        >
          <div className="shrink-0 border-b border-white/5 bg-[#0b1118] px-4 pb-4 pt-3 md:px-5 md:pt-4">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/10 md:hidden" />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-caption uppercase tracking-label text-cyan-300/70 sm:text-xs">
                  COMPLEX DETAIL
                </p>
                <h3 id="complex-detail-title" className="mt-1 truncate text-xl font-semibold tracking-heading sm:text-2xl">
                  {title}
                </h3>
                <p className="mt-1 truncate text-sm text-white/50 sm:text-control">
                  {location}
                </p>

                {tierBadges.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tierBadges.map((badge) => (
                      <TierBadge key={`${activeComplexId ?? "detail"}-${badge.key}-${badge.label}`} badge={badge} />
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  disabled={sharePending}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="공유하기"
                >
                  <ShareIcon />
                  <span className="hidden sm:inline">{sharePending ? "공유 중..." : "공유하기"}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  data-testid="complex-detail-close"
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70 transition hover:bg-white/[0.06]"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto px-4 pb-6 pt-4 sm:px-5">
            {error ? (
              <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              <Metric
                label="현재 순위"
                value={rank != null ? `#${formatPlainNumber(rank)}` : "-"}
              />
              <Metric label="시가총액" value={formatMarketCapKrw(marketCap)} />
              <Metric
                label="주간 순위 변동"
                value={
                  displayRankDelta7d != null
                    ? formatRankDelta(displayRankDelta7d)
                    : formatDeltaUnavailable()
                }
                tone={
                  displayRankDelta7d != null
                    ? rankDeltaTone(displayRankDelta7d)
                    : "text-white/45"
                }
              />
              <Metric
                label="주간 시총 변화율"
                value={
                  displayMarketCapDeltaPct7d != null
                    ? formatPercent(displayMarketCapDeltaPct7d)
                    : formatDeltaUnavailable()
                }
                tone={
                  displayMarketCapDeltaPct7d != null
                    ? momentumTone(displayMarketCapDeltaPct7d)
                    : "text-white/45"
                }
              />
            </div>

            <section aria-label="공개 시총 이력" className="mt-4 overflow-hidden rounded-2xl border border-[var(--ko-border)] bg-surface">
              <div className="px-4 pb-3 pt-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-caption font-semibold uppercase tracking-label text-accent">CAP FLOW HISTORY</p>
                    <h4 className="mt-1 text-xl font-bold text-ink">시가총액 변화 추이</h4>
                    <p className="mt-2 text-sm text-muted">저장된 시총을 주간으로 표시합니다. 관측 사이의 변동은 확인할 수 없습니다.</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--ko-accent-soft)] px-3 py-1 text-caption font-semibold text-accent">주간 이력</span>
                </div>
              </div>
              <div className="px-3 pb-4 sm:px-4">
                {chartError ? (
                  <div role="status" className="rounded-2xl border border-[var(--ko-border)] px-4 py-4 text-sm text-down">공개 시총 이력을 불러오지 못했습니다. 잠시 후 상세 화면을 다시 열어 주세요.</div>
                ) : chartLoading ? (
                  <div role="status" aria-label="시총 이력 불러오는 중" className="flex h-[260px] items-center justify-center rounded-2xl bg-[var(--ko-accent-soft)] text-sm text-muted">시총 이력을 불러오고 있습니다.</div>
                ) : (
                  <ComplexHistoryMiniChart key={chartComplexId} data={chartData} />
                )}
              </div>
            </section>

            <BetaDisclosure variant="detail" className="mt-4" />

            {highMarketCap52w != null || recoveryRate52w != null ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#071018]">
                <div className="border-b border-white/5 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-caption uppercase tracking-label text-cyan-300/70">회복 관측 지표</p>
                      <h4 className="mt-1 text-sm font-semibold text-white sm:text-base">52주 최고 시총 대비 회복률</h4>
                      <p className="mt-1 text-xs text-white/45">이전 고점과 현재 추정치 사이의 거리를 보여주는 참고 지표입니다.</p>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold tabular-nums ${recoveryTone(recoveryRate52w)}`}>
                      {recoveryRate52w != null ? `${recoveryRate52w.toFixed(1)}%` : "-"}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:px-4">
                  <RecoveryGauge recoveryRate={recoveryRate52w} />
                  <div className="grid grid-cols-1 gap-3">
                    <Metric label="52주 최고 시총" value={highMarketCap52w != null ? formatMarketCapKrw(highMarketCap52w) : "-"} />
                    <Metric label="현재-고점 갭" value={formatRecoveryGap(recoveryRate52w)} tone={recoveryTone(recoveryRate52w)} />
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-caption text-muted">52주 회복률은 비교할 공개 이력이 준비되면 표시합니다.</p>
            )}

            <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2">
              {loading && !detail ? (
                <div className="space-y-3 py-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
                  <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                  <div className="h-4 w-4/5 animate-pulse rounded bg-white/10" />
                  <div className="h-4 w-3/5 animate-pulse rounded bg-white/10" />
                </div>
              ) : (
                <>
                  <DetailRow
                    label="최근 7일 시총 변동"
                    value={
                      displayMarketCapDelta7d != null
                        ? `${formatSignedNumber(displayMarketCapDelta7d)}원`
                        : "비교 기준 데이터 없음"
                    }
                  />
                  <DetailRow
                    label="비교 기준 스냅샷"
                    value={historySnapshotDate ?? "비교 기준 데이터 없음"}
                  />
                  {householdCount != null ? (
                    <DetailRow label="세대수" value={formatCount(householdCount)} />
                  ) : null}
                  {approvalYear != null ? (
                    <DetailRow label="준공연도" value={formatYear(approvalYear)} />
                  ) : null}
                  {ageYears != null ? (
                    <DetailRow label="연식" value={`${ageYears}년차`} />
                  ) : null}
                  {chartData.length > 0 ? (
                    <DetailRow label="공개 시총 이력 최종 기준일" value={chartData[chartData.length - 1].snapshotDate} />
                  ) : null}
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[1060] flex justify-center px-4"
      >
        {toast ? (
          <div
            className={`rounded-full border px-4 py-2 text-sm font-medium shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur ${
              toast.tone === "success"
                ? "border-emerald-400/20 bg-emerald-400/12 text-emerald-100"
                : "border-rose-400/20 bg-rose-400/12 text-rose-100"
            }`}
          >
            {toast.message}
          </div>
        ) : null}
      </div>
    </>
  );

  // 🚨 맨 마지막에 펑! 하고 순간이동 포탈로 쏴버립니다!!
  return createPortal(content, document.body);
}
