# KOAPTIX Periodic Production Smoke Checklist

## Status and Scope

- This is a docs-only checklist based on P-PRODSMOKE.1 planning.
- No production HTTP GET was executed while creating this file.
- No DB, script, helper, npm, deploy, or git action is approved by this checklist.
- Handoff v1 is active: each Codex lane must read `.handoff/inbox.md`, execute only the current lane, and stop.
- This checklist is a production observation contract, not approval to mutate data or deploy.

Markers:
- periodic_production_smoke_checklist_title
- handoff_v1_active

## When to Run

Run a production smoke lane only after explicit approval for GET-only production checks.

Recommended triggers:

- After a deploy-aware push to `main`.
- After frontend metadata changes.
- After delivery/API route changes.
- After universe registry exposure changes.
- After cache, fallback, rankings, map, or search changes.
- As a scheduled periodic manual check if desired.

## Production Base URLs

- Canonical production base: `https://www.koaptix.com`
- Alias/apex: `https://koaptix.com`
- Expected alias behavior: apex resolves/responds to the `www` canonical site.

Marker:
- canonical_base_url_www

## Required GET-Only Endpoints

All checks must use GET only.

- `/`
- `/api/rankings?universe=KOREA_ALL&limit=20`
- `/api/rankings?universe=SEOUL_ALL&limit=20`
- `/api/rankings?universe=BUSAN_ALL&limit=20`
- `/api/rankings?universe=GYEONGGI_ALL&limit=20`
- `/api/rankings?universe=SGG_11710&limit=20`
- `/api/map?universe=KOREA_ALL&limit=32`
- `/api/map?universe=SGG_11710&limit=32`
- `/api/search?universe=KOREA_ALL&q=%EC%9E%A0%EC%8B%A4`
- `/api/search?universe=SGG_11710&q=%EC%9E%A0%EC%8B%A4`

Marker:
- required_get_only_endpoints

## Optional Endpoint

- `/api/ranking?universe=SGG_11710&limit=1000`

Use this only when full board row-count confirmation is needed. If the optional endpoint is unavailable while required identity checks are safe, treat that as PASS_WITH_WARNINGS, not an automatic FAIL.

## Metadata Checks

- Home HTML head must not contain localhost metadata URLs.
- `og:image` should use `https://www.koaptix.com` when present.
- `twitter:image` should use `https://www.koaptix.com` when present.
- Missing non-critical metadata can be a warning.
- Localhost metadata fallback is a FAIL.

Marker:
- metadata_no_localhost_guard

## Identity and Fallback Checks

- `requestedUniverseCode` must equal `renderedUniverseCode` where both are present.
- KOREA_ALL must not substitute for regional or SGG routes.
- Cross-universe fallback must not be observed.
- `fallbackMode` should be `none`, absent, or same-universe explicitly marked.
- Global auxiliary search must not replace the local universe result.
- Record `source`, `cacheState`, and fallback metadata when present.

Marker:
- identity_fallback_guard

## SGG_11710 Guard

- SGG_11710 identity must be preserved.
- KOREA_ALL substitution for SGG_11710 must be false.
- Current accepted full-board production smoke baseline is `latestBoardDate=2026-06-01 / count=177 / items length=177 / distinct complexes=177`.
- Previous smoke expectation `2026-05-29 / 177 rows` is superseded for current production smoke by manual source-of-truth evidence accepted on 2026-06-02.
- `2026-05-31` exists in the source-chain history as a 177-row snapshot, but it is not the currently selected latest public baseline.
- Row count should be `177` when the full board route is available.
- Latest board date should be `2026-06-01` when exposed.
- Item rows must be SGG_11710 only when row universe codes are exposed.
- `2026-05-31` must not appear as the current latest public baseline.
- Latest date unavailable is a warning if identity and row count are safe.
- Any baseline change in the future must be verified against the full source-of-truth chain:
  `koaptix_rank_snapshot -> v_koaptix_universe_rank_history_dynamic -> v_koaptix_latest_universe_rank_board_u`.
- Row count, membership, or absence of a forbidden date alone is not enough to change the baseline.
- No DB write, helper execution, code patch, deploy, or production data mutation is needed for this accepted baseline update.

Markers:
- sgg_11710_guard
- sgg_11710_public_latest_2026_06_01_177
- sgg_11710_partial_2026_05_31_fail
- P-PRODSMOKE.8F_BASELINE_ACCEPTED

## Timeout and Method Policy

- GET only.
- Do not use POST, PUT, PATCH, or DELETE.
- Per-request timeout target: 10 seconds.
- Total smoke target: 90 seconds.
- Retry at most once for transient network or 5xx issues.
- Do not retry unsafe identity, fallback, KOREA substitution, or partial exposure findings as if they were transient.

Marker:
- mutation_methods_prohibited

## PASS / PASS_WITH_WARNINGS / FAIL / BLOCKED Semantics

### PASS

- Canonical production URL is reachable.
- Required endpoints return HTTP 200 or acceptable 2xx.
- Requested/rendered identity is preserved where metadata exists.
- No KOREA_ALL substitution is observed.
- No cross-universe fallback is observed.
- No SGG_11710 `2026-05-31` partial public exposure is observed.
- No localhost metadata URL is observed.

### PASS_WITH_WARNINGS

- Latest board date is unavailable, but row count and identity are safe.
- Optional full board route is skipped or unavailable while required route identity is safe.
- Same-universe stale fallback is explicitly marked.
- Deployment propagation is uncertain, but no unsafe signal is observed.
- Non-critical metadata field is absent while canonical no-localhost guard passes.

### FAIL

- Canonical production URL is unreachable.
- Required endpoint repeatedly returns hard 5xx.
- `requestedUniverseCode` and `renderedUniverseCode` mismatch.
- KOREA_ALL substitutes for a regional or SGG route.
- Cross-universe fallback is observed.
- SGG_11710 `2026-05-31` partial public exposure is observed.
- Localhost metadata URL is observed after metadataBase deployment.
- Any mutation request is attempted.

### BLOCKED

- Network is unavailable.
- Safe public URL cannot be determined.
- Auth, anti-bot, or hosting protection prevents reaching the app.
- The active lane does not approve production GET execution.

Marker:
- pass_warn_fail_blocked_semantics

## Do-Not-Run List

- Do not perform DB writes.
- Do not perform direct DB reads unless a separate lane explicitly approves them.
- Do not run helper functions.
- Do not run deploy commands.
- Do not use POST, PUT, PATCH, or DELETE.
- Do not bypass the source of truth.
- Do not use membership alone to decide board readiness.
- Do not promote a new SGG_11710 public baseline without source-chain verification and CTO acceptance.
- Current accepted SGG_11710 public smoke baseline is `2026-06-01 / 177 rows / 177 distinct complexes`.
- Do not run `append_daily_rank_history` without explicit scope.
- Do not run `sync_rank_snapshot_from_history` without explicit scope.
- Do not write `koaptix_rank_snapshot`.
- Do not write `koaptix_index_snapshot`.
- Do not mutate `complex_rank_history`.
- Do not revive sealed wrappers.
- Do not run `git add .` or `git add -A`.

## Future Automation Options

- Current low-risk baseline: this docs-only checklist.
- Optional future script: `scripts/smoke-production-koaptix.mjs`.
- Optional future package script: `smoke:prod`.
- CI or scheduled smoke requires a separate platform decision, alerting decision, and explicit approval.
- Any future automation must keep GET-only behavior, compact redacted output, no secret printing, no DB writes, no helper execution, and no deploy command.

Marker:
- future_automation_options

## One-Line Handoff

Periodic production smoke is GET-only, identity/fallback/metadata/SGG_11710 focused, and the current accepted SGG_11710 full-board baseline is `2026-06-01 / 177 rows / 177 distinct complexes`.

Marker:
- one_line_handoff
