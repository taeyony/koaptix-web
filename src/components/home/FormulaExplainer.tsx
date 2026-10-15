"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";

const formulaTitle = "시가총액과 지수, 어떻게 계산하나요?";
const formulaLead =
  "시가총액은 단지 전체의 추정 가치예요. 지수는 계산 대상 단지들의 가치를 합쳐, 기준일을 1,000으로 놓고 얼마나 달라졌는지 보여줍니다.";
const formulaBullets = [
  "단지 추정 시가총액 = 면적별 대표가격 × 해당 면적의 세대수를 모두 더한 값",
  "대표가격은 같은 단지·비슷한 전용면적의 최근 12개월 유효 거래 중 마지막 3건의 평균이에요.",
  "KOAPTIX 지수 = 1,000 × 현재 추정 시가총액 합계 ÷ 기준일 추정 시가총액 합계",
  "거래 한 건이나 집 한 채의 가격만으로 계산하지 않아요.",
];
const formulaFootnote =
  "랭킹은 단지별 순위, 지수는 계산 대상 전체의 변화를 보여줘요.";

type FormulaExplainerProps = {
  title?: string;
  triggerLabel?: string;
  className?: string;
  scopeSummary?: string;
};

export default function FormulaExplainer({
  title = formulaTitle,
  triggerLabel = "계산 방법 보기",
  className,
  scopeSummary,
}: FormulaExplainerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const [panelStyle, setPanelStyle] = useState({
    top: 0,
    left: 0,
    width: 360,
    maxHeight: 420,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelId = `formula-explainer-${useId()}`;

  useEffect(() => {
    if (typeof window === "undefined") return;

    setPortalHost(document.body);

    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    onResize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !portalHost || isMobile) return;

    const updatePanelPosition = () => {
      if (!triggerRef.current) return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const preferredWidth = Math.max(280, Math.min(360, viewportWidth - 24));

      const left = Math.max(
        12,
        Math.min(
          triggerRect.right - preferredWidth,
          viewportWidth - preferredWidth - 12,
        ),
      );

      const panelHeight = Math.min(Math.floor(viewportHeight * 0.7), 420);
      const below = triggerRect.bottom + 8;
      const above = triggerRect.top - panelHeight - 8;
      const fitsBelow = below + panelHeight <= viewportHeight - 12;
      const top = fitsBelow ? below : above;

      setPanelStyle({
        top: Math.max(12, top),
        left,
        width: preferredWidth,
        maxHeight: panelHeight,
      });
    };

    updatePanelPosition();

    const onPointerDown = (event: PointerEvent) => {
      const node = containerRef.current;
      const panelNode = panelRef.current;
      if (!node || !panelNode) return;

      if (
        !node.contains(event.target as Node) &&
        !panelNode.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", updatePanelPosition, true);
    window.addEventListener("resize", updatePanelPosition);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", updatePanelPosition, true);
      window.removeEventListener("resize", updatePanelPosition);
    };
  }, [isOpen, isMobile, portalHost]);

  return (
    <div ref={containerRef} className={className}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="ko-text-link inline-flex items-center gap-2 rounded-full border border-slate-700/90 bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:border-cyan-300/80 hover:text-cyan-200 focus-visible:border-cyan-300 focus-visible:text-cyan-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
      >
        <span aria-hidden="true">i</span>
        <span>{triggerLabel}</span>
      </button>

      {isOpen && portalHost
        ? createPortal(
            <>
              {isMobile ? (
                <div
                  className="fixed inset-0 z-30 bg-black/35 md:hidden"
                  onClick={() => setIsOpen(false)}
                  aria-hidden="true"
                />
              ) : null}

              <div
                ref={panelRef}
                id={panelId}
                role="dialog"
                aria-label={title}
                className={
                  isMobile
                    ? "fixed inset-x-4 bottom-4 z-40 w-[calc(100vw-2rem)] max-w-[380px] rounded-2xl border border-slate-700/80 bg-slate-950 p-4 shadow-2xl"
                    : "fixed z-40 rounded-2xl border border-slate-700/80 bg-slate-950 p-4 shadow-2xl"
                }
                style={
                  isMobile
                    ? {
                        maxHeight: "70vh",
                        overflowY: "auto",
                      }
                    : {
                        top: `${panelStyle.top}px`,
                        left: `${panelStyle.left}px`,
                        width: `${panelStyle.width}px`,
                        maxHeight: `${panelStyle.maxHeight}px`,
                        overflowY: "auto",
                      }
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-200 md:text-caption">
                    {title}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
                    aria-label="닫기"
                  >
                    닫기
                  </button>
                </div>

                {scopeSummary ? <p className="ko-copy mt-3 rounded-lg border border-slate-700 p-3 text-sm font-semibold leading-copy text-slate-200">{scopeSummary}</p> : null}
                <p className="ko-copy mt-2 text-sm leading-copy text-slate-400">
                  {formulaLead}
                </p>
                <ul className="ko-copy mt-2 space-y-2 text-sm leading-copy text-slate-300">
                  {formulaBullets.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="mt-2 inline-block h-1 w-1 rounded-full bg-slate-500" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-caption leading-copy text-slate-500">
                  {formulaFootnote}
                </p>
              </div>
            </>,
            portalHost,
          )
        : null}
    </div>
  );
}
