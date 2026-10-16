import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function load(file, deps = {}) {
  const module = { exports: {} };
  runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/koaptix/" + file + ".ts", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, { module, exports: module.exports, require: name => { assert.ok(name in deps, name); return deps[name]; } });
  return module.exports;
}
const comparison = load("weeklyRankComparison");
const { buildCommonRankComparisons: build, commonRankDelta, commonRankTransition, needsMarketCapReview } = comparison;
const { sortRankingItems, selectMovementHighlights } = load("rankingPresentation", { "./weeklyRankComparison": comparison });
const { summarizeIndexRecords } = load("indexRecordSummary");
const date = "2026-08-31";
const source = () => [20, 5, 30, null].map((rank, i) => ({ complex_id: String(i + 1), rank_all: i + 1, previous_rank_all: rank, source_previous_snapshot_date: "2026-08-24" }));
const item = (id, value) => ({ complexId: id, rank: Number(id), rankDelta7d: 5000, snapshotDate: date, weeklyRankComparison: value });

test("population shrink cannot turn every common-cohort movement into a rise", () => {
  const rows = source(), before = JSON.stringify(rows), result = build(rows, 4, date);
  assert.equal(result.commonComplexCount, 3);
  assert.deepEqual(Array.from(result.comparisons.values(), x => x.delta), [1, -1, 0]);
  assert.equal(result.comparisons.has("4"), false);
  assert.equal(JSON.stringify(rows), before);
  assert.equal(commonRankTransition(item("2", result.comparisons.get("2"))), "공통 3개 내 1위 → 2위");
});
test("newly included complexes do not change the shared cohort's ordering", () => {
  const rows = source(); rows.unshift({ complex_id: "99", rank_all: 1, previous_rank_all: null });
  rows.slice(1).forEach((row, i) => row.rank_all = i + 2);
  assert.deepEqual(Array.from(build(rows, 5, date).comparisons.values(), x => x.delta), [1, -1, 0]);
  assert.equal(comparison.commonRankMovement({ ...item("99", null), rankMovement: "NEW" }), "NEW");
  assert.equal(comparison.commonRankMovement({ ...item("1", null), rankMovement: "UP" }), null);
});
test("partial populations, duplicate IDs/ranks, and non-weekly provenance are rejected", () => {
  assert.throws(() => build(source(), 5, date), /Incomplete/);
  for (const mutate of [r => r[1].complex_id = "1", r => r[1].rank_all = 1,
    r => r[1].previous_rank_all = 20, r => r[1].source_previous_snapshot_date = "2026-08-23",
    r => r[1].previous_rank_all = 0, r => r[1].complex_id = null]) {
    const rows = source(); mutate(rows); assert.throws(() => build(rows, 4, date));
  }
  assert.throws(() => build(source(), 4, "2026-02-30"));
});
test("unknown comparison never falls back to a published absolute-rank difference", () => {
  assert.equal(commonRankDelta(item("1", null)), null);
  assert.equal(commonRankDelta(item("1", undefined)), null);
  assert.equal(commonRankDelta(item("1", { currentRank: 1, previousRank: 2, delta: 99, cohortSize: 2, previousSnapshotDate: "2026-08-24" })), null);
  const row = build(source(), 4, date).comparisons.get("1");
  assert.equal(commonRankDelta({ ...item("1", row), snapshotDate: "2026-09-01" }), null);
});
test("rank sorting uses shared-cohort values independently of a missing cap lookup", () => {
  const values = build(source(), 4, date).comparisons;
  const rows = [item("2", values.get("2")), item("4", null), item("1", values.get("1"))];
  assert.deepEqual(Array.from(sortRankingItems(rows, "rank-up"), x => x.complexId), ["1", "2", "4"]);
  assert.deepEqual(Array.from(sortRankingItems(rows, "rank-down"), x => x.complexId), ["2", "1", "4"]);
});
test("common-cohort ticker ignores absolute deltas and retains flagged capital changes", () => {
  const values = build(source(), 4, date).comparisons;
  const rows = [item("4", null), { ...item("1", values.get("1")), marketCapDeltaPct7d: 107.58 }, item("2", values.get("2"))];
  const chosen = selectMovementHighlights(rows, date, "common");
  assert.deepEqual(Array.from(chosen, x => x.complexId), ["1", "2"]);
  assert.equal(needsMarketCapReview(chosen[0]), true);
  assert.equal(rows[1].marketCapDeltaPct7d, 107.58);
  for (const pct of [-30, 30, -107.58]) assert.equal(needsMarketCapReview({ marketCapDeltaPct7d: pct }), true);
  for (const pct of [null, undefined, NaN, Infinity, 29.99]) assert.equal(needsMarketCapReview({ marketCapDeltaPct7d: pct }), false);
});
test("index summaries compress exact consecutive values without deleting original records", () => {
  const rows = [1, 2, 3].map(day => ({ snapshotDate: `2026-06-0${day}`, value: 12350.294, componentComplexCount: 13497 }));
  const before = JSON.stringify(rows), summary = summarizeIndexRecords(rows);
  assert.equal(summary.length, 1); assert.equal(summary[0].recordCount, 3);
  assert.equal(summary[0].endDate, "2026-06-03"); assert.equal(JSON.stringify(rows), before);
});
test("rounded-equal values, gaps, and constituent changes remain separate index records", () => {
  const rows = [
    { snapshotDate: "2026-06-01", value: 1000.01, componentComplexCount: 10 },
    { snapshotDate: "2026-06-02", value: 1000.02, componentComplexCount: 10 },
    { snapshotDate: "2026-06-04", value: 1000.02, componentComplexCount: 10 },
    { snapshotDate: "2026-06-05", value: 1000.02, componentComplexCount: 11 },
  ];
  assert.equal(summarizeIndexRecords(rows).length, 4);
  assert.equal(summarizeIndexRecords([]).length, 0);
});
