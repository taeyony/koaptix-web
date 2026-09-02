import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  requirePublicationIdentity,
  requireUniformUniverseServicePublication,
  sanitizePublicationCurrentnessRows,
} from "../src/lib/koaptix/currentness";

const GENERATION_G1 = "11111111-1111-4111-8111-111111111111";
const GENERATION_G2 = "22222222-2222-4222-8222-222222222222";
const EVENT_G1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const EVENT_G2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PUBLISHED_G1 = "2026-08-01T00:00:00.000Z";
const PUBLISHED_G2 = "2026-08-02T00:00:00.000Z";
const SHA_A = "A".repeat(64);
const SHA_B = "B".repeat(64);

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function countMatches(source: string, pattern: RegExp): number {
  return Array.from(source.matchAll(pattern)).length;
}

function sourceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `missing source marker: ${start}`);
  assert.notEqual(endIndex, -1, `missing source marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

function serviceRow(overrides: Record<string, unknown> = {}) {
  return {
    generation_id: GENERATION_G1,
    publication_version: 7,
    publication_event_id: EVENT_G1,
    published_at: PUBLISHED_G1,
    surface_code: "UNIVERSE_SERVICE",
    snapshot_date: "2026-07-31",
    universe_code: "KOREA_ALL",
    complex_id: 1,
    apt_name_ko: "테스트 아파트",
    rank_all: 1,
    market_cap_krw: 100,
    ...overrides,
  };
}

function currentnessRow(
  surfaceCode: "GLOBAL_LATEST" | "UNIVERSE_SERVICE",
  overrides: Record<string, unknown> = {},
) {
  return {
    generation_id: GENERATION_G1,
    publication_version: 7,
    publication_event_id: EVENT_G1,
    published_at: PUBLISHED_G1,
    surface_code: surfaceCode,
    universe_code: "KOREA_ALL",
    snapshot_date: "2026-07-31",
    source_previous_snapshot_date: "2026-07-30",
    row_count: 10,
    plan_run_id: "plan-1",
    execution_run_id: "execution-1",
    source_authority_kind: "SEALED_MANIFEST",
    source_authority_key: "authority-1",
    source_date_vector_sha256:
      surfaceCode === "UNIVERSE_SERVICE" ? SHA_A : null,
    full_row_digest_sha256: SHA_A,
    component_manifest_sha256: SHA_B,
    combined_surface_manifest_sha256: SHA_A,
    ...overrides,
  };
}

test("publication identity validation accepts only the two typed surfaces", () => {
  assert.deepEqual(requirePublicationIdentity(serviceRow()), {
    generation_id: GENERATION_G1,
    publication_version: 7,
    publication_event_id: EVENT_G1,
    published_at: PUBLISHED_G1,
    surface_code: "UNIVERSE_SERVICE",
  });

  assert.throws(
    () => requirePublicationIdentity(serviceRow({ surface_code: "OTHER" })),
    /surface_code/,
  );
  assert.throws(
    () => requirePublicationIdentity(serviceRow({ generation_id: null })),
    /generation_id/,
  );
  assert.throws(
    () => requirePublicationIdentity(serviceRow({ publication_version: 0 })),
    /publication_version/,
  );
});

test("UNIVERSE_SERVICE rowsets reject empty, wrong-universe, and pointer-flip mixtures", () => {
  const selected = requireUniformUniverseServicePublication(
    [serviceRow(), serviceRow({ complex_id: 2, rank_all: 2 })],
    "KOREA_ALL",
  );
  assert.equal(selected.generation_id, GENERATION_G1);
  assert.equal(selected.snapshot_date, "2026-07-31");
  assert.equal(selected.surface_code, "UNIVERSE_SERVICE");

  assert.throws(
    () => requireUniformUniverseServicePublication([], "KOREA_ALL"),
    /returned no rows/,
  );
  assert.throws(
    () =>
      requireUniformUniverseServicePublication(
        [serviceRow({ universe_code: "SEOUL_ALL" })],
        "KOREA_ALL",
      ),
    /does not match/,
  );
  assert.throws(
    () =>
      requireUniformUniverseServicePublication([
        serviceRow(),
        serviceRow({
          generation_id: GENERATION_G2,
          publication_version: 8,
          publication_event_id: EVENT_G2,
          published_at: PUBLISHED_G2,
        }),
      ]),
    /mixed publication identity/,
  );
  assert.throws(
    () =>
      requireUniformUniverseServicePublication([
        serviceRow(),
        serviceRow({ snapshot_date: "2026-08-01" }),
      ]),
    /snapshot_date/,
  );
});

test("publication currentness is sanitized, sorted, and generation-coherent", () => {
  const rows = sanitizePublicationCurrentnessRows([
    currentnessRow("UNIVERSE_SERVICE"),
    currentnessRow("GLOBAL_LATEST"),
  ]);
  assert.deepEqual(
    rows.map((row) => row.surface_code),
    ["GLOBAL_LATEST", "UNIVERSE_SERVICE"],
  );
  assert.ok(rows.every((row) => row.generation_id === GENERATION_G1));

  assert.throws(
    () => sanitizePublicationCurrentnessRows([currentnessRow("GLOBAL_LATEST")]),
    /exactly GLOBAL_LATEST and UNIVERSE_SERVICE/,
  );
  assert.throws(
    () =>
      sanitizePublicationCurrentnessRows([
        currentnessRow("GLOBAL_LATEST"),
        currentnessRow("UNIVERSE_SERVICE", {
          generation_id: GENERATION_G2,
          publication_version: 8,
          publication_event_id: EVENT_G2,
          published_at: PUBLISHED_G2,
        }),
      ]),
    /mixed currentness identity/,
  );
  assert.throws(
    () =>
      sanitizePublicationCurrentnessRows([
        currentnessRow("GLOBAL_LATEST"),
        currentnessRow("UNIVERSE_SERVICE"),
        currentnessRow("UNIVERSE_SERVICE"),
      ]),
    /duplicate publication currentness row/,
  );
});

test("rank readers use the published surface and forbid independent latest labeling", () => {
  const sources = {
    map: readSource("src/app/api/map/route.ts"),
    rankings: readSource("src/app/api/rankings/route.ts"),
    ranking: readSource("src/app/api/ranking/route.ts"),
    search: readSource("src/app/api/search/route.ts"),
    queries: readSource("src/lib/koaptix/queries.ts"),
  };

  for (const [name, source] of Object.entries(sources)) {
    assert.doesNotMatch(source, /koaptix_rank_snapshot/, `${name} rank MAX path`);
    assert.doesNotMatch(
      source,
      /v_koaptix_rank_latest_dynamic|v_koaptix_latest_board_compat/,
      `${name} identity-less fallback`,
    );
    assert.doesNotMatch(
      source,
      /v_koaptix_latest_board_publication_currentness/,
      `${name} later identity-label query`,
    );
  }

  for (const name of ["map", "rankings", "ranking", "queries"] as const) {
    assert.match(
      sources[name],
      /v_koaptix_latest_board_read_model_published/,
      `${name} published read model`,
    );
    assert.match(sources[name], /requireUniformUniverseServicePublication/);
  }

  assert.equal(countMatches(sources.search, /getLatestRankBoard\(/g), 1);
  assert.match(sources.search, /requirePublicationIdentity\(row/);
  assert.match(sources.search, /selectMatchingPublicationItems/);
  assert.doesNotMatch(sources.search, /source:\s*"live_dynamic"/);
});

test("TOP1000 V1 preserves authoritative weekly movement and exact-date cap semantics", () => {
  const page = readSource("src/app/ranking/page.tsx");
  const client = readSource("src/components/home/RankingBoardClient.tsx");
  const card = readSource("src/components/home/RankingCard.tsx");
  const route = readSource("src/app/api/ranking/route.ts");
  const queries = readSource("src/lib/koaptix/queries.ts");
  const types = readSource("src/lib/koaptix/types.ts");

  assert.match(page, /KOAPTIX TOP1000/);
  assert.match(page, /Weekly Rank Movement/i);
  assert.match(page, /presentation="weekly-movement-full-board"/);

  assert.match(
    types,
    /export type RankMovement = "NEW" \| "UP" \| "DOWN" \| "SAME"/,
  );
  assert.match(route, /previous_rank_all,/);
  assert.match(route, /rank_delta_w,/);
  assert.match(route, /rank_movement,/);
  assert.match(route, /normalizeRankMovement\(row\.rank_movement\)/);

  const itemMapper = sourceBetween(
    route,
    "function toRankingItem(",
    "export async function GET",
  );
  assert.match(itemMapper, /const rankDelta7d = toNullableNumber\(/);
  assert.doesNotMatch(itemMapper, /rankDelta7d[\s\S]{0,80}\?\?\s*0/);
  assert.doesNotMatch(itemMapper, /marketCapDelta7d[\s\S]{0,80}\?\?\s*0/);
  assert.doesNotMatch(
    itemMapper,
    /marketCapDeltaPct7d[\s\S]{0,80}\?\?\s*0/,
  );

  const exactCapHelper = sourceBetween(
    queries,
    "export async function getExactWeeklyMarketCapComparisonMap(",
    "async function fetchWeeklyComparisonByComplexId(",
  );
  assert.match(exactCapHelper, /shiftSeoulDateString\(normalizedBoardDate, -7\)/);
  assert.match(exactCapHelper, /\.eq\("snapshot_date", previousSnapshotDate\)/);
  assert.match(exactCapHelper, /\.in\("complex_id", complexIds\)/);
  assert.doesNotMatch(exactCapHelper, /getWeeklyAnchorDate/);
  assert.doesNotMatch(exactCapHelper, /rank_delta|rank_movement/);
  assert.match(route, /getExactWeeklyMarketCapComparisonMap\(latestBoardDate, rows\)/);
  assert.match(route, /history_snapshot_date: comparison\?\.history_snapshot_date \?\? null/);
  assert.match(route, /latestBoardDate,/);

  assert.match(client, /type MovementFilterKey = "ALL" \| "UP" \| "DOWN" \| "NEW"/);
  assert.match(client, /normalizeRankMovement\(item\) === selectedMovementFilter/);
  assert.match(client, /params\.set\("movement", selectedMovementFilter\.toLowerCase\(\)\)/);
  assert.match(client, /json\.latestBoardDate \?\? null/);
  assert.match(client, /Updated \{formattedLatestBoardDate\}/);
  assert.match(client, /const presentationBoardItems = useMemo/);
  assert.match(client, /containsMismatchedUniverse \? \[\] : boardItems/);
  assert.match(client, /response\.status === 409/);
  assert.match(client, /hasValidClarificationChoices/);

  assert.match(card, /getAuthoritativeMovement\(item\)/);
  assert.match(card, /data-rank-movement=\{movement \?\? "UNKNOWN"\}/);
  assert.match(card, /movement === "NEW"/);
  assert.match(card, /isExactWeeklyWindow\(previousSnapshotDate, currentSnapshotDate\)/);
  assert.match(card, /data-weekly-cap-available=/);
});

test("rank routes have private no-store and no cross-request rank caches", () => {
  const routePaths = [
    "src/app/api/map/route.ts",
    "src/app/api/rankings/route.ts",
    "src/app/api/ranking/route.ts",
    "src/app/api/search/route.ts",
    "src/app/api/currentness/route.ts",
    "src/app/api/home/route.ts",
  ];
  const forbiddenCacheState =
    /mapCache|mapInflight|boardCache|boardInflight|searchSourceCache|searchSourceInflight|freshUntil|staleUntil|latestRankBoardCooldownUntil/;

  for (const routePath of routePaths) {
    const source = readSource(routePath);
    assert.match(source, /private, no-store, max-age=0/, `${routePath} header`);
    assert.doesNotMatch(source, forbiddenCacheState, `${routePath} memory cache`);
    assert.equal(
      countMatches(source, /\bok:\s*true,/g),
      1,
      `${routePath} must have exactly one identity-bearing ok:true response`,
    );
  }
});

test("currentness endpoint returns sanitized DB publication state with deploy state", () => {
  const source = readSource("src/app/api/currentness/route.ts");
  assert.match(source, /v_koaptix_latest_board_publication_currentness/);
  assert.match(source, /sanitizePublicationCurrentnessRows\(data \?\? \[\]\)/);
  assert.match(source, /generation_id:\s*identity\.generation_id/);
  assert.match(source, /publicationCurrentness:\s*currentness/);
  assert.match(source, /status:\s*503/);
});

test("Home reads only the published wrapper and rejects identity-less selection", () => {
  const home = readSource("src/lib/koaptix/home.ts");
  const route = readSource("src/app/api/home/route.ts");
  const types = readSource("src/types/koaptix.ts");

  assert.match(home, /v_koaptix_home_public_service_payload_published/);
  assert.doesNotMatch(home, /KOAPTIX_HOME_LATEST_PAYLOAD_VIEW/);
  assert.doesNotMatch(home, /\.order\("snapshot_date"/);
  assert.doesNotMatch(home, /\.limit\(1\)|\.maybeSingle\(\)/);
  assert.match(home, /\.single\(\)/);
  assert.match(home, /requireHomeRankIdentity\(row\)/);
  assert.doesNotMatch(route, /s-maxage|stale-while-revalidate/);

  for (const field of [
    "rank_snapshot_date",
    "rank_generation_id",
    "rank_publication_version",
    "rank_publication_event_id",
    "rank_published_at",
  ]) {
    assert.match(types, new RegExp(`${field}:`));
  }
});

test("bounded runner and compiler configuration execute this contract", () => {
  const packageJson = JSON.parse(readSource("package.json")) as {
    scripts?: Record<string, string>;
  };
  const script = packageJson.scripts?.["test:rank-publication-contract"] ?? "";
  assert.match(script, /typescript\/bin\/tsc/);
  assert.match(script, /tsconfig\.rank-publication-contract-test\.json/);
  assert.match(script, /--test/);
  assert.match(script, /rankPublicationContract\.test\.js/);
  assert.match(script, /\.next\/rank-publication-contract-tests/);
  assert.match(script, /rmSync\(out,\{recursive:true,force:true\}\)/);
  assert.match(script, /process\.exit\(code\)/);

  const config = JSON.parse(
    readSource("tsconfig.rank-publication-contract-test.json"),
  ) as {
    compilerOptions: Record<string, unknown>;
    include: string[];
  };
  assert.deepEqual(config.compilerOptions, {
    module: "CommonJS",
    moduleResolution: "Node",
    target: "ES2022",
    rootDir: ".",
    outDir: ".next/rank-publication-contract-tests",
    noEmit: false,
    declaration: false,
    sourceMap: false,
    incremental: false,
    isolatedModules: false,
  });
  assert.deepEqual(config.include, [
    "src/app/api/map/route.ts",
    "src/app/api/rankings/route.ts",
    "src/app/api/ranking/route.ts",
    "src/app/api/search/route.ts",
    "src/app/api/currentness/route.ts",
    "src/lib/koaptix/queries.ts",
    "src/lib/koaptix/currentness.ts",
    "src/lib/koaptix/types.ts",
    "src/app/api/home/route.ts",
    "src/lib/koaptix/home.ts",
    "src/types/koaptix.ts",
    "tests/rankPublicationContract.test.ts",
  ]);
});
