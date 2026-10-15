import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { mapComplexChartHistoryMap, mapComplexChartHistoryRows } from "../src/lib/koaptix/mappers";
import type { DbComplexChartHistoryRow } from "../src/lib/koaptix/types";
import { KOAPTIX_OFFICIAL_BASE_DATE } from "../src/types/koaptix";

function row(date: string, value: number): DbComplexChartHistoryRow {
  return { snapshot_date: date, complex_id: 5084, market_cap_krw: value, rank_all: 1 };
}

test("weekly default keeps the last observation in each Monday-to-Sunday week", () => {
  const rows = [row("2026-04-05", 10), row("2026-04-06", 20), row("2026-04-12", 30), row("2026-04-13", 40)];
  assert.deepEqual(mapComplexChartHistoryRows(rows).map((p) => [p.snapshotDate, p.value]), [
    ["2026-04-05", 10], ["2026-04-12", 30], ["2026-04-13", 40],
  ]);
});

test("monthly uses original observations at month boundaries, not weekly samples", () => {
  const rows = [row("2026-04-30", 150), row("2026-05-01", 180), row("2026-05-03", 190)];
  assert.equal(mapComplexChartHistoryRows(rows).length, 1);
  assert.deepEqual(mapComplexChartHistoryRows(rows, { mode: "monthly" }), [
    { snapshotDate: "2026-04-30", label: "2026.04", value: 150 },
    { snapshotDate: "2026-05-03", label: "2026.05", value: 190 },
  ]);
});

test("monthly sorts input and leaves missing months absent", () => {
  const rows = [row("2026-05-03", 200), row("2025-12-29", 120), row("2026-01-01", 90), row("2025-12-31", 140), row("2026-01-31", 130)];
  const before = structuredClone(rows);
  assert.deepEqual(mapComplexChartHistoryRows(rows, { mode: "monthly" }).map((p) => [p.snapshotDate, p.value]), [
    ["2025-12-31", 140], ["2026-01-31", 130], ["2026-05-03", 200],
  ]);
  assert.deepEqual(rows, before);
});

test("yearly keeps actual dates and amounts without averaging, summing or inventing year end", () => {
  assert.deepEqual(mapComplexChartHistoryRows([
    row("2024-12-31", 100), row("2025-03-12", 150), row("2025-12-30", 180), row("2026-08-31", 130),
  ], { mode: "yearly" }), [
    { snapshotDate: "2024-12-31", label: "2024", value: 100 },
    { snapshotDate: "2025-12-30", label: "2025", value: 180 },
    { snapshotDate: "2026-08-31", label: "2026", value: 130 },
  ]);
});

test("a partial single year stays one point even with multiple stored amounts", () => {
  assert.deepEqual(mapComplexChartHistoryRows([
    row("2026-03-28", 100), row("2026-05-31", 200), row("2026-08-31", 150),
  ], { mode: "yearly" }), [{ snapshotDate: "2026-08-31", label: "2026", value: 150 }]);
});

test("calendar month selection preserves leap-day observations", () => {
  assert.deepEqual(mapComplexChartHistoryRows([
    row("2024-02-28", 90), row("2024-02-29", 100), row("2024-03-01", 120),
  ], { mode: "monthly" }).map((p) => p.snapshotDate), ["2024-02-29", "2024-03-01"]);
});

test("empty history stays empty for every public display period", () => {
  for (const mode of ["weekly", "monthly", "yearly"] as const) {
    assert.deepEqual(mapComplexChartHistoryRows([], { mode }), []);
    assert.deepEqual(mapComplexChartHistoryRows([row("2026-08-31", 0)], { mode }), []);
  }
});

test("point limits keep the newest periods and complex histories remain isolated", () => {
  const rows = [row("2026-03-31", 100), row("2026-04-30", 200), row("2026-05-31", 300)];
  assert.deepEqual(mapComplexChartHistoryRows(rows, { mode: "monthly", maxPoints: 2 }).map((p) => p.value), [200, 300]);
  assert.deepEqual(mapComplexChartHistoryMap({ "5084": rows, "306666": [row("2026-08-31", 700)] }, { mode: "yearly" }), {
    "5084": [{ snapshotDate: "2026-05-31", label: "2026", value: 300 }],
    "306666": [{ snapshotDate: "2026-08-31", label: "2026", value: 700 }],
  });
});

test("existing ma7 mode remains available with the original moving average", () => {
  const rows = Array.from({ length: 7 }, (_, i) => row(`2026-04-0${i + 1}`, i + 1));
  assert.deepEqual(mapComplexChartHistoryRows(rows, { mode: "ma7", maxPoints: 1 }), [
    { snapshotDate: "2026-04-07", label: "04.07", value: 4 },
  ]);
});

function loadHistoryRoute() {
  const calls: Array<{ ids: string[]; days: number; sinceBase?: boolean }> = [];
  const source = readFileSync(resolve(process.cwd(), "src/app/api/complex-history/route.ts"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: { GET?: (request: Request) => Promise<Response> } = {};
  runInNewContext(compiled, {
    exports, URL, Response,
    require(name: string) {
      if (name.endsWith("/mappers")) return { mapComplexChartHistoryMap };
      if (name.endsWith("/types/koaptix")) return { KOAPTIX_OFFICIAL_BASE_DATE };
      if (name.endsWith("/queries")) return {
        COMPLEX_CHART_HISTORY_ROW_LIMIT: 2500,
        async getComplexChartHistories(ids: string[], options: { days: number; sinceBase?: boolean }) {
          calls.push({ ids, ...options });
          const rows = options.sinceBase
            ? Array.from({ length: 150 }, (_, i) => row(new Date(Date.UTC(2024, 0, 1 + i * 7)).toISOString().slice(0, 10), i + 1))
            : [row("2026-04-30", 100), row("2026-05-03", 200)];
          return Object.fromEntries(ids.map((id) => [id, id === "168776" ? [] : rows]));
        },
      };
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  assert.ok(exports.GET);
  return { GET: exports.GET, calls };
}

for (const mode of ["weekly", "monthly", "yearly", "ma7"] as const) {
  test(`history API serves requested ${mode} mode using the existing bounded source`, async () => {
    const { GET, calls } = loadHistoryRoute();
    const response = await GET(new Request(`https://example.test/api/complex-history?complexId=5084&mode=${mode}&days=180`));
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.data.mode, mode);
    assert.equal(payload.data.series[0].complexId, "5084");
    assert.deepEqual(payload.data.series[0].points, mapComplexChartHistoryRows([row("2026-04-30", 100), row("2026-05-03", 200)], { mode, maxPoints: mode === "ma7" ? 60 : 26 }));
    assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{ ids: ["5084"], days: 180 }]);
  });
}

test("unknown or absent API mode retains weekly compatibility and missing IDs are rejected", async () => {
  const { GET, calls } = loadHistoryRoute();
  for (const suffix of ["", "&mode=unsupported"]) {
    const payload = await (await GET(new Request(`https://example.test/api/complex-history?complexId=5084${suffix}`))).json();
    assert.equal(payload.data.mode, "weekly");
  }
  assert.equal((await GET(new Request("https://example.test/api/complex-history?mode=monthly"))).status, 400);
  assert.equal(calls.length, 2);
});

test("since-base API returns the full weekly span instead of clipping to 26 points", async () => {
  const { GET, calls } = loadHistoryRoute();
  const payload = await (await GET(new Request("https://example.test/api/complex-history?complexId=5084&mode=weekly&range=since-base"))).json();
  const series = payload.data.series[0];
  assert.equal(series.points.length, 150);
  assert.equal(series.points[0].snapshotDate, "2024-01-01");
  assert.equal(series.points.at(-1).value, 150);
  assert.equal(series.range.requestedStartDate, "2024-01-01");
  assert.equal(series.range.availableFrom, "2024-01-01");
  assert.equal(series.range.availableTo, series.points.at(-1).snapshotDate);
  assert.equal(calls[0].sinceBase, true);
});

test("since-base monthly and yearly data retain original dates and report an empty source honestly", async () => {
  for (const mode of ["monthly", "yearly"]) {
    const { GET } = loadHistoryRoute();
    const payload = await (await GET(new Request(`https://example.test/api/complex-history?complexId=5084,168776&mode=${mode}&range=since-base`))).json();
    assert.equal(payload.data.series[0].range.availableFrom, "2024-01-01");
    assert.equal(payload.data.series[0].points.at(-1).value, 150);
    assert.deepEqual(payload.data.series[1], { complexId: "168776", points: [], range: { requestedStartDate: "2024-01-01", availableFrom: null, availableTo: null } });
  }
});
