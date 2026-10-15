"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { RankingItem } from "../../../lib/koaptix/types";
import { formatMarketCapMovement, formatRankMovement } from "../../../lib/koaptix/rankingPresentation";

export function HomeV2MovementTicker({ items, snapshotDate, universeLabel, universeCode }: {
  items: readonly RankingItem[];
  snapshotDate: string;
  universeLabel: string;
  universeCode: string;
}) {
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  if (!items.length) return null;
  const stopped = paused || hovered || focused || reducedMotion;
  const entries = (duplicate = false) => items.map(item => (
    <Link key={item.complexId} href={`/ranking?${new URLSearchParams({ universe: universeCode, complexId: item.complexId })}`}
      tabIndex={duplicate ? -1 : undefined} className="ko-ticker-item text-control leading-copy hover:underline">
      <strong className="font-semibold text-ink">{item.name}</strong>
      <span className={item.rankDelta7d && item.rankDelta7d > 0 ? "text-up" : item.rankDelta7d && item.rankDelta7d < 0 ? "text-down" : "text-muted"}>{formatRankMovement(item.rankDelta7d)}</span>
      <span className="text-muted">{formatMarketCapMovement(item.marketCapDeltaPct7d)}</span>
    </Link>
  ));
  return (
    <section aria-label="공개 단지 순위·시총 변동" data-testid="movement-ticker"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--ko-border)] bg-surface px-4 py-3 text-ink shadow-[var(--ko-shadow)]">
      <div className="mx-auto max-w-home">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-caption font-semibold text-muted"><span className="text-accent">순위·시총 변동</span> · {universeLabel} · {snapshotDate} 기준</p>
          <button type="button" className="min-h-10 shrink-0 rounded-lg border border-[var(--ko-border)] px-3 text-caption font-semibold hover:border-accent"
            aria-controls="movement-ticker-strip" aria-pressed={paused} disabled={reducedMotion} onClick={() => {
              if (paused && viewportRef.current) viewportRef.current.scrollLeft = 0;
              setPaused(value => !value);
            }}>
            {reducedMotion ? "자동 이동 꺼짐" : paused ? "▶ 재생" : "Ⅱ 멈춤"}
          </button>
        </div>
        <div ref={viewportRef} id="movement-ticker-strip" className="ko-ticker-viewport" data-stopped={stopped}
          onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
          <div className="ko-ticker-track" style={{ animationDuration: `${Math.max(24, items.length * 20)}s`, animationPlayState: stopped ? "paused" : "running" }}>
            <div className="ko-ticker-group">{entries()}</div>
            <div className="ko-ticker-group ko-ticker-copy" aria-hidden="true">{entries(true)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
