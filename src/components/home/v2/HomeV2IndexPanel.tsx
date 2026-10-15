"use client";

import { useRouter } from "next/navigation";
import type { HomeIndexChartPayload } from "../../../lib/koaptix/queries";
import { getHomeUniverseRegistry, getUniverseLabel } from "../../../lib/koaptix/universes";
import { KOAPTIX_OFFICIAL_BASE_DATE } from "../../../types/koaptix";
import { HomeV2SectionHeading } from "./HomeV2SectionHeading";

const numberFormat = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });

export function HomeV2IndexPanel({ index }: { index: HomeIndexChartPayload }) {
  const router = useRouter();
  const rows = index.rows;
  const options = getHomeUniverseRegistry().filter(item => item.scope === "MACRO");

  return (
    <section id="index" tabIndex={-1} style={{ scrollMarginTop: "10rem" }} data-testid="public-service-index" className="order-3 min-w-0 border-b border-[var(--ko-border)] py-8 lg:order-3 lg:border-b-0 lg:border-l lg:px-8">
      <HomeV2SectionHeading title="KOAPTIX 지수" note={index.renderedUniverseLabel} />
      <label className="mt-4 flex items-center gap-3 text-caption font-semibold text-muted">
        표시 지역
        <select aria-label="지수 표시 지역" value={index.requestedUniverseCode}
          onChange={event => router.push('/?universe=' + encodeURIComponent(event.target.value) + '#index')}
          className="ko-index-select min-w-0 flex-1 rounded-lg border border-[var(--ko-border)] px-3 py-3 text-control font-semibold focus-visible:outline-2 focus-visible:outline-accent">
          {!options.some(item => item.code === index.requestedUniverseCode) ? <option value={index.requestedUniverseCode}>{getUniverseLabel(index.requestedUniverseCode)}</option> : null}
          {options.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}
        </select>
      </label>

      <div className="mt-5 rounded-xl border border-[var(--ko-border)] bg-[var(--ko-accent-soft)] p-4" data-testid="official-index-status">
        <p className="text-control font-semibold text-ink">공식 기준 · {KOAPTIX_OFFICIAL_BASE_DATE} = 1,000</p>
        <p className="mt-3 text-section font-bold text-ink">공식 추이는 아직 검증 중이에요</p>
        <p className="ko-copy mt-2 text-sm text-muted">날짜별로 빠진 거래와 계산 대상을 확인하고 있어요. 확인되지 않은 구간을 이어 그리거나, 아래 과거 참고 값을 공식 지수로 바꿔 표시하지 않아요.</p>
      </div>
      <p className="ko-copy mt-4 text-caption text-muted">지수는 기준일의 아파트 시가총액 합계를 1,000으로 놓고 이후 합계가 얼마나 달라졌는지 보여줘요. 집 한 채의 가격이나 수익률을 뜻하지는 않아요.</p>

      {rows.length ? (
        <details className="mt-5 rounded-xl border border-[var(--ko-border)] p-4" data-testid="legacy-index-records">
          <summary className="cursor-pointer text-control font-semibold text-ink">과거 참고 지수 기록 {rows.length}개 보기</summary>
          <p className="ko-copy mt-3 text-caption text-muted">별도 기준인 {index.baseDate} = {index.baseValue.toLocaleString("ko-KR")} 기록이에요. {KOAPTIX_OFFICIAL_BASE_DATE} 기준 공식 지수와 다릅니다.</p>
          <p className="ko-copy mt-2 text-caption text-muted">포함 단지가 날짜마다 달라질 수 있어요. 값의 차이를 집값 상승률로 해석하거나 선으로 연결하지 않아요.</p>
          <div className="mt-4 max-h-80 overflow-auto rounded-lg border border-[var(--ko-border)]" tabIndex={0} role="region" aria-label="과거 참고 지수 기록 표">
            <table className="w-full text-left text-caption tabular-nums">
              <thead className="sticky top-0 bg-surface text-muted"><tr><th scope="col" className="px-3 py-3">기준일</th><th scope="col" className="px-3 py-3 text-right">참고 지수</th><th scope="col" className="px-3 py-3 text-right">포함 단지</th></tr></thead>
              <tbody>{[...rows].reverse().map(row => <tr key={row.snapshotDate} className="border-t border-[var(--ko-border)] text-ink"><th scope="row" className="whitespace-nowrap px-3 py-3 font-medium">{row.snapshotDate}</th><td className="px-3 py-3 text-right">{numberFormat.format(row.value)}</td><td className="px-3 py-3 text-right">{row.componentComplexCount?.toLocaleString("ko-KR") ?? "확인 중"}개</td></tr>)}</tbody>
            </table>
          </div>
        </details>
      ) : <p className="mt-5 text-caption text-muted">이 지역의 과거 참고 지수 기록은 아직 없어요.</p>}
    </section>
  );
}
