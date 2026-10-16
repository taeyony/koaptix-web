import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function load(name, dependencies = {}) {
  const module = { exports: {} };
  const source = readFileSync(new URL(`../src/lib/koaptix/${name}.ts`, import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
    { module, exports: module.exports, require: id => dependencies[id] });
  return module.exports;
}
const { hasComparableCapEvidence: comparable } = load("weeklyCapComparison");
const location = load("districtIdentity");
const { publicComplexName } = load("rankingPresentation", { "./weeklyRankComparison": load("weeklyRankComparison") });
function fixture() {
  const previous = { snapshot_date: "2026-08-24", complex_id: 1, market_cap_krw: 100, total_household_count: 10, priced_household_count: 10,
    total_cluster_count: 2, priced_cluster_count: 2, calculation_version: "v1", price_method_summary: "last3_avg_12m" };
  const current = { ...previous, snapshot_date: "2026-08-31", market_cap_krw: 150 };
  const components = [previous, current].flatMap(snapshot => [4, 6].map((hh, index) => ({ snapshot_date: snapshot.snapshot_date,
    complex_id: 1, area_cluster_id: index + 1, household_count: hh, representative_price_krw: snapshot === previous ? 10 : 15,
    cluster_market_cap_krw: hh * (snapshot === previous ? 10 : 15), component_status: "priced", calculation_version: "v1" })));
  return { current, previous, components };
}
test("a large genuine change is retained when both totals and exact component weights are established", () => {
  const f = fixture();
  assert.equal(comparable(f.current, f.previous, f.components, 150, 100), true);
});
test("a previous total cannot replace missing, partial or duplicate calculation evidence", () => {
  const f = fixture();
  assert.equal(comparable(f.current, undefined, f.components, 150, 100), false);
  assert.equal(comparable(f.current, f.previous, f.components.slice(1), 150, 100), false);
  assert.equal(comparable(f.current, f.previous, [...f.components, f.components[0]], 150, 100), false);
});
test("unchanged total household counts do not conceal changed area weights", () => {
  const f = fixture();
  [f.components[2].household_count, f.components[3].household_count] = [6, 4];
  [f.components[2].cluster_market_cap_krw, f.components[3].cluster_market_cap_krw] = [90, 60];
  assert.equal(comparable(f.current, f.previous, f.components, 150, 100), false);
});
test("mismatched dates, methods, versions, totals and component arithmetic fail closed", () => {
  for (const change of [{ snapshot_date: "2026-09-01" }, { calculation_version: "v2" }, { price_method_summary: "last1" },
    { market_cap_krw: 149 }, { priced_household_count: 9 }]) {
    const f = fixture(); assert.equal(comparable({ ...f.current, ...change }, f.previous, f.components, 150, 100), false);
  }
  const f = fixture(); f.components[2].cluster_market_cap_krw = 61;
  assert.equal(comparable(f.current, f.previous, f.components, 150, 100), false);
});
test("Sejong addresses retain the actual dong through repeated whitespace without promoting a lot number", () => {
  const parsed = location.parsePublicAddress("세종특별자치시  나성동 827");
  assert.equal(parsed.legalDongName, "나성동");
  assert.equal(location.isLegalDongName("827"), false);
  assert.equal(location.formatPublicLocation({ cityName: parsed.cityName, sigunguName: "세종특별자치시", legalDongName: parsed.legalDongName }), "세종 나성동");
});
test("same-named districts require their actual province and national scope supplies no guessed province", () => {
  assert.equal(location.formatPublicLocation({ cityName: "대전광역시", sigunguName: "서구", legalDongName: "도안동" }), "대전 서구 도안동");
  assert.equal(location.formatPublicLocation({ cityName: "울산광역시", sigunguName: "남구", legalDongName: "신정동" }), "울산 남구 신정동");
  assert.equal(location.formatPublicLocation({ sigunguName: "서구", legalDongName: "도안동", universeCode: "KOREA_ALL" }), "서구 도안동");
});
test("unfinished parenthetical qualifiers do not become fabricated official names", () => {
  assert.equal(publicComplexName("나릿재마을5단지(한신더휴리저브"), "나릿재마을5단지");
  assert.equal(publicComplexName("나릿재마을4단지(세종트리쉐이드리젠시"), "나릿재마을4단지");
  assert.equal(publicComplexName("경희궁자이(4단지)"), "경희궁자이(4단지)");
});
