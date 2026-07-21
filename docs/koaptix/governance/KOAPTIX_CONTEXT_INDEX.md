# KOAPTIX Context Index

- Document status: `CANONICAL_CONTEXT_RECORD`
- Last updated: `2026-07-21`

## 1. Purpose

이 문서는 새 ChatGPT CTO 대화와 Codex 세션이 가장 먼저 읽는 KOAPTIX 맥락 진입점이다. 상세 정책을 복제하거나 기존 source of truth를 대체하지 않는다. 어떤 문서가 무엇을 결정하는지, 현재 작업이 어디에서 멈췄는지, 충돌이 생기면 어떤 순서로 판단하는지를 안내한다.

Authority status: CTO 검토와 별도 승인된 commit 전까지는 `PROPOSED_CANONICAL_CONTEXT_RECORD`이며, 승인·commit 이후 저장소의 durable context authority로 사용한다.

## 2. Authority Levels

| Tier | Authority | 역할 |
| --- | --- | --- |
| A | Master Living Source of Truth와 foundational charter/structure/operations | 장기 제품·데이터·운영 원칙 |
| B | [Confirmed Decisions](KOAPTIX_CONFIRMED_DECISIONS.md) | 승인된 durable decision과 supersession 이력 |
| C | workstream별 checkpoint | 완료·미완료·blocker·resume 조건 |
| D | 현재 `.handoff` | 단 하나의 현재 실행 lane과 그 결과 |
| E | chat·memory | 탐색을 돕는 secondary aid. authority가 아님 |

Tier가 높다고 해서 오래된 일반 문구가 더 구체적인 최신 승인 결정을 덮지는 않는다. 충돌은 아래 규칙으로 해소한다.

## 3. Mandatory Reading Order

1. 이 Context Index
2. [Master Living Source of Truth](../00_MASTER_LIVING_SOURCE_OF_TRUTH.md)
3. [Project Charter](../01_PROJECT_CHARTER.md)
4. [Current Confirmed Structure](../02_CURRENT_CONFIRMED_STRUCTURE.md)
5. [Operations and Prohibitions](../03_OPERATIONS_AND_PROHIBITIONS.md)
6. [Confirmed Decisions](KOAPTIX_CONFIRMED_DECISIONS.md)
7. [Continuity and Handoff Protocol](KOAPTIX_CONTINUITY_AND_HANDOFF_PROTOCOL.md)
8. 관련 workstream checkpoint. 현재 WP-02/O-01은 [이 checkpoint](../workstreams/wp02_o01/CHECKPOINT.md)를 읽는다.
9. 현재 `.handoff/review-prompt.md`. 이는 local execution artifact이므로 tracked canonical 문서와 혼동하지 않는다.

추가 authority 확인:

- Watcher Y 방향은 [tracked brand guide](../brand/watcher_y_brand_tone_guide_20260706.md)를 읽는다.
- ranking/discovery 전략은 [tracked product strategy note](../product_strategy/koaptix_product_strategy_canonical_notes_20260706.md)를 읽는다.
- `KOAPTIX_HANDOFF_PROMPT_COMMON_RULES.txt`: `REFERENCE_NOT_VERIFIED_IN_REPOSITORY`. 이름만으로 경로나 내용을 만들지 않는다.

## 4. Conflict Resolution

1. 구체적인 최신 accepted decision이 오래된 일반 문구보다 우선한다.
2. tracked Confirmed Decision이 chat summary보다 우선한다.
3. workstream checkpoint가 stale lane narrative보다 우선한다.
4. `.handoff`는 현재 실행 상태에만 사용하며 durable policy를 단독으로 바꾸지 않는다.
5. evidence가 없으면 PASS를 추론하지 않는다.
6. hash는 bytes를 검증할 뿐 source body를 복원하지 않는다.
7. 여러 authority candidate가 충돌하면 Codex는 read-only 분류까지만 하고 canonical 선택은 사용자/CTO 승인으로 넘긴다.
8. superseded 결정은 삭제하지 않고 status와 대체 결정을 명시한다.

## 5. Current Major Workstreams

### Nationwide downstream data completeness and product trust

- Priority: 사용자에게 보이는 데이터 신뢰와 전국 downstream completeness
- Focus: searchable-but-unranked, 세대수·면적, representative price snapshot, market-cap/eligibility chain, detail chart, 지역·소규모 단지 coverage gap
- Boundary: 데이터 기준을 낮추거나 TOP1000을 억지로 채우는 작업은 승인되지 않았다.

### WP-02/O-01 canonical lifecycle/identity validation harness

- State: `PAUSED_FAIL_CLOSE_SOURCE_AUTHORITY_CONTINUITY_LOST`
- Checkpoint: [WP-02/O-01 CHECKPOINT](../workstreams/wp02_o01/CHECKPOINT.md)
- Automatic continuation: `NO`
- Meaning: workstream은 폐기되지 않았지만 complete, commit-ready, deploy-ready가 아니다.

## 6. New Chat Startup Protocol

새 ChatGPT CTO 대화는 다음을 정확히 수행한다.

1. 위 Mandatory Reading Order를 따른다.
2. 관련 checkpoint의 current status, completed boundary, incomplete scope, blocker를 확인한다.
3. 현재 `.handoff`의 lane, approval, result를 확인한다.
4. 이미 완료된 bounded work를 반복하지 않는다.
5. 누락된 source authority나 PASS를 추론하지 않는다.
6. 승인된 action과 아직 승인되지 않은 action을 분리한 뒤에만 다음 lane을 제안한다.

## 7. Codex Startup Protocol

Codex는 lane 시작 시 다음을 정확히 수행한다.

1. Context Index와 관련 durable context 문서를 읽는다.
2. 현재 `.handoff/inbox.md`를 읽는다.
3. 승인 범위 안에서 repository current state와 pre-existing changes를 확인한다.
4. 한 번에 하나의 lane만 수행한다.
5. unrelated change를 보존하고, 충돌 시 임의로 되돌리지 않는다.
6. `.handoff/result.md`와 `.handoff/review-prompt.md`를 작성한다.
7. 자동 수리·재시도·다음 lane 시작 없이 멈춘다.

## 8. Maintenance Rule

이 index는 다음 경우에만 docs-only review를 거쳐 갱신한다.

- authority 계층 또는 mandatory reading order가 바뀔 때
- major workstream이 추가·종료·pause될 때
- canonical checkpoint 경로가 바뀔 때
- 새 tracked source가 기존 `REFERENCE_NOT_VERIFIED_IN_REPOSITORY`를 대체할 때

세부 결정은 이 문서에 복제하지 않고 [Confirmed Decisions](KOAPTIX_CONFIRMED_DECISIONS.md)에 기록한다. 작업별 실행 증거는 checkpoint와 `.handoff`에 남긴다.

## Related Documents

- [KOAPTIX Confirmed Decisions](KOAPTIX_CONFIRMED_DECISIONS.md)
- [KOAPTIX Continuity and Handoff Protocol](KOAPTIX_CONTINUITY_AND_HANDOFF_PROTOCOL.md)
- [WP-02/O-01 Checkpoint](../workstreams/wp02_o01/CHECKPOINT.md)
- [Master Living Source of Truth](../00_MASTER_LIVING_SOURCE_OF_TRUTH.md)

Maintenance owner: 사용자가 승인하고, ChatGPT CTO가 authority 순서를 검토하며, Codex가 승인된 docs-only lane에서 파일을 갱신한다.
