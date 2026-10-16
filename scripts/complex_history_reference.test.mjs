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
// Reconstruct the inherited series for assertions about the earlier recovery.
// Only this explicitly recorded set of formerly empty 2024 cells is removed.
const inheritedSeries = structuredClone(data.series);
for (const [id, index] of data.provenance.official2024GapRecovery.addedPointIndexes) {
  inheritedSeries[id][index] = null;
}
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
  assert.equal(positive, 54131);
  assert.equal(empty, 50083);
  assert.equal(selected.source.expectedPointCount, 33);
  assert.equal(selected.source.sourceNote, "현재 확인된 세대수와 가용 거래를 기준으로 재계산한 참고 이력이며, 당시 공표값이나 전국의 완전한 과거 이력이 아닙니다.");
});

test("the previously committed two-complex restoration and its gaps remain intact", () => {
  assert.equal(data.series["168421"][0], 414155333074);
  assert.equal(data.series["168423"][0], 1258598332865);
  assert.equal(data.series["168421"].at(-1), 358398666926);
  assert.equal(data.series["168423"].at(-1), 1128304999930);
  assert.ok(data.series["168421"].slice(9, 21).every(value => value === null));
  assert.ok(data.series["168423"].slice(5, 25).every(value => value === null));
  const proof = data.provenance.committedExtension;
  assert.equal(proof.approvalScopeDigest, "85B57D4A103FAE857F268A51E70E5BAB1BF73B0365F31D5E290E1B9C0BE24D57");
  assert.equal(proof.addedPoints.length, 14);
  assert.equal(proof.changedOtherComplexes, 0);
  assert.equal(proof.changedExistingPositivePoints, 0);
  const selected = load()([168421, 168423], { 168421: anchor("168421"), 168423: anchor("168423") });
  assert.equal(selected.metadataById[168421].availableFrom, "2024-01-01");
  assert.equal(selected.metadataById[168423].availableFrom, "2024-01-01");
});

test("the full restoration preserves every current anchor and every date after November 2024", () => {
  const hash = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").toUpperCase();
  const proof = data.provenance.committedHistoryRecovery;
  assert.equal(proof.approvalScopeDigest, "77BEBF1C5AFC6E46379CB003C9FCB0A61B6FC60941677A82F73B81E96FB18EAD");
  assert.equal(proof.committedTrades, 55383);
  assert.equal(proof.targetComplexes, 2457);
  assert.equal(Object.keys(proof.committedInputSha256).length, 16);
  assert.equal(proof.addedPoints, 12728);
  assert.equal(proof.recalculatedExistingReferencePoints, 12);
  assert.equal(proof.currentAnchorChanges, 0);
  assert.equal(proof.changedOutsideTargetComplexes, 0);
  assert.equal(proof.historicalPublicationAmended, false);
  assert.equal(proof.officialIndexGenesisHoldPreserved, true);
  const changed = new Set(proof.changedComplexIds.map(String));
  assert.equal(changed.size, 1742);
  const unchanged = Object.fromEntries(Object.entries(inheritedSeries).filter(([id]) => !changed.has(id)));
  assert.equal(hash(unchanged), "8469742F55C072CD4BD04E09E553234AFFAFAFB7C43FC4515CA36D67BFBFF603");
  assert.equal(hash(unchanged), proof.unchangedSeriesSha256);
  // These hashes were independently checked against the deployed parent.
  assert.equal(hash(Object.fromEntries(Object.entries(data.series).map(([id, values]) => [id, values.at(-1)]))),
    "864FCEA39282D9194CC362D34EBA4E4A18234946D398509C897B24797D36EFE4");
  assert.equal(hash(Object.fromEntries(Object.entries(inheritedSeries).map(([id, values]) => [id, values.slice(12)]))),
    "06A926FAC03A5F0AC614272C14A15CC10FB9B9DC8287032FBE34DCCB3C9E4927");
  assert.equal(Object.values(inheritedSeries).filter(values => values[0] !== null).length, 1787);
});

test("70,015 verified official transactions fill only 12,950 previously empty 2024 cells", () => {
  const proof = data.provenance.official2024GapRecovery;
  assert.equal(proof.approvalScopeDigest, "297F80B979FF156D2F98064C217606723D43E47EB4C1164C75BB402588C0FD48");
  assert.equal(proof.parentApprovalScopeDigest, "74C81B398A4C82151910A5E424693D2C5BB9794B1D6A0248E488718EDA18572C");
  assert.equal(proof.committedTrades, 70015);
  assert.equal(proof.currentScopeCommittedTrades, 55015);
  assert.equal(proof.priorScopeCommittedTrades, 15000);
  assert.equal(proof.existingPositivePointsChanged, 0);
  assert.equal(proof.currentAnchorChanges, 0);
  assert.equal(proof.latestSourceOnlyForNewPoints, true);
  assert.equal(proof.addedPointIndexes.length, 12950);
  assert.equal(new Set(proof.addedPointIndexes.map(([id, index]) => `${id}:${index}`)).size, 12950);
  for (const [id, index] of proof.addedPointIndexes) {
    assert.ok(index >= 0 && index <= 12);
    assert.ok(data.dates[index].startsWith("2024-"));
    assert.ok(Number.isSafeInteger(data.series[id][index]) && data.series[id][index] > 0);
  }
  // Frozen independently from the deployed parent's entire series. This also
  // proves every preexisting positive value and every non-2024 cell survives.
  assert.equal(crypto.createHash("sha256").update(JSON.stringify(inheritedSeries)).digest("hex").toUpperCase(),
    "F472EFD674AD48EA7F6E46CA7B835990F5D65DD013339B16182F34183466F854");
  assert.equal(Object.values(data.series).filter(values => values[0] !== null).length, 2125);
  assert.equal(proof.addedPointIndexes.filter(([, index]) => index === 0).length, 338);
  // Freeze all 995 values added by the prior partial execution as well.
  assert.equal(proof.priorPartialAddedPointIndexes.length, 995);
  const priorPartialSeries = structuredClone(inheritedSeries);
  for (const [id, index] of proof.priorPartialAddedPointIndexes) {
    priorPartialSeries[id][index] = data.series[id][index];
  }
  assert.equal(crypto.createHash("sha256").update(JSON.stringify(priorPartialSeries)).digest("hex").toUpperCase(),
    "F4ED45E1B53A907A9A5D360680BF768594FE4578BD128EAA5E401CB7A06E6638");
});

test("newly supported history is visible while unsupported intervals stay empty", () => {
  const restored = load()([306666], { 306666: anchor("306666") });
  assert.equal(restored.metadataById[306666].availableFrom, "2024-01-01");
  assert.ok(restored.rowsById[306666].slice(0, 13).every(row => row.market_cap_krw > 0));
  assert.equal(restored.rowsById[306666][6].market_cap_krw, 1016751666340);
  const selected = load()([5262, 2765], { 5262: anchor("5262"), 2765: anchor("2765") });
  assert.equal(selected.metadataById[5262].availableFrom, "2024-05-31");
  assert.equal(selected.rowsById[5262][5].market_cap_krw, 2707470000030);
  assert.equal(selected.rowsById[5262][6].market_cap_krw, 2728284999951);
  assert.ok(selected.rowsById[5262].slice(0, 5).every(row => row.market_cap_krw === null));
  assert.ok(selected.rowsById[5262].slice(17, 21).every(row => row.market_cap_krw === null));
  assert.equal(selected.metadataById[2765].availableFrom, "2024-01-01");
  assert.equal(selected.rowsById[2765][0].market_cap_krw, 3240298333389);
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
