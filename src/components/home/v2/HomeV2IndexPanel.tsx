"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { HomeIndexChartPayload } from "../../../lib/koaptix/queries";
import { getHomeUniverseRegistry, getUniverseLabel } from "../../../lib/koaptix/universes";
import { HomeV2SectionHeading } from "./HomeV2SectionHeading";

const numberFormat = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });

export function HomeV2IndexPanel({ index }: { index: HomeIndexChartPayload }) {
  const router = useRouter();
  const rows = index.rows.slice(-24);
  const [point, setPoint] = useState(Math.max(0, rows.length - 1));
  const pointIndex = Math.min(point, Math.max(0, rows.length - 1));
  const selected = rows[pointIndex];
  const values = rows.map((row) => row.value);
  const min = values.length ? Math.min(...values) : 0;
  const spread = (values.length ? Math.max(...values) : 0) - min || 1;
  const points = rows.map((row, i) => `${rows.length > 1 ? (i / (rows.length - 1)) * 100 : 50},${88 - ((row.value - min) / spread) * 70}`).join(" ");
  const options = getHomeUniverseRegistry().filter((item) => item.scope === "MACRO");
  const change = index.changePct1m;

  return (
    <section id="index" tabIndex={-1} className="order-1 min-h-[260px] border-b border-[var(--ko-border)] py-8 lg:order-2 lg:border-b-0 lg:border-l lg:px-8">
      <HomeV2SectionHeading title="KOAPTIX Index" note={`${index.renderedUniverseLabel} · ${rows.length ? "공개 서비스 지수" : "공표 준비 중"}`} />
      <label className="mt-4 flex items-center gap-3 text-caption font-semibold text-muted">
        표시 지역
        <select aria-label="지수 표시 지역" value={index.requestedUniverseCode}
          onChange={(event) => router.push(`/?universe=${encodeURIComponent(event.target.value)}#index`)}
          className="min-w-0 flex-1 rounded border border-[var(--ko-border)] bg-transparent px-3 py-2 text-control text-ink focus-visible:outline-2 focus-visible:outline-accent">
          {!options.some((item) => item.code === index.requestedUniverseCode) ? <option value={index.requestedUniverseCode}>{getUniverseLabel(index.requestedUniverseCode)}</option> : null}
          {options.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
        </select>
      </label>
      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-label font-semibold uppercase tracking-label text-muted">{index.indexName ?? index.renderedUniverseLabel}</p>
          <p className="mt-2 font-mono tabular-nums text-3xl font-medium tracking-heading text-ink">{index.indexValue === null ? "—" : numberFormat.format(index.indexValue)}</p>
        </div>
        <div className="text-right">
          <p className={`font-mono tabular-nums text-control font-semibold ${change === null || change === 0 ? "text-muted" : change > 0 ? "text-up" : "text-down"}`}>
            {change === null ? "—" : `${change > 0 ? "+" : ""}${numberFormat.format(change)}%`}
          </p>
          <p className="mt-1 text-caption text-muted">1개월 변화</p>
        </div>
      </div>
      <div className="mt-6 h-28">
        {rows.length > 1 ? (
          <svg viewBox="0 0 100 100" role="img" aria-label={`${index.renderedUniverseLabel} 공개 지수 이력. 좌우 방향키로 날짜를 확인할 수 있습니다.`}
            aria-describedby="index-point-value" tabIndex={0} preserveAspectRatio="none"
            className="h-full w-full overflow-visible focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            onPointerMove={(event) => {
              const box = event.currentTarget.getBoundingClientRect();
              setPoint(Math.max(0, Math.min(rows.length - 1, Math.round(((event.clientX - box.left) / box.width) * (rows.length - 1)))));
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                setPoint((previous) => Math.max(0, Math.min(rows.length - 1, previous + (event.key === "ArrowRight" ? 1 : -1))));
              }
            }}>
            <line x1="0" y1="89" x2="100" y2="89" stroke="var(--ko-border)" strokeWidth="0.7" />
            <polyline points={points} fill="none" stroke="var(--ko-accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            {selected ? <circle cx={(pointIndex / (rows.length - 1)) * 100} cy={88 - ((selected.value - min) / spread) * 70} r="2" fill="var(--ko-accent)" /> : null}
          </svg>
        ) : <p className="flex h-full items-center border-y border-dashed border-[var(--ko-border)] text-control text-muted">{rows.length === 1 ? "지수 이력이 1개입니다. 추세 차트는 이력이 더 쌓인 뒤 표시됩니다." : "이 지역의 공개 지수 이력이 아직 없습니다. 표시 지역을 바꿔 확인할 수 있습니다."}</p>}
      </div>
      <p id="index-point-value" aria-live="polite" className="mt-3 font-mono tabular-nums text-caption text-muted">{selected ? `${selected.snapshotDate} · ${numberFormat.format(selected.value)}` : "공개된 지수값이 없어 숫자와 차트를 표시하지 않습니다."}</p>
      <div className="mt-3 flex justify-between text-caption text-muted"><span>{rows[0]?.snapshotDate ?? "—"}</span><span>{index.latestSnapshotDate ?? "—"}</span></div>
      <p className="mt-3 text-caption leading-copy text-muted">{rows.length ? `공개 서비스 기준일 ${index.baseDate} = ${index.baseValue.toLocaleString("ko-KR")}.` : "미공표 값은 공개 지수로 표시하지 않습니다."} 공식 지수 공표는 보류 중입니다.</p>
      {!rows.length ? <a href="#koaptix-500" className="ko-text-link mt-4 inline-block text-control font-semibold text-accent">현재 공개 랭킹 확인 ↘</a> : null}
    </section>
  );
}
