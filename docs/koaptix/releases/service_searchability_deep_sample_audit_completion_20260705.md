# Service Searchability Deep Sample Audit Completion Note

Review marker: `P-KOAPTIX-SERVICE-SEARCHABILITY-DEEP-SAMPLE-AUDIT.0`

Status: `PASS_SERVICE_SEARCHABILITY_DEEP_SAMPLE_AUDIT_RECOVERED_WITHIN_GET_CAP`

CTO decision: `ACCEPT_SERVICE_SEARCHABILITY_DEEP_SAMPLE_AUDIT`

One-line conclusion: The retained read-only evidence is sufficient to accept the service searchability audit; no service searchability failure was found, and the local serialization caveat does not invalidate the retained PASS evidence.

## Baseline

- branch: `main`
- head: `3270aa228422880ae3117ab8bb92b7b69f1cbbb3`
- origin/main: `3270aa228422880ae3117ab8bb92b7b69f1cbbb3`
- remote refs/heads/main: `3270aa228422880ae3117ab8bb92b7b69f1cbbb3`
- ahead_behind: `0 0`
- previous lane: `P-KOAPTIX-SERVICE-SEARCHABILITY-DEEP-SAMPLE-AUDIT.0`
- previous lane execution type: `READ_ONLY_SERVICE_SEARCHABILITY_DEEP_SAMPLE_AUDIT_NO_MUTATION`

## Audited Contract Paths

- `src/app/api/search/route.ts`
- `src/app/api/ranking/route.ts`
- `src/app/api/rankings/route.ts`
- `src/app/api/complex-detail/route.ts`
- `src/lib/koaptix/queries.ts`
- `src/lib/koaptix/universes.ts`
- `src/lib/koaptix/mappers.ts`

Observed contract summary:

- explicit universe requests are resolved through the universe request resolver
- disabled or hold universes return explicit empty unavailable payloads rather than masquerading as `KOREA_ALL`
- search returns same-universe `localItems` first, with optional `globalItems` separated
- ranking responses expose source, fallback, degradation, and rendered universe metadata
- sampled complex detail targets resolved without unexpected 404

## DB Read-Only Sample Summary

- source view: `public.v_koaptix_latest_universe_rank_board_u`
- read-only guard: `transaction_read_only on`
- sampled_universe_count: `9`
- sampled_row_count: `123`
- sampling shape: `top/mid/tail up to 15 rows per universe; SGG_51820 has 3 source rows`
- db_issue_count: `0`
- blank name count in sample: `0`
- blank sigungu count in sample: `0`
- nonpositive rank count in sample: `0`
- nonpositive market-cap count in sample: `0`

Source row counts by universe:

- `KOREA_ALL`: `13497`
- `SEOUL_ALL`: `2571`
- `BUSAN_ALL`: `1123`
- `GYEONGGI_ALL`: `3243`
- `GANGWON_ALL`: `71`
- `SGG_41135`: `153`
- `SGG_11560`: `142`
- `SGG_51110`: `68`
- `SGG_51820`: `3`

## Retained Public API Evidence

GET budget:

- max_allowed_get_requests: `60`
- first planned GETs executed but not retained due to local JSON serialization error: `43`
- retained recovery GETs: `17`
- conservative total GETs: `60`
- further GET retry inside the lane: `NOT_ALLOWED_GET_CAP_EXHAUSTED`

Exact-name search:

- result: `9 / 9 PASS_EXPECTED_COMPLEX_FOUND`
- covered universes:
  - `KOREA_ALL`
  - `SEOUL_ALL`
  - `BUSAN_ALL`
  - `GYEONGGI_ALL`
  - `GANGWON_ALL`
  - `SGG_41135`
  - `SGG_11560`
  - `SGG_51110`
  - `SGG_51820`

Ranking probes:

- result: `2 / 2 PASS`
- covered universes: `KOREA_ALL`, `SGG_51820`
- observed source: `live_latest`
- fallback used: `0`
- degraded responses: `0`

Detail probes:

- result: `2 / 2 PASS`
- covered universes: `KOREA_ALL`, `SGG_51820`
- unexpected 404 count: `0`
- blank recognition-field count: `0`

Disabled/hold guard:

- result: `4 / 4 PASS_UNAVAILABLE_EMPTY_NO_MASQUERADE`
- covered scopes: `JEONBUK_ALL`, `SGG_51150`
- disabled/hold returned item count: `0`
- `KOREA_ALL` masquerade count: `0`
- fallback or degraded count: `0`

Failures: `0`

Warnings: `0`

## Interpretation

The retained evidence is sufficient to accept the service searchability deep sample audit.

- Exposed universe exact-name search resolved expected complexes in all 9 target universes.
- Representative ranking and detail probes resolved without fallback, degradation, blank recognition fields, or unexpected 404.
- Disabled and hold universes returned explicit unavailable empty payloads without `KOREA_ALL` masquerade.
- SELECT-only DB sampling showed no recognition-field, rank, or market-cap defects across top, mid, and tail samples.

The local JSON serialization issue is procedural, not a service failure. The first planned 43 GET details were discarded during local report rendering, recovery was completed within the approved 60 GET cap, and no further retry was allowed inside the lane. This caveat should be preserved for provenance but does not invalidate the retained PASS evidence.

## Optional Future Lane

No follow-up is required for searchability from this audit.

If CTO later wants a fully retained broader API matrix, use a separate approved lane with a fresh explicit GET budget:

`P-KOAPTIX-SERVICE-SEARCHABILITY-RETAINED-BROAD-API-MATRIX-AUDIT.0`

## Safety Boundary

- persistent DB write: `NO`
- DDL/DML: `NO`
- read model refresh: `NO`
- helper/materializer/refresh/backfill/finalizer execution: `NO`
- source import: `NO`
- source code change: `NO`
- commit/push/deploy: `NO`
- secrets, env values, credentials, database URLs, or private connection details logged: `NO`

## Recommended Next Lane

`NONE_REQUIRED_FOR_SEARCHABILITY_FROM_THIS_AUDIT`

If the product roadmap needs a next quality lane, choose it independently from searchability acceptance rather than reopening this accepted audit.

## Handoff

The searchability audit is accepted and recorded. Preserve the procedural caveat, but treat the retained evidence as a valid PASS unless CTO explicitly authorizes a fresh retained broad API matrix lane.
