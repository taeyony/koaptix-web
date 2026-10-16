"use client";

import Link from "next/link";
import { useState } from "react";
import { HomeV2Search } from "./v2/HomeV2Search";
import { getMatchupSelectionPath } from "../../lib/koaptix/comparisonFacts";
import { getRankingUniverseRegistry, getUniverseLabel } from "../../lib/koaptix/universes";
import { formatPublicLocation, resolveSidoFromUniverseCode } from "../../lib/koaptix/districtIdentity";
import type { RankingItem } from "../../lib/koaptix/types";

const regions = getRankingUniverseRegistry();
function label(code: string) {
  const province = resolveSidoFromUniverseCode(code);
  return code.startsWith("SGG_") && province ? `${getUniverseLabel(province).replace(/\s*전체$/, "")} ${getUniverseLabel(code)}` : getUniverseLabel(code);
}

export function PlayMatchup() {
  const [universeCode, setUniverseCode] = useState("KOREA_ALL");
  const [selected, setSelected] = useState<[RankingItem | null, RankingItem | null]>([null, null]);
  const [error, setError] = useState<string | null>(null);
  const pair = selected.filter((item): item is RankingItem => item !== null);
  const href = getMatchupSelectionPath(pair, universeCode);

  function choose(index: 0 | 1, item: RankingItem) {
    if (item.universeCode !== universeCode || !/^[1-9]\d*$/.test(item.complexId)) { setError("같은 비교 지역에 공개된 단지를 선택해 주세요."); return; }
    if (selected[index === 0 ? 1 : 0]?.complexId === item.complexId) { setError("서로 다른 두 단지를 골라 주세요."); return; }
    setSelected(previous => index === 0 ? [item, previous[1]] : [previous[0], item]);
    setError(null);
  }

  return <div data-testid="play-matchup" className="rounded-2xl border border-[var(--ko-border)] bg-surface p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="flex flex-wrap items-center gap-3 text-control font-semibold text-ink">비교 지역
        <select value={universeCode} aria-label="두 단지를 비교할 지역" className="min-h-11 max-w-full rounded-lg border border-[var(--ko-border)] bg-[var(--ko-bg)] px-3 text-ink"
          onChange={event => { setUniverseCode(event.target.value); setSelected([null, null]); setError(null); }}>
          {regions.map(region => <option key={region.code} value={region.code}>{label(region.code)}</option>)}
        </select>
      </label>
      <span className="text-caption text-muted">1. 지역 선택 → 2. 두 단지 검색 → 3. 비교</span>
    </div>
    <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2">
      {([0, 1] as const).map(index => <div key={index} className="min-w-0 rounded-xl border border-[var(--ko-border)] bg-[var(--ko-bg)] p-4" data-testid={`matchup-slot-${index}`}>
        {selected[index] ? <div className="flex min-h-36 flex-col justify-between gap-4">
          <div><p className="text-caption text-muted">{index === 0 ? "첫 번째 단지" : "두 번째 단지"}</p><h3 className="mt-2 break-words text-xl font-semibold text-ink">{selected[index].name}</h3><p className="mt-2 text-control text-muted">{formatPublicLocation(selected[index])}</p></div>
          <button type="button" className="ko-text-link min-h-11 self-start text-control font-semibold text-accent" aria-label={`${index === 0 ? "첫 번째" : "두 번째"} 단지 다시 고르기`} onClick={() => { setSelected(previous => index === 0 ? [null, previous[1]] : [previous[0], null]); setError(null); }}>다른 단지 고르기</button>
        </div> : <HomeV2Search key={`${universeCode}-${index}`} universeCode={universeCode} presentation="landing" inputId={`play-matchup-${index}`} label={index === 0 ? "첫 번째 단지 찾기" : "두 번째 단지 찾기"} onSelectRankedItem={item => choose(index, item)} />}
      </div>)}
    </div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-control text-muted" role="status">{error ?? (pair.length === 2 && !href ? "기준일이 다른 결과예요. 한 단지를 다시 검색해 주세요." : `${pair.length}/2개 선택 · 같은 지역의 공개 자료로 비교해요.`)}</p>
      {href ? <Link href={href} prefetch={false} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--ko-accent)] px-6 text-body font-bold text-[var(--ko-bg)]" data-testid="matchup-open">두 단지 비교하기 ↗</Link>
        : <button type="button" disabled className="min-h-12 rounded-xl border border-[var(--ko-border)] px-6 text-body font-semibold text-muted opacity-60">두 단지를 골라 주세요</button>}
    </div>
    <p className="mt-3 text-caption leading-copy text-muted">비교 화면에서 현재 공개된 두 단지의 순위·시총·기준일을 다시 확인해요. 선택한 지역에 공개 순위가 있는 단지만 고를 수 있어요.</p>
  </div>;
}
