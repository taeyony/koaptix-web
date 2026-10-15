import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function load(name, dependencies = {}) {
  const module = { exports: {} };
  runInNewContext(ts.transpileModule(readFileSync(new URL(`../src/lib/koaptix/${name}.ts`, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, { module, exports: module.exports, URLSearchParams, require: key => {
    if (!(key in dependencies)) throw new Error(`Unexpected dependency: ${key}`);
    return dependencies[key];
  } });
  return module.exports;
}
const identity = load("districtIdentity");
const universes = load("universes");
const { getDistrictRankingHref } = load("districtRankingHref", { "./districtIdentity": identity, "./universes": universes });
const params = href => new URL(href, "https://www.koaptix.com").searchParams;

test("national and Seoul map selections open the existing Songpa public board", () => {
  assert.equal(params(getDistrictRankingHref("서울 송파구", "KOREA_ALL")).get("universe"), "SGG_11710");
  assert.equal(params(getDistrictRankingHref("송파구", "SEOUL_ALL")).get("universe"), "SGG_11710");
  assert.equal(params(getDistrictRankingHref("서울특별시 송파구", "KOREA_ALL")).has("district"), false);
});

test("same-name districts keep province authority and bare national names fail closed", () => {
  assert.equal(getDistrictRankingHref("중구", "KOREA_ALL"), null);
  assert.equal(getDistrictRankingHref("서울 중구", "BUSAN_ALL"), null);
  const busan = params(getDistrictRankingHref("중구", "BUSAN_ALL")).get("universe");
  assert.equal(identity.resolveSidoFromUniverseCode(busan), "BUSAN_ALL");
  const seoul = params(getDistrictRankingHref("중구", "SEOUL_ALL")).get("universe");
  assert.equal(identity.resolveSidoFromUniverseCode(seoul), "SEOUL_ALL");
  assert.notEqual(busan, seoul);
});

test("macro fallback keeps the exact district and never opens a hidden regional board", () => {
  const { getDistrictRankingHref: fallback } = load("districtRankingHref", {
    "./districtIdentity": identity,
    "./universes": { getRankingUniverseRegistry: () => [{ code: "SEOUL_ALL", scope: "MACRO" }] },
  });
  const result = params(fallback("서울 송파구", "KOREA_ALL"));
  assert.equal(result.get("universe"), "SEOUL_ALL");
  assert.equal(result.get("district"), "송파구");
  assert.equal(fallback("부산 중구", "KOREA_ALL"), null);
  assert.equal(fallback("아무 이름", "SEOUL_ALL"), null);
});

test("existing district matcher retains fail-closed behavior after extraction", () => {
  const row = { sigunguName: "중구", universeCode: "KOREA_ALL" };
  assert.equal(identity.matchesStructuredDistrict(row, "서울 중구", "KOREA_ALL"), false);
  assert.equal(identity.matchesStructuredDistrict({ ...row, universeCode: "SEOUL_ALL" }, "중구", "SEOUL_ALL"), true);
  assert.equal(identity.matchesStructuredDistrict({ ...row, cityName: "부산" }, "서울 중구", "SEOUL_ALL"), false);
});
