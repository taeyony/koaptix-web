#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

const baseUrl = (process.env.KOAPTIX_SMOKE_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

const candidateSgg = [
  { code: "SGG_11110", label: "SGG_11110" },
  { code: "SGG_11140", label: "SGG_11140" },
  { code: "SGG_11215", label: "SGG_11215" },
  { code: "SGG_11260", label: "SGG_11260" },
  { code: "SGG_11305", label: "SGG_11305" },
  { code: "SGG_11320", label: "SGG_11320" },
  { code: "SGG_11350", label: "SGG_11350" },
  { code: "SGG_11380", label: "SGG_11380" },
  { code: "SGG_11530", label: "SGG_11530" },
  { code: "SGG_11545", label: "SGG_11545" },
  { code: "SGG_11620", label: "SGG_11620" },
];

function readEnvLocal() {
  const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
  const env = {};

  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }

  return env;
}

function readEnabledSggRegistry() {
  const raw = readFileSync(join(process.cwd(), "src/lib/koaptix/universes.ts"), "utf8");
  const start = raw.indexOf("const SGG_UNIVERSE_REGISTRY");
  const end = raw.indexOf("/**\n * KOAPTIX service-exposed universe registry.");
  const block = raw.slice(start, end);

  return [...block.matchAll(/code:\s*"(?<code>SGG_\d+)"[\s\S]*?label:\s*"(?<label>[^"]+)"[\s\S]*?enabled:\s*(?<enabled>true|false)/g)]
    .map((match) => ({
      code: match.groups.code,
      label: match.groups.label,
      enabled: match.groups.enabled === "true",
    }))
    .filter((item) => item.enabled);
}

function formatSupabaseError(error) {
  if (!error) return null;
  return {
    code: error.code ?? null,
    message: error.message ?? String(error),
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}

async function timed(label, fn) {
  const startedAt = performance.now();
  try {
    const result = await fn();
    return {
      label,
      ms: Math.round(performance.now() - startedAt),
      result,
    };
  } catch (error) {
    return {
      label,
      ms: Math.round(performance.now() - startedAt),
      result: {
        data: null,
        error: {
          code: "SCRIPT_THROW",
          message: error instanceof Error ? error.message : String(error),
        },
      },
    };
  }
}

async function fetchJson(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(`${baseUrl}${path}`, { signal: controller.signal });
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // HTML/non-JSON response.
    }
    return { ok: response.ok, status: response.status, json };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(path) {
  const response = await fetch(`${baseUrl}${path}`);
  return {
    ok: response.ok,
    status: response.status,
    text: await response.text(),
  };
}

async function readSnapshot(supabase, universeCode) {
  return timed("snapshot", () =>
    supabase
      .from("koaptix_rank_snapshot")
      .select("snapshot_date")
      .eq("universe_code", universeCode)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
}

async function readLatestBoard(supabase, universeCode) {
  return timed("latestBoard", () =>
    supabase
      .from("v_koaptix_latest_universe_rank_board_u")
      .select("universe_code, complex_id, apt_name_ko, rank_all")
      .eq("universe_code", universeCode)
      .order("rank_all", { ascending: true })
      .limit(1)
      .maybeSingle(),
  );
}

async function readDynamicBoard(supabase, universeCode, snapshotDate) {
  if (!snapshotDate) {
    return {
      label: "dynamicBoard",
      ms: 0,
      result: { data: null, error: null },
    };
  }

  return timed("dynamicBoard", () =>
    supabase
      .from("v_koaptix_universe_rank_history_dynamic")
      .select("universe_code, snapshot_date, complex_id, apt_name_ko, rank_all")
      .eq("universe_code", universeCode)
      .eq("snapshot_date", snapshotDate)
      .order("rank_all", { ascending: true })
      .limit(1)
      .maybeSingle(),
  );
}

async function auditOne(supabase, item, exposed) {
  const snapshot = await readSnapshot(supabase, item.code);
  const snapshotData = snapshot.result.data ?? null;
  const snapshotDate = snapshotData?.snapshot_date ?? null;

  const latest = await readLatestBoard(supabase, item.code);
  const latestData = latest.result.data ?? null;

  const dynamic = await readDynamicBoard(supabase, item.code, snapshotDate);
  const dynamicData = dynamic.result.data ?? null;

  const rankings = exposed
    ? await fetchJson(`/api/rankings?universe_code=${encodeURIComponent(item.code)}&limit=20`)
    : null;
  const map = exposed
    ? await fetchJson(`/api/map?universe_code=${encodeURIComponent(item.code)}&limit=20`)
    : null;
  const sampleName =
    rankings?.json?.items?.[0]?.name ??
    latestData?.apt_name_ko ??
    dynamicData?.apt_name_ko ??
    "";
  const search =
    exposed && sampleName
      ? await fetchJson(
          `/api/search?universe_code=${encodeURIComponent(item.code)}&q=${encodeURIComponent(sampleName)}&limit=12`,
        )
      : null;
  const rankingPage = exposed
    ? await fetchText(`/ranking?universe=${encodeURIComponent(item.code)}`)
    : null;

  const snapshotError = formatSupabaseError(snapshot.result.error);
  const latestBoardError = formatSupabaseError(latest.result.error);
  const dynamicBoardError = formatSupabaseError(dynamic.result.error);

  const snapshotOk = !snapshotError && Boolean(snapshotDate);
  const latestBoardOk = !latestBoardError && Boolean(latestData?.complex_id);
  const dynamicBoardOk = !dynamicBoardError && Boolean(dynamicData?.complex_id);
  const rankingsOk =
    !exposed ||
    (rankings.ok &&
      rankings.json?.universeCode === item.code &&
      Number(rankings.json?.count ?? 0) > 0);
  const mapOk =
    !exposed ||
    (map.ok && map.json?.universeCode === item.code && Number(map.json?.count ?? 0) > 0);
  const searchOk =
    !exposed ||
    (search.ok &&
      search.json?.universeCode === item.code &&
      Number(search.json?.localItems?.length ?? 0) > 0 &&
      Number(search.json?.globalItems?.length ?? 0) === 0);
  const rankingPageOk =
    !exposed ||
    (rankingPage.ok &&
      rankingPage.text.includes("KOAPTIX TOP1000") &&
      rankingPage.text.includes(item.code));

  const blockingOk = rankingsOk && mapOk && searchOk && rankingPageOk;
  const advisoryOk = snapshotOk && latestBoardOk;

  return {
    code: item.code,
    label: item.label,
    exposed,
    snapshotOk,
    snapshotDate,
    snapshotMs: snapshot.ms,
    snapshotError,
    latestBoardOk,
    latestBoardMs: latest.ms,
    latestBoardError,
    latestSample: latestData,
    dynamicBoardOk,
    dynamicBoardMs: dynamic.ms,
    dynamicBoardError,
    dynamicSample: dynamicData,
    rankingsOk,
    rankingsStatus: rankings?.status ?? null,
    rankingsCount: rankings?.json?.count ?? null,
    mapOk,
    mapStatus: map?.status ?? null,
    mapCount: map?.json?.count ?? null,
    searchOk,
    searchStatus: search?.status ?? null,
    searchLocalCount: search?.json?.localItems?.length ?? null,
    rankingPageOk,
    rankingPageStatus: rankingPage?.status ?? null,
    sampleName,
    blockingOk,
    advisoryOk,
    auditClass: blockingOk ? (advisoryOk ? "confirmed" : "delivery-confirmed-direct-read-advisory") : "blocking-fail",
  };
}

async function main() {
  const env = readEnvLocal();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const enabled = readEnabledSggRegistry();
  const enabledCodeSet = new Set(enabled.map((item) => item.code));
  const candidates = candidateSgg.filter((item) => !enabledCodeSet.has(item.code));

  const enabledResults = [];
  for (const item of enabled) {
    enabledResults.push(await auditOne(supabase, item, true));
  }

  const candidateResults = [];
  for (const item of candidates) {
    candidateResults.push(await auditOne(supabase, item, false));
  }

  const confirmed = enabledResults.filter((row) => row.blockingOk && row.advisoryOk);
  const deliveryConfirmed = enabledResults.filter((row) => row.blockingOk);
  const advisoryMiss = enabledResults.filter((row) => row.blockingOk && !row.advisoryOk);
  const blockingFailed = enabledResults.filter((row) => !row.blockingOk);
  const candidateReady = candidateResults.filter((row) => row.snapshotOk && row.latestBoardOk);

  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        baseUrl,
        policy: {
          blockingChecks: ["rankingsOk", "mapOk", "searchOk", "rankingPageOk"],
          advisoryChecks: ["snapshotOk", "latestBoardOk"],
          note:
            "Direct snapshot/latest reads are readiness signals. User-facing route identity checks remain blocking for exposure gates.",
        },
        enabledResults,
        confirmed: confirmed.map((row) => row.code),
        deliveryConfirmed: deliveryConfirmed.map((row) => row.code),
        advisoryMiss: advisoryMiss.map((row) => ({
          code: row.code,
          failedChecks: [
            row.snapshotOk ? null : "snapshotOk",
            row.latestBoardOk ? null : "latestBoardOk",
          ].filter(Boolean),
          dynamicBoardOk: row.dynamicBoardOk,
          rankingsCount: row.rankingsCount,
        })),
        blockingFailed: blockingFailed.map((row) => ({
          code: row.code,
          failedChecks: [
            row.rankingsOk ? null : "rankingsOk",
            row.mapOk ? null : "mapOk",
            row.searchOk ? null : "searchOk",
            row.rankingPageOk ? null : "rankingPageOk",
          ].filter(Boolean),
        })),
        candidateResults,
        candidateReady: candidateReady.map((row) => row.code),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
