import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function load(name, dependencies = {}) {
  const module = { exports: {} };
  const source = readFileSync(new URL(`../src/lib/koaptix/${name}.ts`, import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, { module, exports: module.exports, require: key => {
    if (!(key in dependencies)) throw new Error(`Unexpected dependency: ${key}`);
    return dependencies[key];
  } });
  return module.exports;
}
const currentness = load("currentness");
const districts = load("districtIdentity");
const universes = load("universes");
const { readMyHomeBoard: read, findMyHomeNeighbors: neighbors, resolveMyHomeRegion: region } = load("myHomeRanking", {
  "./currentness": currentness, "./districtIdentity": districts, "./universes": universes,
});
const publication = {
  generation_id: "733d03e6-e029-449b-a748-26c4b032df05", publication_version: 2,
  publication_event_id: "90f8bd8d-9a97-44df-834c-8c23c4077d40", published_at: "2026-10-15T00:22:12.07608+00:00",
  surface_code: "UNIVERSE_SERVICE", universe_code: "KOREA_ALL", snapshot_date: "2026-08-31",
};
function item(rank = 2, changes = {}) {
  const { universe_code, snapshot_date, ...identity } = publication;
  return { ...identity, complexId: String(rank + 100), name: `단지 ${rank}`, rank, rank_all: rank,
    marketCapKrw: 1_000_000_000, market_cap_krw: 1_000_000_000, marketCapTrillionKrw: 0.001,
    universeCode: universe_code, universe_code, snapshotDate: snapshot_date,
    cityName: "서울", sigunguName: "송파구", legalDongName: "잠실동", locationLabel: "서울 송파구 잠실동",
    rankDelta7d: null, recoveryRate52w: null, ...changes };
}
function payload(items = [item(1), item(2), item(3)], changes = {}) {
  return { ...publication, ok: true, requestedUniverseCode: "KOREA_ALL", renderedUniverseCode: "KOREA_ALL",
    universeCode: "KOREA_ALL", latestBoardDate: publication.snapshot_date, items, ...changes };
}

test("real endpoint camel aliases preserve the selected publication and exact ranks without mutating input", () => {
  const input = payload([item(3), item(1), item(2)]);
  const before = JSON.stringify(input);
  const board = read(input, "KOREA_ALL");
  assert.equal(board.publication.snapshot_date, publication.snapshot_date);
  assert.equal(board.publication.universe_code, "KOREA_ALL");
  assert.equal(board.items[0].snapshotDate, publication.snapshot_date);
  const result = neighbors(board, "102");
  assert.equal(result.selected.rank, 2);
  assert.equal(result.above.rank, 1);
  assert.equal(result.below.rank, 3);
  assert.equal(JSON.stringify(input), before);
});

test("mixed item and envelope publication identities, scopes and dates fail closed", () => {
  for (const change of [
    { generation_id: "833d03e6-e029-449b-a748-26c4b032df05" }, { publication_version: 3 },
    { publication_event_id: "80f8bd8d-9a97-44df-834c-8c23c4077d40" }, { published_at: "2026-10-16T00:00:00Z" },
    { surface_code: "GLOBAL_LATEST" }, { snapshotDate: "2026-08-24" },
    { universeCode: "SEOUL_ALL", universe_code: "SEOUL_ALL" },
  ]) assert.throws(() => read(payload([item(1), item(2, change)]), "KOREA_ALL"));
  for (const change of [
    { generation_id: "833d03e6-e029-449b-a748-26c4b032df05" }, { publication_version: 3 },
    { surface_code: "GLOBAL_LATEST" }, { snapshot_date: "2026-08-24", latestBoardDate: "2026-08-24" },
    { requestedUniverseCode: "SEOUL_ALL" }, { renderedUniverseCode: "SEOUL_ALL" }, { ok: false },
  ]) assert.throws(() => read(payload(undefined, change), "KOREA_ALL"));
  assert.throws(() => read(payload([]), "KOREA_ALL"));
  assert.throws(() => read(payload(), "SGG_51150"));
});

test("conflicting scope/date aliases cannot hide a mismatched publication", () => {
  for (const change of [
    { snapshot_date: "2026-08-24" }, { universe_code: "SEOUL_ALL" }, { rank_all: 3 },
    { market_cap_krw: 100 },
  ]) assert.throws(() => read(payload([item(2, change)]), "KOREA_ALL"));
  assert.throws(() => read(payload(undefined, { latestBoardDate: "2026-08-24" }), "KOREA_ALL"));
});

test("duplicate IDs/ranks and invalid ranks or financial rows never enter the board", () => {
  assert.throws(() => read(payload([item(1), item(2, { complexId: "101" })]), "KOREA_ALL"), /Duplicate/);
  assert.throws(() => read(payload([item(1), item(1, { complexId: "999" })]), "KOREA_ALL"), /Duplicate/);
  for (const rank of [0, -1, 1.5, 1001, Number.NaN]) {
    assert.throws(() => read(payload([item(rank)]), "KOREA_ALL"));
  }
  for (const change of [{ name: "" }, { complexId: "0" }, { marketCapKrw: 0, market_cap_krw: 0 }]) {
    assert.throws(() => read(payload([item(2, change)]), "KOREA_ALL"));
  }
});

test("rank gaps, TOP1000 boundaries and absent IDs do not manufacture adjacent ranks", () => {
  const board = read(payload([item(1), item(3), item(1000)]), "KOREA_ALL");
  assert.equal(neighbors(board, "101").above, null);
  assert.equal(neighbors(board, "101").below, null);
  assert.equal(neighbors(board, "103").above, null);
  assert.equal(neighbors(board, "1100").below, null);
  const absent = neighbors(board, "999");
  assert.equal(absent.selected, null); assert.equal(absent.above, null); assert.equal(absent.below, null);
  const invalid = { ...board, items: [...board.items, { ...board.items[0] }] };
  assert.throws(() => neighbors(invalid, "101"), /Duplicate/);
  assert.throws(() => neighbors({ ...board, publication: { ...board.publication, publication_version: 3 } }, "101"));
});

test("regional publication keeps its own older date instead of borrowing the national date", () => {
  const date = "2026-07-03";
  const code = "SGG_11710";
  const regional = payload([item(2, { universeCode: code, universe_code: code, snapshotDate: date })], {
    universe_code: code, universeCode: code, requestedUniverseCode: code, renderedUniverseCode: code,
    snapshot_date: date, latestBoardDate: date,
  });
  assert.equal(read(regional, code).publication.snapshot_date, date);
});

test("province-qualified rows select a unique public district, including same-name districts", () => {
  assert.equal(region(item()).code, "SGG_11710");
  const seoul = region(item(2, { sigunguName: "중구" }));
  const busan = region(item(2, { cityName: "부산", sigunguName: "중구" }));
  assert.equal(districts.resolveSidoFromUniverseCode(seoul.code), "SEOUL_ALL");
  assert.equal(districts.resolveSidoFromUniverseCode(busan.code), "BUSAN_ALL");
  assert.notEqual(seoul.code, busan.code);
  assert.equal(region(item(2, { cityName: "", sigunguName: "서울 중구" })).code, seoul.code);
});

test("bare ambiguous districts and conflicting province evidence remain unavailable", () => {
  for (const change of [
    { cityName: "", sigunguName: "중구" }, { cityName: "", sigunguName: "광주시" },
    { cityName: "수원", sigunguName: "중구" }, { cityName: "서울 부산", sigunguName: "중구" },
    { cityName: "서울", sigunguName: "부산 중구" },
    { cityName: "부산", universeCode: "SEOUL_ALL", universe_code: "SEOUL_ALL" },
  ]) assert.equal(region(item(2, change)), null);
});

test("HOLD or unavailable districts fall back only to the full exposed province board", () => {
  const held = region(item(2, { cityName: "강원", sigunguName: "강릉시" }));
  assert.equal(held.code, "GANGWON_ALL");
  assert.equal(held.label, "강원 전체");
  assert.notEqual(held.code, "SGG_51150");
  assert.equal(region(item(2, { cityName: "경기", sigunguName: "미공개시" })).code, "GYEONGGI_ALL");
  assert.equal(region(item(2, { cityName: "세종", sigunguName: "" })).code, "SEJONG_ALL");
});
