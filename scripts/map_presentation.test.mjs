import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const module = { exports: {} };
runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/koaptix/mapPresentation.ts", import.meta.url), "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, { module, exports: module.exports });
const { summarizeMapComparison, mapChangeLabel, getMapGeocodeQueries } = module.exports;
const comparison = (delta, date = "2026-08-24") => ({ history_snapshot_date: date, market_cap_delta_7d: delta });

test("map color compares sums of the same complexes, rather than averaging percentages", () => {
  const result = summarizeMapComparison([{ complex_id: 1, market_cap_krw: 200 }, { complex_id: 2, market_cap_krw: 900 }],
    new Map([["1", comparison(100)], ["2", comparison(0)]]), "2026-08-31");
  assert.equal(result.marketCapChangePct7d, 10);
  assert.equal(result.comparableComplexCount, 2);
  assert.equal(result.comparisonDate, "2026-08-24");
});

test("missing, invalid and mismatched-date comparisons remain unknown", () => {
  const result = summarizeMapComparison([{ complex_id: 1, market_cap_krw: 900 }, { complex_id: 2, market_cap_krw: null }, { complex_id: 3, market_cap_krw: 20 }],
    new Map([["1", comparison(10, "2026-08-23")], ["2", comparison(0)], ["3", comparison(21)]]), "2026-08-31");
  assert.equal(result.marketCapChangePct7d, null);
  assert.equal(result.comparableComplexCount, 0);
  assert.equal(result.comparisonDate, null);
  assert.equal(mapChangeLabel(null), "시총 비교 자료 없음");
  assert.equal(mapChangeLabel(0), "시총 변동 없음");
  assert.equal(mapChangeLabel(-6.05), "시총 ▼ −6.05%");
});

test("partial coverage is explicit, duplicates and unrelated complexes do not enter the comparison", () => {
  const result = summarizeMapComparison([{ complex_id: 1, market_cap_krw: 90 }, { complex_id: 1, market_cap_krw: 90 }, { complex_id: 2, market_cap_krw: 9999 }],
    new Map([["1", comparison(-10)], ["88", comparison(1000)]]), "2026-08-31");
  assert.equal(result.marketCapChangePct7d, -10);
  assert.equal(result.comparableComplexCount, 1);
});

test("geocoding only uses province-qualified names and does not guess a district location", () => {
  assert.equal(getMapGeocodeQueries({ name: "중구", query: "중구 남포동" }).length, 0);
  const queries = getMapGeocodeQueries({ name: "중구", query: "부산광역시 중구 남포동" });
  assert.equal(queries.length, 1);
  assert.equal(queries[0], "부산광역시 중구 남포동");
  assert.equal(getMapGeocodeQueries({ name: "전주시 덕진구", query: "전북특별자치도 전주시 덕진구 송천동" }).length, 1);
});
