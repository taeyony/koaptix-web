# KOAPTIX Operating Principles Flexibility Update

## Status

- Status: ACTIVE OPERATING PRINCIPLE UPDATE
- Date: 2026-06-13
- Applies to: ChatGPT CTO, Codex, handoff v1, future lane planning, rollout planning

## One-line Principle

"KOAPTIX operating rules are safety tools, not immutable laws. If revising a rule improves both efficiency and stability, the rule should be revised deliberately."

## Why This Update Exists

Existing rules reduced risk, context drift, accidental DB writes, accidental deploys, and patch-on-patch contamination. That remains valuable.

The project has matured through repeated DB, registry, smoke, and release lanes. Some low-risk repeated work can now be bundled safely, while some high-risk work must remain split.

The goal is faster execution without weakening safety.

## Updated Operating Interpretation

- Default to existing handoff v1 safety protocol unless there is a clear reason to adapt.
- One-lane-at-a-time remains the default, not an absolute law.
- Rules can be updated when the new rule is clearer, safer, and more efficient.
- ChatGPT CTO should explicitly state when it is preserving, relaxing, or strengthening a rule.
- Codex should follow the current lane instruction exactly.
- Codex must not independently relax safety rules.
- User approval remains required for risky actions.

## Lane Granularity Policy

| Risk level | Examples | Lane strategy |
|---|---|---|
| LOW | docs-only notes, read-only inventory, artifact summaries, status-safe smoke rerun, repeated verified report generation | May be bundled when bounded and clearly scoped |
| MEDIUM | simple registry patch, build/lint verification, commit-prep, repeated SGG rollout prep | Can be bundled if prior pattern is proven and affected files are narrow |
| HIGH | DB write, helper/materializer execution, source-of-truth change, rollback/revert, macro universe enablement, multi-file API patch, production 5xx triage | Must remain split with explicit approval gates |

## What May Be Bundled In Future

- read-only inventory + artifact summary + recommendation
- docs-only completion note + handoff report
- simple registry patch + build/lint
- repeated SGG readiness review + registry patch plan
- push + bounded status-safe production smoke
- status-safe production smoke + release completion note if smoke passes and prior approval scope allows it

## What Must Remain Separated

- DB write
- helper/materializer execution
- source-of-truth change
- rollback/revert
- JEONBUK_ALL or other macro universe enablement
- KOREA_ALL read path changes
- multi-file API behavior changes
- production 5xx or guardrail regression triage
- anything involving secrets/env/config/deploy settings

## Model Allocation Policy

- ChatGPT CTO using GPT-5.5 very high reasoning is sufficient for strategy, prompt design, review, and low/medium-risk planning.
- Codex using GPT-5.5 extra high is suitable for repo inspection, exact file patching, build/lint verification, artifact creation, and bounded smoke scripts.
- Recommend higher-performance review before:
  - DB write approval
  - helper/materializer execution
  - rollback/revert
  - production 5xx triage
  - source-of-truth change
  - registry exposure of broad/macro universes such as JEONBUK_ALL
  - risky whole-file replacement
  - conflicting evidence or architecture decision

## Required Prompt Additions Going Forward

Every KOAPTIX Codex prompt should include:

- Recommended model allocation
- Why this lane is split or bundled
- Explicit approval scope
- Non-negotiable prohibitions
- Success criteria
- Stop rule
- Non-developer Korean status summary requirement

## Non-developer Korean Explanation

우리가 만든 규칙은 프로젝트를 안전하게 굴리기 위한 장치입니다. 하지만 규칙 때문에 속도가 느려지거나 관리 비용이 커진다면, 더 나은 방식으로 바꿀 수 있습니다. 앞으로는 위험한 일은 더 잘게 쪼개고, 반복적이고 안전한 일은 묶어서 처리합니다. 핵심은 원칙 자체를 지키는 것이 아니라 KOAPTIX를 더 빠르고 안전하게 완성하는 것입니다.

## Final Rule

"Preserve safety. Improve efficiency. Update the process when the process itself becomes the bottleneck."
