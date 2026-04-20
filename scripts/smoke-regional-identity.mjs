#!/usr/bin/env node

const DEFAULT_BASE_URL = "http://localhost:3000";
const baseUrl = normalizeBaseUrl(
  process.env.KOAPTIX_SMOKE_BASE_URL || process.argv[2] || DEFAULT_BASE_URL,
);

const steps = [
  { step: "BUSAN_ALL", code: "BUSAN_ALL", label: "부산 전체", title: "KOAPTIX BUSAN" },
  { step: "ULSAN_ALL", code: "ULSAN_ALL", label: "울산 전체", title: "KOAPTIX ULSAN" },
  { step: "GWANGJU_ALL", code: "GWANGJU_ALL", label: "광주 전체", title: "KOAPTIX GWANGJU" },
  { step: "DAEJEON_ALL", code: "DAEJEON_ALL", label: "대전 전체", title: "KOAPTIX DAEJEON" },
  { step: "BUSAN_ALL_RETURN", code: "BUSAN_ALL", label: "부산 전체", title: "KOAPTIX BUSAN" },
];

const sggSteps = [
  { step: "SGG_SONGPA", code: "SGG_11710", label: "송파구", title: "KOAPTIX SGG 11710" },
  { step: "SGG_BUNDANG", code: "SGG_41135", label: "분당구", title: "KOAPTIX SGG 41135" },
  { step: "SGG_JONGNO_BATCH1", code: "SGG_11110", label: "종로구", title: "KOAPTIX SGG 11110" },
  { step: "SGG_JUNG_BATCH1", code: "SGG_11140", label: "중구", title: "KOAPTIX SGG 11140" },
  { step: "SGG_GWANGJIN_BATCH1", code: "SGG_11215", label: "광진구", title: "KOAPTIX SGG 11215" },
  { step: "SGG_JUNGNANG_BATCH2", code: "SGG_11260", label: "중랑구", title: "KOAPTIX SGG 11260" },
  { step: "SGG_GANGBUK_BATCH2", code: "SGG_11305", label: "강북구", title: "KOAPTIX SGG 11305" },
  { step: "SGG_DOBONG_BATCH2", code: "SGG_11320", label: "도봉구", title: "KOAPTIX SGG 11320" },
];

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function buildUrl(path) {
  return `${baseUrl}${path}`;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        accept: options.accept ?? "*/*",
        ...(options.headers ?? {}),
      },
    });

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function readText(path) {
  const url = buildUrl(path);
  const response = await fetchWithRetry(url, { accept: "text/html" });

  if (!response.ok) {
    throw new Error(`HTTP_${response.status}:${url}`);
  }

  return {
    finalUrl: response.url,
    text: await response.text(),
  };
}

async function readJson(path) {
  const url = buildUrl(path);
  const response = await fetchWithRetry(url, { accept: "application/json" });

  if (!response.ok) {
    throw new Error(`HTTP_${response.status}:${url}`);
  }

  return await response.json();
}

async function fetchWithRetry(url, options = {}) {
  const maxAttempts = options.maxAttempts ?? 3;
  let lastResponse = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetchWithTimeout(url, options);
    lastResponse = response;

    if (response.ok || ![500, 502, 503, 504].includes(response.status)) {
      return response;
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
    }
  }

  return lastResponse;
}

function extractCurrentUniverseLabel(html) {
  const testIdMatch = html.match(
    /data-testid="current-universe-label"[^>]*>([^<]+)<\/p>/,
  );
  if (testIdMatch?.[1]) return decodeHtml(testIdMatch[1]);

  const anchor = html.indexOf("Current Universe");
  if (anchor < 0) return "";

  const slice = html.slice(anchor, anchor + 900);
  const match = slice.match(/<p class="[^"]*truncate[^"]*text-sm[^"]*">([^<]+)<\/p>/);
  return decodeHtml(match?.[1] ?? "");
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

function findStaleRankingUniverse(items, expectedCode) {
  return (items ?? [])
    .map(getItemUniverse)
    .find((code) => code && code !== expectedCode) || "";
}

function findStaleSearchUniverse(items, expectedCode) {
  return findStaleRankingUniverse(items, expectedCode);
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

async function checkStep(spec) {
  const pagePath = `/?universe=${encodeURIComponent(spec.code)}`;
  const { finalUrl, text: html } = await readText(pagePath);
  const mapPayload = await readJson(
    `/api/map?universe_code=${encodeURIComponent(spec.code)}&limit=20`,
  );
  const rankingsPayload = await readJson(
    `/api/rankings?universe_code=${encodeURIComponent(spec.code)}&limit=20`,
  );
  const rankingPage = await readText(`/ranking?universe=${encodeURIComponent(spec.code)}`);

  const urlUniverse = getUrlUniverse(finalUrl);
  const currentUniverseLabel = extractCurrentUniverseLabel(html);

  const mapCount = Number(mapPayload?.count ?? mapPayload?.items?.length ?? 0);
  const mapIdentity =
    mapPayload?.universeCode !== spec.code
      ? "STALE"
      : mapCount <= 0
        ? "EMPTY"
        : "OK";

  const rankingItems = rankingsPayload?.items ?? [];
  const rankingCount = Number(rankingsPayload?.count ?? rankingItems.length ?? 0);
  const staleRankingUniverse = findStaleRankingUniverse(rankingItems, spec.code);
  const rankingsIdentity =
    rankingsPayload?.universeCode !== spec.code || staleRankingUniverse
      ? "STALE"
      : rankingCount <= 0
        ? "EMPTY"
        : "OK";

  const searchQuery = rankingItems[0]?.name || "";
  const searchPayload = searchQuery
    ? await readJson(
        `/api/search?q=${encodeURIComponent(searchQuery)}&universe_code=${encodeURIComponent(
          spec.code,
        )}&limit=12`,
      )
    : { ok: false, localItems: [], globalItems: [], message: "NO_RANKING_ITEM_FOR_SEARCH" };
  const searchLocalItems = searchPayload?.localItems ?? [];
  const searchGlobalItems = searchPayload?.globalItems ?? [];
  const staleSearchUniverse = findStaleSearchUniverse(searchLocalItems, spec.code);
  const searchIdentity =
    searchPayload?.universeCode !== spec.code || staleSearchUniverse || searchGlobalItems.length > 0
      ? "STALE"
      : searchLocalItems.length <= 0
        ? "EMPTY"
        : "OK";

  const rankingPageUrlUniverse = getUrlUniverse(rankingPage.finalUrl);
  const rankingPageCurrentUniverseLabel = extractCurrentUniverseLabel(rankingPage.text);
  const rankingPageIdentity =
    rankingPageUrlUniverse !== spec.code ||
    !rankingPage.text.includes("KOAPTIX TOP1000") ||
    rankingPageCurrentUniverseLabel !== spec.label
      ? "STALE"
      : "OK";

  const hasMarketIndex = html.includes("Market Index");
  const hasExpectedChartIdentity =
    html.includes(spec.title) || html.includes(spec.label) || html.includes(spec.code);
  const hasKoreaChartTitle = html.includes("KOAPTIX KOREA");
  const hasAllowedHistoryState =
    html.includes("History Building") ||
    html.includes("현재 유니버스 지수 히스토리") ||
    html.includes("표시할 KOAPTIX 지수 데이터");
  const chartIdentity = hasMarketIndex && hasExpectedChartIdentity && !hasKoreaChartTitle;
  const chartRendered = chartIdentity
    ? spec.code
    : hasKoreaChartTitle
      ? "KOREA_ALL"
      : hasAllowedHistoryState
        ? "HISTORY_STATE_WITHOUT_EXPECTED_IDENTITY"
        : "UNKNOWN";

  const visibleError =
    html.includes("signal is aborted without reason")
      ? "signal is aborted without reason"
      : rankingsPayload?.ok === false
        ? rankingsPayload?.message || "rankings api error"
        : mapPayload?.ok === false
          ? mapPayload?.message || "map api error"
          : "NONE";

  const failures = [];

  if (urlUniverse !== spec.code) {
    failures.push(`URL universe mismatch: got ${urlUniverse || "EMPTY"}`);
  }

  if (currentUniverseLabel !== spec.label) {
    failures.push(`Current Universe mismatch: got ${currentUniverseLabel || "EMPTY"}`);
  }

  if (mapIdentity !== "OK") {
    failures.push(`NeonMap identity ${mapIdentity}`);
  }

  if (!chartIdentity) {
    failures.push(`MarketChartCard identity ${chartRendered}`);
  }

  if (rankingsIdentity !== "OK") {
    failures.push(
      staleRankingUniverse
        ? `Rankings stale universe ${staleRankingUniverse}`
        : `Rankings identity ${rankingsIdentity}`,
    );
  }

  if (searchIdentity !== "OK") {
    failures.push(
      staleSearchUniverse
        ? `Search stale universe ${staleSearchUniverse}`
        : searchGlobalItems.length > 0
          ? "Search returned global fallback items"
          : `Search identity ${searchIdentity}`,
    );
  }

  if (rankingPageIdentity !== "OK") {
    failures.push(
      `TOP1000 page identity ${rankingPageIdentity}: url=${rankingPageUrlUniverse || "EMPTY"}, label=${
        rankingPageCurrentUniverseLabel || "EMPTY"
      }`,
    );
  }

  if (visibleError !== "NONE") {
    failures.push(`Visible/API error: ${visibleError}`);
  }

  if (failures.length > 0) {
    throw new Error(
      makeFailure({
        step: spec.step,
        expectedCode: spec.code,
        urlUniverse,
        currentUniverseLabel,
        mapIdentity,
        chartRequested: spec.code,
        chartRendered,
        rankingsIdentity:
          rankingsIdentity === "OK" && searchIdentity === "OK" && rankingPageIdentity === "OK"
            ? "OK"
            : `rankings=${rankingsIdentity},search=${searchIdentity},top1000=${rankingPageIdentity}`,
        visibleError,
        notes: failures.join("; "),
      }),
    );
  }

  return {
    step: spec.step,
    universe: spec.code,
    currentUniverseLabel,
    mapCount,
    rankingCount,
    chartRendered,
    searchCount: searchLocalItems.length,
    top1000: rankingPageIdentity,
  };
}

async function main() {
  console.log(`[regional-smoke] base_url=${baseUrl}`);

  const results = [];
  for (const spec of steps) {
    const result = await checkStep(spec);
    results.push(result);
    console.log(
      `[regional-smoke] ok step=${result.step} universe=${result.universe} map=${result.mapCount} rankings=${result.rankingCount} search=${result.searchCount} top1000=${result.top1000} chart=${result.chartRendered}`,
    );
  }

  for (const spec of sggSteps) {
    const result = await checkStep(spec);
    results.push(result);
    console.log(
      `[regional-smoke] ok step=${result.step} universe=${result.universe} map=${result.mapCount} rankings=${result.rankingCount} search=${result.searchCount} top1000=${result.top1000} chart=${result.chartRendered}`,
    );
  }

  console.log(`[regional-smoke] pass steps=${results.length}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("[REGIONAL_IDENTITY_SMOKE_FAIL]")) {
    console.error(message);
  } else {
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
  }

  process.exit(1);
});
