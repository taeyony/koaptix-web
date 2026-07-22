# KOAPTIX Confirmed Decisions

- Document status: `CANONICAL_CONTEXT_RECORD`
- Last updated: `2026-07-22`

## Purpose

KOAPTIX의 durable accepted decision을 stable ID로 보존한다. 임시 lane 로그, 추정, 미승인 제안, raw 실행 증거는 이 문서에 넣지 않는다.

Authority status: CTO 검토와 별도 승인된 commit 전까지 `PROPOSED_CANONICAL_CONTEXT_RECORD`; 이후 Tier B decision authority다.

## Document Rules

- accepted durable decision만 기록한다.
- estimate, hypothesis, recommendation을 fact로 올리지 않는다.
- temporary lane evidence는 checkpoint 또는 `.handoff`에 둔다.
- superseded decision은 삭제하지 않고 status와 replacement를 남긴다.
- 모든 decision은 stable `Decision ID`를 가진다.
- 구체적인 최신 accepted decision이 오래된 일반 문구보다 우선한다.
- 이 문서는 코드, DB, commit, deploy를 승인하지 않는다.

## Decisions

### KD-001 Product identity and information hierarchy

- Decision ID: `KD-001`
- Status: `ACCEPTED_CURRENT`
- Date recorded: `2026-07-21`
- Decision: KOAPTIX는 전국 아파트 capital-flow ranking terminal이다. KOAPTIX Ranking은 개별 아파트 단지의 추정 시가총액 ranking이고, KOAPTIX Index는 normalized aggregate market number다. `KOAPTIX 500`은 flagship main board, `TOP1000`은 broader public ranking board다. Home은 lightweight situation board, Ranking은 full exploration/operations board, Search는 ranked exposure 밖의 wider discovery path다.
- Reason: ranking, index, discovery의 의미와 화면 역할을 섞으면 사용자 신뢰와 데이터 계약이 무너진다.
- Scope: product naming, information architecture, public explanation.
- Must preserve: Ranking/Index 구분, `KOAPTIX 500`, `TOP1000`, Home/Ranking/Search 역할.
- Not approved: ranking formula, route, UI, DB, registry 변경.
- Revisit condition: 별도 product naming 또는 information-architecture decision이 승인될 때.
- Source references: [Project Charter](../01_PROJECT_CHARTER.md), [Product Strategy Canonical Notes](../product_strategy/koaptix_product_strategy_canonical_notes_20260706.md).

현재 canonical 문서에서는 `TOP1000`을 사용한다. 과거 strategy note의 `KOAPTIX 1000` 표기는 historical source 안에 보존하지만 새 canonical naming을 덮지 않는다.

### KD-002 KOREA_ALL success-asset preservation

- Decision ID: `KD-002`
- Status: `ACCEPTED_CURRENT`
- Date recorded: `2026-07-21`
- Decision: `KOREA_ALL`은 검증된 success asset이며 별도 입증된 필요 없이 redesign, dismantle, reopen하지 않는다. 안정화된 기능이 신규 확장보다 우선한다.
- Reason: 이미 성공한 national engine을 재설계하면 identity와 delivery regression 위험이 커진다.
- Scope: ranking engine, universe expansion, delivery design.
- Must preserve: current `KOREA_ALL` engine과 stable behavior.
- Not approved: replacement engine, national board regional balancing.
- Revisit condition: exact replacement need와 regression proof가 별도 승인될 때.
- Source references: [Master Living Source of Truth](../00_MASTER_LIVING_SOURCE_OF_TRUTH.md), [Project Charter](../01_PROJECT_CHARTER.md).

### KD-003 Additive-only multi-universe

- Decision ID: `KD-003`
- Status: `ACCEPTED_CURRENT`
- Date recorded: `2026-07-21`
- Decision: multi-universe expansion은 additive only다. canonical codes에는 `KOREA_ALL`, `SEOUL_ALL`, `BUSAN_ALL`, `GYEONGGI_ALL`, `SGG_<5 digits>`가 포함된다.
- Reason: national engine을 유지하면서 지역 surface를 독립적으로 확장해야 한다.
- Scope: universe identity와 expansion policy.
- Must preserve: canonical `universe_code` contract와 registry-governed exposure.
- Not approved: `KOREA_ALL` 교체, 기존 universe 의미 변경, registry expansion.
- Revisit condition: 새 universe contract가 별도 승인될 때.
- Source references: [Master Living Source of Truth](../00_MASTER_LIVING_SOURCE_OF_TRUTH.md), [Current Confirmed Structure](../02_CURRENT_CONFIRMED_STRUCTURE.md).

### KD-004 Universe-internal reranking

- Decision ID: `KD-004`
- Status: `ACCEPTED_CURRENT`
- Date recorded: `2026-07-21`
- Decision: universe-specific ranking은 national rank filter가 아니다. 각 universe 안에서 `market_cap_krw desc, complex_id asc`로 다시 ranking한다. `complex_rank_history`는 `universe_code`가 없는 single global history engine으로 유지한다.
- Reason: 지역 board의 상대 순위는 해당 universe 구성 안에서 계산되어야 한다.
- Scope: universe ranking semantics.
- Must preserve: internal reranking과 global history/universe snapshot 역할 분리.
- Not approved: ranking-methodology 변경 또는 history schema 변경.
- Revisit condition: 별도 ranking-contract decision이 승인될 때.
- Source references: [Master Living Source of Truth](../00_MASTER_LIVING_SOURCE_OF_TRUTH.md), [Product Strategy Canonical Notes](../product_strategy/koaptix_product_strategy_canonical_notes_20260706.md).

### KD-005 Universe board source-of-truth chain

- Decision ID: `KD-005`
- Status: `ACCEPTED_CURRENT`
- Date recorded: `2026-07-21`
- Decision: official universe board chain은 `koaptix_rank_snapshot -> v_koaptix_universe_rank_history_dynamic -> v_koaptix_latest_universe_rank_board_u`다. membership/history direct source로 돌아가지 않는다.
- Reason: snapshot과 latest board가 universe-specific ranking의 실제 readiness와 delivery identity를 보장한다.
- Scope: rank source of truth와 board readiness.
- Must preserve: chain, registry control, actual snapshot/latest-board row 확인.
- Not approved: membership만으로 readiness 선언, source-of-truth bypass.
- Revisit condition: 동등 이상 검증을 가진 replacement chain이 별도 승인될 때.
- Source references: [Master Living Source of Truth](../00_MASTER_LIVING_SOURCE_OF_TRUTH.md), [Current Confirmed Structure](../02_CURRENT_CONFIRMED_STRUCTURE.md).

### KD-006 Discovery versus ranking separation

- Decision ID: `KD-006`
- Status: `ACCEPTED_CURRENT`
- Date recorded: `2026-07-21`
- Decision: Discovery Search candidate와 ranked row는 서로 다른 계약이다. 단지는 검색 가능하지만 price, market cap, eligibility, rank가 불완전할 수 있다.
- Reason: 알려진 단지를 찾게 하는 것과 public rank 신뢰를 보장하는 것은 다른 문제다.
- Scope: search, discovery state, ranking inclusion.
- Must preserve: ranked, known-but-unranked, source-only/unverified 구분.
- Not approved: discovery candidate의 자동 ranking 포함, unverified public exposure.
- Revisit condition: governed discovery exposure policy가 별도 승인될 때.
- Source references: [Product Strategy Canonical Notes](../product_strategy/koaptix_product_strategy_canonical_notes_20260706.md).

### KD-007 Data-quality-first public exposure

- Decision ID: `KD-007`
- Status: `ACCEPTED_CURRENT`
- Date recorded: `2026-07-21`
- Decision: data quality, accuracy, consistency가 속도와 시각적 완성도보다 우선한다. TOP1000을 채우기 위해 public rank exposure를 강제하지 않는다. ambiguous candidate는 자동 match하지 않고 review 또는 후속 validation으로 보낸다.
- Reason: 빈 화면보다 잘못된 canonical identity와 ranking이 더 큰 신뢰 손상을 만든다.
- Scope: matching, eligibility, public exposure, completeness work.
- Must preserve: evidence-based inclusion과 ambiguity handling.
- Not approved: threshold 완화, forced ranking, review bypass.
- Revisit condition: quality gate 변경이 별도 evidence와 함께 승인될 때.
- Source references: [Product Strategy Canonical Notes](../product_strategy/koaptix_product_strategy_canonical_notes_20260706.md), [Operations and Prohibitions](../03_OPERATIONS_AND_PROHIBITIONS.md).

### KD-008 Market-cap calculation contract

- Decision ID: `KD-008`
- Status: `ACCEPTED_CURRENT`
- Date recorded: `2026-07-21`
- Decision: complex market cap은 각 `area_cluster`의 representative price와 household count를 곱한 뒤 합산한다: `Σ(representative price × household count for each area_cluster)`. 한 대표 면적만 사용하거나 `area_group`으로 rank를 계산하지 않는다. representative price는 approved valid-trade window와 averaging contract를 따른다.
- Reason: 단지 전체 자산 규모를 면적군별 가격·세대수로 반영해야 한다.
- Scope: estimated market-cap methodology와 ranking input.
- Must preserve: `complex_id + area_cluster_id`, 최근 12개월 valid trades, latest 3 valid trades contract, quality/eligibility gate.
- Not approved: floor adjustment, one-area shortcut, formula 변경.
- Revisit condition: methodology decision이 별도 승인될 때.
- Source references: [KOAPTIX Market Cap Index Methodology](../KOAPTIX_MARKET_CAP_INDEX_METHODOLOGY.md).

### KD-009 Sealed wrappers and helper-chain operation

- Decision ID: `KD-009`
- Status: `ACCEPTED_CURRENT`
- Date recorded: `2026-07-21`
- Decision: 성공한 helper chain이 official safe operational path다. heavy wrapper는 sealed 상태로 유지하고 되살리지 않는다. heavy DB work는 web SQL editor 중심으로 설계하지 않으며, 별도 승인된 bounded local/external client와 segmented execution을 사용한다.
- Reason: 검증된 path와 execution containment를 유지해야 한다.
- Scope: operational data work와 helper execution.
- Must preserve: sealed wrappers, scoped approval, bounded execution.
- Not approved: helper 실행, DB access/write, wrapper revival.
- Revisit condition: replacement operating path가 별도 검증·승인될 때.
- Source references: [Master Living Source of Truth](../00_MASTER_LIVING_SOURCE_OF_TRUTH.md), [Operations and Prohibitions](../03_OPERATIONS_AND_PROHIBITIONS.md).

### KD-010 Watcher Y brand direction

- Decision ID: `KD-010`
- Status: `ACCEPTED_CURRENT`
- Date recorded: `2026-07-21`
- Decision: `Watcher Y / 관측자 Y`는 original KOAPTIX market observer이자 data guide다. core tone은 `데이터는 냉정하게. 설명은 친절하게. 분위기는 살짝 유머러스하게.`다.
- Reason: data authority를 약화하지 않으면서 첫 경험을 이해하기 쉽게 만든다.
- Scope: copy, persona, user-facing explanation.
- Must preserve: uncertainty disclosure, Ranking/Index distinction, original IP posture.
- Not approved: investment advice, buy/sell recommendation, return promise, 공식 금융지수 주장.
- Revisit condition: 별도 brand decision과 safety review가 승인될 때.
- Source references: [Watcher Y Brand Tone Guide](../brand/watcher_y_brand_tone_guide_20260706.md).

### KD-011 User / CTO / Codex role separation

- Decision ID: `KD-011`
- Status: `ACCEPTED_CURRENT`
- Date recorded: `2026-07-21`
- Decision: 사용자는 final decision-maker와 approval authority다. ChatGPT CTO는 strategy, review, scope, Codex prompt를 담당한다. Codex는 승인된 repository inspection, analysis, file work, test, execution을 수행한다.
- Reason: 판단, 승인, 실행의 책임을 분리해야 장기 프로젝트에서 맥락 손실과 과잉 실행을 줄인다.
- Scope: governance와 lane ownership.
- Must preserve: 사용자의 최종 승인, CTO의 scope 설계, Codex의 bounded execution.
- Not approved: Codex의 conflicting canonical authority 자의 선택, 사용자에게 반복 수동 편집 전가.
- Revisit condition: governance model이 별도 승인될 때.
- Source references: [Continuity and Handoff Protocol](KOAPTIX_CONTINUITY_AND_HANDOFF_PROTOCOL.md).

### KD-012 Separate approval scopes for dangerous actions

- Decision ID: `KD-012`
- Status: `ACCEPTED_CURRENT`
- Date recorded: `2026-07-21`
- Decision: code mutation, secret-sensitive DB read, DB write, helper execution, migration, stage, commit, push, deploy, destructive cleanup, conflicting authority 선택은 각각 exact scoped approval을 요구한다.
- Reason: 한 단계 승인이 다음 위험 단계를 자동 승인하면 containment가 무너진다.
- Scope: 모든 engineering/operations lane.
- Must preserve: action별 approval boundary와 금지된 blanket staging.
- Not approved: `git add .`, `git add -A`, implied deploy, automatic repair/retry.
- Revisit condition: 더 엄격한 운영정책이 승인될 때만 확장한다.
- Source references: [Operations and Prohibitions](../03_OPERATIONS_AND_PROHIBITIONS.md), [Continuity and Handoff Protocol](KOAPTIX_CONTINUITY_AND_HANDOFF_PROTOCOL.md).

### KD-013 Handoff v1

- Decision ID: `KD-013`
- Status: `ACCEPTED_CURRENT`
- Date recorded: `2026-07-21`
- Decision: current execution handoff는 `.handoff/inbox.md`, `.handoff/result.md`, `.handoff/review-prompt.md`를 사용한다. inbox에는 current lane 하나만 두고 Codex는 그 lane만 수행한 뒤 result/review를 쓰고 멈춘다.
- Reason: 실행 상태와 durable project context를 분리하고 at-most-one-lane discipline을 유지한다.
- Scope: local execution handoff.
- Must preserve: local-by-default, no staging without approval, fail-close 후 자동 repair/retry 금지, secret 비공개.
- Not approved: handoff 자동 commit, historical archive로의 무제한 확장.
- Revisit condition: handoff protocol version이 별도 승인될 때.
- Source references: [Continuity and Handoff Protocol](KOAPTIX_CONTINUITY_AND_HANDOFF_PROTOCOL.md).

### KD-014 Repository documentation as durable context authority

- Decision ID: `KD-014`
- Status: `ACCEPTED_CURRENT_WITH_EXPLICIT_SUPERSESSION`
- Date recorded: `2026-07-21`
- Decision: durable project context는 tracked repository documentation에 둔다. 새 ChatGPT/Codex는 Context Index에서 시작하고, durable decisions는 이 문서, workstream status는 checkpoint, current execution은 `.handoff`에 둔다. chat/memory는 secondary aid다.
- Reason: session-local source와 오래된 chat에만 의존하면 완료 작업 반복과 authority continuity loss가 발생한다.
- Scope: context storage와 reading topology.
- Must preserve: durable/decision/checkpoint/handoff 분리와 docs-only promotion review.
- Not approved: `.handoff`의 자동 canonical 승격, memory 기반 hash/status 복원.
- Revisit condition: repository-wide documentation governance가 별도 승인될 때.
- Source references: [Context Index](KOAPTIX_CONTEXT_INDEX.md), [Continuity and Handoff Protocol](KOAPTIX_CONTINUITY_AND_HANDOFF_PROTOCOL.md).

Superseded scope: 2026-06-30 historical `Minimal File Sprawl Continuity Model` 중 continuity 문서를 ledger/snapshot/LATEST_HANDOFF 세 파일로 제한하던 topology 부분은 이 결정으로 대체된다. 해당 historical record는 삭제하지 않는다. 위험 작업 분리와 `.handoff`를 current-lane workspace로 유지하는 원칙은 계속 유효하다.

### KD-015 WP-02/O-01 production-publication requirement

- Decision ID: `KD-015`
- Status: `ACCEPTED_CURRENT`
- Date recorded: `2026-07-21`
- Decision: WP-02/O-01은 canonical lifecycle/identity metadata 변경을 위한 disposable validation harness다. 현재 서비스 검색·조회에 직접 필요한 user-facing feature는 아니지만, 해당 metadata 변경을 production에 publish하기 전에는 이 harness 또는 동등한 approved validation이 필요하다.
- Reason: merge, duplicate, split history, wrong trade/market-cap attachment, partial migration, validation/deployment divergence를 방지한다.
- Scope: canonical identity/lifecycle publication gate.
- Must preserve: publication 전 complete validation requirement.
- Not approved: current product gap을 WP-02/O-01 탓으로 단정, incomplete harness로 publication 승인.
- Revisit condition: equivalent validation process가 별도 승인·입증될 때.
- Source references: [WP-02/O-01 Checkpoint](../workstreams/wp02_o01/CHECKPOINT.md).

### KD-016 WP-02/O-01 current pause decision

- Decision ID: `KD-016`
- Status: `ACCEPTED_CURRENT`
- Date recorded: `2026-07-21`
- Decision: official state는 `PAUSED_FAIL_CLOSE_SOURCE_AUTHORITY_CONTINUITY_LOST`다. workstream은 rejected도 complete도 아니며 product patch는 commit-ready가 아니다. automatic continuation은 승인되지 않았다.
- Reason: exact parent parser checker와 parent/child source byte authority가 active execution context에서 소실돼 lawful patch와 complete static verification을 이어갈 수 없었다.
- Scope: WP-02/O-01 current status.
- Must preserve: current product/source identities, no source reconstruction, no inferred PASS.
- Not approved: old micro-patch replay, commit, migration, deploy.
- Revisit condition: approved authority recovery 또는 fresh requalification이 완료될 때.
- Source references: [WP-02/O-01 Checkpoint](../workstreams/wp02_o01/CHECKPOINT.md).

### KD-017 Product-priority transition to downstream completeness

- Decision ID: `KD-017`
- Status: `ACCEPTED_CURRENT`
- Date recorded: `2026-07-21`
- Decision: WP-02/O-01을 safe checkpoint에 pause하고 현재 product priority는 user-facing data trust와 nationwide downstream completeness로 이동한다.
- Reason: searchable-but-unranked, household/area, representative price, market-cap/eligibility, chart, regional coverage gap이 현재 사용자 가치에 직접 연결된다.
- Scope: product planning priority.
- Must preserve: quality-first, ranking/discovery separation, WP-02/O-01 publication blocker.
- Not approved: 이 decision만으로 code/DB 작업 시작, ranking threshold 완화, WP-02/O-01 폐기.
- Revisit condition: downstream gap evidence 또는 identity/lifecycle publication need가 우선순위를 바꿀 때.
- Source references: [Context Index](KOAPTIX_CONTEXT_INDEX.md), [WP-02/O-01 Checkpoint](../workstreams/wp02_o01/CHECKPOINT.md).

### KD-018 WP-02/O-01 resume through authority recovery or fresh requalification

- Decision ID: `KD-018`
- Status: `ACCEPTED_CURRENT`
- Date recorded: `2026-07-21`
- Decision: resume은 Option A exact artifact recovery/lineage inventory 또는 Option B fresh authority bundle/requalification 중 하나로만 진행한다.
- Reason: hash와 summary만으로 missing source를 복원하면 lineage와 parser/transport evidence가 위조될 수 있다.
- Scope: WP-02/O-01 resume gate.
- Must preserve: read-only candidate classification, CTO authority selection, write-once source bodies와 closed manifest, 별도 승인.
- Not approved: 이 문서에 의한 recovery lane 자동 승인, Codex의 conflicting candidate 자의 선택.
- Revisit condition: 사용자가 exact recovery 또는 fresh requalification lane을 명시적으로 승인할 때.
- Source references: [WP-02/O-01 Checkpoint](../workstreams/wp02_o01/CHECKPOINT.md), [Continuity and Handoff Protocol](KOAPTIX_CONTINUITY_AND_HANDOFF_PROTOCOL.md).

### Supabase target V2 authority

- Decision ID: `KOAPTIX-SUPABASE-TARGET-AUTHORITY-V2-20260722`
- Status: `CONFIRMED_ACTIVE`
- Date recorded: `2026-07-22`
- Decision: `KOAPTIX_SUPABASE_TARGET_V2` is the active canonical authority for target-connection identity validation in future KOAPTIX administrator DSN secure-binding and provisioning lanes.
- Authority schema: the exact schema body is `outputs/koaptix/nationwide_downstream_completeness/P-KOAPTIX-ND-ADMIN-TARGET-SERIALIZER-AUDIT-20260722-01/07_v2_target_contract_candidate.json`, SHA-256 `A33D546E8D601B09F074281378B4DD755F414E06D3C02C2CEC1C1167DFC44430`.
- Target identity: accepted target-contract SHA-256 `C93C2FB90D96EDC09FDD018BFA23768573ED70D8DB32B032219C1C17981870CF`, expected serialized byte length `267`, accepted production project-reference SHA-256 `F67504EE337BA4E064FCB8BE1C9CF0B8A14591A657D0143910929B506779419B`.
- Serialization contract: fixed insertion-order compact JSON; separators `,` and `:`; no whitespace outside strings; JSON-standard ASCII-safe escaping; lowercase ASCII alphanumeric project reference; UTF-8; no BOM; no trailing newline.
- Included semantic boundary: provider class, production project reference, direct-host class, PostgreSQL port, database, pooler policy, and connection class.
- Excluded semantic boundary: username, password, complete DSN, credential encoding, input formatting, `sslmode`, connect timeout, application name, options, runtime session settings, administrator capability, and role or grant authority.
- Independent evidence: Python reference SHA-256 `7136D1C7B96FAA37F3D1627CD49D18900386C53F033A289AE0A2FDEC159172CD` and Node reference SHA-256 `CBA61E5A0C76AB179060AC04FF73CE497BB37EE3F342C50A280A535739EE32E7` agree on the exact 267-byte V2 serialization and target-contract SHA-256.
- Fixture evidence: secret-free positive fixtures `7/7 PASS` and negative fixtures `7/7 PASS`; fixture matrix SHA-256 `DC106BDCA7995A7E1F38234D576EE435A67FC34E7D58EF7E9099B9A1672D6773`.
- Approval marker: `P-KOAPTIX-NATIONWIDE-DOWNSTREAM-SUPABASE-TARGET-V2-AUTHORITY-ADOPTION.0`, approved by exact decision `APPROVE_KOAPTIX_SUPABASE_TARGET_V2_AUTHORITY`.
- V1 treatment: `KOAPTIX_SUPABASE_TARGET_V1` is `HISTORICAL_DEPRECATED_NONREPRODUCIBLE`; historical SHA-256 `8D839FBBF5214031D99DD6856D2064D36B2E6797229FA475BFC0DB5841BA055A` is preserved as evidence but is not an active gate, must not be reconstructed from its hash, and must not be rewritten to equal V2.
- Prior-attempt interpretation: previous V1-based DSN validation failures do not establish that the supplied credential was invalid. Previously supplied credentials are not retained and must not be reused.
- Safety boundary: this decision does not authorize secret entry, DPAPI binding, DB access, SQL, role or grant mutation, currentness query-pack execution, stage, commit, push, or deploy.
- Future workflow: fixture-proven V2 secure binding requires fresh approval; corrected dedicated role provisioning requires a separate fresh approval after binding PASS; currentness query execution requires another separate fresh approval after provisioning PASS.
- Revisit condition: a replacement target-identity authority must be independently reproducible, fixture-proven, and separately approved without rewriting this historical decision.

### Supabase Session Pooler administrator route V1 authority

- Decision ID: `KOAPTIX-SUPABASE-SESSION-POOLER-ADMIN-ROUTE-V1-20260723`
- Status: `CONFIRMED_ACTIVE_ALTERNATE_ROUTE`
- Date recorded: `2026-07-23`
- Decision: `KOAPTIX_SUPABASE_ADMIN_ROUTE_SESSION_POOLER_V1` is the approved alternate IPv4 connection-route authority for bounded KOAPTIX administrator provisioning when the canonical direct route is unreachable because the execution environment lacks a usable IPv6 path.
- Route candidate: the exact authority body is `outputs/koaptix/nationwide_downstream_completeness/P-KOAPTIX-ND-SUPAVISOR-SESSION-ADMIN-ROUTE-REVIEW-20260723-01/02_supabase_session_pooler_admin_route_candidate.json`, SHA-256 `D7416A045B23359406BB6B900059BA069032921403DB556E3C15C4334F55A652`, serialized byte length `366`.
- Approval evidence: authority review marker `P-KOAPTIX-NATIONWIDE-DOWNSTREAM-SUPABASE-SESSION-POOLER-ADMIN-ROUTE-AUTHORITY-REVIEW-READONLY.0`, approved by exact decision `APPROVE_KOAPTIX_SUPABASE_SESSION_POOLER_ADMIN_ROUTE_V1_AUTHORITY`.
- Authority separation: `KOAPTIX_SUPABASE_TARGET_V2` remains the canonical production-project and database-target identity. This authority adds only an alternate connection route, does not replace V2 with a regional host, and does not supersede the preferred direct route.
- Approved route semantics: provider class `SUPABASE`; route provider `SUPAVISOR`; route mode `SESSION`; host class `SHARED_REGIONAL_POOLER`; port `5432`; database `postgres`; address family `IPV4`; username project binding required; transaction mode false; direct endpoint false; administrator capability live check required.
- Project binding: a future secure-input lane must derive the project reference from the Session Pooler username in memory and match it to the accepted V2 project identity. A regional pooler hostname alone does not establish project identity.
- Excluded route identity: password, full DSN, actual hostname, region, actual username, TLS runtime configuration, connect timeout, application name, credential encoding, capability result, role result, and privilege result. Qualified regional host variations do not change the route-class identity.
- Independent evidence: Python reference SHA-256 `206842BB6BA80299A6E0744B3F0E2C32893FE43D9B7DE11CC079379E401E0532` and Node reference SHA-256 `FD6888EAA3FC4B1DDF546C3CE35A342C3B6D62500E6D2DFF4709406A8AF18FFB` agree on the exact 366-byte serialization. Secret-free fixtures are positive `7/7 PASS` and negative `9/9 PASS`; fixture matrix SHA-256 `4D80C8768D84087CED13E07FD9CBB6A8CCD54F3FFACA9E458C0F27E9CAF9D0DA`.
- Official-source evidence: `outputs/koaptix/nationwide_downstream_completeness/P-KOAPTIX-ND-SUPAVISOR-SESSION-ADMIN-ROUTE-REVIEW-20260723-01/10_official_source_evidence_manifest.json`, SHA-256 `93C75B7097E82EA02FDF84A53608198555F4D4A9E53D774A0B8C186003607211`, records official Supabase evidence for direct-route IPv6 behavior, Session mode as an IPv4 route on port 5432, session affinity, management workflows, prepared-statement behavior, transaction-mode distinction, and Network Restrictions.
- Rejected routes: Shared Supavisor Transaction mode on port `6543` and Dedicated PgBouncer Transaction mode are rejected for administrator provisioning. Session-to-transaction fallback, port 5432-to-6543 fallback, unauthorized direct-to-pooler fallback, generic `DATABASE_URL` fallback, TLS weakening, and borrowing transaction-mode behavior are prohibited.
- Retained alternatives: the canonical direct route remains preferred when reachable; the Supabase IPv4 add-on and an IPv6-capable execution environment remain valid separately governed alternatives.
- Live pre-mutation gates: Session route identity, V2 project identity, username-derived project binding, Shared Regional Pooler host class, port 5432, database postgres, TLS `verify-full`, one successful connection, `current_database` postgres, session-stable backend behavior, explicit `BEGIN` and `ROLLBACK`, administrator `CREATEROLE` or equivalent authority, database/schema/object grant authority, exact dedicated-role absence, exact 16-object identity and feasibility, ambient `PUBLIC` privilege safety, and Network Restrictions must all pass before mutation. `CREATE ROLE`, `ALTER ROLE`, and `GRANT` remain `REQUIRES_LIVE_PREMUTATION_CAPABILITY_GATE`; official documentation is not treated as a guarantee.
- Safety boundary: this decision authorizes no credential input or storage, DNS, TCP, TLS, authentication, database session, SQL, role or grant mutation, query-pack execution, stage, commit, push, or deploy.
- Future workflow: Session Pooler secure binding, corrected role provisioning, and currentness query execution each require a separate fresh approval. No automatic route fallback or TLS weakening is authorized.
- Revisit condition: replacing this alternate route requires separate evidence and approval without rewriting `KOAPTIX_SUPABASE_TARGET_V2` or this historical decision.

## Maintenance Rule

- accepted durable decision이 추가·변경·supersede될 때만 docs-only review로 갱신한다.
- status 변경 시 기존 decision을 삭제하지 않고 replacement ID 또는 변경 근거를 연결한다.
- runtime hash, row count, raw logs는 checkpoint/completion evidence에 둔다.
- user approval과 별도 commit 전까지 변경분은 canonical로 간주하지 않는다.

## Related Documents

- [KOAPTIX Context Index](KOAPTIX_CONTEXT_INDEX.md)
- [KOAPTIX Continuity and Handoff Protocol](KOAPTIX_CONTINUITY_AND_HANDOFF_PROTOCOL.md)
- [WP-02/O-01 Checkpoint](../workstreams/wp02_o01/CHECKPOINT.md)
- [Master Living Source of Truth](../00_MASTER_LIVING_SOURCE_OF_TRUTH.md)
