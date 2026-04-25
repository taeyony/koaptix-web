# KOAPTIX Enabled-80 Operational Quality Review - 2026-04-25

## Purpose

This is a docs-only operational quality review for the enabled-80 KOAPTIX service state.

- No registry expansion was performed in this review.
- No batch-32 readiness scan was started.
- No product, harness, API, SQL, source-of-truth, or KOREA_ALL engine files were modified.
- The expansion loop remains intentionally paused at enabled 80.

## Baseline State

- HEAD before review: `ca26860 docs(koaptix): add enabled-80 operational checkpoint`
- Branch: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- Checkpoint commit: `ca26860 docs(koaptix): add enabled-80 operational checkpoint`
- Enabled SGG count: `80`
- Last enabled SGG order: `180`
- Batch-31 status: readiness complete, actual open complete, docs reconciliation complete
- Batch-32 readiness scan: not started / intentionally paused

## Registry And Checkpoint Summary

The registry review confirmed the enabled-80 baseline without modifying `src/lib/koaptix/universes.ts`.

- Enabled SGG count: `80`
- Last enabled SGG order: `180`
- Duplicate SGG code check: no duplicates found
- Duplicate enabled order check: no duplicates found
- Non-enabled placeholder check: none found
- Batch-32 readiness document check: `docs/KOAPTIX_BATCH32_READINESS_REVIEW_2026-04-25.md` does not exist
- Checkpoint doc pause policy: enabled-80 checkpoint is recorded as the next operational baseline, with batch-32 paused

Latest opened orders 171-180:

| Order | Universe | Region |
| --- | --- | --- |
| 171 | `SGG_27720` | 대구광역시 군위군 |
| 172 | `SGG_28110` | 인천광역시 중구 |
| 173 | `SGG_28140` | 인천광역시 동구 |
| 174 | `SGG_28177` | 인천광역시 미추홀구 |
| 175 | `SGG_28200` | 인천광역시 남동구 |
| 176 | `SGG_28237` | 인천광역시 부평구 |
| 177 | `SGG_28245` | 인천광역시 계양구 |
| 178 | `SGG_28710` | 인천광역시 강화군 |
| 179 | `SGG_29110` | 광주광역시 동구 |
| 180 | `SGG_29140` | 광주광역시 서구 |

Relevant existing quality commands from `package.json`:

- `npm run build`
- `npm run audit:sgg`
- `npm run gate:sgg`
- `npm run smoke:regional`
- `npm run smoke:browser`
- `npm run diagnose:sgg-direct`

## Runtime Validation Summary

Runtime validation was run against the existing local service on `http://127.0.0.1:3004`.

| Check | Result | Notes |
| --- | --- | --- |
| `npm run build` | PASS | Existing non-blocking Next.js warning: `metadataBase` is not set and falls back to localhost. |
| `npm run audit:sgg` | PASS | `blockingFailed=[]`, `advisoryMiss=[]`, enabled `80`, confirmed `80`, delivery confirmed `80`. |
| `npm run gate:sgg` | PASS | Gate completed with `[SGG_RELEASE_GATE_PASS]`. |
| `smoke:regional` | PASS | Reported by gate, `steps=69`. |
| `smoke:browser` | PASS | Reported by gate, visible browser error `NONE`. |

Gate summary:

- `[SGG_RELEASE_GATE_PASS]`: yes
- `failed_command=NONE`
- `failed_universe_or_step=NONE`
- `rerun_recommended=NO`
- Console / visible errors: none blocking

## Delivery Health Sample

Readonly API checks were run for representative macro universes and recently opened SGG universes. Each checked universe returned:

- `/api/rankings` HTTP 200 with matching `universeCode` and non-empty items
- `/api/search` HTTP 200 with matching `universeCode` and a local result for the checked sample query
- `/api/map` HTTP 200 with matching requested/rendered universe, `isFallback=false`, `fallbackMode=none`, and `source=dynamic`

Macro universe sample:

| Universe | Rankings | Search | Map | Fallback / identity |
| --- | --- | --- | --- | --- |
| `KOREA_ALL` | 200, `12` items | 200, local result | 200, `12` map items | dynamic, no fallback |
| `SEOUL_ALL` | 200, `20` items | 200, local result | 200, `7` map items | dynamic, no fallback |
| `BUSAN_ALL` | 200, `20` items | 200, local result | 200, `12` map items | dynamic, no fallback |
| `DAEGU_ALL` | 200, `20` items | 200, local result | 200, `6` map items | dynamic, no fallback |
| `INCHEON_ALL` | 200, `20` items | 200, local result | 200, `6` map items | dynamic, no fallback |
| `GWANGJU_ALL` | 200, `20` items | 200, local result | 200, `5` map items | dynamic, no fallback |

Recently opened SGG sample:

| Universe | Region | Rankings | Search | Map | Fallback / identity |
| --- | --- | --- | --- | --- | --- |
| `SGG_28245` | 인천광역시 계양구 | 200, `20` items | 200, local result | 200, `1` map item | dynamic, no fallback, no KOREA_ALL fallback |
| `SGG_28710` | 인천광역시 강화군 | 200, `6` items | 200, local result | 200, `1` map item | dynamic, no fallback, no KOREA_ALL fallback |
| `SGG_29110` | 광주광역시 동구 | 200, `20` items | 200, local result | 200, `1` map item | dynamic, no fallback, no KOREA_ALL fallback |
| `SGG_29140` | 광주광역시 서구 | 200, `20` items | 200, local result | 200, `1` map item | dynamic, no fallback, no KOREA_ALL fallback |

Browser / selector observations:

- `smoke:browser` passed through the release gate with no visible blocking browser errors.
- `smoke:regional` passed through the release gate and exercised macro selector transitions, including Gwangju coverage.
- The browser smoke set includes enabled SGG transition coverage for recently opened SGG entries, including the enabled-80 additions.

## Operational Risks

The service is stable enough to pause SGG expansion and move to product / operations quality work, but several non-expansion risks should be handled before resuming exposure.

1. Deployment / domain uncertainty for `koaptix.com` remains the top operational risk.
   The local gate is healthy, but public domain accessibility and deployment routing need a dedicated check.

2. Supabase Data API / RLS exposure needs a focused audit.
   The current product paths use the Supabase anon client for rankings, search, map, and board delivery. A prior local `.env` service-role key scan looked low-risk, but this does not replace a full RLS / Data API exposure audit.

3. Cold-start and timeout sensitivity should be reviewed.
   The home and delivery paths include timeout and fallback behavior. This protects the UX, but should be tested under cold-start and slow-query conditions before additional expansion.

4. SGG audit advisory behavior should remain monitored.
   The current enabled-80 quality run reported `advisoryMiss=[]`; historical batch and checkpoint runs had advisory-only latest-board notes. If this recurs, it should remain non-blocking only when delivery checks still pass.

5. Public UX polish is now more important than adding more SGGs.
   The home, selector, ranking, and map flows are functional, but copy, localization, loading states, metadata, and visual polish should be reviewed before more public exposure.

6. Documentation sprawl is increasing.
   Batch readiness/open/reconciliation docs have useful audit history, but enabled-80 is a natural point for consolidation and handoff cleanup.

## Recommended Next Workstreams

1. `koaptix.com` deployment/domain health check.
   Verify production domain routing, SSL, canonical URL behavior, public page loading, API reachability, and metadata/domain configuration.

2. Supabase RLS / Data API exposure audit.
   Review anon access, RLS policies, exposed tables/views, RPC permissions, and whether delivery endpoints reveal only intended public data.

3. Home UX / product polish review.
   Review KOREA_ALL and macro home states, selector clarity, search behavior, map affordances, Korean copy, loading states, and public-facing metadata.

4. Cold-start and delivery path performance review.
   Measure build/start behavior, first request latency, API timeout sensitivity, cache effectiveness, and map/search/rankings response stability.

5. Enabled-80 documentation consolidation / handoff cleanup.
   Produce a smaller operator-facing summary that links the batch evidence but removes the need to read every batch doc sequentially.

6. Resume SGG expansion only after explicit user approval.
   Batch-32 readiness should remain paused until the user intentionally restarts the expansion loop.

## Deployment And Security Notes

- `koaptix.com` accessibility and domain deployment status need verification in a dedicated non-expansion task.
- Supabase Data API / RLS exposure remains a backlog item for dedicated audit.
- Prior local service-role key emergency scan was recorded as low-risk, but full RLS review remains pending.
- No Vercel settings, Supabase policies, SQL, secrets, or schema files were changed in this task.
- No secrets were printed or recorded in this document.

## Explicit Pause Policy

- Batch-32 readiness scan is intentionally paused.
- No more SGG actual opens should be performed until the user explicitly resumes expansion.
- Enabled 80 is the current operational review baseline.
- The next execution task should be non-expansion product / operations quality work.

## Final Review Verdict

PASS - enabled-80 quality review completed, expansion remains paused.

## Suggested Next Prompt Target

Recommended next prompt target:

`koaptix.com deployment/domain health check`

Rationale: runtime validation is green locally, so the highest-value next non-expansion workstream is confirming public production accessibility, routing, SSL, and domain metadata before deeper product or data-policy work.
