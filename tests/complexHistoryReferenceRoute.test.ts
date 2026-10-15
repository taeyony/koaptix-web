import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as mappers from "../src/lib/koaptix/mappers";
import type { DbComplexChartHistoryRow, HistoryChartPoint } from "../src/lib/koaptix/types";
import { KOAPTIX_OFFICIAL_BASE_DATE } from "../src/types/koaptix";

const URL_BASE = "https://koaptix.example.test/api/complex-history";
const REFERENCE_QUERY = "complexId=486&mode=monthly&range=since-base&source=reference";
const ANCHOR = { snapshotDate: "2026-08-31", marketCapKrw: 200,
  generationId: "733d03e6-e029-449b-a748-26c4b032df05", publicationVersion: 2 };

function compile(path: string) {
  return ts.transpileModule(readFileSync(resolve(path), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

function referenceRows(): DbComplexChartHistoryRow[] {
  return [
    { snapshot_date: "2024-01-01", complex_id: 486, market_cap_krw: 100, rank_all: null, sourceKey: "reference-fixture" },
    { snapshot_date: "2024-01-31", complex_id: 486, market_cap_krw: null, rank_all: null, sourceKey: "reference-fixture" },
    { snapshot_date: "2024-02-29", complex_id: 486, market_cap_krw: 130, rank_all: null, sourceKey: "reference-fixture" },
    { snapshot_date: "2026-08-31", complex_id: 486, market_cap_krw: 200, rank_all: null, sourceKey: "reference-fixture" },
  ];
}

function publishedRows(id: string): DbComplexChartHistoryRow[] {
  return [
    { snapshot_date: "2026-04-30", complex_id: Number(id), market_cap_krw: 900, rank_all: 2 },
    { snapshot_date: "2026-08-31", complex_id: Number(id), market_cap_krw: 200, rank_all: 1 },
  ];
}

function loadRoute(options: { unavailable?: boolean; anchorError?: boolean; referenceError?: boolean } = {}) {
  const anchorCalls: string[][] = [];
  const referenceCalls: string[][] = [];
  const publicCalls: Array<{ ids: string[]; options: { days: number; sinceBase?: boolean } }> = [];
  const exports: { GET?: (request: Request) => Promise<Response> } = {};
  runInNewContext(compile("src/app/api/complex-history/route.ts"), {
    exports, URL, Response,
    require(name: string) {
      if (name.endsWith("/mappers")) return mappers;
      if (name.endsWith("/types/koaptix")) return { KOAPTIX_OFFICIAL_BASE_DATE };
      if (name.endsWith("/complexHistoryRecovery")) return {
        isLocalHistoryReview: () => false,
        readLocalHistoryRecovery: () => { throw new Error("Public reference must not read a local review file"); },
      };
      if (name.endsWith("/complexHistoryReference")) return {
        selectComplexHistoryReference(ids: string[], anchors: Record<string, typeof ANCHOR>) {
          referenceCalls.push(Array.from(ids));
          if (options.referenceError) throw new Error("Reference artifact contract failed");
          assert.deepEqual(anchors, Object.fromEntries(ids.map(id => [id, ANCHOR])));
          const metadataById = Object.fromEntries(ids.map(id => [id, { available: !options.unavailable && id === "486" }]));
          return {
            rowsById: Object.fromEntries(ids.map(id => [id, metadataById[id].available ? referenceRows() : []])),
            metadataById,
            source: { sourceObservedAt: "2026-10-15T06:27:23.284883+00:00",
              sourceNote: "Available-source reference reconstruction, not historical publication.", expectedPointCount: 4 },
          };
        },
      };
      if (name.endsWith("/queries")) return {
        COMPLEX_CHART_HISTORY_ROW_LIMIT: 2500,
        async getComplexHistoryPublicAnchors(ids: string[]) {
          anchorCalls.push(Array.from(ids));
          if (options.anchorError) throw new Error("Could not verify the current public chart reference");
          return Object.fromEntries(ids.map(id => [id, ANCHOR]));
        },
        async getComplexChartHistories(ids: string[], queryOptions: { days: number; sinceBase?: boolean }) {
          publicCalls.push({ ids: Array.from(ids), options: { ...queryOptions } });
          return Object.fromEntries(ids.map(id => [id, publishedRows(id)]));
        },
      };
      throw new Error(`Unexpected reference route dependency ${name}`);
    },
  });
  assert.ok(exports.GET);
  return { GET: exports.GET, anchorCalls, referenceCalls, publicCalls };
}

test("an available reference uses one distinct basis, keeps null gaps and never queries published history", async () => {
  const { GET, anchorCalls, referenceCalls, publicCalls } = loadRoute();
  const response = await GET(new Request(`${URL_BASE}?${REFERENCE_QUERY}`));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(anchorCalls, [["486"]]);
  assert.deepEqual(referenceCalls, [["486"]]);
  assert.equal(publicCalls.length, 0);
  const series = payload.data.series[0];
  assert.equal(series.range.basis, "reference");
  assert.equal(series.range.availableFrom, "2024-01-01");
  assert.equal(series.range.availableTo, "2026-08-31");
  assert.equal(series.range.expectedPointCount, 4);
  assert.equal(series.range.excludedPointCount, 1);
  assert.equal(series.range.localOnly, undefined);
  assert.deepEqual(series.points.map((p: HistoryChartPoint) => [p.snapshotDate, p.value, p.breakBefore ?? false]), [
    ["2024-01-01", 100, false], ["2024-02-29", 130, true], ["2026-08-31", 200, false],
  ]);
  assert.ok(series.points.every((p: HistoryChartPoint) => p.value !== 900));
});

test("mixed requests select a basis per complex and rejected references visibly fall back to published history", async () => {
  const { GET, publicCalls } = loadRoute();
  const response = await GET(new Request(`${URL_BASE}?${REFERENCE_QUERY.replace("486", "486,999")}`));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(publicCalls, [{ ids: ["999"], options: { days: 180, sinceBase: true } }]);
  assert.equal(payload.data.series[0].range.basis, "reference");
  assert.equal(payload.data.series[1].range.basis, "published");
  assert.equal(payload.data.series[1].range.referenceUnavailable, true);
  assert.equal(payload.data.series[1].range.sourceObservedAt, undefined);
  assert.deepEqual(payload.data.series[1].points,
    mappers.mapComplexChartHistoryRows(publishedRows("999"), { mode: "monthly", maxPoints: 2500 }));
});

test("reference week/month/year choices only regroup the supplied observations", async () => {
  for (const mode of ["weekly", "monthly", "yearly"] as const) {
    const { GET, publicCalls } = loadRoute();
    const response = await GET(new Request(`${URL_BASE}?${REFERENCE_QUERY.replace("monthly", mode)}`));
    const { data } = await response.json();
    assert.equal(data.mode, mode);
    assert.equal(data.series[0].range.basis, "reference");
    assert.deepEqual(data.series[0].points,
      mappers.mapComplexChartHistoryRows(referenceRows(), { mode, maxPoints: 2500 }));
    assert.equal(publicCalls.length, 0);
  }
});

test("a completely rejected reference does not silently return reconstructed or empty data", async () => {
  const { GET, publicCalls } = loadRoute({ unavailable: true });
  const response = await GET(new Request(`${URL_BASE}?${REFERENCE_QUERY}`));
  const { data } = await response.json();
  assert.equal(response.status, 200);
  assert.equal(publicCalls.length, 1);
  assert.equal(data.series[0].range.basis, "published");
  assert.equal(data.series[0].range.referenceUnavailable, true);
  assert.equal(data.series[0].points[0].value, 900);
});

test("ordinary API responses remain unchanged and reference parameters cannot opt ma7 or short ranges in", async () => {
  for (const mode of ["weekly", "monthly", "yearly", "ma7"] as const) {
    for (const range of ["days=180", "range=since-base"]) {
      const sinceBase = range === "range=since-base";
      for (const source of ["", "&source=unrecognized", ...(mode === "ma7" || !sinceBase ? ["&source=reference"] : [])]) {
        const { GET, anchorCalls, referenceCalls, publicCalls } = loadRoute();
        const response = await GET(new Request(`${URL_BASE}?complexId=486&mode=${mode}&${range}${source}`));
        const payload = await response.json();
        assert.equal(response.status, 200);
        assert.equal(anchorCalls.length, 0);
        assert.equal(referenceCalls.length, 0);
        assert.equal(publicCalls.length, 1);
        assert.deepEqual(payload, { data: { mode, series: [{ complexId: "486",
          points: mappers.mapComplexChartHistoryRows(publishedRows("486"), { mode, maxPoints: sinceBase ? 2500 : mode === "ma7" ? 60 : 26 }),
          ...(sinceBase ? { range: { requestedStartDate: KOAPTIX_OFFICIAL_BASE_DATE,
            availableFrom: "2026-04-30", availableTo: "2026-08-31" } } : {}),
        }] } });
      }
    }
  }
});

test("invalid or oversized reference ID requests fail before any source is read", async () => {
  for (const id of ["", "0", "-1", "4.86", "../486", "9007199254740992", Array.from({ length: 11 }, (_, i) => String(i + 1)).join(",")]) {
    const { GET, anchorCalls, referenceCalls, publicCalls } = loadRoute();
    const response = await GET(new Request(`${URL_BASE}?${REFERENCE_QUERY.replace("486", encodeURIComponent(id))}`));
    assert.equal(response.status, 400, id);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(anchorCalls.length, 0);
    assert.equal(referenceCalls.length, 0);
    assert.equal(publicCalls.length, 0);
  }
});

test("an anchor read failure or corrupt artifact fails closed without an unverified fallback", async () => {
  for (const options of [{ anchorError: true }, { referenceError: true }]) {
    const { GET, referenceCalls, publicCalls } = loadRoute(options);
    const response = await GET(new Request(`${URL_BASE}?${REFERENCE_QUERY}`));
    assert.equal(response.status, 500);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(publicCalls.length, 0);
    if (options.anchorError) assert.equal(referenceCalls.length, 0);
    assert.equal((await response.json()).data, undefined);
  }
});

type AnchorRow = { complex_id: number; snapshot_date: string; market_cap_krw: number | string | null;
  generation_id: string; publication_version: number };

function loadAnchorQuery(rows: AnchorRow[], error = false) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  class Builder {
    select(...args: unknown[]) { calls.push({ method: "select", args }); return this; }
    eq(...args: unknown[]) { calls.push({ method: "eq", args }); return this; }
    in(...args: unknown[]) { calls.push({ method: "in", args: JSON.parse(JSON.stringify(args)) }); return this; }
    limit(...args: unknown[]) { calls.push({ method: "limit", args }); return this; }
    then(resolveValue: (value: unknown) => unknown, rejectValue?: (reason: unknown) => unknown) {
      return Promise.resolve({ data: rows, error: error ? { message: "Internal provider detail must not escape" } : null })
        .then(resolveValue, rejectValue);
    }
  }
  const exports: { getComplexHistoryPublicAnchors?: (ids: string[]) => Promise<Record<string, typeof ANCHOR>> } = {};
  runInNewContext(compile("src/lib/koaptix/queries.ts"), {
    exports,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://example.test", NEXT_PUBLIC_SUPABASE_ANON_KEY: "offline-fixture" } },
    require(name: string) {
      if (name === "@supabase/supabase-js") return { createClient: () => ({ from(...args: unknown[]) {
        calls.push({ method: "from", args }); return new Builder();
      } }) };
      if (name.endsWith("/types/koaptix")) return { KOAPTIX_OFFICIAL_BASE_DATE };
      if (name === "./universes" || name === "./currentness") return {};
      throw new Error(`Unexpected anchor query dependency ${name}`);
    },
  });
  assert.ok(exports.getComplexHistoryPublicAnchors);
  return { getAnchors: exports.getComplexHistoryPublicAnchors, calls };
}

const ANCHOR_ROW: AnchorRow = { complex_id: 486, snapshot_date: ANCHOR.snapshotDate,
  market_cap_krw: ANCHOR.marketCapKrw, generation_id: ANCHOR.generationId, publication_version: ANCHOR.publicationVersion };

test("current anchor reads are bounded to requested IDs on the published national service surface", async () => {
  const { getAnchors, calls } = loadAnchorQuery([ANCHOR_ROW]);
  const result = await getAnchors(["486", "486"]);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { "486": ANCHOR });
  assert.deepEqual(calls, [
    { method: "from", args: ["v_koaptix_latest_board_read_model_published"] },
    { method: "select", args: ["complex_id, snapshot_date, market_cap_krw, generation_id, publication_version"] },
    { method: "eq", args: ["surface_code", "UNIVERSE_SERVICE"] },
    { method: "eq", args: ["universe_code", "KOREA_ALL"] },
    { method: "in", args: ["complex_id", ["486"]] },
    { method: "limit", args: [11] },
  ]);
});

test("invalid anchor requests, duplicate/outside rows and provider failures are rejected", async () => {
  for (const ids of [[], ["0"], ["x"], Array.from({ length: 11 }, (_, i) => String(i + 1))]) {
    const { getAnchors, calls } = loadAnchorQuery([]);
    await assert.rejects(getAnchors(ids), /1 to 10 valid complex IDs/);
    assert.equal(calls.length, 0);
  }
  await assert.rejects(loadAnchorQuery([ANCHOR_ROW, ANCHOR_ROW]).getAnchors(["486"]), /Ambiguous public chart reference/);
  await assert.rejects(loadAnchorQuery([{ ...ANCHOR_ROW, complex_id: 999 }]).getAnchors(["486"]), /Ambiguous public chart reference/);
  await assert.rejects(loadAnchorQuery([], true).getAnchors(["486"]), /Could not verify the current public chart reference/);
});
