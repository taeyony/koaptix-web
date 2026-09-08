# KOAPTIX Project Memory v2 Operating Rules

- Document status: `PROJECT_MEMORY_V2_COMPLETE_MONITORED`
- Bootstrap candidate provenance: `P-KOAPTIX-PROJECT-MEMORY-V2-BOOTSTRAP-INVENTORY-AND-CANDIDATE-DESIGN.0`
- Accepted bootstrap source-write run: `P-KOAPTIX-PROJECT-MEMORY-V2-BOOTSTRAP-EXACT-THREE-FILE-SOURCE-WRITE.0`
- Accepted bootstrap commit run: `P-KOAPTIX-PROJECT-MEMORY-V2-BOOTSTRAP-EXACT-THREE-FILE-STAGE-AND-COMMIT.0`
- Accepted bootstrap source commit: `dfe0584f8a9a16dabfad3e129c465d08b59d5f3e`
- Accepted pre-promotion state: `CANONICAL_ACTIVE_PARTIAL`, classified by `P-KOAPTIX-PROJECT-MEMORY-V2-POST-COMMIT-NEXT-STATE-DECISION-PREPARATION.0`
- Promotion candidate provenance: `P-KOAPTIX-PROJECT-MEMORY-V2-PARTIAL-TO-COMPLETE-MONITORED-PROMOTION-CANDIDATE-SYNTHESIS.0`
- Promotion boundary: this `COMPLETE_MONITORED` candidate has no canonical authority while it remains under `.handoff`; it applies only after an exact separately authorized promotion source-write lane replaces the tracked target and local postwrite verification passes.
- Relationship to existing governance: this document complements, and does not supersede, `KOAPTIX_CONTEXT_INDEX.md`, `KOAPTIX_CONFIRMED_DECISIONS.md`, or `KOAPTIX_CONTINUITY_AND_HANDOFF_PROTOCOL.md`.

## 1. Purpose

Project Memory v2 provides a small repository-native record of accepted capability state so a new CTO, Codex worker, or chat can begin from the latest accepted authority without repeating sealed work. It records current status, evidence references, hashes, accepted facts, reopen conditions, prohibited repeats, supersession, and next allowed actions. It is not a production observer, execution framework, general evidence warehouse, or substitute for the existing living documents.

## 2. Registry role and status vocabulary

`KOAPTIX_STATE_REGISTRY.yaml` is the canonical capability-state record after its separately authorized source write. The Context Index remains the authority-routing entrypoint, Confirmed Decisions remains the stable decision ledger, workstream checkpoints remain scoped state records, and `.handoff` remains the current-lane execution workspace.

The capability status vocabulary is exactly:

- `COMPLETE_SEALED`: completed and not reopened without a documented trigger.
- `COMPLETE_MONITORED`: completed, with normal operational evolution monitored without redesign.
- `PARTIAL`: valid work exists, but the capability is incomplete.
- `BLOCKED`: work cannot safely proceed until a specific condition is resolved.
- `NEEDS_VERIFICATION`: implementation may exist, but accepted evidence is insufficient.
- `SUPERSEDED`: historical authority is preserved but is no longer current.

Decision-log statuses belong to a separate domain and must not be silently translated into capability statuses.

## 3. Evidence inheritance and sealed capability use

Accepted repository evidence and accepted run artifacts are referenced, not reproduced in full. A sealed record is consumed as current authority until a precise reopen condition is met. Missing historical metadata is recorded as `null` with an explanation; it is never reconstructed from a hash, summary, or chat memory.

## 4. Reopening protocol

Every reopening must record the exact trigger, new contradictory evidence, affected capability, and bounded reopening scope. A narrow issue does not reopen a whole chain. If competing authority cannot be resolved by the Context Index precedence rules, stop for CTO selection rather than creating another registry or silently choosing.

## 5. Lane and source-write authorization boundaries

One lane answers one bounded question. Diagnosis, correction, production execution, source write, staging, commit, push, and deploy are distinct authorities unless an exact user authorization explicitly and safely combines named actions. A candidate or accepted design does not authorize its own tracked write. Project Memory source write requires an exact file list, target-state expectations, candidate byte counts and hashes, and a separate exact user authorization. Commit, push, and deploy remain separately unauthorized.

## 6. Conflict and living-document handling

The Project Charter, Current Confirmed Structure, Operations and Prohibitions, and Master Living Source of Truth remain accepted documents. Bootstrap does not silently rewrite them. A conflict record must name the exact paths and sections, give a bounded summary, identify newer accepted evidence if available, classify the issue, and defer any unrelated cleanup to a separately authorized lane.

## 7. Official anti-overvalidation rules

### PMV2-OV-001 — SAFETY / SEMANTIC / EVIDENCE-CONVENIENCE CLASSIFICATION

Every discovered issue, proposed proof, and blocking gate must be classified as `SAFETY`, `SEMANTIC`, or `EVIDENCE_CONVENIENCE`.

`SAFETY` examples include duplicate-write prevention, wrong production target, unauthorized mutation, retry or replay, commit ambiguity, cleanup failure, and persistent privilege residue.

`SEMANTIC` examples include wrong calculation, wrong source of truth, wrong publication identity, and wrong contract result.

`EVIDENCE_CONVENIENCE` examples include formatting differences, reassurance proof, easier artifact comparison, duplicate proof of an accepted fact, and presentation-only hash mismatch. Evidence-convenience issues must not independently block production execution or widen a production mutation lane.

### PMV2-OV-002 — BLOCKING GATE JUSTIFICATION RULE

A new hard blocking gate is allowed only when its failure directly prevents a concrete harmful outcome such as unauthorized write, duplicate durable write, wrong database or target execution, wrong semantic publication, unsafe commit, retry or replay, cleanup failure, or persistent role or ACL residue.

The author must be able to state: “If this predicate is false and execution continues, this exact harmful production outcome can occur: ...” If that statement cannot be completed concretely, the predicate should normally be a warning, non-blocking evidence, or inherited accepted evidence—not a hard production blocker.

### PMV2-OV-003 — ACCEPTED EVIDENCE INHERITANCE

Accepted evidence is inherited. Do not rerun an accepted qualification because a new chat started, a new CTO took over, a new wrapper was created, or reassurance is desired. Rerun only when a dependency relevant to that proof changed or a documented reopen condition was met.

Examples: if a frozen runtime is unchanged, do not rerun runtime suites; if sealed function source is unchanged, do not rerun source qualification; if a closed ACL correction is unchanged, do not rerun broad privilege forensic.

### PMV2-OV-004 — LIVE PREFLIGHT CHECKS MUTABLE LIVE FACTS ONLY

Live production preflight focuses only on facts that may have changed since accepted evidence and whose drift threatens execution. Immutable local facts are checked locally by hash. Live preflight must not become a second full qualification system and must remain materially simpler than the runtime it protects.

Preferred flow:

```text
LOCAL HASH / AUTHORITY GATE
-> MINIMAL LIVE MUTABLE-STATE GATE
-> QUALIFIED RUNTIME
-> DURABLE VERIFIER
```

### PMV2-OV-005 — REPRESENTATION IS NOT SEMANTICS

Textual or serializer/deparser representation differences are not automatically semantic drift. Whitespace, parenthesization, pretty-print mode, and non-semantic serializer variation are representation differences. When exact text is intentionally contractual, producer and evaluator must use the same canonical representation mode.

The accepted M906 view-definition identity mode is `PG_GET_VIEWDEF_PRETTY_TRUE`. Do not compare a true-mode accepted hash with false-mode deparser output.

### PMV2-OV-006 — PRESERVE SANITIZED FAILURE OBSERVATION

A read-only diagnostic that safely obtains a result must preserve enough sanitized failed values to identify the selected failure surface. Do not collapse component predicates into an opaque Boolean and discard the failed row. Preserve which predicate failed, the safe component values needed to interpret it, snapshot scope, and accounting, while excluding secrets, credentials, and unsafe raw environment values.

### PMV2-OV-007 — ONE LANE / ONE QUESTION

A diagnostic lane answers one bounded question, a correction lane fixes one already selected defect, and an execution lane executes an already qualified contract. Do not diagnose and correct in the same unauthorized lane, discover new forensic scope during production execution, or turn a narrow defect into a broad audit.

When an unexpected new safety or semantic defect is found, fail closed, preserve evidence, and stop for CTO review.

### PMV2-OV-008 — NO REASSURANCE RERUNS

“Run it again just to be sure” is not a valid reason to repeat accepted qualification. A rerun requires a relevant input, source, or authority change; contradictory accepted evidence; or a documented reopen trigger. Otherwise, reuse accepted evidence.

### PMV2-OV-009 — PROOF COMPLEXITY BUDGET

Validation machinery must not become more operationally complex than the risk it controls. CTO must simplify when validation repeatedly blocks healthy production, creates more follow-up lanes than product or runtime defects, duplicates an invariant across layers, or makes preflight comparable in complexity to execution.

Preserve safety and semantic controls; remove or downgrade evidence-convenience controls.

### PMV2-OV-010 — ROOT CAUSE CLOSURE

After an exact root cause is selected and its correction is durably verified, mark the root cause closed. Do not reopen the broad hypothesis space without contradictory evidence. A later issue begins from the latest accepted state, not from every historical possibility.

### PMV2-OV-011 — PRECONDITION VS OUTCOME

Do not confuse a preflight proof with a durable execution outcome. The strongest safety evidence is generally a qualified runtime, conditional commit, durable verifier, and at-rest restoration—not an ever-expanding preflight. Preflight rejects obvious unsafe starting states; it does not attempt to prove the entire future execution.

### PMV2-OV-012 — MINIMAL CORRECTION OVER REDESIGN

When the selected defect is narrow, apply the smallest correction that closes it. The accepted M906 example changed exactly two evaluator arguments from `pg_get_viewdef(..., false)` to `pg_get_viewdef(..., true)`. That two-flag contract defect did not justify a production-view rewrite, generalized canonicalizer, broad new forensic, or runtime redesign.

### PMV2-OV-013 — SEALED CAPABILITY PRESUMPTION

A `COMPLETE_SEALED` capability is presumed correct, and the burden of proof is on reopening it. A new worker or chat may inspect its registry and evidence references but should not reproduce its full qualification by default.

### PMV2-OV-014 — ARCHITECTURE PROPORTIONALITY / ANTI-OVERENGINEERING GATE

1. **Two consecutive architecture BLOCKs.** If TWO CONSECUTIVE terminal BLOCK results occur within the same architecture family and both arise from architecture, safety or feasibility requirements, the next deeper implementation or design lane is PROHIBITED until a mandatory ARCHITECTURE PROPORTIONALITY REVIEW is completed. Incidental tooling, access or evidence-convenience failures do not by themselves count as architecture BLOCKs; record the classification and concrete reason.

2. **Same-family definition.** Lanes belong to the same architecture family when they progressively attempt to satisfy the same core invariant, trust model or runtime architecture. Renaming a lane or moving the same problem into a narrower descendant does not create a new family.

3. **Required review.** The review must explicitly evaluate actual product/business failure impact; data-integrity impact; whether the invariant is truly required; exactly-once execution versus idempotent/exactly-one-effect alternatives; implementation and runtime complexity; principal, secret and worker counts; Founder operating and failure-recovery burden; simpler safe alternatives; and whether an earlier CLOSED contract should be retained, simplified, superseded or retired prospectively. Preserve accepted history and record any proposed policy delta.

4. **No automatic deeper lane.** After the second qualifying BLOCK, do not automatically issue a .1, .2, .3 or another narrower descendant lane. Complete the proportionality review first. A lane rename or minor implementation variation does not evade this gate.

5. **Technical PASS does not force adoption.** A hardened architecture that later achieves technical PASS after the trigger has proved feasibility only. That PASS does not automatically authorize Production adoption, provisioning, source write or deployment until the proportionality decision is closed; all separately scoped mutation and release approvals still apply.

6. **Safety before convenience, proportionality before maximalism.** Do not lower real data-integrity requirements for convenience. Do not impose financial-settlement-grade exactly-once guarantees on every recoverable data-pipeline failure without an explicit justification tied to its actual harmful consequence. Existing safety, semantic, evidence and authorization gates remain in force.

7. **Default evaluation order for KOAPTIX data pipelines.** Unless actual risk proves otherwise, first evaluate idempotent/reconcilable execution + at-most-one canonical effect + immutable/auditable state before escalating to exactly-once execution + non-reusable one-shot runtime capabilities. This is an obligation to compare safe alternatives, not permission for blind retry, canonical overwrite, partial publication or unchecked simplification.

8. **Counter reset.** The architecture-BLOCK counter and triggered review gate reset only when the architecture family is materially changed/simplified and CTO accepts the new boundary, or a proportionality review explicitly justifies retaining the hardened architecture. A lane rename, minor implementation variation or subsequent technical PASS alone does not reset it.

9. **Founder/CTO visibility.** The terminal result after the second qualifying architecture BLOCK must explicitly state MANDATORY_PROPORTIONALITY_REVIEW_TRIGGERED, identify the family and the two qualifying BLOCKs, and state that deeper descendant work cannot continue before the mandatory review. Do not silently proceed.

## 8. Maintenance protocol

- Update Project Memory only under an explicitly scoped lane.
- Record the latest accepted evidence and preserve exact source, run, hash, and status distinctions.
- Preserve historical supersession; do not delete sealed history because a newer capability exists.
- Use `SUPERSEDED` when active authority is replaced and link the replacement authority.
- Add precise reopen conditions and update `next_allowed_actions` when capability state changes.
- Do not rerun accepted proof without a documented trigger.
- Do not connect to production merely to update Project Memory documentation.
- Reference repository evidence and accepted run artifacts; do not reproduce raw evidence in full.
- Never place secrets, credentials, connection strings, or raw environment values in Project Memory.
- Record conflicts without silently changing living documents or unrelated capability records.
- Keep the registry deliberately small; add a capability only when current authority, status, and evidence can be justified without speculation.
- Require a separately authorized source-write manifest for tracked changes, and separately authorize staging, commit, push, and deploy.
