# KOAPTIX Product Development Master Roadmap

- Candidate version: `0.3-final-dual-clock-data-moat-public-safe`
- Candidate date: `2026-09-03`
- Lifecycle status: `PROPOSED_FINAL_DUAL_CLOCK_PUBLIC_SAFE_CANDIDATE_ONLY` until an accepted tracked revision exists
- Canonicalization complete: `false`
- Tracked source write authorized: `false`
- Commit / push / deploy authorized: `false / false / false`
- ChatGPT Sources mirror upload ready: `false`
- Canonical effect condition: explicit user/CTO acceptance of this final public-safe candidate and its public/private responsibility boundary, separately authorized exact tracked source write and verification, separately authorized exact stage and commit, and acceptance of that revision
- Planning authority after effect: long-range product/technology, Dual-Clock data-asset direction, and next-lane selection reference
- Execution authority: `NONE`
- Current capability-state authority: [KOAPTIX State Registry](../governance/KOAPTIX_STATE_REGISTRY.yaml)
- Publication scope: `PUBLIC_SAFE_CANDIDATE_PENDING_CTO_ACCEPTANCE`
- Publication approval granted: `false`
- Foundation: `DAILY_ACCOUNTED_TIME_NATIVE_ASSET_CONTINUITY`
- Time-series accumulation health: `NEEDS_VERIFICATION`
- 36-month storage suitability: `UNKNOWN_PENDING_READ_ONLY_AUDIT`

## 1. Document Role, Version, and Effect Boundary

이 문서는 KOAPTIX의 기존 성공 자산을 보존하면서 `Public Beta -> Monetization MVP -> V1 Intelligence -> V2 Platform`으로 확장하는 장기 제품·기술 계획과 그 모든 phase 아래의 Foundation P0를 한곳에 정리한다. 현재 구현 목록, capability registry, 실행 handoff, DB 작업서 또는 release 승인서가 아니다.

후보 상태에서는 어떤 canonical authority도 갖지 않는다. 위 효력 발생 조건을 모두 통과한 뒤에도 이 문서의 권한은 계획과 우선순위 검토에 한정된다. 문서 채택은 코드·DB·registry·source 수정, test, stage, commit, push, deploy, production 실행 또는 개별 기능 공개를 승인하지 않는다. 실제 작업은 항상 하나의 별도 bounded lane과 정확한 승인 범위를 요구한다.

이 public-safe 후보는 정확한 가격, package quota, API 사용량·원가·내부 예산, margin·변동원가 비율, conversion·growth threshold, cohort 규모·기간 및 내부 진척률을 포함하지 않는다. 해당 상업 가설과 historical planning estimate는 데이터 유실 없이 public roadmap 밖에 별도로 보존되며, private canonical location은 별도 결정 전까지 unresolved다. 이 후보는 아직 공개 또는 tracked source write 승인을 받지 않았다.

Dual Clock, Daily Accounted Observation, Hybrid Generation Reference, archive와 storage lifecycle은 모두 planning strategy다. 이 문서는 scheduler나 cron이 건강하다는 사실, daily ledger나 archive가 존재한다는 사실, 모든 날짜의 continuity, multi-year storage 적합성, 새 schema, History·Signal 기능 또는 어떤 실행 완료도 주장하지 않는다. 코드·DB·scheduler·schema·archive·backfill·test·Git·deploy·publication은 각각 별도 evidence와 exact authority를 요구한다.

## 2. Preserved Principles and Conflict Boundary

이 roadmap은 다음 accepted 원칙을 변경하지 않는다.

- KOAPTIX는 전국 아파트 capital-flow ranking terminal이다.
- Ranking은 개별 단지의 추정 시가총액 순위, Index는 normalized aggregate market number다. Home은 경량 상황판, Ranking은 full exploration/operations board, Search는 더 넓은 discovery path다.
- `KOAPTIX 500`은 flagship main board, `TOP1000`은 broader public ranking board다. 과거 전략 노트의 `KOAPTIX 1000` 표기는 historical source에 남지만 현재 naming은 `TOP1000`이다.
- 검증된 `KOREA_ALL` engine을 보존하고 multi-universe는 additive only로 확장한다. Universe rank는 national rank filter가 아니라 각 universe 내부 재랭킹이다.
- `complex_rank_history`는 `universe_code` 없는 단일 global history engine으로 유지한다.
- 공식 board source-of-truth는 `koaptix_rank_snapshot -> v_koaptix_universe_rank_history_dynamic -> v_koaptix_latest_universe_rank_board_u`다. `public.koaptix_latest_board_read_model`은 derived serving cache이며 rank source of truth가 아니다. Serving cache나 membership만으로 source of truth 또는 readiness를 선언하지 않는다.
- Search discovery와 ranked inclusion을 분리한다. Coverage를 늘리기 위해 eligibility, canonical matching 또는 data-quality 기준을 낮추지 않는다.
- sealed capability, `null`/`NEW`/weekly-movement 의미, source provenance와 quality gate를 roadmap 편의를 위해 다시 열거나 바꾸지 않는다.
- Watcher Y는 관측자와 data guide다. 매수·매도 추천, 수익 보장 또는 공식 금융지수 주장을 하지 않는다.

충돌 시 최신의 구체적인 accepted decision, State Registry의 current capability state, 관련 checkpoint, 현재 승인된 handoff 순으로 기존 authority 규칙을 적용한다. 이 roadmap의 제안이나 오래된 서술이 그 authority를 덮지 않는다. Source/build PASS는 production runtime PASS로 바꾸어 쓰지 않으며, 좁은 smoke 표본을 전국 coverage 증거로 일반화하지 않는다. M900~M906와 Project Memory v2의 sealed/monitored 상태는 이 계획 때문에 reopen되지 않는다.

Foundation P0는 Phase A~D 전체에 걸친 planning dependency이지 새로운 source of truth나 State Registry capability가 아니다. 새 schema를 먼저 가정하지 않으며, 실제로 검증되는 기존 lineage·snapshot·generation·publication substrate를 우선 재사용한다.

## 3. Statement Classification

| 분류 | 의미 | 이 문서의 대표 예 |
| --- | --- | --- |
| `ACCEPTED_PRINCIPLE` | tracked authority와 accepted decision으로 이미 확정된 장기 원칙 | ranking-first, KOAPTIX 500/TOP1000 역할, KOREA_ALL 보존, additive universe, discovery/ranking 분리 |
| `CURRENT_ACCEPTED_EVIDENCE` | 특정 accepted revision 또는 bounded evidence가 입증한 좁은 현재 사실 | SHA `0c636303...`의 closed Home V2 release smoke에서 확인한 정확한 흐름 |
| `PROPOSED_STRATEGY_DECISION` | roadmap 수락 시 계획 기준이 되지만 아직 구현·실행 사실은 아닌 방향 | intelligence-layer 확장, 네 phase, 핵심 무료 유입 방향, deterministic-first AI 경계 |
| `ROADMAP_CONTRACT_CANDIDATE` | 미래 구현이 충족해야 할 semantic vocabulary이며 현재 DB enum·column·runtime contract가 아님 | Daily Accounted Observation status와 minimum irreproducible metadata 후보 |
| `PROPOSED_ARCHITECTURE_TO_EVALUATE` | read-only audit와 별도 설계 뒤 채택 여부를 판단할 architecture direction | Hybrid Generation Reference, Hot/Warm/Cold, independent archive |
| `HYPOTHESIS` | 사용자 행동이나 사업성을 통해 검증해야 하는 제안 | 유료 package 방향, Watch 수요, cohort, 전환·공유·유지 가설, 기능 묶음 |
| `HISTORICAL_PLANNING_ESTIMATE` | 과거 논의의 내부 계획 값을 당시 분류대로 보존한 정보 | public 후보에서는 exact value를 표시하지 않고 별도 internal planning material에 보존 |
| `NEEDS_VERIFICATION` | 존재·범위·품질 또는 runtime readiness의 accepted 증거가 부족한 항목 | 전국 Search coverage, broad regional/Index/mobile/share/analytics readiness |
| `DEFER` / `UNKNOWN` | 지금 우선하지 않거나 필요한 근거가 아직 없는 미래 항목 | account, payment, advanced intelligence, external API/MCP |

이 roadmap의 중심 `PROPOSED_STRATEGY_DECISION`은 KOAPTIX가 전국 아파트 capital-flow ranking terminal을 기반으로 장기적으로 아파트 시장의 위치와 변화를 계산·비교·감시하는 intelligence layer로 additive 확장한다는 방향이다. 이는 기존 product identity를 보존하는 미래 계획이며 현재 구현 사실이 아니다.

`PROPOSED_STRATEGY_DECISION`, `ROADMAP_CONTRACT_CANDIDATE`, `PROPOSED_ARCHITECTURE_TO_EVALUATE`, `HYPOTHESIS`, `HISTORICAL_PLANNING_ESTIMATE`는 State Registry의 capability status가 아니며 구현 완료로 승격하지 않는다. Dual Clock과 36-month objective도 strategy이고, 현재 accumulation health와 storage suitability는 `NEEDS_VERIFICATION` 또는 `UNKNOWN_PENDING_READ_ONLY_AUDIT`다. 민감한 commercial assumption은 private canonical-location 결정 전까지 public-roadmap 후보 밖에 별도로 유지하고, public 문서에는 경로나 hyperlink를 두지 않는다.

## 4. Evidence-Linked Current Snapshot

Snapshot date는 `2026-09-03`이고, 세부 current-state authority는 이 문서가 아니라 [State Registry](../governance/KOAPTIX_STATE_REGISTRY.yaml), [Confirmed Decisions](../governance/KOAPTIX_CONFIRMED_DECISIONS.md), [Current Confirmed Structure](../02_CURRENT_CONFIRMED_STRUCTURE.md)와 관련 checkpoint에 있다.

- `CURRENT_ACCEPTED_EVIDENCE`: CTO는 canonical Production SHA `0c63630311ed2932d7dca292531365da45b40ba3`의 bounded smoke 결과 `PASS_CANONICAL_SEARCH_P1_CORRECTION_PRODUCTION_SMOKE_RESUME_COMPLETE`를 수락하고 `CANONICAL_HOME_V2_PRODUCTION_RELEASE`를 종료했다.
- 그 smoke의 확인 범위는 Home V2, KOAPTIX 500, 실제 ranking row와 published snapshot, `헬리오시티` ordinary Search와 Detail/deep-link 복귀, `남구 -> 부산광역시 남구` ambiguity flow, `SEOUL_ALL -> KOREA_ALL`, 서울 송파구 Map district bridge, Home에서 TOP1000 이동이다. Fatal 또는 release-blocking P1은 없었다.
- `NEEDS_VERIFICATION`: Nationwide Search completeness는 시험되지 않았다. 부산광역시 남구 clarification 뒤 전국 결과의 비차단 timeout 문구가 관찰됐으므로 전국 coverage와 timeout taxonomy를 별도 범위로 검증해야 한다.
- `NEEDS_VERIFICATION`: Index breadth/freshness, weekly movement 전반, broad regional·SGG coverage, mobile critical usability, sharing/SEO, honest empty/error states, analytics, privacy/policy readiness는 위 smoke만으로 확정되지 않는다.
- `ACCEPTED_PRINCIPLE`: 현재 KOREA_ALL, snapshot chain, registry-governed exposure, quality-first 및 discovery/ranking 분리는 그대로 유지된다.
- `CURRENT_ACCEPTED_EVIDENCE`: Project Memory v2는 `COMPLETE_MONITORED`이고 M900~M906 관련 accepted capabilities는 registry의 sealed state를 상속한다. 이 roadmap은 bootstrap, reassurance run 또는 registry 변경을 요구하지 않는다.

최근 accepted Production smoke에서는 published Snapshot date가 project date보다 오래된 bounded signal이 관찰됐다. 이 사실은 향후 read-only Data Clock health audit를 정당화하지만 cron 중단, ingestion 중단, 전체 pipeline stall 또는 root cause를 입증하지 않는다. Source cadence, ingestion, matching, clean, representative price, market cap, eligibility, Rank, Index, generation, publication/serving과 scheduler layer가 서로 다르게 움직일 가능성을 열어 둔다.

특히 이 signal만으로는 `scheduler inactive`, `scheduler running with downstream failure`, `legitimate source cadence difference`를 구분할 수 없다. 세 가능성과 실제 authoritative scheduling mechanism은 별도 read-only evidence로 판별해야 한다.

- `NEEDS_VERIFICATION`: `TIME_SERIES_ACCUMULATION_HEALTH`; Data Clock이 실제로 연속 실행되는지, 어느 layer까지 최신인지, failure와 gap이 어떻게 기록되는지는 아직 검증되지 않았다.
- `UNKNOWN_PENDING_READ_ONLY_AUDIT`: current storage가 multi-year accumulation을 감당하는지, provider backup 또는 independent archive가 충분한지는 아직 알 수 없다.
- `NOT_PROVEN`: daily observation ledger 존재, 모든 expected day accounting, archive 존재, Signal/RS/Momentum live state, Public Beta analytics와 traction 또는 paid conversion.

이 snapshot은 실행 시점의 bounded evidence 요약이며 runtime 수치나 production 상태를 영구 고정하지 않는다. 미래 변경은 그때의 accepted evidence로 갱신한다.

## 5. Dual-Clock Strategic Operating Model

KOAPTIX는 동시에 움직이는 두 clock을 구분한다.

### Clock A — Data Asset Clock

목적은 실제 시간이 흐를수록 재현하기 어려워지고 가치가 커지는 longitudinal state를 축적하는 것이다.

```text
daily observation
-> source/input lineage
-> canonical state
-> publication identity
-> continuity evidence
-> durable archive
-> multi-year longitudinal asset
```

### Clock B — Product / Market Clock

목적은 사용자, brand와 commercial evidence를 축적하는 것이다.

```text
Public Beta
-> user behavior
-> retention
-> Watch / saved behavior
-> monetization
-> intelligence products
-> brand / revenue / B2B potential
```

두 clock은 dependency가 있지만 동일한 queue가 아니다.

- **Data Clock must not be silently broken.** 관찰되지 않은 날을 이전 값과 같았다고 추정해 숨기지 않는다.
- **Product Clock must not be frozen for infrastructure perfection.** Foundation P0는 optional new feature implementation보다 먼저 올 수 있지만 이미 공개된 product를 자동으로 닫거나 감춰서는 안 된다.
- Data-clock dependency order와 user-facing feature priority를 분리한다. 전자는 time-native state를 지키고, 후자는 실제 usage·retention·trust·support·payment evidence에 반응한다.
- 이 모델은 strategy이며 현재 두 clock이 건강하게 동작한다는 증거가 아니다.

## 6. Foundation P0 — Daily-Accounted Time-Native Asset Continuity

Foundation P0는 Phase A~D 아래에서 KOAPTIX의 time-native data asset을 누락 없이 설명하고 장기간 보존할 수 있게 하는 cross-cutting foundation이다. Product feature가 아니라 product와 data asset 모두가 의존하는 continuity direction이다.

목표 특성:

- every expected KST observation date를 account할 수 있음
- source/input, calculation, generation, publication과 serving identity를 구분할 수 있음
- changed state, verified same state, no new source input, partial, recorded failure와 unresolved gap을 구분할 수 있음
- automated by default이며 정상일 때 founder의 일일 수동 승인을 요구하지 않음
- founder가 매일 직접 확인하지 않아도 failure와 silent gap을 bounded observability로 발견할 수 있음
- simple recovery contract, compact storage와 measurable cost
- irreproducible data value가 정당화하는 만큼만 complexity를 추가함
- existing architecture를 먼저 평가하고 재사용함

현재 `TIME_SERIES_ACCUMULATION_HEALTH`는 `NEEDS_VERIFICATION`이다. 이 foundation은 scheduler activation, schema migration, archive creation, historical backfill 또는 feature implementation을 승인하지 않는다.

## 7. Daily Accounted Observation

KOAPTIX는 `Asia/Seoul` 기준으로 every expected calendar observation date를 account하는 것을 planning contract로 삼는다. Underlying source나 effective Rank/Index state가 전날과 같아도 그 날짜는 사라져서는 안 된다. No change도 관찰 결과다.

다음 vocabulary는 `ROADMAP_CONTRACT_CANDIDATE`이며 현재 구현된 DB enum이나 runtime status라는 주장이 아니다.

| Status candidate | Planning meaning |
| --- | --- |
| `PUBLISHED_NEW_STATE` | 정상 관찰이 완료되고 새로운 canonical output state가 생성·검증·publication 대상이 됨. 새 effective generation이 존재할 수 있음 |
| `VERIFIED_NO_OUTPUT_CHANGE` | 해당 날짜의 관찰이 성공했고 relevant input을 처리한 뒤 canonical output이 이전 effective state와 동등함을 검증함 |
| `NO_NEW_SOURCE_INPUT` | 관찰이 성공했으나 source cadence상 새로운 relevant source state가 없었고 이전 verified generation이 해당 날짜에도 effective함을 확인함 |
| `PARTIAL` | required layer 하나 이상이 incomplete라서 fully verified official state로 표현할 수 없음 |
| `FAILED_RECORDED` | expected observation이 시도됐지만 실패했고 그 failure 자체가 durable하게 account됨. 마지막 verified state는 last-known state로만 표시 가능 |
| `GAP_UNRESOLVED` | contemporaneous evidence가 부족해 관찰 완료 여부를 증명할 수 없음. 이전 값을 original as-published state처럼 채울 수 없음 |

핵심 invariant:

> SAME IS DATA. MISSING IS NOT SAME.

Carry-forward는 그 날짜의 observation evidence가 `VERIFIED_NO_OUTPUT_CHANGE` 또는 `NO_NEW_SOURCE_INPUT`을 증명할 때만 허용된다. Unaccounted 또는 unresolved gap을 지나 이전 generation을 자동 전파하지 않는다.

User-facing Historical Rank는 연속 날짜에 같은 Rank를 표시할 수 있고, 물리 저장은 같은 effective generation을 참조할 수 있다. 그러나 다음 둘은 다르다.

- `DAILY_USER_RESOLVABLE_STATE`: 각 날짜에 어떤 verified state가 유효했는지 설명할 수 있음
- `DAILY_FULL_ROW_PHYSICAL_DUPLICATION`: 매일 모든 row를 물리적으로 복제함

전자는 전략적으로 필요하지만 후자는 의무가 아니다. 이전 generation reference는 해당 날짜의 성공한 daily observation evidence와 함께 있어야 한다. Exact physical schema, field names와 status implementation은 audit·design·migration authority 전까지 미승인·미구현 상태다.

## 8. Data Asset Classification and Minimum Irreproducible Record

### Asset classification

한 asset은 두 개 이상의 class에 동시에 속할 수 있다.

| Class | Meaning and strategic examples |
| --- | --- |
| `BACKFILLABLE` | 합리적으로 다시 취득할 수 있는 public transaction source, REB/K-apt material과 external public records. 재취득 가능성은 data rights·availability와 당시 source vintage 보존 필요를 없애지 않음 |
| `TIME_NATIVE` | 실제 daily accounted observation, actual as-published Rank/Index, publication event, 당시 available source/data vintage, future live ex-ante Signal emission. 시간이 지나면 original event를 새로 만들 수 없음 |
| `DERIVED_RECONSTRUCTABLE` | underlying point-in-time state와 formula/version이 충분할 때 재계산 가능한 Relative Strength, Momentum, weekly delta, breadth와 일부 peer metric |
| `VERSION_SENSITIVE` | market-cap state, eligibility, canonical matching, universe membership, methodology, source cutoff, data-quality rule와 formula/calculation version |

재구성 가능한 모든 derived metric을 저장할 필요는 없다. 반대로 현재 무엇을 알았는지 재현하는 데 필요한 version-sensitive state를 premature normalization으로 제거해서도 안 된다.

### Minimum irreproducible record candidates

아래 이름은 conceptual candidate metadata다. Current schema field의 존재나 exact naming을 주장하지 않는다.

**Daily observation level:** observation date와 expected epoch, observed time, status, effective generation reference, input/source authority identity, source cutoff와 vintage, output digest, previous observation identity, no-input/no-change/partial/failure reason, next expected epoch, archive integrity identity.

**Generation/publication level:** generation and run/execution identity, input authority/manifest identity, generated/verified/published time, snapshot/publication date, previous generation, methodology/ranking algorithm version, market-cap calculation version, eligibility rule version, universe/membership definition version, canonical mapping and release/code revision identity where practical, affected universe set, row counts, input/membership/output digests, publication event and version.

**Per-complex point-in-time level:** `complex_id`, `universe_code`, Rank, market cap, eligibility, coverage/data-quality state와 generation identity.

**Index level:** universe, Index value, publication/snapshot identity, methodology/version, and constituent or membership identity where reproducibility requires it.

이 목록은 새 monolithic table을 요구하지 않는다. Existing `complex_rank_history`, snapshot, generation, publication과 authority-manifest substrate에서 이미 보존되는 범위를 먼저 확인한다.

## 9. Historical Rank and As-Published versus Restated Policy

Historical Rank는 두 개의 서로 다른 개념이다.

1. **Historical Rank recording infrastructure** — Foundation/Data Clock asset. Polished UI보다 먼저 작동해야 하고 사용자가 chart를 보지 않아도 continuity를 축적한다.
2. **Historical Rank user product** — chart, Compare, Watch, Time Machine과 historical exploration.

전략적 순서는 `RECORDING INFRASTRUCTURE PRECEDES HISTORICAL RANK UI`다. 이는 recording infrastructure가 현재 구현됐다는 뜻이 아니다.

- `AS_PUBLISHED_HISTORY`: 당시의 information, methodology, eligibility와 universe definition으로 KOAPTIX가 실제 생산하거나 공식 verified state로 취급한 결과.
- `RESTATED_HISTORY`: later methodology를 old source material에 retrospective하게 적용해 계산한 결과.

Restated result는 original as-published history를 조용히 overwrite하지 않는다. Unresolved historical gap 뒤의 backfilled reconstruction도 original `AS_PUBLISHED` truth로 relabel하지 않는다. Methodology boundary, source vintage와 version change를 discoverable하게 유지한다.

## 10. Signal History Policy

`RETROSPECTIVE_BACKTEST`와 `ACTUAL_LIVE_EX_ANTE_SIGNAL_HISTORY`를 분리한다. Ex-ante history는 당시 available input과 실제 emitted event를 보존하므로 retrospective backtest보다 강한 evidence profile을 가질 수 있지만 forecasting skill, 수익 또는 investment performance를 보장하지 않는다.

Future live Signal production이 시작된다면 다음 candidate evidence를 보존한다.

- evaluation run identity
- input generation/snapshot identity
- signal type and algorithm version
- generated/emitted timestamp
- evaluated universe and row count
- actual emitted state/event
- integrity/provenance evidence

Preferred future pattern은 `evaluation-run manifest + actual emitted Signal events`다. Evidence가 정당화하지 않는 한 모든 possible `SIGNAL_OFF` row를 completeness만을 위해 저장하지 않는다. 이 policy는 Signal UI, Signal generation, backtest 또는 storage implementation을 승인하지 않는다.

## 11. Phase A/B/C/D Product Intelligence Roadmap

Foundation P0는 모든 phase에 걸쳐 time-native continuity를 보호하지만 phase를 대체하지 않는다. Public Product 운영과 Intelligence 개발은 병행할 수 있다. Data-clock dependency order가 고정될 수 있어도 user-facing feature priority는 usage, retention, Watch·Compare·Search demand, support burden, payment behavior와 data readiness에 반응한다.

Phase 순서는 dependency를 설명하지만 자동 실행 queue가 아니다. Public Product 운영과 Intelligence 개발을 병행할 수 있어도 실제 execution lane은 한 번에 하나만 선택한다. 신뢰를 훼손하는 최소 문제를 닫은 핵심을 먼저 활성화하고, 모든 미래 기능이 끝날 때까지 공개를 지연시키지 않는다.

현재 URL에 접근할 수 있다는 사실과 신뢰성·측정 체계를 갖춘 Public Beta activation은 서로 다른 상태다.

### Phase A — Trust-qualified Measured Public Beta

- **목적:** 검증된 Rank/Search/Home/Detail 핵심을 사용자에게 제공하고 실제 수요와 실패 지점을 측정한다.
- **범위 후보:** Home V2, KOAPTIX 500, TOP1000, 전국/지역 Rank, Search, Detail/deep link, Index, Map, universe selector, weekly movement, 기본 공유. 각 기능은 `READY`, `READY_AFTER_SMALL_FIX`, `NEEDS_VERIFICATION`, `DEFER`로 별도 판정한다.
- **Dependency:** accepted deployment/revision/domain/rollback evidence, 핵심 surface의 bounded runtime evidence, honest stale/empty/error/unavailable UX, 치명적 mobile blocker 부재, 방법론·기준일·coverage·문의/오류신고·필요 정책 경계, 최소 analytics/error tracking/feedback 설계.
- **데이터 요구:** published-rank exact-name denominator, canonical discovery denominator, alias/natural-query fixtures, miss taxonomy, snapshot/freshness/provenance와 universe identity.
- **API 필요 여부:** OpenAI API, 로그인, 결제와 고급 Signals는 선행조건이 아니다. 기존 deterministic product API의 안정성만 별도 evidence로 확인한다.
- **운영 부담:** freshness·latency·error·coverage 관찰, feedback triage, release/rollback evidence 유지. 초기에는 낮음~중간으로 제한한다.
- **수익화 시점:** 직접 수익화보다 무료·무로그인 핵심 유입과 학습이 우선이다. Public Beta를 영구 무료 약속으로 해석하지 않는다.
- **Success metric:** agreed denominator에서 published-rank exact-name recall 측정, Search/Rank→Detail 유효 행동, zero-result/reason taxonomy, critical error와 feedback 처리. `100% exact-name recall`은 검증 목표이지 현재 사실이 아니다.
- **Exit criteria:** CTO가 합의한 hard trust gate가 accepted evidence로 충족되고, controlled cohort의 충분한 multi-week observation을 통해 반복 사용 신호와 Phase B 가설을 시험할 최소 측정이 가능하다. 내부 cohort·기간·가입·공유 가설은 beta activation hard gate가 아니다.

이 문서만으로 법률 준수 또는 공개 승인이 완료됐다고 선언하지 않는다.

### Phase B — Monetization MVP

- **목적:** 반복 방문 이유와 실제 지불 의사를 최소 상품으로 검증한다.
- **범위 후보:** Account, Watchlist, Weekly Digest, 기본 Historical Rank, deterministic Compare, Basic Signals, 저장된 비교/검색 조건. 로그인은 저장·알림 가치가 생기는 시점에 유도하고 핵심 Rank/Search/기본 Detail 앞에는 두지 않는다. Basic Signals는 Top-N 진입, 12주 고점, 연속 변화 같은 소수 후보부터 검증한다.
- **Dependency:** Phase A의 trusted core, auth/privacy/consent 설계, history availability와 품질 범위, email/site-inbox 운영, payment·환불·지원 경계의 별도 승인.
- **데이터 요구:** 관심단지 identity, versioned observation, 실제 보존 기간, compare 동일 snapshot, 소수 signal 정의와 provenance.
- **API 필요 여부:** 첫 유료 가치는 OpenAI API 없이도 성립해야 한다. Compare와 brief는 deterministic 계산·template을 우선한다.
- **운영 부담:** 계정·문의·환불·digest deliverability·notification preference·cost 관찰로 중간 수준이다. 실시간 SMS/카카오/native push는 뒤로 미룬다.
- **수익화 시점:** plan complexity를 늘리기 전에 하나의 단순한 initial paid subscription tier를 먼저 검증한다.
- **Success metric:** 관심 저장, digest→Detail 재방문, history/compare 반복 사용, 유료 의사와 실제 결제, 유지·환불, support burden과 변동원가.
- **Exit criteria:** 유료 가치가 deterministic core에서 반복 사용과 지불로 확인되고, privacy·support·unit-cost가 감당 가능한 범위라는 evidence가 있다.

### Phase C — V1 Intelligence

- **목적:** 전국 universe 기반의 고유 계산·탐색·감시 가치를 확장한다.
- **범위 후보:** Advanced Screener, Relative Strength, Momentum, peer groups, Signals, 장기 History, advanced Compare, personalized Watch. 그 뒤 제한적으로 Natural-language Screener와 KOAPTIX Interpretation을 검토한다.
- **Dependency:** 동일 snapshot 기준, source provenance, eligibility/freshness 의미, peer definition, history comparability, deterministic filter contract와 Phase B retention evidence.
- **데이터 요구:** long-lived versioned history, peer/universe membership at publication time, comparable methodology version, signal input lineage와 missing-interval semantics.
- **API 필요 여부:** canonical 계산에는 모델이 필요하지 않다. 자연어 기능은 `allowlisted structured filter -> server validation -> deterministic query -> bounded result packet explanation` 순서만 후보로 한다. 모델은 임의 SQL을 생성·실행하거나 canonical 수치를 결정하지 않는다.
- **운영 부담:** signal correctness, model/quota/fallback, history versioning과 사용자 설명 때문에 중간~높음이다. 모델명과 공급자 가격을 제품 계약에 고정하지 않는다.
- **수익화 시점:** advanced intelligence의 가치와 실제 수요가 검증된 뒤에만 later advanced paid tier를 별도로 검토한다.
- **Success metric:** filter equivalence, numeric fidelity, failure 시 deterministic fallback, signal 의미 오류율, 비용·사용량 계측, 실제 retention 개선.
- **Exit criteria:** deterministic intelligence의 의미·재현성·retention이 검증되고 제한적 AI 보조의 정확도와 unit economics가 별도 accepted threshold를 통과한다.

### Phase D — V2 Platform

- **목적:** 축적된 KOAPTIX history와 identity를 simulation, report 및 조건부 유통 가능한 platform asset으로 확장한다.
- **범위 후보:** Market Time Machine, Scenario Simulator, Custom Universe, Portfolio/관찰 그룹, 고유 데이터 기반 one-off Report, KOAPTIX API/MCP, B2B/Professional 유통.
- **Dependency:** Phase C data semantics, history retention/versioning, data-rights 및 redistribution 검토, authentication, metering, rate limit, abuse/bulk-extraction 방지와 지원 모델.
- **데이터 요구:** as-published/restated history 구분, publication date, source vintage, methodology version, identity continuity, eligibility와 missing interval. `52주 snapshot`은 목표 가설이지 현재 존재 사실이 아니다.
- **API 필요 여부:** 외부 API/MCP는 이 phase의 별도 후보이며 제품 내부 canonical 계산의 선행조건이 아니다. AI가 필요한 report도 KOAPTIX history/position/signal packet을 중심으로 제한한다.
- **운영 부담:** access control, metering, SLA, data rights, professional support와 abuse control로 높음~매우 높음이다.
- **수익화 시점:** one-off proprietary-data report, API usage, B2B/Professional 계약은 실제 수요와 비용·재배포 조건 확인 후 각각 검증한다.
- **Success metric:** 유료 반복 수요, 정확한 metering, 안정성, gross contribution, 지원 부담, policy 준수, unauthorized bulk extraction 억제.
- **Exit criteria:** 독립적인 platform economics와 governance가 성립하고, public core의 신뢰·성능을 훼손하지 않는다는 evidence가 있다.

Scenario는 가격 가정 변화에 따른 universe 내부 위치를 계산하는 도구 후보이며 가격 전망이 아니다.

### Cross-Phase Major Feature Assessment

아래 가치·대체 위험·난이도 평가는 정성적 기획 판단이다. `READY`는 명시된 evidence 범위에만 적용하며 전체 population 또는 모든 device를 뜻하지 않는다. API 비용 분류는 정성적 설계 분류이며 검증된 unit cost나 package allowance가 아니다.

| 기능 | 사용자 가치 | 범용 AI 대체 위험 | KOAPTIX 고유 자산 | 현재 데이터/실행 준비도 | 개발·운영 난이도 | API 비용 분류 | Retention / Growth / 수익화 | Phase / 선행조건 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home V2 + KOAPTIX 500 | 시장 상황과 flagship 순위를 빠르게 이해 | 낮음 | canonical rank, snapshot, universe identity | `READY` — closed smoke의 bounded flow | 낮음~중간 | `NONE` | 유입·재방문 기반 | A / accepted release 보존 |
| Ranking + TOP1000 | 전국·지역 full-board 탐색 | 낮음 | quality-gated market-cap reranking | `READY` — tested TOP1000 path; broad fixtures는 별도 | 중간 | `NONE` | SEO·탐색·Detail 전환 | A / freshness·identity 관찰 |
| Search + ambiguity | 알려진 단지 발견과 명시적 지역 선택 | 중간 | canonical identity와 ranked/discovery 분리 | exercised path `READY`; nationwide·alias coverage `NEEDS_VERIFICATION` | 중간~높음 | `NONE` 우선 | 유입·zero-result 개선 | A / 세 denominator·miss taxonomy |
| Detail + deep link | 단지 위치·규모·근거 확인 | 중간 | KOAPTIX 계산·source provenance | tested path `READY`; broad data completeness `NEEDS_VERIFICATION` | 중간 | `NONE` | Search/Rank→Detail 핵심 행동 | A / honest missing state |
| Regional/SGG Rank + universe selector | 지역 내부의 상대 위치 탐색 | 낮음 | additive universe reranking | SEOUL/KOREA transition `READY`; broad coverage `NEEDS_VERIFICATION` | 높음 | `NONE` | long-tail acquisition | A / registry·snapshot readiness |
| Map district bridge | 공간 기반 발견과 board 전환 | 중간 | universe-bound map/rank identity | 송파구 표본 `READY`; mobile·broad region `NEEDS_VERIFICATION` | 중간~높음 | `NONE` | exploration·local SEO | A / identity·cache·mobile QA |
| KOAPTIX Index + weekly movement | 시장 집계 변화와 방향 이해 | 낮음 | aggregate method와 time series | `NEEDS_VERIFICATION`; 기존 의미는 보존 | 높음 | `NONE` | 주기적 재방문 | A / methodology·freshness·null/NEW contract |
| Share + canonical URL + SEO | 결과 공유와 organic acquisition | 높음 | 공유되는 proprietary rank context | `NEEDS_VERIFICATION` | 낮음~중간 | `NONE` | Growth 중심 | A / thin·empty page 정책과 attribution |
| Account + Watchlist + Weekly Digest | 관심단지 변화의 지속 관찰 | 중간 | identity-linked change history | `DEFER` / `UNKNOWN` | 중간~높음 | `NONE` 가능 | retention·initial paid tier 가설 | B / auth·privacy·notification |
| Basic History + Compare + Basic Signals | 과거 위치와 변화 비교 | 낮음 | versioned rank·snapshot 계산 | `DEFER` / history 범위 `UNKNOWN` | 높음 | `NONE` 가능 | retention·initial paid tier | B / comparability·signal contract |
| Advanced Screener/RS/Momentum/peer Signals | 고유 조건 탐색·감시 | 낮음 | full-universe deterministic data | `DEFER` / `UNKNOWN` | 높음 | core는 `NONE` | later advanced tier·retention | C / peer·history·filter semantics |
| Natural-language Screener + Interpretation | 복잡한 조건 접근성 개선 | 높음 | validated filter와 bounded KOAPTIX packet | `DEFER` / `UNKNOWN` | 높음 | `METERED` | 유료 편의·activation | C / allowlist·validation·fallback |
| Time Machine/Scenario/Custom Universe | 과거·가정 변화 속 상대 위치 분석 | 낮음~중간 | as-published history와 KOAPTIX engine | `DEFER` / `UNKNOWN` | 매우 높음 | `VARIABLE` | premium differentiation | D / versioning·non-forecast boundary |
| One-off Report + API/MCP + B2B | 고유 데이터의 재사용·전문 유통 | 중간 | governed history/position/signal | `DEFER` / `UNKNOWN` | 매우 높음 | `VARIABLE` | report/API/B2B 수익화 | D / rights·auth·metering·rate limit |

History, Watch, Signals, Screener, Relative Strength와 Momentum은 semantic하게 가능한 범위에서 같은 governed longitudinal substrate를 사용한다. 기능별로 별도 history engine을 만들지 않는다. OpenAI API는 Public Beta나 canonical calculation의 prerequisite가 아니며, first paid value도 generative AI 없이 성립해야 한다.

## 12. Public Product + Private Intelligence Asset and Exposure Policy

KOAPTIX는 `PUBLIC PRODUCT + PRIVATE INTELLIGENCE ASSET` 전략을 채택한다. Idea secrecy만을 primary moat로 삼지 않는다. Apartment market-cap ranking, Historical Rank, Screener, RS/Momentum, Signals와 Watch의 concept은 copyable하다고 가정한다.

Compound moat의 후보 구성은 다음과 같다.

```text
TIME
x DATA QUALITY
x VERSION PROVENANCE
x USER BEHAVIOR
x BRAND
x REVENUE / PMF
x OPERATIONAL RELIABILITY
```

전략적 요약:

> SHOW THE RESULT.  
> PROTECT THE FACTORY.  
> ACCOUNT FOR EVERY DAY.  
> ACCUMULATE THE HISTORY.

Public product는 utility, discoverability, category formation, user acquisition, recurring behavior, PMF learning과 future monetization을 추구한다. Private intelligence boundary는 complete longitudinal corpus, internal quality/anomaly logic, exact Signal threshold/calibration, detailed feature engineering·scoring logic와 entire proprietary corpus의 convenient bulk replication을 보호한다.

### Public website is not an unrestricted public dataset

한 사용자가 한 단지의 Rank나 history를 보는 것과 machine이 모든 complex·date·universe·lineage를 편리하게 내려받는 것은 다르다. Public visibility는 bulk redistribution right를 의미하지 않는다.

Future exposure policy는 다음 class를 검토할 수 있다. 이는 current entitlement, subscription, API 또는 access-control implementation이 아니다.

| Exposure class | Public-safe planning direction |
| --- | --- |
| `PUBLIC` | current Rank, KOAPTIX 500/TOP1000, Search, basic Detail, Index, snapshot/freshness, selected movement/history, methodology overview |
| `MEMBER` / `FREE_MEMBER` | 저장·개인화 value가 검증될 때의 future access candidate |
| `PAID_STANDARD` | longer History, Watch, Compare, Weekly Brief와 selected intelligence의 future candidate |
| `PAID_ADVANCED` | Signals, Screener, RS/Momentum와 advanced intelligence의 future candidate |
| `PRIVATE_INTERNAL` | complete full-universe history, detailed provenance/quality/anomaly logic, exact calibration/scoring와 evaluation corpus |
| `B2B_API_ELIGIBLE` | authentication, entitlement, metering, rate limit, data-rights와 redistribution terms를 통과한 selected governed intelligence only |
| `NEVER_BULK_PUBLIC` | full universe × full history와 sensitive factory internals의 unrestricted convenient export |

Exact price, quota, commercial threshold와 internal control tactic은 public Roadmap에 두지 않는다. Anti-scraping, authentication, entitlement 또는 API control은 이 문서로 구현되지 않는다.

### Public explainability and factory protection

Proprietary protection을 “methodology is secret”로 바꾸지 않는다. Public methodology는 estimated market-cap concept, representative-price × household의 high-level principle, source category, snapshot/base date, broad inclusion/exclusion, missing/not-ready handling과 Rank/Index 차이를 설명할 수 있어야 한다.

Exact anomaly threshold, detailed matching exception, internal quality score, Signal threshold/calibration, feature engineering, manipulation defense와 full row-level internal provenance export는 internal-by-default일 수 있다. 목표는 `PUBLIC EXPLAINABILITY + PRIVATE ATTACKABLE FACTORY DETAIL`이다.

## 13. Controlled Public Growth and Public Beta Strategy

`FULL STEALTH FOR YEARS`와 `FULL DISCLOSURE OF ALL INTELLIGENCE`를 모두 거부한다. 이미 공개된 public product는 Foundation P0 때문에 닫히거나 숨겨지지 않는다.

- Initially controlled growth로 user learning, Search/Rank/Detail trust, SEO foundation, share behavior, feedback, continuity와 basic brand formation을 축적한다.
- Verified history와 product evidence가 쌓일수록 public differentiation을 강화한다.
- Marketing intensity는 evidence-driven이며 즉시 aggressive mass marketing을 요구하지 않는다.
- Public Beta는 장기간의 history나 모든 future History, Signal, Screener, AI capability를 기다리지 않는다.
- 고정된 stealth 기간, exact cohort, exact experiment duration 또는 acquisition schedule을 public hard rule로 두지 않는다.

### Public Beta Gate, Improvements, and Experiments

이 구분은 향후 trust-qualified beta 결정을 위한 proposal이며 이미 종료된 Home V2 release를 소급해 reopen하지 않는다.

| 구분 | 후보 항목 | 해석 |
| --- | --- | --- |
| `HARD_TRUST_GATE_CANDIDATE` | exact deployment/revision/domain과 rollback baseline evidence | 구체적 대상과 복구 경계를 확인하되 새 deploy를 자동 승인하지 않음 |
| `HARD_TRUST_GATE_CANDIDATE` | 합의된 최소 fixture에서 핵심 board, Search, Detail, universe transition, Index/freshness와 critical mobile usability | 기능별 accepted evidence 필요; 좁은 smoke를 전체 coverage로 확대하지 않음 |
| `HARD_TRUST_GATE_CANDIDATE` | stale/empty/error/unavailable의 정직한 UX, 방법론·기준일·coverage·문의/오류신고·필요 정책 | 사용자 신뢰에 직접 영향을 주는 의미·안전 경계 |
| `HARD_TRUST_GATE_CANDIDATE` | 최소 analytics, error tracking, structured feedback의 privacy-safe 설계 | 수집 범위·보존·접근을 먼저 합의 |
| `VERIFICATION_TARGET` | published-rank exact-name recall 100% | denominator와 fixture가 합의돼야 하며 현재 완료 사실이 아님 |
| `POST_RELEASE_IMPROVEMENT` | canonical discovery와 alias/natural-query coverage, broad regional/SGG, Index breadth, mobile P2, sharing/SEO, latency | 관찰 evidence로 순서를 바꾸며 첫 공개를 무기한 막지 않음 |
| `LEARNING_EXPERIMENT` | controlled cohort, 충분한 multi-week observation, Watch 관심 표현 | 검증 가설이며 product capability나 hard gate가 아님 |
| `LEARNING_EXPERIMENT` | Watch demand, payment intent, paid pilot, share-driven acquisition | 측정할 internal hypothesis이며 benchmark·보장·release blocker가 아님 |

Search 측정은 반드시 (A) published-rank exact-name recall, (B) canonical discovery coverage, (C) alias/natural-query recall로 나누고 각 분모·분자·miss reason을 기록한다. `RANKED / OBSERVING / NOT_FOUND`와 reason code는 UI/계약 후보이며 기존 taxonomy를 자동 대체하거나 production 구현 사실로 쓰지 않는다.

Watch 기능이 실제 제공되지 않는 동안 관심 표현 실험을 한다면 `준비 중`임을 정직하게 표시한다. Exact experiment threshold는 internal planning/status material에서만 관리하고 public product fact로 취급하지 않는다.

## 14. Storage, Retention, and Durability — Planning Direction Only

이 절은 구현 승인이나 현행 구조의 sufficiency 판정이 아니다. 선호하는 평가 방향은 `HYBRID_GENERATION_REFERENCE_MODEL`이다.

```text
DAILY OBSERVATION LEDGER
  -> IMMUTABLE GENERATION STORE
  +  IMMUTABLE PUBLICATION EVENT HISTORY
```

- Daily Observation Ledger 후보는 observation date, 여섯 status, source/input identity, effective generation reference, versions, timestamps, gap/failure/no-change reason, integrity/archive identity를 기록한다.
- Immutable Generation Store 후보는 material/new canonical state가 있을 때의 full point-in-time rows, universe state, Rank, market cap, eligibility, 적절한 Index-related canonical state, row counts, digests와 generation provenance를 보존한다.
- Immutable Publication Event History 후보는 실제로 무엇이 언제 어떤 순서·version으로 공개됐는지와 generated/verified/published timestamps를 보존한다.

이는 새 monolithic table이나 schema migration이 필요하다는 결론이 아니다. 먼저 실제로 존재하는 범위에서 `complex_rank_history`, `koaptix_rank_snapshot`, `koaptix_index_snapshot`, `apt_market_cap_snapshot`, `complex_eligibility_snapshot`, rank input authority manifest 및 immutable generation/publication object를 보존하고 평가한다. **Current architecture should be reused before adding new schema.** 누락 metadata나 daily-accounting gap이 확인될 때만 read-only audit evidence를 근거로 최소 additive design을 별도 검토한다.

### Static, daily, canonical generation, and raw data

다음 저장 성격을 구분한다.

- `STATIC / SLOW-CHANGING MASTER DATA`
- `DAILY ACCOUNTED OBSERVATION DATA`
- `CANONICAL GENERATION / POINT-IN-TIME INTELLIGENCE`
- `RAW SOURCE ARCHIVE`

편의를 위해 매일 whole complex object를 복제하지 않는다. 적절한 경우 `complex_id`, `universe_code`, version identity, generation identity와 source snapshot identity를 사용하고, canonical/versioned dimension으로 안전하게 연결할 수 있는 complex name, full address, large repeated string, duplicated static household metadata와 duplicate JSON의 불필요한 역사 반복을 피한다. 다만 당시 실제로 알려진 상태를 재구성하는 데 필요한 정보까지 성급하게 정규화해 없애지 않는다.

### Hot / Warm / Cold lifecycle principle

- `HOT`: interactive product가 쓰는 최근 structured history. Production PostgreSQL/Supabase가 가능한 현재·미래 배치 예시지만 확정 기술 선택이 아니다.
- `WARM`: Historical Rank, Time Machine, analytics 또는 research가 계속 쓰는 오래된 structured history. Partitioned PostgreSQL이나 다른 analytical layout은 미래 선택지일 뿐이다.
- `COLD`: 장기 immutable archive. Parquet, compressed analytical files 또는 object storage는 미래 형식 후보일 뿐이다.

이 lifecycle은 원칙만 채택한다. 이 문서에서 final technology를 선택하거나 정상 작동 데이터를 migration하지 않는다.

### Production database, backup, and historical archive

장기 원칙은 다음 세 계층이다.

```text
PRODUCTION DATABASE
+ PROVIDER BACKUP / PITR
+ INDEPENDENT IMMUTABLE HISTORICAL ARCHIVE
```

`BACKUP / PITR`은 장애 후 operational database state를 복구할 수 있는지를 답한다. `HISTORICAL ASSET ARCHIVE`는 KOAPTIX가 과거 시점에 실제로 관찰·계산·공개한 내용을 훗날 증명하고 재구성할 수 있는지를 답한다. 둘은 동일하지 않다. 미래 archive는 Daily Observation Ledger, input authority manifest, immutable generation, publication event, Rank/Index state, relevant version identities, schema/methodology version, row counts, hashes와 archive manifest를 포함할 수 있다.

현재 backup sufficiency, archive sufficiency 또는 archive 존재는 검증되지 않았다. 이 후보에서 archive를 만들지 않는다. 향후 audit이 다음 중 하나를 입증하면 independent archive implementation을 high priority로 검토한다.

- production database가 사실상 유일한 meaningful copy임
- managed backup retention이 장기 asset 목적에 부족함
- point-in-time history가 overwrite될 수 있음
- generation/history linkage가 부족함
- restore ability가 검증된 적 없음
- provider failure가 irreproducible time-native history를 파괴할 수 있음

Managed durability가 강하다고 확인돼도 archive design은 장기 전략 요구로 남을 수 있다. 별도 승인된 bounded parallel Foundation work로 archive implementation을 진행할 수 있지만, 그 구현이 Public Beta를 자동으로 막지는 않는다.

### Measurement before projection

`36_MONTH_STORAGE_SUITABILITY`의 현재 분류는 `UNKNOWN_PENDING_READ_ONLY_AUDIT`이다. Storage fear로 accumulation을 미루지 않으며, 측정 없이 storage가 싸거나 충분하다고도 단정하지 않는다.

별도 승인된 future audit은 안전하게 관찰 가능한 범위에서 current PostgreSQL database size와 provisioned capacity, largest tables/indexes, 관련 TOAST, raw source, trade/raw, Rank history/snapshot, Index snapshot, generation/publication, staging/obsolete footprint, 값싼 bloat indicators, recent row/byte growth와 monthly growth를 측정하고 12/24/36/60-month projection을 제시해야 한다. 성장 원인이 compact intelligence history, raw payload, duplicate JSON/static values, indexes, bloat/WAL/vacuum, generation duplication 또는 다른 관찰 원인 중 무엇인지 구분한다. 한 anomalous day를 단순 배수해 multi-year canonical forecast로 만들거나 현재 storage cost 결론을 내리지 않는다.

## 15. KOAPTIX 36-Month Data Moat Clock — Internal Strategic Objective

`KOAPTIX 36-MONTH DATA MOAT CLOCK`은 longitudinal asset continuity를 관리하기 위한 내부 전략 목표다. 현재 날짜나 이 문서 작성일을 clock start로 선언하지 않는다. Accepted start date는 다음을 evidence가 입증하는 가장 이른 날짜를 별도 audit에서 정한다.

1. expected observation contract가 충족됐거나 이를 입증할 수 있음
2. point-in-time state를 귀속할 수 있음
3. lineage가 충분함
4. gap/failure/no-change를 구분할 수 있음
5. durability/backup assurance가 신뢰할 만함

달력 경과만으로 clock을 측정하지 않는다. `DATA_MOAT_AGE`와 `QUALIFIED_CONTINUITY`를 분리한다. 전략 metric 후보에는 elapsed days, expected observations, 여섯 status별 count, accounted rate, verified-state coverage, maximum unresolved gap length, freshness lag, failure detection time, recovery time, lineage completeness, archive coverage와 restore verification이 포함된다. 현재 값은 주장하지 않는다.

Gap은 elapsed age를 자동 reset하지 않지만 continuity quality를 낮추며 계속 보여야 한다. 36개월은 compounding milestone이지 automatic moat threshold, valuation event, M&A trigger 또는 exit date가 아니다. Time alone은 moat가 아니며, 지속적인 data quality, provenance, usable product, user behavior, operational reliability와 lawful data rights가 함께 쌓여야 한다.

## 16. Analytics, Privacy, Feedback, Growth, Extraction, and Cost Discipline

### Commercial Model and Cost Discipline — Public Strategy

이 절은 공개 가능한 상업 방향만 설명한다. 모든 가격, quota, supplier cost, unit economics, conversion threshold 및 package detail은 검증 전 가설이며 public 약속이 아니다.

- 핵심 acquisition은 전략적으로 타당한 범위에서 free/no-login 방향을 유지한다. 이는 영구 무료 보장이 아니다.
- plan complexity를 늘리기 전에 단순한 initial paid subscription experiment로 반복 가치와 지불 의사를 검증한다.
- advanced intelligence의 가치와 수요가 입증된 뒤에만 later advanced paid tier를 검토한다.
- KOAPTIX의 proprietary history, position, compare와 signal을 중심으로 one-off report를 검토할 수 있다.
- allowance는 limited free, larger paid, bounded expensive-analysis 원칙으로 설계하되 정확한 quota는 별도 검증한다.
- unit economics와 direct variable cost를 계측하고 통제한다. 가격과 quota는 permanent truth가 아니라 재검증 대상이다.
- 비용은 model/API뿐 아니라 payment, refund, support, email, storage, analytics, error tracking, infrastructure 및 free traffic을 정성적으로 구분해 관찰한다.
- `deterministic-first`, `cheap-model-first`, bounded expensive calls, cache, asynchronous batch, 필요할 때만 external search, `collect once, normalize, reuse`를 설계 원칙으로 삼는다.
- supplier 가격, 환율, 세금, payment fee, 실제 usage와 support burden에 대한 fresh evidence 전에는 margin이나 current cost를 확정하지 않는다.

### Analytics, Privacy, Feedback, Growth, and Change Rules

- **North Star 후보:** `Weekly Active Observer`. 단순 page view 대신 Search/Rank→Detail, Watch 변화 확인, Brief→Detail 같은 의미 있는 행동을 본다.
- **Event 후보:** `page_viewed`, `search_submitted`, `search_results_viewed`, `search_zero_result`, `search_result_opened`, `ranking_row_opened`, `universe_changed`, `detail_opened`, `share_clicked`, `watch_intent_clicked`, `feedback_submitted`, `signup_started`, `signup_completed`, `paywall_viewed`, `checkout_started`, `checkout_paid`, `api_cost_recorded`.
- **Property 후보:** 가능한 범위에서 `complex_id`, `universe`, `result_count`, `latency`, `device/referrer`, `release_sha`, `snapshot_date`, `methodology_version`. 최소 필요성, access와 retention을 먼저 정한다.
- **Privacy:** raw 검색문을 무제한 저장하지 않는다. 최소 수집, query 분류, 보존기간, 삭제·접근 범위를 먼저 설계한다. Hash만으로 자동 익명화됐다고 단정하지 않는다. 계정·결제·Watch는 별도 privacy/security review를 요구한다.
- **Feedback:** structured reason과 affected surface를 수집하고, raw secret·credential·불필요한 개인 데이터를 남기지 않는다. Product error, data issue, request를 분리한다.
- **우선순위 변경 가설:** 검색 사용과 실패가 집중되면 coverage/alias/Search, Detail 반복과 과거 비교 수요가 높으면 History/Compare, Watch 관심은 높고 재방문이 낮으면 Weekly Digest, 실제 shared-link 유입이 확인되면 share/SEO를 우선 검토한다. 유료 우선순위는 사용·유지·지원 부담과 실제 결제 evidence로 바꾼다.
- **Roadmap 변경:** accepted evidence와 CTO/user decision으로만 phase·priority를 갱신한다. 단일 anecdote, page view, 미검증 percentage 또는 모델 유행으로 자동 재정렬하지 않으며 기존 결정의 supersession을 기록한다.

Public visibility는 unrestricted extraction 또는 redistribution right를 뜻하지 않는다. Product surface, member entitlement, paid intelligence, selected governed API와 never-bulk-public factory detail은 §12의 exposure policy에 따라 분리하며, 실제 access control·licensing·data-rights 구현은 별도 승인과 검증을 요구한다.

## 17. NOW, LATER, and DO_NOT_PRIORITIZE

### INHERITED / DONE / SKIP

- Production identity, 필요한 correction 배포와 bounded Home V2/Search smoke는 accepted closure로 상속한다. Contradictory accepted evidence나 새 revision이 없다면 reassurance 목적으로 반복하거나 release를 다시 열지 않는다.
- KOREA_ALL, snapshot chain, sealed M900~M906와 Project Memory v2는 기존 authority를 상속한다.

### NOW — candidate priorities, not execution approvals

1. Foundation P0의 실제 상태를 확인하는 별도 bounded read-only health + storage audit 후보를 CTO가 검토하도록 준비. 이 문서에서는 실행하지 않는다.
2. Nationwide Search/discovery coverage를 세 denominator와 miss taxonomy로 측정할 bounded audit 설계.
3. Public Beta trust/measurement surface의 실제 gap inventory: freshness, honest error/empty state, mobile critical usability, methodology·coverage·feedback·privacy, minimal analytics/error tracking.
4. UI보다 먼저 versioned history retention, source vintage, methodology version, as-published/restated 경계를 설계해 미래 Time Machine과 Signals의 원재료를 보존.
5. 현재 public core를 운영하면서 위 후보 중 CTO가 선택한 한 lane만 실행.

### LATER

- Phase B: Account, Watchlist, Weekly Digest, basic History/Compare/Signals와 단일 initial paid subscription experiment.
- Phase C: advanced deterministic intelligence, 그 뒤 bounded natural-language assistance와 later advanced paid tier experiment.
- Phase D: Time Machine, Scenario, Custom Universe, Report, API/MCP, B2B/Professional 유통.

### DO_NOT_PRIORITIZE

- 일반 부동산 chatbot, 무제한 Web Deep Research, 가격 예측 또는 매수 추천.
- 모든 단지 자동 장문 설명, 실시간 다채널 알림, native app.
- 무차별 bulk export, 대형 B2B dashboard, cosmetic P2 재개방.
- KOREA_ALL 지역 할당식 재설계, eligibility 완화, unverified 자동 노출, source-of-truth 우회.

Versioned history, canonical identity/discovery state, full-universe 계산, Signals, Watch, Time Machine/Scenario, 공유 가능한 Rank와 조건부 API 유통을 축적하는 것은 방어 가능한 우위를 만들려는 전략이다. 영구 독점이나 범용 AI에 대한 대체 불가능성을 입증한 사실이 아니다.

### Anti-overengineering and one-person operability

- Existing architecture와 existing scheduler/observability/backup evidence를 먼저 조사한다.
- Foundation work는 작은 deterministic component, compact metadata, bounded alert, documented recovery와 저비용 검증을 선호한다.
- UI와 feature마다 별도 history engine, 성급한 monolithic schema, 복수 infrastructure migration, 미측정 archive build 또는 사람의 매일 수동 확인을 기본값으로 두지 않는다.
- Daily accounting을 이유로 static master metadata 전체나 large duplicate JSON을 매일 복제하지 않는다.
- 실제 measured storage pressure 전에 analytical migration을 강제하지 않고, actual extraction risk 전에 과도한 anti-scraping system을 만들지 않는다.
- API가 존재한다는 이유만으로 AI를 추가하거나 deterministic canonical calculation을 모델에 맡기지 않는다.
- Private M&A timing heuristic을 public product priority, valuation fact 또는 current buyer evidence로 바꾸지 않는다.
- 한 명이 운영 가능한 automation, failure visibility, restart/recovery boundary와 cost ceiling을 설계 목표로 삼되 현재 달성 사실로 쓰지 않는다.
- Dependency order는 product priority와 다르다. Data continuity substrate를 먼저 지켜도 모든 future feature를 지금 구현한다는 뜻이 아니다.

### Progress Definitions and Internal Estimate Boundary

두 progress category는 섞지 않는다.

- **Core Product Readiness:** 합의된 trust gate 중 accepted evidence를 가진 항목의 가중 충족도. 분모에는 exact release target, core user flow, data/freshness meaning, failure UX, mobile critical usability, methodology/policy와 measurement readiness가 명시돼야 한다.
- **Expanded Commercial Roadmap Progress:** Phase B~D capability를 각각 `evidence-backed complete / partial / needs verification / not started`로 평가한 가중 충족도. 단순 문서 작성이나 후보 존재를 완료로 세지 않는다.

숫자 estimate는 internal planning/status material에서만 유지하며 현재 verified completion, registry status 또는 public product fact로 사용하지 않는다. 이 문서는 progress percentage를 제시하거나 재산정하지 않는다.

## 18. Non-Authorized Next Lanes and Health Decision Tree

아래는 선택지이지 고정 run queue나 실행 승인이 아니다. CTO가 하나를 선택하고, 각 작업은 별도 exact authority를 받아야 한다.

| 후보 lane | 선행조건·필요 승인 | 성공 기준 | Skip / Re-entry 조건 |
| --- | --- | --- | --- |
| Final Dual-Clock/Data-Moat candidate review | 이 final candidate package와 inherited public/private split 검토 | 수락/수정/보류, final public/private content 및 exact five-file set 결정 | 미수락 시 hold; 수정 요청 시 candidate-only correction으로 re-entry |
| Superseding exact tracked source-write package preparation | final candidate 수락 후 별도 package-preparation 승인 | exact target·bytes·hashes·금지사항을 고정한 새 승인 후보 제시; tracked write는 여전히 미실행 | 수락·별도 승인 전 skip; HEAD/target drift 시 새 diff 검토 |
| Data time-series asset accumulation health read-only audit | `P-KOAPTIX-DATA-TIME-SERIES-ASSET-ACCUMULATION-HEALTH-READONLY-AUDIT.0`에 대한 별도 exact 승인 | “IS THE DATA CLOCK RUNNING?”과 “CAN STORAGE/DURABILITY SUSTAIN IT?”에 observed evidence로 답함 | 이 Roadmap lane에서는 실행 금지; 기존 accepted equivalent evidence가 있으면 inherit/skip |
| Nationwide Search/discovery coverage inventory | published-rank/canonical/alias denominator와 read-only 범위의 별도 승인 | 분모·분자·miss taxonomy·coverage gap을 구현 변경 없이 제시 | denominator가 없으면 설계 lane으로 축소; 기존 accepted audit가 있으면 inherit/skip |
| Public Beta trust/measurement gap inventory | 현재 revision과 조사 surface의 exact local/read-only 승인 | hard gate, post-release improvement, experiment를 evidence로 분리 | release closure는 reopen하지 않음; contradictory P1 evidence가 있으면 별도 incident lane |
| History retention/versioning design | current schema/source inventory의 허용 범위와 no-DB 또는 별도 DB-read 승인 | as-published/restated, vintage, methodology, identity, missing interval contract 후보 | 이미 equivalent accepted design이면 inherit; mutation 필요 시 별도 lane |

Nationwide coverage 검증을 종료된 Home V2 lane의 미완료로 소급하지 않는다. Production identity/deployment/smoke 단계는 `INHERITED/DONE/SKIP`이며 관련 dependency가 바뀌거나 contradictory accepted evidence가 생길 때만 exact 범위로 re-enter한다.

Time-series accumulation health는 현재 `NEEDS_VERIFICATION`, storage suitability는 `UNKNOWN_PENDING_READ_ONLY_AUDIT`이다. 다음 actual technical audit 후보는 `P-KOAPTIX-DATA-TIME-SERIES-ASSET-ACCUMULATION-HEALTH-READONLY-AUDIT.0`이며 다음 두 질문에 답해야 한다.

1. `IS THE DATA CLOCK RUNNING?`
2. `CAN THE CURRENT STORAGE/DURABILITY MODEL SUSTAIN THE DATA CLOCK?`

그 audit은 read-only로만 수행하며 authoritative mechanism을 미리 가정하지 않는다. Scheduler plane은 Vercel Cron, GitHub Actions, Supabase `pg_cron`, Supabase/Edge scheduler, external scheduler, local/manual automation 또는 실제 다른 mechanism을 후보로 확인한다. Data plane은 raw ingestion에서 matched/cleaned trade, representative price, market cap, eligibility, rank input authority, `complex_rank_history`, Rank/Index snapshot, immutable generation, publication event/pointer와 public serving까지를 분리한다. Lineage plane은 cutoff/vintage, calculation·eligibility·universe/membership version, generated/verified/published timestamps, counts/digests, code/release identity와 daily no-change/no-input/failure evidence를 본다. Storage/durability plane은 size/growth/projection, backup/PITR, off-production copy, archive/overwrite risk와 restore evidence를 본다.

Future audit primary status와 action은 다음과 같다.

- `HEALTHY_CONTINUOUS`: Product Roadmap을 계속하고 bounded lineage/observability gap만 닫는다.
- `PARTIAL_ACCUMULATION`: 어느 layer가 빠졌는지 특정한다. 누락이 time-native Rank/Index/publication continuity를 파괴하면 optional dependent feature보다 restoration을 먼저 검토하되, reconstructable RS/Momentum persistence만 없으면 feature work를 자동 중단하지 않는다.
- `STALLED`: Data Clock에 의존하는 optional feature implementation을 일시 보류하고 minimum safe restoration을 먼저 별도 설계한다.
- `SCHEDULER_NOT_ACTIVE`: authoritative scheduler activation/restoration을 별도로 설계하며 scheduler를 자동 생성하지 않는다.
- `UNRESOLVED`: historical moat가 현재 누적된다고 주장하지 않는다. 안전한 non-history-dependent trust/product work는 허용할 수 있고, continuity claim 전에 observability/evidence gap을 해소한다.

어떤 classification도 public product를 자동으로 종료하지 않는다.

어느 branch도 DB access, scheduler repair, cron mutation, archive creation, backfill 또는 source change를 이 문서만으로 승인하지 않는다.

## 19. Change History, Unresolved Decisions, and Authority Links

### Change history

| Version | Date | Status | Change |
| --- | --- | --- | --- |
| `0.1` | `2026-09-03` | `PROPOSED_ONLY` | 기존 accepted 원칙과 장기 전략 payload를 four-phase roadmap 후보로 통합. 실행·정본·공개 권한 없음 |
| `0.2-public-safe` | `2026-09-03` | `PROPOSED_PUBLIC_SAFE_CANDIDATE_ONLY` | product/technology strategy를 유지하고 exact internal commercial assumptions를 public 후보 밖으로 분리. CTO acceptance와 source-write 권한 없음 |
| `0.3-final-dual-clock-data-moat-public-safe` | `2026-09-03` | `PROPOSED_FINAL_DUAL_CLOCK_PUBLIC_SAFE_CANDIDATE_ONLY` | accepted split을 보존하면서 Dual Clock, daily accounted observation, time-native asset, historical recording, exposure, storage/durability와 evidence-based 36-month clock 전략을 추가. 구현·tracked write·정본 권한 없음 |

### Unresolved decisions

- 이 final Dual-Clock public-safe roadmap, 세 exact-reuse connection document와 additive private candidate를 수락·수정·보류할지.
- private commercial canonical location과 authority/versioning/mirror policy를 어떻게 정할지.
- Data Moat Clock의 evidence-based accepted start date와 qualified-continuity 기준.
- time-series accumulation health, storage suitability, backup/restore assurance, independent archive 우선순위와 physical storage model.
- pricing, quota, report, API cost와 margin hypothesis를 언제 어떤 fresh evidence로 재검증할지.
- Phase A feature별 broad readiness, 전국 Search/discovery coverage, mobile·Index·weekly movement·sharing·analytics·policy 상태.
- Public Beta activation의 exact hard-gate denominator와 다음에 실행할 단 하나의 bounded lane.
- KD-019는 `PROPOSED_NOT_ACCEPTED`이며 State Registry 변경은 `NONE`이다. 이를 언제 별도로 검토할지.
- Accepted final revision이 생긴 뒤 어떤 exact public bytes를 ChatGPT Sources에서 교체할지. 현재 candidate는 `accepted_commit: null`, `upload_ready: false`다.

### Related authority

- [KOAPTIX Context Index](../governance/KOAPTIX_CONTEXT_INDEX.md)
- [KOAPTIX State Registry](../governance/KOAPTIX_STATE_REGISTRY.yaml)
- [KOAPTIX Project Memory Operating Rules](../governance/KOAPTIX_PROJECT_MEMORY_OPERATING_RULES.md)
- [Master Living Source of Truth](../00_MASTER_LIVING_SOURCE_OF_TRUTH.md)
- [Project Charter](../01_PROJECT_CHARTER.md)
- [Current Confirmed Structure](../02_CURRENT_CONFIRMED_STRUCTURE.md)
- [Operations and Prohibitions](../03_OPERATIONS_AND_PROHIBITIONS.md)
- [KOAPTIX Confirmed Decisions](../governance/KOAPTIX_CONFIRMED_DECISIONS.md)
- [KOAPTIX Continuity and Handoff Protocol](../governance/KOAPTIX_CONTINUITY_AND_HANDOFF_PROTOCOL.md)
- [Historical Product Strategy Canonical Notes](koaptix_product_strategy_canonical_notes_20260706.md)

이 문서의 채택 여부와 관계없이 current execution은 현재 승인된 execution handoff만 정의한다. Roadmap이나 ChatGPT Sources는 repository authority와 exact action approval을 대체하지 않는다.
