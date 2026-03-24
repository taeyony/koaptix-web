"use client";

import { useState } from "react";
import { MarketHeatmap } from "./MarketHeatmap";
import { NeonMap } from "./NeonMap";
import type { RankingItem } from "../../lib/koaptix/types";

export function MarketRadar({ items }: { items: RankingItem[] }) {
  const [viewMode, setViewMode] = useState<"heatmap" | "map">("heatmap");

  return (
    <div className="flex flex-col gap-4">
      {/* 💡 잼이사표 사이버펑크 탭 스위치 */}
      <div className="flex w-fit items-center gap-1 rounded-xl border border-cyan-400/20 bg-[#0b1118]/80 p-1.5 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
        <button
          onClick={() => setViewMode("heatmap")}
          className={`rounded-lg px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] transition-all duration-200 ${
            viewMode === "heatmap"
              ? "bg-cyan-400/20 text-cyan-300 shadow-[inset_0_0_12px_rgba(34,211,238,0.3)]"
              : "text-white/40 hover:bg-white/5 hover:text-white/70"
          }`}
        >
          Block Heatmap
        </button>
        <button
          onClick={() => setViewMode("map")}
          className={`rounded-lg px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] transition-all duration-200 ${
            viewMode === "map"
              ? "bg-cyan-400/20 text-cyan-300 shadow-[inset_0_0_12px_rgba(34,211,238,0.3)]"
              : "text-white/40 hover:bg-white/5 hover:text-white/70"
          }`}
        >
          Neon Map View
        </button>
      </div>

      {/* 💡 스위치 상태에 따라 화면 전환! */}
      <div className="min-h-[450px] animate-in fade-in duration-300">
        {viewMode === "heatmap" ? (
          <MarketHeatmap items={items} />
        ) : (
          <NeonMap items={items} />
        )}
      </div>
    </div>
  );
}