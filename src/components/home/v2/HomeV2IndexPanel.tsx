"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { HomeIndexChartPayload } from "../../../lib/koaptix/queries";
import { getHomeUniverseRegistry, getUniverseLabel } from "../../../lib/koaptix/universes";
import { HomeV2SectionHeading } from "./HomeV2SectionHeading";

const numberFormat = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });

export function HomeV2IndexPanel({ index }: { index: HomeIndexChartPayload }) {
  const router = useRouter();
  const rows = index.rows;
  const [point, setPoint] = useState(Math.max(0, rows.length - 1));
  const pointIndex = Math.min(point, Math.max(0, rows.length - 1));
  const selected = rows[pointIndex];
  const min = rows.length ? Math.min(...rows.map(row => row.value)) : 0;
  const max = rows.length ? Math.max(...rows.map(row => row.value)) : 0;
  const spread = max - min || 1;
  const firstTime = Date.parse(rows[0]?.snapshotDate ?? "");
  const timeSpan = Date.parse(rows.at(-1)?.snapshotDate ?? "") - firstTime || 1;
  const xPosition = (snapshotDate: string) => 2 + ((Date.parse(snapshotDate) - firstTime) / timeSpan) * 96;
  const yPosition = (value: number) => 88 - ((value - min) / spread) * 76;
  const options = getHomeUniverseRegistry().filter(item => item.scope === "MACRO");
  const firstCount = rows[0]?.componentComplexCount;
  const latestCount = rows.at(-1)?.componentComplexCount;
  const coverageChanged = new Set(rows.map(row => row.componentComplexCount)).size > 1;

  const regionSelector = (
    <label className="mt-4 flex items-center gap-3 text-caption font-semibold text-muted">
      표시 지역
      <select aria-label="지수 표시 지역" value={index.requestedUniverseCode}
        onChange={event => router.push('/?universe=' + encodeURIComponent(event.target.value) + '#index')}
        className="min-w-0 flex-1 rounded border border-[var(--ko-border)] bg-transparent px-3 py-2 text-control text-ink focus-visible:outline-2 focus-visible:outline-accent">
        {!options.some(item => item.code === index.requestedUniverseCode) ? <option value={index.requestedUniverseCode}>{getUniverseLabel(index.requestedUniverseCode)}</option> : null}
        {options.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}
      </select>
    </label>
  );

  if (!rows.length) {
    return (
      <section id="index" tabIndex={-1} style={{ scrollMarginTop: "10rem" }} className="order-3 border-b border-[var(--ko-border)] py-6 lg:order-3 lg:border-b-0 lg:border-l lg:px-8">
        <details>
          <summary className="cursor-pointer text-control font-semibold text-ink">KOAPTIX 시장 지수 · 공개할 자료를 준비하고 있어요</summary>
          <p className="ko-copy mt-3 text-sm text-muted">시장 지수는 계산 대상 아파트들의 추정 가치가 기준일보다 얼마나 달라졌는지 보여주는 숫자예요. 이 지역에서 공개할 수 있는 기록은 아직 없어요.</p>
          {regionSelector}
          <a href="#koaptix-500" className="ko-text-link mt-3 inline-block text-control font-semibold">공개된 랭킹 보기 ↗</a>
        </details>
      </section>
    );
  }

  return (
    <section id="index" tabIndex={-1} style={{ scrollMarginTop: "10rem" }} data-testid="public-service-index" className="order-3 min-w-0 border-b border-[var(--ko-border)] py-8 lg:order-3 lg:border-b-0 lg:border-l lg:px-8">
      <HomeV2SectionHeading title="KOAPTIX 참고 지수" note={index.renderedUniverseLabel + ' · 기존 공개 기록'} />
      {regionSelector}
      <p className="mt-4 text-caption font-semibold text-muted">기록 기준일 {index.latestSnapshotDate ?? "확인 중"}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <p className="font-mono tabular-nums text-3xl font-semibold tracking-heading text-ink">{index.indexValue === null ? "—" : numberFormat.format(index.indexValue)}</p>
        <p className="text-caption text-muted">포함 단지 {latestCount?.toLocaleString("ko-KR") ?? "확인 중"}개</p>
      </div>
      <p className="ko-copy mt-3 text-sm text-muted">과거에 공개한 참고 지수예요. 지금의 시장을 새로 계산한 값이 아니며, 랭킹과 기준 날짜가 다를 수 있어요.</p>
      {coverageChanged ? (
        <p role="note" className="ko-copy mt-3 rounded-lg border border-[var(--ko-border)] bg-[var(--ko-accent-soft)] p-3 text-caption text-ink" data-testid="index-coverage-notice">
          처음 {firstCount?.toLocaleString("ko-KR") ?? "확인 중"}개 → 마지막 {latestCount?.toLocaleString("ko-KR") ?? "확인 중"}개 단지를 포함해요. 중간에 포함 단지가 달라져, 지수가 오른 만큼 집값이 올랐다고 해석할 수는 없어요.
        </p>
      ) : null}
      <div className="mt-5 flex h-48 gap-3">
        <div aria-hidden="true" className="flex shrink-0 flex-col justify-between py-5 text-caption tabular-nums text-muted"><span>{numberFormat.format(max)}</span><span>{numberFormat.format(min)}</span></div>
        <svg viewBox="0 0 100 100" role="img" aria-label={index.renderedUniverseLabel + ' 기존 공개 지수 ' + rows.length + '개 기록. 날짜 사이를 연결하지 않는 점 그래프입니다. 좌우 방향키로 기록을 선택할 수 있습니다.'}
          aria-describedby="index-point-value" tabIndex={0} preserveAspectRatio="none"
          className="min-w-0 flex-1 overflow-visible focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          onPointerMove={event => {
            const box = event.currentTarget.getBoundingClientRect();
            const target = firstTime + Math.max(0, Math.min(1, ((event.clientX - box.left) / box.width - 0.02) / 0.96)) * timeSpan;
            setPoint(rows.reduce((closest, row, i) => Math.abs(Date.parse(row.snapshotDate) - target) < Math.abs(Date.parse(rows[closest].snapshotDate) - target) ? i : closest, 0));
          }}
          onKeyDown={event => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              setPoint(previous => Math.max(0, Math.min(rows.length - 1, previous + (event.key === "ArrowRight" ? 1 : -1))));
            }
          }}>
          <line x1="0" y1="12" x2="100" y2="12" stroke="var(--ko-border)" strokeWidth="0.5" />
          <line x1="0" y1="88" x2="100" y2="88" stroke="var(--ko-border)" strokeWidth="0.5" />
          {rows.map((row, i) => <circle key={row.snapshotDate} cx={xPosition(row.snapshotDate)} cy={yPosition(row.value)} r={i === pointIndex ? 1.5 : 0.8} fill="var(--ko-accent)" opacity={i === pointIndex ? 1 : 0.65} />)}
        </svg>
      </div>
      <p id="index-point-value" aria-live="polite" className="mt-3 text-caption tabular-nums text-ink">{selected ? selected.snapshotDate + ' · 지수 ' + numberFormat.format(selected.value) + ' · ' + (selected.componentComplexCount?.toLocaleString("ko-KR") ?? "확인 중") + '개 단지' : "기록을 선택해 주세요."}</p>
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-caption text-muted"><span>{rows[0]?.snapshotDate}</span><span>{rows.at(-1)?.snapshotDate}</span></div>
      <p className="ko-copy mt-3 text-caption text-muted">기존 공개 기록 {rows.length}개 · {index.baseDate} = {index.baseValue.toLocaleString("ko-KR")}. 같은 단지들을 계속 비교했다는 확인이 없어 날짜 사이를 선으로 잇지 않아요.</p>
      <p className="ko-copy mt-3 text-caption text-muted">공식 지수의 기준일은 2024-01-01이며, 공식 지수 공개는 아직 보류 중입니다. 위 참고 지수와 기준이 달라요.</p>
    </section>
  );
}
