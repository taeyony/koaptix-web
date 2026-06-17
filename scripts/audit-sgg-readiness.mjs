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
const REQUIRED_SGG_CODES = [
  "SGG_11710",
  "SGG_11680",
  "SGG_41135",
  "SGG_52111",
  "SGG_52113",
];
const HELD_FALLBACK_CHECKS = [
  { code: "SGG_51150", expectedCode: "KOREA_ALL", contexts: ["required", "api-all"] },
  { code: "JEONBUK_ALL", expectedCode: "KOREA_ALL", contexts: ["required"] },
];
const REQUIRED_MACRO_CHECKS = [
  { code: "KOREA_ALL", expectedCode: "KOREA_ALL", checks: ["rankings", "map", "search"] },
];
const HOLD_SGG_CODES = new Set(["SGG_51150"]);
const VALID_SCOPES = new Set(["required", "api-all", "deep", "extended"]);
const VALID_CHECKS = new Set(["rankings", "map", "search", "direct-db"]);

const REQUIRED_ROUTE_TIMEOUT_MS = readNumberEnv("KOAPTIX_AUDIT_REQUEST_TIMEOUT_MS", 7_000);
const ADVISORY_ROUTE_TIMEOUT_MS = readNumberEnv("KOAPTIX_AUDIT_ADVISORY_TIMEOUT_MS", 8_000);
const DIRECT_DB_TIMEOUT_MS = readNumberEnv("KOAPTIX_AUDIT_DIRECT_DB_TIMEOUT_MS", 5_000);
const GLOBAL_TIMEOUT_MS = readNumberEnv("KOAPTIX_AUDIT_GLOBAL_TIMEOUT_MS", 120_000);
const CONCURRENCY = readNumberEnv("KOAPTIX_AUDIT_CONCURRENCY", 3);
const DEFAULT_MAX_SGG = readNumberEnv("KOAPTIX_AUDIT_SGG_MAX", 10);

const baseUrl = normalizeBaseUrl(process.env.KOAPTIX_SMOKE_BASE_URL || DEFAULT_BASE_URL);
const legacyDeepMode = process.env.KOAPTIX_AUDIT_SGG_DEEP === "1";
const auditScope = normalizeAuditScope(process.env.KOAPTIX_AUDIT_SCOPE, legacyDeepMode);
const selectedChecks = resolveSelectedChecks(auditScope);
const requestedSggCodes = readCsvEnv("KOAPTIX_AUDIT_SGG_CODES");
const chunkConfig = readChunkConfig("KOAPTIX_AUDIT_CHUNK_INDEX", "KOAPTIX_AUDIT_CHUNK_TOTAL");
const directDbEnabled = selectedChecks.has("direct-db") && (
  process.env.KOAPTIX_AUDIT_DIRECT_DB === "1" ||
  legacyDeepMode ||
  auditScope === "deep" ||
  auditScope === "extended"
);
const directLatestDbEnabled = process.env.KOAPTIX_AUDIT_LATEST_DB === "1";
const skippedExtended = auditScope === "required" || auditScope === "api-all";
const startedAt = performance.now();
const deadlineAt = Date.now() + GLOBAL_TIMEOUT_MS;
const routeSamples = [];

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function readNumberEnv(name, fallback) {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return Math.trunc(raw);
}

function readCsvEnv(name) {
  return String(process.env[name] || "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
}

function normalizeAuditScope(rawValue, deepMode) {
  const raw = String(rawValue || "").trim().toLowerCase();
  if (VALID_SCOPES.has(raw)) return raw;
  return deepMode ? "deep" : "default";
}

function resolveSelectedChecks(scope) {
  const requested = readCsvEnv("KOAPTIX_AUDIT_CHECKS").map((value) => value.toLowerCase());
  const validRequested = requested.filter((check) => VALID_CHECKS.has(check));
  if (validRequested.length > 0) return new Set(validRequested);

  if (scope === "api-all") return new Set(["rankings", "map"]);
  if (scope === "required") return new Set(["rankings", "map", "search"]);
  if (scope === "deep") return new Set(["rankings", "map", "search", "direct-db"]);
  if (scope === "extended") return new Set(["rankings", "map", "search"]);
  return new Set(["rankings", "map", "search", "direct-db"]);
}

function readChunkConfig(indexName, totalName) {
  const index = Number(process.env[indexName]);
  const total = Number(process.env[totalName]);
  if (!Number.isInteger(index) || !Number.isInteger(total) || index < 1 || total < 1) {
    return { enabled: false, index: null, total: null };
  }
  if (index > total) {
    return { enabled: true, index, total, emptyReason: "chunk_index_greater_than_total" };
  }
  return { enabled: true, index, total };
}

function applyChunk(items, chunk) {
  if (!chunk.enabled) return items;
  if (chunk.emptyReason) return [];
  return items.filter((_, index) => index % chunk.total === chunk.index - 1);
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
    .slice(0, 260);
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

function readRegistryBlocks(name) {
  const raw = readFileSync(join(process.cwd(), "src/lib/koaptix/universes.ts"), "utf8");
  const start = raw.indexOf(`const ${name}`);
  if (start < 0) return [];
  const end = raw.indexOf("];", start);
  const block = end > start ? raw.slice(start, end) : raw.slice(start);
  return [...block.matchAll(/\{\s*code:\s*"(?<code>[A-Z]+_ALL|SGG_\d+)"[\s\S]*?\n\s*\}/g)]
    .map((match) => match[0]);
}

function parseRegistryEntry(block) {
  const textField = (name) => block.match(new RegExp(`${name}:\\s*"([^"]+)"`))?.[1] ?? "";
  const boolField = (name) => block.match(new RegExp(`${name}:\\s*(true|false)`))?.[1] === "true";
  const numberField = (name) => Number(block.match(new RegExp(`${name}:\\s*(\\d+)`))?.[1] ?? 0);
  return {
    code: textField("code"),
    label: textField("label") || textField("code"),
    scope: textField("scope"),
    exposureStatus: textField("exposureStatus") || "public",
    enabled: boolField("enabled"),
    homeEnabled: boolField("homeEnabled"),
    searchEnabled: boolField("searchEnabled"),
    rankingEnabled: boolField("rankingEnabled"),
    mapEnabled: boolField("mapEnabled"),
    order: numberField("order"),
  };
}

function isServiceExposed(item) {
  return (
    item.enabled &&
    item.exposureStatus !== "hold" &&
    item.exposureStatus !== "disabled" &&
    !HOLD_SGG_CODES.has(item.code)
  );
}

function readSggRegistry() {
  return readRegistryBlocks("SGG_UNIVERSE_REGISTRY")
    .map(parseRegistryEntry)
    .filter((item) => item.code.startsWith("SGG_"));
}

function readEnabledSggRegistry() {
  return readSggRegistry().filter(isServiceExposed);
}

function chooseAuditSggs(enabledSggs) {
  const byCode = new Map(enabledSggs.map((item) => [item.code, item]));
  let selected = [];

  if (requestedSggCodes.length > 0) {
    selected = requestedSggCodes.map((code) => byCode.get(code)).filter(Boolean);
  } else if (auditScope === "api-all" || auditScope === "deep" || auditScope === "extended") {
    selected = enabledSggs;
  } else if (auditScope === "required") {
    selected = REQUIRED_SGG_CODES.map((code) => byCode.get(code)).filter(Boolean);
  } else {
    selected = DEFAULT_VISIBLE_SGG_CODES.map((code) => byCode.get(code)).filter(Boolean).slice(0, DEFAULT_MAX_SGG);
  }

  return applyChunk(selected, chunkConfig);
}

async function fetchJson(path, timeoutMs, checkName, universe) {
  const controller = new AbortController();
  const boundedTimeoutMs = Math.max(1, Math.min(timeoutMs, remainingGlobalMs() || timeoutMs));
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

    const result = {
      ok: response.ok,
      status: response.status,
      ms: Math.round(performance.now() - started),
      json,
      error: null,
    };
    recordRouteSample(universe, checkName, result);
    return result;
  } catch (error) {
    const result = {
      ok: false,
      status: 0,
      ms: Math.round(performance.now() - started),
      json: null,
      error: {
        code: error instanceof Error && error.name === "AbortError" ? "HTTP_TIMEOUT" : "HTTP_ERROR",
        message: sanitizeMessage(error instanceof Error ? error.message : `${checkName} failed`),
      },
    };
    recordRouteSample(universe, checkName, result);
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

function recordRouteSample(universe, check, result) {
  routeSamples.push({
    universe,
    check,
    status: result.status,
    ms: result.ms,
    ok: result.ok,
  });
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
    }, Math.max(1, Math.min(timeoutMs, remainingGlobalMs() || timeoutMs)));
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
  return { universe, check, reason };
}

function routeWarning(universe, check, reason) {
  return { universe, check, reason };
}

function evaluateIdentityRoute({
  requestedCode,
  expectedCode,
  check,
  response,
  required = true,
  allowEmpty = false,
}) {
  const warnings = [];
  const failures = [];
  const payload = response.json;
  const failureSink = required ? failures : warnings;

  if (!response.ok || !payload || typeof payload !== "object") {
    const reason = response.error?.code === "HTTP_TIMEOUT"
      ? `timeout after ${response.ms}ms`
      : `http_status=${response.status}`;
    failureSink.push(routeFailure(requestedCode, check, reason));
    return { ok: false, warnings, failures, payload, count: 0 };
  }

  const requestedUniverse = getRequestedUniverse(payload, expectedCode);
  const renderedUniverse = getRenderedUniverse(payload, expectedCode);
  const items = getItems(payload);
  const count = getCount(payload);

  if (requestedUniverse !== expectedCode || renderedUniverse !== expectedCode) {
    failures.push(routeFailure(
      requestedCode,
      check,
      `identity_mismatch requested=${requestedUniverse} rendered=${renderedUniverse} expected=${expectedCode}`,
    ));
  }

  if (hasCrossUniverseItems(items, expectedCode)) {
    failures.push(routeFailure(requestedCode, check, `cross_universe_items_expected=${expectedCode}`));
  }

  if (count <= 0 && required && !allowEmpty) {
    failures.push(routeFailure(requestedCode, check, "empty_required_payload"));
  }

  for (const field of ["source", "cacheState", "fallbackMode"]) {
    if (!(field in payload)) {
      warnings.push(routeWarning(requestedCode, check, `missing_${field}`));
    }
  }

  if (payload.fallbackMode && payload.fallbackMode !== "none") {
    warnings.push(routeWarning(requestedCode, check, `fallbackMode=${payload.fallbackMode}`));
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
  if (universeCode === "KOREA_ALL") return "강남";
  if (universeCode === "SGG_11710") return "잠실";
  return "아파트";
}

async function runRouteCheck({ code, expectedCode, check, rankingsPayload = null, required = true }) {
  if (check === "rankings") {
    const response = await fetchJson(
      `/api/rankings?universe_code=${encodeURIComponent(code)}&limit=20`,
      REQUIRED_ROUTE_TIMEOUT_MS,
      check,
      code,
    );
    return evaluateIdentityRoute({ requestedCode: code, expectedCode, check, response, required });
  }

  if (check === "map") {
    const response = await fetchJson(
      `/api/map?universe_code=${encodeURIComponent(code)}&limit=32`,
      REQUIRED_ROUTE_TIMEOUT_MS,
      check,
      code,
    );
    return evaluateIdentityRoute({ requestedCode: code, expectedCode, check, response, required });
  }

  if (check === "search") {
    const searchQuery = findSearchQuery(rankingsPayload, expectedCode);
    const response = await fetchJson(
      `/api/search?universe_code=${encodeURIComponent(code)}&q=${encodeURIComponent(searchQuery)}&limit=12`,
      REQUIRED_ROUTE_TIMEOUT_MS,
      check,
      code,
    );
    return evaluateIdentityRoute({ requestedCode: code, expectedCode, check, response, required });
  }

  return {
    ok: true,
    warnings: [routeWarning(code, check, "unknown_check_skipped")],
    failures: [],
    payload: null,
    count: 0,
  };
}

async function readDirectDiagnostics(supabase, universeCode) {
  if (!directDbEnabled) {
    return {
      attempted: false,
      timeout_or_skipped: "skipped_default",
      snapshotOk: true,
      latestBoardOk: true,
      dynamicBoardOk: null,
      warnings: selectedChecks.has("direct-db")
        ? [routeWarning(universeCode, "direct_db", "direct_db_skipped_default")]
        : [],
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
    universe,
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
  const expectedCode = universe;
  const failures = [];
  const warnings = [];
  const checkResults = {};

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

  let rankingsPayload = null;
  if (selectedChecks.has("rankings")) {
    const rankings = await runRouteCheck({ code: universe, expectedCode, check: "rankings" });
    checkResults.rankings = rankings;
    rankingsPayload = rankings.payload;
    failures.push(...rankings.failures);
    warnings.push(...rankings.warnings);
  }

  if (selectedChecks.has("map")) {
    const map = await runRouteCheck({ code: universe, expectedCode, check: "map" });
    checkResults.map = map;
    failures.push(...map.failures);
    warnings.push(...map.warnings);
  }

  if (selectedChecks.has("search")) {
    const search = await runRouteCheck({
      code: universe,
      expectedCode,
      check: "search",
      rankingsPayload,
      required: auditScope === "required",
    });
    checkResults.search = search;
    failures.push(...search.failures);
    warnings.push(...search.warnings);
  }

  const directDb = selectedChecks.has("direct-db")
    ? await readDirectDiagnostics(supabase, universe)
    : await readDirectDiagnostics(null, universe);
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
    rankingsOk: selectedChecks.has("rankings") ? checkResults.rankings?.ok === true : true,
    rankingsStatus: findRouteStatus(universe, "rankings"),
    rankingsCount: checkResults.rankings?.count ?? null,
    mapOk: selectedChecks.has("map") ? checkResults.map?.ok === true : true,
    mapOperationalOk: selectedChecks.has("map") ? checkResults.map?.ok === true : true,
    mapOperationalStatus: findRouteStatus(universe, "map"),
    mapStatus: findRouteStatus(universe, "map"),
    mapCount: checkResults.map?.count ?? null,
    searchOk: selectedChecks.has("search") ? checkResults.search?.failures?.length === 0 : true,
    searchStatus: findRouteStatus(universe, "search"),
    searchLocalCount: checkResults.search?.count ?? null,
    searchGlobalCount: Array.isArray(checkResults.search?.payload?.globalItems)
      ? checkResults.search.payload.globalItems.length
      : null,
    rankingPageOk: true,
    rankingPageStatus: null,
    sampleName: findSearchQuery(rankingsPayload, universe),
    blockingOk,
    advisoryOk,
    auditClass: blockingOk ? (advisoryOk ? "confirmed" : "delivery-confirmed-advisory-warnings") : "blocking-fail",
    failures,
    warnings,
    directDb,
  };
}

function findRouteStatus(universe, check) {
  return [...routeSamples].reverse().find((sample) => sample.universe === universe && sample.check === check)?.status ?? null;
}

async function auditRequiredControlRoutes() {
  const results = [];
  const routeChecks = [];

  for (const spec of HELD_FALLBACK_CHECKS) {
    if (spec.contexts.includes(auditScope)) {
      const checks = selectedChecks.has("search") && auditScope === "required"
        ? ["rankings", "map", "search"]
        : ["rankings", "map"].filter((check) => selectedChecks.has(check));
      routeChecks.push({ ...spec, checks, required: true, kind: "fallback" });
    }
  }

  if (auditScope === "required") {
    routeChecks.push(...REQUIRED_MACRO_CHECKS.map((spec) => ({ ...spec, required: true, kind: "macro" })));
  }

  for (const spec of routeChecks) {
    let rankingsPayload = null;
    const failures = [];
    const warnings = [];
    const checkResults = {};
    for (const check of spec.checks) {
      const result = await runRouteCheck({
        code: spec.code,
        expectedCode: spec.expectedCode,
        check,
        rankingsPayload,
        required: true,
      });
      checkResults[check] = result;
      if (check === "rankings") rankingsPayload = result.payload;
      failures.push(...result.failures);
      warnings.push(...result.warnings);
    }

    results.push({
      code: spec.code,
      expectedCode: spec.expectedCode,
      kind: spec.kind,
      checks: spec.checks,
      blockingOk: failures.length === 0,
      advisoryOk: warnings.length === 0,
      failures,
      warnings,
      counts: {
        rankings: checkResults.rankings?.count ?? null,
        map: checkResults.map?.count ?? null,
        search: checkResults.search?.count ?? null,
      },
    });
  }

  return results;
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

  const workers = Array.from({ length: Math.min(limit, items.length || 1) }, () => worker());
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

function slowestRouteSamples(limit = 12) {
  return [...routeSamples]
    .sort((a, b) => b.ms - a.ms)
    .slice(0, limit);
}

async function main() {
  const allSggs = readSggRegistry();
  const enabledSggs = readEnabledSggRegistry();
  const selectedSggs = chooseAuditSggs(enabledSggs);
  const supabase = buildSupabaseClientIfNeeded();
  const globalWarnings = [];

  const requestedButNotServiceExposed = requestedSggCodes.filter(
    (code) => code.startsWith("SGG_") && !enabledSggs.some((item) => item.code === code),
  );
  for (const code of requestedButNotServiceExposed) {
    const registryItem = allSggs.find((item) => item.code === code);
    globalWarnings.push(routeWarning(
      code,
      "selection",
      registryItem ? `not_service_exposed:${registryItem.exposureStatus}` : "unknown_sgg_code",
    ));
  }

  if (chunkConfig.emptyReason) {
    globalWarnings.push(routeWarning("ALL", "chunk", chunkConfig.emptyReason));
  }

  const enabledResults = await mapWithConcurrency(
    selectedSggs,
    CONCURRENCY,
    (item) => auditOne(item, supabase),
  );

  if (isGlobalTimedOut()) {
    globalWarnings.push(routeWarning("ALL", "global_timeout", "WARN_GLOBAL_TIMEOUT"));
  }

  const controlResults = await auditRequiredControlRoutes();

  let sgg11710Guard = {
    warnings: [],
    identity_preserved: null,
    korea_substitution_observed: null,
    latest_board_date: null,
    latest_board_row_count: null,
    partial_2026_05_31_exposed: null,
    confirmation_source: "skipped_in_fast_scope",
  };
  if (auditScope === "default" || auditScope === "deep" || auditScope === "extended") {
    sgg11710Guard = await readSgg11710FullBoardGuard();
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
  }

  const failures = [
    ...enabledResults.flatMap((row) => row.failures),
    ...controlResults.flatMap((row) => row.failures),
  ];
  const warnings = [
    ...globalWarnings,
    ...enabledResults.flatMap((row) => row.warnings),
    ...controlResults.flatMap((row) => row.warnings),
  ];
  const status = failures.length > 0
    ? "FAIL_REQUIRED"
    : warnings.length > 0
      ? "PASS_WITH_WARNINGS"
      : "PASS";
  const checkedCodes = selectedSggs.map((item) => item.code);
  const directWarnings = warnings.filter((warning) => warning.check.startsWith("direct_") || warning.check === "direct_db");

  const legacyRows = enabledResults.map((row) => ({
    ...row,
    snapshotOk: row.directDb?.attempted ? row.snapshotOk : true,
    latestBoardOk: row.directDb?.attempted ? row.latestBoardOk : true,
    advisoryOk: row.warnings.length === 0,
    blockingOk: row.failures.length === 0,
  }));

  const payload = {
    checkedAt: new Date().toISOString(),
    status,
    baseUrl: sanitizeMessage(baseUrl),
    mode: auditScope,
    scope: auditScope,
    selected_checks: Array.from(selectedChecks),
    checked_sgg_count: checkedCodes.length,
    service_exposed_sgg_count: enabledSggs.length,
    checked_sgg_codes: checkedCodes,
    chunk: chunkConfig.enabled
      ? { index: chunkConfig.index, total: chunkConfig.total, empty_reason: chunkConfig.emptyReason ?? null }
      : null,
    elapsed_ms: elapsedMs(),
    required_failures_count: failures.length,
    warnings_count: warnings.length,
    route_timing_slowest: slowestRouteSamples(),
    skipped_extended: skippedExtended,
    skipped_extended_status: skippedExtended ? "SKIPPED_EXTENDED" : "NOT_SKIPPED",
    failures,
    warnings,
    required_control_results: controlResults,
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
        "held SGG or disabled macro exposure instead of KOREA_ALL fallback",
        "cross-universe item leakage",
        "required route hard failure",
        "empty required route payload",
        "SGG_11710 2026-05-31 partial public exposure when advisory guard is enabled",
      ],
      warningConditions: [
        "direct DB diagnostic skipped or timed out",
        "same-universe degraded or stale fallback",
        "non-critical metadata missing",
        "selection requested a non-service-exposed SGG",
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
  process.exit(status === "FAIL_REQUIRED" ? 1 : 0);
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        status: "FAIL_REQUIRED",
        scope: auditScope,
        selected_checks: Array.from(selectedChecks),
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
