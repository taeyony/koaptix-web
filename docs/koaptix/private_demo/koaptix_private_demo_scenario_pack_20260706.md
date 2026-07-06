# KOAPTIX Private Demo Scenario Pack — 2026-07-06

Review marker: `P-KOAPTIX-PRIVATE-DEMO-SCENARIO-PACK.0`

## Status

- document_status: `PRIVATE_DEMO_SCENARIO_ONLY`
- current_readiness: `READY_FOR_PRIVATE_DEMO_WITH_WARNINGS`
- explicit_non_decision: `NOT_FULL_SOFT_PUBLIC_BETA_GO_YET`
- implementation_approval: `NO`
- public_launch_approval: `NO`

## One-Line Demo Positioning

KOAPTIX는 전국 아파트 단지를 추정 시가총액과 랭킹 관점으로 읽는 ranking-first 부동산 터미널입니다.

## What To Say First

아래 문장을 첫 30초 오프닝으로 사용한다.

> KOAPTIX는 아파트를 단순 가격표가 아니라 자산 규모와 랭킹으로 읽게 해주는 서비스입니다. 기존 시세 화면은 개별 가격을 보여주는 데 강하지만, 어떤 단지가 자본 규모 관점에서 큰지, 어떤 지역과 단지가 시장에서 얼마나 무게를 갖는지는 한눈에 보기 어렵습니다. KOAPTIX는 대표가격과 세대수를 결합해 추정 시가총액을 만들고, 그 기준으로 단지와 유니버스를 비교합니다. 지금은 전체 공개 출시가 아니라 신뢰할 수 있는 분들께 보여드리는 private demo 단계입니다. 데이터는 추정치이고 투자자문이 아니며, 공개 확대 전에는 추가 검증 게이트가 남아 있습니다.

핵심 톤:

- 자신감 있게 말하되 과장하지 않는다.
- "공식 지수", "투자 판단", "전국 모든 아파트 커버"처럼 들리는 표현은 피한다.
- 현재 상태는 `READY_FOR_PRIVATE_DEMO_WITH_WARNINGS`라고 설명한다.

## 5-Minute Demo Flow

### Step 1. Home Page

목표: KOAPTIX가 ranking-first 부동산 터미널이라는 첫인상을 보여준다.

말할 내용:

- "첫 화면은 시장과 랭킹을 빠르게 읽기 위한 전술 보드입니다."
- "상단의 Soft Public Beta 문구와 추정 데이터/투자자문 아님 안내를 먼저 확인할 수 있습니다."
- "이 서비스는 아직 full public beta GO가 아니라 private demo with warnings 단계입니다."

보여줄 것:

- Soft Public Beta 라벨
- 추정 시가총액 설명
- 투자자문 아님 문구
- 랭킹 중심의 화면 분위기

### Step 2. Ranking / TOP1000

목표: KOAPTIX의 핵심 제품 표면을 보여준다.

말할 내용:

- "KOAPTIX 1000은 전국 단지를 자본 규모 관점으로 보는 권위 보드입니다."
- "가격이 높은 소형 단지만 튀는 구조가 아니라, 대표가격과 세대수를 함께 봅니다."
- "랭킹은 개별 단지의 추정 자산 규모를 비교하기 위한 제품 표면입니다."

보여줄 것:

- `/ranking`
- TOP1000 또는 대표 ranking board
- 순위, 추정 시가총액, 단지명, 지역 맥락

### Step 3. KOREA_ALL Principle

목표: 전국 보드를 인위적으로 지역 균형화하지 않는 이유를 설명한다.

말할 내용:

- "`KOREA_ALL`은 전국 자본 집중도를 보여주는 보드입니다."
- "서울/경기 쏠림이 보이면 그것은 보정 실패가 아니라 자본 집중의 반영입니다."
- "전국 보드를 지역별 할당제로 보정하면 오히려 전국 랭킹의 신뢰가 약해집니다."

주의:

- 지역 균형 보정 순위가 아니라고 명확히 말한다.
- 지역 확장은 별도 지역 보드로 additive하게 다룬다고 말한다.

### Step 4. Regional Direction

목표: 향후 지역 보드 방향을 설명하되 구현 완료처럼 말하지 않는다.

말할 내용:

- "지역 ranking/index는 미래의 additive traffic board입니다."
- "전국 TOP1000을 단순히 지역별로 잘라 보여주는 방식이 아니라, 각 지역 universe 안에서 다시 랭킹해야 합니다."
- "Regional KOAPTIX Index는 개별 단지 순위가 아니라 지역 시장의 aggregate signal입니다."

주의:

- "이미 전국 모든 지역 보드가 구현됐다"라고 말하지 않는다.
- "향후 audit과 품질 게이트를 거쳐 확장할 방향"이라고 말한다.

### Step 5. Detail Modal

목표: 단지 상세에서 추정 데이터와 안전 문구를 확인한다.

말할 내용:

- "상세 화면은 랭킹에서 관심 단지로 들어가는 흐름입니다."
- "여기서도 추정치, 공식 가격지수 아님, 투자자문 아님을 분명히 유지합니다."
- "KOAPTIX는 시장을 읽는 도구이지 매수/매도 판단을 제공하는 서비스가 아닙니다."

보여줄 것:

- `/ranking?complexId=4949` 같은 안전한 대표 상세 진입
- 단지 상세 정보
- 베타/추정/투자자문 아님 문구

### Step 6. Search / Command Palette

목표: 검색은 랭킹의 대체물이 아니라 companion exploration path임을 설명한다.

말할 내용:

- "검색은 랭킹 중심 제품을 보조하는 탐색 경로입니다."
- "검색에 노출되는 것과 랭킹에 포함되는 것은 분리해야 합니다."
- "향후 Unranked Complex Discovery는 search trust layer로 다룰 수 있지만, 그것이 랭킹 확장은 아닙니다."

주의:

- "모든 단지가 이미 검색/랭킹된다"라고 말하지 않는다.
- 검색 발견과 rank eligibility를 섞지 않는다.

### Step 7. Roadmap

목표: 다음 검증 게이트를 분명히 말한다.

말할 내용:

- "다음 단계는 full public launch가 아니라 추가 검증입니다."
- "안전한 production target으로 direct production smoke를 다시 수행해야 full controlled soft-public-beta GO를 논의할 수 있습니다."
- "지역 ranking/index coverage audit과 unranked discovery coverage audit도 별도 lane으로 진행해야 합니다."

## 15-Minute Investor / Advisor Demo Flow

### 1. Problem

아파트 시장은 가격 정보는 많지만, 자산 규모와 시장 내 무게를 ranking-first로 읽는 도구가 부족하다. 사용자는 특정 단지가 비싼지뿐 아니라, 시장에서 얼마나 큰 자본 비중을 갖는지 알고 싶어한다.

### 2. Product Thesis

KOAPTIX의 thesis는 "아파트 단지도 자본 규모 기준으로 랭킹하고 비교할 수 있다"는 것이다. 개별 거래 가격만 보는 대신, 대표가격과 세대수를 결합해 추정 시가총액을 만들고 이를 랭킹/유니버스/시장 신호로 전개한다.

### 3. Data / Methodology Posture

- KOAPTIX ranking은 estimated market cap 기반이다.
- estimated market cap은 대표가격 × 세대수 구조로 설명한다.
- KOAPTIX Index는 시장 aggregate signal이다.
- KOAPTIX Ranking은 개별 단지 순위다.
- 두 개념을 섞지 않는다.
- 데이터는 추정치이며 공식 가격지수나 투자자문이 아니다.

### 4. Current Proof

- Soft Public Beta copy는 이전 production observation에서 visible로 확인됐다.
- final prelaunch gate에서 `npm run build`는 PASS였다.
- `npm run lint`는 0 errors, 50 existing warnings였다.
- local runtime smoke는 9/9 PASS였다.
- blockers는 발견되지 않았다.
- 현재 판정은 `READY_FOR_PRIVATE_DEMO_WITH_WARNINGS`다.

### 5. Product Moat

- ranking-first UX
- estimated market-cap lens
- KOREA_ALL national authority board
- universe-based expansion model
- search as companion exploration path
- methodology and disclosure discipline

### 6. Current Limitations

- full controlled soft-public-beta GO가 아니다.
- 최신 gate에서 direct production smoke는 safe target 부재로 재수행하지 않았다.
- lint warning 50개가 남아 있다.
- `/api/ranking`과 `/api/rankings`는 `limit=20`에서 count semantics 차이가 관측됐다.
- mobile clipping과 command palette는 최신 직접 production recheck가 아니라 retained production evidence에 일부 의존한다.

### 7. Next Validation Gates

- safe production target으로 direct production smoke 재수행
- private demo checklist 점검
- regional ranking/index coverage audit
- unranked discovery coverage audit
- 필요 시 lint warning 정리 계획

### 8. Business / Traffic Expansion Logic

초기에는 KOREA_ALL national board가 신뢰와 권위를 만든다. 이후 지역 ranking/index는 local traffic board로 확장할 수 있다. SGG 보드는 long-tail local discovery를 만들고, Unranked Complex Discovery는 검색 신뢰 계층을 강화한다. 단, 이 확장은 모두 additive이며 KOREA_ALL을 약화하지 않는다.

### 9. Why Regional Ranking / Index Matters

지역 사용자는 "전국 1등"보다 "우리 지역에서 의미 있는 단지"를 알고 싶어한다. 지역 ranking은 지역 내 비교를 제공하고, regional index는 지역 시장의 aggregate signal을 제공한다. 두 표면은 traffic과 retention에 기여할 수 있다.

### 10. Why Unranked Discovery Matters

랭킹에 포함되지 않은 단지도 사용자가 찾을 수 있다. 하지만 검색 노출은 랭킹 자격과 다르다. Unranked Complex Discovery는 "확인된 단지이나 현재 랭킹 산정 대상 아님" 같은 신뢰 표현을 위한 미래 계층이다.

### 11. Ask / Feedback Needed

- 첫 화면에서 가치 제안이 즉시 이해되는가?
- 랭킹과 인덱스의 차이가 명확한가?
- 투자자문 아님 문구가 충분히 안전하게 느껴지는가?
- 지역 ranking/index 확장 방향이 설득력 있는가?
- 사용자가 검색에서 기대할 행동은 무엇인가?
- private demo 다음에 어떤 검증을 먼저 해야 하는가?

## Talk Track By Screen

### Home

"여기는 KOAPTIX의 가벼운 전술 보드입니다. 전체 서비스를 한 문장으로 느끼게 하는 화면이고, 바로 Soft Public Beta와 추정 데이터 안내를 보여줍니다."

### Ranking Board

"여기가 핵심입니다. KOAPTIX는 단지를 추정 시가총액 기준으로 정렬합니다. 단순 평당가가 아니라 단지의 시장 내 자본 무게를 보려는 접근입니다."

### Universe Selector / KOREA_ALL

"KOREA_ALL은 전국 권위 보드입니다. 서울/경기 쏠림이 나오면 그건 보정 실패가 아니라 전국 자본 집중도의 반영입니다. 지역 보드는 별도 universe 안에서 다시 랭킹해야 합니다."

### Detail Modal

"상세에서는 개별 단지의 맥락을 봅니다. 여기에서도 추정치와 no-investment-advice posture를 유지합니다."

### Search / Command Palette

"검색은 ranking-first 제품을 보조하는 탐색 경로입니다. 검색 노출과 랭킹 포함은 분리해야 하고, future unranked discovery도 이 원칙 위에서 가야 합니다."

### Beta / Disclosure Copy

"이 문구는 일부러 숨기지 않았습니다. KOAPTIX는 공식 가격지수나 투자자문이 아니고, 현재는 private demo with warnings 단계입니다."

### Strategy / Roadmap

"다음은 public launch가 아니라 검증입니다. direct production smoke, regional audit, unranked discovery audit을 별도 게이트로 진행해야 합니다."

## Safe Claims

Founder가 안전하게 말할 수 있는 문장:

- "현재 private demo 기준의 빌드는 build와 local runtime smoke를 통과했습니다."
- "Soft Public Beta copy는 이전 production observation에서 visible로 확인됐습니다."
- "KOAPTIX ranking은 estimated market cap 관점입니다."
- "KOREA_ALL은 전국 자본 집중도를 반영하는 national authority board입니다."
- "지역 ranking/index와 unranked discovery는 문서화된 미래 방향이며, 현재 구현 완료 기능으로 말하지 않습니다."
- "KOAPTIX는 공식 가격지수나 투자자문이 아닙니다."
- "현재 판정은 READY_FOR_PRIVATE_DEMO_WITH_WARNINGS입니다."

## Claims To Avoid

말하면 안 되는 문장:

- "이건 공식 금융지수입니다."
- "투자 판단에 바로 써도 됩니다."
- "정부가 인증한 데이터입니다."
- "실시간 정확한 시장가치입니다."
- "full controlled public beta GO 상태입니다."
- "전국 모든 아파트가 이미 검색/랭킹됩니다."
- "지역 ranking/index는 이미 완성됐습니다."
- "Unranked Complex Discovery는 이미 구현됐습니다."
- "KOREA_ALL은 지역별 균형을 맞춘 공정 순위입니다."
- "검색에 나오면 랭킹 자격도 충족한 것입니다."

## Known Warnings To Disclose Internally

private demo 전 내부적으로 알고 있어야 하는 경고:

- 최신 prelaunch gate에서 direct production smoke는 safe production host 부재로 재수행하지 않았다.
- `npm run lint`는 0 errors지만 50 existing warnings를 유지한다.
- 최신 local runtime smoke는 9/9 PASS였다.
- `/api/ranking?...limit=20`은 50 rows, `/api/rankings?...limit=20`은 20 rows로 count semantics 차이가 관측됐다.
- mobile clipping과 command palette copy는 최신 직접 production recheck가 아니라 retained production evidence에 일부 의존한다.
- full controlled public beta에는 별도 go/no-go gate가 필요하다.

## Anticipated Q&A

### Q. 왜 market cap 기준인가?

A. 가격만 보면 작은 고가 단지가 과도하게 부각될 수 있습니다. KOAPTIX는 대표가격과 세대수를 함께 봐서 단지의 자산 규모와 시장 내 무게를 읽으려는 접근입니다.

### Q. 기존 공식 가격지수와 뭐가 다른가?

A. 공식 가격지수는 가격 움직임을 추적하는 데 강합니다. KOAPTIX는 개별 단지와 유니버스를 estimated market cap과 ranking 관점으로 보여주는 제품입니다. 공식 지수를 대체한다고 말하지 않습니다.

### Q. 왜 KOREA_ALL이 서울/경기에 쏠릴 수 있나?

A. KOREA_ALL은 전국 자본 집중도를 보여주는 national authority board입니다. 자본이 특정 지역에 집중되어 있다면 그 집중이 랭킹에 드러나는 것이 자연스럽습니다. 이를 인위적으로 지역 균형화하지 않습니다.

### Q. 지역 ranking/index가 왜 중요한가?

A. 전국 보드는 권위와 기준을 만들지만, 사용자는 자기 지역의 비교도 원합니다. 지역 ranking/index는 local traffic과 반복 사용을 만들 수 있는 future additive board입니다.

### Q. 왜 어떤 단지는 안 보일 수 있나?

A. KOAPTIX는 ranking inclusion standards를 낮추지 않습니다. 대표가격, 세대수, estimated market cap, eligibility, data-quality 조건을 충족해야 ranking에 포함될 수 있습니다.

### Q. Unranked Complex Discovery가 뭔가?

A. 랭킹에는 포함되지 않지만 public/canonical evidence가 있는 단지를 향후 검색 신뢰 계층에서 다루는 방향입니다. 이것은 rank expansion이 아니며 별도 audit이 필요합니다.

### Q. 투자자문인가?

A. 아닙니다. KOAPTIX는 투자 권유, 매수/매도 판단, 수익 보장을 제공하지 않습니다. 추정 데이터를 기반으로 시장을 읽는 도구입니다.

### Q. 데이터 freshness는 어떻게 설명하나?

A. 현재 데모에서는 데이터 freshness를 과장하지 않습니다. KOAPTIX는 현재 source-of-truth chain과 readiness gate를 기준으로 안전하게 보여줄 수 있는 범위만 설명합니다. 최신성/업데이트 주기는 별도 검증된 운영 문서가 있을 때만 구체화합니다.

### Q. public launch 전에 무엇이 남았나?

A. safe production target을 통한 direct production smoke, 남은 warnings 검토, 지역/검색 확장 audit, 공개 문구와 사용자 여정 점검이 남아 있습니다.

### Q. 비즈니스 가치는 무엇인가?

A. KOAPTIX는 아파트 시장을 ranking-first로 읽는 새로운 습관을 만들 수 있습니다. 전국 권위 보드에서 시작해 지역 보드, 검색 discovery, 시장 aggregate signal로 확장할 수 있습니다.

## Pre-Demo Checklist

데모 직전 확인:

- 올바른 환경/URL인지 확인한다.
- admin, env, console, network secrets, logs를 노출하지 않는다.
- 사용자-facing 페이지까지만 연다.
- Soft Public Beta label이 보이는지 확인한다.
- estimated-data caveat와 no-investment-advice 문구가 보이는지 확인한다.
- runtime이 불안하면 fallback screenshots를 준비한다.
- audience는 trusted private group으로 제한한다.
- 데모 중 live debugging을 하지 않는다.
- warnings를 간단히 설명할 준비를 한다.
- full public beta GO라고 말하지 않는다.

## Demo Fallback Plan

라이브 사이트가 느리거나 열리지 않으면:

1. fallback screenshots 또는 이전 visual evidence를 사용한다.
2. 현재 상태를 `READY_FOR_PRIVATE_DEMO_WITH_WARNINGS`라고 설명한다.
3. final prelaunch gate summary를 보여준다.
4. 기술 로그, env, credentials, admin 화면은 열지 않는다.
5. 즉석에서 기술적 원인을 단정하지 않는다.
6. "이 부분은 다음 validation gate에서 확인하겠습니다"라고 말한다.

## Post-Demo Follow-Up Template

데모 후 보낼 수 있는 메시지:

> 오늘 KOAPTIX private demo를 봐주셔서 감사합니다. KOAPTIX는 현재 `READY_FOR_PRIVATE_DEMO_WITH_WARNINGS` 단계이며, full controlled public beta GO 전에는 추가 production smoke와 검증 게이트가 남아 있습니다. 오늘 보신 랭킹과 추정 시가총액은 시장을 읽기 위한 참고 데이터이며, 공식 가격지수나 투자자문이 아닙니다. 특히 첫 화면의 이해도, KOREA_ALL 전국 랭킹의 설득력, 지역 ranking/index 방향, 검색/미랭킹 단지 discovery에 대한 기대를 중심으로 피드백을 부탁드립니다.

## Recommended Next Lanes

Primary next lane:

- `P-KOAPTIX-PRIVATE-DEMO-SCENARIO-PACK-COMMIT.0`
  - purpose: commit this docs-only private demo scenario pack after CTO review.
  - allowed actions: stage and commit only this document.
  - prohibited actions: DB, code, deploy, public launch claim, regional implementation, unranked discovery implementation.
  - success criteria: one docs-only commit with no other files.

Optional future lanes:

- `P-KOAPTIX-DIRECT-PRODUCTION-SMOKE-WITH-SAFE-TARGET.0`
  - purpose: pursue full controlled soft-public-beta GO by rerunning direct production smoke with a safe target.
- `P-KOAPTIX-REGIONAL-RANKING-INDEX-COVERAGE-AUDIT.0`
  - purpose: audit regional ranking/index coverage without weakening KOREA_ALL.
- `P-KOAPTIX-UNRANKED-COMPLEX-DISCOVERY-COVERAGE-AUDIT.0`
  - purpose: audit unranked discovery candidates without treating search exposure as rank eligibility.

## Resume Point

Resume with CTO review of this private demo scenario pack. If accepted, the next bounded action is `P-KOAPTIX-PRIVATE-DEMO-SCENARIO-PACK-COMMIT.0`.
