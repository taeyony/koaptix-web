import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const readerUrl = new URL("../src/lib/koaptix/complexHistoryReference.ts", import.meta.url);
const dataUrl = new URL("../src/lib/koaptix/data/complex-history-reference-20261015.json", import.meta.url);
const data = JSON.parse(readFileSync(dataUrl, "utf8"));
const code = ts.transpileModule(readFileSync(readerUrl, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;

function load(candidate = data) {
  // Execute the real server helper locally; only its server-only marker is a
  // no-op here. The JSON import is the exact checked-in data (or a corrupt copy).
  const module = { exports: {} };
  runInNewContext(code, {
    module,
    exports: module.exports,
    require(name) {
      if (name === "server-only") return {};
      if (name === "node:crypto") return crypto;
      assert.equal(name, "./data/complex-history-reference-20261015.json");
      return candidate;
    },
  }, { filename: fileURLToPath(readerUrl) });
  return module.exports.selectComplexHistoryReference;
}

function anchor(id, changes = {}) {
  return {
    snapshotDate: "2026-08-31",
    marketCapKrw: data.series[id].at(-1),
    generationId: "733d03e6-e029-449b-a748-26c4b032df05",
    publicationVersion: 2,
    ...changes,
  };
}

test("all packaged references preserve every date, exact amount and null gap", () => {
  const ids = Object.keys(data.series);
  const anchors = Object.fromEntries(ids.map((id) => [id, anchor(id)]));
  const selected = load()(ids, anchors);
  assert.equal(ids.length, 3158);
  let positive = 0;
  let empty = 0;
  for (const id of ids) {
    assert.equal(selected.metadataById[id].available, true);
    assert.equal(selected.rowsById[id].length, 33);
    for (let index = 0; index < 33; index++) {
      const row = selected.rowsById[id][index];
      assert.equal(row.snapshot_date, data.dates[index]);
      assert.equal(row.complex_id, Number(id));
      assert.equal(row.market_cap_krw, data.series[id][index]);
      assert.equal(row.rank_all, null);
      assert.equal(row.sourceKey, data.source.sourceKey);
      if (row.market_cap_krw === null) empty++;
      else positive++;
    }
  }
  assert.equal(positive, 28439);
  assert.equal(empty, 75775);
  assert.equal(selected.source.expectedPointCount, 33);
  assert.equal(selected.source.sourceNote, "현재 확인된 세대수와 가용 거래를 기준으로 재계산한 참고 이력이며, 당시 공표값이나 전국의 완전한 과거 이력이 아닙니다.");
});

test("a fresh current publication anchor is required for each exact ID", () => {
  const select = load();
  const id = Object.keys(data.series)[0];
  const cases = [
    [undefined, "PUBLIC_ANCHOR_UNAVAILABLE"],
    [anchor(id, { snapshotDate: "2026-09-30" }), "PUBLIC_ANCHOR_CHANGED"],
    [anchor(id, { marketCapKrw: data.series[id].at(-1) + 1 }), "PUBLIC_ANCHOR_CHANGED"],
    [anchor(id, { marketCapKrw: null }), "PUBLIC_ANCHOR_CHANGED"],
    [anchor(id, { marketCapKrw: String(data.series[id].at(-1)) }), "PUBLIC_ANCHOR_CHANGED"],
    [anchor(id, { generationId: "another-generation" }), "PUBLICATION_CHANGED"],
    [anchor(id, { publicationVersion: 3 }), "PUBLICATION_CHANGED"],
  ];
  for (const [value, reason] of cases) {
    const result = select([id], { [id]: value });
    assert.equal(result.rowsById[id].length, 0);
    assert.equal(result.metadataById[id].available, false);
    assert.equal(result.metadataById[id].reason, reason);
    assert.equal(result.metadataById[id].availableFrom, null);
  }
});

test("unknown and malformed IDs cannot borrow another ID's reference", () => {
  const select = load();
  const id = Object.keys(data.series)[0];
  const invalid = [`0${id}`, ` ${id}`, `${id}.0`, 0, -1, NaN, Infinity, "9007199254740992", "__proto__"];
  for (const value of invalid) {
    const result = select([value], { [String(value)]: anchor(id) });
    assert.equal(result.rowsById[String(value)].length, 0);
    assert.equal(result.metadataById[String(value)].reason, "INVALID_COMPLEX_ID");
  }
  const unknown = select([9007199254740991], {});
  assert.equal(unknown.rowsById["9007199254740991"].length, 0);
  assert.equal(unknown.metadataById["9007199254740991"].reason, "NO_REFERENCE_HISTORY");
  assert.equal(select([Number(id)], { [id]: anchor(id) }).metadataById[id].available, true);
});

test("a changed package date, amount, source or anchor fails closed", () => {
  const id = Object.keys(data.series)[0];
  const mutations = [
    (copy) => { copy.dates[0] = "2024-01-02"; },
    (copy) => { copy.series[id][32] = null; },
    (copy) => { copy.series[id][32] = -1; },
    (copy) => { copy.series[id][32] = 1.25; },
    (copy) => { copy.series[id][32] += 1; },
    (copy) => { copy.source.sourceKey = "unverified-source"; },
    (copy) => { copy.source.publicationVersion = 3; },
    (copy) => { copy.provenance.historicalPublication = true; },
    (copy) => { delete copy.series[id]; },
  ];
  for (const mutate of mutations) {
    const copy = structuredClone(data);
    mutate(copy);
    const result = load(copy)([id], { [id]: anchor(id) });
    assert.equal(result.rowsById[id].length, 0);
    assert.equal(result.metadataById[id].reason, "INVALID_REFERENCE_DATA");
  }
});

test("a caller cannot mutate packaged amounts or source through a response", () => {
  const select = load();
  const id = Object.keys(data.series)[0];
  const first = select([id], { [id]: anchor(id) });
  first.rowsById[id][32].market_cap_krw = 1;
  first.source.generationId = "changed";
  const second = select([id], { [id]: anchor(id) });
  assert.equal(second.rowsById[id][32].market_cap_krw, data.series[id][32]);
  assert.equal(second.source.generationId, data.source.generationId);
});
