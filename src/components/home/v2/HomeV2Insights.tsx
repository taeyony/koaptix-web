import Link from "next/link";
import type { RankingItem, WeeklyRankComparisonMetadata } from "../../../lib/koaptix/types";
import { formatMarketCapMovement, formatRankMovement } from "../../../lib/koaptix/rankingPresentation";
import { commonRankDelta, commonRankTransition, needsMarketCapReview, previousWeekDate } from "../../../lib/koaptix/weeklyRankComparison";
import { HomeV2SectionHeading } from "./HomeV2SectionHeading";

type InsightsProps = {
  items: RankingItem[];
  rising: RankingItem[];
  falling: RankingItem[];
  comparison?: WeeklyRankComparisonMetadata;
  snapshotDate: string | null;
  status: "loading" | "ready" | "error" | "unavailable";
  universeCode: string;
  universeLabel: string;
};

/** Present the existing exact-week comparisons; never recalculate a published rank or cap. */
export function HomeV2Insights({ items, rising, falling, comparison, snapshotDate, status, universeCode, universeLabel }: InsightsProps) {
  const ready = status === "ready" && comparison?.status === "ready";
  const known = ready ? items.filter(item => commonRankDelta(item) !== null) : [];
  const up = known.filter(item => commonRankDelta(item)! > 0).length;
  const down = known.filter(item => commonRankDelta(item)! < 0).length;
  const missing = items.length - known.length;
  const newCount = ready ? items.filter(item => commonRankDelta(item) === null && (item.rankMovement ?? item.rank_movement) === "NEW").length : 0;
  const rankingHref = `/ranking?universe=${encodeURIComponent(universeCode)}`;
  const capComparisons = ready ? items.filter(item => {
    if (typeof item.marketCapDeltaPct7d !== "number" || !Number.isFinite(item.marketCapDeltaPct7d) || !item.snapshotDate) return false;
    try { return item.historySnapshotDate === previousWeekDate(item.snapshotDate); } catch { return false; }
  }) : [];
  const capUp = capComparisons.filter(item => item.marketCapDeltaPct7d! > 0).length;
  const capDown = capComparisons.filter(item => item.marketCapDeltaPct7d! < 0).length;
  const emptyMessage = status === "loading" ? "순위 비교 자료를 불러오고 있어요."
    : status === "unavailable" ? "이 지역의 랭킹은 아직 공개되지 않았어요."
    : status === "error" ? "순위 비교 자료를 불러오지 못했어요. 랭킹에서 다시 확인해 주세요."
    : !items.length ? "현재 공개된 랭킹에 표시할 단지가 없어요."
    : "지난 기록과 비교할 자료를 확인하고 있어요. 현재 공개 순위는 랭킹에서 볼 수 있어요.";
  const filterClass = "inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--ko-border)] px-4 py-2 text-control font-semibold transition";

  return (
    <section id="insights" tabIndex={-1} aria-labelledby="insights-title" className="order-5 border-t border-[var(--ko-border)] py-8 lg:order-5 lg:col-span-3" data-testid="home-insights">
      <div id="insights-title"><HomeV2SectionHeading title="순위 변화, 한눈에 보기" note={`${universeLabel} · ${status === "ready" ? `공개 TOP${items.length.toLocaleString("ko-KR")} 기준` : "공개 랭킹 기준"}`} /></div>
      <p className="mt-3 text-caption text-muted">
        {ready ? `${comparison.previousSnapshotDate} → ${snapshotDate} · 양쪽 기록에 모두 있는 ${comparison.commonComplexCount?.toLocaleString("ko-KR")}개 단지 안에서 순위를 비교해요.` : "확인된 같은 단지끼리 순위 변화를 비교해요."}
      </p>

      {ready && known.length ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-8">
          <div>
            <h3 className="text-control font-semibold text-ink">현재 TOP{items.length.toLocaleString("ko-KR")}의 순위 변화</h3>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2" data-testid="insights-counts">
              {[
                { label: "순위 상승 ▲", value: up, tone: "text-up" },
                { label: "순위 그대로", value: known.length - up - down, tone: "text-ink" },
                { label: "순위 하락 ▼", value: down, tone: "text-down" },
                { label: "비교 자료 없음", value: missing, tone: "text-muted" },
              ].map(metric => (
                <div key={metric.label} className="rounded-xl border border-[var(--ko-border)] bg-surface p-4">
                  <dt className="text-caption font-semibold text-muted">{metric.label}</dt>
                  <dd className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${metric.tone}`}>{metric.value.toLocaleString("ko-KR")}<span className="ml-1 text-caption font-normal">개</span></dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-caption leading-copy text-muted" data-testid="insights-accounting">
              전체 {items.length.toLocaleString("ko-KR")}개 = 비교 가능 {known.length.toLocaleString("ko-KR")}개 + 비교 자료 없음 {missing.toLocaleString("ko-KR")}개
            </p>
            {missing > 0 ? <p className="mt-1 text-caption leading-copy text-muted">비교 자료 없음: 지난 기록에 순위 없음 {newCount.toLocaleString("ko-KR")}개 · 기타 비교 미확인 {(missing - newCount).toLocaleString("ko-KR")}개</p> : null}
            <div className="mt-5 rounded-xl border border-[var(--ko-border)] p-4" data-testid="insights-cap-summary">
              <h3 className="text-control font-semibold text-ink">시가총액 변화는 따로 확인해요</h3>
              {capComparisons.length ? <p className="mt-2 text-caption leading-copy text-muted">검증된 {capComparisons.length.toLocaleString("ko-KR")}개 중 시총 상승 ▲ {capUp}개 · 그대로 {capComparisons.length - capUp - capDown}개 · 하락 ▼ {capDown}개. 나머지 {(items.length - capComparisons.length).toLocaleString("ko-KR")}개는 비교 자료 확인 중이에요.</p>
                : <p className="mt-2 text-caption leading-copy text-muted">시총 증감은 비교 자료 확인 중이에요. 순위가 올랐다고 시총이나 집값이 오른 것은 아니에요.</p>}
            </div>
          </div>

          <div data-testid="movement-highlights">
            <h3 className="text-control font-semibold text-ink">순위가 많이 바뀐 단지</h3>
            <p className="mt-1 text-caption text-muted">현재 TOP{items.length.toLocaleString("ko-KR")}에서 상승·하락 각 최대 3개</p>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              {[
                { label: "순위 상승 ▲", entries: rising, tone: "text-up" },
                { label: "순위 하락 ▼", entries: falling, tone: "text-down" },
              ].map(group => (
                <div key={group.label}>
                  <h4 className={`text-control font-semibold ${group.tone}`}>{group.label}</h4>
                  <ul className="mt-3 space-y-3">
                    {group.entries.length ? group.entries.map(item => (
                      <li key={item.complexId}>
                        <Link href={`/ranking?${new URLSearchParams({ universe: item.universeCode || universeCode, complexId: item.complexId })}`} className="block rounded-lg border border-[var(--ko-border)] p-3 transition hover:border-accent hover:bg-surface">
                          <span className="block text-control font-semibold text-ink">{item.name}</span>
                          <span className="mt-1 block text-caption text-muted">{item.locationLabel || [item.cityName, item.sigunguName, item.legalDongName].filter(Boolean).join(" ")}</span>
                          <span className={`mt-2 block text-control font-semibold tabular-nums ${group.tone}`}>{formatRankMovement(commonRankDelta(item))}</span>
                          <span className="mt-1 block text-caption tabular-nums text-muted">{commonRankTransition(item)}</span>
                          {capComparisons.includes(item) ? <span className="mt-1 block text-caption tabular-nums text-muted">{formatMarketCapMovement(item.marketCapDeltaPct7d)}</span> : null}
                          {capComparisons.includes(item) && needsMarketCapReview(item) ? <span className="mt-1 block text-caption font-semibold text-muted">큰 시총 변동 · 계산 입력 확인 필요</span> : null}
                        </Link>
                      </li>
                    )) : <li className="rounded-lg border border-dashed border-[var(--ko-border)] p-4 text-caption leading-copy text-muted">이 표본에서 {group.label.startsWith("순위 상승") ? "순위가 오른" : "순위가 내린"} 단지는 없어요.</li>}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : <p role="status" className="mt-5 rounded-xl border border-[var(--ko-border)] bg-surface p-5 text-control leading-copy text-muted">{ready && items.length ? `현재 ${items.length.toLocaleString("ko-KR")}개 모두 지난 기록과 비교할 순위가 없어요. ‘그대로’로 집계하지 않아요.` : emptyMessage}</p>}

      <div className="mt-6 flex flex-wrap gap-3" aria-label="순위 변화별 랭킹 보기">
        {[
          { label: "순위 상승 단지", count: up, query: "movement=up&sort=rank-up", tone: "text-up" },
          { label: "순위 하락 단지", count: down, query: "movement=down&sort=rank-down", tone: "text-down" },
        ].map(filter => ready && filter.count > 0 ? <Link key={filter.label} href={`${rankingHref}&${filter.query}`} className={`${filterClass} ${filter.tone} hover:border-accent`}>{filter.label} {filter.count.toLocaleString("ko-KR")}개 ↗</Link>
          : <button key={filter.label} type="button" disabled className={`${filterClass} cursor-not-allowed border-dashed text-muted`} title={ready ? "해당하는 단지가 없어요." : "비교 자료를 확인한 뒤 열려요."}>{filter.label} · {ready ? "0개" : "비교 준비 중"}</button>)}
        <Link href={rankingHref} className={`${filterClass} text-accent hover:border-accent`}>전체 랭킹 ↗</Link>
      </div>
      <details className="mt-4 text-caption leading-copy text-muted">
        <summary className="cursor-pointer font-semibold">어떤 순위를 비교하나요?</summary>
        <p className="ko-copy mt-2">두 기록에 모두 포함된 같은 단지들 안에서 다시 매긴 비교 순위예요. 현재 공표 순위와는 별개이며, 지난 기록이 없는 단지는 ‘그대로’로 세지 않아요. 위 숫자와 대표 단지는 현재 표시된 TOP{items.length || "1,000"}만 요약하므로, 공통 단지 전체의 상승·하락 개수와 다를 수 있어요.</p>
      </details>
    </section>
  );
}
