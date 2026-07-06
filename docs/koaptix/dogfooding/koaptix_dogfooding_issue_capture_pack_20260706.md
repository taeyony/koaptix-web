# KOAPTIX Founder Dogfooding Issue Capture Pack

Date: 2026-07-06

Review marker: `P-KOAPTIX-DOGFOODING-ISSUE-CAPTURE-PACK.0`

## Status

- document_status: `DOGFOODING_ISSUE_CAPTURE_ONLY`
- service_posture: `GO_CONTROLLED_SOFT_PUBLIC_BETA_WITH_WARNINGS`
- official_launch_status: `NOT_OFFICIAL_LAUNCH`
- full_public_beta_without_warnings: `NO`
- investment_advice_readiness: `NO`
- official_financial_index_status: `NO`
- code_or_data_change_approved: `NO_CODE_OR_DATA_CHANGE_APPROVED`

## Purpose

이 문서는 안정화 루프가 닫힌 뒤 창업자가 KOAPTIX 사이트를 직접 사용하면서 이슈를 모으기 위한 기록 팩이다.

목표는 바로 고치는 것이 아니라, 실제 사용자처럼 써보고 불편, 혼란, 신뢰 저하, 데이터 의심, 제품 기회를 분리해서 다음 안전한 작업 lane으로 보내는 것이다. 특히 UX 불편과 데이터/랭킹/source-of-truth 문제를 섞지 않는다.

이 문서는 구현 승인서가 아니다. DB write, SQL, helper 실행, read model refresh, source import, ranking methodology 변경, source-of-truth 변경, deploy, registry exposure 변경을 승인하지 않는다.

## Dogfooding Operating Rule

- 실제 사용자처럼 사용한다.
- 불편을 발견하면 먼저 기록한다. 바로 patch하지 않는다.
- 비슷한 이슈를 묶는다.
- 단일 관찰만으로 DB, 랭킹, source-of-truth, universe, registry를 바꾸지 않는다.
- 사용자의 불편함과 데이터 정확성 문제를 분리한다.
- Search discovery와 ranking inclusion을 분리한다.
- `KOREA_ALL / KOAPTIX 1000`은 전국 authority board이며 인위적으로 지역 균형을 맞추지 않는다.
- Regional ranking/index는 미래 additive board이며 구현 완료처럼 말하지 않는다.
- Unranked Complex Discovery는 미래 search trust layer이며 rank expansion이 아니다.
- beta, estimated-data, no-investment-advice posture가 계속 보이는지 확인한다.

## 30-Minute Founder Dogfooding Route

### 0. 준비

- 브라우저를 일반 사용자 상태로 연다.
- 관리자 화면, env, console secret, DB, 로그 화면을 열지 않는다.
- 캡처가 필요하면 파일 경로를 남긴다. 개인정보나 secret이 보이면 캡처하지 않는다.
- 판단 기준은 "내가 실제 사용자라면 이해하고 신뢰할 수 있는가"이다.

### 1. Home First Impression

확인할 것:

- 첫 화면에서 KOAPTIX가 ranking-first apartment capital-flow terminal로 느껴지는가.
- Soft Public Beta / estimated data / no investment advice 문구가 보이는가.
- 첫 CTA가 자연스럽게 ranking board로 이어지는가.
- Home이 가벼운 tactical board로 작동하는가.

기록 포인트:

- 첫 10초 안에 가치가 이해되는지.
- 문구가 길어서 밀리거나 모바일에서 잘리는지.
- "공식 지수"나 "투자 판단"처럼 오해될 여지가 있는지.

### 2. Ranking Board

확인할 것:

- `/ranking` 진입이 자연스러운가.
- KOAPTIX 500 / TOP1000 관계가 헷갈리지 않는가.
- ranking table에서 rank, complex name, region, estimated market cap, movement/copy가 읽히는가.
- sorting, selection, detail 진입이 답답하지 않은가.

기록 포인트:

- 신뢰를 떨어뜨리는 빈 상태, 숫자 표기, 단위 혼란.
- 클릭 가능한 요소와 아닌 요소가 구분되는지.
- 랭킹과 인덱스 용어가 섞이지 않는지.

### 3. KOREA_ALL TOP1000

확인할 것:

- `KOREA_ALL`이 전국 authority board로 설명되는가.
- 특정 지역 쏠림이 제품 결함처럼 보이지 않도록 설명되는가.
- TOP1000이 wider public ranking board라는 느낌이 분명한가.

기록 포인트:

- 사용자가 "왜 서울/경기가 많지?"라고 물을 가능성.
- 지역 균형 보정 요구처럼 보이는 UX/copy.
- 전국 board와 지역 board의 미래 확장 관계가 혼란스러운지.

### 4. Seoul / Busan / Gyeonggi Universe Checks

사용 가능한 경우 확인한다.

확인할 것:

- universe selector가 잘 보이고 의미가 명확한가.
- 각 universe 안에서 re-ranking된다는 점을 사용자가 직관적으로 이해할 수 있는가.
- national rank의 단순 filter처럼 보이지 않는가.

기록 포인트:

- universe code, display name, empty/loading 상태.
- 지역 board가 구현 완료된 regional index처럼 과장되어 보이는지.
- universe 전환 후 사용자가 현재 맥락을 잃는지.

### 5. Detail Modal / Detail Route

확인할 것:

- ranking row에서 detail로 진입이 쉽고 빠른가.
- detail에서 estimated-data / no-investment-advice posture가 유지되는가.
- 수치, 위치, trade/context 정보가 과장 없이 보이는가.
- 닫기, 뒤로가기, URL state가 자연스러운가.

기록 포인트:

- modal이 모바일에서 넘치거나 닫기 어려운지.
- detail copy가 투자 권유처럼 읽히는지.
- "왜 이 단지가 이 순위인가"에 대한 충분한 설명이 있는지.

### 6. Search / Command Palette

확인할 것:

- 알려진 TOP1000 단지명을 검색했을 때 기대한 결과를 찾기 쉬운가.
- search가 ranking-first product의 companion exploration path로 작동하는가.
- 검색 결과 노출과 ranking inclusion이 섞여 보이지 않는가.

추천 검색:

- 잘 알려진 대형 단지 2-3개.
- 사용자가 개인적으로 아는 지역 단지 2-3개.
- 작거나 local한 단지 2-3개.

기록 포인트:

- 결과가 없을 때 문구가 친절한가.
- 검색 실패가 "데이터 오류"인지 "현재 rank 대상 아님"인지 구분되는가.
- unranked discovery가 필요해 보이는 사례인지.

### 7. Mobile First Viewport

확인할 것:

- Home 첫 화면에서 중요한 beta/disclaimer/value text가 잘리지 않는가.
- ranking board 주요 column이 읽히는가.
- modal, selector, search가 손가락 조작에 무리가 없는가.

기록 포인트:

- horizontal overflow.
- button label clipping.
- text overlap.
- sticky/header/footer가 content를 가리는지.

### 8. Beta / Disclaimer Visibility

확인할 것:

- controlled soft beta with warnings posture가 숨겨져 있지 않은가.
- estimated data와 no investment advice가 지나치게 약하게 보이지 않는가.
- "official launch", "official financial index", "investment advice"로 오해될 문구가 없는가.

기록 포인트:

- 위험 문구 후보.
- warning 위치가 너무 늦게 나오는 곳.
- 반복이 너무 많아 UX를 방해하는 곳.

### 9. Copy Clarity

확인할 것:

- KOAPTIX Ranking과 KOAPTIX Index가 섞이지 않는가.
- market aggregate signal과 individual apartment complex ranking이 구분되는가.
- "estimated market cap"이 직관적으로 설명되는가.

기록 포인트:

- 너무 긴 문장.
- 애매한 버튼 label.
- 투자 조언처럼 보이는 표현.
- 한국어/영어 혼용이 읽기 흐름을 깨는 곳.

## Issue Capture Template

아래 템플릿을 이슈마다 복사해서 사용한다.

```text
issue_id:
date/time:
page/path:
device/viewport:
user intent:
what I expected:
what happened:
screenshot/path if any:
issue category:
severity:
confidence:
suspected area:
do not fix before audit? yes/no:
recommended next lane type:
notes:
```

작성 원칙:

- 현상과 추측을 분리한다.
- "데이터가 틀림"이라고 단정하기 전에 "데이터 정확성 concern"으로 기록한다.
- screenshot에는 secret, env, 계정정보, 개인정보가 보이지 않게 한다.
- 재현 경로를 적는다.

## Issue Categories

| Category | Meaning | Default handling |
| --- | --- | --- |
| `UX/navigation` | 흐름, CTA, 뒤로가기, 상태 전환 불편 | UX triage 후 bounded UI patch |
| `mobile/layout` | 모바일 overflow, clipping, spacing, touch target | mobile UX polish plan |
| `copy/wording` | 문구가 길거나 모호하거나 위험하게 읽힘 | copy patch 가능, 위험 문구는 CTO review |
| `search discovery` | 검색 결과, command palette, empty state | read-only search discovery audit before code |
| `ranking board` | board scan, column, row action, TOP1000 이해 | UX triage; ranking logic 의심은 CTO review |
| `detail modal` | detail 진입, modal, URL state, 설명 부족 | bounded UI/copy patch 가능 |
| `universe selector` | universe 전환, 명칭, re-ranking 이해 | audit or UX patch depending on issue |
| `map` | 지도 위치/interaction/visibility | UI triage; 데이터 위치 의심은 read-only audit |
| `performance` | 느림, loading, perceived latency | read-only timing/source inspection first |
| `data display` | 단위, 숫자, 날짜, formatting | UI/data-display patch 가능 |
| `data correctness concern` | 값, 순위, source, household/trade 의심 | read-only DB/source evidence audit before write |
| `regional ranking/index idea` | 지역 board/index 제품 아이디어 | regional ranking/index coverage audit first |
| `unranked discovery idea` | rank 밖 단지 발견/검색 신뢰 아이디어 | unranked discovery coverage audit first |
| `beta/legal-risk wording` | 공식/투자/보장처럼 보이는 위험 문구 | immediate wording review; CTO if material |
| `unknown/needs triage` | 아직 분류 불가 | founder issue triage |

## Severity Scale

| Severity | Definition | Examples |
| --- | --- | --- |
| `S0 blocker` | core flow를 사용할 수 없거나 misleading/unsafe claim이 있음 | 사이트 진입 불가, 투자 조언처럼 읽힘, 공식 지수로 오해 |
| `S1 high` | core flow는 되지만 신뢰나 사용성을 크게 해침 | 주요 CTA 혼란, detail 진입 실패, beta 경고 부재 |
| `S2 medium` | 눈에 띄는 마찰이나 반복 사용 불편 | 모바일 column 불편, 검색 empty state 혼란 |
| `S3 low` | polish 수준 | spacing, label, minor copy |
| `Idea` | bug가 아니라 제품 기회 | regional board, unranked discovery, onboarding idea |

Confidence:

- `High`: 2회 이상 재현되었거나 명확함.
- `Medium`: 한 번 재현되었고 경로가 남아 있음.
- `Low`: 느낌이나 아이디어에 가까움.

## Safe Response By Issue Type

| Issue type | Safe default response | Do not do immediately |
| --- | --- | --- |
| UI/copy/mobile issue | UX triage 후 bounded UI patch lane | DB, ranking, source-of-truth 변경 |
| Search discovery issue | read-only search discovery audit | 검색 노출을 rank eligibility로 간주 |
| Regional ranking/index issue | regional coverage audit | KOREA_ALL region-balance redesign |
| Unranked complex issue | unranked discovery coverage audit | unranked complex를 ranking에 바로 추가 |
| Data correctness concern | read-only DB/source evidence audit | DB write, helper execution, rank rewrite |
| Performance issue | read-only timing/source inspection | 무근거 optimization 또는 load test |
| Ranking/source-of-truth issue | CTO review before any change | source-of-truth bypass |
| Beta/legal wording issue | wording risk triage; S0면 즉시 CTO review | 공식 launch/index/advice claim |
| Unknown | founder dogfooding issue triage | 즉시 구현 |

## Founder Dogfooding Worksheet

| issue_id | route step | page/path | device | category | severity | confidence | summary | do not fix before audit? | recommended next lane |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FD-001 | Home | `/` | desktop/mobile |  |  |  |  |  |  |
| FD-002 | Ranking | `/ranking` | desktop/mobile |  |  |  |  |  |  |
| FD-003 | TOP1000 | `/ranking` | desktop/mobile |  |  |  |  |  |  |
| FD-004 | Universe | `/ranking?universe_code=...` | desktop/mobile |  |  |  |  |  |  |
| FD-005 | Detail | `/ranking?complexId=...` | desktop/mobile |  |  |  |  |  |  |
| FD-006 | Search | search / command palette | desktop/mobile |  |  |  |  |  |  |
| FD-007 | Local search | search / command palette | desktop/mobile |  |  |  |  |  |  |
| FD-008 | Beta copy | any | desktop/mobile |  |  |  |  |  |  |
| FD-009 | Mobile | any | mobile |  |  |  |  |  |  |
| FD-010 | Product idea | any | any |  | Idea |  |  |  |  |

## What Can Be Fixed Quickly

이 항목들은 증거가 명확하면 bounded UI/copy patch lane으로 비교적 빠르게 처리할 수 있다.

- wording too long
- button label unclear
- mobile overflow
- detail modal copy
- CTA order
- search placeholder text
- empty-state wording
- tooltip / label wording
- spacing / visual hierarchy
- beta warning placement, if wording remains conservative
- no-advice reminder visibility

빠른 수정도 별도 승인 lane이 필요하다. 이 dogfooding pack 자체는 수정 승인이 아니다.

## What Must Not Be Fixed Quickly

아래 항목은 반드시 read-only audit 또는 CTO review를 먼저 거친다.

- rank inclusion rules
- market-cap formula
- KOREA_ALL regional balancing
- adding unranked complexes to ranking
- changing source-of-truth
- DB writes
- helper execution
- read model refresh
- registry exposure
- source import
- universe membership assumptions
- ranking methodology changes
- using `public.koaptix_latest_board_read_model` as rank source of truth
- bypassing `koaptix_rank_snapshot -> v_koaptix_universe_rank_history_dynamic -> v_koaptix_latest_universe_rank_board_u`
- official launch / official financial index / investment advice wording

## First Dogfooding Batch Recommendation

첫 batch는 10-20개 이슈를 모은 뒤 triage한다. 바로 code patch lane을 열지 않는다.

권장 순서:

1. 30-minute route를 1회 수행한다.
2. desktop과 mobile에서 최소 각각 5개 이상 관찰을 남긴다.
3. issue category와 severity를 붙인다.
4. S0/S1은 즉시 따로 표시한다.
5. 같은 유형을 묶는다.
6. 빠른 UI/copy 후보와 read-only audit 필요 후보를 분리한다.
7. 다음 lane 하나를 선택한다.

후보 next lanes:

- `P-KOAPTIX-FOUNDER-DOGFOODING-ISSUE-TRIAGE.0`
- `P-KOAPTIX-SEARCH-DISCOVERY-UX-AUDIT.0`
- `P-KOAPTIX-MOBILE-UX-POLISH-PLAN.0`
- `P-KOAPTIX-REGIONAL-RANKING-INDEX-COVERAGE-AUDIT.0`
- `P-KOAPTIX-UNRANKED-COMPLEX-DISCOVERY-COVERAGE-AUDIT.0`

Default recommendation after collecting the first batch:

- `P-KOAPTIX-FOUNDER-DOGFOODING-ISSUE-TRIAGE.0`

## Safe Public / Private Wording Reminder

Allowed posture:

- controlled soft public beta with warnings
- limited beta
- estimated market-cap ranking
- ranking-first apartment capital-flow terminal
- reference data, not investment advice
- estimated residential asset value

Forbidden posture:

- official launch
- full public launch
- full public beta without warnings
- official financial index
- government statistic
- investment advice
- investment product
- real-time exact valuation
- guaranteed market value
- all apartments are searchable/ranked
- regional ranking/index is implemented
- Unranked Complex Discovery is implemented

## Recommended Next Lane

`P-KOAPTIX-DOGFOODING-ISSUE-CAPTURE-PACK-COMMIT.0`

Use this if the pack is complete and should be committed.

Alternative:

- `P-KOAPTIX-DOGFOODING-ISSUE-CAPTURE-PACK-PATCH.0` if this pack is missing required structure.
- `STOP` if CTO decides not to proceed.

## Resume Point

Resume with CTO review of this docs-only founder dogfooding issue capture pack. If accepted, the next bounded action is `P-KOAPTIX-DOGFOODING-ISSUE-CAPTURE-PACK-COMMIT.0`, limited to staging and committing this single document only.
