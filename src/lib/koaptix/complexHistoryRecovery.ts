import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { DbComplexChartHistoryRow } from "./types";

type RecoverySeries = {
  name: string;
  blockedReasons: string[];
  rows: DbComplexChartHistoryRow[];
};

type LocalRecoveryInput = {
  status: "LOCAL_REVIEW_ONLY";
  sourceObservedAt: string;
  sourceNote: string;
  dates: string[];
  series: Record<string, RecoverySeries>;
};

// Local inspection uses the real API, mapper and detail chart. The unaccepted
// reconstruction is never served by a Production/Preview build or normal reads.
export function isLocalHistoryReview(requestUrl: string, nodeEnv = process.env.NODE_ENV): boolean {
  const url = new URL(requestUrl);
  return nodeEnv === "development"
    && process.env.VERCEL_ENV !== "preview"
    && process.env.VERCEL_ENV !== "production"
    && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
    && url.searchParams.get("review") === "restored"
    && url.searchParams.get("range") === "since-base"
    && url.searchParams.get("mode") !== "ma7";
}

export async function readLocalHistoryRecovery(complexIds: string[]) {
  if (process.env.NODE_ENV !== "development" || process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "production") {
    throw new Error("Local history review is disabled");
  }
  if (!complexIds.length || complexIds.some((id) => !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)))) {
    throw new Error("Invalid historical review complex ID");
  }
  const text = await readFile(join(process.cwd(), "outputs", "complex-history-full-recovery-20261015", "chart-review.json"), "utf8");
  const input = JSON.parse(text) as LocalRecoveryInput;
  if (!input || input.status !== "LOCAL_REVIEW_ONLY" || !Array.isArray(input.dates)
    || input.dates[0] !== "2024-01-01"
    || typeof input.sourceObservedAt !== "string" || !Number.isFinite(Date.parse(input.sourceObservedAt))
    || typeof input.sourceNote !== "string" || !input.sourceNote.trim()
    || !input.series || typeof input.series !== "object" || Array.isArray(input.series)) {
    throw new Error("Historical review input contract mismatch");
  }
  for (const [index, date] of input.dates.entries()) {
    const timestamp = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(`${date}T00:00:00Z`) : NaN;
    if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date
      || (index > 0 && input.dates[index - 1] >= date)) {
      throw new Error("Invalid historical review date grid");
    }
  }
  const expectedDates = new Set(input.dates);
  const rowsById: Record<string, DbComplexChartHistoryRow[]> = {};
  const reasonsById: Record<string, string[]> = {};
  for (const id of complexIds) {
    const entry = input.series[id];
    if (entry && (typeof entry !== "object" || !Array.isArray(entry.rows) || !Array.isArray(entry.blockedReasons)
      || entry.blockedReasons.some((reason) => typeof reason !== "string" || !reason.trim()))) {
      throw new Error("Historical review series contract mismatch");
    }
    const rows = entry ? entry.rows : [];
    const reasons = entry ? entry.blockedReasons : ["OUTSIDE_CAPTURED_PUBLIC_COHORT"];
    if (reasons.length && rows.length) throw new Error("Blocked history cannot contain review points");
    const seen = new Set<string>();
    for (const row of rows) {
      if (!row || typeof row !== "object" || String(row.complex_id) !== id || !expectedDates.has(row.snapshot_date)
        || seen.has(row.snapshot_date) || typeof row.sourceKey !== "string" || !row.sourceKey.trim()
        || (row.segmentKey != null && (typeof row.segmentKey !== "string" || !row.segmentKey.trim()))
        || (row.breakBefore != null && typeof row.breakBefore !== "boolean")
        || (row.market_cap_krw !== null && (!Number.isSafeInteger(row.market_cap_krw) || Number(row.market_cap_krw) <= 0))) {
        throw new Error("Invalid historical review point");
      }
      seen.add(row.snapshot_date);
    }
    if (!reasons.length && seen.size !== input.dates.length) throw new Error("Incomplete historical review date grid");
    rowsById[id] = rows;
    reasonsById[id] = reasons;
  }
  return { rowsById, reasonsById, sourceObservedAt: input.sourceObservedAt, sourceNote: input.sourceNote, expectedPointCount: input.dates.length };
}
