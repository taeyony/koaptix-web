type BetaDisclosureVariant = "hero" | "compact" | "ranking" | "search" | "detail";

type BetaDisclosureProps = {
  variant?: BetaDisclosureVariant;
  className?: string;
};

export const LAUNCH_COPY = {
  softPublicBetaEn: "공개 테스트 중",
  softPublicBetaKo: "자료를 계속 보완하고 있어요",
  heroHeadline: "우리 아파트, 전국에서 어디쯤일까요?",
  heroSubheadline:
    "KOAPTIX는 아파트 단지 전체의 추정 가치와 순위를 보여주는 서비스입니다.",
  homeExplainer:
    "전국과 지역별 랭킹에서 우리 아파트가 어디쯤인지 찾아보세요. 현재 공개된 단지를 검색할 수 있어요.",
  compactBeta:
    "현재 공개 테스트 중이에요. 추정 시가총액과 주간 변화는 참고 정보이며, 공식 가격지수나 투자 조언이 아닙니다.",
  estimatedMarketCap:
    "시가총액은 면적별 대표가격에 세대수를 곱해 더한 ‘단지 전체의 추정 가치’예요. 집 한 채의 가격이나 실제로 팔 수 있는 금액을 뜻하지 않습니다.",
  noInvestmentAdvice:
    "투자를 추천하거나 매수·매도를 권하지 않으며, 수익을 보장하지 않습니다.",
  universeExplanation:
    "지역을 선택하면 그 지역 안에서의 순위를 보여줘요. 전국 순위는 지역별 비중을 따로 조정하지 않습니다.",
  searchCompact:
    "현재 공개된 전국·지역 랭킹에서 찾아드려요. 자료 확인이 끝나지 않은 단지는 순위를 표시하지 않습니다.",
  detailCompact:
    "이 단지의 추정 시가총액과 공개된 순위를 모아 보여드려요. 현재 공개 테스트 중인 참고 정보입니다.",
  boardIntro:
    "선택한 지역의 아파트를 단지 전체의 추정 가치와 순위 변화로 비교해 보세요.",
  rankingSubtitle:
    "선택한 지역에서 단지 전체의 추정 가치가 큰 순서로, 최대 1,000개를 보여드려요.",
  koaptix500Card:
    "전국 아파트 순위를 한눈에 확인해 보세요",
  koaptixIndexCard:
    "아파트 시장 전체의 변화를 하나의 숫자로 보여줘요",
  top1000SearchCard:
    "전국과 지역별 순위에서 궁금한 단지를 찾아보세요",
  top1000Cta: "전체 랭킹 보기",
  representativeMetric: "추정 시가총액과 순위는 참고 정보입니다",
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
        "break-words [overflow-wrap:break-word]",
        variantClassName[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid={`beta-disclosure-${variant}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-caption font-semibold uppercase tracking-label text-cyan-200">
          {LAUNCH_COPY.softPublicBetaEn}
        </span>
        <span className="text-caption font-semibold text-cyan-100">
          {LAUNCH_COPY.softPublicBetaKo}
        </span>
      </div>

      <div className="ko-copy mt-2 space-y-2 text-sm leading-copy text-current">
        {messages.map((message) => (
          <p
            key={message}
            className="min-w-0 max-w-full break-words whitespace-normal [overflow-wrap:break-word]"
          >
            {message}
          </p>
        ))}
      </div>
    </aside>
  );
}
