"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { RankingItem } from "../../../lib/koaptix/types";
import { formatMarketCapMovement, formatRankMovement } from "../../../lib/koaptix/rankingPresentation";

export function HomeV2MovementTicker({ items, snapshotDate, universeLabel, universeCode }: {
  items: readonly RankingItem[];
  snapshotDate: string;
  universeLabel: string;
  universeCode: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (paused || hovered || focused || reducedMotion || items.length < 2) return;
    const timer = window.setInterval(() => setIndex(value => (value + 1) % items.length), 8_000);
    return () => window.clearInterval(timer);
  }, [paused, hovered, focused, reducedMotion, items.length]);

  const active = items[index % items.length];
  if (!active) return null;
  const href = `/ranking?${new URLSearchParams({ universe: universeCode, complexId: active.complexId })}`;
  return (
    <section aria-label="공개 단지 순위·시총 변동" data-testid="movement-ticker"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--ko-border)] bg-surface px-4 py-3 text-ink shadow-[var(--ko-shadow)]"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
      <div className="mx-auto flex max-w-home flex-wrap items-center gap-x-5 gap-y-2">
        <p className="text-caption font-semibold text-muted"><span className="text-accent">순위·시총 변동</span> · {universeLabel} · {snapshotDate} 기준</p>
        <Link href={href} className="min-w-0 flex-1 basis-full text-control leading-copy hover:underline sm:basis-0" aria-live="off">
          <strong className="font-semibold">{active.name}</strong>
          <span className="ml-3">{formatRankMovement(active.rankDelta7d)}</span>
          <span className="ml-3 text-muted">{formatMarketCapMovement(active.marketCapDeltaPct7d)}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <button className="ko-icon-button" aria-label="이전 변동 단지" onClick={() => setIndex(value => (value + items.length - 1) % items.length)}>‹</button>
          <span className="text-caption tabular-nums text-muted">{index % items.length + 1}/{items.length}</span>
          <button className="ko-icon-button" aria-label="다음 변동 단지" onClick={() => setIndex(value => (value + 1) % items.length)}>›</button>
          {!reducedMotion ? <button className="min-h-10 rounded-lg border border-[var(--ko-border)] px-3 text-caption font-semibold" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "자동 넘김 켜기" : "자동 넘김 멈춤"}</button> : null}
        </div>
      </div>
    </section>
  );
}
