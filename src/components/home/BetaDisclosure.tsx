type BetaDisclosureVariant = "hero" | "compact" | "ranking" | "search" | "detail";

type BetaDisclosureProps = {
  variant?: BetaDisclosureVariant;
  className?: string;
};

export const LAUNCH_COPY = {
  softPublicBetaEn: "SOFT PUBLIC BETA",
  softPublicBetaKo: "소프트 공개 베타",
  heroHeadline: "한국 아파트 자본 흐름을 단지 랭킹으로 읽다",
  heroSubheadline:
    "KOAPTIX는 아파트 단지의 추정 주거자산 가치를 기준으로 전국, 지역, 시군구 흐름을 비교하는 랭킹-first 터미널입니다.",
  homeExplainer:
    "KOAPTIX 500은 대표 랭킹 보드이고, KOAPTIX Index는 시장 전체 온도를 보는 집계 신호입니다. 지역을 선택하거나 단지명을 검색해 우리 동네의 위치를 확인해보세요.",
  compactBeta:
    "현재 KOAPTIX는 소프트 공개 베타입니다. 추정 시가총액과 주간 변화는 참고용이며, 공식 가격지수나 투자자문이 아닙니다.",
  estimatedMarketCap:
    "시가총액은 대표가격 × 세대수 구조로 추정한 주거자산 가치입니다. 실제 거래금액, 호가, 현금흐름을 보장하지 않습니다.",
  noInvestmentAdvice:
    "KOAPTIX는 투자 권유, 매수·매도 판단, 수익 보장을 제공하지 않습니다.",
  universeExplanation:
    "각 유니버스 순위는 해당 유니버스 내부에서 다시 계산한 순위입니다. KOREA_ALL은 전국 자본 집중도를 그대로 반영하며 지역 균형 보정 순위가 아닙니다.",
  searchCompact:
    "검색 결과는 현재 공개된 랭킹/지역 보드 기준입니다. 랭킹 미충족 단지는 별도 검증 전까지 순위로 표시하지 않습니다.",
  detailCompact:
    "이 상세 정보는 추정 시가총액과 공개 가능한 랭킹 데이터를 요약한 베타 지표입니다.",
  boardIntro:
    "선택한 지역의 단지를 추정 시가총액과 순위 변화로 비교하는 전술 보드입니다.",
  rankingSubtitle:
    "현재 유니버스 내부 재랭킹 기준 상위 1000개 단지를 탐색하는 full board입니다.",
  koaptix500Card:
    "한국 아파트 자본 흐름을 대표하는 메인 랭킹 보드",
  koaptixIndexCard:
    "시장 전체 온도를 보는 집계 신호",
  top1000SearchCard:
    "더 넓은 상위권 보드와 단지 탐색으로 이어지는 경로",
  top1000Cta: "TOP1000 보드에서 더 보기",
  representativeMetric: "실거래 기반 대표가격과 세대수 구조를 활용한 추정 지표",
} as const;

const variantMessages: Record<BetaDisclosureVariant, string[]> = {
  hero: [
    LAUNCH_COPY.compactBeta,
    LAUNCH_COPY.estimatedMarketCap,
    LAUNCH_COPY.noInvestmentAdvice,
  ],
  compact: [LAUNCH_COPY.compactBeta, LAUNCH_COPY.estimatedMarketCap],
  ranking: [
    LAUNCH_COPY.compactBeta,
    LAUNCH_COPY.estimatedMarketCap,
    LAUNCH_COPY.universeExplanation,
  ],
  search: [LAUNCH_COPY.searchCompact, LAUNCH_COPY.noInvestmentAdvice],
  detail: [LAUNCH_COPY.detailCompact, LAUNCH_COPY.noInvestmentAdvice],
};

const variantClassName: Record<BetaDisclosureVariant, string> = {
  hero: "border-cyan-400/25 bg-cyan-500/10 px-3 py-3 text-cyan-50",
  compact: "border-slate-700/70 bg-slate-900/50 px-3 py-2 text-slate-200",
  ranking: "border-cyan-400/20 bg-cyan-500/10 px-3 py-3 text-cyan-50",
  search: "border-slate-700/70 bg-slate-950/70 px-3 py-2 text-slate-300",
  detail: "border-cyan-300/15 bg-cyan-300/[0.08] px-3 py-2 text-white/70",
};

export function BetaDisclosure({
  variant = "compact",
  className = "",
}: BetaDisclosureProps) {
  const messages = variantMessages[variant];

  return (
    <aside
      className={[
        "w-full min-w-0 max-w-full overflow-hidden rounded-xl border text-left",
        "break-words [overflow-wrap:anywhere]",
        variantClassName[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid={`beta-disclosure-${variant}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
          {LAUNCH_COPY.softPublicBetaEn}
        </span>
        <span className="text-[11px] font-semibold text-cyan-100">
          {LAUNCH_COPY.softPublicBetaKo}
        </span>
      </div>

      <div className="mt-2 space-y-1 text-[11px] leading-5 text-current sm:text-xs">
        {messages.map((message) => (
          <p
            key={message}
            className="min-w-0 max-w-full break-words whitespace-normal [overflow-wrap:anywhere]"
          >
            {message}
          </p>
        ))}
      </div>
    </aside>
  );
}
