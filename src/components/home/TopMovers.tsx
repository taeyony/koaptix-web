import type { RankingItem } from "../../lib/koaptix/types";

function formatMarketCapKrw(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "-";

  const TRILLION = 1_000_000_000_000;
  const HUNDRED_MILLION = 100_000_000;

  if (value >= TRILLION) {
    const amount = value / TRILLION;
    const digits = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
    return `${amount.toFixed(digits)}조원`;
  }

  if (value >= HUNDRED_MILLION) {
    const amount = value / HUNDRED_MILLION;
    const digits = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
    return `${amount.toFixed(digits)}억원`;
  }

  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

function formatRankDelta(value: number): string {
  if (value > 0) return `▲ +${value}`;
  if (value < 0) return `▼ ${value}`;
  return "— 0";
}

function buildHotMovers(items: RankingItem[]) {
  return [...items]
    .filter((item) => item.rankDelta1d > 0)
    .sort((a, b) => {
      if (b.rankDelta1d !== a.rankDelta1d) return b.rankDelta1d - a.rankDelta1d;
      if (a.rank !== b.rank) return a.rank - b.rank;
      return b.marketCapKrw - a.marketCapKrw;
    })
    .slice(0, 3);
}

function buildColdDrops(items: RankingItem[]) {
  return [...items]
    .filter((item) => item.rankDelta1d < 0)
    .sort((a, b) => {
      if (a.rankDelta1d !== b.rankDelta1d) return a.rankDelta1d - b.rankDelta1d;
      if (a.rank !== b.rank) return a.rank - b.rank;
      return b.marketCapKrw - a.marketCapKrw;
    })
    .slice(0, 3);
}

function MoverRow({
  item,
  tone,
  index,
}: {
  item: RankingItem;
  tone: "hot" | "cold";
  index: number;
}) {
  const isHot = tone === "hot";

  return (
    <article
      className={`rounded-2xl border p-3 sm:p-4 ${
        isHot
          ? "border-cyan-300/18 bg-cyan-300/[0.08]"
          : "border-fuchsia-400/18 bg-fuchsia-400/[0.08]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                isHot
                  ? "border border-cyan-300/20 bg-cyan-300/12 text-cyan-100"
                  : "border border-fuchsia-400/20 bg-fuchsia-400/12 text-fuchsia-100"
              }`}
            >
              {index + 1}
            </span>

            <h3 className="truncate text-sm font-semibold text-white sm:text-base">
              {item.name}
            </h3>
          </div>

          <p className="mt-2 truncate text-xs text-white/45 sm:text-sm">
            {item.locationLabel || "위치 정보 없음"}
          </p>
        </div>

        <div
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            isHot
              ? "border-cyan-300/20 bg-cyan-300/12 text-cyan-100"
              : "border-fuchsia-400/20 bg-fuchsia-400/12 text-fuchsia-100"
          }`}
        >
          {formatRankDelta(item.rankDelta1d)}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:text-sm">
        <div className="rounded-xl border border-black/20 bg-black/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">
            현재 순위
          </p>
          <p className="mt-1 font-semibold text-white">#{item.rank}</p>
        </div>

        <div className="rounded-xl border border-black/20 bg-black/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">
            시가총액
          </p>
          <p className="mt-1 truncate font-semibold text-white">
            {formatMarketCapKrw(item.marketCapKrw)}
          </p>
        </div>
      </div>
    </article>
  );
}

export function TopMovers({ items }: { items: RankingItem[] }) {
  const hotMovers = buildHotMovers(items);
  const coldDrops = buildColdDrops(items);

  return (
    <section className="overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_50px_rgba(0,0,0,0.3)]">
      <div className="border-b border-white/5 px-3 py-3 sm:px-4 sm:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/70 sm:text-xs">
          MOMENTUM FEED
        </p>
        <h2 className="mt-1 truncate text-lg font-semibold tracking-tight sm:text-xl">
          오늘의 핫 단지
        </h2>
        <p className="mt-1 text-xs text-white/45 sm:text-sm">
          전일 대비 순위 급등·급락 단지를 즉시 스캔한다
        </p>
      </div>

      <div className="grid gap-3 p-2 sm:gap-4 sm:p-3">
        <div className="rounded-2xl border border-cyan-300/15 bg-black/20 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100 sm:text-base">
              📈 HOT MOVERS
            </h3>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/12 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-cyan-100">
              Updraft
            </span>
          </div>

          <div className="grid gap-2 sm:gap-3">
            {hotMovers.length > 0 ? (
              hotMovers.map((item, index) => (
                <MoverRow
                  key={item.complexId}
                  item={item}
                  tone="hot"
                  index={index}
                />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/50">
                오늘 감지된 급등 단지가 없다.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-fuchsia-400/15 bg-black/20 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-fuchsia-100 sm:text-base">
              📉 COLD DROPS
            </h3>
            <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/12 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-fuchsia-100">
              Downforce
            </span>
          </div>

          <div className="grid gap-2 sm:gap-3">
            {coldDrops.length > 0 ? (
              coldDrops.map((item, index) => (
                <MoverRow
                  key={item.complexId}
                  item={item}
                  tone="cold"
                  index={index}
                />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/50">
                오늘 감지된 급락 단지가 없다.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}