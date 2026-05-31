# KOAPTIX Delivery Stabilization / Lint Migration / Push Completion Note

## Timestamp / context

- Note date: 2026-05-31
- Lane group: P-NEXT.2 through P-POSTPUSH.0
- Scope:
  - service delivery stabilization
  - lint tooling migration
  - push completion
  - production URL unknown

This note records the completed delivery/lint push lane after the reviewed commits were pushed to `origin/main`.

## Completed commits

### 1. 36920ef Stabilize KOAPTIX home delivery fallback metadata

Files changed:

- `src/app/api/map/route.ts`
- `src/app/api/rankings/route.ts`
- `src/app/api/search/route.ts`
- `src/app/page.tsx`
- `src/components/home/NeonMap.tsx`

Summary:

- Added requested/rendered universe identity metadata.
- Added `source`, `cacheState`, and `fallbackMode` delivery metadata.
- Marked same-universe stale fallback explicitly.
- Prevented identity-mismatch substitution.
- Kept `KOREA_ALL` SSR board seed lightweight and client-delivered.
- Kept global auxiliary search separate from local universe results.

### 2. a14eaf8 Migrate KOAPTIX lint to ESLint CLI

Files changed:

- `eslint.config.mjs`
- `package-lock.json`
- `package.json`

Summary:

- Migrated `npm run lint` from `next lint` to `eslint .`.
- Added ESLint and `eslint-config-next`.
- Added a Next-compatible flat ESLint config.
- Downgraded broad baseline debt to warnings.
- Ignored `docs/`, `outputs/`, and `scripts/` from the frontend lint gate.

## Verification evidence

- `npm run lint` passed with ESLint CLI.
- Lint result: 0 errors, 60 accepted baseline warnings.
- `npm run build` passed.
- `smoke:delivery` passed.
- `smoke:regional` passed on extended rerun.
- `smoke:browser` passed.
- Direct route spot checks passed for:
  - `KOREA_ALL`
  - `SEOUL_ALL`
  - `BUSAN_ALL`
  - `GYEONGGI_ALL`
  - `SGG_11710`
- `SGG_11710` public latest remained:
  - `2026-05-29 / 177 rows`
- `SGG_11710` `2026-05-31` partial public exposure:
  - false / not observed
- `audit:sgg`:
  - timed out and remains a follow-up, not a blocker
- Production smoke:
  - skipped because a safe public URL was not discoverable

## Source-of-truth guard

Official chain preserved:

- `koaptix_rank_snapshot -> v_koaptix_universe_rank_history_dynamic -> v_koaptix_latest_universe_rank_board_u`

Confirmed guard outcomes:

- No legacy fallback introduced.
- No membership-only source introduced.
- No cross-universe fallback introduced.
- No `KOREA_ALL`-as-regional replacement introduced.
- No `SGG_11710` `2026-05-31` public exposure.

## Current repo state after push

- Local `main` and `origin/main` aligned at:
  - `a14eaf84aed5892b0b8d814a2bd34434e3290fe5`
- Ahead/behind:
  - `0 / 0`
- Tracked tree:
  - clean before this docs note
- Untracked docs/outputs/scripts:
  - remain local/uncommitted unless this docs note is later committed separately

## Known follow-ups

### P-PRODSMOKE.0 production URL supplied smoke

- Requires a user-provided public URL or safe public URL discovery.
- GET-only production checks.
- Confirm identity/fallback metadata and the `SGG_11710` guard.

### P-AUDIT.0 bounded audit:sgg timeout diagnosis

- Make `audit:sgg` complete predictably as an advisory gate.

### P-LINT.DEBT source warning cleanup

- 60 accepted baseline warnings remain.
- Handle in targeted lanes only.

### P-METADATA.0 metadataBase warning fix

- Build warning persists.
- Unrelated to the pushed commits.

### Optional docs/artifact index consolidation

- `outputs/` and `scripts/` remain numerous and untracked.

## Do not run / prohibitions

- Do not re-run `SGG_11710` `2026-05-31` public rank exposure.
- Do not write `koaptix_rank_snapshot` with 10-row or 22-row partial data.
- Do not overwrite the `SGG_11710` `2026-05-29 / 177` public board.
- Do not run `append_daily_rank_history` without explicit scope.
- Do not run `sync_rank_snapshot_from_history` without explicit scope.
- Do not run market-cap, eligibility, price, household, rank, or index write scripts without explicit approval.
- Do not revive sealed wrappers.
- Do not bypass source of truth.
- Do not use membership alone to decide board readiness.
- Do not force-push.
- Do not deploy manually without explicit approval.

## Mandatory Codex prompt formatting rule

- Codex prompts must be one plain text copy block.
- Never include nested triple-backtick code fences inside Codex prompts.
- If code examples are needed, write them as plain text or EOF-style content without triple backticks.
- If too long, split intentionally as PART 1 / PART 2.
- Reason: nested code fences break the copyable prompt box in ChatGPT UI.

## One-line handoff

Delivery stabilization and ESLint migration are pushed to `origin/main`; production smoke is pending only because public URL is unknown; keep `SGG_11710` `2026-05-31` internal-only and preserve the rank snapshot source-of-truth chain.
