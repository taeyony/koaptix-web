/**
 * KOAPTIX HTTP Smoke Gate — delivery layer verification.
 *
 * Usage:
 *   node scripts/smoke-koaptix-delivery.mjs
 *
 * Environment:
 *   KOAPTIX_SMOKE_BASE_URL   (default: http://127.0.0.1:3000)
 *   KOAPTIX_SMOKE_TIMEOUT_MS (default: 8000)
 *
 * Requirements:
 *   - Node >= 18 (native fetch + AbortController).
 *   - A running Next.js server at the base URL.
 *   - GET-only; no secrets; no DB writes.
 *
 * Exit codes:
 *   0  all mandatory checks passed (optional may be SKIP)
 *   1  one or more mandatory checks failed
 */

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL = (process.env.KOAPTIX_SMOKE_BASE_URL ?? "http://127.0.0.1:3000")
  .replace(/\/$/, "");

const TIMEOUT_MS = Number(process.env.KOAPTIX_SMOKE_TIMEOUT_MS ?? 8000);

// ── ANSI colour helpers ───────────────────────────────────────────────────────

const RESET  = "\x1b[0m";
const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN   = "\x1b[36m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";

function pass(msg)  { return `${GREEN}${BOLD}✓ PASS${RESET}  ${msg}`; }
function fail(msg)  { return `${RED}${BOLD}✗ FAIL${RESET}  ${msg}`; }
function skip(msg)  { return `${YELLOW}${BOLD}⊘ SKIP${RESET}  ${msg}`; }
function warn(msg)  { return `${YELLOW}⚠ WARN${RESET}  ${msg}`; }
function info(msg)  { return `${CYAN}${msg}${RESET}`; }
function dim(msg)   { return `${DIM}${msg}${RESET}`; }

// ── Core fetch helper ─────────────────────────────────────────────────────────

/**
 * Fetch a URL with a wall-clock timeout.
 * Returns { ok, status, contentType, body, durationMs }.
 */
async function fetchWithTimeout(url, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = Date.now();

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json, text/html, */*" },
      signal: controller.signal,
    });

    const contentType = res.headers.get("content-type") ?? "";
    let body = null;

    if (contentType.includes("application/json")) {
      try {
        body = await res.json();
      } catch {
        body = null;
      }
    } else {
      const text = await res.text();
      body = text;
    }

    return {
      ok: true,
      status: res.status,
      contentType,
      body,
      durationMs: Date.now() - t0,
    };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      status: 0,
      contentType: "",
      body: null,
      durationMs: Date.now() - t0,
      timedOut,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

// ── Individual check functions ────────────────────────────────────────────────

/**
 * Check: GET /  →  200 HTML
 */
async function checkHome() {
  const url = `${BASE_URL}/`;
  const result = await fetchWithTimeout(url);

  if (!result.ok) {
    const reason = result.timedOut
      ? `timed out after ${result.durationMs}ms`
      : result.error ?? "network error";
    return { label: "GET /", status: "FAIL", reason, durationMs: result.durationMs };
  }

  if (result.status !== 200) {
    return {
      label: "GET /",
      status: "FAIL",
      reason: `HTTP ${result.status}`,
      durationMs: result.durationMs,
    };
  }

  const isHtml =
    typeof result.body === "string" &&
    (result.contentType.includes("text/html") || result.body.trim().startsWith("<!"));

  if (!isHtml) {
    return {
      label: "GET /",
      status: "FAIL",
      reason: `unexpected content-type: ${result.contentType}`,
      durationMs: result.durationMs,
    };
  }

  return { label: "GET /", status: "PASS", durationMs: result.durationMs };
}

/**
 * Check: GET /api/rankings?universe_code=X&limit=Y
 *
 * Tolerant contract:
 *   - Must return valid JSON.
 *   - Must have `items` array (may be empty on degraded).
 *   - If `ok === false`, marks as DEGRADED (not FAIL) — structured graceful response.
 *   - FAIL only on non-JSON, network error, or missing `items` field entirely.
 */
async function checkRankings(universeCode, limit = 8, optional = false) {
  const url = `${BASE_URL}/api/rankings?universe_code=${encodeURIComponent(universeCode)}&limit=${limit}`;
  const label = `GET /api/rankings universe_code=${universeCode}`;
  const result = await fetchWithTimeout(url);

  if (!result.ok) {
    const reason = result.timedOut
      ? `timed out after ${result.durationMs}ms`
      : result.error ?? "network error";
    return {
      label, durationMs: result.durationMs,
      status: optional ? "SKIP" : "FAIL",
      reason: optional ? `optional — ${reason}` : reason,
    };
  }

  const body = result.body;

  if (typeof body !== "object" || body === null) {
    return {
      label, durationMs: result.durationMs,
      status: optional ? "SKIP" : "FAIL",
      reason: `response is not JSON (status ${result.status})`,
    };
  }

  if (!Array.isArray(body.items)) {
    return {
      label, durationMs: result.durationMs,
      status: optional ? "SKIP" : "FAIL",
      reason: `missing \`items\` array in response (status ${result.status})`,
    };
  }

  const degraded = body.ok === false;
  return {
    label, durationMs: result.durationMs,
    status: "PASS",
    degraded,
    detail: `ok=${body.ok} count=${body.count ?? body.items.length} universeCode=${body.universeCode ?? "?"}`,
  };
}

/**
 * Check: GET /api/map?universe_code=X&limit=Y
 *
 * Tolerant contract:
 *   - Must return valid JSON.
 *   - Must have `items` array (may be empty on degraded/fallback).
 *   - If `ok === false`, marks as DEGRADED.
 *   - FAIL only on non-JSON, network error, or missing `items`.
 */
async function checkMap(universeCode, limit = 32, optional = false) {
  const url = `${BASE_URL}/api/map?universe_code=${encodeURIComponent(universeCode)}&limit=${limit}`;
  const label = `GET /api/map universe_code=${universeCode}`;
  const result = await fetchWithTimeout(url);

  if (!result.ok) {
    const reason = result.timedOut
      ? `timed out after ${result.durationMs}ms`
      : result.error ?? "network error";
    return {
      label, durationMs: result.durationMs,
      status: optional ? "SKIP" : "FAIL",
      reason: optional ? `optional — ${reason}` : reason,
    };
  }

  const body = result.body;

  if (typeof body !== "object" || body === null) {
    return {
      label, durationMs: result.durationMs,
      status: optional ? "SKIP" : "FAIL",
      reason: `response is not JSON (status ${result.status})`,
    };
  }

  if (!Array.isArray(body.items)) {
    return {
      label, durationMs: result.durationMs,
      status: optional ? "SKIP" : "FAIL",
      reason: `missing \`items\` array in response (status ${result.status})`,
    };
  }

  const degraded = body.ok === false;
  return {
    label, durationMs: result.durationMs,
    status: "PASS",
    degraded,
    detail: `ok=${body.ok} count=${body.count ?? body.items.length} fallbackMode=${body.fallbackMode ?? "none"} renderedUniverse=${body.renderedUniverseCode ?? body.universeCode ?? "?"}`,
  };
}

/**
 * Check: GET /api/search?q=X&universe_code=Y&limit=Z
 *
 * Tolerant contract:
 *   - Must return valid JSON.
 *   - Must have `localItems` array.
 *   - Must have `globalItems` array.
 *   - Both may be empty (valid degraded behavior).
 */
async function checkSearch(query, universeCode = "KOREA_ALL", limit = 12) {
  const url = `${BASE_URL}/api/search?q=${encodeURIComponent(query)}&universe_code=${encodeURIComponent(universeCode)}&limit=${limit}`;
  const label = `GET /api/search q="${query}" universe_code=${universeCode}`;
  const result = await fetchWithTimeout(url);

  if (!result.ok) {
    const reason = result.timedOut
      ? `timed out after ${result.durationMs}ms`
      : result.error ?? "network error";
    return { label, status: "FAIL", reason, durationMs: result.durationMs };
  }

  const body = result.body;

  if (typeof body !== "object" || body === null) {
    return {
      label, durationMs: result.durationMs,
      status: "FAIL",
      reason: `response is not JSON (status ${result.status})`,
    };
  }

  if (!Array.isArray(body.localItems)) {
    return {
      label, durationMs: result.durationMs,
      status: "FAIL",
      reason: `missing \`localItems\` array in response`,
    };
  }

  if (!Array.isArray(body.globalItems)) {
    return {
      label, durationMs: result.durationMs,
      status: "FAIL",
      reason: `missing \`globalItems\` array in response`,
    };
  }

  const degraded = body.ok === false;
  return {
    label, durationMs: result.durationMs,
    status: "PASS",
    degraded,
    detail: `ok=${body.ok} local=${body.localItems.length} global=${body.globalItems.length}`,
  };
}

// ── Result printer ────────────────────────────────────────────────────────────

function printResult(r) {
  const dur = dim(`(${r.durationMs}ms)`);

  if (r.status === "PASS") {
    const degradedTag = r.degraded ? warn(" [degraded-but-structured]") : "";
    const detail = r.detail ? dim(`  ${r.detail}`) : "";
    console.log(`  ${pass(r.label)} ${dur}${degradedTag}${detail}`);
  } else if (r.status === "FAIL") {
    console.log(`  ${fail(r.label)} ${dur}`);
    console.log(`    ${RED}reason: ${r.reason}${RESET}`);
  } else if (r.status === "SKIP") {
    console.log(`  ${skip(r.label)} ${dur}`);
    if (r.reason) console.log(`    ${YELLOW}reason: ${r.reason}${RESET}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("");
  console.log(`${BOLD}${CYAN}KOAPTIX Delivery Smoke Gate${RESET}`);
  console.log(dim(`Base URL : ${BASE_URL}`));
  console.log(dim(`Timeout  : ${TIMEOUT_MS}ms per request`));
  console.log(dim(`Date     : ${new Date().toISOString()}`));
  console.log("");

  const results = [];

  // ── Mandatory checks ──────────────────────────────────────────────────────

  console.log(info("── Mandatory ─────────────────────────────────────────────"));
  console.log("");

  // 1. Home
  const homeResult = await checkHome();
  printResult(homeResult);
  results.push({ ...homeResult, mandatory: true });

  // 2. KOREA_ALL rankings
  const rankingsKorea = await checkRankings("KOREA_ALL", 8);
  printResult(rankingsKorea);
  results.push({ ...rankingsKorea, mandatory: true });

  // 3. KOREA_ALL map
  const mapKorea = await checkMap("KOREA_ALL", 32);
  printResult(mapKorea);
  results.push({ ...mapKorea, mandatory: true });

  // 4. Search — harmless query in Korean (강남 = Gangnam)
  const searchResult = await checkSearch("강남", "KOREA_ALL", 12);
  printResult(searchResult);
  results.push({ ...searchResult, mandatory: true });

  console.log("");

  // ── Optional: regional universe ───────────────────────────────────────────

  console.log(info("── Optional (regional) ───────────────────────────────────"));
  console.log("");

  // SEOUL_ALL rankings — optional, skip if the route returns 500 without JSON
  const rankingsSeoul = await checkRankings("SEOUL_ALL", 20, true);
  printResult(rankingsSeoul);
  results.push({ ...rankingsSeoul, mandatory: false });

  // BUSAN_ALL map — optional
  const mapBusan = await checkMap("BUSAN_ALL", 28, true);
  printResult(mapBusan);
  results.push({ ...mapBusan, mandatory: false });

  console.log("");

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log(info("── Summary ───────────────────────────────────────────────"));
  console.log("");

  const mandatory = results.filter((r) => r.mandatory);
  const mandatoryFails  = mandatory.filter((r) => r.status === "FAIL");
  const mandatoryPasses = mandatory.filter((r) => r.status === "PASS");
  const degraded        = results.filter((r) => r.status === "PASS" && r.degraded);
  const optionalSkips   = results.filter((r) => !r.mandatory && r.status === "SKIP");

  console.log(`  Mandatory  ${GREEN}${mandatoryPasses.length}/${mandatory.length} PASS${RESET}  ${mandatoryFails.length > 0 ? `${RED}${mandatoryFails.length} FAIL${RESET}` : "0 FAIL"}`);

  if (degraded.length > 0) {
    console.log(`  ${YELLOW}${degraded.length} DEGRADED (structured fallback — not a hard fail)${RESET}`);
  }

  if (optionalSkips.length > 0) {
    console.log(`  ${YELLOW}${optionalSkips.length} optional check(s) SKIPPED${RESET}`);
  }

  console.log("");

  if (mandatoryFails.length > 0) {
    console.log(`${RED}${BOLD}RESULT: FAIL — ${mandatoryFails.length} mandatory check(s) failed.${RESET}`);
    console.log(dim("  Verify the server is running and KOAPTIX_SMOKE_BASE_URL is correct."));
    console.log("");
    process.exit(1);
  }

  if (degraded.length === mandatory.length) {
    console.log(`${YELLOW}${BOLD}RESULT: DEGRADED — all APIs returned structured fallback (no DB connection?).${RESET}`);
    console.log(dim("  Delivery layer is structurally sound; data layer may be unavailable in this env."));
    console.log("");
    process.exit(0);
  }

  console.log(`${GREEN}${BOLD}RESULT: PASS — all mandatory delivery checks passed.${RESET}`);
  console.log("");
  process.exit(0);
}

main().catch((err) => {
  console.error(`${RED}Smoke script crashed:${RESET}`, err);
  process.exit(1);
});
