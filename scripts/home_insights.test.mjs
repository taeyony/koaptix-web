import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modules = new Map();
function load(file) {
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} };
  modules.set(file, module);
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  runInNewContext(code, { module, exports: module.exports, URLSearchParams, require(name) {
    if (name === "next/link") return { __esModule: true, default: ({ href, ...props }) => React.createElement("a", { href, ...props }) };
    if (!name.startsWith(".")) return require(name);
    const resolved = path.resolve(path.dirname(file), name);
    return load([resolved + ".ts", resolved + ".tsx"].find(existsSync));
  } }, { filename: file });
  return module.exports;
}
const { HomeV2Insights } = load(path.join(root, "src/components/home/v2/HomeV2Insights.tsx"));
const { commonRankDelta } = load(path.join(root, "src/lib/koaptix/weeklyRankComparison.ts"));
const item = (id, currentRank, previousRank, changes = {}) => ({
  complexId: String(id), name: `테스트 단지 ${id}`, rank: id, snapshotDate: "2026-08-31", universeCode: "KOREA_ALL",
  rankDelta7d: 5000, marketCapDeltaPct7d: null, cityName: "서울", sigunguName: "송파구", legalDongName: "가락동",
  weeklyRankComparison: currentRank === null ? null : { currentRank, previousRank, delta: previousRank - currentRank, cohortSize: 3, previousSnapshotDate: "2026-08-24" },
  ...changes,
});
function render(items, changes = {}) {
  return renderToStaticMarkup(React.createElement(HomeV2Insights, {
    items, rising: items.filter(row => commonRankDelta(row) > 0), falling: items.filter(row => commonRankDelta(row) < 0),
    comparison: { status: "ready", basis: "COMMON_COMPLEXES", snapshotDate: "2026-08-31", previousSnapshotDate: "2026-08-24", currentPublishedCount: items.length, commonComplexCount: 3 },
    status: "ready", snapshotDate: "2026-08-31", universeCode: "KOREA_ALL", universeLabel: "대한민국 전체", ...changes,
  }));
}
const text = html => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("one insights region contains the counts and movers with an explicit complete denominator", () => {
  const html = render([item(1, 1, 2), item(2, 2, 1), item(3, 3, 3), item(4, null, null, { rankMovement: "NEW" })]);
  assert.equal((html.match(/id="insights"/g) || []).length, 1);
  assert.match(text(html), /전체 4개 = 비교 가능 3개 \+ 비교 자료 없음 1개/);
  assert.match(text(html), /지난 기록에 순위 없음 1개 · 기타 비교 미확인 0개/);
  assert.match(html, /movement=up&amp;sort=rank-up/);
  assert.match(html, /movement=down&amp;sort=rank-down/);
  assert.match(html, /공통 3개 내 2위 → 1위/);
  assert.doesNotMatch(html, /5,000|sort=cap-up/);
});

test("a subset with no falls has a disabled button rather than an empty-result link", () => {
  const html = render([item(1, 1, 2)]);
  assert.match(html, /movement=up&amp;sort=rank-up/);
  assert.doesNotMatch(html, /href="[^"]*movement=down/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>순위 하락 단지 · 0개<\/button>/);
  assert.match(text(html), /순위가 내린 단지는 없어요/);
});

test("unchanged, new-only and empty boards do not open rise/fall filters", () => {
  for (const items of [[item(1, 1, 1)], [item(4, null, null, { rankMovement: "NEW" })], []]) {
    const html = render(items);
    assert.doesNotMatch(html, /href="[^"]*movement=/);
    assert.equal((html.match(/<button[^>]*disabled=""/g) || []).length, 2);
  }
  assert.match(text(render([item(4, null, null, { rankMovement: "NEW" })])), /‘그대로’로 집계하지 않아요/);
});

test("loading, unavailable and error responses cannot display stale movement cards", () => {
  for (const status of ["loading", "unavailable", "error"]) {
    const html = render([item(1, 1, 2)], { status });
    assert.doesNotMatch(html, /href="[^"]*movement=|테스트 단지 1/);
    assert.match(html, /role="status"/);
  }
  assert.doesNotMatch(render([item(1, 1, 2)], { comparison: { status: "unavailable" } }), /href="[^"]*movement=|테스트 단지 1/);
});

test("only API-provided exact-week capital comparisons contribute to capital counts", () => {
  const rows = [item(1, 1, 2, { historySnapshotDate: "2026-08-24", marketCapDeltaPct7d: 10 }),
    item(2, 2, 1, { historySnapshotDate: "2026-08-24", marketCapDeltaPct7d: -5 }),
    item(3, 3, 3, { historySnapshotDate: "2026-08-24", marketCapDeltaPct7d: 0 }),
    item(4, null, null, { historySnapshotDate: "2026-08-23", marketCapDeltaPct7d: 100 })];
  const value = text(render(rows));
  assert.match(value, /검증된 3개 중 시총 상승 ▲ 1개 · 그대로 1개 · 하락 ▼ 1개/);
  assert.match(value, /나머지 1개는 비교 자료 확인 중/);
  assert.doesNotMatch(value, /100\.00%/);
});

test("missing capital evidence stays unknown while the actual comparison dates remain visible", () => {
  const value = text(render([item(1, 1, 2)]));
  assert.match(value, /2026-08-24 → 2026-08-31/);
  assert.match(value, /시총 증감은 비교 자료 확인 중/);
  assert.doesNotMatch(value, /시총 상승 ▲ 0개|이번 주/);
});
