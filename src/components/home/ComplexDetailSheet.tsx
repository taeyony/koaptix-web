"use client";
import { SearchProgress } from "./SearchProgress";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { buildComplexSharePath } from "../../lib/koaptix/complexShare";
// 🚨 react-dom에서 createPortal을 가져옵니다!!
import { createPortal } from "react-dom";
import { RecoveryGauge } from "./RecoveryGauge";
import { TierBadge } from "./TierBadge";
import { BetaDisclosure } from "./BetaDisclosure";
import type {
  ComplexChartPeriod,
  ComplexChartRange,
  ComplexDetail,
  HistoryChartPoint,
  RankingItem,
} from "../../lib/koaptix/types";
import { KOAPTIX_OFFICIAL_BASE_DATE } from "../../types/koaptix";
import { getUniverseLabel } from "../../lib/koaptix/universes";
import { commonRankDelta, commonRankTransition, needsMarketCapReview } from "../../lib/koaptix/weeklyRankComparison";

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
  period: ComplexChartPeriod;
  source: "reference" | "published";
  points: HistoryChartPoint[];
  range: ComplexChartRange | null;
  loading: boolean;
  error: string | null;
};

const CHART_PERIODS: Array<{ value: ComplexChartPeriod; label: string; description: string }> = [
  { value: "weekly", label: "주", description: "각 주의 마지막 확인 값" },
  { value: "monthly", label: "월", description: "각 월의 마지막 확인 값" },
  { value: "yearly", label: "년", description: "각 연도의 마지막 확인 값" },
];

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
  return "비교 자료 없음";
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
  const [chartPeriod, setChartPeriod] = useState<ComplexChartPeriod>("weekly");
  const [chartSource, setChartSource] = useState<"reference" | "published">("reference");

  const chartAbortRef = useRef<AbortController | null>(null);
  const chartCacheRef = useRef<Record<string, { points: HistoryChartPoint[]; range: ComplexChartRange }>>({});
  const activeComplexId =
    item?.complexId ?? detail?.complexId ?? fallbackComplexId ?? null;
  const chartComplexId = item?.complexId ?? detail?.complexId ?? null;
  const matchingChart = chartState?.complexId === chartComplexId && chartState.period === chartPeriod && chartState.source === chartSource
    ? chartState
    : null;
  const chartData = matchingChart?.points ?? [];
  const chartRange = matchingChart?.range ?? null;
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
    const period = chartPeriod;
    const source = chartSource;
    const localReview = process.env.NODE_ENV === "development"
      && source === "reference"
      && new URLSearchParams(window.location.search).get("historyReview") === "restored";
    const cacheKey = `${complexId}:since-base:${period}:${localReview ? "review" : source}`;
    // A reference must recheck the current publication whenever it is opened;
    // a previous successful anchor check is not a lasting publication grant.
    const cached = localReview || source === "published" ? chartCacheRef.current[cacheKey] : undefined;

    if (cached) {
      setChartState({ complexId, period, source, ...cached, loading: false, error: null });
      return;
    }

    chartAbortRef.current?.abort();
    const controller = new AbortController();
    chartAbortRef.current = controller;

    setChartState({ complexId, period, source, points: [], range: null, loading: true, error: null });

    (async () => {
      const response = await fetch(
        `/api/complex-history?complexId=${encodeURIComponent(complexId)}&mode=${period}&range=since-base${localReview ? "&review=restored" : source === "reference" ? "&source=reference" : ""}`,
        { method: "GET", signal: controller.signal, cache: "no-store" }
      );
      const payload = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error(payload.error ?? "히스토리 차트를 불러오지 못했다.");
      if (payload.data?.mode !== period) throw new Error("Chart period does not match the requested period");

      const series = Array.isArray(payload.data?.series) ? payload.data.series : [];
      const matchingSeries = series.find((entry: { complexId?: string }) => String(entry.complexId) === complexId);
      const nextData = Array.isArray(matchingSeries?.points) ? (matchingSeries.points as HistoryChartPoint[]) : [];
      const range = matchingSeries?.range as ComplexChartRange | undefined;
      if (range?.requestedStartDate !== KOAPTIX_OFFICIAL_BASE_DATE) throw new Error("Chart history range does not match the request");
      const expectedBasis = localReview
        ? range.basis === "restored-local-review" && range.localOnly === true
        : source === "reference"
          ? range.basis === "reference" || (range.basis === "published" && range.referenceUnavailable === true)
          : range.basis == null || range.basis === "published";
      if (!expectedBasis) throw new Error("Chart history source does not match the request");

      if (localReview || source === "published") chartCacheRef.current[cacheKey] = { points: nextData, range };
      setChartState({ complexId, period, source, points: nextData, range, loading: false, error: null });
    })()
      .catch((fetchError) => {
        if (controller.signal.aborted) return;
        setChartState({
          complexId,
          period,
          source,
          points: [],
          range: null,
          loading: false,
          error: fetchError instanceof Error ? fetchError.message : "히스토리 차트를 불러오지 못했다.",
        });
      });

    return () => controller.abort();
  }, [open, chartComplexId, chartPeriod, chartSource]);

  async function handleShare(copyOnly = false) {
    if (!activeComplexId || typeof window === "undefined") return;
    const shareTitle = detail?.name ?? item?.name ?? "KOAPTIX 단지 정보";
    const selectedUniverse = new URLSearchParams(window.location.search).get("universe") ?? item?.universeCode ?? item?.universe_code;
    const sharePath = buildComplexSharePath(activeComplexId, selectedUniverse);
    const shareUrl = sharePath ? new URL(sharePath, window.location.origin).toString() : null;

    if (!shareUrl) {
      showToast("공유 링크를 만들지 못했다.", "error");
      return;
    }

    setSharePending(true);
    try {
      if (!copyOnly && typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          await navigator.share({ title: `${shareTitle} | KOAPTIX`, text: "단지 전체의 추정 시가총액과 공개 순위를 확인해 보세요.", url: shareUrl });
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
                    단지 상세 정보
                  </p>
                  <h3 id="complex-detail-title" className="mt-1 truncate text-xl font-semibold tracking-heading sm:text-2xl">
                    {error ? "상세 정보를 불러오지 못했어요" : "단지 정보를 불러오고 있어요"}
                  </h3>
                </div>

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

  const title = detail?.name ?? item?.name ?? "단지 상세 정보";
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
  const usesCommonComparison = Boolean(item && "weeklyRankComparison" in item);
  const displayRankDelta7d = usesCommonComparison && item ? commonRankDelta(item) : weeklyComparisonAvailable
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
                  단지 상세 정보
                </p>
                <h3 id="complex-detail-title" className="mt-1 truncate text-xl font-semibold tracking-heading sm:text-2xl">
                  {title}
                </h3>
                <p className="mt-1 truncate text-sm text-white/50 sm:text-control">
                  {location}
                </p>
                {item?.snapshotDate ? <p className="mt-1 text-caption text-muted">{getUniverseLabel(item.universeCode || "KOREA_ALL")} 공개 순위 · {item.snapshotDate} 기준</p> : null}

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
                  onClick={() => void handleShare(true)}
                  disabled={sharePending}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 text-sm text-cyan-100 disabled:opacity-60"
                  aria-label="단지 링크 복사"
                  title="단지 링크 복사"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>
                  <span className="hidden sm:inline">링크 복사</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  disabled={sharePending}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-60"
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
                {item ? "추가 상세 정보는 아직 제공되지 않습니다. 아래에서 공개된 순위를 확인해 주세요." : error}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              <Metric
                label="현재 순위"
                value={rank != null ? `#${formatPlainNumber(rank)}` : "-"}
              />
              <Metric label="추정 시가총액" value={formatMarketCapKrw(marketCap)} />
              <Metric
                label={usesCommonComparison ? "주간 비교 · 공통 단지 내" : "공표 순위 차이"}
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
                label="이번 주 시가총액 변화"
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

            <p className="mt-3 text-caption text-muted">{usesCommonComparison && item ? `${commonRankTransition(item) ?? "공통 단지 비교 자료 없음"} · ${item.weeklyRankComparison?.previousSnapshotDate ?? "전주 확인 중"} → ${item.snapshotDate ?? "기준일 확인 중"}` : "공표 순위 차이는 포함 단지 구성 변경의 영향도 받아요. 공통 단지끼리 비교한 주간 순위와 다를 수 있어요."}</p>
            {needsMarketCapReview({ marketCapDeltaPct7d: displayMarketCapDeltaPct7d }) ? <p className="mt-2 text-caption font-semibold text-muted">큰 시총 변동 · 거래 외에 세대수 등 계산 입력의 변화도 확인이 필요해요.</p> : null}
            <section aria-label={chartRange?.basis === "reference" ? "다시 계산한 과거 시가총액" : chartRange?.basis === "restored-local-review" ? "시총 재구성 검토" : "공개 시총 이력"} className="mt-4 overflow-hidden rounded-2xl border border-[var(--ko-border)] bg-surface">
              <div className="px-4 pb-3 pt-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 basis-80">
                    <p className="text-caption font-semibold uppercase tracking-label text-accent">단지 전체의 추정 가치</p>
                    <h4 className="mt-1 text-xl font-bold text-ink">시가총액, 얼마나 달라졌을까?</h4>
                    <p className="mt-2 text-sm text-muted">{CHART_PERIODS.find((entry) => entry.value === chartPeriod)?.description}을 보여드려요. 점 하나는 거래 한 건이 아니라 해당 날짜의 시가총액이에요.</p>
                  </div>
                  <div role="group" aria-label="시총 차트 표시 단위" className="inline-flex shrink-0 gap-1 rounded-xl border border-[var(--ko-border)] p-1">
                    {CHART_PERIODS.map((entry) => (
                      <button
                        key={entry.value}
                        type="button"
                        aria-pressed={chartPeriod === entry.value}
                        title={entry.description}
                        onClick={() => setChartPeriod(entry.value)}
                        className={`min-w-12 rounded-lg px-4 py-2 text-control font-semibold transition-colors ${chartPeriod === entry.value ? "bg-[var(--ko-accent-soft)] text-accent" : "text-muted hover:bg-[var(--ko-accent-soft)]"}`}
                      >{entry.label}</button>
                    ))}
                  </div>
                </div>
                <div role="group" aria-label="시총 이력 기준" className="mt-4 flex flex-wrap gap-2">
                  {([{ value: "reference", label: "다시 계산한 과거 추이" }, { value: "published", label: "당시 공개된 기록" }] as const).map((entry) => (
                    <button key={entry.value} type="button" aria-pressed={chartSource === entry.value} onClick={() => setChartSource(entry.value)}
                      className={`min-h-11 rounded-lg border border-[var(--ko-border)] px-3 py-2 text-control font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ko-accent)] ${chartSource === entry.value ? "bg-[var(--ko-accent-soft)] text-accent" : "text-muted hover:bg-[var(--ko-accent-soft)]"}`}>{entry.label}</button>
                  ))}
                </div>
                <p className="mt-2 text-caption text-muted">조회 시작: {KOAPTIX_OFFICIAL_BASE_DATE} 이후 · {chartLoading ? "이력을 확인하고 있습니다." : chartRange?.basis === "reference" ? "확인된 거래로 다시 계산한 참고 자료예요." : chartRange?.basis === "restored-local-review" ? "로컬 복구 검토 · 실사이트 미반영" : "당시에 저장해 공개한 값만 보여드려요."}</p>
                {chartRange?.referenceUnavailable ? <p role="status" className="mt-3 text-caption text-[var(--ko-warning)]">과거 값을 다시 계산하는 데 필요한 확인이 끝나지 않아, 당시 공개된 기록을 보여드려요.</p> : null}
                {chartRange?.basis === "restored-local-review" || chartRange?.basis === "reference" ? (
                  <div role="status" className="mt-3 rounded-xl border border-[var(--ko-border)] bg-[var(--ko-accent-soft)] px-3 py-3 text-caption text-muted">
                    <p className="font-semibold text-ink">{chartRange.basis === "reference" ? "과거 추이는 이렇게 계산했어요" : "과거 시총 재구성 검토"}</p>
                    <p className="mt-1">{chartRange.sourceNote}</p>
                    <p className="mt-1">거래·세대수 자료 확인일: {chartRange.sourceObservedAt?.slice(0, 10)} · 시작일과 월말에 계산한 값을 주·월·년 단위로 묶어 보여드려요. 주를 선택해도 계산하지 않은 날짜의 값이 새로 생기지는 않아요.</p>
                    {(chartRange.excludedPointCount ?? 0) > 0 ? <p className="mt-1 text-[var(--ko-warning)]">계산 결과를 확인할 수 없는 {chartRange.excludedPointCount}개 날짜는 비워 두고, 그 사이를 선으로 잇지 않아요. 면적별 최근 12개월 거래가 3건 이상 있어야 가격을 계산하며, 가격을 계산할 수 있는 세대가 전체의 95%에 못 미치는 날짜 등은 표시하지 않아요.</p> : null}
                    {chartRange.reviewBlockedReasons?.length ? <p className="mt-1 text-[var(--ko-warning)]">거래·세대수 자료나 현재 공개된 값과의 확인이 끝나지 않아, 다시 계산한 값은 보여드리지 않아요. 기존에 공개한 기록은 그대로 남아 있어요.</p> : null}
                  </div>
                ) : null}
                {chartRange?.availableFrom && chartRange.availableTo ? (
                  <div className="mt-3 rounded-xl border border-[var(--ko-border)] px-3 py-2 text-caption text-muted">
                    <p className="font-semibold text-ink">확인할 수 있는 기간: {chartRange.availableFrom} ~ {chartRange.availableTo}</p>
                    {chartRange.availableFrom > chartRange.requestedStartDate ? (
                      <p className="mt-1 text-[var(--ko-warning)]">{KOAPTIX_OFFICIAL_BASE_DATE}부터 첫 기록 전까지는 확인된 계산값이 없어 비워 두었어요. 조회 단위를 바꿔도 이 구간의 값은 표시되지 않아요.</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="px-3 pb-4 sm:px-4">
                {chartError ? (
                  <div role="status" className="rounded-2xl border border-[var(--ko-border)] px-4 py-4 text-sm text-down">시총 이력을 불러오지 못했습니다. 잠시 후 상세 화면을 다시 열어 주세요.</div>
                ) : chartLoading ? (
                  <div aria-busy="true" className="flex h-[260px] items-center justify-center rounded-2xl bg-[var(--ko-accent-soft)]"><SearchProgress label="시총 이력을 불러오고 있어요" /></div>
                ) : (
                  <ComplexHistoryMiniChart key={`${chartComplexId}:${chartPeriod}:${chartSource}`} data={chartData} period={chartPeriod} requestedStartDate={chartRange?.requestedStartDate} basis={chartRange?.basis} />
                )}
              </div>
            </section>

            <BetaDisclosure variant="detail" className="mt-4" />

            {highMarketCap52w != null || recoveryRate52w != null ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#071018]">
                <div className="border-b border-white/5 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-caption uppercase tracking-label text-cyan-300/70">최근 1년 최고치와 비교</p>
                      <h4 className="mt-1 text-sm font-semibold text-white sm:text-base">최근 1년 최고 시가총액 대비 현재 수준</h4>
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
                    <Metric label="최근 1년 최고 시가총액" value={highMarketCap52w != null ? formatMarketCapKrw(highMarketCap52w) : "-"} />
                    <Metric label="최고치와의 차이" value={formatRecoveryGap(recoveryRate52w)} tone={recoveryTone(recoveryRate52w)} />
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-caption text-muted">최근 1년 최고치와의 비교는 공개된 기록이 더 쌓이면 보여드릴게요.</p>
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
                        : "비교할 자료가 없어요"
                    }
                  />
                  <DetailRow
                    label="비교한 이전 날짜"
                    value={historySnapshotDate ?? "비교할 자료가 없어요"}
                  />
                  {householdCount != null ? (
                    <DetailRow label="세대수" value={formatCount(householdCount)} />
                  ) : null}
                  {approvalYear != null ? (
                    <DetailRow label="준공연도" value={formatYear(approvalYear)} />
                  ) : null}
                  {ageYears != null ? (
                    <DetailRow label="준공 후 지난 기간" value={`${ageYears}년차`} />
                  ) : null}
                  {chartData.length > 0 ? (
                    <DetailRow label={chartRange?.basis === "reference" ? "참고 이력 최종 기준일" : chartRange?.basis === "restored-local-review" ? "재구성 검토 최종 기준일" : "공개 시총 이력 최종 기준일"} value={chartData[chartData.length - 1].snapshotDate} />
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
