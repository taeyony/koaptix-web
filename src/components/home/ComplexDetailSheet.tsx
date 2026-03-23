"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type {
  ComplexDetail,
  HistoryChartPoint,
  RankingItem,
} from "../../lib/koaptix/types";

// 💡 잼이사의 지연 로딩 마법 (차트는 바텀 시트 열릴 때만 다운로드 됨!)
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

type ComplexDetailSheetProps = {
  open: boolean;
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

// --- 포맷팅 헬퍼 함수들 ---
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

function formatUpdatedAt(value: string | null | undefined): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
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
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/40 sm:text-xs">
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
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 12v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7" />
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
    </svg>
  );
}

export function ComplexDetailSheet({
  open,
  item,
  detail,
  loading,
  error,
  onClose,
}: ComplexDetailSheetProps) {
  const [sharePending, setSharePending] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 💡 페이즈 16: 차트 관련 상태
  const [chartData, setChartData] = useState<HistoryChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  const chartAbortRef = useRef<AbortController | null>(null);
  const chartCacheRef = useRef<Record<string, HistoryChartPoint[]>>({});

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
    return () => {
      chartAbortRef.current?.abort();

      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // 💡 차트 데이터 패치 로직
  useEffect(() => {
    if (!open || !item?.complexId) return;

    const complexId = item.complexId;
    const cached = chartCacheRef.current[complexId];

    if (cached) {
      setChartData(cached);
      setChartError(null);
      setChartLoading(false);
      return;
    }

    chartAbortRef.current?.abort();
    const controller = new AbortController();
    chartAbortRef.current = controller;

    setChartData([]);
    setChartError(null);
    setChartLoading(true);

    (async () => {
      const response = await fetch(
        `/api/complex-history?complexId=${encodeURIComponent(
          complexId
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
          payload.error ?? "히스토리 차트를 불러오지 못했다."
        );
      }

      const nextData = Array.isArray(payload.data)
        ? (payload.data as HistoryChartPoint[])
        : [];

      chartCacheRef.current[complexId] = nextData;
      setChartData(nextData);
    })()
      .catch((fetchError) => {
        if (
          fetchError instanceof DOMException &&
          fetchError.name === "AbortError"
        ) {
          return;
        }

        setChartData([]);
        setChartError(
          fetchError instanceof Error
            ? fetchError.message
            : "히스토리 차트를 불러오지 못했다."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setChartLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [open, item?.complexId]);

  function showToast(message: string, tone: "success" | "error") {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({ message, tone });

    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 2200);
  }

  async function handleShare() {
    if (!item || typeof window === "undefined") return;

    const shareTitle = detail?.name ?? item.name;
    const shareUrl = window.location.href;

    if (!shareUrl) {
      showToast("공유 링크를 만들지 못했다.", "error");
      return;
    }

    setSharePending(true);

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          await navigator.share({
            title: shareTitle,
            url: shareUrl,
          });
          return;
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === "AbortError") {
            return;
          }
        }
      }

      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(shareUrl);
        showToast("링크가 복사되었습니다!", "success");
        return;
      }

      showToast("이 브라우저에서는 링크 공유를 지원하지 않는다.", "error");
    } catch {
      showToast("링크를 복사하지 못했다. 다시 시도해라.", "error");
    } finally {
      setSharePending(false);
    }
  }

  if (!open || !item) return null;

  const title = detail?.name ?? item.name;
  const location = (detail?.locationLabel ?? item.locationLabel) || "위치 정보 없음";
  const rank = detail?.rank ?? item.rank;
  const marketCap = detail?.marketCapKrw ?? item.marketCapKrw;
  const rankDelta7d = detail?.rankDelta7d ?? item.rankDelta7d;
  const marketCapDelta7d = detail?.marketCapDelta7d ?? item.marketCapDelta7d;
  const marketCapDeltaPct7d = detail?.marketCapDeltaPct7d ?? item.marketCapDeltaPct7d;
  const historySnapshotDate = detail?.historySnapshotDate ?? item.historySnapshotDate;

  return (
    <>
      <div className="fixed inset-0 z-50">
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="complex-detail-title"
          className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-hidden rounded-t-3xl border border-cyan-400/15 bg-[#0b1118] shadow-[0_-10px_50px_rgba(0,0,0,0.45)] md:left-1/2 md:top-1/2 md:bottom-auto md:w-[640px] md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl flex flex-col"
        >
          <div className="border-b border-white/5 bg-[#0b1118]/95 px-4 pb-4 pt-3 backdrop-blur md:px-5 md:pt-4 shrink-0">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/10 md:hidden" />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/70 sm:text-xs">
                  COMPLEX DETAIL
                </p>
                <h3
                  id="complex-detail-title"
                  className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl"
                >
                  {title}
                </h3>
                <p className="mt-1 truncate text-sm text-white/50 sm:text-[15px]">
                  {location}
                </p>
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
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70 transition hover:bg-white/[0.06]"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto px-4 pb-6 pt-4 sm:px-5 flex-1">
            {error ? (
              <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <Metric label="현재 순위" value={`#${formatPlainNumber(rank)}`} />
              <Metric label="시가총액" value={formatMarketCapKrw(marketCap)} />
              <Metric
                label="주간 순위 변동"
                value={formatRankDelta(rankDelta7d)}
                tone={rankDeltaTone(rankDelta7d)}
              />
              <Metric
                label="Momentum (W)"
                value={formatPercent(marketCapDeltaPct7d)}
                tone={momentumTone(marketCapDeltaPct7d)}
              />
            </div>

            {/* 💡 페이즈 16: 히스토리 네온 차트 삽입부 */}
            <div className="mt-4 overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#071018]">
              <div className="border-b border-white/5 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300/70">
                      CAP FLOW HISTORY
                    </p>
                    <h4 className="mt-1 text-sm font-semibold text-white sm:text-base">
                      최근 6개월 시가총액 흐름
                    </h4>
                    <p className="mt-1 text-xs text-white/45">
                      주간 점 기준으로 노이즈를 걷어낸 모멘텀 라인
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/60">
                    Weekly View
                  </span>
                </div>
              </div>

              <div className="px-3 py-3 sm:px-4">
                {chartError ? (
                  <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-200">
                    {chartError}
                  </div>
                ) : chartLoading ? (
                  <div className="h-[220px] w-full animate-pulse rounded-2xl border border-white/8 bg-white/[0.03]" />
                ) : chartData.length > 0 ? (
                  <ComplexHistoryMiniChart data={chartData} />
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm leading-6 text-white/55">
                    차트를 그릴 히스토리 데이터가 아직 충분하지 않다.
                  </div>
                )}
              </div>
            </div>

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
                    value={`${formatSignedNumber(marketCapDelta7d)}원`}
                  />
                  <DetailRow
                    label="비교 기준 스냅샷"
                    value={historySnapshotDate ?? "-"}
                  />
                  <DetailRow
                    label="세대수"
                    value={formatCount(detail?.householdCount)}
                  />
                  <DetailRow
                    label="준공연도"
                    value={formatYear(detail?.approvalYear)}
                  />
                  <DetailRow
                    label="연식"
                    value={
                      detail?.ageYears != null ? `${detail.ageYears}년차` : "-"
                    }
                  />
                  <DetailRow
                    label="동 수"
                    value={formatCount(detail?.buildingCount)}
                  />
                  <DetailRow
                    label="주차대수"
                    value={formatCount(detail?.parkingCount)}
                  />
                  <DetailRow
                    label="데이터 기준일"
                    value={formatUpdatedAt(detail?.updatedAt)}
                  />
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4"
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
}