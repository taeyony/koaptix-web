#!/usr/bin/env node

/**
 * KOAPTIX search discovery smoke.
 *
 * GET-only fixture checks for Korean query discovery behavior. This script does
 * not connect to the database, does not authenticate, and never prints full
 * response JSON.
 */

const DEFAULT_BASE_URL = "https://www.koaptix.com";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_LIMIT = 12;

const rawBaseUrl = process.env.KOAPTIX_SMOKE_BASE_URL || DEFAULT_BASE_URL;
const timeoutMs = readPositiveIntEnv(
  "KOAPTIX_SEARCH_DISCOVERY_SMOKE_TIMEOUT_MS",
  DEFAULT_TIMEOUT_MS,
);
const baseUrl = normalizeBaseUrl(rawBaseUrl);
const smokeMode = getSmokeMode(baseUrl);
const runId = `${Date.now()}`;

const ADEL_IDS = ["168804", "168810", "168815"];

const singleFixtures = [
  {
    id: "ADEL_KOREA_JINWOL_FULL",
    query: "진월동 한국아델리움",
    paramName: "universe_code",
    universe: "KOREA_ALL",
    classification: "strict",
    requiredIds: ADEL_IDS,
  },
  {
    id: "ADEL_GWANGJU_JINWOL_FULL",
    query: "진월동 한국아델리움",
    paramName: "universe_code",
    universe: "GWANGJU_ALL",
    classification: "strict",
    requiredIds: ADEL_IDS,
  },
  {
    id: "ADEL_KOREA_REGION_FULL",
    query: "광주 남구 진월동 한국아델리움",
    paramName: "universe_code",
    universe: "KOREA_ALL",
    classification: "strict",
    requiredIds: ADEL_IDS,
  },
  {
    id: "ADEL_SGG29155_JINWOL_PARTIAL",
    query: "진월동 한국아델리움",
    paramName: "universe_code",
    universe: "SGG_29155",
    classification: "strict-partial",
    requiredIds: ["168804", "168810"],
    optionalIds: ["168815"],
  },
  {
    id: "SAEHAN_KOREA_BROAD_GUARD",
    query: "새한",
    paramName: "universe_code",
    universe: "KOREA_ALL",
    classification: "strict-negative",
    expectDiscoveryCount: 0,
  },
  {
    id: "SAEHAN_KOREA_JINWOL_CONTEXT",
    query: "진월동 새한",
    paramName: "universe_code",
    universe: "KOREA_ALL",
    classification: "warning",
    requiredIds: ["168776"],
  },
  {
    id: "NORM_ADEL_NO_REGION",
    query: "한국아델리움",
    paramName: "universe_code",
    universe: "KOREA_ALL",
    classification: "informational",
    requiredIds: ADEL_IDS,
  },
  {
    id: "NORM_ADEL_SPACED",
    query: "한국 아델리움",
    paramName: "universe_code",
    universe: "KOREA_ALL",
    classification: "informational",
    requiredIds: ADEL_IDS,
  },
  {
    id: "NORM_ADEL_JINWOL_SHORT",
    query: "진월 한국아델리움",
    paramName: "universe_code",
    universe: "KOREA_ALL",
    classification: "informational",
    requiredIds: ADEL_IDS,
  },
  {
    id: "NORM_ADEL_GWANGJU_FULL",
    query: "광주광역시 남구 진월동 한국아델리움",
    paramName: "universe_code",
    universe: "KOREA_ALL",
    classification: "informational",
    requiredIds: ADEL_IDS,
  },
];

const parityFixtures = [
  {
    id: "PARAM_PARITY_ADEL_KOREA_UNIVERSE",
    query: "진월동 한국아델리움",
    universe: "KOREA_ALL",
    classification: "strict",
    requiredIds: ADEL_IDS,
  },
  {
    id: "PARAM_PARITY_SAEHAN_BROAD_UNIVERSE",
    query: "새한",
    universe: "KOREA_ALL",
    classification: "strict-negative",
    expectDiscoveryCount: 0,
  },
];

if (typeof fetch !== "function") {
  console.error("FAIL fetch_unavailable Node 18+ global fetch is required.");
  process.exit(1);
}

const results = [];

console.log("KOAPTIX Search Discovery Smoke");
console.log(`base_url=${formatBaseUrlForOutput(baseUrl)}`);
console.log(`mode=${smokeMode}`);
console.log(`fixture_count=${singleFixtures.length + parityFixtures.length}`);

for (const fixture of singleFixtures) {
  const result = await runSingleFixture(fixture);
  results.push(result);
  printFixtureResult(result);
}

for (const fixture of parityFixtures) {
  const result = await runParityFixture(fixture);
  results.push(result);
  printFixtureResult(result);
}

const summary = buildSummary(results);
console.log(
  [
    "summary",
    `strict_pass=${summary.strictPass}`,
    `strict_fail=${summary.strictFail}`,
    `warnings=${summary.warnings}`,
    `informational=${summary.informational}`,
    `blockers=${summary.blockers}`,
  ].join(" "),
);

process.exit(summary.strictFail > 0 || summary.blockers > 0 ? 1 : 0);

function readPositiveIntEnv(name, fallback) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.trunc(value);
}

function normalizeBaseUrl(value) {
  try {
    const url = new URL(value || DEFAULT_BASE_URL);
    return url.origin.replace(/\/+$/, "");
  } catch {
    const url = new URL(DEFAULT_BASE_URL);
    return url.origin.replace(/\/+$/, "");
  }
}

function getSmokeMode(origin) {
  const { hostname } = new URL(origin);
  const normalized = hostname.toLowerCase();
  if (normalized === "www.koaptix.com" || normalized === "koaptix.com") {
    return "production";
  }
  if (normalized === "localhost" || normalized === "127.0.0.1") {
    return "local";
  }
  return "custom";
}

function formatBaseUrlForOutput(origin) {
  const url = new URL(origin);
  return url.origin;
}

async function runSingleFixture(fixture) {
  const response = await fetchSearch({
    fixtureId: fixture.id,
    query: fixture.query,
    paramName: fixture.paramName,
    universe: fixture.universe,
  });

  return evaluateFixture({ fixture, response });
}

async function runParityFixture(fixture) {
  const left = await fetchSearch({
    fixtureId: `${fixture.id}_universe_code`,
    query: fixture.query,
    paramName: "universe_code",
    universe: fixture.universe,
  });
  const right = await fetchSearch({
    fixtureId: `${fixture.id}_universe`,
    query: fixture.query,
    paramName: "universe",
    universe: fixture.universe,
  });

  return evaluateParityFixture({ fixture, left, right });
}

async function fetchSearch({ fixtureId, query, paramName, universe }) {
  const path = new URL("/api/search", baseUrl);
  path.searchParams.set("q", query);
  path.searchParams.set(paramName, universe);
  path.searchParams.set("limit", String(DEFAULT_LIMIT));
  path.searchParams.set("koaptix_probe", `${runId}-${fixtureId}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(path, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      signal: controller.signal,
    });

    const headers = {
      cacheControl: response.headers.get("cache-control") ?? "",
      currentness: response.headers.get("x-koaptix-currentness") ?? "",
      commit: response.headers.get("x-koaptix-commit") ?? "",
      env: response.headers.get("x-koaptix-env") ?? "",
    };

    let body = null;
    let parseError = "";
    try {
      body = await response.json();
    } catch (error) {
      parseError = error instanceof Error ? error.message : String(error);
    }

    return normalizeSearchResponse({
      ok: true,
      status: response.status,
      headers,
      body,
      parseError,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    return {
      ok: false,
      status: 0,
      headers: {
        cacheControl: "",
        currentness: "",
        commit: "",
        env: "",
      },
      durationMs: Date.now() - startedAt,
      error:
        error instanceof Error && error.name === "AbortError"
          ? `timeout_after_${timeoutMs}ms`
          : error instanceof Error
            ? error.message
            : String(error),
      rankedCount: 0,
      discoveryCount: 0,
      discoveryIds: [],
      currentnessOk: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

function normalizeSearchResponse(result) {
  const body = result.body && typeof result.body === "object" ? result.body : {};
  const localItems = asArray(body.localItems);
  const globalItems = asArray(body.globalItems);
  const results = asArray(body.results);
  const items = asArray(body.items);
  const discoveryCandidates = asArray(body.discoveryCandidates);

  const discoveryIds = uniqueStrings(
    discoveryCandidates.map(extractDiscoveryId).filter(Boolean),
  );

  const currentnessOk =
    smokeMode !== "production" ||
    Boolean(
      result.headers.currentness && result.headers.commit && result.headers.env,
    );

  return {
    ...result,
    rankedCount: localItems.length + globalItems.length + results.length + items.length,
    discoveryCount: discoveryCandidates.length,
    discoveryIds,
    currentnessOk,
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function extractDiscoveryId(item) {
  if (!item || typeof item !== "object") return "";
  const raw =
    item.id ??
    item.candidateId ??
    item.candidate_id ??
    item.complexId ??
    item.complex_id ??
    item.discoveryId ??
    item.discovery_id ??
    "";
  return String(raw).trim();
}

function uniqueStrings(values) {
  return Array.from(new Set(values.map((value) => String(value).trim()).filter(Boolean)));
}

function evaluateFixture({ fixture, response }) {
  const base = {
    id: fixture.id,
    classification: fixture.classification,
    response,
    requiredIds: fixture.requiredIds ?? [],
    optionalIds: fixture.optionalIds ?? [],
    missingRequiredIds: [],
    missingOptionalIds: [],
    details: [],
  };

  const transportOutcome = evaluateTransport(fixture.classification, response);
  if (transportOutcome) return { ...base, ...transportOutcome };

  if (fixture.classification === "strict-negative") {
    if (response.discoveryCount === fixture.expectDiscoveryCount) {
      return { ...base, outcome: "PASS" };
    }
    return {
      ...base,
      outcome: "FAIL",
      details: [`expected_discovery_count=${fixture.expectDiscoveryCount}`],
    };
  }

  const missingRequiredIds = getMissingIds(fixture.requiredIds, response.discoveryIds);
  const missingOptionalIds = getMissingIds(fixture.optionalIds, response.discoveryIds);

  if (fixture.classification === "strict") {
    return missingRequiredIds.length === 0
      ? { ...base, outcome: "PASS", missingOptionalIds }
      : { ...base, outcome: "FAIL", missingRequiredIds, missingOptionalIds };
  }

  if (fixture.classification === "strict-partial") {
    return missingRequiredIds.length === 0
      ? { ...base, outcome: "PASS", missingOptionalIds }
      : { ...base, outcome: "FAIL", missingRequiredIds, missingOptionalIds };
  }

  if (fixture.classification === "warning") {
    return missingRequiredIds.length === 0
      ? { ...base, outcome: "PASS" }
      : { ...base, outcome: "WARN", missingRequiredIds };
  }

  return {
    ...base,
    outcome: "INFO",
    missingRequiredIds,
    missingOptionalIds,
  };
}

function evaluateParityFixture({ fixture, left, right }) {
  const base = {
    id: fixture.id,
    classification: fixture.classification,
    response: combineParityResponse(left, right),
    requiredIds: fixture.requiredIds ?? [],
    optionalIds: [],
    missingRequiredIds: [],
    missingOptionalIds: [],
    details: [],
  };

  const leftTransport = evaluateTransport(fixture.classification, left);
  if (leftTransport) {
    return {
      ...base,
      ...leftTransport,
      details: [`left_${leftTransport.details?.join(";") ?? "transport_failure"}`],
    };
  }
  const rightTransport = evaluateTransport(fixture.classification, right);
  if (rightTransport) {
    return {
      ...base,
      ...rightTransport,
      details: [`right_${rightTransport.details?.join(";") ?? "transport_failure"}`],
    };
  }

  const equivalentIds = sameStringSet(left.discoveryIds, right.discoveryIds);
  const equivalentCounts = left.discoveryCount === right.discoveryCount;
  const missingLeft = getMissingIds(fixture.requiredIds, left.discoveryIds);
  const missingRight = getMissingIds(fixture.requiredIds, right.discoveryIds);

  if (fixture.classification === "strict-negative") {
    const leftGuard = left.discoveryCount === fixture.expectDiscoveryCount;
    const rightGuard = right.discoveryCount === fixture.expectDiscoveryCount;
    return leftGuard && rightGuard && equivalentCounts
      ? { ...base, outcome: "PASS" }
      : {
          ...base,
          outcome: "FAIL",
          details: [
            `left_discovery=${left.discoveryCount}`,
            `right_discovery=${right.discoveryCount}`,
          ],
        };
  }

  if (
    equivalentIds &&
    missingLeft.length === 0 &&
    missingRight.length === 0
  ) {
    return { ...base, outcome: "PASS" };
  }

  return {
    ...base,
    outcome: "FAIL",
    missingRequiredIds: uniqueStrings([...missingLeft, ...missingRight]),
    details: [
      `left_ids=${formatIds(left.discoveryIds)}`,
      `right_ids=${formatIds(right.discoveryIds)}`,
    ],
  };
}

function evaluateTransport(classification, response) {
  if (!response.ok) {
    return transportFailure(classification, [`request_error=${response.error}`]);
  }
  if (response.status < 200 || response.status >= 300) {
    return transportFailure(classification, [`http_status=${response.status}`]);
  }
  if (response.parseError) {
    return transportFailure(classification, ["json_parse_error"]);
  }
  if (!response.currentnessOk) {
    return {
      outcome: "BLOCKER",
      details: ["production_currentness_headers_missing"],
    };
  }
  return null;
}

function transportFailure(classification, details) {
  if (
    classification === "strict" ||
    classification === "strict-partial" ||
    classification === "strict-negative"
  ) {
    return { outcome: "FAIL", details };
  }
  if (classification === "warning") {
    return { outcome: "WARN", details };
  }
  return { outcome: "INFO", details };
}

function combineParityResponse(left, right) {
  return {
    status: `${left.status}/${right.status}`,
    headers: {
      commit: [left.headers.commit, right.headers.commit].filter(Boolean).join("/"),
      currentness: [left.headers.currentness, right.headers.currentness]
        .filter(Boolean)
        .join("/"),
      env: [left.headers.env, right.headers.env].filter(Boolean).join("/"),
    },
    rankedCount: `${left.rankedCount}/${right.rankedCount}`,
    discoveryCount: `${left.discoveryCount}/${right.discoveryCount}`,
    discoveryIds: [`left:${formatIds(left.discoveryIds)}`, `right:${formatIds(right.discoveryIds)}`],
    currentnessOk: left.currentnessOk && right.currentnessOk,
  };
}

function getMissingIds(expected = [], actual = []) {
  const actualSet = new Set(actual.map(String));
  return expected.map(String).filter((id) => !actualSet.has(id));
}

function sameStringSet(left, right) {
  const leftSet = new Set(left.map(String));
  const rightSet = new Set(right.map(String));
  if (leftSet.size !== rightSet.size) return false;
  for (const value of leftSet) {
    if (!rightSet.has(value)) return false;
  }
  return true;
}

function printFixtureResult(result) {
  const response = result.response;
  const commit = response.headers?.commit || "-";
  const currentness = response.currentnessOk ? "currentness=ok" : "currentness=missing";
  const details = [
    result.outcome,
    result.id,
    `status=${response.status}`,
    `commit=${commit}`,
    currentness,
    `ranked=${response.rankedCount}`,
    `discovery=${response.discoveryCount}`,
    `ids=${formatIds(response.discoveryIds)}`,
    `missing_required=${formatIds(result.missingRequiredIds)}`,
    `missing_optional=${formatIds(result.missingOptionalIds)}`,
  ];
  if (result.details?.length) {
    details.push(`details=${result.details.join("|")}`);
  }
  console.log(details.join(" "));
}

function formatIds(ids = []) {
  if (!ids || ids.length === 0) return "-";
  return ids.join(",");
}

function buildSummary(items) {
  const summary = {
    strictPass: 0,
    strictFail: 0,
    warnings: 0,
    informational: 0,
    blockers: 0,
  };

  for (const item of items) {
    if (item.outcome === "BLOCKER") {
      summary.blockers += 1;
      continue;
    }
    if (item.outcome === "FAIL") {
      summary.strictFail += 1;
      continue;
    }
    if (item.outcome === "WARN") {
      summary.warnings += 1;
      continue;
    }
    if (item.outcome === "INFO") {
      summary.informational += 1;
      continue;
    }
    if (
      item.classification === "strict" ||
      item.classification === "strict-partial" ||
      item.classification === "strict-negative"
    ) {
      summary.strictPass += 1;
    }
    if (item.missingOptionalIds?.length) {
      summary.informational += 1;
    }
  }

  return summary;
}
