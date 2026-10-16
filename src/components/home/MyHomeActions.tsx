"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useBookmarks } from "../../hooks/useBookmarks";
import { requireUniformUniverseServicePublication } from "../../lib/koaptix/currentness";

type Props = {
  complexId: string;
  name: string;
  locationLabel: string;
  universeCode: string;
  publication?: unknown;
};

/** A saved apartment is a shortcut, never a stored valuation. */
export function MyHomeActions({ complexId, name, locationLabel, universeCode, publication }: Props) {
  const { primaryComplexId, setPrimaryBookmark, clearPrimaryBookmark, markPrimaryViewed, isLoaded, storageUnavailable } = useBookmarks();
  const selected = primaryComplexId === complexId;

  useEffect(() => {
    if (!selected || !publication) return;
    try {
      const verified = requireUniformUniverseServicePublication([publication], universeCode);
      markPrimaryViewed({ ...verified, complexId });
    } catch {
      // An incomplete/stale detail cannot acknowledge a newer publication.
    }
  }, [selected, publication, universeCode, complexId, markPrimaryViewed]);

  return <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2" data-testid="my-home-actions">
    <button type="button" disabled={!isLoaded} aria-pressed={selected}
      onClick={() => selected ? clearPrimaryBookmark() : setPrimaryBookmark(complexId, { name, locationLabel, universeCode })}
      className="inline-flex min-h-11 items-center rounded-xl border border-[var(--ko-border)] bg-[var(--ko-accent-soft)] px-4 text-control font-semibold text-accent disabled:opacity-50">
      {selected ? "✓ 내 아파트 지정됨 · 해제" : "내 아파트로 지정"}
    </button>
    {selected ? <Link href="/#my-apartment" className="ko-text-link inline-flex min-h-11 items-center text-control text-accent">홈에서 내 아파트 바로 보기 ↗</Link> : <span className="text-caption text-muted">이 브라우저에 저장 · 관심목록에도 추가돼요</span>}
    {storageUnavailable ? <p role="status" className="w-full text-caption text-muted">브라우저 저장소를 사용할 수 없어 새로고침하면 지정이 유지되지 않을 수 있어요.</p> : null}
  </div>;
}
