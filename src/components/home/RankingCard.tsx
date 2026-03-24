"use client";

import type { RankingItem } from "../../lib/koaptix/types";

interface RankingCardProps {
  item: RankingItem;
  isBookmarked?: boolean;
  onToggleBookmark?: (complexId: string) => void;
  onClick?: () => void;
  onCompare?: (e: React.MouseEvent) => void;
}

export function RankingCard({ item, isBookmarked, onToggleBookmark, onClick, onCompare }: RankingCardProps) {
  const isUp = item.rankDelta7d > 0;
  const isDown = item.rankDelta7d < 0;
  const momentumText = isUp ? `▲ ${item.rankDelta7d}` : isDown ? `▼ ${Math.abs(item.rankDelta7d)}` : "—";
  
  // 💡 금융 스탠다드: 오직 진짜 상승/하락에만 강렬한 색상을 부여합니다!
  const momentumColor = isUp ? "text-red-500" : isDown ? "text-blue-400" : "text-slate-500";

  return (
    <div 
      onClick={onClick}
      // 🚨 핵심 패치: 평소엔 아주 조용한 무광(bg-white/[0.02], border-transparent)
      // 마우스가 올라갈 때만 Cyan 네온 아우라가 은은하게 퍼집니다!!
      className="group relative flex cursor-pointer flex-col justify-center rounded-xl border border-transparent bg-white/[0.02] p-3 transition-all duration-300 hover:border-cyan-500/30 hover:bg-cyan-500/[0.03] hover:shadow-[0_0_20px_rgba(34,211,238,0.1)] sm:p-4"
    >
      <div className="flex items-center gap-3">
        {/* 1. 순위: 튀지 않게 톤 다운 (hover 시에만 빛남) */}
        <div className="flex w-8 shrink-0 justify-center">
          <span className="font-mono text-lg font-bold text-slate-400 transition-colors group-hover:text-cyan-400 sm:text-xl">
            {item.rank}
          </span>
        </div>

        {/* 2. 단지명 및 지역 (가독성 대폭 향상) */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            {onToggleBookmark && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(item.complexId);
                }}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-sm transition-all hover:scale-110 ${
                  isBookmarked 
                    ? "text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]" 
                    : "text-slate-600 hover:text-yellow-400/50" // 평소엔 눈에 안 띄게 조용히!
                }`}
              >
                {isBookmarked ? "★" : "☆"}
              </button>
            )}
            {/* 단지명은 선명한 흰색으로! */}
            <h3 className="truncate text-sm font-bold text-slate-100 transition-colors group-hover:text-white sm:text-base">
              {item.name}
            </h3>
          </div>
          {/* 💡 지역 텍스트 가독성 향상: 어두운 회색 -> 세련된 슬레이트 400 */}
          <p className="truncate pl-8 text-[11px] text-slate-400 sm:text-xs">
            {item.sigunguName} {item.legalDongName}
          </p>
        </div>

        {/* 3. 시가총액 & 모멘텀 */}
        <div className="flex shrink-0 flex-col items-end text-right">
          <span className="text-sm font-semibold tabular-nums text-slate-200 transition-colors group-hover:text-white sm:text-base">
            {item.marketCapTrillionKrw}조
          </span>
          <span className={`mt-0.5 text-[11px] font-bold sm:text-xs ${momentumColor}`}>
            {momentumText}
          </span>
        </div>

        {/* 4. VS 버튼: 평소엔 거의 투명하게 숨어있다가 마우스 오버 시에만 등장! */}
        {onCompare && (
          <div className="ml-1 shrink-0 border-l border-white/5 pl-3 transition-colors group-hover:border-white/10">
            <button
              onClick={onCompare}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent bg-transparent text-[10px] font-bold text-slate-500 transition-all group-hover:border-cyan-500/30 group-hover:bg-cyan-500/10 group-hover:text-cyan-400"
              title="비교함에 담기"
            >
              VS
            </button>
          </div>
        )}
      </div>

      {/* 5. Recovery 게이지: 네온을 빼고 차분한 에메랄드/슬레이트 톤으로 교체 */}
      {item.recoveryRate52w != null && (
        <div className="mt-3 flex items-center gap-2 px-1 opacity-70 transition-opacity group-hover:opacity-100">
          <span className="text-[9px] uppercase tracking-wider text-slate-500">52W Rec</span>
          <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-slate-800">
            <div 
              className="h-full bg-emerald-500/60 transition-all" 
              style={{ width: `${Math.min(100, Math.max(0, item.recoveryRate52w))}%` }} 
            />
          </div>
          <span className="text-[9px] font-medium text-slate-400">{item.recoveryRate52w.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}