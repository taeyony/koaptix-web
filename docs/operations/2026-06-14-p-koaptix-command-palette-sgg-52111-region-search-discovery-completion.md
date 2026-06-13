# P-KOAPTIX-COMMAND-PALETTE-SGG-52111-REGION-SEARCH-DISCOVERY-COMPLETION

## Status

- status: COMMAND_PALETTE_SGG_52111_REGION_SEARCH_DISCOVERY_RELEASE_COMPLETE
- rollback_required: false
- rollback_attempted: false

## One-Line Conclusion

The Command Palette SGG_52111 region search discovery patch is complete: the fix was committed, pushed, production health smoke passed, and user manual QA confirmed that `전주` / `전주시` / `완산구` / `전주시 완산구` searches surface `전주시 완산구`.

## Recommended Model Allocation

- ChatGPT CTO: GPT-5.5 very high reasoning
- Codex: GPT-5.5 extra high
- Pro extended required now: false

## Flexible Lane Policy Note

This completion note bundles release evidence and user manual QA summary because the work is docs-only and low risk. It does not relax high-risk gates for DB writes, helper/materializer execution, source-of-truth changes, macro universe exposure, rollback/revert, source changes, push, or deploy.

## Problem Observed

After the SGG_52111 public registry release, the user reported that typing `전주` in the production Command Palette returned no result. API and public registry release checks had already passed, so the issue was not a DB exposure failure.

## Root Cause

- primary: UI_ONLY_CURRENT_UNIVERSE_SEARCH
- secondary: REGISTRY_ALIAS_MISSING / SGG_52111_LABEL_MOJIBAKE

The Command Palette searched current-universe apartment complex results and did not surface enabled SGG region aliases as a region shortcut.

## What Changed

`src/components/home/CommandPalette.tsx`:

- Enabled SIGUNGU region matches are computed from the public search universe registry.
- `지역 바로가기` is shown above complex search results.
- Region result selection routes to `/ranking?universe=<code>&q=<query>`.

`src/lib/koaptix/universes.ts`:

- `SGG_52111` label was corrected to `전주시 완산구`.

## What Did Not Change

- No DB connection/select/write.
- No helper/materializer/latest-board refresh.
- No source-of-truth query path change.
- No API route change.
- No package/config/env/lockfile mutation.
- No JEONBUK_ALL enablement or flag change.
- No rollback/revert.

## Commit And Origin State

- commit_hash: fc58f037cd5a9a29ff59c075eb4a5e5b488ea9e8
- commit_message: fix: surface SGG_52111 in command palette search
- committed_files:
  - src/components/home/CommandPalette.tsx
  - src/lib/koaptix/universes.ts
- origin/main: fc58f037cd5a9a29ff59c075eb4a5e5b488ea9e8
- origin/main matches expected: true

## Production Health Smoke

- production_origin: https://koaptix.com
- planned/executed: 8/8
- passed: true
- no 5xx: true
- no timeout: true
- no client failure: true
- no JSON parse failure: true

Cases:

- H01_HOME: PASS HTTP 200
- H02_RANKING_PAGE_SGG_52111: PASS HTTP 200
- H03_API_RANKINGS_SGG_52111: PASS HTTP 200, JSON parse true, row_count 20
- H04_API_SEARCH_SGG_52111_JEONJU: PASS HTTP 200, JSON parse true
- H05_API_RANKING_FULLBOARD_SGG_52111: PASS HTTP 200, JSON parse true, row_count 55
- H06_GUARD_JEONBUK_ALL_DISABLED: PASS HTTP 200, JSON parse true, row_count 12, no regression signal
- H07_API_RANKINGS_KOREA: PASS HTTP 200, JSON parse true, row_count 12
- H08_API_MAP_GANGWON: PASS HTTP 200, JSON parse true, row_count 1

## User Manual QA Result

- Manual QA final status: PASS
- `전주`: PASS
- `전주시`: PASS
- `완산구`: PASS
- `전주시 완산구`: PASS
- Region result appears when searched.
- Default filter visibility is not required for this release and is treated as out-of-scope UX policy.
- Search discovery goal is satisfied.

## JEONBUK_ALL Safety

- JEONBUK_ALL remains disabled.
- JEONBUK_ALL was not exposed as an enabled selectable public region.
- Macro universe exposure remains a separate future decision.

## Current Public And Service State

- SGG_52111 is public.
- SGG_52111 is discoverable from Command Palette search by regional terms.
- JEONBUK_ALL remains not public.
- KOREA_ALL and GANGWON regression checks passed.
- rollback_required: false

## Known Notes

- Filter default listing does not include `전주시 완산구` by default.
- This is not a blocker because the release target was search discovery, not default filter listing.
- A future UX policy lane may decide whether enabled SGGs should appear in default filter lists.

## Recommended Next Options

- Option 1: stop and close this follow-up patch.
- Option 2: commit this completion note in a later docs-only commit lane.
- Option 3: document KOAPTIX operating principles flexibility update if not already completed.
- Option 4: design standard SGG rollout process including registry exposure plus Command Palette region discovery.
- Option 5: optional filter default listing UX policy review.

## Non-developer Korean status summary

전주시 완산구는 이제 공개 서비스에서 조회할 수 있고, 검색창에서 `전주`, `전주시`, `완산구`, `전주시 완산구`로도 찾을 수 있습니다. 필터 기본 목록에는 없지만 검색하면 정상적으로 나오므로 이번 검색 발견성 패치 목표는 달성되었습니다. 전북 전체는 아직 공개되지 않은 상태로 안전하게 유지되고, 롤백은 필요하지 않습니다.

