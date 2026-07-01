# KOAPTIX Official Index v1 Production Env Redeploy Smoke Completion - 2026-07-01

## One-Line Conclusion

Production env-only redeploy smoke was accepted: `/api/home` recovered from 500 to 200 `ok=true`, the public service baseline remains `2024-07-31`, official genesis `2024-01-01 / 1000` is not publicly exposed as latest, and public exposure remains blocked.

## Review Marker

`P-KOAPTIX-INDEX-PRODUCTION-ENV-REDEPLOY-SMOKE-READONLY.0`

## Accepted CTO Decision

`ACCEPT_ENV_REDEPLOY_SMOKE_AND_KEEP_PUBLIC_EXPOSURE_BLOCKED`

## Production Deployment Context

- production main commit: `21f4adfaa1b0c7272e79276c583324e0d8f2dfd3`
- redeploy type: env-only redeploy of the same main commit
- redeploy actor: user manual action in Vercel
- Codex deploy action: `NO_DEPLOY_BY_CODEX`
- code change in redeploy: `NO`
- environment values logged: `NO_ENV_VALUES_LOGGED`

## Prior Blocker Summary

The prior Production smoke found `/api/home` returning 500 while root, rankings, and search were still reachable. A read-only diagnostic classified the blocker as `MISSING_VERCEL_RUNTIME_ENV`.

- missing runtime key observed publicly: `SUPABASE_URL`
- companion required server-side key: `SUPABASE_SERVICE_ROLE_KEY`
- source path: `/api/home -> getKoaptixHomePayload() -> getSupabaseAdminClient()`
- prior public error: `INTERNAL_ERROR: SUPABASE_URL is missing`

## Env Reconciliation Summary

The user manually added or verified the required Vercel environment variables for Production and Preview without logging values.

Required server-side variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The redeploy was manually triggered by the user to apply the latest Vercel Project Settings to the same production commit. Codex did not inspect, print, mutate, or verify actual secret values.

## Smoke Result

- accepted status: `PASS_ENV_REDEPLOY_SMOKE_PASSED_API_HOME_RECOVERED_NO_PUBLIC_EXPOSURE`
- production root: `PASS 200`
- `/api/home`: `PASS 200`, `ok=true`
- `/api/rankings?universe=KOREA_ALL&limit=5`: `PASS 200`, `ok=true`, `count=5`
- `/api/search?q=%EB%B0%98%ED%8F%AC&universe=KOREA_ALL`: `PASS 200`, `ok=true`, `resultCount=7`, `localItems=7`, `globalItems=0`
- prior `/api/home` runtime env failure resolved: no `INTERNAL_ERROR`; no `SUPABASE_URL is missing`

Visible public service fields after recovery:

- `baseDate=2024-07-31`
- `indexSourceMode=public_service`
- `baselineMode=public_service_2024_07_31`
- `publicExposureStatus=blocked`

## Public Exposure Decision

Public official genesis exposure remains blocked.

- official genesis public latest exposure: `NO_VISIBLE_OFFICIAL_GENESIS_PUBLIC_LATEST`
- no `2024-01-01` visible as public latest
- no `official_internal` visible publicly
- no `official_2024_01_01` visible publicly
- public exposure change: `NO_PUBLIC_EXPOSURE_CHANGE`

This completion note does not approve official index public launch. It records only that the env-only production redeploy smoke recovered `/api/home` while keeping public exposure blocked.

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` remains server-side only.
- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY_PROHIBITED`
- Do not create `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.
- Do not paste, screenshot, echo, commit, or log actual Vercel, Supabase, DB, token, cookie, or bypass-secret values.
- Do not include actual environment variable values in docs, `.handoff`, terminal output, issue comments, commits, or PR descriptions.

## Prohibited Actions Confirmed

- `NO_DB_WRITE`
- DB direct connection: `NO`
- SQL execution: `NO`
- `NO_HELPER_EXECUTION`
- materializer/finalizer execution: `NO`
- `NO_LATEST_BOARD_REFRESH`
- `NO_PUBLIC_EXPOSURE_CHANGE`
- `NO_DEPLOY_BY_CODEX`
- Vercel CLI or deploy command by Codex: `NO`
- env mutation by Codex: `NO`
- source/package/env mutation: `NO`
- stage/commit/push by this lane: `NO`
- cleanup/stash/reset/delete/move: `NO`

## Current Blocked Items

- Official genesis `2024-01-01 / 1000` public exposure remains blocked.
- Latest-board refresh remains blocked.
- DB write remains blocked.
- Helper/materializer/finalizer execution remains blocked.
- Any future deploy remains a separate approval lane.
- The pre-existing dirty local script remains outside this lane and must not be staged by broad commands.

## Resume / Next-Lane Recommendation

Recommended next lane:

`P-KOAPTIX-INDEX-PRODUCTION-ENV-REDEPLOY-SMOKE-COMPLETION-NOTE-DOCS-COMMIT.0`

Purpose: commit this docs-only completion note after CTO acceptance, without source/package/env mutation and without changing public exposure.

## One-Line Handoff

Production env-only redeploy smoke is accepted, `/api/home` is recovered, public official genesis remains blocked, and the next step is a separate docs-only completion-note commit lane.
