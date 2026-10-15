import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  deduplicateComplexHistoryObservations,
  hasComplexHistoryBoundary,
  mapComplexChartHistoryRows,
} from "../src/lib/koaptix/mappers";
import type {
  ComplexChartContinuity,
  DbComplexChartHistoryRow,
  HistoryChartPoint,
  HistoryChartSeries,
} from "../src/lib/koaptix/types";

function row(date: string, value: number | string | null, metadata: ComplexChartContinuity = {}): DbComplexChartHistoryRow {
  return { snapshot_date: date, complex_id: 5037, market_cap_krw: value, rank_all: null, ...metadata };
}

test("identical dated amounts deduplicate without changing their value or mutating input", () => {
  const rows = [row("2024-07-31", 100), row("2024-07-31", "100", { sourceKey: "accepted", breakBefore: true })];
  const before = structuredClone(rows);
  assert.deepEqual(mapComplexChartHistoryRows(rows, { mode: "monthly" }), [
    { snapshotDate: "2024-07-31", label: "2024.07", value: 100, sourceKey: "accepted", breakBefore: true },
  ]);
  assert.deepEqual(rows, before);
});

test("conflicting dated amounts, null/value conflicts and conflicting provenance fail closed", () => {
  for (const mode of ["weekly", "monthly", "yearly"] as const) {
    assert.throws(() => mapComplexChartHistoryRows([row("2024-07-31", 100), row("2024-07-31", 200)], { mode }), /Conflicting complex history values/);
    assert.throws(() => mapComplexChartHistoryRows([row("2024-07-31", null), row("2024-07-31", 100)], { mode }), /Conflicting complex history values/);
    for (const key of ["sourceKey", "segmentKey"] as const) {
      assert.throws(() => mapComplexChartHistoryRows([
        row("2024-07-31", 100, { [key]: "a" }), row("2024-07-31", 100, { [key]: "b" }),
      ], { mode }), /Conflicting complex history provenance/);
    }
  }
});

test("an explicit null breaks the next monthly point even when the bucket's last amount occurs later", () => {
  const points = mapComplexChartHistoryRows([
    row("2024-12-31", 100), row("2025-01-10", null), row("2025-01-20", 120), row("2025-01-31", 130), row("2025-02-28", 140),
  ], { mode: "monthly" });
  assert.deepEqual(points.map(({ snapshotDate, value, breakBefore }) => [snapshotDate, value, breakBefore ?? false]), [
    ["2024-12-31", 100, false], ["2025-01-31", 130, true], ["2025-02-28", 140, false],
  ]);
});

test("weekly and yearly selection retain explicit gaps inside the selected bucket", () => {
  const weekly = mapComplexChartHistoryRows([
    row("2026-04-05", 100), row("2026-04-06", null), row("2026-04-07", 120), row("2026-04-12", 130),
  ], { mode: "weekly" });
  assert.equal(weekly.length, 2);
  assert.deepEqual(weekly[1], { snapshotDate: "2026-04-12", label: "04.12", value: 130, breakBefore: true });
  const yearly = mapComplexChartHistoryRows([
    row("2024-12-31", 100), row("2025-06-30", null), row("2025-07-31", 120), row("2025-12-31", 130),
  ], { mode: "yearly" });
  assert.deepEqual(yearly[1], { snapshotDate: "2025-12-31", label: "2025", value: 130, breakBefore: true });
});

test("date spacing alone does not invent a cadence, gap or intermediate observation", () => {
  const points = mapComplexChartHistoryRows([row("2024-01-01", 100), row("2024-07-31", 130), row("2026-03-29", 150)], { mode: "monthly" });
  assert.deepEqual(points.map(({ snapshotDate, breakBefore }) => [snapshotDate, breakBefore ?? false]), [
    ["2024-01-01", false], ["2024-07-31", false], ["2026-03-29", false],
  ]);
});

test("source and segment changes remain boundaries after period selection without changing amounts", () => {
  const points = mapComplexChartHistoryRows([
    row("2024-12-31", 100, { sourceKey: "stored", segmentKey: "a" }),
    row("2025-01-10", 120, { sourceKey: "restored", segmentKey: "b" }),
    row("2025-01-31", 130, { sourceKey: "restored", segmentKey: "b" }),
    row("2025-02-28", 140, { sourceKey: "restored", segmentKey: "c" }),
  ], { mode: "monthly" });
  assert.deepEqual(points.map(({ value, sourceKey, segmentKey, breakBefore }) => [value, sourceKey, segmentKey, breakBefore ?? false]), [
    [100, "stored", "a", false], [130, "restored", "b", true], [140, "restored", "c", true],
  ]);
});

test("an explicit break marker survives downsampling and point limits", () => {
  const points = mapComplexChartHistoryRows([
    row("2025-01-31", 100), row("2025-02-01", 110, { breakBefore: true }), row("2025-02-28", 120),
  ], { mode: "monthly", maxPoints: 1 });
  assert.deepEqual(points, [{ snapshotDate: "2025-02-28", label: "2025.02", value: 120, breakBefore: true }]);
});

test("legacy moving averages remain unchanged and segmented histories are not averaged", () => {
  assert.deepEqual(mapComplexChartHistoryRows([row("2025-01-01", 100), row("2025-01-02", 200)], { mode: "ma7" }).map(p => p.value), [100, 150]);
  assert.throws(() => mapComplexChartHistoryRows([row("2024-01-01", 100, { sourceKey: "baseline" })], { mode: "ma7" }), /Moving averages are unavailable/);
  assert.throws(() => mapComplexChartHistoryRows([row("2024-01-01", 100), row("2024-07-31", null), row("2024-08-31", 120)], { mode: "ma7" }), /Moving averages are unavailable/);
});

type ChartModel = {
  data: Array<Record<string, string | number | null>>;
  lines: Array<{ key: string; name: string; color?: string; seriesIndex: number }>;
};

function loadChartModel() {
  const source = readFileSync(resolve(process.cwd(), "src/components/home/ComplexHistoryMiniChart.tsx"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports: { buildComplexHistoryChartModel?: (series: HistoryChartSeries[]) => ChartModel } = {};
  runInNewContext(compiled, {
    exports,
    require(name: string) {
      if (name === "react" || name === "react/jsx-runtime" || name === "recharts") return {};
      if (name.endsWith("/mappers")) return { deduplicateComplexHistoryObservations, hasComplexHistoryBoundary };
      throw new Error(`Unexpected chart dependency ${name}`);
    },
  });
  assert.ok(exports.buildComplexHistoryChartModel);
  return exports.buildComplexHistoryChartModel;
}

function point(date: string, value: number, metadata: ComplexChartContinuity = {}): HistoryChartPoint {
  return { snapshotDate: date, label: date.slice(0, 7), value, ...metadata };
}

test("chart geometry splits at explicit boundaries while the table retains only actual dated amounts", () => {
  const model = loadChartModel()([{ key: "amount", name: "History", points: [
    point("2024-07-31", 100), point("2024-08-31", 110), point("2024-10-31", 130, { breakBefore: true }), point("2024-11-30", 140),
  ] }]);
  assert.equal(model.lines.length, 2);
  assert.equal(model.data.length, 4);
  assert.deepEqual(Array.from(model.data, row => [row.snapshotDate, row.amount]), [
    ["2024-07-31", 100], ["2024-08-31", 110], ["2024-10-31", 130], ["2024-11-30", 140],
  ]);
  assert.deepEqual(Array.from(model.data, row => row[model.lines[0].key] ?? null), [100, 110, null, null]);
  assert.deepEqual(Array.from(model.data, row => row[model.lines[1].key] ?? null), [null, null, 130, 140]);
});

test("different sources and independently supplied series never share a line", () => {
  const model = loadChartModel()([
    { key: "one", name: "One", points: [point("2024-01-01", 100, { sourceKey: "baseline" }), point("2024-07-31", 120, { sourceKey: "monthly" })] },
    { key: "two", name: "Two", points: [point("2024-01-01", 900), point("2024-07-31", 950)] },
  ]);
  assert.equal(model.lines.length, 3);
  assert.deepEqual(Array.from(model.lines, line => line.seriesIndex), [0, 0, 1]);
  assert.equal(model.data[0].one, 100);
  assert.equal(model.data[0].two, 900);
});

test("chart input also deduplicates identical dates and rejects conflicting amounts", () => {
  const build = loadChartModel();
  assert.equal(build([{ key: "one", name: "One", points: [point("2024-01-01", 100), point("2024-01-01", 100)] }]).data.length, 1);
  assert.throws(() => build([{ key: "one", name: "One", points: [point("2024-01-01", 100), point("2024-01-01", 200)] }]), /Conflicting complex history values/);
});

test("reference history labels distinguish reconstructed values from historical publication", () => {
  const nodeRequire = require;
  const exports: { ComplexHistoryMiniChart?: ComponentType<{ data: HistoryChartPoint[]; basis?: "published" | "reference" | "restored-local-review" }> } = {};
  const source = readFileSync(resolve(process.cwd(), "src/components/home/ComplexHistoryMiniChart.tsx"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(compiled, {
    exports,
    require(name: string) {
      return name.endsWith("/mappers") ? { deduplicateComplexHistoryObservations, hasComplexHistoryBoundary } : nodeRequire(name);
    },
  });
  assert.ok(exports.ComplexHistoryMiniChart);
  const chart = exports.ComplexHistoryMiniChart;
  const empty = renderToStaticMarkup(createElement(chart, { data: [], basis: "reference" }));
  assert.match(empty, /검증 조건을 충족하는 참고 재계산 시총 이력이 없습니다/);
  assert.doesNotMatch(empty, /공개된 시총|공개 시총/);
  const single = renderToStaticMarkup(createElement(chart, { data: [point("2024-01-01", 100)], basis: "reference" }));
  assert.match(single, /aria-label="참고 재계산 시총 단일 기준일 값"/);
  assert.doesNotMatch(single, /공개 시총|검토용 시총/);
  const data = [point("2024-01-01", 100), point("2024-07-31", 200, { breakBefore: true })];
  const reference = renderToStaticMarkup(createElement(chart, { data, basis: "reference" }));
  assert.match(reference, /주간 참고 재계산 시총 이력 차트/);
  assert.match(reference, /날짜별 참고 재계산 시총 값/);
  assert.match(reference, /참고 재계산 시총 이력의 날짜별 값 · 당시 공표 기록과 별도/);
  assert.doesNotMatch(reference, /공개 시총|검토용 시총/);
  assert.match(renderToStaticMarkup(createElement(chart, { data })), /공개 시총 이력의 날짜별 저장 값/);
  assert.match(renderToStaticMarkup(createElement(chart, { data, basis: "restored-local-review" })), /검토용 시총 이력의 날짜별 값/);
});
