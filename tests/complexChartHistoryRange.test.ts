import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import type { DbComplexChartHistoryRow } from "../src/lib/koaptix/types";
import { KOAPTIX_OFFICIAL_BASE_DATE } from "../src/types/koaptix";

function rows(count: number): DbComplexChartHistoryRow[] {
  return Array.from({ length: count }, (_, i) => ({
    snapshot_date: new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10),
    complex_id: 5084,
    market_cap_krw: 1_000_000 + i,
    rank_all: 1,
  }));
}

function loadQueries(source: DbComplexChartHistoryRow[], options: { cap?: number; missingCount?: boolean; emptyPageAt?: number; error?: boolean; anchor?: string } = {}) {
  const calls: Array<{ start?: string; end?: string; range?: number[]; limit?: number; count?: string }> = [];
  const anchor = options.anchor ?? source.at(-1)?.snapshot_date ?? "2026-08-31";
  class Builder {
    start?: string;
    end?: string;
    ids: Array<string | number> = [];
    page?: number[];
    maximum?: number;
    countMode?: string;
    select(_columns: string, config?: { count?: string }) { this.countMode = config?.count; return this; }
    order() { return this; }
    in(_column: string, values: Array<string | number>) { this.ids = values; return this; }
    gte(_column: string, date: string) { this.start = date; return this; }
    lte(_column: string, date: string) { this.end = date; return this; }
    range(start: number, end: number) { this.page = [start, end]; return this; }
    limit(limit: number) { this.maximum = limit; return this; }
    async maybeSingle() { return { data: { snapshot_date: anchor }, error: null }; }
    then(resolveResult: (value: unknown) => unknown, rejectResult?: (error: unknown) => unknown) {
      calls.push({ start: this.start, end: this.end, range: this.page, limit: this.maximum, count: this.countMode });
      const matching = source.filter((r) => this.ids.some((id) => String(id) === String(r.complex_id)) && r.snapshot_date >= this.start! && r.snapshot_date <= this.end!);
      const start = this.page?.[0] ?? 0;
      const end = this.page ? this.page[1] + 1 : this.maximum;
      const page = options.emptyPageAt === start ? [] : matching.slice(start, end).slice(0, options.cap ?? 1000);
      return Promise.resolve({ data: page, error: options.error ? { message: "offline read failure" } : null, count: this.countMode === "exact" && !options.missingCount ? matching.length : null }).then(resolveResult, rejectResult);
    }
  }
  const sourceText = readFileSync(resolve(process.cwd(), "src/lib/koaptix/queries.ts"), "utf8");
  const compiled = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: { getComplexChartHistories?: (ids: string[], options?: { days?: number; sinceBase?: boolean }) => Promise<Record<string, DbComplexChartHistoryRow[]>> } = {};
  runInNewContext(compiled, {
    exports,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://example.test", NEXT_PUBLIC_SUPABASE_ANON_KEY: "offline-fixture" } },
    require(name: string) {
      if (name === "@supabase/supabase-js") return { createClient: () => ({ from: () => new Builder() }) };
      if (name.endsWith("/types/koaptix")) return { KOAPTIX_OFFICIAL_BASE_DATE };
      if (name === "./universes" || name === "./currentness") return {};
      throw new Error(`Unexpected query dependency ${name}`);
    },
  });
  assert.ok(exports.getComplexChartHistories);
  return { getHistory: exports.getComplexChartHistories, calls };
}

test("since-base starts at the established 2024 date and reads beyond a 1000-row REST cap", async () => {
  const source = rows(1500);
  const { getHistory, calls } = loadQueries(source);
  const result = await getHistory(["5084"], { sinceBase: true });
  assert.equal(result["5084"].length, 1500);
  assert.equal(result["5084"][0].snapshot_date, "2024-01-01");
  assert.equal(result["5084"].at(-1)?.market_cap_krw, source.at(-1)?.market_cap_krw);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => call.start === "2024-01-01" && call.end === source.at(-1)?.snapshot_date));
});

test("a smaller server page cap cannot silently cut off newer observations", async () => {
  const source = rows(301);
  const { getHistory, calls } = loadQueries(source, { cap: 100 });
  assert.equal((await getHistory(["5084"], { sinceBase: true }))["5084"].length, 301);
  assert.deepEqual(calls.map((call) => call.range?.[0]), [0, 100, 200, 300]);
});

test("the complete 2500-row budget is accepted but an oversized result fails closed", async () => {
  assert.equal((await loadQueries(rows(2500)).getHistory(["5084"], { sinceBase: true }))["5084"].length, 2500);
  await assert.rejects(loadQueries(rows(2501)).getHistory(["5084"], { sinceBase: true }), /row budget/);
});

test("unknown totals, missing pages and database errors never become a partial success", async () => {
  await assert.rejects(loadQueries(rows(600), { missingCount: true }).getHistory(["5084"], { sinceBase: true }), /complete complex history/);
  await assert.rejects(loadQueries(rows(600), { emptyPageAt: 500 }).getHistory(["5084"], { sinceBase: true }), /Incomplete complex history page/);
  await assert.rejects(loadQueries(rows(1), { error: true }).getHistory(["5084"], { sinceBase: true }), /offline read failure/);
});

test("an empty source remains empty and no baseline observation is synthesized", async () => {
  const { getHistory } = loadQueries([]);
  assert.equal((await getHistory(["5084"], { sinceBase: true }))["5084"].length, 0);
});

test("legacy days requests retain the 180-day cap and do not opt into full-history reads", async () => {
  const { getHistory, calls } = loadQueries(rows(974), { anchor: "2026-08-31" });
  await getHistory(["5084"], { days: 9999 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].start, "2026-03-04");
  assert.equal(calls[0].limit, 194);
  assert.equal(calls[0].range, undefined);
  assert.equal(calls[0].count, undefined);
});
