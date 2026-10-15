import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as mappers from "../src/lib/koaptix/mappers";
import type { DbComplexChartHistoryRow, HistoryChartPoint } from "../src/lib/koaptix/types";
import { KOAPTIX_OFFICIAL_BASE_DATE } from "../src/types/koaptix";

type Fixture = {
  status: string;
  sourceObservedAt: string;
  sourceNote: string;
  dates: string[];
  series: Record<string, { name: string; blockedReasons: string[]; rows: DbComplexChartHistoryRow[] }>;
};

function fixture(): Fixture {
  return {
    status: "LOCAL_REVIEW_ONLY",
    sourceObservedAt: "2026-10-15T05:00:00.000Z",
    sourceNote: "Current-input reconstruction; historical knowledge not proven.",
    dates: ["2024-01-01", "2024-01-31", "2024-02-29", "2024-03-31"],
    series: {
      "486": { name: "Offline complex", blockedReasons: [], rows: [
        { snapshot_date: "2024-01-01", complex_id: 486, market_cap_krw: 100, rank_all: null, sourceKey: "accepted-baseline" },
        { snapshot_date: "2024-01-31", complex_id: 486, market_cap_krw: null, rank_all: null, sourceKey: "restored-monthly" },
        { snapshot_date: "2024-02-29", complex_id: 486, market_cap_krw: 130, rank_all: null, sourceKey: "restored-monthly" },
        { snapshot_date: "2024-03-31", complex_id: 486, market_cap_krw: 140, rank_all: null, sourceKey: "restored-monthly" },
      ] },
      "999": { name: "Blocked complex", blockedReasons: ["HOUSEHOLD_CONFLICT"], rows: [] },
    },
  };
}

type RecoveryResult = {
  rowsById: Record<string, DbComplexChartHistoryRow[]>;
  reasonsById: Record<string, string[]>;
  sourceObservedAt: string;
  sourceNote: string;
  expectedPointCount: number;
};

type RecoveryModule = {
  isLocalHistoryReview: (url: string, nodeEnv?: string) => boolean;
  readLocalHistoryRecovery: (ids: string[]) => Promise<RecoveryResult>;
};

const OFFLINE_CWD = resolve(".next", "history-recovery-test-fixture");

function loadRecovery(options: { input?: unknown; nodeEnv?: string; vercelEnv?: string; readError?: boolean; rawText?: string } = {}) {
  const reads: Array<{ path: string; encoding: string }> = [];
  const exports = {} as RecoveryModule;
  const source = readFileSync(resolve("src/lib/koaptix/complexHistoryRecovery.ts"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(compiled, {
    exports, URL,
    process: { env: { NODE_ENV: options.nodeEnv ?? "development", VERCEL_ENV: options.vercelEnv }, cwd: () => OFFLINE_CWD },
    require(name: string) {
      if (name === "node:path") return { join };
      if (name === "node:fs/promises") return {
        async readFile(path: string, encoding: string) {
          reads.push({ path, encoding });
          assert.equal(path, join(OFFLINE_CWD, "outputs", "complex-history-full-recovery-20261015", "chart-review.json"));
          assert.equal(encoding, "utf8");
          if (options.readError) throw new Error("Offline fixture file unavailable");
          return options.rawText ?? JSON.stringify(options.input ?? fixture());
        },
      };
      throw new Error(`Unexpected local recovery dependency ${name}`);
    },
  });
  return { recovery: exports, reads };
}

const REVIEW_QUERY = "/api/complex-history?complexId=486&mode=monthly&range=since-base&review=restored";

test("review access requires local development, an explicit review request and the full range", () => {
  const { recovery, reads } = loadRecovery();
  for (const host of ["127.0.0.1:3100", "localhost:3100", "[::1]:3100"]) {
    assert.equal(recovery.isLocalHistoryReview(`http://${host}${REVIEW_QUERY}`), true);
  }
  for (const url of [
    `https://koaptix.com${REVIEW_QUERY}`,
    `http://localhost.example.test${REVIEW_QUERY}`,
    `http://127.0.0.1:3100${REVIEW_QUERY.replace("&review=restored", "")}`,
    `http://127.0.0.1:3100${REVIEW_QUERY.replace("&range=since-base", "")}`,
    `http://127.0.0.1:3100${REVIEW_QUERY.replace("mode=monthly", "mode=ma7")}`,
  ]) assert.equal(recovery.isLocalHistoryReview(url), false, url);
  assert.equal(reads.length, 0);
});

test("production, test and Vercel Preview/Production never read the local artifact", async () => {
  for (const environment of [
    { nodeEnv: "production" }, { nodeEnv: "test" },
    { nodeEnv: "development", vercelEnv: "preview" }, { nodeEnv: "development", vercelEnv: "production" },
  ]) {
    const { recovery, reads } = loadRecovery(environment);
    assert.equal(recovery.isLocalHistoryReview(`http://localhost:3100${REVIEW_QUERY}`), false);
    await assert.rejects(recovery.readLocalHistoryRecovery(["486"]), /disabled/);
    assert.equal(reads.length, 0);
  }
});

test("the reader preserves the complete grid including nulls and returns no data for blocked/outside IDs", async () => {
  const { recovery, reads } = loadRecovery();
  const result = await recovery.readLocalHistoryRecovery(["486", "999", "777"]);
  assert.deepEqual(JSON.parse(JSON.stringify(result.rowsById["486"])), fixture().series["486"].rows);
  assert.equal(result.rowsById["486"][1].market_cap_krw, null);
  assert.equal(result.rowsById["999"].length, 0);
  assert.equal(result.rowsById["777"].length, 0);
  assert.deepEqual(Array.from(result.reasonsById["999"]), ["HOUSEHOLD_CONFLICT"]);
  assert.deepEqual(Array.from(result.reasonsById["777"]), ["OUTSIDE_CAPTURED_PUBLIC_COHORT"]);
  assert.equal(result.expectedPointCount, 4);
  assert.equal(reads.length, 1);
});

test("invalid complex identifiers are rejected before file access", async () => {
  for (const ids of [[], ["../486"], ["0"], ["-1"], ["4.86"], ["9007199254740992"]]) {
    const { recovery, reads } = loadRecovery();
    await assert.rejects(recovery.readLocalHistoryRecovery(ids), /Invalid historical review complex ID/);
    assert.equal(reads.length, 0);
  }
});

test("incomplete and completely missing unblocked date grids never become successful empty history", async () => {
  for (const rows of [fixture().series["486"].rows.slice(1), []]) {
    const input = fixture();
    input.series["486"].rows = rows;
    await assert.rejects(loadRecovery({ input }).recovery.readLocalHistoryRecovery(["486"]), /Incomplete historical review date grid/);
  }
});

test("blocked series cannot smuggle points and duplicate dates are rejected even for identical amounts", async () => {
  const blocked = fixture();
  blocked.series["486"].blockedReasons = ["BLOCKED"];
  await assert.rejects(loadRecovery({ input: blocked }).recovery.readLocalHistoryRecovery(["486"]), /Blocked history cannot contain review points/);
  const duplicate = fixture();
  duplicate.series["486"].rows.push({ ...duplicate.series["486"].rows[0] });
  await assert.rejects(loadRecovery({ input: duplicate }).recovery.readLocalHistoryRecovery(["486"]), /Invalid historical review point/);
});

test("wrong complex/date, nonpositive values, unsafe integers and invalid provenance are rejected", async () => {
  const invalidRows: unknown[] = [
    { complex_id: 4959 }, { snapshot_date: "2026-01-01" },
    { market_cap_krw: 0 }, { market_cap_krw: -1 }, { market_cap_krw: 1.5 },
    { market_cap_krw: Number.MAX_SAFE_INTEGER + 1 }, { market_cap_krw: "100" },
    { sourceKey: "" }, { sourceKey: 123 }, { segmentKey: "" }, { breakBefore: "true" },
  ];
  for (const override of invalidRows) {
    const input = fixture();
    input.series["486"].rows[0] = { ...input.series["486"].rows[0], ...override as object };
    await assert.rejects(loadRecovery({ input }).recovery.readLocalHistoryRecovery(["486"]), /Invalid historical review point/);
  }
});

test("invalid top-level contracts, malformed series and corrupt date grids fail closed", async () => {
  for (const input of [
    { ...fixture(), status: "PUBLIC" }, { ...fixture(), sourceObservedAt: "not-a-date" },
    { ...fixture(), sourceNote: "" }, { ...fixture(), series: [] },
    { ...fixture(), dates: ["2024-01-01", "2024-02-30"] },
    { ...fixture(), dates: ["2024-01-01", "2024-01-31", "2024-01-31"] },
    { ...fixture(), dates: ["2024-01-01", "2024-03-31", "2024-01-31"] },
    { ...fixture(), dates: ["2024-01-01", 20240229] },
    { ...fixture(), series: { "486": { rows: fixture().series["486"].rows, blockedReasons: "BLOCKED" } } },
    { ...fixture(), series: { "486": { rows: {}, blockedReasons: [] } } },
  ]) {
    await assert.rejects(loadRecovery({ input }).recovery.readLocalHistoryRecovery(["486"]), /Historical review .*contract mismatch|Invalid historical review date grid/);
  }
  await assert.rejects(loadRecovery({ rawText: "{" }).recovery.readLocalHistoryRecovery(["486"]));
});

function loadRoute(options: Parameters<typeof loadRecovery>[0] = {}) {
  const local = loadRecovery(options);
  const publicCalls: Array<{ ids: string[]; options: { days: number; sinceBase?: boolean } }> = [];
  const publicRows = [
    { snapshot_date: "2026-04-30", complex_id: 486, market_cap_krw: 900, rank_all: 1 },
    { snapshot_date: "2026-05-03", complex_id: 486, market_cap_krw: 1000, rank_all: 1 },
  ];
  const exports: { GET?: (request: Request) => Promise<Response> } = {};
  const source = readFileSync(resolve("src/app/api/complex-history/route.ts"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(compiled, {
    exports, URL, Response,
    require(name: string) {
      if (name.endsWith("/mappers")) return mappers;
      if (name.endsWith("/types/koaptix")) return { KOAPTIX_OFFICIAL_BASE_DATE };
      if (name.endsWith("/complexHistoryRecovery")) return local.recovery;
      if (name.endsWith("/complexHistoryReference")) return {
        selectComplexHistoryReference() { throw new Error("Reference selection was not requested"); },
      };
      if (name.endsWith("/queries")) return {
        COMPLEX_CHART_HISTORY_ROW_LIMIT: 2500,
        async getComplexChartHistories(ids: string[], queryOptions: { days: number; sinceBase?: boolean }) {
          publicCalls.push({ ids, options: queryOptions });
          return Object.fromEntries(ids.map(id => [id, id === "486" ? publicRows : []]));
        },
      };
      throw new Error(`Unexpected history route dependency ${name}`);
    },
  });
  assert.ok(exports.GET);
  return { ...local, GET: exports.GET, publicCalls, publicRows };
}

test("explicit local review uses only the artifact, preserves null gaps and identifies the basis", async () => {
  const { GET, reads, publicCalls } = loadRoute();
  const response = await GET(new Request(`http://localhost:3100${REVIEW_QUERY.replace("complexId=486", "complexId=486,999,777")}`));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(publicCalls.length, 0);
  assert.equal(reads.length, 1);
  const primary = payload.data.series[0];
  assert.equal(primary.range.basis, "restored-local-review");
  assert.equal(primary.range.localOnly, true);
  assert.equal(primary.range.expectedPointCount, 4);
  assert.equal(primary.range.excludedPointCount, 1);
  assert.deepEqual(primary.points.map((point: HistoryChartPoint) => [point.snapshotDate, point.value, point.breakBefore ?? false]), [
    ["2024-01-01", 100, false], ["2024-02-29", 130, true], ["2024-03-31", 140, false],
  ]);
  for (const blocked of payload.data.series.slice(1)) {
    assert.deepEqual(blocked.points, []);
    assert.equal(blocked.range.availableFrom, null);
    assert.ok(blocked.range.reviewBlockedReasons.length);
  }
});

test("normal public weekly/monthly/yearly/ma7 payloads retain their exact shape and never read local files", async () => {
  for (const mode of ["weekly", "monthly", "yearly", "ma7"] as const) {
    for (const sinceBase of [false, true]) {
      const { GET, reads, publicRows, publicCalls } = loadRoute();
      const response = await GET(new Request(`http://localhost:3100/api/complex-history?complexId=486&mode=${mode}${sinceBase ? "&range=since-base" : "&days=180"}`));
      const payload = await response.json();
      assert.equal(response.status, 200);
      assert.deepEqual(payload, { data: { mode, series: [{
        complexId: "486",
        points: mappers.mapComplexChartHistoryRows(publicRows, { mode, maxPoints: sinceBase ? 2500 : mode === "ma7" ? 60 : 26 }),
        ...(sinceBase ? { range: { requestedStartDate: "2024-01-01", availableFrom: "2026-04-30", availableTo: "2026-05-03" } } : {}),
      }] } });
      assert.equal(reads.length, 0);
      assert.equal(publicCalls.length, 1);
    }
  }
});

test("non-local and deployed review-looking requests stay on the published source", async () => {
  for (const [environment, url] of [
    [{ nodeEnv: "production" }, `http://localhost:3100${REVIEW_QUERY}`],
    [{ vercelEnv: "preview" }, `http://localhost:3100${REVIEW_QUERY}`],
    [{ vercelEnv: "production" }, `http://localhost:3100${REVIEW_QUERY}`],
    [{}, `https://koaptix.com${REVIEW_QUERY}`],
    [{}, `http://localhost:3100${REVIEW_QUERY.replace("&range=since-base", "")}`],
    [{}, `http://localhost:3100${REVIEW_QUERY.replace("mode=monthly", "mode=ma7")}`],
  ] as const) {
    const { GET, reads, publicCalls } = loadRoute(environment);
    const response = await GET(new Request(url));
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(reads.length, 0);
    assert.equal(publicCalls.length, 1);
    assert.equal(payload.data.series[0].range?.basis, undefined);
  }
});

test("missing or invalid local artifacts fail without silently substituting public data", async () => {
  const broken = fixture();
  broken.series["486"].rows = [];
  for (const options of [{ readError: true }, { input: broken }]) {
    const { GET, publicCalls } = loadRoute(options);
    assert.equal((await GET(new Request(`http://localhost:3100${REVIEW_QUERY}`))).status, 500);
    assert.equal(publicCalls.length, 0);
  }
});

test("review chart empty state, accessible chart label and table caption do not claim publication", () => {
  const nodeRequire = require;
  const exports: { ComplexHistoryMiniChart?: ComponentType<{ data: HistoryChartPoint[]; basis?: "published" | "restored-local-review" }> } = {};
  const source = readFileSync(resolve("src/components/home/ComplexHistoryMiniChart.tsx"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(compiled, { exports, require(name: string) { return name.endsWith("/mappers") ? mappers : nodeRequire(name); } });
  assert.ok(exports.ComplexHistoryMiniChart);
  const chart = exports.ComplexHistoryMiniChart;
  const empty = renderToStaticMarkup(createElement(chart, { data: [], basis: "restored-local-review" }));
  assert.match(empty, /검토 가능한 시총/);
  assert.doesNotMatch(empty, /공개/);
  const data = [{ snapshotDate: "2024-01-01", label: "2024.01", value: 100 }, { snapshotDate: "2024-07-31", label: "2024.07", value: 200 }];
  const review = renderToStaticMarkup(createElement(chart, { data, basis: "restored-local-review" }));
  assert.match(review, /검토용 시총 이력 차트/);
  assert.match(review, /검토용 시총 이력의 날짜별 값/);
  assert.doesNotMatch(review, /공개 시총/);
  const published = renderToStaticMarkup(createElement(chart, { data: [] }));
  assert.match(published, /공개된 시총/);
  assert.match(renderToStaticMarkup(createElement(chart, { data })), /공개 시총 이력의 날짜별 저장 값/);
});
