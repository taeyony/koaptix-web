import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const path = new URL("../src/lib/koaptix/rankingPresentation.ts", import.meta.url);
const module = { exports: {} };
runInNewContext(ts.transpileModule(readFileSync(path, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, { module, exports: module.exports });
const { formatRankMovement, formatMarketCapMovement, formatRankTransition, selectMovementHighlights } = module.exports;

test("rank gains and capital losses remain separate, with explicit units", () => {
  assert.equal(formatRankMovement(5199), "▲ 순위 5,199계단 상승");
  assert.equal(formatRankMovement(-28), "▼ 순위 28계단 하락");
  assert.equal(formatMarketCapMovement(-6.05), "시총 ▼ −6.05%");
  assert.equal(formatMarketCapMovement(2.3), "시총 ▲ +2.30%");
  assert.equal(formatRankTransition({ previousRankAll: 5260, rank: 61 }), "5,260위 → 61위");
});

test("missing or non-finite changes never become a zero or an invented rank", () => {
  for (const value of [null, undefined, NaN, Infinity]) {
    assert.equal(formatRankMovement(value), "순위 비교 자료 없음");
    assert.equal(formatMarketCapMovement(value), "시총 비교 자료 없음");
  }
  assert.equal(formatRankMovement(0), "순위 변동 없음");
  assert.equal(formatMarketCapMovement(0), "시총 변동 없음 (0.00%)");
  assert.equal(formatRankTransition({ previousRankAll: null, rank: 5 }), null);
});

test("ticker accepts only exact published dates and genuine seven-day comparisons", () => {
  const source = { complexId: "1", name: "단지", snapshotDate: "2026-08-31", historySnapshotDate: "2026-08-24", rank: 5, rankDelta7d: 10, marketCapDeltaPct7d: -1 };
  const rows = [source, { ...source, complexId: "2", snapshotDate: "2026-07-03" },
    { ...source, complexId: "3", historySnapshotDate: null },
    { ...source, complexId: "4", historySnapshotDate: "2026-08-23" },
    { ...source, complexId: "5", rankDelta7d: null, marketCapDeltaPct7d: null },
    { ...source, complexId: "6", rankDelta7d: 0, marketCapDeltaPct7d: 0 }];
  assert.deepEqual(Array.from(selectMovementHighlights(rows, "2026-08-31"), row => row.complexId), ["1"]);
  assert.equal(selectMovementHighlights(rows, null).length, 0);
  assert.equal(rows[0], source);
});

test("a capital-only change is a real highlight without fabricating rank movement", () => {
  const source = { complexId: "1", snapshotDate: "2026-08-31", historySnapshotDate: "2026-08-24", rank: 5, rankDelta7d: null, marketCapDeltaPct7d: 1.4 };
  assert.equal(selectMovementHighlights([source], "2026-08-31").length, 1);
  assert.equal(formatRankMovement(source.rankDelta7d), "순위 비교 자료 없음");
});
