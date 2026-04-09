"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type ComparisonSheetProps = {
  open: boolean;
  items: unknown[];
  onClose: () => void;
  onRemoveItem?: (item: unknown) => void;
  onClear?: () => void;
};

type WinnerSide = "left" | "right" | null;

type MetricDefinition = {
  label: string;
  leftValue: number | null;
  rightValue: number | null;
  displayLeft: string;
  displayRight: string;
  compare: "higher" | "lower";
};

const CURRENT_YEAR = new Date().getFullYear();

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function toRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown, keys: string[]): string | null {
  const record = toRecord(value);
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return String(candidate);
    }
  }
  return null;
}

function readNumber(value: unknown, keys: string[]): number | null {
  const record = toRecord(value);
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      const parsed = Number(candidate.replace(/,/g, ""));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

// 🚨 잼이사 튜닝: 우리 데이터 규격(RankingItem)에 맞게 이름표(Key)를 정확히 꽂았습니다!
function getComplexName(item: unknown): string {
  return readString(item, ["name", "complex_name", "apt_name"]) ?? "선택 단지";
}

function getLocationText(item: unknown): string {
  return readString(item, ["locationLabel", "district_name"]) ?? "-";
}

function getRankText(item: unknown): string | null {
  const rank = readNumber(item, ["rank", "current_rank"]);
  if (rank === null) return null;
  return `#${Math.round(rank)}`;
}

function getMarketCap(item: unknown): number | null {
  return readNumber(item, ["marketCapTrillionKrw", "total_market_cap"]);
}

function getWeeklyMomentum(item: unknown): number | null {
  return readNumber(item, ["rankDelta7d", "weekly_momentum"]);
}

function getRecovery52w(item: unknown): number | null {
  const raw = readNumber(item, ["recoveryRate52w", "recovery_52w"]);
  if (raw === null) return null;
  if (Math.abs(raw) <= 1) return raw * 100; // 0.85 -> 85% 변환
  return raw;
}

// (참고: 세대수, 연식은 DB 쿼리에 추가되기 전까지는 '-' 로 방어합니다)
// 🚨 page.tsx 에서 내려보낸 이름표와 1000% 똑같이 맞춥니다!!
function getHouseholds(item: unknown): number | null {
  return readNumber(item, ["households", "household_count", "householdCount"]);
}

function getAgeYears(item: unknown): number | null {
  return readNumber(item, ["ageYears", "age_years", "building_age"]);
}

// --- 포맷터 ---
function formatInteger(value: number | null, suffix = ""): string {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(value)}${suffix}`;
}

function formatTrillion(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 3 }).format(value)}조`;
}

function formatSigned(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(value)}`;
}

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatAge(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${Math.round(value)}년`;
}

function getWinnerSide(leftValue: number | null, rightValue: number | null, compare: "higher" | "lower"): WinnerSide {
  if (leftValue === null || rightValue === null || !Number.isFinite(leftValue) || !Number.isFinite(rightValue) || leftValue === rightValue) {
    return null;
  }
  if (compare === "higher") return leftValue > rightValue ? "left" : "right";
  return leftValue < rightValue ? "left" : "right";
}

function buildMetricRows(leftItem: unknown, rightItem: unknown): MetricDefinition[] {
  const leftMarketCap = getMarketCap(leftItem);
  const rightMarketCap = getMarketCap(rightItem);
  const leftMomentum = getWeeklyMomentum(leftItem);
  const rightMomentum = getWeeklyMomentum(rightItem);
  const leftRecovery = getRecovery52w(leftItem);
  const rightRecovery = getRecovery52w(rightItem);
  const leftHouseholds = getHouseholds(leftItem);
  const rightHouseholds = getHouseholds(rightItem);
  const leftAge = getAgeYears(leftItem);
  const rightAge = getAgeYears(rightItem);

  return [
    {
      label: "시가총액",
      leftValue: leftMarketCap,
      rightValue: rightMarketCap,
      displayLeft: formatTrillion(leftMarketCap),
      displayRight: formatTrillion(rightMarketCap),
      compare: "higher",
    },
    {
      label: "주간 모멘텀",
      leftValue: leftMomentum,
      rightValue: rightMomentum,
      displayLeft: formatSigned(leftMomentum),
      displayRight: formatSigned(rightMomentum),
      compare: "higher",
    },
    {
      label: "52주 회복률",
      leftValue: leftRecovery,
      rightValue: rightRecovery,
      displayLeft: formatPercent(leftRecovery),
      displayRight: formatPercent(rightRecovery),
      compare: "higher",
    },
    {
      label: "세대수",
      leftValue: leftHouseholds,
      rightValue: rightHouseholds,
      displayLeft: formatInteger(leftHouseholds, "세대"),
      displayRight: formatInteger(rightHouseholds, "세대"),
      compare: "higher",
    },
    {
      label: "연식",
      leftValue: leftAge,
      rightValue: rightAge,
      displayLeft: formatAge(leftAge),
      displayRight: formatAge(rightAge),
      compare: "lower", // 연식은 숫자가 낮을수록(신축일수록) 우위!
    },
  ];
}

function MetricCell({ value, winner, side }: { value: string; winner: WinnerSide; side: "left" | "right" }) {
  const isWinner = winner === side;
  return (
    <div className={cx("rounded-2xl border px-4 py-3 transition", isWinner ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "border-slate-800 bg-slate-900/70 text-slate-100")}>
      <div className={cx("flex items-center gap-2", side === "right" ? "justify-end" : "justify-start")}>
        <span className="text-sm font-semibold tabular-nums">{value}</span>
        {isWinner ? <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium tracking-[0.18em] text-emerald-300">우위</span> : null}
      </div>
    </div>
  );
}

export default function ComparisonSheet({ open, items, onClose, onRemoveItem, onClear }: ComparisonSheetProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !open) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPaddingRight = body.style.paddingRight;
    const scrollBarGap = window.innerWidth - document.documentElement.clientWidth;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollBarGap > 0) body.style.paddingRight = `${scrollBarGap}px`;

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.paddingRight = prevBodyPaddingRight;
    };
  }, [isMounted, open]);

  useEffect(() => {
    if (!isMounted || !open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMounted, open, onClose]);

  const [leftItem, rightItem] = items.slice(0, 2);

  const metricRows = useMemo(() => {
    if (!leftItem || !rightItem) return [];
    return buildMetricRows(leftItem, rightItem);
  }, [leftItem, rightItem]);

  if (!isMounted || (!open && items.length === 0)) return null;

  const content = (
    <div className={cx("fixed inset-0 z-[1000] isolate", open ? "pointer-events-auto" : "pointer-events-none")}>
      <div className={cx("absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] transition-opacity duration-300", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div className={cx("absolute inset-x-0 bottom-0 mx-auto w-full max-w-7xl px-4 pb-4 transition-all duration-300 ease-out", open ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0")} onClick={(event) => event.stopPropagation()}>
        <section role="dialog" aria-modal="true" aria-labelledby="comparison-sheet-title" className="overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950/95 shadow-[0_-30px_80px_rgba(2,6,23,0.82)] ring-1 ring-white/5">
          <div className="border-b border-slate-800/80 px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">Comparison Sheet</p>
                <h2 id="comparison-sheet-title" className="mt-2 text-lg font-semibold text-slate-100">1:1 스펙 비교</h2>
                <p className="mt-1 text-xs text-slate-500">에메랄드 포인트는 해당 항목의 우위를 의미합니다.</p>
              </div>
              <div className="flex items-center gap-2">
                {onClear ? <button type="button" onClick={onClear} className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-300">초기화</button> : null}
                <button type="button" onClick={onClose} className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-300">닫기</button>
              </div>
            </div>
          </div>
          <div className="max-h-[78vh] overflow-y-auto overscroll-contain" onWheelCapture={(event) => event.stopPropagation()}>
            {!leftItem || !rightItem ? (
              <div className="flex min-h-[280px] items-center justify-center px-6 py-8">
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 px-6 py-8 text-center">
                  <p className="text-sm font-medium text-slate-200">비교 대상 2개를 담으면 여기서 바로 대조됩니다.</p>
                  <p className="mt-2 text-xs text-slate-500">랭킹 카드의 VS 버튼으로 두 단지를 선택하세요.</p>
                </div>
              </div>
            ) : (
              <div className="px-6 pb-6 pt-5">
                <div className="grid grid-cols-[minmax(0,1fr)_76px_minmax(0,1fr)] gap-3">
                  <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">LEFT</p>
                        <h3 className="mt-2 break-words text-base font-semibold text-slate-50">{getComplexName(leftItem)}</h3>
                        <p className="mt-2 text-xs text-slate-400">{getLocationText(leftItem)}</p>
                        {getRankText(leftItem) ? <p className="mt-1 text-xs text-slate-500">현재 순위 {getRankText(leftItem)}</p> : null}
                      </div>
                      {onRemoveItem ? <button type="button" onClick={() => onRemoveItem(leftItem)} className="shrink-0 rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-1.5 text-[11px] font-medium text-slate-400 transition hover:border-cyan-400/30 hover:text-cyan-300">제거</button> : null}
                    </div>
                  </article>
                  <div className="flex items-center justify-center">
                    <div className="rounded-full border border-slate-800 bg-slate-900/80 px-3 py-2 text-[11px] font-medium tracking-[0.28em] text-slate-300">VS</div>
                  </div>
                  <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      {onRemoveItem ? <button type="button" onClick={() => onRemoveItem(rightItem)} className="shrink-0 rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-1.5 text-[11px] font-medium text-slate-400 transition hover:border-cyan-400/30 hover:text-cyan-300">제거</button> : null}
                      <div className="min-w-0 text-right">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">RIGHT</p>
                        <h3 className="mt-2 break-words text-base font-semibold text-slate-50">{getComplexName(rightItem)}</h3>
                        <p className="mt-2 text-xs text-slate-400">{getLocationText(rightItem)}</p>
                        {getRankText(rightItem) ? <p className="mt-1 text-xs text-slate-500">현재 순위 {getRankText(rightItem)}</p> : null}
                      </div>
                    </div>
                  </article>
                </div>
                <div className="mt-5 space-y-3">
                  {metricRows.map((row) => {
                    const winner = getWinnerSide(row.leftValue, row.rightValue, row.compare);
                    return (
                      <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_76px_minmax(0,1fr)] gap-3">
                        <MetricCell value={row.displayLeft} winner={winner} side="left" />
                        <div className="flex items-center justify-center px-2 text-center text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">{row.label}</div>
                        <MetricCell value={row.displayRight} winner={winner} side="right" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}