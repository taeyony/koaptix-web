import { Suspense } from "react";

import type { HomeIndexChartPayload } from "../../../lib/koaptix/queries";
import { LAUNCH_COPY } from "../BetaDisclosure";
import FormulaExplainer from "../FormulaExplainer";
import { CapitalMapV2 } from "./CapitalMapV2";
import { HomeV2LiveBoard } from "./HomeV2LiveBoard";
import { HomeV2Search } from "./HomeV2Search";
import { HomeV2IndexPanel as IndexPanel } from "./HomeV2IndexPanel";
import { HomeV2Navigation } from "./HomeV2Navigation";

type HomeV2TerminalProps = {
  index: HomeIndexChartPayload;
  totalMarketCapLabel: string | null;
  currentnessDate: string | null;
  aggregateComplexCount: number | null;
  dataAvailable: boolean;
  universeCode: string;
  universeLabel: string;
  universeUnavailable: boolean;
};

function Skyline() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 420"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[76%] w-full opacity-[0.055]"
    >
      <path
        d="M0 370h78v-66h35v-84h44v150h58V184h30v-58h32v244h72V252h44v118h51V212h38v-83h42v241h75V167h49v203h58V235h30v-69h36v204h82V283h47v87h62V192h53v178h64V242h46v128h74"
        fill="none"
        stroke="var(--ko-ink)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function HomeV2Terminal({
  index,
  totalMarketCapLabel,
  currentnessDate,
  aggregateComplexCount,
  dataAvailable,
  universeCode,
  universeLabel,
  universeUnavailable,
}: HomeV2TerminalProps) {
  const hasAggregateScope = Boolean(currentnessDate && aggregateComplexCount && Number.isSafeInteger(aggregateComplexCount) && aggregateComplexCount > 0);
  const scopeSummary = hasAggregateScope
    ? `대표 합계는 ${currentnessDate} 전국 별도 집계 ${aggregateComplexCount!.toLocaleString("ko-KR")}개 단지의 참고 합계입니다. 아래 랭킹·지도 표본을 합산한 값이 아닙니다.`
    : "대표 합계의 기준일·집계 범위를 확인하지 못했습니다. 공표 랭킹과 지도는 각 영역의 기준일과 표시 범위를 확인해 주세요.";
  return (
    <main className="home-v2 min-h-screen bg-[var(--ko-bg)] text-ink antialiased" data-universe-code={universeCode} data-universe-unavailable={universeUnavailable ? "true" : "false"}>
      <a href="#koaptix-500" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-3 focus:text-ink">랭킹으로 바로가기</a>
      <HomeV2Navigation universeCode={universeCode} />
      <header className="relative z-20 isolate border-b border-[var(--ko-border)] px-5 pt-5 sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <Skyline />
        </div>
        <div className="relative z-10 mx-auto flex max-w-home flex-col">
          <div className="py-4 sm:py-6">
            <p className="text-caption font-semibold uppercase tracking-label text-muted sm:text-caption">
              Korea Apartment Capital Market
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-x-7 gap-y-2">
              <h1 className="text-[length:var(--ko-size-heading)] font-semibold leading-heading tracking-heading text-ink">
                아파트 시가총액 랭킹
              </h1>
              <div className="pb-1 text-caption leading-copy tracking-label text-muted">
                <p>{universeLabel} · 공개 베타</p>
              </div>
            </div>
            <p className="mt-3 ko-copy max-w-copy text-sm leading-copy text-muted">단지의 공표 순위와 주간 순위 변화를 확인하세요.</p>
            <HomeV2Search key={universeCode} universeCode={universeCode} />
            <div className="mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-2">
              <p className="text-caption font-semibold text-muted">전국 별도 집계 참고 합계</p>
              <p className="break-words font-mono tabular-nums text-4xl font-medium tracking-number text-ink">
                {hasAggregateScope ? totalMarketCapLabel ?? "—" : "—"}
              </p>
            </div>
            <p className="mt-2 text-sm leading-copy text-muted" data-testid="aggregate-scope">{hasAggregateScope ? `${currentnessDate} 기준 · 전국 별도 집계 ${aggregateComplexCount!.toLocaleString("ko-KR")}개 단지 · 랭킹·지도와 별도 범위` : scopeSummary} · 대한민국 전체 주택의 총액이 아닙니다.</p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <FormulaExplainer title="합계와 랭킹의 산출 기준" triggerLabel="산출 기준 보기" className="text-ink" scopeSummary={scopeSummary} />
              <p className="ko-caption max-w-copy text-caption leading-copy text-muted">{LAUNCH_COPY.compactBeta}</p>
            </div>
          </div>

        </div>
      </header>

      <div className="mx-auto max-w-home px-5 sm:px-8 lg:px-12">
        {!dataAvailable ? (
          <div className="border-b border-[var(--ko-border)] py-3 text-center text-caption text-muted">
            별도 합계·지수 정보를 확인하지 못했습니다. 공표 랭킹과 지역 분포는 아래에서 확인할 수 있습니다.
          </div>
        ) : null}
        <div className="grid grid-cols-1 lg:grid-cols-[40fr_38fr_22fr]">
          <Suspense fallback={<p className="py-7 text-xs text-muted">랭킹 준비 중</p>}>
            <HomeV2LiveBoard key={universeCode} universeCode={universeCode} universeLabel={universeLabel} universeUnavailable={universeUnavailable} />
          </Suspense>
          <CapitalMapV2 key={universeCode} universeCode={universeCode} universeLabel={universeLabel} universeUnavailable={universeUnavailable} />
          <IndexPanel key={`index-${universeCode}`} index={index} />
        </div>
      </div>

      <footer className="border-t border-[var(--ko-border)] px-5 py-6 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-home flex-col justify-between gap-3 text-caption uppercase tracking-label text-muted sm:flex-row">
          <span>KOAPTIX / Apartment Capital Market Terminal</span>
          <span>{LAUNCH_COPY.representativeMetric}</span>
        </div>
      </footer>
    </main>
  );
}
