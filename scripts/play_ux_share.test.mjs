import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
function moduleFrom(source, dependencies = {}) {
  const module = { exports: {} };
  runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
    { module, exports: module.exports, URL, URLSearchParams, process: { env: {} }, ...dependencies });
  return module.exports;
}
const { buildComplexSharePath } = moduleFrom(read("src/lib/koaptix/complexShare.ts"));

test("shared links use the stable complex entry and retain regional context without search filters", () => {
  assert.equal(buildComplexSharePath("5037", "KOREA_ALL"), "/complex/5037");
  assert.equal(buildComplexSharePath("5037", "SEOUL_ALL"), "/complex/5037?universe=SEOUL_ALL");
  for (const id of ["", "0", "../play", "5037?complexId=1", "NaN"]) assert.equal(buildComplexSharePath(id), null);
});

const fixture = {
  generation_id: "733d03e6-e029-449b-a748-26c4b032df05", publication_version: 2,
  publication_event_id: "90f8bd8d-9a97-44df-834c-8c23c4077d40", published_at: "2026-10-15T00:22:12.07608+00:00",
  surface_code: "UNIVERSE_SERVICE", universe_code: "KOREA_ALL", snapshot_date: "2026-08-31",
  complex_id: 5037, apt_name_ko: "잠실엘스", rank_all: 2, market_cap_krw: 18915350000802,
  sigungu_name: "송파구", legal_dong_name: "잠실동",
};

function publicReader(row = fixture) {
  const calls = [];
  const timeouts = [];
  const builder = { then: resolve => Promise.resolve({ data: [row], error: null }).then(resolve) };
  for (const method of ["select", "eq", "order", "limit", "gte", "lte"]) builder[method] = (...args) => { calls.push([method, ...args]); return builder; };
  const currentness = moduleFrom(read("src/lib/koaptix/currentness.ts"));
  const source = read("src/lib/koaptix/queries.ts");
  const ast = ts.createSourceFile("queries.ts", source, ts.ScriptTarget.Latest, true);
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "getLatestRankBoard");
  const { getLatestRankBoard } = moduleFrom(fn.getText(ast), {
    createServerSupabase: () => ({ from: name => { calls.push(["from", name]); return builder; } }),
    DEFAULT_UNIVERSE_CODE: "KOREA_ALL", HOME_TACTICAL_RANK_BOARD_LIMIT: 20, MAX_LATEST_RANK_BOARD_LIMIT: 1000,
    resolveServiceUniverseCode: code => code, buildRankBoardRetryLimits: limit => [limit],
    LATEST_RANK_BOARD_TIMEOUT_MS_KOREA: 1800, LATEST_RANK_BOARD_TIMEOUT_MS_REGIONAL: 1100,
    PUBLISHED_UNIVERSE_SERVICE_VIEW: "v_koaptix_latest_board_read_model_published",
    withLocalQueryTimeout: async (query, timeout) => { timeouts.push(timeout); return query; }, normalizeComplexId: id => Number(id),
    requireUniformUniverseServicePublication: currentness.requireUniformUniverseServicePublication,
    toNullableNumber: value => value == null ? null : Number(value),
  });
  return { getLatestRankBoard, calls, timeouts };
}

test("SEO timeout is bounded without changing the existing reader defaults", async () => {
  const ordinary = publicReader();
  await ordinary.getLatestRankBoard("KOREA_ALL", 5);
  assert.equal(ordinary.timeouts[0], 1800);
  const regional = publicReader({ ...fixture, universe_code: "SGG_11710" });
  await regional.getLatestRankBoard("SGG_11710", 1, { complexId: "5037" });
  assert.equal(regional.timeouts[0], 1100);
  const bounded = publicReader();
  await bounded.getLatestRankBoard("KOREA_ALL", 1, { complexId: "5037" }, { timeoutMs: 50000 });
  assert.equal(bounded.timeouts[0], 4000);
});

test("share data reuses the published reader, with bounded ID/rank selection and its real date", async () => {
  const { getLatestRankBoard, calls } = publicReader();
  const rows = await getLatestRankBoard("KOREA_ALL", 1, { complexId: "5037" });
  assert.equal(rows[0].snapshot_date, "2026-08-31");
  assert.equal(rows[0].market_cap_krw, fixture.market_cap_krw);
  assert.ok(calls.some(call => call[0] === "eq" && call[1] === "complex_id" && call[2] === 5037));
  assert.ok(calls.some(call => call[0] === "lte" && call[1] === "rank_all" && call[2] === 1000));
  assert.ok(calls.some(call => call[0] === "eq" && call[1] === "surface_code" && call[2] === "UNIVERSE_SERVICE"));
  const ordinary = publicReader();
  await ordinary.getLatestRankBoard("KOREA_ALL", 5);
  assert.equal(ordinary.calls.some(call => ["gte", "lte"].includes(call[0]) || call[1] === "complex_id"), false);
});

test("share data fails closed on wrong ID, publication scope, rank or missing capital", async () => {
  for (const changes of [{ complex_id: 1 }, { universe_code: "SEOUL_ALL" }, { rank_all: 1001 }, { market_cap_krw: null }, { apt_name_ko: null }]) {
    await assert.rejects(publicReader({ ...fixture, ...changes }).getLatestRankBoard("KOREA_ALL", 1, { complexId: "5037" }));
  }
  const invalid = publicReader();
  await assert.rejects(invalid.getLatestRankBoard("KOREA_ALL", 1, { complexId: "../5037" }));
  assert.equal(invalid.calls.length, 0);
});

test("share metadata names the complex, actual public date and scope; missing data never invents metrics", async () => {
  const metadata = moduleFrom(read("src/lib/koaptix/metadata.ts"), { require: () => ({ getPublicPageComplex: async () => fixture, PUBLIC_SITE_ORIGIN: "https://www.koaptix.com", publicRegionLabel: code => code }) });
  const result = await metadata.buildComplexMetadata("5037");
  assert.match(result.title, /잠실엘스.*KOAPTIX/);
  assert.match(result.description, /2026-08-31 기준.*전국 공개 랭킹 2위/);
  assert.equal(result.openGraph.url, "/complex/5037");
  assert.equal(result.openGraph.images[0].url, "/complex/5037/opengraph-image?v=2");
  assert.doesNotMatch(result.description, /최근 7일|0.00%|LIVE/);
  const missing = moduleFrom(read("src/lib/koaptix/metadata.ts"), { require: () => ({ getPublicPageComplex: async () => null, PUBLIC_SITE_ORIGIN: "https://www.koaptix.com", publicRegionLabel: code => code }) });
  const fallback = await missing.buildComplexMetadata("5037");
  assert.doesNotMatch(fallback.description, /0위|0원|0.00%|LIVE/);
});
