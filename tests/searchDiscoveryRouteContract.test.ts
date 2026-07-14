import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DISCOVERY_REGION_FALLBACK_CANDIDATE_CAP,
  prioritizeExistingFullExactDiscoveryTerm,
} from "../src/lib/koaptix/discoverySearch";
import { hydrateDiscoveryRegionFallbacks } from "../src/lib/koaptix/discoverySearch.server";

type QueryResult = { data: unknown[] | null; error: { message: string } | null };
type Call = { table: string; operation: string; args: unknown[] };

function createClient(results: Record<string, QueryResult>) {
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
      calls.push({ table: this.table, operation: "in", args: [column, [...values]] });
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
      return Promise.resolve(
        results[this.table] ?? { data: [], error: null },
      ).then(onfulfilled, onrejected);
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

test("zero missing IDs make zero fallback DB calls", async () => {
  const { client, calls } = createClient({});
  const result = await hydrateDiscoveryRegionFallbacks(client, []);
  assert.deepEqual(result, { evidence: [], failure: null });
  assert.equal(calls.length, 0);
});

test("fallback reads only bounded required columns and produces canonical evidence", async () => {
  const { client, calls } = createClient({
    apt_complex: {
      data: [{ complex_id: 10511, region_id: 10 }],
      error: null,
    },
    region_dim: {
      data: [
        {
          region_id: 10,
          region_code: "11140",
          region_name_ko: "중구",
          full_name_ko: "서울특별시 중구",
        },
      ],
      error: null,
    },
  });

  const result = await hydrateDiscoveryRegionFallbacks(client, ["10511"]);
  assert.equal(result.failure, null);
  assert.equal(result.evidence[0]?.complexId, "10511");
  assert.equal(result.evidence[0]?.source, "APT_COMPLEX_REGION_FALLBACK");
  assert.deepEqual(
    calls.filter((call) => call.operation === "select").map((call) => call.args[0]),
    [
      "complex_id, region_id",
      "region_id, region_code, region_name_ko, full_name_ko",
    ],
  );
  assert.deepEqual(
    calls.filter((call) => call.operation === "limit").map((call) => call.args[0]),
    [1, 1],
  );
  assert.equal(calls.some((call) => ["insert", "update", "delete", "upsert", "rpc"].includes(call.operation)), false);
});

test("more than 48 IDs are capped before the apt lookup", async () => {
  const { client, calls } = createClient({ apt_complex: { data: [], error: null } });
  await hydrateDiscoveryRegionFallbacks(
    client,
    Array.from({ length: 60 }, (_, index) => String(index + 1)),
  );
  const aptIn = calls.find(
    (call) => call.table === "apt_complex" && call.operation === "in",
  );
  assert.equal((aptIn?.args[1] as unknown[]).length, 48);
  assert.equal(calls.some((call) => call.table === "region_dim"), false);
});

test("null region IDs make no region_dim call", async () => {
  const { client, calls } = createClient({
    apt_complex: { data: [{ complex_id: 1, region_id: null }], error: null },
  });
  const result = await hydrateDiscoveryRegionFallbacks(client, ["1"]);
  assert.deepEqual(result, { evidence: [], failure: null });
  assert.equal(calls.some((call) => call.table === "region_dim"), false);
});

test("missing or malformed canonical region rows fail closed", async () => {
  const { client } = createClient({
    apt_complex: { data: [{ complex_id: 1, region_id: 10 }], error: null },
    region_dim: {
      data: [{ region_id: 10, region_code: "bad", region_name_ko: "" }],
      error: null,
    },
  });
  const result = await hydrateDiscoveryRegionFallbacks(client, ["1"]);
  assert.deepEqual(result, { evidence: [], failure: null });
});

test("apt and region failures return sanitized additive failure states", async () => {
  const aptFailure = createClient({
    apt_complex: { data: null, error: { message: "secret apt error" } },
  });
  assert.deepEqual(await hydrateDiscoveryRegionFallbacks(aptFailure.client, ["1"]), {
    evidence: [],
    failure: "APT_COMPLEX_REGION_LOOKUP_FAILED",
  });

  const regionFailure = createClient({
    apt_complex: { data: [{ complex_id: 1, region_id: 10 }], error: null },
    region_dim: { data: null, error: { message: "secret region error" } },
  });
  assert.deepEqual(await hydrateDiscoveryRegionFallbacks(regionFailure.client, ["1"]), {
    evidence: [],
    failure: "REGION_DIM_LOOKUP_FAILED",
  });
});

test("full exact discovery term moves first while the remainder stays stable", () => {
  const terms = ["스파크", "압해팰리스파크", "신안 압해팰리스파크"];

  assert.deepEqual(
    prioritizeExistingFullExactDiscoveryTerm(terms, "압해팰리스파크"),
    ["압해팰리스파크", "스파크", "신안 압해팰리스파크"],
  );
});

test("exact-term prioritization returns a new array without insertion or mutation", () => {
  const alreadyFirst = ["압해팰리스파크", "스파크"];
  const alreadyFirstSnapshot = [...alreadyFirst];
  const alreadyFirstResult = prioritizeExistingFullExactDiscoveryTerm(
    alreadyFirst,
    "압해팰리스파크",
  );
  assert.deepEqual(alreadyFirstResult, alreadyFirstSnapshot);
  assert.notStrictEqual(alreadyFirstResult, alreadyFirst);
  assert.deepEqual(alreadyFirst, alreadyFirstSnapshot);

  const absent = ["스파크", "팰리스"];
  const absentSnapshot = [...absent];
  const absentResult = prioritizeExistingFullExactDiscoveryTerm(
    absent,
    "압해팰리스파크",
  );
  assert.deepEqual(absentResult, absentSnapshot);
  assert.notStrictEqual(absentResult, absent);
  assert.deepEqual(absent, absentSnapshot);
});

test("exact-term prioritization moves only the first exact occurrence", () => {
  const terms = ["스파크", "압해팰리스파크", "팰리스", "압해팰리스파크"];
  const result = prioritizeExistingFullExactDiscoveryTerm(
    terms,
    "압해팰리스파크",
  );

  assert.deepEqual(result, [
    "압해팰리스파크",
    "스파크",
    "팰리스",
    "압해팰리스파크",
  ]);
  assert.equal(
    result.filter((term) => term === "압해팰리스파크").length,
    2,
  );
  assert.deepEqual(terms, [
    "스파크",
    "압해팰리스파크",
    "팰리스",
    "압해팰리스파크",
  ]);
});

test("278060 exact term is first without changing the generated term set", () => {
  const generatedTerms = ["스파크", "압해팰리스파크"];
  const prioritizedTerms = prioritizeExistingFullExactDiscoveryTerm(
    generatedTerms,
    "압해팰리스파크",
  );

  assert.deepEqual(prioritizedTerms, ["압해팰리스파크", "스파크"]);
  assert.equal(prioritizedTerms.includes("스파크"), true);
  assert.deepEqual(
    [...prioritizedTerms].sort(),
    [...generatedTerms].sort(),
  );
});

test("exact target survives the unchanged 48-candidate cap under broad saturation", () => {
  const terms = prioritizeExistingFullExactDiscoveryTerm(
    ["스파크", "압해팰리스파크"],
    "압해팰리스파크",
  );
  const candidatesByTerm = new Map<string, string[]>([
    ["압해팰리스파크", ["278060"]],
    [
      "스파크",
      Array.from({ length: 60 }, (_, index) => String(400000 + index)),
    ],
  ]);
  const candidateIds = new Set<string>();

  for (const term of terms) {
    for (const complexId of candidatesByTerm.get(term) ?? []) {
      candidateIds.add(complexId);
    }
  }

  const capped = Array.from(candidateIds).slice(
    0,
    DISCOVERY_REGION_FALLBACK_CANDIDATE_CAP,
  );
  assert.equal(DISCOVERY_REGION_FALLBACK_CANDIDATE_CAP, 48);
  assert.equal(capped.length, 48);
  assert.equal(capped[0], "278060");
  assert.equal(capped.includes("278060"), true);
});

test("search route wires the existing generated terms through the ordering helper once", () => {
  const routeSource = readFileSync(
    resolve(process.cwd(), "src/app/api/search/route.ts"),
    "utf8",
  );
  const candidateStart = routeSource.indexOf(
    "async function fetchDiscoveryCandidateIds",
  );
  const candidateEnd = routeSource.indexOf(
    "function mergeDiscoverySeeds",
    candidateStart,
  );
  const candidateSource = routeSource.slice(candidateStart, candidateEnd);

  assert.equal(candidateStart >= 0, true);
  assert.equal(candidateEnd > candidateStart, true);
  assert.equal(
    (candidateSource.match(/getDiscoveryNameTerms\(q\)/g) ?? []).length,
    1,
  );
  assert.equal(
    (
      candidateSource.match(
        /prioritizeExistingFullExactDiscoveryTerm\(/g,
      ) ?? []
    ).length,
    1,
  );
  assert.match(
    candidateSource,
    /const nameTerms = prioritizeExistingFullExactDiscoveryTerm\(\s*getDiscoveryNameTerms\(q\),\s*q,\s*\);/,
  );
  assert.equal(
    candidateSource.indexOf("prioritizeExistingFullExactDiscoveryTerm(") <
      candidateSource.indexOf(
        "for (const term of nameSourceLimit > 0 ? nameTerms : [])",
      ),
    true,
  );
});

test("search route keeps probe families, limits, sets, and final cap unchanged", () => {
  const routeSource = readFileSync(
    resolve(process.cwd(), "src/app/api/search/route.ts"),
    "utf8",
  );
  const candidateStart = routeSource.indexOf(
    "async function fetchDiscoveryCandidateIds",
  );
  const candidateEnd = routeSource.indexOf(
    "function mergeDiscoverySeeds",
    candidateStart,
  );
  const candidateSource = routeSource.slice(candidateStart, candidateEnd);

  assert.deepEqual(
    Array.from(candidateSource.matchAll(/\.from\("([^"]+)"\)/g)).map(
      (match) => match[1],
    ),
    ["apt_complex", "complex_name_alias", "koaptix_complex_region_map"],
  );
  assert.equal(
    (candidateSource.match(/new Set<string>\(\)/g) ?? []).length,
    3,
  );
  assert.equal(
    (candidateSource.match(/\.limit\(nameSourceLimit\)/g) ?? []).length,
    2,
  );
  assert.equal(
    (candidateSource.match(/\.limit\(regionSourceLimit\)/g) ?? []).length,
    1,
  );
  assert.equal(
    candidateSource.includes('.ilike("apt_name_ko", `%${term}%`)'),
    true,
  );
  assert.equal(
    candidateSource.includes('.ilike("alias_name", `%${term}%`)'),
    true,
  );
  assert.equal(
    candidateSource.includes(
      '.or(`umd_nm.ilike.%${term}%,sigungu_name.ilike.%${term}%`)',
    ),
    true,
  );
  assert.equal(
    candidateSource.includes(
      "Array.from(candidateIds).slice(0, getDiscoveryHydrationLimit(classification))",
    ),
    true,
  );
});
