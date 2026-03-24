"use client";

import { useState } from "react";

interface MarketChartCardProps {
  title?: string;
  valueLabel?: string;
  changePct?: number;
  data?: any[];
}

export function MarketChartCard({ 
  title = "KOAPTIX 500", 
  valueLabel = "0", 
  changePct = 0, 
  data = [] 
}: MarketChartCardProps) {
  
  const [period, setPeriod] = useState("1M");
  const [mode, setMode] = useState("MarketCap");

  const isUp = changePct >= 0;
  const changeText = `${isUp ? "▲ +" : "▼ "}${Math.abs(changePct).toFixed(2)}%`;
  
  // 🚨 텍스트 색상: 상승=에메랄드, 하락=로즈
  const changeColor = isUp ? "text-emerald-500" : "text-rose-500";
  
  // 🚨 차트 선 & 그라데이션 동적 색상 (지수 상태에 따라 차트 색이 바뀝니다!!)
  const chartStrokeColor = isUp ? "#10b981" : "#f43f5e"; // Emerald or Rose
  const chartGradientClass = isUp ? "from-emerald-500/20" : "from-rose-500/20";

  return (
    // 🚨 스티키 유지 & 구조선 슬레이트로 톤 다운
    <div className="sticky top-4 z-10 flex h-[400px] shrink-0 flex-col rounded-2xl border border-slate-700/50 bg-[#0b1118]/90 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_40px_rgba(0,0,0,0.4)] backdrop-blur-sm">
      <div className="flex flex-col gap-4 border-b border-slate-800/80 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Index Chart</p>
            <div className="mt-1 flex items-end gap-3">
              <h2 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">{title}</h2>
              <span className={`mb-0.5 text-sm font-semibold ${changeColor}`}>{changeText}</span>
            </div>
          </div>

          <div className="flex rounded-lg border border-slate-700/50 bg-slate-800/30 p-1">
            {["1W", "1M", "3M", "1Y"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                // 🚨 지차장 룰: '선택(인터랙션)' 된 탭만 시안(Cyan) 네온으로 빛납니다!
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                  period === p ? "bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex gap-4 text-[11px] font-medium text-slate-500">
           <button onClick={() => setMode("MarketCap")} className={`transition-all ${mode === "MarketCap" ? "text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.3)]" : "hover:text-slate-300"}`}>
             ● Total Market Cap (시가총액)
           </button>
           <button onClick={() => setMode("Breadth")} className={`transition-all ${mode === "Breadth" ? "text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.3)]" : "hover:text-slate-300"}`}>
             ○ Recovery Breadth (회복 압력)
           </button>
        </div>
      </div>

      <div className="relative flex-1 p-4 sm:p-5">
         <div className="relative h-full w-full">
            <div className="absolute -left-1 flex h-full flex-col justify-between pb-6 pt-2 text-[10px] font-medium text-slate-500">
              <span>470조</span>
              <span>465조</span>
              <span>460조</span>
            </div>
            
            <div className="absolute bottom-6 left-8 right-0 top-2 overflow-hidden border-b border-l border-slate-700/50">
               {/* 🚨 지수의 상승/하락에 따라 그라데이션 색상이 에메랄드/로즈로 자동 변경! */}
               <div className={`absolute bottom-0 left-0 h-[60%] w-full bg-gradient-to-t ${chartGradientClass} to-transparent`} />
               
               <svg className="absolute bottom-0 left-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1000 100">
                 {/* 🚨 차트 선도 동적 색상(chartStrokeColor) 연동 완료! */}
                 <path d="M0,100 L0,60 Q250,50 500,40 T1000,20 L1000,100 Z" fill={isUp ? "rgba(16,185,129,0.05)" : "rgba(244,63,94,0.05)"} />
                 <path d="M0,60 Q250,50 500,40 T1000,20" fill="none" stroke={chartStrokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                 <circle cx="1000" cy="20" r="4" fill="#fff" className="animate-ping" vectorEffect="non-scaling-stroke" />
                 <circle cx="1000" cy="20" r="4" fill={chartStrokeColor} vectorEffect="non-scaling-stroke" />
               </svg>
            </div>

            <div className="absolute bottom-0 left-8 right-0 flex justify-between text-[10px] font-medium text-slate-500">
              <span>03.01</span>
              <span>03.08</span>
              <span>03.15</span>
              {/* TODAY는 포커스 영역이므로 시안(Cyan) 유지 */}
              <span className="text-cyan-500/80">TODAY</span> 
            </div>
         </div>
      </div>
    </div>
  );
}