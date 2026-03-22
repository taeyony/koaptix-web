import styles from "./TickerTape.module.css";

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
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#05070b] to-transparent sm:w-16" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#05070b] to-transparent sm:w-16" />

      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-3 px-3 py-2 sm:px-4 lg:px-6">
        <div className="shrink-0 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100 sm:text-[11px]">
          LIVE FEED
        </div>

        <div className={styles.viewport}>
          <div className={styles.track}>
            {[0, 1].map((copy) => (
              <div
                key={copy}
                className={styles.group}
                aria-hidden={copy === 1}
              >
                {feed.map((message, index) => (
                  <div
                    key={`${copy}-${index}-${message}`}
                    className={styles.item}
                  >
                    <span className={styles.dot} />
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