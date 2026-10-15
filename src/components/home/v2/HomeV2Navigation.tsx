"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useBookmarks } from "../../../hooks/useBookmarks";
import { ThemeToggle } from "../ThemeToggle";

const sections = [
  { id: "index", label: "시장 지수" },
  { id: "capital-map", label: "지역별 지도" },
  { id: "insights", label: "순위 변화 요약" },
  { id: "watchlist", label: "관심목록" },
];

export function HomeV2Navigation({ universeCode }: { universeCode: string }) {
  const [active, setActive] = useState("");
  const { bookmarks, isLoaded } = useBookmarks();
  useEffect(() => {
    const sync = () => setActive(window.location.hash.slice(1));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [universeCode]);

  return (
    <nav aria-label="주요 메뉴" className="ko-home-navigation sticky top-0 z-30 border-b border-[var(--ko-border)] bg-[var(--ko-bg)] px-5 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-home flex-wrap items-center gap-x-5 gap-y-2 py-4">
        <Link href="/" className="shrink-0 text-control font-bold tracking-label text-ink">KOAPTIX</Link>
        <div className="order-last flex min-w-0 flex-1 basis-full items-center gap-5 overflow-x-auto text-control font-semibold md:order-none md:basis-auto">
          <Link href="/play" prefetch={false} className="shrink-0 rounded-lg bg-[var(--ko-accent-soft)] px-3 py-2 font-bold text-accent hover:underline">우리 아파트 몇 등? ↗</Link>
          <Link href={`/ranking?universe=${encodeURIComponent(universeCode)}`} className="shrink-0 py-1 text-muted hover:text-accent">랭킹</Link>
          {sections.map(({ id, label }) => (
            <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined}
              onClick={() => {
                setActive(id);
                document.getElementById(id)?.focus({ preventScroll: true });
              }}
              className={`shrink-0 border-b-2 py-1 transition ${active === id ? "border-accent text-accent" : "border-transparent text-muted hover:border-accent hover:text-accent"}`}>
              {label}{id === "watchlist" && isLoaded && bookmarks.length ? ` ${bookmarks.length}` : ""}
            </a>
          ))}
        </div>
        <span className="hidden shrink-0 text-caption font-semibold text-accent lg:block">공개 테스트 중</span>
        <div className="ml-auto shrink-0"><ThemeToggle /></div>
      </div>
    </nav>
  );
}
