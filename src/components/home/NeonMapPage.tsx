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

  return <main className="min-h-screen bg-[var(--ko-bg)] px-4 py-5 text-ink sm:px-8" data-testid="neon-map-page">
    <div className="mx-auto max-w-[1600px]">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--ko-border)] pb-5">
        <div>
          <Link className="text-xl font-bold" href="/">KOAPTIX</Link>
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">시가총액을 지도로 살펴보세요</h1>
          <p className="mt-2 text-base text-muted">공개 단지의 크기와 변화를 지역별로 확인해요.</p>
        </div>
        <nav className="flex flex-wrap items-center gap-4" aria-label="지도 페이지 탐색">
          <Link className="ko-text-link" href="/#capital-map">전국 요약 지도</Link>
          <Link className="ko-text-link" href={"/ranking?" + new URLSearchParams({ universe: available ? code : "KOREA_ALL" })}>랭킹 보기 ↗</Link>
          <ThemeToggle />
        </nav>
      </header>
      <label className="mb-5 flex flex-wrap items-center gap-3 text-base font-semibold">
        표시 지역
        <select className="ko-index-select min-h-11 max-w-full rounded-lg border border-[var(--ko-border)] px-4 py-2"
          value={available ? code : ""}
          onChange={(event) => router.push("/map?" + new URLSearchParams({ universe: event.target.value }))}>
          {!available ? <option value="">공개되지 않은 지역</option> : null}
          {getMapUniverseRegistry().filter((region) => region.scope !== "SIGUNGU" || region.code === code).map((region) => <option key={region.code} value={region.code}>{getUniverseLabel(region.code)}</option>)}
        </select>
      </label>
      {!available ? <p className="rounded-xl border border-[var(--ko-border)] p-6">이 지역의 상세 지도는 아직 공개되지 않았어요. 위에서 다른 지역을 선택해 주세요.</p>
        : !configured ? <section className="rounded-xl border border-[var(--ko-border)] p-6" data-testid="neon-map-connection-unavailable">
          <h2 className="text-xl font-bold">현재 환경에서 카카오 지도 연결을 사용할 수 없어요.</h2>
          <p className="my-3 text-muted">단지 검색과 공개 랭킹은 계속 확인할 수 있어요.</p>
          <HomeV2Search universeCode={code} />
        </section> : <ExistingNeonMap key={code} items={EMPTY_ITEMS} />}
      <p className="mt-5 text-sm leading-relaxed text-muted">추정 시가총액은 대표가격과 세대수에 기반한 참고값이에요. 실제 자금의 유입·유출이나 개별 주택가격을 나타내지 않아요.</p>
    </div>
  </main>;
}
