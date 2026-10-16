import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { ModuleKind, transpileModule } from "typescript";
import * as indexContract from "../src/types/koaptix";
import * as weeklyComparison from "../src/lib/koaptix/weeklyRankComparison";

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
    const rankSource = name === "queries" ? source.replace(sourceBetween(source,
      "export async function getCommonWeeklyRankComparisons(", "export async function getLatestRankBoard("), "") : source;
    assert.doesNotMatch(
      rankSource,
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

  assert.match(page, /전체 아파트 순위/);
  assert.match(page, /이번 주 순위 변화/);
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
  assert.match(client, /기준일 \{formattedLatestBoardDate\}/);
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
    const successResponses = countMatches(source, /\bok:\s*true,/g);
    if (routePath === "src/app/api/search/route.ts") {
      // Existing search degradation returns no ranking rows or financial values.
      const degraded = sourceBetween(source, '// Search keeps the requested universe identity', '...getKoaptixDeploymentHeaders()');
      assert.match(degraded, /localItems:\s*\[\]/);
      assert.match(degraded, /globalItems:\s*\[\]/);
      assert.doesNotMatch(degraded, /marketCapKrw:|rank:/);
      assert.equal(countMatches(degraded, /source:\s*"empty_degraded"/g), 1);
      assert.equal(countMatches(source, /ok:\s*true,\s*generation_id:/g), 1);
      assert.equal(successResponses, 2, "one published result plus one empty degraded response");
    } else {
      assert.equal(successResponses, 1, `${routePath} must have exactly one ok:true response`);
    }
  }
});

test("common-cohort reader requires complete pages and the same exact-week publication", async () => {
  const rows = Array.from({ length: 1001 }, (_, i) => serviceRow({ complex_id: i + 1, rank_all: i + 1, previous_rank_all: 1001 - i }));
  async function run(mode: "valid" | "partial" | "pointer-flip" | "metadata-flip" | "wrong-week") {
    const metadata = currentnessRow("UNIVERSE_SERVICE", { row_count: rows.length, source_previous_snapshot_date: mode === "wrong-week" ? "2026-07-23" : "2026-07-24", ...(mode === "metadata-flip" ? { generation_id: GENERATION_G2 } : {}) });
    const client = { from() { return {
      select() { return this; }, eq() { return this; }, order() { return this; },
      async maybeSingle() { return { data: metadata, error: null }; },
      async range(start: number, end: number) {
        const data = mode === "partial" && start > 0 ? [] : rows.slice(start, end + 1).map(row => mode === "pointer-flip" && start > 0 ? { ...row, generation_id: GENERATION_G2 } : row);
        return { data, count: rows.length, error: null };
      },
    }; } };
    const moduleRef = { exports: {} as Pick<typeof import("../src/lib/koaptix/queries"), "getCommonWeeklyRankComparisons"> };
    runInNewContext(transpileModule(readSource("src/lib/koaptix/queries.ts"), { compilerOptions: { module: ModuleKind.CommonJS } }).outputText, {
      module: moduleRef, exports: moduleRef.exports, setTimeout, clearTimeout,
      process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://test.invalid", NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-only" } },
      require(name: string) {
        if (name === "@supabase/supabase-js") return { createClient: () => client };
        if (name === "./currentness") return { requireUniformUniverseServicePublication };
        if (name === "./weeklyRankComparison") return weeklyComparison;
        if (name === "./universes") return {};
        if (name === "../../types/koaptix") return indexContract;
        throw new Error("Unexpected comparison dependency: " + name);
      },
    });
    return moduleRef.exports.getCommonWeeklyRankComparisons(rows.slice(0, 2) as import("../src/lib/koaptix/types").DbLatestRankBoardRow[]);
  }
  assert.equal((await run("valid")).commonComplexCount, 1001);
  for (const mode of ["partial", "pointer-flip", "metadata-flip", "wrong-week"] as const) await assert.rejects(run(mode));
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

function loadIndexHistoryFixture() {
  const chart = Array.from({ length: 80 }, (_, i) => ({
    snapshot_date: new Date(Date.UTC(2024, 6, 31 + i * 7)).toISOString().slice(0, 10),
    universe_code: "KOREA_ALL", index_code: "KOAPTIX_KOREA", index_name: "KOAPTIX KOREA",
    base_date: "2024-07-31", base_value: 1000, index_value: 1000 + i,
    component_complex_count: i === 0 ? 386 : 1000, total_market_cap_krw: 10000 + i,
  }));
  const filters: Array<[string, unknown]> = [];
  const client = {
    from(name: string) {
      assert.equal(name, "v_koaptix_index_timeseries");
      return {
        select() { return this; },
        eq(column: string, value: unknown) { filters.push([column, value]); return this; },
        order() { return this; },
        async limit(limit: number) { assert.equal(limit, 200); return { data: [...chart].reverse(), error: null }; },
      };
    },
  };
  const moduleRef = { exports: {} as {
    getIndexChartPayload(code: string): Promise<import("../src/lib/koaptix/queries").HomeIndexChartPayload>;
  } };
  // Exercise the actual reader and existing baseline guards with no credentials.
  runInNewContext(transpileModule(readSource("src/lib/koaptix/queries.ts"), {
    compilerOptions: { module: ModuleKind.CommonJS },
  }).outputText, {
    module: moduleRef, exports: moduleRef.exports,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://test.invalid", NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-only" } },
    require(name: string) {
      if (name === "@supabase/supabase-js") return { createClient: () => client };
      if (name === "./universes") return { DEFAULT_UNIVERSE_CODE: "KOREA_ALL", resolveServiceUniverseCode: (code: string) => code, getUniverseLabel: () => "대한민국 전체" };
      if (name === "./currentness") return {};
      if (name === "./weeklyRankComparison") return {};
      if (name === "../../types/koaptix") return indexContract;
      throw new Error("Unexpected history dependency: " + name);
    },
  });
  return { api: moduleRef.exports, filters, chart };
}

test("existing public index reader retains all 80 approved service points", async () => {
  const fixture = loadIndexHistoryFixture();
  const history = await fixture.api.getIndexChartPayload("KOREA_ALL");
  assert.equal(history.rows.length, 80);
  assert.equal(history.rows[0].snapshotDate, "2024-07-31");
  assert.equal(history.rows.at(-1)?.value, 1079);
  assert.equal(history.rows[0].componentComplexCount, 386);
  assert.equal(history.publicExposureStatus, "blocked");
  assert.equal(history.changePct1m, null, "legacy lag is not a verified monthly return");
  assert.deepEqual(fixture.filters, [
    ["universe_code", "KOREA_ALL"], ["index_code", "KOAPTIX_KOREA"], ["base_date", "2024-07-31"],
  ]);
});

test("index reader still blocks official genesis and unapproved baselines", async () => {
  for (const baseDate of ["2024-01-01", "2024-08-31"]) {
    const fixture = loadIndexHistoryFixture();
    fixture.chart.at(-1)!.base_date = baseDate;
    const history = await fixture.api.getIndexChartPayload("KOREA_ALL");
    assert.equal(history.rows.length, 0);
    assert.equal(history.indexValue, null);
    assert.equal(history.publicExposureStatus, "blocked");
  }
});

test("mixed official chart points are excluded without changing service values", async () => {
  const fixture = loadIndexHistoryFixture();
  fixture.chart[0].base_date = "2024-01-01";
  const history = await fixture.api.getIndexChartPayload("KOREA_ALL");
  assert.equal(history.rows.length, 79);
  assert.ok(history.rows.every(point => point.baseDate === "2024-07-31"));
  assert.equal(history.rows.at(-1)?.value, 1079);
  assert.equal(history.mixedBaselineGuard, "filtered_mixed_rows");
});

test("other-universe rows cannot appear as national index points", async () => {
  const fixture = loadIndexHistoryFixture();
  fixture.chart.forEach(point => { point.universe_code = "SEOUL_ALL"; });
  const history = await fixture.api.getIndexChartPayload("KOREA_ALL");
  assert.equal(history.rows.length, 0);
  assert.equal(history.indexValue, null);
  assert.equal(history.renderedUniverseCode, "KOREA_ALL");
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
