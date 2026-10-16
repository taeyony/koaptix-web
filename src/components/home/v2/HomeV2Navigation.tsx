"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  const navRef = useRef<HTMLElement>(null);
  const { bookmarks, isLoaded, primaryComplexId } = useBookmarks();
  const visibleSections = primaryComplexId ? [{ id: "my-apartment", label: "내 아파트" }, ...sections] : sections;
  useEffect(() => {
    const main = navRef.current?.closest<HTMLElement>("main");
    let stopPending = () => {};
    const updateOffset = () => main?.style.setProperty("--ko-anchor-offset", `${Math.ceil((navRef.current?.getBoundingClientRect().height ?? 80) + 16)}px`);
    const headerObserver = new ResizeObserver(updateOffset);
    if (navRef.current) headerObserver.observe(navRef.current);
    updateOffset();
    const sync = () => {
      stopPending();
      const id = window.location.hash.slice(1);
      setActive(id);
      if (!(id === "my-apartment" || sections.some(section => section.id === id)) || !main) return;
      const target = document.getElementById(id);
      if (!target) return;
      let frame = 0;
      const align = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => { updateOffset(); target.scrollIntoView({ block: "start", behavior: "instant" }); });
      };
      const observer = new ResizeObserver(align);
      // The board, map and summary load independently above these anchors.
      // Follow their layout changes only until loading settles or the user acts.
      observer.observe(main);
      main.querySelectorAll("section, header").forEach(element => observer.observe(element));
      const stop = () => {
        observer.disconnect(); cancelAnimationFrame(frame); window.clearTimeout(timeout);
        window.removeEventListener("wheel", stop); window.removeEventListener("touchstart", stop);
        window.removeEventListener("keydown", stop); window.removeEventListener("pointerdown", pointerStop);
      };
      const pointerStop = (event: PointerEvent) => { if (!navRef.current?.contains(event.target as Node)) stop(); };
      const timeout = window.setTimeout(stop, 16_000);
      stopPending = stop;
      window.addEventListener("wheel", stop, { passive: true }); window.addEventListener("touchstart", stop, { passive: true });
      window.addEventListener("keydown", stop); window.addEventListener("pointerdown", pointerStop);
      target.focus({ preventScroll: true }); align();
    };
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => { stopPending(); headerObserver.disconnect(); window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); };
  }, [universeCode, primaryComplexId]);

  return (
    <nav ref={navRef} aria-label="주요 메뉴" className="ko-home-navigation sticky top-0 z-30 border-b border-[var(--ko-border)] bg-[var(--ko-bg)] px-5 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-home flex-wrap items-center gap-x-5 gap-y-2 py-4">
        <Link href="/" className="shrink-0 text-control font-bold tracking-label text-ink">KOAPTIX</Link>
        <div className="order-last flex min-w-0 flex-1 basis-full items-center gap-5 overflow-x-auto text-control font-semibold md:order-none md:basis-auto">
          <Link href="/play" prefetch={false} className="shrink-0 rounded-lg bg-[var(--ko-accent-soft)] px-3 py-2 font-bold text-accent hover:underline">우리 아파트 몇 등? ↗</Link>
          <Link href={`/ranking?universe=${encodeURIComponent(universeCode)}`} className="shrink-0 py-1 text-muted hover:text-accent">랭킹</Link>
          <Link href={`/map?universe=${encodeURIComponent(universeCode)}`} prefetch={false} className="shrink-0 py-1 text-muted hover:text-accent">상세 지도 ↗</Link>
          {visibleSections.map(({ id, label }) => (
            <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined}
              onClick={event => {
                event.preventDefault();
                if (window.location.hash === `#${id}`) window.dispatchEvent(new HashChangeEvent("hashchange"));
                else window.location.hash = id;
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
