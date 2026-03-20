type RankingItem = {
  code: string;
  name: string;
  rank: number;
  price: number;
  changePct: number;
  subLabel?: string;
};

const formatPrice = (value: number) => new Intl.NumberFormat("ko-KR").format(value);

export function RankingCard({ item }: { item: RankingItem }) {
  const isUp = item.changePct >= 0;

  return (
    <article className="grid grid-cols-[40px_minmax(0,1fr)_auto] gap-3 rounded-xl border border-white/6 bg-white/[0.03] p-3 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:gap-4 sm:p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-sm font-semibold text-cyan-200 tabular-nums sm:h-12 sm:w-12 sm:text-base">
        {item.rank}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[15px] font-semibold tracking-tight sm:text-base">
            {item.name}
          </h3>
          <span className="shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/45 sm:text-[11px]">
            {item.code}
          </span>
        </div>

        {item.subLabel ? (
          <p className="mt-1 truncate text-xs leading-5 text-white/45 sm:text-sm">
            {item.subLabel}
          </p>
        ) : null}
      </div>

      <div className="text-right tabular-nums">
        <p className="text-[15px] font-semibold sm:text-base">
          {formatPrice(item.price)}
        </p>
        <p
          className={`mt-1 text-xs font-medium sm:text-sm ${
            isUp ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {isUp ? "+" : ""}
          {item.changePct.toFixed(2)}%
        </p>
      </div>
    </article>
  );
}