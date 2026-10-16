import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const module = { exports: {} };
runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/koaptix/mapPresentation.ts", import.meta.url), "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, { module, exports: module.exports });
const { summarizeMapComparison, mapChangeLabel, getMapGeocodeQueries, groupMapProvinces, summarizePublishedMap, spreadMapLabels } = module.exports;
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

test("national grouping retains full district totals and weights verified comparisons by sums", () => {
  const groups = groupMapProvinces([
    { name: "서울 송파구", query: "서울 송파구", totalMarketCap: 200, count: 2, comparableComplexCount: 1, comparisonDate: "2026-08-24", comparableCurrentMarketCapKrw: 100, comparablePreviousMarketCapKrw: 50 },
    { name: "서울 강동구", query: "서울 강동구", totalMarketCap: 900, count: 9, comparableComplexCount: 9, comparisonDate: "2026-08-24", comparableCurrentMarketCapKrw: 900, comparablePreviousMarketCapKrw: 900 },
    { name: "광주 광산구", query: "광주 광산구", totalMarketCap: 50, count: 1 },
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].totalMarketCap, 1100);
  assert.equal(groups[0].count, 11);
  assert.equal(groups[0].comparableComplexCount, 10);
  assert.equal(groups[0].marketCapChangePct7d, 5.26);
  assert.equal(groups[1].marketCapChangePct7d, null);
});

test("national grouping never invents comparisons from rounded percentages or mismatched dates", () => {
  const row = { name: "서울 송파구", query: "서울 송파구", totalMarketCap: 100, count: 1, comparableComplexCount: 1,
    marketCapChangePct7d: 100, comparisonDate: "2026-08-24" };
  assert.equal(groupMapProvinces([row])[0].marketCapChangePct7d, null);
  const dates = [row, { ...row, name: "서울 강남구", comparisonDate: "2026-08-23" }].map(r => ({ ...r, comparableCurrentMarketCapKrw: 100, comparablePreviousMarketCapKrw: 50 }));
  assert.equal(groupMapProvinces(dates)[0].marketCapChangePct7d, null);
});

test("index summary uses the exact published map scope and rejects incomplete or cross-region totals", () => {
  const payload = { ok: true, requestedUniverseCode: "KOREA_ALL", renderedUniverseCode: "KOREA_ALL", aggregationBasis: "PUBLISHED_TOP1000",
    snapshot_date: "2026-08-31", sourceRowsUsed: 3, items: [{ name: "서울 송파구", count: 2, totalMarketCap: 200 }, { name: "광주 광산구", count: 1, totalMarketCap: 50 }] };
  assert.equal(summarizePublishedMap(payload, "KOREA_ALL").totalMarketCapKrw, 250);
  assert.equal(summarizePublishedMap(payload, "KOREA_ALL").complexCount, 3);
  assert.equal(summarizePublishedMap(payload, "SEOUL_ALL"), null);
  assert.equal(summarizePublishedMap({ ...payload, sourceRowsUsed: 4 }, "KOREA_ALL"), null);
  assert.equal(summarizePublishedMap({ ...payload, aggregationBasis: "BOUNDED_PUBLISHED_RANK_SAMPLE" }, "KOREA_ALL"), null);
  assert.equal(summarizePublishedMap({ ...payload, items: [payload.items[0], payload.items[0]] }, "KOREA_ALL"), null);
});

test("overlapping national labels move apart within the frame while retaining their original anchors", () => {
  const points = [{ key: "서울", x: 150, y: 100, size: 68 }, { key: "경기", x: 155, y: 110, size: 60 }, { key: "인천", x: 140, y: 105, size: 50 }];
  const offsets = spreadMapLabels(points, 390, 600);
  for (let i = 0; i < points.length; i++) {
    const p = points[i], a = offsets.get(p.key), x = p.x + a.x, y = p.y + a.y;
    assert.ok(x >= p.size / 2 && x <= 390 - p.size / 2 && y >= p.size / 2 && y <= 600 - p.size / 2);
    for (const q of points.slice(i + 1)) { const b = offsets.get(q.key); assert.ok(Math.hypot(x - q.x - b.x, y - q.y - b.y) >= (p.size + q.size) / 2 + 8); }
  }
  assert.equal(points[0].x, 150);
});
