import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
function load(path, deps = {}) {
  const module = { exports: {} };
  runInNewContext(ts.transpileModule(read(path), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
    { module, exports: module.exports, URL, URLSearchParams, require: name => { if (!(name in deps)) throw new Error(name); return deps[name]; } });
  return module.exports;
}
const share = load("src/lib/koaptix/complexShare.ts");
const sorting = load("src/lib/koaptix/rankingPresentation.ts", { "./weeklyRankComparison": load("src/lib/koaptix/weeklyRankComparison.ts") });
const universes = load("src/lib/koaptix/universes.ts");
const identity = load("src/lib/koaptix/districtIdentity.ts");
const fixture = { complex_id: 5037, apt_name_ko: "잠실엘스", rank_all: 2, market_cap_krw: 18915350000802, universe_code: "KOREA_ALL", snapshot_date: "2026-08-31", published_at: "2026-10-15T00:22:12Z" };
function publicPages(reader) {
  return load("src/lib/koaptix/publicPageData.ts", { react: { cache: fn => fn }, "./queries": { getLatestRankBoard: reader }, "./universes": universes, "./districtIdentity": identity,
    "./comparisonFacts": { getComparisonFacts: () => { throw new Error("Pair read not expected for single-complex SEO"); } } });
}

test("comparison links carry exactly two IDs, scope and the actual date", () => {
  const href = share.buildComparisonSharePath(["5084", "5037"], "KOREA_ALL", "2026-08-31");
  const params = new URL(href, "https://www.koaptix.com").searchParams;
  assert.equal(params.get("compare"), "5084,5037");
  assert.equal(params.get("universe"), "KOREA_ALL");
  assert.equal(params.get("comparisonDate"), "2026-08-31");
  for (const ids of [["1"], ["1", "1"], ["1", "2", "3"], ["../1", "2"], ["0", "2"]]) assert.equal(share.buildComparisonSharePath(ids, "KOREA_ALL", "2026-08-31"), null);
  for (const date of ["2026-99-99", "2026-02-30", "", "today"]) assert.equal(share.buildComparisonSharePath(["1", "2"], "KOREA_ALL", date), null);
});

const item = (id, rank, delta, cap, history = "2026-08-24") => ({ complexId: id, rank, rankDelta7d: delta, marketCapDeltaPct7d: cap, snapshotDate: "2026-08-31", historySnapshotDate: history });
test("rank and cap sorting are separate, deterministic, non-mutating; unknown is not zero", () => {
  const rows = [item("1", 1, null, null), item("2", 2, 3, -5), item("3", 3, -10, 20), item("4", 4, 0, 0), item("5", 5, 999, 999, "2026-08-23")];
  const ids = mode => Array.from(sorting.sortRankingItems(rows, mode), row => row.complexId);
  assert.deepEqual(ids("rank-up"), ["2", "4", "3", "1", "5"]);
  assert.deepEqual(ids("rank-down"), ["3", "4", "2", "1", "5"]);
  assert.deepEqual(ids("cap-up"), ["3", "4", "2", "1", "5"]);
  assert.deepEqual(ids("cap-down"), ["2", "4", "3", "1", "5"]);
  assert.deepEqual(rows.map(row => row.complexId), ["1", "2", "3", "4", "5"]);
  assert.equal(sorting.parseRankingSort("invented"), "rank");
});

test("SEO uses the existing bounded public reader and rejects unavailable scopes before a read", async () => {
  const calls = [];
  const pages = publicPages(async (...args) => { calls.push(args); return [fixture]; });
  assert.equal((await pages.getPublicPageComplex("5037", "KOREA_ALL")).rank_all, 2);
  assert.deepEqual(calls[0].slice(0, 2), ["KOREA_ALL", 1]);
  assert.equal(calls[0][2].complexId, "5037");
  assert.equal(calls[0][3].timeoutMs, 4000);
  assert.equal(await pages.getPublicPageComplex("5037", "SGG_99999"), null);
  assert.equal(await pages.getPublicPageComplex("../5037", "KOREA_ALL"), null);
  assert.equal(calls.length, 1);
  assert.equal(pages.publicRegionLabel("SGG_11710"), "서울 송파구");
  for (const bad of [{ rank_all: 1001 }, { market_cap_krw: 0 }, { apt_name_ko: null }]) assert.equal(await publicPages(async () => [{ ...fixture, ...bad }]).getPublicPageComplex("5037", "KOREA_ALL"), null);
});

test("reader failure produces no synthetic SEO metrics or sitemap complex entries", async () => {
  const pages = publicPages(async () => { throw new Error("unavailable"); });
  assert.equal(await pages.getPublicPageComplex("5037", "KOREA_ALL"), null);
  const { default: sitemap } = load("src/app/sitemap.ts", { "../lib/koaptix/universes": universes, "../lib/koaptix/publicPageData": pages });
  const entries = await sitemap();
  assert.equal(entries.length, 2);
  assert.equal(entries.some(entry => entry.url.includes("/complex/")), false);
});

test("sitemap lists actual public IDs, not discovery/master or query permutations", async () => {
  const pages = publicPages(async code => code === "KOREA_ALL" ? [fixture, { ...fixture, complex_id: 999, rank_all: 1001 }] : []);
  const { default: sitemap } = load("src/app/sitemap.ts", { "../lib/koaptix/universes": universes, "../lib/koaptix/publicPageData": pages });
  const entries = await sitemap();
  assert.ok(entries.some(entry => entry.url === "https://www.koaptix.com/complex/5037" && entry.lastModified === fixture.published_at));
  assert.equal(entries.some(entry => entry.url.includes("999") || entry.url.includes("compare=")), false);
});

test("regional metadata keeps its scope and never labels a regional rank as national", async () => {
  const regional = { ...fixture, universe_code: "SGG_11710" };
  const metadata = load("src/lib/koaptix/metadata.ts", { "./complexShare": share, "./publicPageData": { getPublicPageComplex: async () => regional, PUBLIC_SITE_ORIGIN: "https://www.koaptix.com", publicRegionLabel: () => "서울 송파구" } });
  const result = await metadata.buildComplexMetadata("5037", "SGG_11710");
  assert.match(result.description, /서울 송파구 공개 랭킹 2위/);
  assert.doesNotMatch(result.description, /전국 공개 랭킹/);
  assert.equal(result.alternates.canonical, "/complex/5037?universe=SGG_11710");
  assert.equal(result.openGraph.images[0].url, "/opengraph-image.jpg");
});
