import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadPublishedNameMatches } from "../src/lib/koaptix/publishedNameSearch.server";
import type { DbLatestRankBoardRow } from "../src/lib/koaptix/types";

const identity = { generation_id: "733d03e6-e029-449b-a748-26c4b032df05", publication_version: 2,
  publication_event_id: "90f8bd8d-9a97-44df-834c-8c23c4077d40", published_at: "2026-10-15T00:22:12.07608+00:00", surface_code: "UNIVERSE_SERVICE" as const };
function row(id = 168423, rank = 176, universe = "KOREA_ALL", date = "2026-08-31"): DbLatestRankBoardRow {
  return { ...identity, snapshot_date: date, universe_code: universe, complex_id: id, apt_name_ko: "현대힐스테이트3단지",
    rank_all: rank, market_cap_krw: 1128304999930, market_cap_trillion_krw: 1.12830499993, sigungu_name: "서구", legal_dong_name: "화정동" };
}
type Input = { direct?: DbLatestRankBoardRow[]; joined?: DbLatestRankBoardRow[]; names?: object[]; aliases?: object[]; error?: string };
function client(input: Input = {}) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  class Builder {
    byIds = false;
    constructor(readonly table: string) {}
    call(method: string, args: unknown[]) { calls.push({ table: this.table, method, args }); return this; }
    select(...args: unknown[]) { return this.call("select", args); }
    eq(...args: unknown[]) { return this.call("eq", args); }
    in(...args: unknown[]) { if (args[0] === "complex_id") this.byIds = true; return this.call("in", args); }
    gte(...args: unknown[]) { return this.call("gte", args); }
    lte(...args: unknown[]) { return this.call("lte", args); }
    order(...args: unknown[]) { return this.call("order", args); }
    ilike(...args: unknown[]) { return this.call("ilike", args); }
    limit(...args: unknown[]) { return this.call("limit", args); }
    then(resolve: (value: unknown) => unknown) {
      const data = this.table === "apt_complex" ? input.names ?? [] : this.table === "complex_name_alias" ? input.aliases ?? [] : this.byIds ? input.joined ?? [] : input.direct ?? [];
      return Promise.resolve({ data, error: input.error === this.table ? { message: "Provider detail" } : null }).then(resolve);
    }
  }
  const db = { from(table: string) { calls.push({ table, method: "from", args: [] }); return new Builder(table); } } as unknown as Pick<SupabaseClient, "from">;
  return { db, calls };
}

test("an existing alias finds a published rank beyond the initial 80 without changing the value", async () => {
  const original = row();
  const { db, calls } = client({ aliases: [{ complex_id: 168423, alias_name: "유니버시아드힐스테이트" }], joined: [original] });
  const result = await loadPublishedNameMatches(db, "유니버시아드 힐스테이트", ["KOREA_ALL"]);
  assert.equal(result.length, 1);
  assert.deepEqual({ ...result[0], searchText: undefined }, { ...original, searchText: undefined });
  assert.equal(result[0].searchText, "유니버시아드힐스테이트");
  assert.ok(calls.some(c => c.method === "ilike" && c.args[0] === "alias_name_norm" && c.args[1] === "%유니버시아드힐스테이트%"));
  assert.ok(calls.some(c => c.method === "in" && c.args[0] === "complex_id" && JSON.stringify(c.args[1]) === "[\"168423\"]"));
});

test("a master or alias match without a published row cannot acquire a rank or cap", async () => {
  const { db } = client({ names: [{ complex_id: 170211, apt_name_ko: "수완진아리채3차" }] });
  assert.deepEqual(await loadPublishedNameMatches(db, "수완 진아 리채", ["KOREA_ALL"]), []);
});

test("regional ranks preserve the source universe and its actual older date", async () => {
  const source = { ...row(170167, 157, "GWANGJU_ALL", "2026-07-03"), apt_name_ko: "수완진아리채1차" };
  const { db } = client({ direct: [source] });
  const result = await loadPublishedNameMatches(db, "수완진아리채", ["GWANGJU_ALL"]);
  assert.equal(result[0].universe_code, "GWANGJU_ALL");
  assert.equal(result[0].snapshot_date, "2026-07-03");
  assert.equal(result[0].rank_all, 157);
});

test("unrequested universes, non-public ranks and conflicting publication vintages fail closed", async () => {
  for (const direct of [[row(168423, 176, "SEOUL_ALL")], [row(168423, 1001)], [row(), { ...row(168421, 809), publication_version: 3 }]]) {
    await assert.rejects(loadPublishedNameMatches(client({ direct }).db, "현대힐스테이트", ["KOREA_ALL"]));
  }
  await assert.rejects(loadPublishedNameMatches(client({ direct: [row()], joined: [{ ...row(), market_cap_krw: 1 }], aliases: [{ complex_id: 168423, alias_name: "현대힐스테이트" }] }).db, "현대힐스테이트", ["KOREA_ALL"]), /Conflicting/);
});

test("query scope and candidate size stay bounded and all operations are reads", async () => {
  const aliases = Array.from({ length: 60 }, (_, i) => ({ complex_id: i + 1, alias_name: "유니버시아드힐스테이트" }));
  const { db, calls } = client({ aliases });
  await loadPublishedNameMatches(db, "유니버시아드힐스테이트", ["KOREA_ALL"]);
  const ids = calls.find(c => c.method === "in" && c.args[0] === "complex_id");
  assert.equal((ids?.args[1] as string[]).length, 48);
  assert.equal(calls.filter(c => c.method === "from").length, 4);
  assert.ok(calls.filter(c => c.table === "v_koaptix_latest_board_read_model_published" && c.method === "eq").every(c => c.args[0] === "surface_code" && c.args[1] === "UNIVERSE_SERVICE"));
  assert.equal(calls.some(c => ["insert", "update", "delete", "upsert", "rpc"].includes(c.method)), false);
  for (const [q, codes] of [["a", ["KOREA_ALL"]], ["단지명", []]] as const) {
    const empty = client(); assert.deepEqual(await loadPublishedNameMatches(empty.db, q, codes), []); assert.equal(empty.calls.length, 0);
  }
  await assert.rejects(loadPublishedNameMatches(client({ error: "complex_name_alias" }).db, "유니버시아드힐스테이트", ["KOREA_ALL"]), /lookup failed/);
});
