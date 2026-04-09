"use client";

import type { RankingItem } from "../../lib/koaptix/types";

export function TopMovers({ items }: { items: RankingItem[] }) {
  const updrafts = items.filter(i => i.rankDelta7d > 0).sort((a, b) => b.rankDelta7d - a.rankDelta7d).slice(0, 3);
  const drags = items.filter(i => i.rankDelta7d < 0).sort((a, b) => a.rankDelta7d - b.rankDelta7d).slice(0, 3);

  const hasUpdrafts = updrafts.length > 0;
  const hasDrags = drags.length > 0;
  const isNeutral = !hasUpdrafts && !hasDrags;
  const topCaps = isNeutral ? [...items].sort((a, b) => b.marketCapKrw - a.marketCapKrw).slice(0, 3) : [];

  return (
    // 🚨 전체 테두리를 차분한 Slate로 변경!
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-700/50 bg-[#0b1118]/80 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_40px_rgba(0,0,0,0.3)] sm:p-5">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Momentum Feed</p>
          <h2 className="mt-0.5 text-base font-bold text-slate-100 sm:text-lg">Weekly Hot</h2>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {isNeutral && (
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/20 p-3 text-center">
            <span className="text-[11px] font-medium text-slate-400">현재 뚜렷한 주간 상승/하락 모멘텀이 없습니다.</span>
            <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-700/50 pt-2 text-left">
              <span className="mb-1 text-[9px] uppercase tracking-wider text-slate-500">Current Top 3 (Market Cap)</span>
              {topCaps.map(item => (
                <div key={item.complexId} className="flex items-center justify-between text-xs">
                  <span className="truncate text-slate-300">{item.name}</span>
                  <span className="font-semibold text-slate-100">{item.marketCapTrillionKrw}조</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasUpdrafts && (
          // 🚨 K-상승장 리셋: 텍스트와 배경을 선명한 Rose(빨강)로 변경!
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.02] p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-rose-400">📈 MOMENTUM (W)</span>
              <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[8px] uppercase tracking-widest text-rose-400">Updraft</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {updrafts.map(item => (
                <div key={item.complexId} className="flex items-center justify-between text-[11px] sm:text-xs">
                  <span className="truncate text-slate-300">{item.name}</span>
                  <span className="font-bold text-rose-400">▲{item.rankDelta7d}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasDrags && (
          // 🚨 K-하락장 리셋: 명확한 하락을 나타내는 Blue(파랑) 컬러로 변경!
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.02] p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-400">📉 PRESSURE (W)</span>
              <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[8px] uppercase tracking-widest text-blue-400">Drag</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {drags.map(item => (
                <div key={item.complexId} className="flex items-center justify-between text-[11px] sm:text-xs">
                  <span className="truncate text-slate-300">{item.name}</span>
                  <span className="font-bold text-blue-400">▼{Math.abs(item.rankDelta7d)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}