import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
function load(source, dependencies = {}) {
  const module = { exports: {} };
  runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
    { module, exports: module.exports, URL, Response, Request, Error, ...dependencies });
  return module.exports;
}
function declaration(path, name) {
  const ast = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true);
  return ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(ast);
}
const currentness = load(read("src/lib/koaptix/currentness.ts"));
const districts = load(read("src/lib/koaptix/districtIdentity.ts"));
const universes = load(read("src/lib/koaptix/universes.ts"));
const { assemblePublicComplexDetail: assemble, publicDetailMetrics } = load(read("src/lib/koaptix/complexDetail.ts"), {
  require: id => ({ "./currentness": currentness, "./districtIdentity": districts })[id],
});
const publication = { generation_id: "733d03e6-e029-449b-a748-26c4b032df05", publication_version: 2,
  publication_event_id: "90f8bd8d-9a97-44df-834c-8c23c4077d40", published_at: "2026-10-15T00:22:12.07608+00:00",
  surface_code: "UNIVERSE_SERVICE", universe_code: "SGG_29200", snapshot_date: "2026-07-03" };
const published = { ...publication, complex_id: 170015, apt_name_ko: "Public complex", rank_all: 2,
  market_cap_krw: 658600000000, market_cap_trillion_krw: 0.6586, sigungu_name: null, legal_dong_name: null,
  household_count: null, build_year: null };
const basic = { complex_id: 170015, household_count: null, total_household_count: 672, build_year: 2009,
  legal_dong_name: "Suwan", address_jibun: null, updated_at: "2026-10-15T00:00:00Z" };

function queryReader({ row = published, master = basic, error = null } = {}) {
  const calls = [];
  const builder = { maybeSingle: async () => ({ data: master, error }) };
  for (const method of ["select", "eq"]) builder[method] = (...args) => { calls.push([method, ...args]); return builder; };
  const { getComplexDetailById } = load(declaration("src/lib/koaptix/queries.ts", "getComplexDetailById"), {
    DEFAULT_UNIVERSE_CODE: "KOREA_ALL", resolveUniverseRequest: universes.resolveUniverseRequest,
    getLatestRankBoard: async (...args) => { calls.push(["public", ...args]); return row ? [row] : []; },
    createServerSupabase: () => ({ from: name => { calls.push(["from", name]); return builder; } }),
    withLocalQueryTimeout: async query => query, fetchRegionFallbackByComplexId: async () => null,
    normalizeComplexId: Number, assemblePublicComplexDetail: assemble, isLegalDongName: districts.isLegalDongName,
  });
  return { getComplexDetailById, calls };
}

test("a regional public row older than the national latest date recovers master basics without changing its price/rank/date", async () => {
  const q = queryReader();
  const detail = await q.getComplexDetailById("170015", "SGG_29200", "2026-07-03");
  assert.equal(detail.household_count, 672);
  assert.equal(detail.approval_year, 2009);
  assert.equal(detail.rank_all, 2);
  assert.equal(detail.market_cap_krw, published.market_cap_krw);
  assert.equal(detail.publication.snapshot_date, "2026-07-03");
  assert.equal(detail.rank_delta_7d, null);
  assert.equal(detail.market_cap_delta_pct_7d, null);
  assert.deepEqual(q.calls.filter(c => c[0] === "from"), [["from", "apt_complex"]]);
});

test("unexposed regions, invalid IDs and absent public rows cannot promote master-only data", async () => {
  for (const [id, code] of [["170015", "SGG_99999"], ["../1", "KOREA_ALL"], ["0", "KOREA_ALL"]]) {
    const q = queryReader(); assert.equal(await q.getComplexDetailById(id, code), null); assert.equal(q.calls.length, 0);
  }
  const q = queryReader({ row: null });
  assert.equal(await q.getComplexDetailById("170015", "SGG_29200"), null);
  assert.equal(q.calls.some(c => c[0] === "from"), false);
});

test("a changed publication date and a failed basic lookup are errors, not missing complexes or historical fallbacks", async () => {
  const stale = queryReader();
  await assert.rejects(stale.getComplexDetailById("170015", "SGG_29200", "2026-08-31"), /DETAIL_PUBLICATION_CHANGED/);
  assert.equal(stale.calls.some(c => c[0] === "from"), false);
  await assert.rejects(queryReader({ error: { message: "private database error" } }).getComplexDetailById("170015", "SGG_29200"), /COMPLEX_BASIC_LOOKUP_FAILED/);
});

test("missing metadata stays unknown and cannot manufacture household counts or financial comparisons", () => {
  const row = assemble(published, null);
  for (const field of ["household_count", "approval_year", "building_count", "parking_count", "history_snapshot_date", "rank_delta_7d", "market_cap_delta_7d"]) assert.equal(row[field], null);
  assert.equal(row.market_cap_krw, published.market_cap_krw);
  for (const change of [{ household_count: 0, total_household_count: -1 }, { household_count: 0, total_household_count: 1.5 }])
    assert.equal(assemble(published, { ...basic, ...change }).household_count, null);
});

test("wrong master IDs, invalid public values and non-public surfaces fail closed", () => {
  assert.throws(() => assemble(published, { ...basic, complex_id: 5152 }), /ID mismatch/);
  for (const change of [{ surface_code: "GLOBAL_LATEST" }, { rank_all: 1001 }, { rank_all: 0 }, { market_cap_krw: null }, { complex_id: 0 }, { apt_name_ko: "" }])
    assert.throws(() => assemble({ ...published, ...change }, basic));
});

test("selected regional rank and deliberately unavailable comparisons survive a conflicting national detail response", () => {
  const item = { rank: 1, marketCapKrw: 11_020_126_666_370, rankDelta7d: null, marketCapDelta7d: null,
    marketCapDeltaPct7d: null, historySnapshotDate: null, highMarketCap52w: null, recoveryRate52w: null };
  const detail = { rank: 4, marketCapKrw: 99, rankDelta7dNullable: 3, marketCapDelta7dNullable: 10,
    marketCapDeltaPct7dNullable: 99, historySnapshotDate: "2026-08-24", highMarketCap52w: 999, recoveryRate52w: 100 };
  const values = publicDetailMetrics(item, detail);
  assert.equal(values.rank, 1); assert.equal(values.marketCap, item.marketCapKrw);
  for (const key of ["rankDelta7d", "marketCapDelta7d", "marketCapDeltaPct7d", "historySnapshotDate", "highMarketCap52w", "recoveryRate52w"]) assert.equal(values[key], null);
  assert.equal(publicDetailMetrics(null, detail).rank, 4);
});

function route(reader) {
  return load(read("src/app/api/complex-detail/route.ts"), { require: id => id.endsWith("/queries") ? { getComplexDetailById: reader }
    : id.endsWith("/mappers") ? { mapComplexDetailRow: row => row } : universes }).GET;
}
test("detail API distinguishes bad request, missing publication, stale date and service failure without exposing internal errors", async () => {
  const request = params => new Request(`http://localhost/api/complex-detail?${params}`);
  let calls = 0;
  const missing = route(async () => { calls++; return null; });
  for (const params of ["complexId=../1", "complexId=1&universe_code=SGG_99999", "complexId=1&snapshot_date=2026-02-31"]) assert.equal((await missing(request(params))).status, 400);
  assert.equal(calls, 0);
  assert.equal((await missing(request("complexId=170015&universe_code=SGG_29200"))).status, 404);
  const changed = route(async () => { throw new Error("DETAIL_PUBLICATION_CHANGED"); });
  assert.equal((await changed(request("complexId=170015"))).status, 409);
  const failed = await route(async () => { throw new Error("private database error"); })(request("complexId=170015"));
  assert.equal(failed.status, 503); assert.doesNotMatch(await failed.text(), /private database error/);
  const success = await route(async (id, scope, date) => { assert.equal(scope, "SGG_29200"); assert.equal(date, "2026-07-03"); return assemble(published, basic); })(request("complexId=170015&universe_code=SGG_29200&snapshot_date=2026-07-03"));
  assert.equal(success.status, 200); assert.equal(success.headers.get("cache-control"), "no-store");
});

test("the audited full public listing cohort reconnects through the actual adapter with prices and identities unchanged", { skip: !process.env.KOAPTIX_DETAIL_RECOVERY_FIXTURES }, () => {
  const groups = JSON.parse(readFileSync(process.env.KOAPTIX_DETAIL_RECOVERY_FIXTURES, "utf8"));
  const ids = new Set(); let contexts = 0;
  for (const group of groups) for (const [id, name, rank, cap, households, year, masterHouseholds, masterTotal, masterYear] of group.rows) {
    const row = { ...group, surface_code: "UNIVERSE_SERVICE", complex_id: id, apt_name_ko: name, rank_all: rank,
      market_cap_krw: cap, market_cap_trillion_krw: null, household_count: households, build_year: year, sigungu_name: null, legal_dong_name: null };
    const output = assemble(row, { complex_id: id, household_count: masterHouseholds, total_household_count: masterTotal, build_year: masterYear });
    assert.ok(output.household_count > 0, `households ${id}`); assert.ok(output.approval_year > 0, `year ${id}`);
    assert.equal(output.rank_all, rank); assert.equal(output.market_cap_krw, cap);
    for (const key of ["universe_code", "snapshot_date", "generation_id", "publication_version", "publication_event_id", "published_at"]) assert.equal(output.publication[key], group[key]);
    ids.add(String(id)); contexts++;
  }
  assert.equal(groups.length, 103); assert.equal(contexts, 12066); assert.equal(ids.size, 8755);
});
