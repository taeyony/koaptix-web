# KOAPTIX_STANDARD_SGG_ROLLOUT_PROCESS

## Document Status

- Status: docs-only standard process
- This document is not a release approval.
- This document is not DB write approval.
- This document is not JEONBUK_ALL or macro universe approval.
- This document is not a substitute for ChatGPT CTO review.
- This document converts the SGG_52111 lesson into a reusable operating process for future SGG public exposure.

## Purpose

This process makes future SGG rollout work repeatable, bounded, and reviewable.

It exists to reduce fragmented manual work while preserving the safety gates that protected the SGG_52111 rollout:

- Candidate readiness is checked before exposure.
- Registry exposure remains explicit.
- Command Palette search discovery is treated as part of public usability.
- Code, commit, push, production smoke, manual QA, and completion notes can be split or bundled according to risk.
- High-risk work remains gated even when low-risk repeated work is bundled.

## Core Principles

- KOREA_ALL is a proven asset; do not redesign or destabilize it.
- Multi-universe and SGG expansion is additive only.
- Registry-enabled status is required for public exposure.
- Snapshot/latest board evidence is required for service readiness.
- Search discovery must include region shortcut behavior where the SGG is public.
- Universe rank must be recalculated inside each universe, not filtered from KOREA_ALL.
- Existing service stability outranks new exposure.
- JEONBUK_ALL or any other macro universe enablement is a separate macro-readiness decision.
- Registry-disabled SGGs must not be marked public just because DB rows or artifacts exist.
- The source of truth path remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

## SGG_52111 Lesson

SGG_52111 showed that a rollout can be data-ready and API-healthy while still incomplete from a user discovery perspective.

The successful closure required two related but separate outcomes:

- Public registry exposure: `SGG_52111` became enabled in the public registry, with production API and page smoke passing.
- Command Palette discovery: searches for `전주`, `전주시`, `완산구`, and `전주시 완산구` surfaced the `전주시 완산구` region shortcut.

The standard process below preserves both parts.

## Standard SGG Rollout Phases

### Phase A: Candidate Selection And Readiness Audit

Goal: prove the candidate is worth preparing before exposing it.

Required audit items:

- Target SGG code, for example `SGG_<5 digits>`.
- Korean display label.
- Legal district code or lawd code.
- Snapshot/latest board evidence.
- Latest board date.
- Ranking row count.
- Full-board row count when available.
- API readiness evidence.
- Data completeness notes.
- Source gap notes.
- Parent macro universe impact.
- Blocker list.

Stop if any of these are unclear:

- The candidate code is ambiguous.
- The label is mojibake or mismatched.
- Latest board evidence is missing.
- The source-of-truth path is bypassed.
- Parent macro exposure is being assumed.

### Phase B: Registry Exposure Planning

Goal: define exactly what public exposure would change before editing code.

Checklist:

- Confirm a registry-disabled SGG falls back or remains hidden before exposure.
- Verify canonical universe code.
- Verify Korean label and aliases.
- Verify no mojibake in user-facing labels.
- Verify parent macro universe remains disabled unless separately approved.
- Identify exact likely file paths, usually `src/lib/koaptix/universes.ts`.
- Identify whether Command Palette discovery also needs a patch.
- Require code patch approval before mutation.

Planning must distinguish:

- DB or board readiness
- Registry exposure
- API health
- UI discoverability
- Filter default listing UX policy

### Phase C: Source Patch Lane, When Required

Goal: make the minimum approved source change.

Allowed only with explicit approval:

- Add or enable the target SGG in the public registry.
- Correct the target Korean label or aliases.
- Add Command Palette region discovery if the target cannot be found by regional terms.
- Adjust null-safe/build-safe logic directly needed for the approved exposure.

Still prohibited unless separately approved:

- DB write.
- Helper/materializer/latest-board execution.
- Source-of-truth path change.
- JEONBUK_ALL or parent macro enablement.
- Broad registry exposure.
- API route redesign.
- KOREA_ALL behavior redesign.

### Phase D: Build And Local Verification

Goal: prove the approved source patch is safe before commit.

Required when source changes occur:

- Run the project build gate, usually `npm run build`.
- Run lint if the lane requires it, usually `npm run lint`.
- Confirm no accidental source broadening.
- Confirm only approved files changed.
- Confirm JEONBUK_ALL or parent macro flags did not change.

Production smoke is not part of this phase unless the lane explicitly approves production GETs.

### Phase E: Commit Lane

Goal: persist exactly the approved patch.

Rules:

- Commit only approved files.
- Do not use `git add .`.
- Do not use `git add -A`.
- Do not stage `.handoff/` files unless explicitly approved.
- Do not stage outputs or unrelated local docs unless explicitly approved.
- Use the exact approved commit message.
- Verify the commit contains exactly the intended files.

### Phase F: Push And Production Smoke Lane

Goal: publish the approved commit and verify status-safe production health.

Rules:

- Push requires separate approval.
- Treat deployment as push-triggered automatic deployment unless a manual deploy command is explicitly approved.
- Do not run a manual deploy command by default.
- Run a bounded, sequential, status-safe production smoke matrix after push.
- Do not dump full response bodies.
- Record only status, duration, JSON parse success, row counts, universe metadata, and small non-secret metadata.
- Verify older proven universes still work.
- Verify disabled parent macro fallback behavior remains safe.

Stop if any persistent 5xx, timeout, JSON parse failure, SGG regression, or macro exposure regression appears.

### Phase G: Manual QA

Goal: verify the user-facing release, not only API health.

Manual QA should include:

- Command Palette search by full label.
- Command Palette search by major city name.
- Command Palette search by sigungu name.
- Command Palette search by short or common user query.
- `/ranking?universe=SGG_<code>` page load.
- Ranking board row count visible or API-backed.
- Search results for the target universe.
- Map behavior or map fallback where applicable.
- Disabled macro fallback where relevant.
- TOP1000 or existing primary navigation still works where affected.

Default filter list exposure is a separate UX policy unless the lane explicitly includes it.

### Phase H: Completion Note

Goal: close the rollout with durable evidence.

The completion note should include:

- Release status.
- Target universe code and label.
- Commit hash.
- Changed files.
- Production smoke evidence.
- Manual QA evidence.
- Rollback required yes/no.
- Rollback attempted yes/no.
- JEONBUK_ALL remains disabled unless separately approved.
- Known notes and non-blockers.
- Recommended next lane.
- Non-developer Korean summary.

## Required Readiness Evidence Checklist

Use this checklist before public exposure:

- [ ] Target universe code confirmed.
- [ ] Korean display label confirmed.
- [ ] No mojibake in label or aliases.
- [ ] Lawd code or district code confirmed.
- [ ] Board latest date confirmed.
- [ ] Ranking row count confirmed.
- [ ] Source of truth path confirmed:
  `koaptix_rank_snapshot -> v_koaptix_universe_rank_history_dynamic -> v_koaptix_latest_universe_rank_board_u`.
- [ ] Rankings API response checked when GET smoke is approved.
- [ ] Full-board ranking route response checked when available and approved.
- [ ] Search route response checked when approved.
- [ ] Map route response checked when relevant and approved.
- [ ] Invalid or disabled universe fallback behavior checked.
- [ ] KOREA_ALL regression checked.
- [ ] SEOUL_ALL, BUSAN_ALL, and GYEONGGI_ALL regression checked when risk justifies it.
- [ ] Parent macro universe remains disabled unless separately approved.
- [ ] No accidental macro enablement.
- [ ] No source-of-truth bypass.

## Command Palette Discovery Checklist

For a public SGG, Command Palette discovery is part of release usability.

Required checks:

- [ ] Region shortcut result appears.
- [ ] Full target label query works.
- [ ] Major city name query works when applicable.
- [ ] Sigungu name query works.
- [ ] Common partial query works.
- [ ] No mojibake spelling appears in the user-facing result.
- [ ] Selection routes to `/ranking?universe=<code>&q=<query>`.
- [ ] Disabled parent macro does not appear as enabled/selectable.
- [ ] Existing apartment complex search still works.
- [ ] TOP1000 or primary shortcut still works if visible in the palette.

Default filter list exposure is a separate UX policy decision and should not be silently added to a search-discovery lane.

## Approval Gate Matrix

| Gate | Who approves | Allowed | Still prohibited | Stop condition |
|---|---|---|---|---|
| Read-only audit | ChatGPT CTO lane | Inspect repo, docs, prior artifacts, approved GET evidence | DB write, helper execution, code mutation | Missing readiness evidence or conflicting facts |
| Docs-only planning | ChatGPT CTO lane | Create planning or process docs and handoff reports | Source changes, DB, push, deploy | Target doc scope expands beyond approval |
| Code patch | ChatGPT CTO lane plus user approval for risk | Modify exact approved files | Broad source changes, DB, helper, macro enablement | Unexpected diff or build-blocking uncertainty |
| Build/test | ChatGPT CTO lane | Run approved local build/lint/test commands | Production GET unless approved, DB writes | Nonzero required gate or unexplained regression |
| Commit | ChatGPT CTO lane | Stage and commit exact approved files | `git add .`, `git add -A`, unrelated files | Staged file mismatch |
| Push | ChatGPT CTO lane | `git push origin main` for approved commit | Manual deploy, extra commit, rollback | Push failure or origin mismatch |
| Production smoke | ChatGPT CTO lane | Bounded status-safe GET checks | Full response dumps, secrets, destructive actions | 5xx, timeout, JSON parse failure, identity regression |
| DB write | Explicit high-risk approval | Exact approved write plan | Any unapproved SQL or schema change | Counts mismatch, uncertain target, missing rollback plan |
| Helper/materializer | Explicit high-risk approval | Exact approved helper/materializer execution | Ad hoc script mutation, partial unsafe refresh | Unexpected output, partial data, source mismatch |
| Rollback/revert | Explicit high-risk review | Exact approved rollback/revert plan | Panic rollback, unrelated revert | Insufficient evidence or new user-facing risk |
| Macro universe enablement | Separate macro-readiness lane | Approved macro registry exposure only | JEONBUK_ALL by implication, broad registry exposure | Missing latest-board evidence or fallback regression |

## Prohibited Actions

These actions require separate explicit approval and must not be smuggled into SGG rollout lanes:

- Unapproved DB write.
- Unapproved DB SELECT when the lane is docs-only or no-DB.
- Unapproved helper/materializer/latest-board execution.
- JEONBUK_ALL enablement without a macro-readiness lane.
- Broad registry exposure.
- Source-of-truth bypass.
- Legacy or membership direct source fallback.
- Sealed wrapper revival.
- KOREA_ALL engine redesign.
- Treating a universe board as a filtered KOREA_ALL rank list.
- `git add .`.
- `git add -A`.
- Manual deploy without approval.
- Pushing unreviewed commits.
- Rollback/revert without explicit high-risk review.
- Printing or persisting secrets, tokens, env values, or credentials.

## Standard Smoke Matrix Template

Use this as a template only after production GET smoke is approved.

Target SGG:

- `GET /api/rankings?universe=SGG_<code>`
  - Expect HTTP 200.
  - Expect JSON parse success.
  - Expect rendered universe `SGG_<code>` or equivalent metadata.
  - Expect row count greater than 0.
- `GET /api/ranking?universe=SGG_<code>`
  - Expect HTTP 200.
  - Expect JSON parse success.
  - Record latest board date and row count when present.
- `GET /api/search?universe=SGG_<code>&q=<label_part>`
  - Expect HTTP 200.
  - Expect JSON parse success.
  - Expect local or target results when data supports it.
- `GET /ranking?universe=SGG_<code>`
  - Expect HTTP 200.

Fallback and regression checks:

- Disabled macro fallback check when relevant, for example `JEONBUK_ALL`.
- Invalid universe fallback check when relevant.
- `KOREA_ALL` rankings regression.
- `SEOUL_ALL` rankings regression when risk justifies it.
- `BUSAN_ALL` rankings regression when risk justifies it.
- `GYEONGGI_ALL` rankings regression when risk justifies it.
- Map route check when the target public surface includes map.

Smoke evidence should record:

- HTTP status.
- Duration in milliseconds.
- JSON parse success.
- Row count.
- Requested and rendered universe metadata.
- Fallback mode or fallback target when present.
- No full response bodies.
- No cookies, secrets, tokens, env values, or credentials.

## Non-developer Korean Operating Summary

새 시군구를 공개할 때는 먼저 데이터가 실제로 서비스에 보일 준비가 되었는지 확인합니다. 그 다음 registry에 열어도 되는지 따로 승인받고, 검색창에서 지역 바로가기가 보이는지도 확인합니다. 빌드, 커밋, push, 운영 smoke는 위험도가 다르므로 필요하면 분리해서 진행합니다. 전북 전체 같은 큰 범위 공개는 개별 시군구 공개와 다른 문제이므로 반드시 별도 승인과 준비 확인이 필요합니다.

## Next Use

Use this process before the next SGG public exposure.

Recommended next lane:

- Docs commit-only closeout for `docs/koaptix/KOAPTIX_STANDARD_SGG_ROLLOUT_PROCESS.md`.

Future candidate selection should remain separate from this process document unless explicitly approved.

