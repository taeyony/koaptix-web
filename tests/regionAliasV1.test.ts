import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildRegionAliasV1Index,
  createRegionAliasSourceUnavailableResolution,
  normalizeRegionAliasQuery,
  resolveRegionAliasV1,
} from "../src/lib/koaptix/regionAliasV1";
import type {
  BoundedLocalityHint,
  CanonicalRegionInput,
} from "../src/lib/koaptix/regionAliasV1.types";

const rows: CanonicalRegionInput[] = [
  row("00", "country", "대한민국", null),
  row("29", "sido", "광주광역시", "00"),
  row("26", "sido", "부산광역시", "00"),
  row("27", "sido", "대구광역시", "00"),
  row("31", "sido", "울산광역시", "00"),
  row("29155", "sigungu", "남구", "29", "광주광역시 남구"),
  row("29110", "sigungu", "동구", "29", "광주광역시 동구"),
  row("26110", "sigungu", "중구", "26", "부산광역시 중구"),
  row("26140", "sigungu", "서구", "26", "부산광역시 서구"),
  row("26170", "sigungu", "동구", "26", "부산광역시 동구"),
  row("26290", "sigungu", "남구", "26", "부산광역시 남구"),
  row("27110", "sigungu", "중구", "27", "대구광역시 중구"),
  row("27140", "sigungu", "동구", "27", "대구광역시 동구"),
  row("31140", "sigungu", "남구", "31", "울산광역시 남구"),
];

const localityHints: BoundedLocalityHint[] = [
  {
    localityNameKo: "진월동",
    parentRegionCode: "29155",
    provenance: "BOUNDED_RECORD_LINKED_LOCALITY",
  },
];

function row(
  regionCode: string,
  regionLevel: CanonicalRegionInput["regionLevel"],
  fullNameKo: string,
  parentRegionCode: string | null,
  qualifiedNameKo: string | null = null,
): CanonicalRegionInput {
  return {
    regionCode,
    regionLevel,
    fullNameKo,
    parentRegionCode,
    qualifiedNameKo,
    sourceProvenance: "CURRENT_INTERNAL_REGION_DIM",
  };
}

function resolve(
  query: string,
  selectedUniverseCode = "KOREA_ALL",
  macroRegionCodePrefix: string | null = null,
) {
  return resolveRegionAliasV1(
    query,
    buildRegionAliasV1Index(rows, localityHints),
    { selectedUniverseCode, macroRegionCodePrefix },
  );
}

test("normalization preserves spaced NFC and secondary compact keys", () => {
  const decomposed = "광주광역시".normalize("NFD");
  const normalized = normalizeRegionAliasQuery(`  ${decomposed}   남구  `);
  assert.equal(normalized.normalizedQuery, "광주광역시 남구");
  assert.equal(normalized.compactQuery, "광주광역시남구");
  assert.equal(normalizeRegionAliasQuery("   ").normalizedQuery, "");
  assert.equal(normalizeRegionAliasQuery("Busan, Apt").normalizedQuery, "Busan, Apt");
});

test("canonical, qualified, suffix, and compact aliases resolve deterministically", () => {
  assert.equal(resolve("광주광역시").state, "EXACT_CANONICAL");

  const qualified = resolve("광주광역시 남구 한국아델리움");
  assert.equal(qualified.state, "EXACT_QUALIFIED");
  assert.equal(qualified.canonicalRegionCode, "29155");
  assert.equal(qualified.residualQuery, "한국아델리움");

  const safeVariant = resolve("광주 남구 한국아델리움");
  assert.equal(safeVariant.state, "SAFE_VARIANT_UNIQUE");
  assert.equal(safeVariant.residualQuery, "한국아델리움");

  const compact = resolve("광주남구 한국아델리움");
  assert.equal(compact.canonicalRegionCode, "29155");
  assert.equal(compact.residualQuery, "한국아델리움");
});

test("nationwide terminal and compact collisions remain ambiguous", () => {
  for (const terminal of ["남구", "중구", "동구"]) {
    const result = resolve(terminal);
    assert.equal(result.state, "AMBIGUOUS");
    assert.equal(result.reasonCode, "TERMINAL_NAME_COLLISION");
    assert.equal(result.rankedSearchAllowed, false);
    assert.equal(result.discoverySearchAllowed, false);
    assert.equal(result.globalFallbackAllowed, false);
    assert.ok(result.candidateChoices.length >= 2);
  }

  const collisionRows = [
    row("29", "sido", "가 나", null),
    row("26", "sido", "가  나", null),
  ];
  const collision = resolveRegionAliasV1(
    "가나",
    buildRegionAliasV1Index(collisionRows),
    { selectedUniverseCode: "KOREA_ALL" },
  );
  assert.equal(collision.state, "AMBIGUOUS");
  assert.equal(collision.reasonCode, "COMPACT_KEY_COLLISION");
});

test("selected universe context resolves only one compatible candidate", () => {
  const macro = resolve("남구 한국아델리움", "GWANGJU_ALL", "29");
  assert.equal(macro.state, "CONTEXT_UNIQUE");
  assert.equal(macro.canonicalRegionCode, "29155");
  assert.equal(macro.residualQuery, "한국아델리움");

  const sgg = resolve("남구 한국아델리움", "SGG_29155");
  assert.equal(sgg.state, "CONTEXT_UNIQUE");
  assert.equal(sgg.effectiveRegionScope?.regionCode, "29155");

  const ancestor = resolve("광주광역시 한국아델리움", "SGG_29155");
  assert.equal(ancestor.compatibilityState, "COMPATIBLE");
  assert.equal(ancestor.effectiveRegionScope?.regionCode, "29155");
  assert.equal(ancestor.residualQuery, "한국아델리움");
});

test("macro and SGG conflicts fail closed without changing universe", () => {
  const macroConflict = resolve("광주광역시 남구", "BUSAN_ALL", "26");
  assert.equal(macroConflict.state, "UNIVERSE_CONFLICT");
  assert.equal(macroConflict.selectedUniverse, "BUSAN_ALL");
  assert.equal(macroConflict.effectiveRegionScope, null);
  assert.equal(macroConflict.rankedSearchAllowed, false);
  assert.equal(macroConflict.discoverySearchAllowed, false);
  assert.equal(macroConflict.globalFallbackAllowed, false);

  const sggConflict = resolve("부산광역시 남구", "SGG_29155");
  assert.equal(sggConflict.state, "UNIVERSE_CONFLICT");
  assert.equal(sggConflict.selectedUniverse, "SGG_29155");
});

test("multiple incompatible explicit regions do not discard either token", () => {
  const result = resolve("부산광역시 광주광역시 남구");
  assert.equal(result.state, "AMBIGUOUS");
  assert.equal(result.reasonCode, "MULTIPLE_EXPLICIT_REGION_TOKENS");
  assert.equal(result.rankedSearchAllowed, false);
  assert.ok(result.matchedText?.includes("부산광역시"));
  assert.ok(result.matchedText?.includes("광주광역시"));
});

test("bounded locality needs deterministic selected parent", () => {
  const nationwide = resolve("진월동 한국아델리움");
  assert.equal(nationwide.state, "NO_REGION_RESOLUTION");
  assert.equal(
    nationwide.reasonCode,
    "LOCALITY_WITHOUT_DETERMINISTIC_PARENT",
  );
  assert.equal(nationwide.residualQuery, "진월동 한국아델리움");

  const scoped = resolve("진월동 한국아델리움", "SGG_29155");
  assert.equal(scoped.state, "CONTEXT_UNIQUE");
  assert.equal(scoped.effectiveRegionScope?.regionCode, "29155");
  assert.equal(scoped.residualQuery, "한국아델리움");
});

test("unsupported fuzzy text remains unresolved and preserves residual", () => {
  const result = resolve("광쥬광역시 남구 한국아델리움");
  assert.equal(result.state, "NO_REGION_RESOLUTION");
  assert.equal(result.canonicalRegionCode, null);
  assert.equal(result.residualQuery, "광쥬광역시 남구 한국아델리움");
  assert.ok(!("rank" in result));
  assert.ok(!("popularity" in result));
  assert.ok(!("resultCount" in result));
});

test("index and resolution are independent of canonical input order", () => {
  const serialize = (input: CanonicalRegionInput[]) =>
    buildRegionAliasV1Index(input, localityHints).entries.map((entry) => [
      entry.normalizedAliasKey,
      entry.canonicalRegionCode,
      entry.aliasClass,
    ]);
  assert.deepEqual(serialize(rows), serialize([...rows].reverse()));
});

test("source-unavailable contract permits only bounded legacy fallback", () => {
  const regionLike = createRegionAliasSourceUnavailableResolution(
    "광주광역시 남구 한국아델리움",
    "KOREA_ALL",
  );
  assert.equal(regionLike.state, "NO_REGION_RESOLUTION");
  assert.equal(regionLike.reasonCode, "CANONICAL_REGION_SOURCE_UNAVAILABLE");
  assert.equal(regionLike.effectiveRegionScope, null);
  assert.equal(regionLike.globalFallbackAllowed, false);
  assert.equal(regionLike.rankedSearchAllowed, false);
  assert.equal(regionLike.discoverySearchAllowed, false);
  assert.equal(regionLike.canonicalRegionCode, null);
  assert.deepEqual(regionLike.candidateChoices, []);
  assert.equal(regionLike.residualQuery, "광주광역시 남구 한국아델리움");

  const complexOnly = createRegionAliasSourceUnavailableResolution(
    "한국아델리움",
    "KOREA_ALL",
  );
  assert.equal(complexOnly.state, "NO_REGION_RESOLUTION");
  assert.equal(complexOnly.reasonCode, "CANONICAL_REGION_SOURCE_UNAVAILABLE");
  assert.equal(complexOnly.rankedSearchAllowed, true);
  assert.equal(complexOnly.discoverySearchAllowed, true);
  assert.equal(complexOnly.globalFallbackAllowed, false);
  assert.equal(complexOnly.canonicalRegionCode, null);
  assert.deepEqual(complexOnly.candidateChoices, []);
});

test("source-unavailable bounded region intent fails closed without fabricated resolution", () => {
  for (const query of ["남구", "광주광역시 남구 한국아델리움"]) {
    const result = createRegionAliasSourceUnavailableResolution(
      query,
      "BUSAN_ALL",
    );
    assert.equal(result.state, "NO_REGION_RESOLUTION");
    assert.equal(result.reasonCode, "CANONICAL_REGION_SOURCE_UNAVAILABLE");
    assert.equal(result.selectedUniverse, "BUSAN_ALL");
    assert.equal(result.effectiveRegionScope, null);
    assert.equal(result.rankedSearchAllowed, false);
    assert.equal(result.discoverySearchAllowed, false);
    assert.equal(result.globalFallbackAllowed, false);
    assert.equal(result.canonicalRegionCode, null);
    assert.equal(result.compatibilityState, "NOT_APPLICABLE");
    assert.deepEqual(result.candidateChoices, []);
  }
});
