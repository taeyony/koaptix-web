#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

const baseUrl = (process.env.KOAPTIX_SMOKE_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const MAP_READINESS_ATTEMPTS = 3;
const MAP_READINESS_RETRY_DELAY_MS = 300;
const MAP_READINESS_LIMIT = 20;
const MAP_OPERATIONAL_CACHE_HEADERS = new Set(["live", "fresh", "stale"]);

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
  const startedAt = performance.now();

  try {
    const response = await fetch(`${baseUrl}${path}`, { signal: controller.signal });
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // HTML/non-JSON response.
    }
    return {
      ok: response.ok,
      status: response.status,
      ms: Math.round(performance.now() - startedAt),
      cacheHeader:
        response.headers.get("x-koaptix-map-cache") ??
        response.headers.get("x-koaptix-cache") ??
        null,
      json,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      ms: Math.round(performance.now() - startedAt),
      cacheHeader: null,
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeMapAttempt(response) {
  return {
    status: response?.status ?? null,
    ms: response?.ms ?? null,
    cache: response?.cacheHeader ?? null,
    message: response?.json?.message ?? response?.json?.error ?? response?.error ?? null,
    count: response?.json?.count ?? null,
  };
}

function isMapOperationalResponse(response, universeCode) {
  return Boolean(
    response?.ok &&
      response?.json?.universeCode === universeCode &&
      Number(response?.json?.count ?? 0) > 0 &&
      MAP_OPERATIONAL_CACHE_HEADERS.has(response?.cacheHeader ?? ""),
  );
}

async function readMapReadiness(universeCode, limit = MAP_READINESS_LIMIT) {
  const attempts = [];
  let operationalResponse = null;

  for (let index = 0; index < MAP_READINESS_ATTEMPTS; index += 1) {
    if (index > 0) {
      await sleep(MAP_READINESS_RETRY_DELAY_MS);
    }

    const response = await fetchJson(
      `/api/map?universe_code=${encodeURIComponent(universeCode)}&limit=${limit}`,
    );
    const attempt = {
      attempt: index + 1,
      ...summarizeMapAttempt(response),
      ok: response?.ok ?? false,
      universeCode: response?.json?.universeCode ?? null,
      operationalOk: isMapOperationalResponse(response, universeCode),
    };

    attempts.push(attempt);

    if (attempt.operationalOk) {
      operationalResponse = response;
      break;
    }
  }

  const operationalAttempt = attempts.find((attempt) => attempt.operationalOk) ?? null;

  return {
    coldStatus: attempts[0] ?? null,
    attempts,
    operationalOk: Boolean(operationalAttempt),
    operationalMs: operationalResponse?.ms ?? null,
    operationalCache: operationalResponse?.cacheHeader ?? null,
    operationalStatus: operationalResponse?.status ?? null,
    operationalCount: operationalResponse?.json?.count ?? null,
  };
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
  const mapReadiness = exposed ? await readMapReadiness(item.code) : null;
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
  const mapOperationalOk = !exposed || mapReadiness?.operationalOk === true;
  const mapOk = mapOperationalOk;
  const searchOk =
    !exposed ||
    (search.ok &&
      search.json?.universeCode === item.code &&
      Number(search.json?.localItems?.length ?? 0) > 0);
  const rankingPageOk =
    !exposed ||
    (rankingPage.ok &&
      rankingPage.text.includes("KOAPTIX TOP1000") &&
      rankingPage.text.includes(item.code));

  const blockingOk = rankingsOk && mapOperationalOk && searchOk;
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
    mapColdStatus: mapReadiness?.coldStatus ?? null,
    mapOperationalOk,
    mapOperationalAttempts: mapReadiness?.attempts ?? null,
    mapOperationalMs: mapReadiness?.operationalMs ?? null,
    mapOperationalCache: mapReadiness?.operationalCache ?? null,
    mapOperationalStatus: mapReadiness?.operationalStatus ?? null,
    mapStatus: mapReadiness?.operationalStatus ?? mapReadiness?.coldStatus?.status ?? null,
    mapCount: mapReadiness?.operationalCount ?? mapReadiness?.coldStatus?.count ?? null,
    searchOk,
    searchStatus: search?.status ?? null,
    searchLocalCount: search?.json?.localItems?.length ?? null,
    searchGlobalCount: search?.json?.globalItems?.length ?? null,
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
          blockingChecks: ["rankingsOk", "mapOperationalOk", "searchOk"],
          diagnosticChecks: ["mapColdStatus"],
          informationalChecks: ["rankingPageOk"],
          advisoryChecks: ["snapshotOk", "latestBoardOk"],
          mapReadiness: {
            attempts: MAP_READINESS_ATTEMPTS,
            retryDelayMs: MAP_READINESS_RETRY_DELAY_MS,
            limit: MAP_READINESS_LIMIT,
            cacheHeaders: Array.from(MAP_OPERATIONAL_CACHE_HEADERS),
          },
          note:
            "Direct snapshot/latest reads are readiness signals. Baseline delivery checks cover /api/rankings, bounded-warm /api/map operational readiness, and /api/search. TOP1000 /ranking is informational until that route is part of the clean tracked baseline.",
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
            row.mapOperationalOk ? null : "mapOperationalOk",
            row.searchOk ? null : "searchOk",
          ].filter(Boolean),
          informationalChecks: [
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
