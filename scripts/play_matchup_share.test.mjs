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
const lib = name => path.join(root, "src/lib/koaptix", name);
function loader(overrides = {}) {
  const modules = new Map();
  function load(file) {
    const bare = file.replace(/\.(tsx?|mjs)$/, "");
    if (overrides[bare]) return overrides[bare];
    if (modules.has(file)) return modules.get(file).exports;
    const module = { exports: {} };
    modules.set(file, module);
    const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText;
    runInNewContext(code, { module, exports: module.exports, URL, URLSearchParams, Request, Response, require(name) {
      if (overrides[name]) return overrides[name];
      if (name === "next/link") return { __esModule: true, default: ({ href, children, prefetch, ...props }) => React.createElement("a", { href, ...props }, children) };
      if (!name.startsWith(".")) return require(name);
      const target = path.resolve(path.dirname(file), name);
      if (overrides[target]) return overrides[target];
      return load([target + ".ts", target + ".tsx"].find(existsSync));
    } }, { filename: file });
    return module.exports;
  }
  return load;
}
const load = loader();
const { getComparisonFacts, getMatchupSelectionPath } = load(lib("comparisonFacts.ts"));
const publication = {
  generation_id: "733d03e6-e029-449b-a748-26c4b032df05", publication_version: 2,
  publication_event_id: "90f8bd8d-9a97-44df-834c-8c23c4077d40", published_at: "2026-10-15T00:22:12.07608+00:00",
  surface_code: "UNIVERSE_SERVICE", universe_code: "KOREA_ALL", snapshot_date: "2026-08-31",
};
const left = { ...publication, complex_id: 5084, apt_name_ko: "헬리오시티", rank_all: 1, market_cap_krw: 26_000_000_000_000 };
const right = { ...publication, complex_id: 5037, apt_name_ko: "잠실엘스", rank_all: 2, market_cap_krw: 19_000_000_000_000 };

test("share facts retain exact public date, ranks and subtraction with no weekly-return claim", () => {
  const facts = getComparisonFacts([left, right]);
  assert.equal(facts.differenceKrw, 7_000_000_000_000);
  assert.match(facts.differenceLabel, /헬리오시티.*7(?:\.00)?조원 더 커요/);
  assert.match(facts.summary, /2026-08-31 기준/);
  assert.match(facts.summary, /잠실엘스: 공개 2위/);
  assert.doesNotMatch(facts.summary, /상승|수익률|LIVE|저평가/);
  const equal = getComparisonFacts([left, { ...right, market_cap_krw: left.market_cap_krw }]);
  assert.match(equal.differenceLabel, /같아요/);
});

test("mixed dates, scopes, events, HOLD and incomplete rows cannot generate financial share facts", () => {
  for (const change of [
    { snapshot_date: "2026-08-24" }, { universe_code: "SEOUL_ALL" }, { surface_code: "GLOBAL_LATEST" },
    { publication_event_id: "10f8bd8d-9a97-44df-834c-8c23c4077d40" }, { publication_version: 3 },
    { complex_id: left.complex_id }, { rank_all: 1 }, { rank_all: 1001 }, { market_cap_krw: null },
    { market_cap_krw: -1 }, { apt_name_ko: "" }, { universeCode: "SEOUL_ALL" },
  ]) assert.equal(getComparisonFacts([left, { ...right, ...change }]), null, JSON.stringify(change));
  assert.equal(getComparisonFacts([{ ...left, universe_code: "SGG_51150" }, { ...right, universe_code: "SGG_51150" }]), null);
  assert.equal(getComparisonFacts([left]), null);
});

test("existing client aliases and regional labels use their own publication rather than national rank", () => {
  const client = row => ({ ...publication, complexId: String(row.complex_id), name: row.apt_name_ko, rank: row.rank_all,
    marketCapKrw: row.market_cap_krw, universeCode: "KOREA_ALL", snapshotDate: publication.snapshot_date });
  assert.equal(getComparisonFacts([client(left), client(right)]).left.rank, 1);
  const regional = [left, right].map((row, index) => ({ ...row, universe_code: "SGG_29200", snapshot_date: "2026-07-03", rank_all: index + 2 }));
  const facts = getComparisonFacts(regional);
  assert.equal(facts.publication.snapshot_date, "2026-07-03");
  assert.match(facts.scopeLabel, /광주.*광산구/);
  assert.equal(facts.left.rank, 2);
});

test("selection creates only an existing two-ID comparison route and rejects duplicate/cross-date/cross-scope pairs", () => {
  const first = { complexId: "5084", universeCode: "KOREA_ALL", snapshotDate: "2026-08-31" };
  const second = { ...first, complexId: "5037" };
  assert.match(getMatchupSelectionPath([first, second], "KOREA_ALL"), /^\/ranking\?universe=KOREA_ALL&compare=5084%2C5037&comparisonDate=2026-08-31$/);
  for (const pair of [[first], [first, first], [first, { ...second, universeCode: "SEOUL_ALL" }], [first, { ...second, snapshotDate: "2026-08-24" }], [first, { ...second, snapshotDate: "2026-02-30" }]]) {
    assert.equal(getMatchupSelectionPath(pair, "KOREA_ALL"), null);
  }
});

test("public pair reader reuses exact existing ID reads and rejects a publication change between them", async () => {
  const calls = [];
  let rows = { "5084": left, "5037": right };
  const scoped = loader({ [lib("queries")]: { getLatestRankBoard: async (code, count, options, bound) => {
    calls.push([code, count, options, bound]); return rows[options.complexId] ? [rows[options.complexId]] : [];
  } } });
  const { getPublicPageComparison } = scoped(lib("publicPageData.ts"));
  assert.equal((await getPublicPageComparison("5084", "5037", "KOREA_ALL")).differenceKrw, 7_000_000_000_000);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(call => call[0] === "KOREA_ALL" && call[1] === 1 && call[3].timeoutMs === 4000));
  rows = { "5084": left, "5037": { ...right, publication_version: 3 } };
  assert.equal(await getPublicPageComparison("5084", "5037", "KOREA_ALL"), null);
  rows = { "5084": left };
  assert.equal(await getPublicPageComparison("5084", "5037", "KOREA_ALL"), null);
});

test("pair metadata names both apartments and current date; changed shared dates are explicit and image is publication-bound", async () => {
  const scoped = loader({ [lib("publicPageData")]: { PUBLIC_SITE_ORIGIN: "https://www.koaptix.com", getPublicPageComparison: async () => getComparisonFacts([left, right]) } });
  const { buildComparisonMetadata } = scoped(lib("metadata.ts"));
  const meta = await buildComparisonMetadata(["5084", "5037"], "KOREA_ALL", "2026-08-24");
  assert.match(meta.title, /헬리오시티 vs 잠실엘스/);
  assert.match(meta.description, /공유 당시 2026-08-24 · 현재 공개 2026-08-31/);
  assert.match(meta.openGraph.images[0].url, /publication=90f8bd8d-9a97-44df-834c-8c23c4077d40/);
  assert.equal(meta.robots.index, false);
  const image = new URL(meta.openGraph.images[0].url, "https://www.koaptix.com");
  assert.equal(image.searchParams.get("comparisonDate"), "2026-08-31");
});

test("share image fallback never invents a value and stale image requests drop all financial values", async () => {
  const scoped = loader({ [lib("publicPageData")]: { getPublicPageComparison: async () => getComparisonFacts([left, right]) },
    "next/og": { ImageResponse: class { constructor(element, options) { this.element = element; this.options = options; } } } });
  const { GET } = scoped(path.join(root, "src/app/ranking/share-image/route.ts"));
  const base = `http://localhost/ranking/share-image?universe=KOREA_ALL&compare=5084%2C5037&comparisonDate=2026-08-31&publication=${publication.publication_event_id}`;
  const valid = await GET(new Request(base));
  assert.ok(valid.element.props.facts);
  assert.equal(valid.options.headers["Cache-Control"], "private, no-store, max-age=0");
  const stale = await GET(new Request(base.replace("2026-08-31", "2026-08-24")));
  assert.equal(stale.element.props.facts, null);
  const { ComparisonShareImage } = scoped(path.join(root, "src/components/home/ComparisonShareImage.tsx"));
  const html = renderToStaticMarkup(React.createElement(ComparisonShareImage, { facts: null }));
  assert.doesNotMatch(html, /0위|0원|7조|26조/);
});

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === "object" && tree.props ? [tree, ...nodes(tree.props.children)] : [];
}
test("matchup UI selects two distinct IDs, clears selections on scope change and keeps unique search IDs", () => {
  const state = [];
  let index = 0;
  function FakeSearch() { return null; }
  const scoped = loader({ react: { ...React, useState(initial) {
    const n = index++; if (!(n in state)) state[n] = initial;
    return [state[n], value => { state[n] = typeof value === "function" ? value(state[n]) : value; }];
  } }, [path.join(root, "src/components/home/v2/HomeV2Search")]: { HomeV2Search: FakeSearch } });
  const { PlayMatchup } = scoped(path.join(root, "src/components/home/PlayMatchup.tsx"));
  const render = () => { index = 0; return PlayMatchup(); };
  let tree = render();
  let searches = nodes(tree).filter(node => node.type === FakeSearch);
  assert.deepEqual(searches.map(node => node.props.inputId), ["play-matchup-0", "play-matchup-1"]);
  const item = row => ({ complexId: String(row.complex_id), name: row.apt_name_ko, universeCode: row.universe_code, snapshotDate: row.snapshot_date });
  searches[0].props.onSelectRankedItem(item(left));
  tree = render();
  searches = nodes(tree).filter(node => node.type === FakeSearch);
  searches[0].props.onSelectRankedItem(item(left));
  tree = render();
  assert.equal(nodes(tree).some(node => node.props["data-testid"] === "matchup-open"), false);
  searches[0].props.onSelectRankedItem(item(right));
  tree = render();
  assert.match(nodes(tree).find(node => node.props["data-testid"] === "matchup-open").props.href, /compare=5084%2C5037/);
  nodes(tree).find(node => node.type === "select").props.onChange({ target: { value: "SGG_29200" } });
  tree = render();
  assert.equal(nodes(tree).filter(node => node.type === FakeSearch).length, 2);
  assert.equal(nodes(tree).some(node => node.props["data-testid"] === "matchup-open"), false);
});

test("reused search exposes selectable public results only in its selected scope; normal search remains a detail link", () => {
  const selected = [];
  const current = { complexId: "5084", name: "헬리오시티", rank: 1, marketCapKrw: left.market_cap_krw,
    universeCode: "KOREA_ALL", snapshotDate: "2026-08-31", locationLabel: "서울 송파구 가락동" };
  const foreign = { ...current, complexId: "170015", name: "지역 전용 단지", universeCode: "SGG_29200" };
  function searchHarness() {
    let index = 0;
    const state = ["헬리오", false, false, 0, { status: "ready", payload: { localItems: [current], globalItems: [foreign] }, message: null }, { above: false, maxHeight: 384, top: 0, bottom: 0 }];
    const scoped = loader({ react: { ...React, useEffect() {}, useMemo: calculate => calculate(), useRef: value => ({ current: value }),
      useState(initial) { const n = index++; return [n in state ? state[n] : initial, value => { state[n] = typeof value === "function" ? value(state[n]) : value; }]; } },
      [path.join(root, "src/components/home/CommandPalette")]: { readCurrentSearchClarificationResult() {} },
      [path.join(root, "src/components/home/SearchProgress")]: { SearchProgress: () => null },
    });
    return scoped(path.join(root, "src/components/home/v2/HomeV2Search.tsx")).HomeV2Search;
  }
  const Search = searchHarness();
  const tree = Search({ universeCode: "KOREA_ALL", presentation: "landing", inputId: "pair-left", label: "첫 번째 단지 찾기", onSelectRankedItem: row => selected.push(row) });
  assert.equal(nodes(tree).find(node => node.type === "input" && node.props.id).props.id, "pair-left");
  assert.equal(nodes(tree).find(node => node.type === "input" && node.props.id).props["aria-controls"], "pair-left-results");
  const results = nodes(tree).filter(node => node.props["data-result-kind"] === "ranked");
  assert.equal(results.length, 1);
  assert.equal(results[0].type, "button");
  results[0].props.onClick();
  assert.equal(selected[0].complexId, "5084");
  const normal = searchHarness()({ universeCode: "KOREA_ALL", presentation: "landing" });
  const normalResults = nodes(normal).filter(node => node.props["data-result-kind"] === "ranked");
  assert.equal(normalResults[0].props.href, "/ranking?universe=KOREA_ALL&complexId=5084");
  assert.equal(normalResults[1].props.href, "/ranking?universe=SGG_29200&complexId=170015");
});
