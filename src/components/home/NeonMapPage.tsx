"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getMapUniverseRegistry, getUniverseLabel, resolveUniverseRequest } from "../../lib/koaptix/universes";
import type { RankingItem } from "../../lib/koaptix/types";
import { ThemeToggle } from "./ThemeToggle";
import { HomeV2Search } from "./v2/HomeV2Search";

const EMPTY_ITEMS: RankingItem[] = [];
// The Kakao SDK is loaded only after entering this dedicated map page.
const ExistingNeonMap = dynamic(() => import("./NeonMap").then((module) => module.NeonMap), {
  ssr: false,
  loading: () => <p className="flex min-h-[520px] items-center justify-center p-6 text-ink" role="status">상세 지도 화면을 준비하고 있어요…</p>,
});

export function NeonMapPage() {
  const params = useSearchParams();
  const router = useRouter();
  const resolution = resolveUniverseRequest(params.get("universe"), { capability: "map" });
  const code = resolution.requestedUniverseCode;
  const available = !resolution.universeUnavailable;
  const configured = Boolean(process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY);

  const regionControl = <label className="flex min-w-0 items-center gap-2 text-sm font-semibold">
    <span className="sr-only">표시 지역</span>
    <select aria-label="표시 지역" className="ko-index-select min-h-11 w-full min-w-0 rounded-lg border border-[var(--ko-border)] px-3 py-2"
      value={available ? code : ""} onChange={event => router.push("/map?" + new URLSearchParams({ universe: event.target.value }))}>
      {!available ? <option value="">공개되지 않은 지역</option> : null}
      {getMapUniverseRegistry().filter(region => region.scope !== "SIGUNGU" || region.code === code).map(region => <option key={region.code} value={region.code}>{getUniverseLabel(region.code)}</option>)}
    </select>
  </label>;

  return <main className="ko-neon-page bg-[var(--ko-bg)] text-ink" data-testid="neon-map-page">
    <div className="mx-auto flex h-full w-full max-w-[2560px] flex-col gap-2">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <h1 className="text-lg font-bold"><Link href="/">KOAPTIX</Link><span className="ml-3 text-base font-semibold">지역별 시가총액</span></h1>
        </div>
        <nav className="flex flex-wrap items-center gap-4" aria-label="지도 페이지 탐색">
          <Link className="ko-text-link" href="/#capital-map">전국 요약 지도</Link>
          <Link className="ko-text-link" href={"/ranking?" + new URLSearchParams({ universe: available ? code : "KOREA_ALL" })}>랭킹 보기 ↗</Link>
        </nav>
      </header>
      {!available ? <div>{regionControl}<p className="rounded-xl border border-[var(--ko-border)] p-6">이 지역의 상세 지도는 아직 공개되지 않았어요. 위에서 다른 지역을 선택해 주세요.</p></div>
        : !configured ? <section className="rounded-xl border border-[var(--ko-border)] p-6" data-testid="neon-map-connection-unavailable">
          <h2 className="text-xl font-bold">현재 환경에서 카카오 지도 연결을 사용할 수 없어요.</h2>
          <p className="my-3 text-muted">단지 검색과 공개 랭킹은 계속 확인할 수 있어요.</p>
          <HomeV2Search universeCode={code} />
        </section> : <ExistingNeonMap key={code} items={EMPTY_ITEMS} toolbar={<>{regionControl}<div className="ko-neon-theme"><ThemeToggle /></div></>} />}
    </div>
  </main>;
}
