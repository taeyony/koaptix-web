"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { buildComparisonSharePath, isComparisonDate } from "../../lib/koaptix/complexShare";
import { resolveUniverseRequest, getUniverseLabel } from "../../lib/koaptix/universes";
import { commonRankDelta } from "../../lib/koaptix/weeklyRankComparison";
import { publicComplexName } from "../../lib/koaptix/rankingPresentation";
import { formatPublicLocation } from "../../lib/koaptix/districtIdentity";
import type { RankingItem } from "../../lib/koaptix/types";
import { getComparisonFacts, getComparisonStartPath, publicRankScopeLabel } from "../../lib/koaptix/comparisonFacts";
import { HomeV2Search } from "./v2/HomeV2Search";

type ComparisonSheetProps = {
  open: boolean;
  items: RankingItem[];
  onClose: () => void;
  onRemoveItem?: (item: unknown) => void;
  onClear?: () => void;
  sharedDate?: string | null;
  universeCode?: string;
  onChangeItems?: (items: RankingItem[]) => void;
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
  return publicComplexName(readString(item, ["name", "complex_name", "apt_name"]) ?? "선택 단지");
}

function getLocationText(item: unknown): string {
  const district = readString(item, ["sigunguName", "sigungu_name"]);
  const dong = readString(item, ["legalDongName", "legal_dong_name"]);
  if (district || dong) return formatPublicLocation({ sigunguName: district ?? "", legalDongName: dong ?? "", cityName: readString(item, ["cityName"]), universeCode: readString(item, ["universeCode", "universe_code"]) ?? undefined });
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

function getWeeklyMomentum(item: unknown, common = false): number | null {
  if (common) return commonRankDelta(toRecord(item) as Pick<RankingItem, "snapshotDate" | "weeklyRankComparison">);
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
  const common = "weeklyRankComparison" in toRecord(leftItem) || "weeklyRankComparison" in toRecord(rightItem);
  const leftComparison = toRecord(toRecord(leftItem).weeklyRankComparison);
  const rightComparison = toRecord(toRecord(rightItem).weeklyRankComparison);
  const sameCohort = !common || (toRecord(leftItem).snapshotDate === toRecord(rightItem).snapshotDate &&
    toRecord(leftItem).universeCode === toRecord(rightItem).universeCode &&
    leftComparison.previousSnapshotDate === rightComparison.previousSnapshotDate && leftComparison.cohortSize === rightComparison.cohortSize);
  const leftMomentum = sameCohort ? getWeeklyMomentum(leftItem, common) : null;
  const rightMomentum = sameCohort ? getWeeklyMomentum(rightItem, common) : null;
  const leftRecovery = getRecovery52w(leftItem);
  const rightRecovery = getRecovery52w(rightItem);
  const leftHouseholds = getHouseholds(leftItem);
  const rightHouseholds = getHouseholds(rightItem);
  const leftAge = getAgeYears(leftItem);
  const rightAge = getAgeYears(rightItem);

  return [
    {
      label: "추정 시가총액",
      leftValue: leftMarketCap,
      rightValue: rightMarketCap,
      displayLeft: formatTrillion(leftMarketCap),
      displayRight: formatTrillion(rightMarketCap),
      compare: "higher",
    },
    {
      label: common ? "기록 간 순위 · 공통 단지 내" : "공표 순위 차이",
      leftValue: leftMomentum,
      rightValue: rightMomentum,
      displayLeft: leftMomentum === null ? "비교 자료 없음" : `${formatSigned(leftMomentum)}계단`,
      displayRight: rightMomentum === null ? "비교 자료 없음" : `${formatSigned(rightMomentum)}계단`,
      compare: "higher",
    },
    {
      label: "1년 최고치 대비 현재 수준",
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
      label: "준공 후 지난 기간",
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
    <div className={cx("ko-comparison-metric rounded-2xl border px-4 py-3 transition", isWinner ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "border-slate-800 bg-slate-900/70 text-slate-100")}>
      <div className={cx("flex items-center gap-2", side === "right" ? "justify-end" : "justify-start")}>
        <span className="text-sm font-semibold tabular-nums">{value}</span>
        {isWinner ? <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-caption font-medium tracking-label text-emerald-300">우위</span> : null}
      </div>
    </div>
  );
}

export default function ComparisonSheet({ open, items, onClose, onRemoveItem, onClear, sharedDate, universeCode, onChangeItems }: ComparisonSheetProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const searchId = useId();
  const dialogRef = useRef<HTMLElement>(null);

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
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scrollBarGap = window.innerWidth - document.documentElement.clientWidth;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollBarGap > 0) body.style.paddingRight = `${scrollBarGap}px`;
    dialogRef.current?.focus();

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.paddingRight = prevBodyPaddingRight;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isMounted, open]);

  useEffect(() => {
    if (!isMounted || !open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && dialogRef.current) {
        const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled)')).filter(node => node.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMounted, open, onClose]);

  const [leftItem, rightItem] = items.slice(0, 2);
  const leftCode = readString(leftItem, ["universeCode", "universe_code"]);
  const rightCode = readString(rightItem, ["universeCode", "universe_code"]);
  const leftDate = readString(leftItem, ["snapshotDate", "snapshot_date"]);
  const rightDate = readString(rightItem, ["snapshotDate", "snapshot_date"]);
  const facts = getComparisonFacts(items.slice(0, 2));
  const sharePath = facts && leftCode && leftCode === rightCode && leftDate === rightDate && isComparisonDate(leftDate) &&
    !resolveUniverseRequest(leftCode, { capability: "ranking" }).universeUnavailable
    ? buildComparisonSharePath([readString(leftItem, ["complexId", "complex_id"]) ?? "", readString(rightItem, ["complexId", "complex_id"]) ?? ""], leftCode, leftDate) : null;
  const searchUniverse = leftCode ?? universeCode;

  function choose(index: number, item: RankingItem) {
    if (!getComparisonStartPath(item) || item.universeCode !== searchUniverse) {
      setSelectionError("같은 지역에서 공개 순위·기준일이 확인된 단지를 골라 주세요."); return;
    }
    const other = items[index === 0 ? 1 : 0];
    if (other?.complexId === item.complexId) {
      setSelectionError("이미 선택한 단지예요. 서로 다른 두 단지를 골라 주세요."); return;
    }
    const next = index === 0 ? [item, ...(other ? [other] : [])] : [...(other ? [other] : []), item];
    if (next.length === 2 && !getComparisonFacts(next)) {
      setSelectionError("선택한 단지와 공개 지역·기준일 또는 공개본이 달라요. 기존 선택은 유지했어요. 같은 공개 자료의 단지를 고르거나 초기화 후 다시 선택해 주세요."); return;
    }
    onChangeItems?.(next);
    setEditingIndex(null);
    setSelectionError(null);
  }

  async function copyComparison(summary = false) {
    if (!sharePath) return;
    const url = new URL(sharePath, window.location.origin).toString();
    try { await navigator.clipboard.writeText(summary && facts ? `${facts.summary}\n${url}` : url); setCopiedPath((summary ? "summary:" : "") + sharePath); setCopyError(false); }
    catch { setCopyError(true); }
  }

  const metricRows = facts ? buildMetricRows(leftItem, rightItem) : [];

  if (!isMounted || !open) return null;

  const content = (
    <div className={cx("fixed inset-0 z-[1000] isolate", open ? "pointer-events-auto" : "pointer-events-none")}>
      <div className={cx("absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] transition-opacity duration-300", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div className={cx("absolute inset-x-0 bottom-0 mx-auto w-full max-w-7xl px-4 pb-4 transition-all duration-300 ease-out", open ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0")} onClick={(event) => event.stopPropagation()}>
        <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="comparison-sheet-title" className="ko-comparison-sheet max-h-[92dvh] overflow-y-auto overscroll-contain rounded-[28px] border border-slate-800 bg-slate-950/95 shadow-[0_-30px_80px_rgba(2,6,23,0.82)] ring-1 ring-white/5">
          <div className="border-b border-slate-800/80 px-6 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-caption font-medium uppercase tracking-label text-slate-500">두 단지 한눈에 비교</p>
                <h2 id="comparison-sheet-title" className="ko-section-title mt-2 text-section font-bold text-slate-100">우리 아파트와 비교해 볼까요?</h2>
                <p className="mt-1 text-caption text-slate-400">같은 지역·기준일의 공개 자료로 비교해요.</p>
                <p className="mt-2 text-control text-slate-300">{searchUniverse ? getUniverseLabel(searchUniverse) : "지역 확인 중"} · {leftDate ?? "단지를 선택하면 기준일을 표시해요"}{leftDate !== rightDate && rightDate ? ` / ${rightDate}` : ""}{leftDate ? " 기준" : ""}</p>
                {sharedDate && sharedDate !== leftDate ? <p role="status" className="mt-2 text-caption text-amber-300">공유 당시 기준일은 {sharedDate}예요. 지금은 현재 공개된 {leftDate ?? "최신"} 자료로 비교합니다.</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {sharePath ? <button type="button" onClick={() => void copyComparison()} className="min-h-11 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-control font-semibold text-cyan-200">{copiedPath === sharePath ? "복사 완료" : "비교 링크 복사"}</button> : null}
                {onClear ? <button type="button" onClick={() => { onClear(); setEditingIndex(null); setSelectionError(null); }} className="min-h-11 rounded-xl border border-[var(--ko-border)] bg-surface px-3 py-2 text-control font-medium text-ink transition hover:text-accent">초기화</button> : null}
                <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-[var(--ko-border)] bg-surface px-3 py-2 text-control font-medium text-ink transition hover:text-accent">닫기</button>
              </div>
            </div>
            {copyError ? <p role="status" className="mt-2 text-caption text-amber-300">링크를 복사하지 못했어요. 브라우저의 클립보드 허용 상태를 확인해 주세요.</p> : copiedPath === sharePath && sharePath ? <p role="status" className="mt-2 text-caption text-cyan-200">비교 링크를 복사했어요. 다시 열면 공개 자료를 확인하며, 갱신되면 기준일이 달라질 수 있어요.</p> : null}
          </div>
          <div className="px-4 pb-6 pt-5 sm:px-6" onWheelCapture={(event) => event.stopPropagation()}>
            <p role="status" className="mb-4 text-control font-semibold text-cyan-200">
              {items.length === 1 ? `${getComplexName(leftItem)} 선택됨 · 비교할 단지를 하나 더 골라주세요` : `${items.length}/2개 선택${onChangeItems ? " · 닫아도 선택은 유지돼요. 초기화하면 모두 지워요." : ""}`}
            </p>
            {selectionError ? <p role="alert" className="mb-4 text-control text-amber-300">{selectionError}</p> : null}
            {items.length === 1 && !getComparisonStartPath(leftItem) ? <p role="status" className="mb-4 text-control text-amber-300">선택한 단지의 공개 정보가 부족해요. 공개 순위·지역·기준일이 확인된 단지로 교체해 주세요.</p> : null}
            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              {[0, 1].map(index => {
                const item = items[index];
                const editing = editingIndex === index || !item;
                return <article key={index} data-testid={`comparison-slot-${index}`} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-caption text-slate-400">{index === 0 ? "첫 번째 단지" : "두 번째 단지"}</p>
                  {item ? <>
                    <h3 className="mt-2 break-words text-base font-semibold text-slate-50">{getComplexName(item)}</h3>
                    <p className="mt-2 text-sm text-slate-400">{getLocationText(item)}</p>
                    <p className="mt-2 text-control text-slate-300">{publicRankScopeLabel(item.universeCode)} {getRankText(item)}</p>
                    <p className="text-caption text-slate-400">{item.snapshotDate ? `${item.snapshotDate} 기준` : "기준일 확인 중"}</p>
                    <div className="mt-2 flex flex-wrap gap-4">
                      {onChangeItems ? <button type="button" className="ko-text-link min-h-11 text-control text-cyan-200" onClick={() => { setEditingIndex(editing ? null : index); setSelectionError(null); }}>{editing ? "교체 취소" : "다른 단지로 교체"}</button> : null}
                      {onRemoveItem ? <button type="button" aria-label={`${getComplexName(item)} 비교에서 제거`} className="min-h-11 text-control text-slate-300" onClick={() => { onRemoveItem(item); setEditingIndex(null); setSelectionError(null); }}>제거</button> : null}
                    </div>
                  </> : null}
                  {editing && onChangeItems && searchUniverse ? <HomeV2Search key={`${searchUniverse}-${index}-${item?.complexId ?? "empty"}`}
                    universeCode={searchUniverse} presentation="landing" inlineResults inputId={`${searchId}-${index}`}
                    label={item ? `${getComplexName(item)} 대신 비교할 단지 찾기` : items.length ? "비교할 상대 단지 찾기" : "비교할 단지 찾기"}
                    onSelectRankedItem={candidate => choose(index, candidate)} /> : !item ? <p className="mt-3 text-control text-slate-400">랭킹에서 비교할 단지를 선택해 주세요.</p> : null}
                </article>;
              })}
            </div>
            {leftItem && rightItem && !facts ? <p role="status" className="mt-5 text-control text-amber-300">지역·기준일 또는 공개본이 일치하지 않아 수치를 비교하지 않았어요. 같은 공개 자료의 단지로 교체해 주세요.</p> : null}
            {facts ? <div className="mt-5 space-y-3" data-testid="comparison-metrics">
                  {metricRows.map((row) => {
                    const winner = getWinnerSide(row.leftValue, row.rightValue, row.compare);
                    return (
                      <div key={row.label} className="ko-comparison-grid grid grid-cols-[minmax(0,1fr)_76px_minmax(0,1fr)] gap-3">
                        <MetricCell value={row.displayLeft} winner={winner} side="left" />
                        <div className="flex items-center justify-center px-2 text-center text-caption font-medium uppercase tracking-label text-slate-500">{row.label}</div>
                        <MetricCell value={row.displayRight} winner={winner} side="right" />
                      </div>
                    );
                  })}
              </div> : null}
            {facts && sharePath ? <div className="mt-5 border-t border-slate-800 pt-4 text-control">
              <p className="text-slate-200">{facts.differenceLabel}</p>
              <div className="mt-2 flex flex-wrap gap-x-4">
                <button type="button" className="ko-text-link min-h-11 text-cyan-200" onClick={() => void copyComparison(true)}>{copiedPath === `summary:${sharePath}` ? "비교 요약 복사 완료" : "기준일·비교 요약 복사"}</button>
                <a className="ko-text-link inline-flex min-h-11 items-center text-cyan-200" href={sharePath}>비교 링크 열기 ↗</a>
              </div>
              <p className="mt-2 text-caption text-slate-400">초록색은 시가총액·세대수 등이 더 크거나, 준공 후 기간이 짧은 쪽이에요. 투자 가치를 평가한 것은 아닙니다.</p>
            </div> : null}
          </div>
        </section>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
