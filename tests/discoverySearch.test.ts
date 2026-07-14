import assert from "node:assert/strict";
import test from "node:test";

import {
  DISCOVERY_REGION_FALLBACK_CANDIDATE_CAP,
  dedupeDiscoveryByComplexId,
  getMissingDiscoveryRegionComplexIds,
  isDiscoveryOnlyEligible,
  mergeDiscoveryRegionEvidence,
  normalizeBoundedDiscoveryComplexIds,
  type DiscoveryRegionEvidence,
} from "../src/lib/koaptix/discoverySearch";

function evidence(
  complexId: string,
  source: DiscoveryRegionEvidence["source"],
  regionCode = "11140",
): DiscoveryRegionEvidence {
  return {
    complexId,
    regionCode,
    lawdCode: regionCode,
    sggCode: regionCode,
    sigunguName: "중구",
    umdName: source === "REGION_MAP" ? "신당동" : null,
    qualifiedRegionName: "서울특별시 중구",
    source,
  };
}

test("bounded ID normalization preserves order, dedupes, and caps at 48", () => {
  const values = ["1", "1", "bad", ...Array.from({ length: 60 }, (_, i) => i + 2)];
  const normalized = normalizeBoundedDiscoveryComplexIds(values);
  assert.equal(normalized.length, DISCOVERY_REGION_FALLBACK_CANDIDATE_CAP);
  assert.deepEqual(normalized.slice(0, 4), ["1", "2", "3", "4"]);
  assert.equal(normalized.at(-1), "48");
});

test("missing IDs exclude map-covered candidates without reordering", () => {
  assert.deepEqual(
    getMissingDiscoveryRegionComplexIds(
      ["168804", "168810", "168815", "168776"],
      [evidence("168810", "REGION_MAP"), evidence("168776", "REGION_MAP")],
    ),
    ["168804", "168815"],
  );
});

test("map evidence always wins over fallback, including disagreement", () => {
  const resolved = mergeDiscoveryRegionEvidence(
    ["1", "2"],
    [evidence("1", "REGION_MAP", "11140")],
    [
      evidence("1", "APT_COMPLEX_REGION_FALLBACK", "26440"),
      evidence("2", "APT_COMPLEX_REGION_FALLBACK", "41800"),
    ],
  );
  assert.equal(resolved.get("1")?.source, "REGION_MAP");
  assert.equal(resolved.get("1")?.regionCode, "11140");
  assert.equal(resolved.get("2")?.source, "APT_COMPLEX_REGION_FALLBACK");
});

test("malformed fallback evidence is never admitted", () => {
  const malformed = evidence("1", "APT_COMPLEX_REGION_FALLBACK", "invalid");
  assert.equal(
    mergeDiscoveryRegionEvidence(["1"], [], [malformed]).has("1"),
    false,
  );
});

test("rank, latest-board, and detail evidence all exclude discovery", () => {
  assert.equal(isDiscoveryOnlyEligible("1", new Set(["1"]), new Set(), new Set()), false);
  assert.equal(isDiscoveryOnlyEligible("1", new Set(), new Set(["1"]), new Set()), false);
  assert.equal(isDiscoveryOnlyEligible("1", new Set(), new Set(), new Set(["1"])), false);
  assert.equal(isDiscoveryOnlyEligible("1", new Set(), new Set(), new Set()), true);
});

test("stable discovery dedupe preserves first row and ranked precedence", () => {
  const rows = [
    { complexId: "1", source: "map" },
    { complexId: "1", source: "fallback" },
    { complexId: "2", source: "fallback" },
  ];
  assert.deepEqual(dedupeDiscoveryByComplexId(rows, new Set(["2"])), [rows[0]]);
});
