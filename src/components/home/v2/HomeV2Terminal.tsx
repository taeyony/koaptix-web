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
  dataAvailable,
  universeCode,
  universeLabel,
  universeUnavailable,
}: HomeV2TerminalProps) {
  return (
    <main className="home-v2 min-h-screen bg-[var(--ko-bg)] text-ink antialiased" data-universe-code={universeCode} data-universe-unavailable={universeUnavailable ? "true" : "false"}>
      <a href="#koaptix-500" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-3 focus:text-ink">랭킹으로 바로가기</a>
      <HomeV2Navigation universeCode={universeCode} />
      <header className="relative z-20 isolate border-b border-[var(--ko-border)] px-5 pt-5 sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <Skyline />
        </div>
        <div className="relative z-10 mx-auto flex max-w-home flex-col">
          <div className="py-8 sm:py-10 lg:py-12">
            <p className="text-caption font-semibold uppercase tracking-label text-muted sm:text-caption">
              Korea Apartment Capital Market
            </p>
            <p className="mt-3 break-words font-mono tabular-nums text-hero font-medium leading-hero tracking-hero text-ink">
              {totalMarketCapLabel ?? "—"}
            </p>
            <div className="mt-5 flex flex-wrap items-end gap-x-7 gap-y-2">
              <h1 className="text-[length:var(--ko-size-heading)] font-semibold leading-heading tracking-heading text-ink">
                공개 관측 아파트 추정 자본
              </h1>
              <div className="pb-1 text-caption leading-copy tracking-label text-muted">
                <p>KOAPTIX KOREA</p>
                <p>
                  {currentnessDate
                    ? `전국 자본 집계일 ${currentnessDate}`
                    : "전국 자본 집계일 확인 중"}
                </p>
              </div>
            </div>
            <p className="mt-3 ko-copy max-w-copy text-sm leading-copy text-muted">전국 공개 관측 단지의 추정 시가총액 합계입니다. 대한민국 전체 주택의 총액이 아닙니다.</p>
            <Suspense fallback={<p className="mt-7 text-xs text-muted">검색 준비 중</p>}>
              <HomeV2Search key={universeCode} universeCode={universeCode} />
            </Suspense>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <FormulaExplainer triggerLabel="산출 기준 보기" className="text-ink" />
              <p className="ko-caption max-w-copy text-caption leading-copy text-muted">{LAUNCH_COPY.compactBeta}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-[var(--ko-border)] sm:grid-cols-4">
            {[
              ["선택 지역", universeLabel],
              ["지수 기준일", index.latestSnapshotDate ?? "공개 이력 없음"],
              ["전국 자본 집계일", currentnessDate ?? "확인 중"],
              ["공개 상태", "소프트 공개 베타"],
            ].map(([label, value], position) => (
              <div
                key={label}
                className={`py-3 ${position % 2 ? "pl-4 sm:pl-6" : "pr-4"} ${position > 0 ? "sm:border-l sm:border-[var(--ko-border)] sm:px-6" : ""}`}
              >
                <p className="text-caption font-semibold uppercase tracking-label text-muted">
                  {label}
                </p>
                <p className="mt-1 break-words text-sm font-medium text-ink">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-home px-5 sm:px-8 lg:px-12">
        {!dataAvailable ? (
          <div className="border-b border-[var(--ko-border)] py-3 text-center text-caption text-muted">
            공개 지수·자본 집계가 없습니다. 랭킹과 지역 분포의 기준일은 각 영역에 표시됩니다.
          </div>
        ) : null}
        <div className="grid grid-cols-1 lg:grid-cols-[40fr_38fr_22fr]">
          <IndexPanel key={`index-${universeCode}`} index={index} />
          <Suspense fallback={<p className="py-7 text-xs text-muted">랭킹 준비 중</p>}>
            <HomeV2LiveBoard key={universeCode} universeCode={universeCode} universeLabel={universeLabel} universeUnavailable={universeUnavailable} />
          </Suspense>
          <CapitalMapV2 key={universeCode} universeCode={universeCode} universeLabel={universeLabel} universeUnavailable={universeUnavailable} />
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
