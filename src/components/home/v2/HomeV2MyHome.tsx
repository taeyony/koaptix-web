"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useBookmarks } from "../../../hooks/useBookmarks";
import { formatKrwCompact } from "../../../lib/formatters";
import { formatPublicLocation } from "../../../lib/koaptix/districtIdentity";
import { findMyHomeNeighbors, readMyHomeBoard, resolveMyHomeRegion, type MyHomeBoard } from "../../../lib/koaptix/myHomeRanking";
import { isNewerMyHomePublication, type MyHomeViewedPublication } from "../../../lib/koaptix/myHomeStorage";
import type { KoaptixPublicationSelectionIdentity } from "../../../lib/koaptix/currentness";
import { getRankingUniverseRegistry } from "../../../lib/koaptix/universes";
import type { PublishedRankingItem, RankingItem } from "../../../lib/koaptix/types";
import ComparisonSheet from "../ComparisonSheet";

type Props = {
  nationalBoard: MyHomeBoard | null;
  nationalStatus: "loading" | "ready" | "error";
  selectedBoard: MyHomeBoard | null;
  onRetryNational?: () => void;
};
type RegionState = { code: string; complexId: string; status: "ready"; board: MyHomeBoard } | { code: string; complexId: string; status: "error"; board: null };

function detailHref(item: RankingItem) {
  return `/ranking?${new URLSearchParams({ universe: item.universeCode!, complexId: item.complexId })}`;
}

export function HomeV2MyHome({ nationalBoard, nationalStatus, selectedBoard, onRetryNational }: Props) {
  const { primaryComplexId, bookmarks, bookmarkDetails, lastViewedByUniverse, isLoaded, storageUnavailable, clearPrimaryBookmark, markPrimaryViewed } = useBookmarks();
  const [regionState, setRegionState] = useState<RegionState | null>(null);
  const [retry, setRetry] = useState(0);
  const [comparison, setComparison] = useState<PublishedRankingItem[]>([]);
  const national = nationalBoard?.items.find(item => item.complexId === primaryComplexId) ?? null;
  const selected = selectedBoard?.items.find(item => item.complexId === primaryComplexId) ?? null;
  const saved = primaryComplexId ? bookmarkDetails[primaryComplexId] : undefined;
  const region = useMemo(() => {
    const resolved = national || selected ? resolveMyHomeRegion((national ?? selected)!) : null;
    if (resolved) return resolved;
    // A saved public scope can recover a regional-only apartment without
    // guessing its identity from a name or an ambiguous address label.
    const fallback = getRankingUniverseRegistry().find(item => item.code !== "KOREA_ALL" && item.code === saved?.universeCode);
    return fallback ? { code: fallback.code, label: fallback.label } : null;
  }, [national, selected, saved?.universeCode]);
  const regionCode = region?.code ?? null;
  const reusedRegion = regionCode === selectedBoard?.publication.universe_code ? selectedBoard : null;
  const needsRegion = Boolean(primaryComplexId && regionCode && !reusedRegion);

  useEffect(() => {
    if (!needsRegion || !regionCode || !primaryComplexId) return;
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    void fetch(`/api/ranking?${new URLSearchParams({ universe: regionCode, limit: "1000", comparison: "common" })}`, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("regional_board_unavailable");
        const board = readMyHomeBoard(await response.json(), regionCode);
        if (active) setRegionState({ code: regionCode, complexId: primaryComplexId, status: "ready", board });
      })
      .catch(() => { if (active) setRegionState({ code: regionCode, complexId: primaryComplexId, status: "error", board: null }); })
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [needsRegion, regionCode, primaryComplexId, retry]);

  if (!isLoaded) return null;
  if (!primaryComplexId) return bookmarks.length ? <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--ko-border)] bg-surface p-4 text-control">
    <p className="text-muted">관심 단지 중 하나를 내 아파트로 지정하면, 다음 방문에 순위를 바로 볼 수 있어요.</p>
    <a href="#watchlist" className="ko-text-link inline-flex min-h-10 items-center font-semibold text-accent">관심목록에서 지정 ↓</a>
  </div> : null;

  const matchingRegion = regionState?.complexId === primaryComplexId && regionState.code === regionCode ? regionState : null;
  const regionalBoard = reusedRegion ?? (matchingRegion?.status === "ready" ? matchingRegion.board : null);
  const regional = regionalBoard?.items.find(item => item.complexId === primaryComplexId) ?? null;
  const regionalError = !reusedRegion && matchingRegion?.status === "error";
  const preferredBoard = national ? nationalBoard : regional ? regionalBoard : null;
  const current = national ?? regional;
  const neighbors = preferredBoard ? findMyHomeNeighbors(preferredBoard, primaryComplexId) : null;
  const name = current?.name ?? saved?.name ?? "저장한 내 아파트";
  const publication = preferredBoard?.publication;
  const publications = [national && nationalBoard?.publication, regional && regionalBoard?.publication].filter((value): value is KoaptixPublicationSelectionIdentity => Boolean(value));
  const newPublication = publications.some(value => isNewerMyHomePublication({ ...value, complexId: primaryComplexId }, lastViewedByUniverse[value.universe_code]));
  const acknowledge = () => { publications.forEach(value => markPrimaryViewed({ ...value, complexId: primaryComplexId })); };

  return <section id="my-apartment" tabIndex={-1} data-testid="my-home-card" className="mb-8 scroll-mt-28 rounded-2xl border border-accent bg-surface p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-caption font-semibold tracking-label text-accent">내 아파트 바로 보기 · 이 브라우저에 저장</p>
        <h2 className="mt-2 break-words text-section font-bold text-ink">{name}</h2>
        <p className="mt-1 text-control text-muted">{current ? formatPublicLocation(current) : saved?.locationLabel}</p>
      </div>
      {newPublication ? <button type="button" onClick={acknowledge} className="min-h-11 rounded-full bg-[var(--ko-accent-soft)] px-4 text-control font-semibold text-accent" aria-label="새 공표 확인 완료">새 공표 · 확인했어요 ✓</button> : null}
    </div>
    <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <RankMetric label="전국 공개 순위" item={national} board={nationalBoard} pending={nationalStatus === "loading"} error={nationalStatus === "error"} />
      <RankMetric label={`${region?.label ?? "소재 지역"} 공개 순위`} item={regional} board={regionalBoard} pending={Boolean(regionCode && !regionalBoard && !regionalError)} error={regionalError} />
      <div className="col-span-2 rounded-xl border border-[var(--ko-border)] p-4 sm:col-span-1">
        <dt className="text-caption text-muted">단지 전체 추정 시가총액</dt>
        <dd className="mt-2 text-2xl font-bold tabular-nums text-ink">{current ? formatKrwCompact(current.marketCapKrw) : "—"}</dd>
        <p className="mt-1 text-caption text-muted">{publication ? `${publication.snapshot_date} · ${national ? "전국" : region?.label} 공표 기준` : "공개된 값을 확인하고 있어요"}</p>
      </div>
    </dl>
    {publications.filter(value => !lastViewedByUniverse[value.universe_code]).map(value => <InitialPublicationView key={value.universe_code} complexId={primaryComplexId} publication={value} markViewed={markPrimaryViewed} />)}
    {national && regional && nationalBoard?.publication.snapshot_date !== regionalBoard?.publication.snapshot_date ? <p className="mt-3 text-caption text-muted">전국과 지역의 기준일이 달라요. 각 순위의 날짜를 확인해 주세요.</p> : null}
    {!regionCode ? <p className="mt-3 text-caption text-muted">단지의 소재 지역을 확인할 공개 정보가 부족해 지역 순위는 비워 뒀어요.</p> : null}
    {neighbors?.above || neighbors?.below ? <div className="mt-5 border-t border-[var(--ko-border)] pt-4">
      <p className="text-control font-semibold text-ink">바로 위·아래 단지는? <span className="font-normal text-muted">{national ? "전국" : region?.label} · {publication?.snapshot_date}</span></p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{[neighbors.above, neighbors.below].filter((item): item is NonNullable<typeof item> => item !== null).map(item => <div key={item.complexId} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--ko-border)] p-3">
        <Link href={detailHref(item)} className="min-w-0 text-control text-ink hover:text-accent"><span className="font-semibold tabular-nums">{item.rank}위</span> <span className="break-words">{item.name}</span></Link>
        <button type="button" onClick={() => { acknowledge(); setComparison([current!, item]); }} className="min-h-11 shrink-0 rounded-lg bg-[var(--ko-accent-soft)] px-3 text-control font-semibold text-accent" aria-label={`${name}와 ${item.name} 비교`}>비교</button>
      </div>)}</div>
    </div> : null}
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-control">
      {current ? <Link href={detailHref(current)} onClick={acknowledge} className="ko-text-link inline-flex min-h-11 items-center font-semibold text-accent">시총 추이·상세 보기 ↗</Link> : null}
      <a href="#watchlist" className="ko-text-link inline-flex min-h-11 items-center text-accent">다른 관심 단지로 변경 ↓</a>
      <button type="button" className="min-h-11 text-muted underline underline-offset-4" onClick={clearPrimaryBookmark}>내 아파트 지정 해제</button>
      {regionalError ? <button type="button" className="ko-text-link min-h-11 text-accent" onClick={() => setRetry(value => value + 1)}>지역 순위 다시 확인</button> : null}
      {nationalStatus === "error" && onRetryNational ? <button type="button" className="ko-text-link min-h-11 text-accent" onClick={onRetryNational}>전국 순위 다시 확인</button> : null}
    </div>
    <p className="mt-2 text-caption leading-copy text-muted">집 한 채의 가격이 아닌 단지 전체의 추정 가치예요. 금액·순위는 표시된 공표 기준일의 값이에요.</p>
    {storageUnavailable ? <p role="status" className="mt-2 text-caption text-muted">저장소를 사용할 수 없어 지정·확인 기록이 새로고침 후 유지되지 않을 수 있어요.</p> : null}
    {comparison.length === 2 && current && comparison[0].complexId === current.complexId && comparison[0].publication_event_id === current.publication_event_id && comparison[0].universeCode === current.universeCode ? <ComparisonSheet open items={comparison} onClose={() => setComparison([])} onClear={() => setComparison([])} onRemoveItem={() => setComparison([])} /> : null}
  </section>;
}

function RankMetric({ label, item, board, pending, error }: { label: string; item: RankingItem | null; board: MyHomeBoard | null; pending: boolean; error: boolean }) {
  return <div className="rounded-xl border border-[var(--ko-border)] p-4" aria-busy={pending}>
    <dt className="text-caption text-muted">{label}</dt>
    <dd className={`mt-2 font-bold tabular-nums text-ink ${item ? "text-2xl" : "text-control"}`}>{item ? `${item.rank.toLocaleString("ko-KR")}위` : pending ? "순위 확인 중…" : error ? "불러오지 못했어요" : "공개 순위 미확인"}</dd>
    <p className="mt-1 text-caption leading-copy text-muted">{item && board ? `${board.publication.snapshot_date} 기준` : pending ? "공개 기록을 찾고 있어요" : error ? "잠시 후 다시 확인해 주세요" : "불러온 공개 랭킹에서 확인하지 못했어요"}</p>
  </div>;
}

function InitialPublicationView({ complexId, publication, markViewed }: { complexId: string; publication: KoaptixPublicationSelectionIdentity; markViewed: (identity: MyHomeViewedPublication) => void }) {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const section = marker.current?.closest("section");
    if (!section || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        markViewed({ ...publication, complexId });
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(section);
    return () => observer.disconnect();
  }, [complexId, publication, markViewed]);
  return <span ref={marker} aria-hidden="true" className="sr-only" />;
}
