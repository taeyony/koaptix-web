import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";

import type { SupabaseClient } from "@supabase/supabase-js";
import ts from "typescript";

import {
  DISCOVERY_REGION_FALLBACK_CANDIDATE_CAP,
  prioritizeExistingFullExactDiscoveryTerm,
} from "../src/lib/koaptix/discoverySearch";
import { hydrateDiscoveryRegionFallbacks } from "../src/lib/koaptix/discoverySearch.server";

type QueryResult = { data: unknown[] | null; error: { message: string } | null };
type Call = { table: string; operation: string; args: unknown[] };
type DiscoveryCopyInput = {
  warnings: string[];
  hasAreaHousehold: boolean;
  hasTradeClean: boolean;
};
type DiscoveryCopyResult = {
  badge: string;
  message: string;
  helperText: string;
};

function readSearchRouteSource() {
  return readFileSync(
    resolve(process.cwd(), "src/app/api/search/route.ts"),
    "utf8",
  );
}

function loadDiscoveryCopyFromRoute() {
  const routeSource = readSearchRouteSource();
  const sourceFile = ts.createSourceFile(
    "route.ts",
    routeSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const declaration = sourceFile.statements.find(
    (node): node is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(node) &&
      node.name?.text === "buildDiscoveryCopy",
  );

  assert.ok(declaration);
  const helperSource = declaration.getText(sourceFile);
  const transpiled = ts.transpileModule(helperSource, {
    compilerOptions: {
      module: ts.ModuleKind.None,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  return runInNewContext(
    `${transpiled}\nbuildDiscoveryCopy;`,
    Object.create(null),
  ) as (input: DiscoveryCopyInput) => DiscoveryCopyResult;
}

function createClient(results: Record<string, QueryResult>) {
  const calls: Call[] = [];

  class Builder implements PromiseLike<QueryResult> {
    constructor(private readonly table: string) {}

    select(columns: string) {
      calls.push({ table: this.table, operation: "select", args: [columns] });
      return this;
    }

    eq(column: string, value: unknown) {
      calls.push({ table: this.table, operation: "eq", args: [column, value] });
      return this;
    }

    in(column: string, values: readonly unknown[]) {
      calls.push({ table: this.table, operation: "in", args: [column, [...values]] });
      return this;
    }

    limit(value: number) {
      calls.push({ table: this.table, operation: "limit", args: [value] });
      return this;
    }

    then<TResult1 = QueryResult, TResult2 = never>(
      onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
      return Promise.resolve(
        results[this.table] ?? { data: [], error: null },
      ).then(onfulfilled, onrejected);
    }
  }

  const client = {
    from(table: string) {
      calls.push({ table, operation: "from", args: [] });
      return new Builder(table);
    },
  } as unknown as Pick<SupabaseClient, "from">;

  return { client, calls };
}

test("zero missing IDs make zero fallback DB calls", async () => {
  const { client, calls } = createClient({});
  const result = await hydrateDiscoveryRegionFallbacks(client, []);
  assert.deepEqual(result, { evidence: [], failure: null });
  assert.equal(calls.length, 0);
});

test("fallback reads only bounded required columns and produces canonical evidence", async () => {
  const { client, calls } = createClient({
    apt_complex: {
      data: [{ complex_id: 10511, region_id: 10 }],
      error: null,
    },
    region_dim: {
      data: [
        {
          region_id: 10,
          region_code: "11140",
          region_name_ko: "중구",
          full_name_ko: "서울특별시 중구",
        },
      ],
      error: null,
    },
  });

  const result = await hydrateDiscoveryRegionFallbacks(client, ["10511"]);
  assert.equal(result.failure, null);
  assert.equal(result.evidence[0]?.complexId, "10511");
  assert.equal(result.evidence[0]?.source, "APT_COMPLEX_REGION_FALLBACK");
  assert.deepEqual(
    calls.filter((call) => call.operation === "select").map((call) => call.args[0]),
    [
      "complex_id, region_id",
      "region_id, region_code, region_name_ko, full_name_ko",
    ],
  );
  assert.deepEqual(
    calls.filter((call) => call.operation === "limit").map((call) => call.args[0]),
    [1, 1],
  );
  assert.equal(calls.some((call) => ["insert", "update", "delete", "upsert", "rpc"].includes(call.operation)), false);
});

test("more than 48 IDs are capped before the apt lookup", async () => {
  const { client, calls } = createClient({ apt_complex: { data: [], error: null } });
  await hydrateDiscoveryRegionFallbacks(
    client,
    Array.from({ length: 60 }, (_, index) => String(index + 1)),
  );
  const aptIn = calls.find(
    (call) => call.table === "apt_complex" && call.operation === "in",
  );
  assert.equal((aptIn?.args[1] as unknown[]).length, 48);
  assert.equal(calls.some((call) => call.table === "region_dim"), false);
});

test("null region IDs make no region_dim call", async () => {
  const { client, calls } = createClient({
    apt_complex: { data: [{ complex_id: 1, region_id: null }], error: null },
  });
  const result = await hydrateDiscoveryRegionFallbacks(client, ["1"]);
  assert.deepEqual(result, { evidence: [], failure: null });
  assert.equal(calls.some((call) => call.table === "region_dim"), false);
});

test("missing or malformed canonical region rows fail closed", async () => {
  const { client } = createClient({
    apt_complex: { data: [{ complex_id: 1, region_id: 10 }], error: null },
    region_dim: {
      data: [{ region_id: 10, region_code: "bad", region_name_ko: "" }],
      error: null,
    },
  });
  const result = await hydrateDiscoveryRegionFallbacks(client, ["1"]);
  assert.deepEqual(result, { evidence: [], failure: null });
});

test("apt and region failures return sanitized additive failure states", async () => {
  const aptFailure = createClient({
    apt_complex: { data: null, error: { message: "secret apt error" } },
  });
  assert.deepEqual(await hydrateDiscoveryRegionFallbacks(aptFailure.client, ["1"]), {
    evidence: [],
    failure: "APT_COMPLEX_REGION_LOOKUP_FAILED",
  });

  const regionFailure = createClient({
    apt_complex: { data: [{ complex_id: 1, region_id: 10 }], error: null },
    region_dim: { data: null, error: { message: "secret region error" } },
  });
  assert.deepEqual(await hydrateDiscoveryRegionFallbacks(regionFailure.client, ["1"]), {
    evidence: [],
    failure: "REGION_DIM_LOOKUP_FAILED",
  });
});

test("full exact discovery term moves first while the remainder stays stable", () => {
  const terms = ["스파크", "압해팰리스파크", "신안 압해팰리스파크"];

  assert.deepEqual(
    prioritizeExistingFullExactDiscoveryTerm(terms, "압해팰리스파크"),
    ["압해팰리스파크", "스파크", "신안 압해팰리스파크"],
  );
});

test("exact-term prioritization returns a new array without insertion or mutation", () => {
  const alreadyFirst = ["압해팰리스파크", "스파크"];
  const alreadyFirstSnapshot = [...alreadyFirst];
  const alreadyFirstResult = prioritizeExistingFullExactDiscoveryTerm(
    alreadyFirst,
    "압해팰리스파크",
  );
  assert.deepEqual(alreadyFirstResult, alreadyFirstSnapshot);
  assert.notStrictEqual(alreadyFirstResult, alreadyFirst);
  assert.deepEqual(alreadyFirst, alreadyFirstSnapshot);

  const absent = ["스파크", "팰리스"];
  const absentSnapshot = [...absent];
  const absentResult = prioritizeExistingFullExactDiscoveryTerm(
    absent,
    "압해팰리스파크",
  );
  assert.deepEqual(absentResult, absentSnapshot);
  assert.notStrictEqual(absentResult, absent);
  assert.deepEqual(absent, absentSnapshot);
});

test("exact-term prioritization moves only the first exact occurrence", () => {
  const terms = ["스파크", "압해팰리스파크", "팰리스", "압해팰리스파크"];
  const result = prioritizeExistingFullExactDiscoveryTerm(
    terms,
    "압해팰리스파크",
  );

  assert.deepEqual(result, [
    "압해팰리스파크",
    "스파크",
    "팰리스",
    "압해팰리스파크",
  ]);
  assert.equal(
    result.filter((term) => term === "압해팰리스파크").length,
    2,
  );
  assert.deepEqual(terms, [
    "스파크",
    "압해팰리스파크",
    "팰리스",
    "압해팰리스파크",
  ]);
});

test("278060 exact term is first without changing the generated term set", () => {
  const generatedTerms = ["스파크", "압해팰리스파크"];
  const prioritizedTerms = prioritizeExistingFullExactDiscoveryTerm(
    generatedTerms,
    "압해팰리스파크",
  );

  assert.deepEqual(prioritizedTerms, ["압해팰리스파크", "스파크"]);
  assert.equal(prioritizedTerms.includes("스파크"), true);
  assert.deepEqual(
    [...prioritizedTerms].sort(),
    [...generatedTerms].sort(),
  );
});

test("exact target survives the unchanged 48-candidate cap under broad saturation", () => {
  const terms = prioritizeExistingFullExactDiscoveryTerm(
    ["스파크", "압해팰리스파크"],
    "압해팰리스파크",
  );
  const candidatesByTerm = new Map<string, string[]>([
    ["압해팰리스파크", ["278060"]],
    [
      "스파크",
      Array.from({ length: 60 }, (_, index) => String(400000 + index)),
    ],
  ]);
  const candidateIds = new Set<string>();

  for (const term of terms) {
    for (const complexId of candidatesByTerm.get(term) ?? []) {
      candidateIds.add(complexId);
    }
  }

  const capped = Array.from(candidateIds).slice(
    0,
    DISCOVERY_REGION_FALLBACK_CANDIDATE_CAP,
  );
  assert.equal(DISCOVERY_REGION_FALLBACK_CANDIDATE_CAP, 48);
  assert.equal(capped.length, 48);
  assert.equal(capped[0], "278060");
  assert.equal(capped.includes("278060"), true);
});

test("discovery copy is truthful for every area and trade evidence state", () => {
  const buildDiscoveryCopy = loadDiscoveryCopyFromRoute();
  const cases: Array<{
    name: string;
    input: DiscoveryCopyInput;
    expected: string;
  }> = [
    {
      name: "area absent and trade absent",
      input: {
        warnings: [
          "AREA_HOUSEHOLD_GAP",
          "TRADE_CLEAN_GAP",
          "MARKET_CAP_SOURCE_GAP",
        ],
        hasAreaHousehold: false,
        hasTradeClean: false,
      },
      expected:
        "평형별 세대수와 실거래 연결을 확인하고 있습니다. 가격·시가총액·랭킹 반영을 준비 중입니다.",
    },
    {
      name: "area present and trade absent",
      input: {
        warnings: ["TRADE_CLEAN_GAP", "MARKET_CAP_SOURCE_GAP"],
        hasAreaHousehold: true,
        hasTradeClean: false,
      },
      expected:
        "평형별 세대수는 확인됐습니다. 실거래 연결과 가격·시가총액·랭킹 반영을 준비 중입니다.",
    },
    {
      name: "area absent and trade present",
      input: {
        warnings: ["AREA_HOUSEHOLD_GAP", "MARKET_CAP_SOURCE_GAP"],
        hasAreaHousehold: false,
        hasTradeClean: true,
      },
      expected:
        "실거래는 확인됐습니다. 평형별 세대수 연결과 가격·시가총액·랭킹 반영을 준비 중입니다.",
    },
    {
      name: "area present and trade present",
      input: {
        warnings: ["MARKET_CAP_SOURCE_GAP"],
        hasAreaHousehold: true,
        hasTradeClean: true,
      },
      expected:
        "실거래와 평형별 세대수는 확인됐습니다. 가격·시가총액·랭킹 반영을 준비 중입니다.",
    },
  ];

  for (const fixture of cases) {
    const copy = buildDiscoveryCopy(fixture.input);
    assert.equal(copy.badge, "관측 준비중", fixture.name);
    assert.equal(copy.message, fixture.expected, fixture.name);
    assert.match(copy.message, /랭킹 반영을 준비 중입니다\.$/, fixture.name);
    assert.equal(copy.message.includes("랭킹 반영이 완료"), false, fixture.name);
  }
});

test("discovery copy preserves the source-ambiguity helper contract", () => {
  const buildDiscoveryCopy = loadDiscoveryCopyFromRoute();
  const standard = buildDiscoveryCopy({
    warnings: ["MARKET_CAP_SOURCE_GAP"],
    hasAreaHousehold: true,
    hasTradeClean: true,
  });
  const ambiguous = buildDiscoveryCopy({
    warnings: ["SOURCE_IDENTITY_AMBIGUOUS", "MARKET_CAP_SOURCE_GAP"],
    hasAreaHousehold: true,
    hasTradeClean: true,
  });

  assert.equal(
    standard.helperText,
    "랭킹 보드에 올리기 전 원천 연결과 공개 검증 상태를 더 확인하고 있습니다.",
  );
  assert.equal(
    ambiguous.helperText,
    "랭킹 보드에 올리기 전 원천 연결과 공개 검증 상태를 더 확인하고 있습니다. 일부 원천 연결은 추가 확인이 필요합니다.",
  );
});

test("route copy call uses the same existing area and trade facts as evidenceFlags", () => {
  const routeSource = readSearchRouteSource();
  const helperStart = routeSource.indexOf("function buildDiscoveryCopy");
  const loaderStart = routeSource.indexOf(
    "async function loadDiscoveryCandidates",
    helperStart,
  );
  const helperSource = routeSource.slice(helperStart, loaderStart);
  const dtoStart = routeSource.indexOf(
    "const sigunguName = regionMap.sigungu_name",
    loaderStart,
  );
  const dtoEnd = routeSource.indexOf(
    ".filter((candidate): candidate is DiscoveryCandidate",
    dtoStart,
  );
  const dtoSource = routeSource.slice(dtoStart, dtoEnd);

  assert.equal(helperStart >= 0, true);
  assert.equal(loaderStart > helperStart, true);
  assert.equal(dtoStart > loaderStart, true);
  assert.equal(dtoEnd > dtoStart, true);
  assert.match(
    helperSource,
    /function buildDiscoveryCopy\(\{\s*warnings,\s*hasAreaHousehold,\s*hasTradeClean,\s*\}: DiscoveryCopyEvidence\)/,
  );
  assert.match(
    dtoSource,
    /const hasAreaHousehold = areaHouseholdIds\.has\(complexId\);/,
  );
  assert.match(
    dtoSource,
    /const hasTradeClean = tradeCleanIds\.has\(complexId\);/,
  );
  assert.match(
    dtoSource,
    /evidenceFlags:\s*\{[\s\S]*?\bhasAreaHousehold,\s*\bhasTradeClean,/,
  );
  assert.match(
    dtoSource,
    /copy: buildDiscoveryCopy\(\{\s*warnings,\s*hasAreaHousehold,\s*hasTradeClean,\s*\}\)/,
  );
  assert.deepEqual(
    Array.from(helperSource.matchAll(/\.from\("([^"]+)"\)/g)),
    [],
  );
});

test("copy patch preserves admission, membership, ordering, dedup, and actions", () => {
  const routeSource = readSearchRouteSource();
  const assessmentStart = routeSource.indexOf(
    "function assessDiscoveryCandidate",
  );
  const assessmentEnd = routeSource.indexOf(
    "async function fetchDiscoveryCandidateIds",
    assessmentStart,
  );
  const assessmentSource = routeSource.slice(assessmentStart, assessmentEnd);
  const loaderStart = routeSource.indexOf(
    "async function loadDiscoveryCandidates",
  );
  const loaderEnd = routeSource.indexOf(
    "function getSearchSourceLimit",
    loaderStart,
  );
  const loaderSource = routeSource.slice(loaderStart, loaderEnd);

  assert.match(
    assessmentSource,
    /const downstreamEvidence =\s*flags\.hasAreaHousehold \|\|\s*flags\.hasTradeClean \|\|/,
  );
  assert.match(
    assessmentSource,
    /\(flags\.hasTradeClean \? 20 : 0\) \+\s*\(flags\.hasPriceSnapshot \|\| flags\.hasComponentSnapshot \? 20 : 0\)/,
  );
  assert.match(
    assessmentSource,
    /passes: score >= \(hasRegionContext \? 140 : 180\)/,
  );
  assert.equal(assessmentSource.includes("buildDiscoveryCopy"), false);
  assert.match(loaderSource, /return dedupeDiscoveryByComplexId\(/);
  assert.match(
    loaderSource,
    /\.slice\(0, SEARCH_DISCOVERY_CANDIDATE_LIMIT\)/,
  );
  assert.match(
    loaderSource,
    /disabledActions:\s*\{\s*openRankedDetail: true,\s*showMarketCap: true,\s*showRank: true,\s*showChart: true,\s*\}/,
  );
  assert.equal(
    loaderSource.indexOf("isDiscoveryOnlyEligible(") <
      loaderSource.indexOf("copy: buildDiscoveryCopy("),
    true,
  );
});

test("product route contains no shield ID, cohort, or payload branching", () => {
  const routeSource = readSearchRouteSource();
  const shieldIds = [
    "4760",
    "306118",
    "306130",
    "306192",
    "306237",
    "306264",
    "306343",
    "306386",
    "306427",
    "306456",
    "306501",
    "306575",
    "306609",
    "306663",
    "306664",
    "306666",
    "306689",
  ];

  for (const complexId of shieldIds) {
    assert.equal(routeSource.includes(complexId), false, complexId);
  }
  assert.equal(routeSource.includes("destination-payload.csv"), false);
  assert.equal(
    routeSource.includes(
      "E0456E3F98368677F30FD465975333A2B7399A21C36457930BA7FAFCFC3BFF57",
    ),
    false,
  );
  assert.equal(routeSource.includes(".handoff/area-household-66"), false);
});

test("search route wires the existing generated terms through the ordering helper once", () => {
  const routeSource = readFileSync(
    resolve(process.cwd(), "src/app/api/search/route.ts"),
    "utf8",
  );
  const candidateStart = routeSource.indexOf(
    "async function fetchDiscoveryCandidateIds",
  );
  const candidateEnd = routeSource.indexOf(
    "function mergeDiscoverySeeds",
    candidateStart,
  );
  const candidateSource = routeSource.slice(candidateStart, candidateEnd);

  assert.equal(candidateStart >= 0, true);
  assert.equal(candidateEnd > candidateStart, true);
  assert.equal(
    (candidateSource.match(/getDiscoveryNameTerms\(q\)/g) ?? []).length,
    1,
  );
  assert.equal(
    (
      candidateSource.match(
        /prioritizeExistingFullExactDiscoveryTerm\(/g,
      ) ?? []
    ).length,
    1,
  );
  assert.match(
    candidateSource,
    /const nameTerms = prioritizeExistingFullExactDiscoveryTerm\(\s*getDiscoveryNameTerms\(q\),\s*q,\s*\);/,
  );
  assert.equal(
    candidateSource.indexOf("prioritizeExistingFullExactDiscoveryTerm(") <
      candidateSource.indexOf(
        "for (const term of nameSourceLimit > 0 ? nameTerms : [])",
      ),
    true,
  );
});

test("search route keeps probe families, limits, sets, and final cap unchanged", () => {
  const routeSource = readFileSync(
    resolve(process.cwd(), "src/app/api/search/route.ts"),
    "utf8",
  );
  const candidateStart = routeSource.indexOf(
    "async function fetchDiscoveryCandidateIds",
  );
  const candidateEnd = routeSource.indexOf(
    "function mergeDiscoverySeeds",
    candidateStart,
  );
  const candidateSource = routeSource.slice(candidateStart, candidateEnd);

  assert.deepEqual(
    Array.from(candidateSource.matchAll(/\.from\("([^"]+)"\)/g)).map(
      (match) => match[1],
    ),
    ["apt_complex", "complex_name_alias", "koaptix_complex_region_map"],
  );
  assert.equal(
    (candidateSource.match(/new Set<string>\(\)/g) ?? []).length,
    3,
  );
  assert.equal(
    (candidateSource.match(/\.limit\(nameSourceLimit\)/g) ?? []).length,
    2,
  );
  assert.equal(
    (candidateSource.match(/\.limit\(regionSourceLimit\)/g) ?? []).length,
    1,
  );
  assert.equal(
    candidateSource.includes('.ilike("apt_name_ko", `%${term}%`)'),
    true,
  );
  assert.equal(
    candidateSource.includes('.ilike("alias_name", `%${term}%`)'),
    true,
  );
  assert.equal(
    candidateSource.includes(
      '.or(`umd_nm.ilike.%${term}%,sigungu_name.ilike.%${term}%`)',
    ),
    true,
  );
  assert.equal(
    candidateSource.includes(
      "Array.from(candidateIds).slice(0, getDiscoveryHydrationLimit(classification))",
    ),
    true,
  );
});

test("search route narrows the scoped KOREA guard through bounded region hydration", () => {
  const routeSource = readFileSync(
    resolve(process.cwd(), "src/app/api/search/route.ts"),
    "utf8",
  );
  const rankedCandidateIndex = routeSource.indexOf(
    "let rankedCandidateItems = mergeUniqueByComplexId",
  );
  const seedActivationIndex = routeSource.indexOf(
    "shouldCollectScopedKoreaRankAuthoritySeeds({",
  );
  const companionSeedIndex = routeSource.indexOf(
    "await loadRegionalNameCompanionItems(",
    rankedCandidateIndex,
  );
  const seedPlanIndex = routeSource.indexOf(
    "buildBoundedKoreaRankAuthoritySeedPlan(",
  );
  const authorityLookupIndex = routeSource.indexOf(
    "await fetchBoundedKoreaRankAuthorityRows(",
  );
  const authorityMergeIndex = routeSource.indexOf(
    "mergeKoreaRankedAuthorityCandidates(",
  );
  const guardIndex = routeSource.indexOf(
    "const suppressUnscopedKoreaRankedResults",
  );
  const activationIndex = routeSource.indexOf(
    "shouldHydrateScopedKoreaRankedCandidates({",
  );
  const hydrationIndex = routeSource.indexOf(
    "await filterRankedSearchCandidatesByRegionScope(",
  );
  const capIndex = routeSource.indexOf(
    "localItems = scopedRankedResult.items.slice(0, limit);",
  );

  assert.equal(rankedCandidateIndex >= 0, true);
  assert.equal(seedActivationIndex > rankedCandidateIndex, true);
  assert.equal(companionSeedIndex > seedActivationIndex, true);
  assert.equal(seedPlanIndex > companionSeedIndex, true);
  assert.equal(authorityLookupIndex > seedPlanIndex, true);
  assert.equal(authorityMergeIndex > authorityLookupIndex, true);
  assert.equal(guardIndex > authorityMergeIndex, true);
  assert.equal(activationIndex > guardIndex, true);
  assert.equal(hydrationIndex > activationIndex, true);
  assert.equal(capIndex > hydrationIndex, true);
  assert.equal(
    (routeSource.match(/suppressUnscopedKoreaRankedResults/g) ?? []).length >= 2,
    true,
  );
  assert.match(
    routeSource,
    /residualQuery:\s*regionResolution\.residualQuery/,
  );
  assert.match(
    routeSource,
    /candidateCount:\s*rankedCandidateItems\.length/,
  );
});

test("scoped KOREA keeps global rows empty and gives restored ranked IDs discovery precedence", () => {
  const routeSource = readFileSync(
    resolve(process.cwd(), "src/app/api/search/route.ts"),
    "utf8",
  );
  const guardStart = routeSource.indexOf(
    "let rankedCandidateItems = mergeUniqueByComplexId",
  );
  const responseStart = routeSource.indexOf(
    "return NextResponse.json(",
    guardStart,
  );
  const scopedSource = routeSource.slice(guardStart, responseStart);
  const localIndex = scopedSource.indexOf("let localItems:");
  const globalIndex = scopedSource.indexOf("const globalItems =");
  const discoveryIndex = scopedSource.indexOf(
    "const discoveryCandidates = await loadDiscoveryCandidates(",
  );

  assert.equal(localIndex >= 0, true);
  assert.equal(globalIndex > localIndex, true);
  assert.equal(discoveryIndex > globalIndex, true);
  assert.match(
    scopedSource,
    /const globalItems =\s*regionResolution\.effectiveRegionScope\s*\|\|[\s\S]*?\?\s*\[\]/,
  );
  assert.match(
    scopedSource,
    /new Set\(\s*\[\.\.\.localItems,\s*\.\.\.globalItems\]/,
  );
});

test("ranked region helper has only bounded batch reads and no DB call inside a loop", () => {
  const helperSource = readFileSync(
    resolve(
      process.cwd(),
      "src/lib/koaptix/rankedSearchRegionScope.server.ts",
    ),
    "utf8",
  );
  const sourceFile = ts.createSourceFile(
    "rankedSearchRegionScope.server.ts",
    helperSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const fromCallsInsideLoops: string[] = [];

  function visit(node: ts.Node, insideLoop: boolean) {
    const nextInsideLoop =
      insideLoop ||
      ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isWhileStatement(node) ||
      ts.isDoStatement(node);
    if (
      nextInsideLoop &&
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "from"
    ) {
      fromCallsInsideLoops.push(node.getText(sourceFile));
    }
    ts.forEachChild(node, (child) => visit(child, nextInsideLoop));
  }
  visit(sourceFile, false);

  assert.match(
    helperSource,
    /RANKED_SEARCH_REGION_CANDIDATE_CAP = 80/,
  );
  assert.deepEqual(
    Array.from(helperSource.matchAll(/\.from\("([^"]+)"\)/g)).map(
      (match) => match[1],
    ),
    [
      "koaptix_complex_region_map",
      "apt_complex",
      "region_dim",
    ],
  );
  assert.equal((helperSource.match(/Promise\.all\(/g) ?? []).length, 1);
  assert.deepEqual(fromCallsInsideLoops, []);
});

test("KOREA authority lookup is exact, bounded, and separate from regional evidence", () => {
  const helperSource = readFileSync(
    resolve(
      process.cwd(),
      "src/lib/koaptix/rankedSearchRegionScope.server.ts",
    ),
    "utf8",
  );
  const authorityStart = helperSource.indexOf(
    "export async function fetchBoundedKoreaRankAuthorityRows",
  );
  const mergeStart = helperSource.indexOf(
    "export function mergeKoreaRankedAuthorityCandidates",
  );
  const authoritySource = helperSource.slice(authorityStart, mergeStart);

  assert.equal(authorityStart >= 0, true);
  assert.equal(mergeStart > authorityStart, true);
  assert.match(
    authoritySource,
    /\.eq\("universe_code", KOREA_ALL_UNIVERSE_CODE\)/,
  );
  assert.match(
    authoritySource,
    /\.in\("complex_id", normalizedIds\)/,
  );
  assert.match(
    authoritySource,
    /\.order\("rank_all", \{ ascending: true \}\)/,
  );
  assert.match(
    authoritySource,
    /\.limit\(normalizedIds\.length \+ 1\)/,
  );
  assert.equal(
    (authoritySource.match(/\.from\(/g) ?? []).length,
    1,
  );
  assert.equal(
    /koaptix_complex_region_map|apt_complex|region_dim/.test(authoritySource),
    false,
  );
});
