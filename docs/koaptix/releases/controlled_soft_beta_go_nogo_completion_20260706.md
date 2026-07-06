# Controlled Soft Public Beta Go/No-Go Completion Note

Review marker: `P-KOAPTIX-CONTROLLED-SOFT-BETA-GO-NOGO-REVIEW.0`

## One-Line Conclusion

KOAPTIX is approved for `GO_CONTROLLED_SOFT_PUBLIC_BETA_WITH_WARNINGS` based on accumulated read-only evidence, but this is not an official launch, not a full public beta without warnings, not an official financial index, and not investment advice.

## Final Go/No-Go Status

- status: `GO_CONTROLLED_SOFT_PUBLIC_BETA_WITH_WARNINGS`
- decision type: controlled soft public beta with warnings
- exposure posture: limited / controlled audience exposure only
- official launch approval: `NO`
- full public launch approval: `NO`
- full public beta without warnings approval: `NO`
- investment advice readiness: `NO`
- deployment approval in this lane: `NO`

## Git State

- branch: `main`
- HEAD: `7594ed6c441352ccb52bc8ec90cea79036f87bfc`
- origin/main: `7594ed6c441352ccb52bc8ec90cea79036f87bfc`
- remote refs/heads/main: `7594ed6c441352ccb52bc8ec90cea79036f87bfc`
- ahead/behind: `0 0`
- staged files: `[]`
- tracked modified files before note creation: `[]`
- deleted files: `[]`
- top commit: `7594ed6 docs(koaptix): add private demo scenario pack`

## Evidence Reviewed

### Final Prelaunch Gate

- status: `PASS_WITH_WARNINGS_PRELAUNCH_GATE_READY_FOR_PRIVATE_DEMO_ONLY`
- `npm run build`: `PASS`
- `npm run lint`: `PASS_WITH_EXISTING_WARNINGS_NO_ERRORS`
- lint warnings: `50`
- lint errors: `0`
- local runtime smoke: `9 / 9 PASS`
- blockers: `NONE_FOUND_IN_READ_ONLY_GATE`

### Latest Direct Production Smoke

- status: `PASS_DIRECT_PRODUCTION_SMOKE_READY_FOR_CONTROLLED_SOFT_BETA_GO_REVIEW`
- production pages: `PASS`
- production APIs: `PASS`
- total page/API invocations: `20 / 30 cap`
- max measured HTTP/API duration: `2963ms`
- blockers: `[]`
- overall classification: `PASS_WITH_ACCEPTABLE_WARNINGS_NO_BLOCKERS`

Checked page paths:

- `/`
- `/ranking`
- `/ranking?complexId=4949`

Checked API paths:

- `/api/ranking?universe_code=KOREA_ALL&limit=1000`
- `/api/ranking?universe_code=SEOUL_ALL&limit=1000`
- `/api/ranking?universe_code=BUSAN_ALL&limit=1000`
- `/api/ranking?universe_code=GYEONGGI_ALL&limit=1000`
- `/api/rankings?universe_code=KOREA_ALL&limit=20`
- `/api/complex-detail?complexId=4949`

### Soft Public Beta Launch Copy Completion

- production observation: `PASS_PRODUCTION_COPY_VISIBLE`
- production currentness: `CURRENT_PUSHED_COPY_VISIBLE_ON_PRODUCTION`
- Soft Public Beta copy visible: `YES`
- estimated-data caveat visible: `YES`
- no-investment-advice caveat visible: `YES`
- KOREA_ALL universe explanation visible: `YES_RANKING`
- mobile clipping/overlap found: `NO`
- visual mojibake found: `NO`
- overclaiming risk: `PASS`

### Private Demo Scenario Pack

- status: `PRIVATE_DEMO_SCENARIO_ONLY`
- readiness before go/no-go review: `READY_FOR_PRIVATE_DEMO_WITH_WARNINGS`
- explicit non-decision before go/no-go review: `NOT_FULL_SOFT_PUBLIC_BETA_GO_YET`
- internal warning disclosure posture: present

### Product Strategy Canonical Notes

- status: `STRATEGY_NOTE_ONLY_NOT_IMPLEMENTED`
- `KOAPTIX 1000 / KOREA_ALL`: national authority board
- KOREA_ALL regional balancing: not artificially region-balanced
- regional ranking/index: future additive traffic boards
- SGG universes: future governed long-tail local boards
- Unranked Complex Discovery: future search trust layer, not rank expansion
- search discovery and ranking inclusion: separate
- ranking/data-quality standards: must not be lowered

### Retained Search And Detail Evidence

- exact-name search retained evidence: `PASS_PUSH_AND_PRODUCTION_OBSERVATION_FIXED`
- TOP1000 exact-name reliability gap: closed in production
- broad general-search expansion: not performed
- service searchability audit: `PASS_SERVICE_SEARCHABILITY_DEEP_SAMPLE_AUDIT_RECOVERED_WITHIN_GET_CAP`
- exact-name search sample: `9 / 9 PASS_EXPECTED_COMPLEX_FOUND`
- disabled/hold guard: `4 / 4 PASS_UNAVAILABLE_EMPTY_NO_MASQUERADE`
- complex detail route coverage: `PASS_COMPLEX_DETAIL_ROUTE_COVERAGE_AUDIT`
- detail GETs/pass count: `15 / 15`
- URL-state linkage support: `YES`

## Evidence Matrix

| Area | Classification | Evidence |
| --- | --- | --- |
| Git/release hygiene | `PASS` | `main`, HEAD, origin/main, and remote main aligned at `7594ed6c441352ccb52bc8ec90cea79036f87bfc`; no staged files; no tracked diff; no deleted files. |
| Build/lint | `PASS_WITH_WARNINGS` | Build PASS; lint PASS with 50 existing warnings and 0 errors. |
| Production pages | `PASS` | `/`, `/ranking`, and `/ranking?complexId=4949` passed direct smoke; beta/caveat/no-advice copy visible; no mojibake; no obvious first-viewport mobile clipping. |
| Production APIs | `PASS` | KOREA_ALL, SEOUL_ALL, BUSAN_ALL, and GYEONGGI_ALL TOP1000 APIs returned 1000 `live_latest` rows with `degraded=false`; tactical rankings returned 20 rows; detail API returned data. |
| Search/detail/user journeys | `PASS_WITH_ACCEPTABLE_WARNINGS` | Detail freshly checked; command palette/search latest interaction was not freshly rechecked, but retained accepted production copy/search/detail evidence passes. |
| Copy/risk posture | `PASS` | Beta label, estimated-data caveat, no-investment-advice caveat, and KOREA_ALL non-region-balanced wording visible; overclaiming risk PASS. |
| Known warnings | `ACCEPTABLE_FOR_CONTROLLED_BETA_WITH_INTERNAL_DISCLOSURE` | Command palette/search not freshly rechecked in latest direct smoke; exact-name search and disabled/hold guard rely on retained accepted evidence; lint warnings remain 50; max measured HTTP/API duration 2963ms. |
| Safety gates | `PASS` | No DB write, SQL, helper, read-model refresh, source import, code change, deploy, source-of-truth change, regional ranking/index implementation, or unranked discovery implementation. |

## Approved Scope

This completion note records approval for:

- controlled soft public beta with warnings
- limited / controlled audience exposure
- beta posture visible to users
- estimated-data caveats visible to users
- no-investment-advice caveats visible to users
- ranking-first apartment capital-flow terminal positioning
- KOREA_ALL as national authority board, not artificially region-balanced
- retained search/detail evidence used as supporting evidence, with limitations disclosed

## Not Approved Scope

This completion note does not approve:

- official launch
- full public launch
- full public beta without warnings
- official financial index
- government-grade statistic
- investment advice or investment product
- real-time exact valuation
- all apartments searchable/ranked
- regional ranking/index implementation
- Unranked Complex Discovery implementation
- DB write
- deploy
- registry/exposure change
- ranking methodology change
- source-of-truth change
- using `public.koaptix_latest_board_read_model` as rank source of truth
- bypassing `koaptix_rank_snapshot -> v_koaptix_universe_rank_history_dynamic -> v_koaptix_latest_universe_rank_board_u`

## Warnings / Internal Disclosures

These warnings must be disclosed internally before controlled beta use:

- Command palette/search interaction was not freshly rechecked in the latest direct smoke because Browser MCP/Playwright tooling was unavailable.
- Exact-name search was not freshly rechecked in the latest direct smoke, but retained accepted production evidence says the TOP1000 exact-name reliability gap is fixed.
- Disabled/hold guard was not freshly rechecked in the latest direct smoke, but retained accepted searchability evidence says disabled/hold guard returned unavailable empty payloads without KOREA_ALL masquerade.
- Lint remains PASS with 50 existing warnings and 0 errors.
- Max measured HTTP/API duration in the latest direct smoke was `2963ms`.
- This review did not deploy or change exposure; it was a decision review only.
- Regional ranking/index and Unranked Complex Discovery are future lanes and must not be presented as implemented.

## External Wording Guardrails

Approved wording:

- controlled soft public beta with warnings
- limited beta
- estimated market-cap ranking
- ranking-first apartment capital-flow terminal
- reference data, not investment advice
- estimated residential asset value

Forbidden wording:

- official launch
- full public launch
- official financial index
- government statistic
- investment advice
- investment product
- real-time exact valuation
- guaranteed market value
- all apartments are searchable/ranked
- regional ranking/index is implemented
- Unranked Complex Discovery is implemented

## Fixed KOAPTIX Principles

- KOAPTIX is a nationwide apartment capital-flow ranking terminal.
- Service is ranking-first.
- KOAPTIX 500 is the flagship main board.
- TOP1000 is the wider public ranking board.
- Search is a companion exploration path.
- Home is a lightweight tactical board.
- Ranking/TOP1000 is the full-board exploration flow.
- KOAPTIX Index and KOAPTIX Ranking must not be mixed in public wording.
- KOAPTIX Index = market aggregate signal.
- KOAPTIX Ranking = individual apartment complex ranking.
- KOREA_ALL engine is a proven success asset; do not redesign it.
- Multi-universe expansion is additive only.
- Universe rank is re-ranked inside each universe, not a simple filtered national rank.
- Source-of-truth chain remains `koaptix_rank_snapshot -> v_koaptix_universe_rank_history_dynamic -> v_koaptix_latest_universe_rank_board_u`.
- `public.koaptix_latest_board_read_model` is a derived serving cache, not rank source of truth.
- Do not bypass source of truth.
- Do not infer board readiness from membership alone.

## Safety Boundary

- DB connection attempted: `NO`
- SQL / DDL / DML attempted: `NO`
- DB data write attempted: `NO`
- helper/materializer/refresh/import attempted: `NO`
- code modified: `NO`
- docs modified outside the single target completion note and `.handoff`: `NO`
- package or lockfile modified: `NO`
- env modified or printed: `NO`
- migrations modified: `NO`
- registry/exposure modified: `NO`
- regional ranking/index implemented: `NO`
- unranked discovery implemented: `NO`
- ranking methodology changed: `NO`
- source-of-truth changed: `NO`
- stage/commit/push/deploy/tag attempted: `NO`
- official launch claimed: `NO`
- full public beta without warnings claimed: `NO`
- official financial index claimed: `NO`
- investment-advice readiness claimed: `NO`
- secrets logged: `NO`

## What This Decision Does Not Do

This decision does not deploy anything, change production exposure, write to any database, run SQL, execute helpers, refresh read models, import source data, change ranking methodology, change the source-of-truth chain, change registry exposure, implement regional ranking/index, implement Unranked Complex Discovery, stage files, commit files, push files, or tag a release.

It records only the go/no-go review result for controlled soft public beta with warnings.

## Recommended Next Lane

`P-KOAPTIX-CONTROLLED-SOFT-BETA-GO-NOGO-COMPLETION-NOTE-COMMIT.0`

Purpose: commit this docs-only completion note after CTO review.

Allowed scope for that next lane should be limited to staging and committing:

- `docs/koaptix/releases/controlled_soft_beta_go_nogo_completion_20260706.md`

## Do-Not-Run List

Until a future lane explicitly authorizes otherwise:

- Do not connect to DB.
- Do not run SQL, DDL, or DML.
- Do not execute helpers, materializers, read-model refreshes, finalizers, loaders, or source imports.
- Do not inspect `manual_sources`, `_source_inbox`, or root CSV contents.
- Do not modify API routes, `src/lib/koaptix`, package files, env files, migrations, registry/exposure files, or ranking methodology.
- Do not bypass `koaptix_rank_snapshot -> v_koaptix_universe_rank_history_dynamic -> v_koaptix_latest_universe_rank_board_u`.
- Do not use `public.koaptix_latest_board_read_model` as rank source of truth.
- Do not implement regional ranking/index or Unranked Complex Discovery under this completion note lane.
- Do not claim official launch, official financial index, or investment-advice readiness.
- Do not stage, commit, push, tag, or deploy without a dedicated approval lane.

## Resume Point

Resume with CTO review of this docs-only controlled soft public beta go/no-go completion note. If accepted, the next bounded action is `P-KOAPTIX-CONTROLLED-SOFT-BETA-GO-NOGO-COMPLETION-NOTE-COMMIT.0`.
