#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

const DEFAULT_BASE_URL = "http://localhost:3000";
const RECENT_STAGED_SGG_MIN_ORDER = 125;
const REQUEST_TIMEOUT_MS = readNumberEnv("KOAPTIX_REGIONAL_SMOKE_TIMEOUT_MS", 20_000);
const MAX_ATTEMPTS = readNumberEnv("KOAPTIX_REGIONAL_SMOKE_RETRY", 3);
const HOLD_SGG_CODES = new Set(["SGG_51150"]);

const baseUrl = normalizeBaseUrl(
  process.env.KOAPTIX_SMOKE_BASE_URL || process.argv[2] || DEFAULT_BASE_URL,
);
const mode = normalizeMode(process.env.KOAPTIX_REGIONAL_SMOKE_MODE);
const requestedCodes = readCsvEnv("KOAPTIX_REGIONAL_SMOKE_CODES");
const chunkConfig = readChunkConfig(
  "KOAPTIX_REGIONAL_SMOKE_CHUNK_INDEX",
  "KOAPTIX_REGIONAL_SMOKE_CHUNK_TOTAL",
);
const apiOnly = process.env.KOAPTIX_REGIONAL_SMOKE_API_ONLY === "1";
const skipPage = apiOnly || process.env.KOAPTIX_REGIONAL_SMOKE_SKIP_PAGE === "1";
const skipSearch = apiOnly || process.env.KOAPTIX_REGIONAL_SMOKE_SKIP_SEARCH === "1";
const startedAt = performance.now();
const routeSamples = [];

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function normalizeMode(value) {
  return String(value || "required").trim().toLowerCase() === "extended"
    ? "extended"
    : "required";
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

function sanitizeMessage(value) {
  return String(value ?? "")
    .replace(/https?:\/\/[^\s"'<>]+/g, "[redacted-url]")
    .replace(/([A-Za-z0-9_-]{24,})/g, "[redacted-token]")
    .slice(0, 280);
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

function readRegistry() {
  return [
    ...readRegistryBlocks("MACRO_UNIVERSE_REGISTRY"),
    ...readRegistryBlocks("SGG_UNIVERSE_REGISTRY"),
  ].map(parseRegistryEntry);
}

function isServiceExposed(item) {
  return (
    item.enabled &&
    item.exposureStatus !== "hold" &&
    item.exposureStatus !== "disabled" &&
    !HOLD_SGG_CODES.has(item.code)
  );
}

const registry = readRegistry();
const registryByCode = new Map(registry.map((item) => [item.code, item]));

function getRegistryItem(code) {
  return registryByCode.get(code) ?? {
    code,
    label: code,
    scope: code.startsWith("SGG_") ? "SIGUNGU" : "MACRO",
    enabled: false,
    exposureStatus: "unknown",
    order: 0,
  };
}

function makeSpec(code, options = {}) {
  const item = getRegistryItem(code);
  const expectedCode = options.expectedCode ?? code;
  return {
    step: options.step ?? code,
    code,
    expectedCode,
    expectedUrlCode: options.expectedUrlCode ?? code,
    label: options.label ?? item.label ?? code,
    title: options.title ?? `KOAPTIX ${code}`,
    required: options.required ?? false,
    skipPage: options.skipPage ?? false,
    skipHtmlIdentity: options.skipHtmlIdentity ?? false,
    searchRequired: options.searchRequired ?? false,
    kind: options.kind ?? item.scope ?? "UNKNOWN",
  };
}

function fallbackSpec(code, required = true) {
  return makeSpec(code, {
    step: `${code}_FALLBACK`,
    expectedCode: "KOREA_ALL",
    expectedUrlCode: code,
    required,
    skipPage: true,
    skipHtmlIdentity: true,
    searchRequired: false,
    kind: "fallback",
  });
}

function buildRequiredSpecs() {
  return [
    makeSpec("KOREA_ALL", { required: true, searchRequired: true, skipHtmlIdentity: true }),
    makeSpec("SEOUL_ALL", { required: true, skipHtmlIdentity: true }),
    makeSpec("BUSAN_ALL", { required: true, skipHtmlIdentity: true }),
    makeSpec("GYEONGGI_ALL", { required: true, skipHtmlIdentity: true }),
    fallbackSpec("SGG_51150"),
    fallbackSpec("JEONBUK_ALL"),
    makeSpec("SGG_52111", { required: true, skipHtmlIdentity: true }),
    makeSpec("SGG_52113", { required: true, skipHtmlIdentity: true }),
    makeSpec("SGG_11710", { required: true, skipHtmlIdentity: true }),
  ];
}

function buildExtendedSpecs() {
  const macroSpecs = [
    makeSpec("BUSAN_ALL", { step: "BUSAN_ALL" }),
    makeSpec("ULSAN_ALL", { step: "ULSAN_ALL" }),
    makeSpec("GWANGJU_ALL", { step: "GWANGJU_ALL" }),
    makeSpec("DAEJEON_ALL", { step: "DAEJEON_ALL" }),
    makeSpec("BUSAN_ALL", { step: "BUSAN_ALL_RETURN" }),
  ];
  const baseSggCodes = [
    "SGG_11710",
    "SGG_41135",
    "SGG_11110",
    "SGG_11140",
    "SGG_11215",
    "SGG_11260",
    "SGG_11305",
    "SGG_11320",
  ];
  const recentSggCodes = registry
    .filter((item) => item.code.startsWith("SGG_") && isServiceExposed(item) && item.order >= RECENT_STAGED_SGG_MIN_ORDER)
    .map((item) => item.code);
  const sggSpecs = mergeUniqueCodes([...baseSggCodes, ...recentSggCodes])
    .map((code) => makeSpec(code, { step: `SGG_ENABLED_${code}` }));

  return [
    fallbackSpec("SGG_51150"),
    fallbackSpec("JEONBUK_ALL"),
    ...macroSpecs,
    ...sggSpecs,
  ];
}

function mergeUniqueCodes(codes) {
  const seen = new Set();
  return codes.filter((code) => {
    if (seen.has(code)) return false;
    seen.add(code);
    return true;
  });
}

function selectSpecs() {
  const allSpecs = mode === "extended" ? buildExtendedSpecs() : buildRequiredSpecs();

  if (requestedCodes.length === 0) {
    return applyChunk(allSpecs, chunkConfig);
  }

  const specsByCode = new Map();
  for (const spec of allSpecs) {
    if (!specsByCode.has(spec.code)) specsByCode.set(spec.code, spec);
  }

  const filtered = requestedCodes
    .map((code) => {
      if (code === "SGG_51150" || code === "JEONBUK_ALL") return fallbackSpec(code);
      return specsByCode.get(code) ?? makeSpec(code, {
        required: mode === "required",
        skipHtmlIdentity: mode === "required",
      });
    })
    .filter(Boolean);

  return applyChunk(filtered, chunkConfig);
}

function buildUrl(path) {
  return `${baseUrl}${path}`;
}

async function fetchPayload(path, options = {}) {
  const accept = options.accept ?? "application/json";
  let last = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const result = await fetchOnce(path, { ...options, accept });
    last = result;

    if (result.ok || ![500, 502, 503, 504].includes(result.status)) {
      return result;
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
    }
  }

  return last;
}

async function fetchOnce(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const started = performance.now();
  const url = buildUrl(path);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: options.accept ?? "*/*" },
    });
    const text = await response.text();
    let json = null;
    if ((options.accept ?? "").includes("json")) {
      try {
        json = JSON.parse(text);
      } catch {
        // Preserve a non-JSON failure as a bounded diagnostic.
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      ms: Math.round(performance.now() - started),
      finalUrl: response.url,
      text,
      json,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      ms: Math.round(performance.now() - started),
      finalUrl: url,
      text: "",
      json: null,
      error: error instanceof Error && error.name === "AbortError"
        ? "HTTP_TIMEOUT"
        : sanitizeMessage(error instanceof Error ? error.message : String(error)),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function recordRouteSample(step, code, check, result) {
  routeSamples.push({
    step,
    universe: code,
    check,
    status: result.status,
    ms: result.ms,
    ok: result.ok,
  });
}

function extractCurrentUniverseLabel(html) {
  const testIdMatch = html.match(
    /data-testid="current-universe-label"[^>]*>([^<]+)<\/p>/,
  );
  if (testIdMatch?.[1]) return decodeHtml(testIdMatch[1]);

  const anchor = html.indexOf("Current Universe");
  if (anchor >= 0) {
    const slice = html.slice(anchor, anchor + 900);
    const match = slice.match(/<p class="[^"]*truncate[^"]*text-sm[^"]*">([^<]+)<\/p>/);
    if (match?.[1]) return decodeHtml(match[1]);
  }

  return extractActiveUniverseSelectorLabel(html);
}

function extractActiveUniverseSelectorLabel(html) {
  const boardAnchor = html.indexOf("KOAPTIX 500 Rankings");
  if (boardAnchor < 0) return "";

  const boardSlice = html.slice(boardAnchor, boardAnchor + 20_000);
  const activeButtonMatch = boardSlice.match(
    /<button\b(?=[^>]*\baria-pressed="true")[^>]*>([\s\S]*?)<\/button>/,
  );

  if (!activeButtonMatch?.[1]) return "";

  return decodeHtml(activeButtonMatch[1].replace(/<[^>]*>/g, "").trim());
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}

function getUrlUniverse(finalUrl) {
  try {
    return new URL(finalUrl).searchParams.get("universe") || "";
  } catch {
    return "";
  }
}

function getItemUniverse(item) {
  return item?.universeCode || item?.universe_code || "";
}

function findStaleUniverse(items, expectedCode) {
  return (items ?? [])
    .map(getItemUniverse)
    .find((code) => code && code !== expectedCode) || "";
}

function getPayloadUniverse(payload, fallbackCode) {
  return payload?.renderedUniverseCode ?? payload?.universeCode ?? payload?.universe_code ?? fallbackCode;
}

function getPayloadRequestedUniverse(payload, fallbackCode) {
  return payload?.requestedUniverseCode ?? payload?.universeCode ?? payload?.universe_code ?? fallbackCode;
}

function getPayloadItems(payload) {
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.localItems)) return payload.localItems;
  return [];
}

function getPayloadCount(payload) {
  return Number(payload?.resultCount ?? payload?.count ?? payload?.items?.length ?? payload?.localItems?.length ?? 0);
}

function makeFailure({
  step,
  expectedCode,
  urlUniverse = "",
  currentUniverseLabel = "",
  mapIdentity = "UNKNOWN",
  chartRequested = "",
  chartRendered = "",
  rankingsIdentity = "UNKNOWN",
  visibleError = "NONE",
  notes = "",
}) {
  return [
    "[REGIONAL_IDENTITY_SMOKE_FAIL]",
    `step=${step}`,
    `expected_universe=${expectedCode}`,
    `url_universe=${urlUniverse || "EMPTY"}`,
    `current_universe_label=${currentUniverseLabel || "EMPTY"}`,
    `map_identity=${mapIdentity}`,
    `chart_requested=${chartRequested || "EMPTY"}`,
    `chart_rendered=${chartRendered || "EMPTY"}`,
    `rankings_identity=${rankingsIdentity}`,
    `visible_error=${visibleError || "NONE"}`,
    `notes=${notes || "NONE"}`,
  ].join("\n");
}

function evaluateJsonIdentity({ spec, check, payload, required, allowEmpty = false }) {
  const failures = [];
  const warnings = [];

  if (!payload || typeof payload !== "object") {
    (required ? failures : warnings).push(`${check}:missing_json_payload`);
    return { ok: false, failures, warnings, count: 0, identity: "MISSING" };
  }

  const requested = getPayloadRequestedUniverse(payload, spec.expectedCode);
  const rendered = getPayloadUniverse(payload, spec.expectedCode);
  const count = getPayloadCount(payload);
  const items = getPayloadItems(payload);
  const staleUniverse = findStaleUniverse(items, spec.expectedCode);

  if (requested !== spec.expectedCode || rendered !== spec.expectedCode) {
    failures.push(`${check}:identity_mismatch requested=${requested} rendered=${rendered}`);
  }

  if (staleUniverse) {
    failures.push(`${check}:stale_item_universe=${staleUniverse}`);
  }

  if (count <= 0 && required && !allowEmpty) {
    failures.push(`${check}:empty_required_payload`);
  } else if (count <= 0 && !allowEmpty) {
    warnings.push(`${check}:empty_payload`);
  }

  if (payload.fallbackMode && payload.fallbackMode !== "none") {
    warnings.push(`${check}:fallbackMode=${payload.fallbackMode}`);
  }

  return {
    ok: failures.length === 0,
    failures,
    warnings,
    count,
    identity: failures.length === 0 ? (count > 0 || allowEmpty ? "OK" : "EMPTY") : "STALE",
  };
}

function findSearchQuery(rankingsPayload, expectedCode) {
  const firstName = rankingsPayload?.items?.[0]?.name ?? rankingsPayload?.items?.[0]?.apt_name_ko;
  if (firstName) return firstName;
  if (expectedCode === "KOREA_ALL") return "강남";
  if (expectedCode === "SGG_11710") return "잠실";
  return "아파트";
}

async function checkStep(spec) {
  const stepStarted = performance.now();
  const failures = [];
  const warnings = [];
  const pageShouldSkip = skipPage || spec.skipPage;
  let pageStatus = "SKIPPED";
  let urlUniverse = "";
  let currentUniverseLabel = "";
  let chartRendered = "SKIPPED";
  let visibleError = "NONE";

  if (!pageShouldSkip) {
    const page = await fetchPayload(`/?universe=${encodeURIComponent(spec.code)}`, { accept: "text/html" });
    recordRouteSample(spec.step, spec.code, "page", page);
    pageStatus = page.ok ? "OK" : `HTTP_${page.status || page.error}`;
    urlUniverse = getUrlUniverse(page.finalUrl);

    if (!page.ok) {
      failures.push(`page:${pageStatus}`);
    } else {
      currentUniverseLabel = extractCurrentUniverseLabel(page.text);
      visibleError = page.text.includes("signal is aborted without reason")
        ? "signal is aborted without reason"
        : "NONE";

      if (urlUniverse && urlUniverse !== spec.expectedUrlCode) {
        failures.push(`page:url_universe=${urlUniverse}`);
      }

      if (!spec.skipHtmlIdentity) {
        const htmlHasExpectedIdentity =
          page.text.includes(spec.title) ||
          page.text.includes(spec.label) ||
          page.text.includes(spec.expectedCode) ||
          page.text.includes(spec.code);
        const hasMarketIndex = page.text.includes("Market Index");
        const hasKoreaChartTitle = page.text.includes("KOAPTIX KOREA");
        const allowedKorea = spec.expectedCode === "KOREA_ALL";
        chartRendered = htmlHasExpectedIdentity
          ? spec.expectedCode
          : hasKoreaChartTitle
            ? "KOREA_ALL"
            : "UNKNOWN";

        if (hasMarketIndex && !htmlHasExpectedIdentity && !(allowedKorea && hasKoreaChartTitle)) {
          failures.push(`html:market_chart_identity=${chartRendered}`);
        }
      } else {
        chartRendered = "HTML_IDENTITY_SKIPPED";
      }

      if (visibleError !== "NONE") {
        failures.push(`page:visible_error=${visibleError}`);
      }
    }
  }

  const mapPayload = await fetchPayload(
    `/api/map?universe_code=${encodeURIComponent(spec.code)}&limit=20`,
    { accept: "application/json" },
  );
  recordRouteSample(spec.step, spec.code, "map", mapPayload);
  if (!mapPayload.ok) {
    failures.push(`map:http_${mapPayload.status || mapPayload.error}`);
  }
  const mapResult = evaluateJsonIdentity({
    spec,
    check: "map",
    payload: mapPayload.json,
    required: true,
  });
  failures.push(...mapResult.failures);
  warnings.push(...mapResult.warnings);

  const rankingsPayload = await fetchPayload(
    `/api/rankings?universe_code=${encodeURIComponent(spec.code)}&limit=20`,
    { accept: "application/json" },
  );
  recordRouteSample(spec.step, spec.code, "rankings", rankingsPayload);
  if (!rankingsPayload.ok) {
    failures.push(`rankings:http_${rankingsPayload.status || rankingsPayload.error}`);
  }
  const rankingsResult = evaluateJsonIdentity({
    spec,
    check: "rankings",
    payload: rankingsPayload.json,
    required: true,
  });
  failures.push(...rankingsResult.failures);
  warnings.push(...rankingsResult.warnings);

  let searchCount = null;
  let searchIdentity = "SKIPPED";
  if (!skipSearch) {
    const searchQuery = findSearchQuery(rankingsPayload.json, spec.expectedCode);
    const searchPayload = await fetchPayload(
      `/api/search?q=${encodeURIComponent(searchQuery)}&universe_code=${encodeURIComponent(spec.code)}&limit=12`,
      { accept: "application/json" },
    );
    recordRouteSample(spec.step, spec.code, "search", searchPayload);
    if (!searchPayload.ok) {
      (spec.searchRequired ? failures : warnings).push(`search:http_${searchPayload.status || searchPayload.error}`);
    }
    const searchResult = evaluateJsonIdentity({
      spec,
      check: "search",
      payload: searchPayload.json,
      required: spec.searchRequired,
      allowEmpty: !spec.searchRequired,
    });
    failures.push(...searchResult.failures);
    warnings.push(...searchResult.warnings);
    searchCount = searchResult.count;
    searchIdentity = searchResult.identity;
  }

  const requiredFailure = mode === "required" || spec.required;
  return {
    step: spec.step,
    universe: spec.code,
    expectedUniverse: spec.expectedCode,
    requiredFailure,
    currentUniverseLabel,
    urlUniverse,
    pageStatus,
    mapCount: mapResult.count,
    mapIdentity: mapResult.identity,
    rankingCount: rankingsResult.count,
    rankingsIdentity: rankingsResult.identity,
    chartRendered,
    searchCount,
    searchIdentity,
    visibleError,
    failures,
    warnings,
    ms: Math.round(performance.now() - stepStarted),
  };
}

function slowestSteps(results, limit = 10) {
  return [...results]
    .sort((a, b) => b.ms - a.ms)
    .slice(0, limit)
    .map((result) => ({
      step: result.step,
      universe: result.universe,
      expectedUniverse: result.expectedUniverse,
      ms: result.ms,
      pageStatus: result.pageStatus,
      mapCount: result.mapCount,
      rankingCount: result.rankingCount,
      searchCount: result.searchCount,
    }));
}

function slowestRoutes(limit = 12) {
  return [...routeSamples].sort((a, b) => b.ms - a.ms).slice(0, limit);
}

async function main() {
  const specs = selectSpecs();
  const globalWarnings = [];
  if (chunkConfig.emptyReason) {
    globalWarnings.push(`chunk:${chunkConfig.emptyReason}`);
  }

  console.log(
    `[regional-smoke] base_url=${baseUrl} mode=${mode} selected=${specs.length} api_only=${apiOnly ? "1" : "0"} skip_page=${skipPage ? "1" : "0"} skip_search=${skipSearch ? "1" : "0"}`,
  );
  if (chunkConfig.enabled) {
    console.log(`[regional-smoke] chunk_index=${chunkConfig.index} chunk_total=${chunkConfig.total}`);
  }

  const results = [];
  for (const spec of specs) {
    const result = await checkStep(spec);
    results.push(result);
    const outcome = result.failures.length === 0
      ? result.warnings.length === 0 ? "ok" : "warn"
      : result.requiredFailure ? "fail" : "warn";
    console.log(
      `[regional-smoke] ${outcome} step=${result.step} requested=${result.universe} expected=${result.expectedUniverse} page=${result.pageStatus} map=${result.mapCount}:${result.mapIdentity} rankings=${result.rankingCount}:${result.rankingsIdentity} search=${result.searchCount ?? "SKIPPED"}:${result.searchIdentity} ms=${result.ms}`,
    );
  }

  const requiredFailures = results
    .filter((result) => result.requiredFailure)
    .flatMap((result) => result.failures.map((failure) => ({ result, failure })));
  const extendedWarnings = [
    ...globalWarnings.map((warning) => ({ step: "HARNESS", universe: "ALL", warning })),
    ...results.flatMap((result) => [
      ...result.warnings.map((warning) => ({ step: result.step, universe: result.universe, warning })),
      ...(!result.requiredFailure ? result.failures.map((warning) => ({ step: result.step, universe: result.universe, warning })) : []),
    ]),
  ];

  if (requiredFailures.length > 0) {
    for (const { result, failure } of requiredFailures) {
      console.error(
        makeFailure({
          step: result.step,
          expectedCode: result.expectedUniverse,
          urlUniverse: result.urlUniverse,
          currentUniverseLabel: result.currentUniverseLabel,
          mapIdentity: result.mapIdentity,
          chartRequested: result.universe,
          chartRendered: result.chartRendered,
          rankingsIdentity:
            result.rankingsIdentity === "OK" && result.searchIdentity !== "STALE"
              ? "OK"
              : `rankings=${result.rankingsIdentity},search=${result.searchIdentity}`,
          visibleError: result.visibleError,
          notes: failure,
        }),
      );
    }
  }

  const status = requiredFailures.length > 0
    ? "FAIL_REQUIRED"
    : extendedWarnings.length > 0
      ? "PASS_WITH_WARNINGS"
      : "PASS";
  const summary = {
    checkedAt: new Date().toISOString(),
    status,
    mode,
    baseUrl: sanitizeMessage(baseUrl),
    selected_code_count: specs.length,
    selected_codes: specs.map((spec) => spec.code),
    chunk: chunkConfig.enabled
      ? { index: chunkConfig.index, total: chunkConfig.total, empty_reason: chunkConfig.emptyReason ?? null }
      : null,
    skipped_check_classes: {
      page: skipPage,
      html_identity: specs.some((spec) => spec.skipHtmlIdentity || skipPage),
      search: skipSearch,
      extended: mode === "required",
    },
    required_failures_count: requiredFailures.length,
    warnings_count: extendedWarnings.length,
    elapsed_ms: elapsedMs(),
    slowest_steps: slowestSteps(results),
    slowest_routes: slowestRoutes(),
    required_failures: requiredFailures.map(({ result, failure }) => ({
      step: result.step,
      universe: result.universe,
      expectedUniverse: result.expectedUniverse,
      failure,
    })),
    warnings: extendedWarnings,
    results,
  };

  console.log(JSON.stringify(summary, null, 2));
  process.exit(status === "FAIL_REQUIRED" ? 1 : 0);
}

main().catch((error) => {
  const message = sanitizeMessage(error instanceof Error ? error.message : String(error));
  console.error(
    makeFailure({
      step: "HARNESS",
      expectedCode: "UNKNOWN",
      mapIdentity: "UNKNOWN",
      chartRequested: "UNKNOWN",
      chartRendered: "UNKNOWN",
      rankingsIdentity: "ERROR",
      visibleError: message,
      notes: "Smoke harness failed before a scenario assertion completed.",
    }),
  );

  process.exit(1);
});
