# KOAPTIX Continuity and Handoff Protocol

- Document status: `CANONICAL_CONTEXT_RECORD`
- Last updated: `2026-07-21`

## 1. Goal

중요한 프로젝트 맥락이 한 chat이나 한 Codex session의 memory에만 남지 않도록 한다. durable decision, workstream 상태, 현재 실행을 서로 다른 층에 저장해 오래된 대화가 사라져도 완료 작업을 반복하거나 미증명 상태를 PASS로 오해하지 않게 한다.

Authority status: CTO 검토와 별도 승인된 commit 전까지 `PROPOSED_CANONICAL_CONTEXT_RECORD`; 이후 continuity 운영의 tracked authority다.

## 2. Four-Layer Context Model

1. **Durable canonical project documents**: 장기 제품 정체성, source of truth, 구조, 운영 원칙
2. **Confirmed decision log**: stable ID를 가진 승인 결정과 supersession 이력
3. **Workstream checkpoints**: 특정 workstream의 완료·미완료·blocker·resume 조건
4. **Current `.handoff`**: 현재 단 하나의 execution lane, result, CTO review request

Chat과 memory는 다섯 번째 secondary aid다. 문서를 찾는 데 도움을 줄 수 있지만 hash, source body, 승인, PASS, current status의 authority가 될 수 없다.

## 3. Promotion Rules

| 정보 | 머무는 위치 | 승격 조건 |
| --- | --- | --- |
| 명령, stdout 요약, gate 결과, first failure | `.handoff` | 현재 실행 증거로만 유지 |
| 장기간 유지할 승인 결정 | Confirmed Decisions | CTO가 durable decision으로 수락한 docs-only review |
| workstream 상태·blocker·resume 조건 | 해당 `CHECKPOINT.md` | 의미 있는 lane 종료 후 docs-only review |
| 제품 정체성·source-of-truth·기초 운영 원칙 | master living sources | 별도 높은 수준 승인과 source 충돌 검토 |
| 읽기 순서·authority topology | Context Index | 구조 변경이 승인될 때 |

승격은 자동이 아니다. `.handoff`의 문구를 tracked canonical fact로 옮길 때는 별도 docs-only review가 필요하다.

## 4. Lane Lifecycle

1. 사용자/CTO가 lane을 선택한다.
2. 현재 lane만 `.handoff/inbox.md`에 기록한다.
3. Codex가 승인된 한 lane만 실행한다.
4. Codex가 `.handoff/result.md`와 `.handoff/review-prompt.md`를 작성한다.
5. CTO가 accept, patch, stop, 또는 다음 lane 선택을 결정한다.
6. durable decision이 생겼다면 별도 docs-only lane에서 승격한다.
7. docs commit은 별도 승인된 경우에만 수행한다.

## 5. Required End-of-Lane Evidence

모든 의미 있는 lane 결과는 최소한 다음을 남긴다.

- exact status와 execution type
- lane이 변경·생성한 파일
- write/execute attempt 수
- identity가 중요할 때 hash와 byte length
- test 또는 gate 결과와 first failing gate
- 금지 작업이 실행되지 않았다는 확인
- blocker와 정확한 resume condition
- CTO가 선택할 recommended next decision

증거가 없는 항목은 `NOT_PROVEN`, `NOT_RUN`, `NOT_AVAILABLE`처럼 닫힌 상태로 기록한다.

## 6. Source Authority Rules

- hash는 주어진 bytes의 identity를 검증하지만 bytes를 재구성하지 못한다.
- summary는 source body나 runtime object를 재구성하지 못한다.
- current-session authority는 source body·manifest·lineage가 파일로 고정되지 않으면 durable하지 않다.
- transport teardown 전에 중요한 generated source body를 승인된 write-once artifact로 보존한다.
- 여러 candidate source가 있으면 read-only lineage classification 후 CTO가 canonical authority를 선택한다.
- Codex는 candidate 수집·hash·lineage matrix를 만들 수 있지만 충돌 증거가 있는 authority를 스스로 canonical로 임명하지 않는다.
- 이전 lane의 PASS는 새 root 또는 새 실행에 자동 상속되지 않는다.

## 7. Current Handoff v1 Rules

| 파일 | 역할 |
| --- | --- |
| `.handoff/inbox.md` | 현재 한 lane의 목표, 승인 범위, 금지사항, 성공 조건 |
| `.handoff/result.md` | 실제 수행·미수행·변경·검증·first failure 결과 |
| `.handoff/review-prompt.md` | CTO가 accept/patch/stop을 판단하는 self-contained 요청 |

- inbox에는 현재 lane 하나만 둔다.
- Codex는 해당 lane만 수행하고 결과 작성 후 멈춘다.
- `.handoff`는 기본적으로 local execution artifact이며 별도 승인 없이 stage/commit하지 않는다.
- fail-close는 repair, retry, 다음 lane을 승인하지 않는다.
- `git add .`와 `git add -A`는 항상 금지한다.
- secret, credential, token, private URL, connection string을 기록하지 않는다.

## 8. Approval Matrix

| Action | 승인 규칙 |
| --- | --- |
| source/code modification | exact scoped approval 필요 |
| secret이 관련된 DB read | target·credential handling을 포함한 별도 승인 필요 |
| DB write / helper execution / migration | 각각 별도 exact approval 필요 |
| stage / commit / push / deploy | 각 단계별 별도 승인 필요 |
| destructive cleanup | exact target과 verification을 포함한 별도 승인 필요 |
| conflicting candidate 중 authority 선택 | 사용자/CTO 승인 필요 |
| repository inspection / exact file read / hash | 승인된 read-only/docs lane 범위에서 가능 |
| bounded search / lineage matrix | lane이 명시적으로 허용할 때 가능 |
| docs generation / git status·diff check | 승인된 docs lane 범위에서 가능 |
| test execution | lane이 test를 명시적으로 포함할 때만 가능 |

## 9. New Chat Handoff

새 ChatGPT CTO는 다음 startup block을 따른다.

```text
1. KOAPTIX_CONTEXT_INDEX.md에서 시작한다.
2. mandatory documents와 관련 CHECKPOINT.md를 순서대로 읽는다.
3. 현재 .handoff를 확인하되 durable authority로 승격하지 않는다.
4. completed, incomplete, blocked, not-authorized를 분리한다.
5. 누락된 source나 PASS를 추론하지 않는다.
6. 다음 action은 approval scope를 나눈 뒤 제안한다.
```

## 10. Failure and Fail-Close Rules

- fail-close 이후 자동 repair를 하지 않는다.
- at-most-once 실행 이후 retry하지 않는다.
- predecessor PASS를 현재 lane PASS로 상속하지 않는다.
- status 이름만 보고 실행 사실을 추론하지 않는다.
- missing evidence를 hash, summary, 기대값으로 대체하지 않는다.
- first failure 뒤의 단계는 `NOT_RUN`으로 남기며 성공으로 간주하지 않는다.

## 11. Maintenance Ownership

- 사용자: 최종 승인과 위험 작업 권한
- ChatGPT CTO: 전략, decision curation, scope와 Codex prompt 설계
- Codex: 승인된 repository inspection, 문서 수정, test/실행, 결과 기록

이 protocol은 context layer, promotion rule, handoff lifecycle, approval matrix가 바뀔 때만 docs-only review로 갱신한다.

## Related Documents

- [KOAPTIX Context Index](KOAPTIX_CONTEXT_INDEX.md)
- [KOAPTIX Confirmed Decisions](KOAPTIX_CONFIRMED_DECISIONS.md)
- [WP-02/O-01 Checkpoint](../workstreams/wp02_o01/CHECKPOINT.md)
- [Operations and Prohibitions](../03_OPERATIONS_AND_PROHIBITIONS.md)
