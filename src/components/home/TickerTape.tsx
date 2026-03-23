"use client";

type TickerTapeProps = {
  items?: string[];
  className?: string;
};

const DEFAULT_ITEMS = [
  "KOAPTIX 500 LIVE",
  "자본의 흐름을 읽는 자만이 살아남는다",
  "오늘의 급등 단지: 반포자이 ▲",
  "HAPI 그룹 제공",
];

export function TickerTape({
  items = DEFAULT_ITEMS,
  className = "",
}: TickerTapeProps) {
  const feed = items.length > 0 ? items : DEFAULT_ITEMS;

  return (
    <section
      className={`relative overflow-hidden border-y border-cyan-400/10 bg-black/90 ${className}`}
    >
      {/* 💡 잼이사의 무적 페인트: 외부 파일 없이 여기에 직접 애니메이션 주입! */}
      <style>{`
        @keyframes tickerTapeAnim {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex;
          width: max-content;
          animation: tickerTapeAnim 38s linear infinite;
          will-change: transform;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
        .ticker-group {
          display: flex;
          flex-shrink: 0;
          align-items: center;
        }
        .ticker-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding-right: 1.75rem;
          margin-right: 1.75rem;
          border-right: 1px solid rgba(103, 232, 249, 0.14);
          white-space: nowrap;
        }
        .ticker-dot {
          width: 0.42rem;
          height: 0.42rem;
          border-radius: 9999px;
          background: #6ee7b7;
          box-shadow: 0 0 14px rgba(110, 231, 183, 0.95);
          flex-shrink: 0;
        }
      `}</style>

      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#05070b] to-transparent sm:w-16" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#05070b] to-transparent sm:w-16" />

      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-3 px-3 py-2 sm:px-4 lg:px-6">
        <div className="shrink-0 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100 sm:text-[11px]">
          LIVE FEED
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div className="ticker-track">
            {[0, 1].map((copy) => (
              <div
                key={copy}
                className="ticker-group"
                aria-hidden={copy === 1}
              >
                {feed.map((message, index) => (
                  <div
                    key={`${copy}-${index}-${message}`}
                    className="ticker-item"
                  >
                    <span className="ticker-dot" />
                    <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-100 sm:text-xs md:text-sm [text-shadow:0_0_12px_rgba(34,211,238,0.35)]">
                      {message}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}