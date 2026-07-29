import assert from "node:assert/strict";
import test from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  KOREA_RANK_AUTHORITY_SELECT,
  KOREA_RANK_AUTHORITY_VIEW,
  RANKED_SEARCH_REGION_CANDIDATE_CAP,
  buildBoundedKoreaRankAuthoritySeedPlan,
  fetchBoundedKoreaRankAuthorityRows,
  filterRankedSearchCandidatesByRegionScope,
  mergeKoreaRankedAuthorityCandidates,
  rankedSearchSggMatchesScope,
  shouldCollectScopedKoreaRankAuthoritySeeds,
  shouldHydrateScopedKoreaRankedCandidates,
} from "../src/lib/koaptix/rankedSearchRegionScope.server";
import type {
  EffectiveRegionScope,
  RegionResolutionState,
} from "../src/lib/koaptix/regionAliasV1.types";
import type { RankingItem } from "../src/lib/koaptix/types";

type QueryResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

type Call = {
  table: string;
  operation: string;
  args: unknown[];
};

function createClient(
  results: Record<string, QueryResult | Error>,
) {
  const calls: Call[] = [];

  class Builder implements PromiseLike<QueryResult> {
    constructor(private readonly table: string) {}

    select(columns: string) {
      calls.push({ table: this.table, operation: "select", args: [columns] });
      return this;
    }

    eq(column: string, value: unknown) {
      calls.push({ table: this.table, operation: "eq", args: [column, value] });
      return this;
    }

    in(column: string, values: readonly unknown[]) {
      calls.push({
        table: this.table,
        operation: "in",
        args: [column, [...values]],
      });
      return this;
    }

    order(column: string, options: unknown) {
      calls.push({
        table: this.table,
        operation: "order",
        args: [column, options],
      });
      return this;
    }

    limit(value: number) {
      calls.push({ table: this.table, operation: "limit", args: [value] });
      return this;
    }

    then<TResult1 = QueryResult, TResult2 = never>(
      onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
      const result = results[this.table] ?? { data: [], error: null };
      const promise =
        result instanceof Error
          ? Promise.reject(result)
          : Promise.resolve(result);
      return promise.then(onfulfilled, onrejected);
    }
  }

  const client = {
    from(table: string) {
      calls.push({ table, operation: "from", args: [] });
      return new Builder(table);
    },
  } as unknown as Pick<SupabaseClient, "from">;

  return { client, calls };
}

function rankedItem(complexId: string, rank = Number(complexId)) : RankingItem {
  return {
    complexId,
    name: `complex-${complexId}`,
    rank,
    marketCapKrw: 1,
    marketCapTrillionKrw: null,
    sigunguName: "",
    legalDongName: "",
    locationLabel: "",
    rankDelta7d: null,
    recoveryRate52w: null,
    universeCode: "KOREA_ALL",
  };
}

const SONGPA_SCOPE: EffectiveRegionScope = {
  regionCode: "11710",
  regionLevel: "sigungu",
};

function activation(
  overrides: Partial<Parameters<typeof shouldHydrateScopedKoreaRankedCandidates>[0]> = {},
) {
  return shouldHydrateScopedKoreaRankedCandidates({
    requestedUniverseCode: "KOREA_ALL",
    renderedUniverseCode: "KOREA_ALL",
    regionState: "SAFE_VARIANT_UNIQUE",
    rankedSearchAllowed: true,
    effectiveRegionScope: SONGPA_SCOPE,
    residualQuery: "헬리오시티",
    candidateCount: 1,
    ...overrides,
  });
}

function mapResult(
  rows: unknown[],
  aptRows: unknown[] = [],
  regionRows: unknown[] = [],
) {
  return {
    koaptix_complex_region_map: { data: rows, error: null },
    apt_complex: { data: aptRows, error: null },
    region_dim: { data: regionRows, error: null },
  };
}

test("activation accepts only qualified KOREA_ALL ranked candidates", () => {
  assert.equal(activation(), true);
});

test("seed collection can activate before a KOREA ranked candidate is recovered", () => {
  assert.equal(
    shouldCollectScopedKoreaRankAuthoritySeeds({
      requestedUniverseCode: "KOREA_ALL",
      renderedUniverseCode: "KOREA_ALL",
      regionState: "SAFE_VARIANT_UNIQUE",
      rankedSearchAllowed: true,
      effectiveRegionScope: SONGPA_SCOPE,
      residualQuery: "동대문더퍼스트데시앙",
    }),
    true,
  );
});

test("seed collection rejects unscoped, region-only, and conflicting requests", () => {
  const base = {
    requestedUniverseCode: "KOREA_ALL",
    renderedUniverseCode: "KOREA_ALL",
    regionState: "SAFE_VARIANT_UNIQUE" as RegionResolutionState,
    rankedSearchAllowed: true,
    effectiveRegionScope: SONGPA_SCOPE,
    residualQuery: "헬리오시티",
  };
  assert.equal(
    shouldCollectScopedKoreaRankAuthoritySeeds({
      ...base,
      effectiveRegionScope: null,
    }),
    false,
  );
  assert.equal(
    shouldCollectScopedKoreaRankAuthoritySeeds({
      ...base,
      residualQuery: " ",
    }),
    false,
  );
  assert.equal(
    shouldCollectScopedKoreaRankAuthoritySeeds({
      ...base,
      regionState: "UNIVERSE_CONFLICT",
    }),
    false,
  );
});

test("activation rejects a non-KOREA requested universe", () => {
  assert.equal(activation({ requestedUniverseCode: "SEOUL_ALL" }), false);
});

test("activation rejects a non-KOREA rendered universe", () => {
  assert.equal(activation({ renderedUniverseCode: "SGG_11710" }), false);
});

test("activation rejects ambiguous region resolution", () => {
  assert.equal(activation({ regionState: "AMBIGUOUS" }), false);
});

test("activation rejects universe conflict", () => {
  assert.equal(activation({ regionState: "UNIVERSE_CONFLICT" }), false);
});

test("activation rejects ranked-search denial", () => {
  assert.equal(activation({ rankedSearchAllowed: false }), false);
});

test("activation rejects missing scope", () => {
  assert.equal(activation({ effectiveRegionScope: null }), false);
});

test("activation keeps region-only KOREA_ALL empty", () => {
  assert.equal(activation({ residualQuery: " \t " }), false);
});

test("activation skips hydration when no ranked candidate exists", () => {
  assert.equal(activation({ candidateCount: 0 }), false);
});

test("scope matcher uses exact SGG equality", () => {
  assert.equal(rankedSearchSggMatchesScope("11710", SONGPA_SCOPE), true);
  assert.equal(rankedSearchSggMatchesScope("11711", SONGPA_SCOPE), false);
});

test("scope matcher uses an exact two-digit SIDO prefix", () => {
  const seoulScope: EffectiveRegionScope = {
    regionCode: "11",
    regionLevel: "sido",
  };
  assert.equal(rankedSearchSggMatchesScope("11710", seoulScope), true);
  assert.equal(rankedSearchSggMatchesScope("26110", seoulScope), false);
});

test("scope matcher rejects malformed and unsupported scope evidence", () => {
  assert.equal(rankedSearchSggMatchesScope("1171", SONGPA_SCOPE), false);
  assert.equal(
    rankedSearchSggMatchesScope("11710", {
      regionCode: "82",
      regionLevel: "country",
    }),
    false,
  );
});

test("shared seed plan records regional companion provenance without carrying its rank", () => {
  const existing = rankedItem("5084", 1);
  const regionalDuplicate = {
    ...rankedItem("5084", 2),
    universeCode: "SEOUL_ALL",
    universe_code: "SEOUL_ALL",
  };
  const regional647 = {
    ...rankedItem("647", 36),
    universeCode: "SGG_11230",
    universe_code: "SGG_11230",
  };
  const plan = buildBoundedKoreaRankAuthoritySeedPlan(
    [existing],
    [regionalDuplicate, regional647],
  );

  assert.equal(plan.failure, null);
  assert.deepEqual(plan.allCandidateIds, ["5084", "647"]);
  assert.deepEqual(plan.authorityLookupIds, ["647"]);
  assert.deepEqual(plan.authorityLookupSeeds, [
    { complexId: "647", source: "REGIONAL_NAME_COMPANION" },
  ]);
  assert.deepEqual(plan.stats, {
    existingKoreaCandidateCount: 1,
    regionalCompanionCandidateCount: 1,
    sharedUniqueCandidateCount: 2,
    authorityLookupIdCount: 1,
  });
});

test("shared seed plan fails closed when KOREA and companion IDs exceed 80", () => {
  const existing = Array.from(
    { length: RANKED_SEARCH_REGION_CANDIDATE_CAP },
    (_, index) => rankedItem(String(index + 1)),
  );
  const plan = buildBoundedKoreaRankAuthoritySeedPlan(
    existing,
    [rankedItem("999")],
  );

  assert.equal(plan.failure, "CANDIDATE_LIMIT_EXCEEDED");
  assert.equal(plan.stats.sharedUniqueCandidateCount, 81);
  assert.deepEqual(plan.allCandidateIds, []);
  assert.deepEqual(plan.authorityLookupIds, []);
  assert.deepEqual(plan.authorityLookupSeeds, []);
});

test("bounded exact-ID lookup returns only genuine KOREA authority metadata", async () => {
  const { client, calls } = createClient({
    [KOREA_RANK_AUTHORITY_VIEW]: {
      data: [
        {
          complex_id: 647,
          apt_name_ko: "동대문더퍼스트데시앙",
          universe_code: "KOREA_ALL",
          rank_all: 2389,
          market_cap_krw: 123,
        },
      ],
      error: null,
    },
  });
  const result = await fetchBoundedKoreaRankAuthorityRows(client, ["647"]);

  assert.equal(result.failure, null);
  assert.equal(result.rows[0]?.universe_code, "KOREA_ALL");
  assert.equal(result.rows[0]?.rank_all, 2389);
  assert.deepEqual(result.stats, {
    requestedIdCount: 1,
    queryCount: 1,
    rowCount: 1,
  });
  assert.deepEqual(
    calls.map((call) => [call.operation, ...call.args]),
    [
      ["from"],
      ["select", KOREA_RANK_AUTHORITY_SELECT],
      ["eq", "universe_code", "KOREA_ALL"],
      ["in", "complex_id", ["647"]],
      ["order", "rank_all", { ascending: true }],
      ["limit", 2],
    ],
  );
});

test("regional companion without a KOREA authority row is not promoted", async () => {
  const { client } = createClient({
    [KOREA_RANK_AUTHORITY_VIEW]: { data: [], error: null },
  });
  const result = await fetchBoundedKoreaRankAuthorityRows(client, ["647"]);

  assert.equal(result.failure, null);
  assert.deepEqual(result.rows, []);
});

test("regional-universe metadata returned from the authority query fails closed", async () => {
  const { client } = createClient({
    [KOREA_RANK_AUTHORITY_VIEW]: {
      data: [
        {
          complex_id: 647,
          apt_name_ko: "동대문더퍼스트데시앙",
          universe_code: "SGG_11230",
          rank_all: 36,
        },
      ],
      error: null,
    },
  });
  const result = await fetchBoundedKoreaRankAuthorityRows(client, ["647"]);

  assert.equal(result.failure, "KOREA_RANK_AUTHORITY_MALFORMED");
  assert.deepEqual(result.rows, []);
});

test("authority lookup errors and malformed rows suppress recovered candidates", async () => {
  const { client: failedClient } = createClient({
    [KOREA_RANK_AUTHORITY_VIEW]: {
      data: null,
      error: { message: "private authority error" },
    },
  });
  const failed = await fetchBoundedKoreaRankAuthorityRows(
    failedClient,
    ["647"],
  );
  assert.equal(failed.failure, "KOREA_RANK_AUTHORITY_LOOKUP_FAILED");

  const { client: malformedClient } = createClient({
    [KOREA_RANK_AUTHORITY_VIEW]: {
      data: [
        {
          complex_id: 647,
          apt_name_ko: "",
          universe_code: "KOREA_ALL",
          rank_all: 2389,
        },
      ],
      error: null,
    },
  });
  const malformed = await fetchBoundedKoreaRankAuthorityRows(
    malformedClient,
    ["647"],
  );
  assert.equal(malformed.failure, "KOREA_RANK_AUTHORITY_MALFORMED");
});

test("authority lookup rejects over-cap IDs before any DB call", async () => {
  const { client, calls } = createClient({});
  const result = await fetchBoundedKoreaRankAuthorityRows(
    client,
    Array.from(
      { length: RANKED_SEARCH_REGION_CANDIDATE_CAP + 1 },
      (_, index) => String(index + 1),
    ),
  );

  assert.equal(result.failure, "CANDIDATE_LIMIT_EXCEEDED");
  assert.equal(calls.length, 0);
});

test("existing KOREA rows keep precedence and recovered rows use KOREA rank order", () => {
  const existing = rankedItem("5084", 1);
  const duplicate = rankedItem("5084", 999);
  const recovered647 = rankedItem("647", 2389);
  const recovered5061 = rankedItem("5061", 7);
  const regionalOnly = {
    ...rankedItem("1222", 3),
    universeCode: "SGG_11305",
    universe_code: "SGG_11305",
  };

  const merged = mergeKoreaRankedAuthorityCandidates(
    [existing],
    [recovered647, regionalOnly, duplicate, recovered5061],
  );
  assert.deepEqual(
    merged.map((item) => [item.complexId, item.rank, item.universeCode]),
    [
      ["5084", 1, "KOREA_ALL"],
      ["5061", 7, "KOREA_ALL"],
      ["647", 2389, "KOREA_ALL"],
    ],
  );
});

test("valid map sgg_cd restores an exact scoped ranked row", async () => {
  const { client } = createClient(
    mapResult([{ complex_id: 5084, sgg_cd: "11710", lawd_cd: null }]),
  );
  const result = await filterRankedSearchCandidatesByRegionScope(
    client,
    [rankedItem("5084")],
    SONGPA_SCOPE,
  );
  assert.deepEqual(result.items.map((item) => item.complexId), ["5084"]);
  assert.equal(result.failure, null);
});

test("ten-digit lawd_cd supplies its five-digit SGG prefix", async () => {
  const { client } = createClient(
    mapResult([{ complex_id: 5084, sgg_cd: null, lawd_cd: "1171010100" }]),
  );
  const result = await filterRankedSearchCandidatesByRegionScope(
    client,
    [rankedItem("5084")],
    SONGPA_SCOPE,
  );
  assert.deepEqual(result.items.map((item) => item.complexId), ["5084"]);
});

test("wrong-region ranked candidates remain excluded", async () => {
  const { client } = createClient(
    mapResult([{ complex_id: 5084, sgg_cd: "11230" }]),
  );
  const result = await filterRankedSearchCandidatesByRegionScope(
    client,
    [rankedItem("5084")],
    SONGPA_SCOPE,
  );
  assert.deepEqual(result.items, []);
});

test("canonical evidence restores only when no valid map code exists", async () => {
  const { client } = createClient(
    mapResult(
      [{ complex_id: 5084, sgg_cd: "bad", lawd_cd: null }],
      [{ complex_id: 5084, region_id: 91 }],
      [{ region_id: 91, region_code: "11710" }],
    ),
  );
  const result = await filterRankedSearchCandidatesByRegionScope(
    client,
    [rankedItem("5084")],
    SONGPA_SCOPE,
  );
  assert.deepEqual(result.items.map((item) => item.complexId), ["5084"]);
});

test("map authority wins over disagreeing canonical evidence", async () => {
  const { client } = createClient(
    mapResult(
      [{ complex_id: 5084, sgg_cd: "11710" }],
      [{ complex_id: 5084, region_id: 91 }],
      [{ region_id: 91, region_code: "11230" }],
    ),
  );
  const result = await filterRankedSearchCandidatesByRegionScope(
    client,
    [rankedItem("5084")],
    SONGPA_SCOPE,
  );
  assert.deepEqual(result.items.map((item) => item.complexId), ["5084"]);
  assert.equal(result.stats.mapCanonicalDisagreementCount, 1);
});

test("canonical disagreement cannot admit a row rejected by map authority", async () => {
  const { client } = createClient(
    mapResult(
      [{ complex_id: 5084, sgg_cd: "11230" }],
      [{ complex_id: 5084, region_id: 91 }],
      [{ region_id: 91, region_code: "11710" }],
    ),
  );
  const result = await filterRankedSearchCandidatesByRegionScope(
    client,
    [rankedItem("5084")],
    SONGPA_SCOPE,
  );
  assert.deepEqual(result.items, []);
  assert.equal(result.stats.mapCanonicalDisagreementCount, 1);
});

test("multiple distinct valid map codes exclude the candidate", async () => {
  const { client } = createClient(
    mapResult([
      { complex_id: 5084, sgg_cd: "11710" },
      { complex_id: 5084, sgg_cd: "11230" },
    ]),
  );
  const result = await filterRankedSearchCandidatesByRegionScope(
    client,
    [rankedItem("5084")],
    SONGPA_SCOPE,
  );
  assert.deepEqual(result.items, []);
});

test("duplicate equal map codes remain deterministic", async () => {
  const { client } = createClient(
    mapResult([
      { complex_id: 5084, sgg_cd: "11710" },
      { complex_id: 5084, sgg_cd: "11710" },
    ]),
  );
  const result = await filterRankedSearchCandidatesByRegionScope(
    client,
    [rankedItem("5084")],
    SONGPA_SCOPE,
  );
  assert.deepEqual(result.items.map((item) => item.complexId), ["5084"]);
});

test("missing map and canonical evidence excludes the candidate", async () => {
  const { client } = createClient(mapResult([], []));
  const result = await filterRankedSearchCandidatesByRegionScope(
    client,
    [rankedItem("5084")],
    SONGPA_SCOPE,
  );
  assert.deepEqual(result.items, []);
});

test("malformed canonical region evidence is never admitted", async () => {
  const { client } = createClient(
    mapResult(
      [],
      [{ complex_id: 5084, region_id: 91 }],
      [{ region_id: 91, region_code: "1171x" }],
    ),
  );
  const result = await filterRankedSearchCandidatesByRegionScope(
    client,
    [rankedItem("5084")],
    SONGPA_SCOPE,
  );
  assert.deepEqual(result.items, []);
});

test("candidate order and first-ranked duplicate precedence are preserved", async () => {
  const first = rankedItem("5084", 10);
  const duplicate = rankedItem("5084", 999);
  const second = rankedItem("5061", 11);
  const { client } = createClient(
    mapResult([
      { complex_id: 5061, sgg_cd: "11710" },
      { complex_id: 5084, sgg_cd: "11710" },
    ]),
  );
  const result = await filterRankedSearchCandidatesByRegionScope(
    client,
    [first, duplicate, second],
    SONGPA_SCOPE,
  );
  assert.deepEqual(result.items.map((item) => [item.complexId, item.rank]), [
    ["5084", 10],
    ["5061", 11],
  ]);
});

test("KOREA ranked restoration does not require an SGG rank field", async () => {
  const candidate = rankedItem("5084");
  assert.equal("sggRank" in candidate, false);
  const { client } = createClient(
    mapResult([{ complex_id: 5084, sgg_cd: "11710" }]),
  );
  const result = await filterRankedSearchCandidatesByRegionScope(
    client,
    [candidate],
    SONGPA_SCOPE,
  );
  assert.deepEqual(result.items, [candidate]);
});

test("more than 80 unique candidates fail closed before any DB read", async () => {
  const { client, calls } = createClient({});
  const candidates = Array.from(
    { length: RANKED_SEARCH_REGION_CANDIDATE_CAP + 1 },
    (_, index) => rankedItem(String(index + 1)),
  );
  const result = await filterRankedSearchCandidatesByRegionScope(
    client,
    candidates,
    SONGPA_SCOPE,
  );
  assert.equal(result.failure, "CANDIDATE_LIMIT_EXCEEDED");
  assert.deepEqual(result.items, []);
  assert.equal(calls.length, 0);
});

test("map read failure suppresses the full scoped restoration", async () => {
  const { client } = createClient({
    ...mapResult([]),
    koaptix_complex_region_map: {
      data: null,
      error: { message: "private map failure" },
    },
  });
  const result = await filterRankedSearchCandidatesByRegionScope(
    client,
    [rankedItem("5084")],
    SONGPA_SCOPE,
  );
  assert.equal(result.failure, "MAP_LOOKUP_FAILED");
  assert.deepEqual(result.items, []);
});

test("apt read failure suppresses the full scoped restoration", async () => {
  const { client } = createClient({
    ...mapResult([{ complex_id: 5084, sgg_cd: "11710" }]),
    apt_complex: {
      data: null,
      error: { message: "private apt failure" },
    },
  });
  const result = await filterRankedSearchCandidatesByRegionScope(
    client,
    [rankedItem("5084")],
    SONGPA_SCOPE,
  );
  assert.equal(result.failure, "APT_COMPLEX_LOOKUP_FAILED");
  assert.deepEqual(result.items, []);
});

test("region dictionary failure suppresses the full scoped restoration", async () => {
  const { client } = createClient({
    ...mapResult([], [{ complex_id: 5084, region_id: 91 }]),
    region_dim: {
      data: null,
      error: { message: "private region failure" },
    },
  });
  const result = await filterRankedSearchCandidatesByRegionScope(
    client,
    [rankedItem("5084")],
    SONGPA_SCOPE,
  );
  assert.equal(result.failure, "REGION_DIM_LOOKUP_FAILED");
  assert.deepEqual(result.items, []);
});

test("thrown transport failure is sanitized and fails closed", async () => {
  const { client } = createClient({
    koaptix_complex_region_map: new Error("private transport details"),
    apt_complex: { data: [], error: null },
  });
  const result = await filterRankedSearchCandidatesByRegionScope(
    client,
    [rankedItem("5084")],
    SONGPA_SCOPE,
  );
  assert.equal(result.failure, "REGION_EVIDENCE_LOOKUP_FAILED");
  assert.deepEqual(result.items, []);
});

test("query shape is bounded to two batch reads plus one region dictionary read", async () => {
  const { client, calls } = createClient(
    mapResult(
      [],
      [{ complex_id: 5084, region_id: 91 }],
      [{ region_id: 91, region_code: "11710" }],
    ),
  );
  const result = await filterRankedSearchCandidatesByRegionScope(
    client,
    [rankedItem("5084")],
    SONGPA_SCOPE,
  );
  assert.equal(result.stats.queryCount, 3);
  assert.deepEqual(
    calls
      .filter((call) => call.operation === "select")
      .map((call) => [call.table, call.args[0]]),
    [
      [
        "koaptix_complex_region_map",
        "complex_id, sgg_cd, lawd_cd",
      ],
      ["apt_complex", "complex_id, region_id"],
      ["region_dim", "region_id, region_code"],
    ],
  );
  assert.equal(
    calls.some((call) =>
      ["insert", "update", "delete", "upsert", "rpc"].includes(call.operation),
    ),
    false,
  );
});

test("map evidence sentinel cap fails closed instead of hiding ambiguity", async () => {
  const rows = Array.from({ length: 5 }, (_, index) => ({
    complex_id: 5084,
    sgg_cd: index === 4 ? "11230" : "11710",
  }));
  const { client } = createClient(mapResult(rows));
  const result = await filterRankedSearchCandidatesByRegionScope(
    client,
    [rankedItem("5084")],
    SONGPA_SCOPE,
  );
  assert.equal(result.failure, "MAP_EVIDENCE_LIMIT_EXCEEDED");
  assert.deepEqual(result.items, []);
});

test("unsupported country scope performs no DB read", async () => {
  const { client, calls } = createClient({});
  const result = await filterRankedSearchCandidatesByRegionScope(
    client,
    [rankedItem("5084")],
    { regionCode: "82", regionLevel: "country" },
  );
  assert.equal(result.failure, "UNSUPPORTED_REGION_SCOPE");
  assert.equal(calls.length, 0);
});

test("the helper filters before the caller applies its unchanged result cap", async () => {
  const candidates = [
    rankedItem("1", 1),
    rankedItem("2", 2),
    rankedItem("3", 3),
    rankedItem("4", 4),
  ];
  const { client } = createClient(
    mapResult([
      { complex_id: 1, sgg_cd: "11230" },
      { complex_id: 2, sgg_cd: "11710" },
      { complex_id: 3, sgg_cd: "11230" },
      { complex_id: 4, sgg_cd: "11710" },
    ]),
  );
  const result = await filterRankedSearchCandidatesByRegionScope(
    client,
    candidates,
    SONGPA_SCOPE,
  );
  assert.deepEqual(result.items.map((item) => item.complexId), ["2", "4"]);
  assert.deepEqual(result.items.slice(0, 1).map((item) => item.complexId), ["2"]);
});

test("activation state allowlist remains explicit and fail closed", () => {
  const accepted: RegionResolutionState[] = [
    "EXACT_CANONICAL",
    "EXACT_QUALIFIED",
    "SAFE_VARIANT_UNIQUE",
    "CONTEXT_UNIQUE",
  ];
  for (const regionState of accepted) {
    assert.equal(activation({ regionState }), true);
  }

  const rejected: RegionResolutionState[] = [
    "AMBIGUOUS",
    "UNIVERSE_CONFLICT",
    "NO_REGION_RESOLUTION",
  ];
  for (const regionState of rejected) {
    assert.equal(activation({ regionState }), false);
  }
});
