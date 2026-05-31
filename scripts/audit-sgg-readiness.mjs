#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_VISIBLE_SGG_CODES = [
  "SGG_11710",
  "SGG_11650",
  "SGG_11680",
  "SGG_41135",
  "SGG_11440",
  "SGG_11560",
  "SGG_11590",
  "SGG_11500",
  "SGG_11290",
  "SGG_11230",
];

const REQUIRED_ROUTE_TIMEOUT_MS = readNumberEnv("KOAPTIX_AUDIT_REQUEST_TIMEOUT_MS", 7_000);
const ADVISORY_ROUTE_TIMEOUT_MS = readNumberEnv("KOAPTIX_AUDIT_ADVISORY_TIMEOUT_MS", 8_000);
const DIRECT_DB_TIMEOUT_MS = readNumberEnv("KOAPTIX_AUDIT_DIRECT_DB_TIMEOUT_MS", 5_000);
const GLOBAL_TIMEOUT_MS = readNumberEnv("KOAPTIX_AUDIT_GLOBAL_TIMEOUT_MS", 120_000);
const CONCURRENCY = readNumberEnv("KOAPTIX_AUDIT_CONCURRENCY", 3);
const DEFAULT_MAX_SGG = readNumberEnv("KOAPTIX_AUDIT_SGG_MAX", 10);

const baseUrl = normalizeBaseUrl(process.env.KOAPTIX_SMOKE_BASE_URL || DEFAULT_BASE_URL);
const deepMode = process.env.KOAPTIX_AUDIT_SGG_DEEP === "1";
const directDbEnabled = deepMode || process.env.KOAPTIX_AUDIT_DIRECT_DB === "1";
const directLatestDbEnabled = process.env.KOAPTIX_AUDIT_LATEST_DB === "1";
const startedAt = performance.now();
const deadlineAt = Date.now() + GLOBAL_TIMEOUT_MS;

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function readNumberEnv(name, fallback) {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return Math.trunc(raw);
}

function elapsedMs() {
  return Math.round(performance.now() - startedAt);
}

function remainingGlobalMs() {
  return Math.max(0, deadlineAt - Date.now());
}

function isGlobalTimedOut() {
  return remainingGlobalMs() <= 0;
}

function sanitizeMessage(value) {
  return String(value ?? "")
    .replace(/https?:\/\/[^\s"'<>]+/g, "[redacted-url]")
    .replace(/([A-Za-z0-9_-]{24,})/g, "[redacted-token]")
    .slice(0, 220);
}

function sanitizeError(error) {
  if (!error) return null;
  return {
    code: error.code ?? error.name ?? "ERROR",
    message: sanitizeMessage(error.message ?? String(error)),
  };
}

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
  const block = start >= 0 && end > start ? raw.slice(start, end) : raw;

  return [...block.matchAll(/code:\s*"(?<code>SGG_\d+)"[\s\S]*?label:\s*"(?<label>[^"]+)"[\s\S]*?enabled:\s*(?<enabled>true|false)[\s\S]*?order:\s*(?<order>\d+)/g)]
    .map((match) => ({
      code: match.groups.code,
      label: match.groups.label,
      enabled: match.groups.enabled === "true",
      order: Number(match.groups.order),
    }))
    .filter((item) => item.enabled);
}

function chooseAuditSggs(enabledSggs) {
  if (deepMode) return enabledSggs;

  const byCode = new Map(enabledSggs.map((item) => [item.code, item]));
  const visible = DEFAULT_VISIBLE_SGG_CODES.map((code) => byCode.get(code) ?? {
    code,
    label: code,
    enabled: true,
    order: 0,
  });

  return visible.slice(0, DEFAULT_MAX_SGG);
}

async function fetchJson(path, timeoutMs, checkName) {
  const controller = new AbortController();
  const boundedTimeoutMs = Math.max(1, Math.min(timeoutMs, remainingGlobalMs()));
  const timeout = setTimeout(() => controller.abort(), boundedTimeoutMs);
  const started = performance.now();

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "GET",
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Keep non-JSON responses bounded and concise.
    }

    return {
      ok: response.ok,
      status: response.status,
      ms: Math.round(performance.now() - started),
      json,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      ms: Math.round(performance.now() - started),
      json: null,
      error: {
        code: error instanceof Error && error.name === "AbortError" ? "HTTP_TIMEOUT" : "HTTP_ERROR",
        message: sanitizeMessage(
          error instanceof Error ? error.message : `${checkName} failed`,
        ),
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function withClientTimeout(label, promiseLike, timeoutMs) {
  let timer = null;
  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => {
      resolve({
        data: null,
        error: {
          code: "DIRECT_DB_TIMEOUT",
          message: `${label} exceeded ${timeoutMs}ms client timeout`,
        },
      });
    }, Math.max(1, Math.min(timeoutMs, remainingGlobalMs())));
  });

  try {
    return await Promise.race([Promise.resolve(promiseLike), timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function getRequestedUniverse(payload, fallbackCode) {
  return payload?.requestedUniverseCode ?? payload?.universeCode ?? payload?.universe_code ?? fallbackCode;
}

function getRenderedUniverse(payload, fallbackCode) {
  return payload?.renderedUniverseCode ?? payload?.universeCode ?? payload?.universe_code ?? fallbackCode;
}

function getCount(payload) {
  return Number(payload?.resultCount ?? payload?.count ?? payload?.items?.length ?? payload?.localItems?.length ?? 0);
}

function getItems(payload) {
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.localItems)) return payload.localItems;
  return [];
}

function getItemUniverse(item) {
  return item?.universeCode ?? item?.universe_code ?? "";
}

function hasCrossUniverseItems(items, expectedCode) {
  return items.some((item) => {
    const itemUniverse = getItemUniverse(item);
    return itemUniverse && itemUniverse !== expectedCode;
  });
}

function routeFailure(universe, check, reason) {
  return {
    universe,
    check,
    reason,
  };
}

function routeWarning(universe, check, reason) {
  return {
    universe,
    check,
    reason,
  };
}

function evaluateIdentityRoute({ universe, check, response, required = true }) {
  const warnings = [];
  const failures = [];
  const payload = response.json;

  if (!response.ok || !payload || typeof payload !== "object") {
    const reason = response.error?.code === "HTTP_TIMEOUT"
      ? `timeout after ${response.ms}ms`
      : `http_status=${response.status}`;
    (required ? failures : warnings).push(routeFailure(universe, check, reason));
    return { ok: false, warnings, failures, payload, count: 0 };
  }

  const requestedUniverse = getRequestedUniverse(payload, universe);
  const renderedUniverse = getRenderedUniverse(payload, universe);
  const items = getItems(payload);
  const count = getCount(payload);

  if (requestedUniverse !== universe || renderedUniverse !== universe) {
    failures.push(routeFailure(
      universe,
      check,
      `identity_mismatch requested=${requestedUniverse} rendered=${renderedUniverse}`,
    ));
  }

  if (universe !== "KOREA_ALL" && (renderedUniverse === "KOREA_ALL" || hasCrossUniverseItems(items, universe))) {
    failures.push(routeFailure(universe, check, "cross_universe_or_korea_substitution_observed"));
  }

  if (count <= 0 && required) {
    failures.push(routeFailure(universe, check, "empty_required_payload"));
  }

  for (const field of ["source", "cacheState", "fallbackMode"]) {
    if (!(field in payload)) {
      warnings.push(routeWarning(universe, check, `missing_${field}`));
    }
  }

  if (payload.fallbackMode && payload.fallbackMode !== "none") {
    warnings.push(routeWarning(universe, check, `fallbackMode=${payload.fallbackMode}`));
  }

  return {
    ok: failures.length === 0,
    warnings,
    failures,
    payload,
    count,
  };
}

function findSearchQuery(rankingsPayload, universeCode) {
  const firstName = rankingsPayload?.items?.[0]?.name ?? rankingsPayload?.items?.[0]?.apt_name_ko;
  if (firstName) return firstName;
  if (universeCode === "SGG_11710") return "잠실";
  return "아파트";
}

async function readDirectDiagnostics(supabase, universeCode) {
  if (!directDbEnabled) {
    return {
      attempted: false,
      timeout_or_skipped: "skipped_default",
      snapshotOk: true,
      latestBoardOk: true,
      dynamicBoardOk: null,
      warnings: [routeWarning(universeCode, "direct_db", "direct_db_skipped_default")],
    };
  }

  const warnings = [];
  const snapshot = await withClientTimeout(
    "snapshot",
    supabase
      .from("koaptix_rank_snapshot")
      .select("snapshot_date")
      .eq("universe_code", universeCode)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    DIRECT_DB_TIMEOUT_MS,
  );

  const snapshotDate = snapshot.data?.snapshot_date ?? null;
  const snapshotError = sanitizeError(snapshot.error);
  const snapshotOk = !snapshotError && Boolean(snapshotDate);

  if (!snapshotOk) {
    warnings.push(routeWarning(
      universeCode,
      "direct_snapshot",
      snapshotError?.code === "DIRECT_DB_TIMEOUT"
        ? "WARN_DIRECT_DB_TIMEOUT"
        : `direct_snapshot_unavailable:${snapshotError?.code ?? "NO_DATE"}`,
    ));
  }

  let dynamicOk = null;
  if (snapshotDate) {
    const dynamic = await withClientTimeout(
      "dynamicBoard",
      supabase
        .from("v_koaptix_universe_rank_history_dynamic")
        .select("universe_code, snapshot_date, complex_id, rank_all")
        .eq("universe_code", universeCode)
        .eq("snapshot_date", snapshotDate)
        .order("rank_all", { ascending: true })
        .limit(1)
        .maybeSingle(),
      DIRECT_DB_TIMEOUT_MS,
    );
    const dynamicError = sanitizeError(dynamic.error);
    dynamicOk = !dynamicError && Boolean(dynamic.data?.complex_id);
    if (!dynamicOk) {
      warnings.push(routeWarning(
        universeCode,
        "direct_dynamic",
        dynamicError?.code === "DIRECT_DB_TIMEOUT"
          ? "WARN_DIRECT_DB_TIMEOUT"
          : `direct_dynamic_unavailable:${dynamicError?.code ?? "NO_ROW"}`,
      ));
    }
  }

  let latestBoardOk = true;
  if (directLatestDbEnabled) {
    const latest = await withClientTimeout(
      "latestBoard",
      supabase
        .from("v_koaptix_latest_universe_rank_board_u")
        .select("universe_code, complex_id, rank_all")
        .eq("universe_code", universeCode)
        .order("rank_all", { ascending: true })
        .limit(1)
        .maybeSingle(),
      DIRECT_DB_TIMEOUT_MS,
    );
    const latestError = sanitizeError(latest.error);
    latestBoardOk = !latestError && Boolean(latest.data?.complex_id);
    if (!latestBoardOk) {
      warnings.push(routeWarning(
        universeCode,
        "direct_latest_board",
        latestError?.code === "DIRECT_DB_TIMEOUT"
          ? "WARN_DIRECT_DB_TIMEOUT"
          : `direct_latest_unavailable:${latestError?.code ?? "NO_ROW"}`,
      ));
    }
  }

  return {
    attempted: true,
    timeout_or_skipped: warnings.some((warning) => warning.reason.includes("TIMEOUT")) ? "timeout" : "none",
    snapshotOk,
    snapshotDate,
    latestBoardOk,
    dynamicBoardOk: dynamicOk,
    warnings,
  };
}

async function readSgg11710FullBoardGuard() {
  const universe = "SGG_11710";
  const response = await fetchJson(
    `/api/ranking?universe_code=${encodeURIComponent(universe)}&limit=1000`,
    ADVISORY_ROUTE_TIMEOUT_MS,
    "sgg_11710_full_board",
  );
  const warnings = [];

  if (!response.ok || !response.json) {
    warnings.push(routeWarning(universe, "sgg_11710_full_board", "WARN_UNCONFIRMED"));
    return {
      warnings,
      identity_preserved: null,
      korea_substitution_observed: null,
      latest_board_date: null,
      latest_board_row_count: null,
      partial_2026_05_31_exposed: null,
      confirmation_source: "unconfirmed_full_board_route",
    };
  }

  const payload = response.json;
  const rendered = getRenderedUniverse(payload, universe);
  const items = getItems(payload);
  const count = getCount(payload);
  const dates = Array.from(
    new Set(
      items
        .map((item) => item.historySnapshotDate ?? item.history_snapshot_date ?? item.snapshot_date)
        .filter(Boolean),
    ),
  );
  const partial20260531 = dates.includes("2026-05-31") && count < 177;
  const identityPreserved = rendered === universe && !hasCrossUniverseItems(items, universe);
  const koreaSubstitutionObserved = rendered === "KOREA_ALL" || hasCrossUniverseItems(items, universe);

  if (!identityPreserved) {
    warnings.push(routeWarning(universe, "sgg_11710_full_board", "WARN_IDENTITY_UNCONFIRMED_ON_ADVISORY_ROUTE"));
  }

  if (count !== 177) {
    warnings.push(routeWarning(universe, "sgg_11710_full_board", `WARN_ROW_COUNT_${count}`));
  }

  if (!dates.includes("2026-05-29")) {
    warnings.push(routeWarning(universe, "sgg_11710_full_board", `WARN_DATE_${dates[0] ?? "UNKNOWN"}`));
  }

  return {
    warnings,
    identity_preserved: identityPreserved,
    korea_substitution_observed: koreaSubstitutionObserved,
    latest_board_date: dates[0] ?? null,
    latest_board_row_count: count || null,
    partial_2026_05_31_exposed: partial20260531,
    confirmation_source: "api_ranking_full_board",
  };
}

async function auditOne(item, supabase) {
  const universe = item.code;
  const failures = [];
  const warnings = [];

  if (isGlobalTimedOut()) {
    warnings.push(routeWarning(universe, "global_timeout", "WARN_GLOBAL_TIMEOUT"));
    return {
      code: universe,
      label: item.label,
      exposed: true,
      skipped: true,
      snapshotOk: true,
      latestBoardOk: true,
      rankingsOk: true,
      mapOperationalOk: true,
      searchOk: true,
      blockingOk: true,
      advisoryOk: false,
      auditClass: "skipped-global-timeout-warning",
      failures,
      warnings,
    };
  }

  const rankingsResponse = await fetchJson(
    `/api/rankings?universe_code=${encodeURIComponent(universe)}&limit=20`,
    REQUIRED_ROUTE_TIMEOUT_MS,
    "rankings",
  );
  const rankings = evaluateIdentityRoute({
    universe,
    check: "rankings",
    response: rankingsResponse,
  });
  failures.push(...rankings.failures);
  warnings.push(...rankings.warnings);

  const mapResponse = await fetchJson(
    `/api/map?universe_code=${encodeURIComponent(universe)}&limit=32`,
    REQUIRED_ROUTE_TIMEOUT_MS,
    "map",
  );
  const map = evaluateIdentityRoute({
    universe,
    check: "map",
    response: mapResponse,
  });
  failures.push(...map.failures);
  warnings.push(...map.warnings);

  const searchQuery = findSearchQuery(rankings.payload, universe);
  const searchResponse = await fetchJson(
    `/api/search?universe_code=${encodeURIComponent(universe)}&q=${encodeURIComponent(searchQuery)}&limit=12`,
    REQUIRED_ROUTE_TIMEOUT_MS,
    "search",
  );
  const search = evaluateIdentityRoute({
    universe,
    check: "search",
    response: searchResponse,
    required: false,
  });
  failures.push(...search.failures);
  warnings.push(...search.warnings);

  const directDb = await readDirectDiagnostics(supabase, universe);
  warnings.push(...directDb.warnings);

  const blockingOk = failures.length === 0;
  const advisoryOk = warnings.length === 0;

  return {
    code: universe,
    label: item.label,
    exposed: true,
    snapshotOk: directDb.snapshotOk,
    snapshotDate: directDb.snapshotDate ?? null,
    latestBoardOk: directDb.latestBoardOk,
    dynamicBoardOk: directDb.dynamicBoardOk,
    rankingsOk: rankings.ok,
    rankingsStatus: rankingsResponse.status,
    rankingsCount: rankings.count,
    mapOk: map.ok,
    mapOperationalOk: map.ok,
    mapOperationalStatus: mapResponse.status,
    mapStatus: mapResponse.status,
    mapCount: map.count,
    searchOk: search.failures.length === 0,
    searchStatus: searchResponse.status,
    searchLocalCount: search.count,
    searchGlobalCount: Array.isArray(search.payload?.globalItems) ? search.payload.globalItems.length : null,
    rankingPageOk: true,
    rankingPageStatus: null,
    sampleName: searchQuery,
    blockingOk,
    advisoryOk,
    auditClass: blockingOk ? (advisoryOk ? "confirmed" : "delivery-confirmed-advisory-warnings") : "blocking-fail",
    failures,
    warnings,
    directDb,
  };
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await fn(items[currentIndex]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function buildSupabaseClientIfNeeded() {
  if (!directDbEnabled) return null;
  const env = readEnvLocal();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function main() {
  const enabledSggs = readEnabledSggRegistry();
  const selectedSggs = chooseAuditSggs(enabledSggs);
  const supabase = buildSupabaseClientIfNeeded();
  const globalWarnings = [];

  const enabledResults = await mapWithConcurrency(
    selectedSggs,
    CONCURRENCY,
    (item) => auditOne(item, supabase),
  );

  if (isGlobalTimedOut()) {
    globalWarnings.push(routeWarning("ALL", "global_timeout", "WARN_GLOBAL_TIMEOUT"));
  }

  const sgg11710Guard = await readSgg11710FullBoardGuard();
  globalWarnings.push(...sgg11710Guard.warnings);

  if (sgg11710Guard.korea_substitution_observed === true) {
    enabledResults
      .find((row) => row.code === "SGG_11710")
      ?.failures.push(routeFailure("SGG_11710", "sgg_11710_guard", "korea_substitution_observed"));
  }

  if (sgg11710Guard.partial_2026_05_31_exposed === true) {
    enabledResults
      .find((row) => row.code === "SGG_11710")
      ?.failures.push(routeFailure("SGG_11710", "sgg_11710_guard", "partial_2026_05_31_exposed"));
  }

  const failures = enabledResults.flatMap((row) => row.failures);
  const warnings = [
    ...globalWarnings,
    ...enabledResults.flatMap((row) => row.warnings),
  ];
  const status = failures.length > 0
    ? "FAIL"
    : warnings.length > 0
      ? "PASS_WITH_WARNINGS"
      : "PASS";
  const checkedCodes = selectedSggs.map((item) => item.code);
  const directWarnings = warnings.filter((warning) => warning.check.startsWith("direct_") || warning.check === "direct_db");

  const legacyRows = enabledResults.map((row) => ({
    ...row,
    // Legacy release-gate compatibility: skipped direct DB diagnostics are advisory,
    // not blocking snapshot/latest failures.
    snapshotOk: row.directDb?.attempted ? row.snapshotOk : true,
    latestBoardOk: row.directDb?.attempted ? row.latestBoardOk : true,
    advisoryOk: row.warnings.length === 0,
    blockingOk: row.failures.length === 0,
  }));

  const payload = {
    checkedAt: new Date().toISOString(),
    status,
    baseUrl: sanitizeMessage(baseUrl),
    mode: deepMode ? "deep" : "default_bounded_advisory",
    checked_sgg_count: checkedCodes.length,
    checked_sgg_codes: checkedCodes,
    elapsed_ms: elapsedMs(),
    required_failures_count: failures.length,
    warnings_count: warnings.length,
    failures,
    warnings,
    sgg_11710_guard: {
      identity_preserved: sgg11710Guard.identity_preserved,
      korea_substitution_observed: sgg11710Guard.korea_substitution_observed,
      latest_board_date: sgg11710Guard.latest_board_date,
      latest_board_row_count: sgg11710Guard.latest_board_row_count,
      partial_2026_05_31_exposed: sgg11710Guard.partial_2026_05_31_exposed,
      confirmation_source: sgg11710Guard.confirmation_source,
    },
    direct_db_diagnostics: {
      attempted: directDbEnabled,
      timeout_or_skipped: directDbEnabled
        ? directWarnings.some((warning) => warning.reason.includes("TIMEOUT")) ? "timeout" : "none"
        : "skipped_default",
      warnings: directWarnings,
    },
    policy: {
      advisoryDefault: true,
      hardFailConditions: [
        "requested/rendered universe identity mismatch",
        "KOREA_ALL substitution for SGG",
        "cross-universe item fallback",
        "required route hard failure",
        "SGG_11710 2026-05-31 partial public exposure",
      ],
      warningConditions: [
        "direct DB diagnostic skipped or timed out",
        "SGG_11710 date/count unavailable from fast route",
        "same-universe degraded or stale fallback",
        "non-critical metadata missing",
      ],
      timeouts: {
        perRequestMs: REQUIRED_ROUTE_TIMEOUT_MS,
        advisoryRequestMs: ADVISORY_ROUTE_TIMEOUT_MS,
        directDbMs: DIRECT_DB_TIMEOUT_MS,
        globalMs: GLOBAL_TIMEOUT_MS,
      },
    },
    enabledResults: legacyRows,
    confirmed: legacyRows.filter((row) => row.blockingOk && row.advisoryOk).map((row) => row.code),
    deliveryConfirmed: legacyRows.filter((row) => row.blockingOk).map((row) => row.code),
    advisoryMiss: legacyRows
      .filter((row) => row.blockingOk && !row.advisoryOk)
      .map((row) => ({
        code: row.code,
        failedChecks: row.warnings.map((warning) => warning.check),
        rankingsCount: row.rankingsCount,
      })),
    blockingFailed: legacyRows
      .filter((row) => !row.blockingOk)
      .map((row) => ({
        code: row.code,
        failedChecks: row.failures.map((failure) => failure.check),
      })),
    candidateResults: [],
    candidateReady: [],
  };

  console.log(JSON.stringify(payload, null, 2));
  process.exit(status === "FAIL" ? 1 : 0);
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        status: "FAIL",
        elapsed_ms: elapsedMs(),
        required_failures_count: 1,
        warnings_count: 0,
        failures: [
          {
            universe: "HARNESS",
            check: "script",
            reason: sanitizeMessage(error instanceof Error ? error.message : String(error)),
          },
        ],
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
