"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartPoint = {
  label: string;
  value: number;
};

type MarketChartCardProps = {
  title: string;
  valueLabel: string;
  changePct: number;
  data: ChartPoint[];
};

const formatNumber = (value: number) => new Intl.NumberFormat("ko-KR").format(value);

export function MarketChartCard({
  title,
  valueLabel,
  changePct,
  data,
}: MarketChartCardProps) {
  const isUp = changePct >= 0;

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#0b1118] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_50px_rgba(0,0,0,0.3)]">
      <header className="border-b border-white/5 px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/70 sm:text-xs">
              INDEX CHART
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold tracking-tight sm:text-xl lg:text-2xl">
              {title}
            </h2>
          </div>

          <div className="flex items-end gap-3">
            <p className="text-xl font-semibold tabular-nums sm:text-2xl lg:text-3xl">
              {valueLabel}
            </p>
            <p
              className={`pb-1 text-sm font-medium tabular-nums sm:text-base ${
                isUp ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isUp ? "+" : ""}
              {changePct.toFixed(2)}%
            </p>
          </div>
        </div>
      </header>

      <div className="px-2 pb-2 pt-3 sm:px-3 sm:pb-3 lg:px-4 lg:pb-4">
        {/* 👇 잼이사가 차트 상자 찌그러짐 방지용 철근(minHeight)을 박아둔 곳입니다! */}
       <div style={{ width: '100%', height: '300px', minHeight: '300px', position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="koaptixArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                vertical={false}
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                minTickGap={24}
                interval="preserveStartEnd"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
              />

              <YAxis
                width={48}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickFormatter={(value) => formatNumber(Number(value))}
              />

              <Tooltip
                cursor={{ stroke: "rgba(34,211,238,0.25)", strokeWidth: 1 }}
                contentStyle={{
                  background: "#081018",
                  border: "1px solid rgba(34,211,238,0.15)",
                  borderRadius: 16,
                }}
                labelStyle={{ color: "#cbd5e1" }}
                formatter={(value) => formatNumber(Number(value))}
              />

              <Area
                type="monotone"
                dataKey="value"
                stroke="#22d3ee"
                strokeWidth={2}
                fill="url(#koaptixArea)"
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}