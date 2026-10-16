import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
function load(source, dependencies = {}) {
  const module = { exports: {} };
  const output = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  runInNewContext(output, { module, exports: module.exports, URLSearchParams, require: (id) => {
    if (!(id in dependencies)) throw new Error("Unexpected dependency: " + id);
    return dependencies[id];
  } });
  return module.exports;
}
const universes = load(read("src/lib/koaptix/universes.ts"));
const complexShare = load(read("src/lib/koaptix/complexShare.ts"));
function HomeV2Search() { return null; }
function Link() { return null; }
function pageWith(reader) {
  return load(read("src/app/play/page.tsx"), {
    react: React, "react/jsx-runtime": jsxRuntime,
    "next/link": { default: Link },
    "../../components/home/v2/HomeV2Search": { HomeV2Search },
    "../../components/home/PlayMatchup": { PlayMatchup: () => null },
    "../../components/home/SearchProgress": { SearchProgress: () => null },
    "../../components/home/ThemeToggle": { ThemeToggle: () => null },
    "../../components/home/FormulaExplainer": { default: () => null },
    "../../lib/formatters": { formatKrwCompact: (value) => String(value) },
    "../../lib/koaptix/queries": { getLatestRankBoard: reader },
    "../../lib/koaptix/universes": universes,
    "../../lib/koaptix/complexShare": complexShare,
    "./play.module.css": { default: {} },
  }).default;
}
function nodes(root) {
  if (Array.isArray(root)) return root.flatMap(nodes);
  if (!root || typeof root !== "object" || !root.props) return [];
  return [root, ...nodes(root.props.children)];
}
function text(root) {
  if (Array.isArray(root)) return root.map(text).join("");
  if (root && typeof root === "object" && root.props) return text(root.props.children);
  return typeof root === "string" || typeof root === "number" ? String(root) : "";
}

test("search guides and all service-exposed macro regions render independently of TOP 5", () => {
  const tree = pageWith(() => { throw new Error("Preview must not block the shell"); })();
  assert.equal(typeof tree.then, "undefined");
  const search = nodes(tree).find((node) => node.type === HomeV2Search);
  assert.deepEqual(Array.from(search.props.examples, (example) => example.query ?? example.name),
    ["헬리오시티", "현진에버빌1단지", "반포동", "수완"]);
  const navigation = nodes(tree).find((node) => node.props["aria-label"] === "지역별 공개 랭킹");
  const hrefs = nodes(navigation).filter((node) => node.type === Link).map((node) => node.props.href);
  const expected = universes.getRankingUniverseRegistry()
    .filter((region) => region.scope === "MACRO" && region.code !== "KOREA_ALL")
    .map((region) => `/ranking?universe=${region.code}`);
  assert.equal(hrefs.length, 17);
  assert.deepEqual(hrefs, Array.from(expected));
  assert.equal(new Set(hrefs).size, 17);
});

test("pending preview uses the existing bounded reader and preserves its actual dates, ranks and values", async () => {
  let resolvePreview;
  const calls = [];
  const pendingRows = new Promise((resolve) => { resolvePreview = resolve; });
  const tree = pageWith((...args) => { calls.push(args); return pendingRows; })();
  const preview = nodes(tree).find((node) => node.type?.name === "PlayRankingPreview");
  const pending = preview.type();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "KOREA_ALL");
  assert.equal(calls[0][1], 5);
  assert.equal(calls[0][3].timeoutMs, 4000);
  const rows = Array.from({ length: 5 }, (_, i) => ({
    complex_id: 100 + i, rank_all: i + 1, apt_name_ko: `검증 단지 ${i + 1}`,
    market_cap_krw: 1234567890 + i, snapshot_date: "2026-08-31",
  }));
  resolvePreview(rows);
  const ready = await pending;
  assert.equal(ready.props["data-state"], "ready");
  const contents = nodes(ready);
  assert.deepEqual(contents.filter((node) => node.type === Link && node.props.href.startsWith("/complex/")).map((node) => node.props.href),
    rows.map((row) => `/complex/${row.complex_id}`));
  assert.match(contents.find(node => node.type === Link && node.props.href.includes("compare=")).props.href, /compare=100%2C101&comparisonDate=2026-08-31/);
  assert.equal(contents.find((node) => node.type === "time").props.dateTime, "2026-08-31");
  for (const row of rows) assert.ok(contents.some((node) => node.type === "strong" && text(node).endsWith(String(row.market_cap_krw))));
});

test("preview failures show an explicit manual retry without invented rankings or a lost search entry", async () => {
  const tree = pageWith(async () => { throw new Error("Unavailable"); })();
  const preview = nodes(tree).find((node) => node.type?.name === "PlayRankingPreview");
  const failed = await preview.type();
  assert.equal(failed.props["data-state"], "unavailable");
  assert.equal(nodes(failed).filter((node) => node.type === Link).length, 0);
  assert.equal(nodes(failed).find((node) => node.type === "a").props.href, "/play#play-top-title");
  assert.equal(nodes(tree).find((node) => node.type === HomeV2Search).props.examples.length, 4);
});
