#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DEFAULT_BASE_URL = "http://localhost:3000";
const positionalBaseUrl = process.argv
  .slice(2)
  .find((arg) => !arg.startsWith("--"));
const baseUrl = normalizeBaseUrl(
  process.env.KOAPTIX_SMOKE_BASE_URL || positionalBaseUrl || DEFAULT_BASE_URL,
);
const busanProbeMode =
  process.env.KOAPTIX_BUSAN_PROBE === "1" || process.argv.includes("--busan-probe");
const commandPaletteProbeMode =
  process.env.KOAPTIX_COMMAND_PALETTE_PROBE === "1" ||
  process.argv.includes("--command-palette-probe");
const top1000BaselineGateMode = process.env.KOAPTIX_TOP1000_BASELINE_GATE === "1";
const RECENT_STAGED_SGG_MIN_ORDER = 125;

const chromePath =
  process.env.KOAPTIX_CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const regionalSteps = [
  { step: "BUSAN_ALL", code: "BUSAN_ALL", label: "부산 전체" },
  { step: "ULSAN_ALL", code: "ULSAN_ALL", label: "울산 전체" },
  { step: "GWANGJU_ALL", code: "GWANGJU_ALL", label: "광주 전체" },
  { step: "DAEJEON_ALL", code: "DAEJEON_ALL", label: "대전 전체" },
  { step: "BUSAN_ALL_RETURN", code: "BUSAN_ALL", label: "부산 전체" },
];

const baseSggBrowserSteps = [
  { step: "SGG_JONGNO_BROWSER", code: "SGG_11110", label: "종로구" },
  { step: "SGG_JUNG_BROWSER", code: "SGG_11140", label: "중구" },
  { step: "SGG_JUNGNANG_BROWSER", code: "SGG_11260", label: "중랑구" },
  { step: "SGG_GANGBUK_BROWSER", code: "SGG_11305", label: "강북구" },
];

const recentStagedSggBrowserSteps = readEnabledSggRegistry(RECENT_STAGED_SGG_MIN_ORDER)
  .map((item) => ({
    step: `SGG_ENABLED_${item.code}_BROWSER`,
    code: item.code,
    label: item.label,
  }));

const sggBrowserSteps = mergeUniqueSggSteps(
  baseSggBrowserSteps,
  recentStagedSggBrowserSteps,
);

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function readEnabledSggRegistry(minOrder) {
  const raw = readFileSync(join(process.cwd(), "src/lib/koaptix/universes.ts"), "utf8");
  const start = raw.indexOf("const SGG_UNIVERSE_REGISTRY");
  const end = raw.indexOf("/**\n * KOAPTIX service-exposed universe registry.");
  const block = raw.slice(start, end);

  return [...block.matchAll(/code:\s*"(?<code>SGG_\d+)"[\s\S]*?label:\s*"(?<label>[^"]+)"[\s\S]*?enabled:\s*(?<enabled>true|false)[\s\S]*?order:\s*(?<order>\d+)/g)]
    .map((match) => ({
      code: match.groups.code,
      label: match.groups.label,
      enabled: match.groups.enabled === "true",
      order: Number(match.groups.order),
    }))
    .filter((item) => item.enabled && item.order >= minOrder);
}

function mergeUniqueSggSteps(primary, secondary) {
  const seen = new Set();
  return [...primary, ...secondary].filter((item) => {
    if (seen.has(item.code)) return false;
    seen.add(item.code);
    return true;
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, timeoutMs, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${label}`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}

async function fileExists(path) {
  try {
    const fs = await import("node:fs/promises");
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveBrowserPath() {
  if (await fileExists(chromePath)) return chromePath;
  if (await fileExists(edgePath)) return edgePath;
  throw new Error(
    `No Chrome/Edge executable found. Set KOAPTIX_CHROME_PATH. Tried: ${chromePath}, ${edgePath}`,
  );
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

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;

      const entry = this.pending.get(message.id);
      if (!entry) return;

      this.pending.delete(message.id);

      if (message.error) {
        entry.reject(new Error(message.error.message || "CDP_ERROR"));
      } else {
        entry.resolve(message.result);
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  close() {
    this.socket.close();
  }
}

async function waitForJson(url, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
      lastError = new Error(`HTTP_${response.status}:${url}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(150);
  }

  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

async function launchBrowser(initialUrl = "about:blank") {
  const executable = await resolveBrowserPath();
  const userDataDir = await mkdtemp(join(tmpdir(), "koaptix-browser-smoke-"));
  const port = 9222 + Math.floor(Math.random() * 1000);
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    initialUrl,
  ];

  const child = spawn(executable, args, {
    stdio: "ignore",
    windowsHide: true,
  });

  const version = await waitForJson(`http://127.0.0.1:${port}/json/version`);
  const targets = await waitForJson(`http://127.0.0.1:${port}/json/list`);
  const page = targets.find((target) => target.type === "page") ?? targets[0];
  const socket = new WebSocket(page.webSocketDebuggerUrl || version.webSocketDebuggerUrl);

  await withTimeout(
    new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    }),
    8_000,
    "browser websocket open",
  );

  return {
    client: new CdpClient(socket),
    async close() {
      try {
        child.kill();
      } catch {
        // no-op
      }
      try {
        await rm(userDataDir, { recursive: true, force: true });
      } catch {
        // no-op
      }
    },
  };
}

async function evaluate(client, expression, returnByValue = true) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue,
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime evaluation failed");
  }

  return result.result.value;
}

async function navigate(client, path) {
  const url = `${baseUrl}${path}`;
  try {
    await withTimeout(
      client.send("Page.navigate", { url }),
      8_000,
      `Page.navigate ${path}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Page.navigate")) throw error;
    await client.send("Runtime.evaluate", {
      expression: `window.location.assign(${JSON.stringify(url)})`,
      awaitPromise: false,
      returnByValue: true,
    });
  }
  if (path.startsWith("/ranking")) {
    await waitForRankingReady(client);
  } else {
    await waitForHomeReady(client);
  }
}

async function waitFor(client, condition, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await evaluate(client, `Boolean(${condition})`);
    if (ok) return;
    await sleep(150);
  }
  throw new Error(`Timeout waiting for condition: ${condition}`);
}

async function getAppReadyDiagnostics(client) {
  return await evaluate(
    client,
    `(() => {
      const text = document.body?.innerText || '';
      const attr = (node, name) => node?.getAttribute?.(name) || '';
      const activeButtons = Array.from(document.querySelectorAll('button[aria-pressed="true"]'))
        .slice(0, 12)
        .map((button) => ({
          text: button.textContent?.trim() || '',
          testid: attr(button, 'data-testid'),
          universe: attr(button, 'data-universe-code'),
          className: button.className || ''
        }));
      const rankingCardCount = document.querySelectorAll('[data-testid="ranking-card"]').length;
      const commandOpenCount = document.querySelectorAll('[data-testid="command-palette-open"]').length;
      const rankingBoardCount = document.querySelectorAll('[data-testid="ranking-board"]').length;
      const currentUniverseLabelCount = document.querySelectorAll('[data-testid="current-universe-label"]').length;
      const marketChartCardCount = document.querySelectorAll('[data-testid="market-chart-card"]').length;
      const universeOptionCount = document.querySelectorAll('[data-testid="universe-option"]').length;
      const hasKoaptix500 = text.includes('KOAPTIX 500');
      const hasRankingsText = text.includes('Rankings');
      const surfaces = [];
      if (hasKoaptix500) surfaces.push('KOAPTIX_500_TEXT');
      if (hasRankingsText) surfaces.push('RANKINGS_TEXT');
      if (activeButtons.length > 0) surfaces.push('ACTIVE_ARIA_BUTTON');
      if (rankingCardCount > 0) surfaces.push('RANKING_CARD');
      if (commandOpenCount > 0) surfaces.push('COMMAND_OPEN');
      if (rankingBoardCount > 0) surfaces.push('RANKING_BOARD_HOOK');
      if (currentUniverseLabelCount > 0) surfaces.push('CURRENT_UNIVERSE_HOOK');
      if (marketChartCardCount > 0) surfaces.push('MARKET_CHART_HOOK');
      return {
        href: location.href,
        readyState: document.readyState,
        bodyExists: Boolean(document.body),
        bodyTextSample: text.replace(/\\s+/g, ' ').slice(0, 400),
        hasKoaptix500,
        hasRankingsText,
        activeButtonCount: activeButtons.length,
        activeButtons,
        rankingCardCount,
        commandOpenCount,
        rankingBoardCount,
        currentUniverseLabelCount,
        marketChartCardCount,
        universeOptionCount,
        readySurface: surfaces.join('|') || 'NONE'
      };
    })()`,
  );
}

function isAppReady(diag, scope) {
  if (!diag?.bodyExists) return false;
  if (scope === "document") return true;

  if (scope === "home") {
    return (
      diag.hasKoaptix500 === true &&
      diag.activeButtonCount > 0 &&
      diag.rankingCardCount > 0
    );
  }

  if (scope === "ranking") {
    return (
      diag.rankingCardCount > 0 &&
      (diag.hasKoaptix500 === true || diag.hasRankingsText === true)
    );
  }

  return diag.hasKoaptix500 === true || diag.rankingCardCount > 0;
}

function formatAppReadyDiagnostics(diag, scope, timeoutMs) {
  if (!diag) {
    return `scope=${scope} timeout_ms=${timeoutMs} last=NONE`;
  }

  const activeButtons = (diag.activeButtons ?? [])
    .map((button) => {
      const text = button.text ? `text:${button.text}` : "text:EMPTY";
      const testid = button.testid ? `testid:${button.testid}` : "testid:EMPTY";
      const universe = button.universe ? `universe:${button.universe}` : "universe:EMPTY";
      return `{${[text, testid, universe].join(",")}}`;
    })
    .join(",");

  return [
    `scope=${scope}`,
    `timeout_ms=${timeoutMs}`,
    `href=${diag.href || "EMPTY"}`,
    `readyState=${diag.readyState || "EMPTY"}`,
    `bodyExists=${diag.bodyExists === true}`,
    `readySurface=${diag.readySurface || "NONE"}`,
    `activeButtonCount=${diag.activeButtonCount ?? 0}`,
    `rankingCardCount=${diag.rankingCardCount ?? 0}`,
    `commandOpenCount=${diag.commandOpenCount ?? 0}`,
    `rankingBoardCount=${diag.rankingBoardCount ?? 0}`,
    `currentUniverseLabelCount=${diag.currentUniverseLabelCount ?? 0}`,
    `marketChartCardCount=${diag.marketChartCardCount ?? 0}`,
    `universeOptionCount=${diag.universeOptionCount ?? 0}`,
    `activeButtons=${activeButtons || "NONE"}`,
    `bodyTextSample=${diag.bodyTextSample || "EMPTY"}`,
  ].join(" ");
}

async function waitForAppReady(client, scope = "home", timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  let lastDiag = null;

  while (Date.now() < deadline) {
    lastDiag = await getAppReadyDiagnostics(client);
    if (isAppReady(lastDiag, scope)) {
      console.log(`[browser-smoke] app-ready ${formatAppReadyDiagnostics(lastDiag, scope, timeoutMs)}`);
      return lastDiag;
    }
    await sleep(150);
  }

  throw new Error(
    `Timeout waiting for app-ready DOM surface: ${formatAppReadyDiagnostics(lastDiag, scope, timeoutMs)}`,
  );
}

async function click(client, selector) {
  const clicked = await evaluate(
    client,
    `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      el.scrollIntoView({ block: 'center', inline: 'center' });
      el.click();
      return true;
    })()`,
  );
  if (!clicked) throw new Error(`Missing clickable selector: ${selector}`);
}

async function waitForDomReady(client) {
  await waitForAppReady(client, "document", 20_000);
}

async function waitForHomeUiAnchors(client) {
  await waitForAppReady(client, "home", 20_000);
}

async function waitForRankingUiAnchors(client) {
  await waitForAppReady(client, "ranking", 20_000);
}

async function waitForHomeReady(client) {
  await waitForHomeUiAnchors(client);
}

async function waitForRankingReady(client) {
  await waitForRankingUiAnchors(client);
}

async function getBrowserDiagnostics(client, expectedCode = "BUSAN_ALL") {
  return await evaluate(
    client,
    `(() => {
      const params = new URLSearchParams(location.search);
      const selector = '[data-testid="universe-option"][data-universe-code="${expectedCode}"]';
      const option = document.querySelector(selector);
      const button = option?.closest?.('button') ?? null;
      const target = button ?? option;
      const current = document.querySelector('[data-testid="current-universe-label"]');
      const board = document.querySelector('[data-testid="ranking-board"]');
      const chart = document.querySelector('[data-testid="market-chart-card"]');
      const options = Array.from(document.querySelectorAll('[data-testid="universe-option"]'));
      const rect = target?.getBoundingClientRect?.() ?? null;
      const hasRect = Boolean(rect && rect.width > 0 && rect.height > 0);
      const centerX = hasRect ? rect.left + rect.width / 2 : null;
      const centerY = hasRect ? rect.top + rect.height / 2 : null;
      const pointNode = hasRect
        ? document.elementFromPoint(centerX, centerY)
        : null;
      const style = target ? window.getComputedStyle(target) : null;
      const attr = (node, name) => node?.getAttribute?.(name) ?? '';
      const containsPointNode = Boolean(
        target &&
        pointNode &&
        (target === pointNode || target.contains(pointNode) || pointNode.contains(target))
      );
      return {
        href: location.href,
        urlUniverse: params.get('universe') || 'KOREA_ALL',
        readyState: document.readyState,
        currentLabelText: current?.textContent?.trim() || '',
        currentUniverseCode: attr(current, 'data-universe-code'),
        boardUniverseCode: attr(board, 'data-universe-code'),
        chartUniverseCode: attr(chart, 'data-requested-universe-code') || attr(chart, 'data-rendered-universe-code'),
        chartRequested: attr(chart, 'data-requested-universe-code'),
        chartRendered: attr(chart, 'data-rendered-universe-code'),
        universeOptionCount: options.length,
        macroUniverseOptionCount: options.filter((el) => (attr(el, 'data-universe-code') || '').endsWith('_ALL')).length,
        expectedOptionExists: Boolean(option),
        expectedOptionText: option?.textContent?.trim() || '',
        targetTagName: target?.tagName || '',
        targetRole: attr(target, 'role'),
        targetType: attr(target, 'type'),
        targetDisabled: Boolean(target?.disabled),
        targetAriaDisabled: attr(target, 'aria-disabled'),
        pointerEvents: style?.pointerEvents || '',
        visibility: style?.visibility || '',
        display: style?.display || '',
        hasRect,
        targetRect: hasRect
          ? {
              left: Math.round(rect.left),
              top: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              centerX: Math.round(centerX),
              centerY: Math.round(centerY),
            }
          : null,
        centerX: hasRect ? Math.round(centerX) : null,
        centerY: hasRect ? Math.round(centerY) : null,
        elementFromPointTagName: pointNode?.tagName || '',
        elementFromPointClassName: typeof pointNode?.className === 'string' ? pointNode.className : '',
        elementFromPointTestId: attr(pointNode, 'data-testid'),
        elementFromPointUniverseCode: attr(pointNode, 'data-universe-code'),
        elementFromPointWithinTarget: containsPointNode,
        visibleError: document.body.textContent.includes('signal is aborted without reason')
          ? 'signal is aborted without reason'
          : 'NONE',
      };
    })()`,
  );
}

function formatDiagnostics(diag) {
  return [
    `href=${diag.href || "EMPTY"}`,
    `readyState=${diag.readyState || "EMPTY"}`,
    `urlUniverse=${diag.urlUniverse || "EMPTY"}`,
    `currentUniverseLabel=${diag.currentLabelText || "EMPTY"}`,
    `currentUniverseCode=${diag.currentUniverseCode || "EMPTY"}`,
    `boardUniverseCode=${diag.boardUniverseCode || "EMPTY"}`,
    `chartUniverseCode=${diag.chartUniverseCode || "EMPTY"}`,
    `targetTagName=${diag.targetTagName || "EMPTY"}`,
    `targetDisabled=${diag.targetDisabled ? "true" : "false"}`,
    `targetAriaDisabled=${diag.targetAriaDisabled || "EMPTY"}`,
    `pointerEvents=${diag.pointerEvents || "EMPTY"}`,
    `visibility=${diag.visibility || "EMPTY"}`,
    `display=${diag.display || "EMPTY"}`,
    `rect=${diag.targetRect ? `${diag.targetRect.width}x${diag.targetRect.height}` : "EMPTY"}`,
    `center=${diag.centerX == null ? "EMPTY" : `${diag.centerX},${diag.centerY}`}`,
    `elementFromPoint=${diag.elementFromPointTagName || "EMPTY"} testid=${diag.elementFromPointTestId || "EMPTY"} universe=${diag.elementFromPointUniverseCode || "EMPTY"} withinTarget=${diag.elementFromPointWithinTarget ? "true" : "false"}`,
    `universeOptionCount=${diag.universeOptionCount ?? "EMPTY"}`,
    `macroUniverseOptionCount=${diag.macroUniverseOptionCount ?? "EMPTY"}`,
    `expectedOptionExists=${diag.expectedOptionExists ? "true" : "false"}`,
    `expectedOptionText=${diag.expectedOptionText || "EMPTY"}`,
  ].join("; ");
}

function makeActionableFailure({
  step,
  expectedCode,
  diag,
  clickStrategy = "NONE",
  visibleError = "",
  notes = "",
}) {
  return [
    "[REGIONAL_IDENTITY_SMOKE_FAIL]",
    `step=${step}`,
    `expected_universe=${expectedCode}`,
    `href=${diag?.href || "EMPTY"}`,
    `readyState=${diag?.readyState || "EMPTY"}`,
    `urlUniverse=${diag?.urlUniverse || "EMPTY"}`,
    `currentUniverseLabel=${diag?.currentLabelText || "EMPTY"}`,
    `currentUniverseCode=${diag?.currentUniverseCode || "EMPTY"}`,
    `boardUniverseCode=${diag?.boardUniverseCode || "EMPTY"}`,
    `chartUniverseCode=${diag?.chartUniverseCode || "EMPTY"}`,
    `targetTagName=${diag?.targetTagName || "EMPTY"}`,
    `targetDisabled=${diag?.targetDisabled ? "true" : "false"}`,
    `targetAriaDisabled=${diag?.targetAriaDisabled || "EMPTY"}`,
    `pointerEvents=${diag?.pointerEvents || "EMPTY"}`,
    `visibility=${diag?.visibility || "EMPTY"}`,
    `display=${diag?.display || "EMPTY"}`,
    `rectWidth=${diag?.targetRect?.width ?? "EMPTY"}`,
    `rectHeight=${diag?.targetRect?.height ?? "EMPTY"}`,
    `centerX=${diag?.centerX ?? "EMPTY"}`,
    `centerY=${diag?.centerY ?? "EMPTY"}`,
    `elementFromPoint=${diag?.elementFromPointTagName || "EMPTY"} testid=${diag?.elementFromPointTestId || "EMPTY"} universe=${diag?.elementFromPointUniverseCode || "EMPTY"} withinTarget=${diag?.elementFromPointWithinTarget ? "true" : "false"}`,
    `click_strategy=${clickStrategy}`,
    `visible_error=${visibleError || diag?.visibleError || "NONE"}`,
    `notes=${notes || "NONE"}`,
  ].join("\n");
}

async function failWithActionableDiagnostics(
  client,
  spec,
  visibleError,
  notes = "",
  clickStrategy = "NONE",
) {
  const diag = await getBrowserDiagnostics(client, spec.code);
  throw new Error(
    makeActionableFailure({
      step: spec.step,
      expectedCode: spec.code,
      diag,
      clickStrategy,
      visibleError,
      notes,
    }),
  );
}

async function waitForActionableUniverseOption(client, code, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  let lastDiag = null;

  while (Date.now() < deadline) {
    await evaluate(
      client,
      `(() => {
        const el = document.querySelector('[data-testid="universe-option"][data-universe-code="${code}"]');
        const button = el?.closest?.('button') ?? el;
        button?.scrollIntoView?.({ block: 'center', inline: 'center' });
        return Boolean(button);
      })()`,
    );
    await sleep(80);
    lastDiag = await getBrowserDiagnostics(client, code);

    const actionable =
      lastDiag.expectedOptionExists &&
      lastDiag.targetTagName === "BUTTON" &&
      lastDiag.targetDisabled !== true &&
      lastDiag.targetAriaDisabled !== "true" &&
      lastDiag.pointerEvents !== "none" &&
      lastDiag.visibility !== "hidden" &&
      lastDiag.display !== "none" &&
      Boolean(lastDiag.targetRect) &&
      lastDiag.targetRect.width > 0 &&
      lastDiag.targetRect.height > 0 &&
      lastDiag.centerX !== null &&
      lastDiag.centerY !== null &&
      lastDiag.elementFromPointWithinTarget;

    if (actionable) {
      return lastDiag;
    }

    await sleep(120);
  }

  const error = new Error(`Actionable universe option timeout for ${code}`);
  error.diagnostics = lastDiag;
  throw error;
}

async function dispatchUniverseButtonClick(client, code, strategy) {
  return await evaluate(
    client,
    `(() => {
      const el = document.querySelector('[data-testid="universe-option"][data-universe-code="${code}"]');
      const button = el?.closest?.('button') ?? el;
      if (!button) return { dispatched: false, reason: 'missing-button', strategy: ${JSON.stringify(strategy)} };

      if (${JSON.stringify(strategy)} === 'button-prototype-click') {
        HTMLElement.prototype.click.call(button);
        return { dispatched: true, strategy: ${JSON.stringify(strategy)}, targetTagName: button.tagName };
      }

      if (${JSON.stringify(strategy)} === 'mouse-sequence-fallback') {
        for (const type of ['mousedown', 'mouseup', 'click']) {
          button.dispatchEvent(new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: window,
            button: 0,
            buttons: type === 'mouseup' ? 0 : 1,
          }));
        }
        return { dispatched: true, strategy: ${JSON.stringify(strategy)}, targetTagName: button.tagName };
      }

      return { dispatched: false, reason: 'unknown-strategy', strategy: ${JSON.stringify(strategy)} };
    })()`,
  );
}

async function waitForScenarioCondition(
  client,
  spec,
  condition,
  visibleError,
  timeoutMs = 20_000,
  clickStrategy = "NONE",
) {
  try {
    await waitFor(client, condition, timeoutMs);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await failWithActionableDiagnostics(
      client,
      spec,
      visibleError,
      message,
      clickStrategy,
    );
  }
}

async function waitForUniverseSignal(client, spec, timeoutMs = 3_000, clickStrategy = "NONE") {
  await waitForScenarioCondition(
    client,
    spec,
    [
      `(new URLSearchParams(location.search).get('universe') || 'KOREA_ALL') === '${spec.code}'`,
      `document.querySelector('[data-testid="current-universe-label"]')?.getAttribute('data-universe-code') === '${spec.code}'`,
    ].join(" || "),
    `Universe URL/current label signal did not change to ${spec.code}`,
    timeoutMs,
    clickStrategy,
  );
}

async function waitForBoardUniverse(client, spec, clickStrategy = "NONE") {
  await waitForScenarioCondition(
    client,
    spec,
    `document.querySelector('[data-testid="ranking-board"]')?.getAttribute('data-universe-code') === '${spec.code}'`,
    `Timeout waiting for ranking-board universe ${spec.code}`,
    20_000,
    clickStrategy,
  );
}

async function waitForChartUniverse(client, spec, clickStrategy = "NONE") {
  await waitForScenarioCondition(
    client,
    spec,
    `document.querySelector('[data-testid="market-chart-card"]')?.getAttribute('data-requested-universe-code') === '${spec.code}'`,
    `Timeout waiting for MarketChartCard universe ${spec.code}`,
    20_000,
    clickStrategy,
  );
}

async function clickUniverseOptionActionable(client, spec) {
  let actionableDiag;

  try {
    actionableDiag = await waitForActionableUniverseOption(client, spec.code);
  } catch (error) {
    const diag = error?.diagnostics ?? (await getBrowserDiagnostics(client, spec.code));
    throw new Error(
      makeActionableFailure({
        step: spec.step,
        expectedCode: spec.code,
        diag,
        clickStrategy: "NONE",
        visibleError: `Universe option not actionable for ${spec.code}`,
        notes: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  const baselineStrategy = "button-prototype-click";
  const fallbackStrategy = "mouse-sequence-fallback";
  const baselineClick = await dispatchUniverseButtonClick(
    client,
    spec.code,
    baselineStrategy,
  );

  if (!baselineClick?.dispatched) {
    await failWithActionableDiagnostics(
      client,
      spec,
      `Universe option click failed for ${spec.code}`,
      JSON.stringify(baselineClick),
      baselineStrategy,
    );
  }

  try {
    await waitForUniverseSignal(client, spec, 3_000, baselineStrategy);
    return { strategy: baselineStrategy, actionableDiag, click: baselineClick };
  } catch (error) {
    const fallbackReadiness = await waitForActionableUniverseOption(client, spec.code);
    const fallbackClick = await dispatchUniverseButtonClick(
      client,
      spec.code,
      fallbackStrategy,
    );

    if (!fallbackClick?.dispatched) {
      await failWithActionableDiagnostics(
        client,
        spec,
        `Universe fallback click failed for ${spec.code}`,
        JSON.stringify(fallbackClick),
        fallbackStrategy,
      );
    }

    await waitForUniverseSignal(client, spec, 3_000, fallbackStrategy);
    return {
      strategy: fallbackStrategy,
      actionableDiag: fallbackReadiness,
      click: fallbackClick,
      baselineFailure: error instanceof Error ? error.message : String(error),
    };
  }
}

async function clickUniverseOption(client, spec) {
  return await clickUniverseOptionActionable(client, spec);
}

async function runBusanProbe() {
  const spec = { step: "BUSAN_PROBE", code: "BUSAN_ALL" };
  console.log(`[busan-probe] base_url=${baseUrl}`);
  console.log("[busan-probe] mode=BUSAN_ACTIONABLE_ONCE");
  const browser = await launchBrowser(`${baseUrl}/`);
  const { client } = browser;

  try {
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await waitForHomeUiAnchors(client);
    const readyDiag = await waitForActionableUniverseOption(client, spec.code);
    console.log(`[busan-probe] actionable ${formatDiagnostics(readyDiag)}`);
    const clickResult = await clickUniverseOptionActionable(client, spec);
    await waitForBoardUniverse(client, spec, clickResult.strategy);
    await waitForChartUniverse(client, spec, clickResult.strategy);
    const finalDiag = await getBrowserDiagnostics(client, spec.code);
    console.log(
      `[busan-probe] pass strategy=${clickResult.strategy} ${formatDiagnostics(finalDiag)}`,
    );
  } finally {
    client.close();
    await browser.close();
  }
}

async function getCommandPaletteDiagnostics(client) {
  return await evaluate(
    client,
    `(() => {
      const params = new URLSearchParams(location.search);
      const attr = (node, name) => node?.getAttribute?.(name) ?? '';
      const describe = (node) => node
        ? {
            tagName: node.tagName || '',
            testId: attr(node, 'data-testid'),
            role: attr(node, 'role'),
            type: attr(node, 'type'),
            className: typeof node.className === 'string' ? node.className : '',
            text: node.textContent?.trim()?.slice(0, 120) || '',
          }
        : null;
      const open = document.querySelector('[data-testid="command-palette-open"]');
      const openButton = open?.closest?.('button') ?? open;
      const input = document.querySelector('[data-testid="command-palette-input"]');
      const commandTextNode = Array.from(document.querySelectorAll('p, div, span'))
        .find((node) => node.textContent?.includes('KOAPTIX COMMAND PALETTE')) ?? null;
      const modalRoot = input?.closest('.fixed.inset-0') ?? commandTextNode?.closest('.fixed.inset-0') ?? null;
      const dialogLike = document.querySelector('[role="dialog"], [aria-modal="true"]');
      const focused = document.activeElement;
      const openRect = openButton?.getBoundingClientRect?.() ?? null;
      const openHasRect = Boolean(openRect && openRect.width > 0 && openRect.height > 0);
      const openCenterX = openHasRect ? openRect.left + openRect.width / 2 : null;
      const openCenterY = openHasRect ? openRect.top + openRect.height / 2 : null;
      const openPointNode = openHasRect ? document.elementFromPoint(openCenterX, openCenterY) : null;
      const openStyle = openButton ? window.getComputedStyle(openButton) : null;
      const openPointWithinTrigger = Boolean(
        openButton &&
        openPointNode &&
        (openButton === openPointNode || openButton.contains(openPointNode) || openPointNode.contains(openButton))
      );
      const searchableNodes = Array.from(document.querySelectorAll('input, textarea, [contenteditable="true"], [role="textbox"]'))
        .map(describe);
      return {
        href: location.href,
        readyState: document.readyState,
        urlUniverse: params.get('universe') || 'KOREA_ALL',
        currentUniverseCode: attr(document.querySelector('[data-testid="current-universe-label"]'), 'data-universe-code'),
        openTriggerExists: Boolean(open),
        openTrigger: describe(open),
        commandPaletteRootExists: Boolean(commandTextNode),
        modalRootExists: Boolean(modalRoot),
        dialogRootExists: Boolean(dialogLike),
        inputExists: Boolean(input),
        input: describe(input),
        focusedElement: describe(focused),
        searchableNodeCount: searchableNodes.length,
        searchableNodes,
        resultCardCount: document.querySelectorAll('[data-testid="command-result-card"]').length,
        ulsanResultExists: Boolean(document.querySelector('[data-testid="command-result-card"][data-universe-code="ULSAN_ALL"]')),
        visibleError: document.body.textContent.includes('signal is aborted without reason')
          ? 'signal is aborted without reason'
          : 'NONE',
        openTriggerTagName: openButton?.tagName || '',
        openTriggerDisabled: Boolean(openButton?.disabled),
        openTriggerAriaDisabled: attr(openButton, 'aria-disabled'),
        openTriggerPointerEvents: openStyle?.pointerEvents || '',
        openTriggerVisibility: openStyle?.visibility || '',
        openTriggerDisplay: openStyle?.display || '',
        openTriggerRect: openHasRect
          ? {
              width: Math.round(openRect.width),
              height: Math.round(openRect.height),
              centerX: Math.round(openCenterX),
              centerY: Math.round(openCenterY),
            }
          : null,
        openTriggerElementFromPoint: describe(openPointNode),
        openTriggerElementFromPointWithinTarget: openPointWithinTrigger,
      };
    })()`,
  );
}

function formatCommandPaletteDiagnostics(diag) {
  const searchableSummary = (diag.searchableNodes || [])
    .map((node) => `${node.tagName || 'EMPTY'}:${node.testId || 'EMPTY'}:${node.type || 'EMPTY'}`)
    .join("|");

  return [
    `href=${diag.href || "EMPTY"}`,
    `readyState=${diag.readyState || "EMPTY"}`,
    `urlUniverse=${diag.urlUniverse || "EMPTY"}`,
    `currentUniverseCode=${diag.currentUniverseCode || "EMPTY"}`,
    `openTriggerExists=${diag.openTriggerExists ? "true" : "false"}`,
    `openTriggerTagName=${diag.openTriggerTagName || "EMPTY"}`,
    `openTriggerDisabled=${diag.openTriggerDisabled ? "true" : "false"}`,
    `openTriggerPointerEvents=${diag.openTriggerPointerEvents || "EMPTY"}`,
    `openTriggerVisibility=${diag.openTriggerVisibility || "EMPTY"}`,
    `openTriggerDisplay=${diag.openTriggerDisplay || "EMPTY"}`,
    `openTriggerRect=${diag.openTriggerRect ? `${diag.openTriggerRect.width}x${diag.openTriggerRect.height}@${diag.openTriggerRect.centerX},${diag.openTriggerRect.centerY}` : "EMPTY"}`,
    `openTriggerFromPoint=${diag.openTriggerElementFromPoint?.tagName || "EMPTY"}:${diag.openTriggerElementFromPoint?.testId || "EMPTY"} within=${diag.openTriggerElementFromPointWithinTarget ? "true" : "false"}`,
    `commandPaletteRootExists=${diag.commandPaletteRootExists ? "true" : "false"}`,
    `modalRootExists=${diag.modalRootExists ? "true" : "false"}`,
    `dialogRootExists=${diag.dialogRootExists ? "true" : "false"}`,
    `inputExists=${diag.inputExists ? "true" : "false"}`,
    `focused=${diag.focusedElement?.tagName || "EMPTY"}:${diag.focusedElement?.testId || "EMPTY"}:${diag.focusedElement?.type || "EMPTY"}`,
    `searchableNodeCount=${diag.searchableNodeCount ?? "EMPTY"}`,
    `searchableNodes=${searchableSummary || "EMPTY"}`,
    `resultCardCount=${diag.resultCardCount ?? "EMPTY"}`,
    `ulsanResultExists=${diag.ulsanResultExists ? "true" : "false"}`,
    `visibleError=${diag.visibleError || "NONE"}`,
  ].join("; ");
}

function makeCommandPaletteFailure({
  step,
  diag,
  visibleError,
  notes = "",
}) {
  return [
    "[REGIONAL_IDENTITY_SMOKE_FAIL]",
    `step=${step}`,
    "expected_universe=ULSAN_ALL",
    `href=${diag?.href || "EMPTY"}`,
    `readyState=${diag?.readyState || "EMPTY"}`,
    `urlUniverse=${diag?.urlUniverse || "EMPTY"}`,
    `currentUniverseCode=${diag?.currentUniverseCode || "EMPTY"}`,
    `commandPaletteRootExists=${diag?.commandPaletteRootExists ? "true" : "false"}`,
    `modalRootExists=${diag?.modalRootExists ? "true" : "false"}`,
    `dialogRootExists=${diag?.dialogRootExists ? "true" : "false"}`,
    `inputExists=${diag?.inputExists ? "true" : "false"}`,
    `focusedElement=${diag?.focusedElement?.tagName || "EMPTY"} testid=${diag?.focusedElement?.testId || "EMPTY"} type=${diag?.focusedElement?.type || "EMPTY"}`,
    `searchableNodeCount=${diag?.searchableNodeCount ?? "EMPTY"}`,
    `openTriggerExists=${diag?.openTriggerExists ? "true" : "false"}`,
    `openTriggerTagName=${diag?.openTriggerTagName || "EMPTY"}`,
    `openTriggerDisabled=${diag?.openTriggerDisabled ? "true" : "false"}`,
    `openTriggerPointerEvents=${diag?.openTriggerPointerEvents || "EMPTY"}`,
    `openTriggerVisibility=${diag?.openTriggerVisibility || "EMPTY"}`,
    `openTriggerDisplay=${diag?.openTriggerDisplay || "EMPTY"}`,
    `openTriggerRect=${diag?.openTriggerRect ? `${diag.openTriggerRect.width}x${diag.openTriggerRect.height}@${diag.openTriggerRect.centerX},${diag.openTriggerRect.centerY}` : "EMPTY"}`,
    `openTriggerFromPoint=${diag?.openTriggerElementFromPoint?.tagName || "EMPTY"} testid=${diag?.openTriggerElementFromPoint?.testId || "EMPTY"} within=${diag?.openTriggerElementFromPointWithinTarget ? "true" : "false"}`,
    `resultCardCount=${diag?.resultCardCount ?? "EMPTY"}`,
    `ulsanResultExists=${diag?.ulsanResultExists ? "true" : "false"}`,
    `visible_error=${visibleError || diag?.visibleError || "NONE"}`,
    `notes=${notes || "NONE"}`,
  ].join("\n");
}

async function failWithCommandPaletteDiagnostics(client, step, visibleError, notes = "") {
  const diag = await getCommandPaletteDiagnostics(client);
  throw new Error(makeCommandPaletteFailure({ step, diag, visibleError, notes }));
}

async function waitForActionableCommandPaletteOpen(client, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  let lastDiag = null;

  while (Date.now() < deadline) {
    await evaluate(
      client,
      `(() => {
        const trigger = document.querySelector('[data-testid="command-palette-open"]');
        const button = trigger?.closest?.('button') ?? trigger;
        button?.scrollIntoView?.({ block: 'center', inline: 'center' });
        return Boolean(button);
      })()`,
    );
    await sleep(80);
    lastDiag = await getCommandPaletteDiagnostics(client);

    const actionable =
      lastDiag.openTriggerExists &&
      lastDiag.openTriggerTagName === "BUTTON" &&
      lastDiag.openTriggerDisabled !== true &&
      lastDiag.openTriggerAriaDisabled !== "true" &&
      lastDiag.openTriggerPointerEvents !== "none" &&
      lastDiag.openTriggerVisibility !== "hidden" &&
      lastDiag.openTriggerDisplay !== "none" &&
      Boolean(lastDiag.openTriggerRect) &&
      lastDiag.openTriggerRect.width > 0 &&
      lastDiag.openTriggerRect.height > 0 &&
      lastDiag.openTriggerElementFromPointWithinTarget;

    if (actionable) return lastDiag;
    await sleep(120);
  }

  const error = new Error("Command palette open trigger not actionable");
  error.diagnostics = lastDiag;
  throw error;
}

async function dispatchCommandPaletteOpenClick(client, strategy) {
  return await evaluate(
    client,
    `(() => {
      const trigger = document.querySelector('[data-testid="command-palette-open"]');
      if (!trigger) return { clicked: false, reason: 'missing-trigger', strategy: ${JSON.stringify(strategy)} };
      const button = trigger.closest?.('button') ?? trigger;
      button.scrollIntoView?.({ block: 'center', inline: 'center' });

      if (${JSON.stringify(strategy)} === 'button-prototype-click') {
        HTMLElement.prototype.click.call(button);
        return { clicked: true, strategy: ${JSON.stringify(strategy)}, tagName: button.tagName, testId: button.getAttribute('data-testid') || '' };
      }

      if (${JSON.stringify(strategy)} === 'mouse-sequence-fallback') {
        for (const type of ['mousedown', 'mouseup', 'click']) {
          button.dispatchEvent(new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: window,
            button: 0,
            buttons: type === 'mouseup' ? 0 : 1,
          }));
        }
        return { clicked: true, strategy: ${JSON.stringify(strategy)}, tagName: button.tagName, testId: button.getAttribute('data-testid') || '' };
      }

      return { clicked: false, reason: 'unknown-strategy', strategy: ${JSON.stringify(strategy)} };
    })()`,
  );
}

async function clickCommandPaletteOpen(client) {
  await waitForActionableCommandPaletteOpen(client);
  const strategies = ["button-prototype-click", "mouse-sequence-fallback"];
  let lastClick = null;
  let lastInputError = null;

  for (const strategy of strategies) {
    const clicked = await dispatchCommandPaletteOpenClick(client, strategy);
    lastClick = clicked;

    if (!clicked?.clicked) {
      continue;
    }

    try {
      await waitForCommandPaletteInput(client, 1_800);
      return clicked;
    } catch (error) {
      lastInputError = error;
    }
  }

  const error = new Error(
    `Command palette did not open after click strategies lastClick=${JSON.stringify(lastClick)}`,
  );
  error.diagnostics = lastInputError?.diagnostics ?? (await getCommandPaletteDiagnostics(client));
  throw error;
}

async function waitForCommandPaletteInput(client, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  let lastDiag = null;

  while (Date.now() < deadline) {
    lastDiag = await getCommandPaletteDiagnostics(client);
    if (lastDiag.inputExists) return lastDiag;
    await sleep(120);
  }

  const error = new Error("Command palette input did not appear");
  error.diagnostics = lastDiag;
  throw error;
}

async function openCommandPaletteAndWaitForInput(client, step = "COMMAND_PALETTE_OPEN") {
  await waitForHomeUiAnchors(client);
  const before = await getCommandPaletteDiagnostics(client);
  console.log(`[command-palette] before_open ${formatCommandPaletteDiagnostics(before)}`);

  try {
    const clicked = await clickCommandPaletteOpen(client);
    console.log(`[command-palette] open_click ${JSON.stringify(clicked)}`);
    const ready = await waitForCommandPaletteInput(client);
    console.log(`[command-palette] input_ready ${formatCommandPaletteDiagnostics(ready)}`);
    return ready;
  } catch (error) {
    const diag = error?.diagnostics ?? (await getCommandPaletteDiagnostics(client));
    throw new Error(
      makeCommandPaletteFailure({
        step,
        diag,
        visibleError: "Command palette input missing after open",
        notes: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

async function fillCommandPaletteInput(client, value, step = "COMMAND_PALETTE_INPUT") {
  await openCommandPaletteAndWaitForInput(client, step);
  const filled = await evaluate(
    client,
    `(() => {
      const input = document.querySelector('[data-testid="command-palette-input"]');
      if (!input) return false;
      input.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: ${JSON.stringify(value)},
      }));
      return true;
    })()`,
  );

  if (!filled) {
    await failWithCommandPaletteDiagnostics(
      client,
      step,
      "Command palette input disappeared before fill",
      `value=${value}`,
    );
  }
}

async function waitForCommandPaletteResult(client, universeCode, step) {
  try {
    await waitFor(
      client,
      `Boolean(document.querySelector('[data-testid="command-result-card"][data-universe-code="${universeCode}"]'))`,
      12_000,
    );
  } catch (error) {
    await failWithCommandPaletteDiagnostics(
      client,
      step,
      `Command palette result missing for ${universeCode}`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function runCommandPaletteProbe() {
  console.log(`[command-palette-probe] base_url=${baseUrl}`);
  const browser = await launchBrowser(`${baseUrl}/?universe=ULSAN_ALL`);
  const { client } = browser;

  try {
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await waitForHomeUiAnchors(client);
    await fillCommandPaletteInput(client, "월드", "COMMAND_PALETTE_PROBE_INPUT");
    await waitForCommandPaletteResult(client, "ULSAN_ALL", "COMMAND_PALETTE_PROBE_RESULT");
    const finalDiag = await getCommandPaletteDiagnostics(client);
    console.log(`[command-palette-probe] pass ${formatCommandPaletteDiagnostics(finalDiag)}`);
  } finally {
    client.close();
    await browser.close();
  }
}

async function fill(client, selector, value) {
  const ok = await evaluate(
    client,
    `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      el.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ${JSON.stringify(value)} }));
      return true;
    })()`,
  );
  if (!ok) throw new Error(`Missing input selector: ${selector}`);
}

async function getState(client) {
  return await evaluate(
    client,
    `(() => {
      const params = new URLSearchParams(location.search);
      const text = (sel) => document.querySelector(sel)?.textContent?.trim() || '';
      const attr = (sel, name) => document.querySelector(sel)?.getAttribute(name) || '';
      const cardUniverses = Array.from(document.querySelectorAll('[data-testid="ranking-card"]'))
        .slice(0, 8)
        .map((el) => el.getAttribute('data-universe-code') || '');
      const chartText = text('[data-testid="market-chart-card"]');
      return {
        pathname: location.pathname,
        universe: params.get('universe') || 'KOREA_ALL',
        complexId: params.get('complexId') || '',
        q: params.get('q') || '',
        tier: params.get('tier') || '',
        currentLabel: text('[data-testid="current-universe-label"]'),
        currentUniverseCode: attr('[data-testid="current-universe-label"]', 'data-universe-code'),
        mapUniverse: attr('[data-testid="neon-map"]', 'data-universe-code'),
        boardUniverse: attr('[data-testid="ranking-board"]', 'data-universe-code'),
        boardApiBasePath: attr('[data-testid="ranking-board"]', 'data-api-base-path'),
        chartRequested: attr('[data-testid="market-chart-card"]', 'data-requested-universe-code'),
        chartRendered: attr('[data-testid="market-chart-card"]', 'data-rendered-universe-code'),
        chartText,
        cardUniverses,
        detailOpen: Boolean(document.querySelector('[data-testid="complex-detail-sheet"]')),
        detailComplexId: attr('[data-testid="complex-detail-sheet"]', 'data-complex-id'),
        visibleError: document.body.textContent.includes('signal is aborted without reason')
          ? 'signal is aborted without reason'
          : 'NONE',
      };
    })()`,
  );
}

function assertState(state, expected, step, options = {}) {
  const expectedUrlUniverse = expected === "KOREA_ALL" ? "KOREA_ALL" : expected;
  const failures = [];

  if (state.universe !== expectedUrlUniverse) failures.push(`URL universe ${state.universe}`);
  if (state.currentUniverseCode !== expected) failures.push(`Current Universe code ${state.currentUniverseCode}`);
  if (options.expectMap !== false && state.mapUniverse !== expected) failures.push(`NeonMap universe ${state.mapUniverse}`);
  if (state.boardUniverse !== expected) failures.push(`Rankings board universe ${state.boardUniverse}`);
  if (state.chartRequested && state.chartRequested !== expected) failures.push(`Chart requested ${state.chartRequested}`);
  if (state.chartRendered && state.chartRendered !== expected) failures.push(`Chart rendered ${state.chartRendered}`);

  const staleCard = state.cardUniverses.find((code) => code && code !== expected);
  if (staleCard) failures.push(`Ranking card stale universe ${staleCard}`);
  if (state.visibleError !== "NONE") failures.push(`Visible error ${state.visibleError}`);

  if (failures.length > 0) {
    throw new Error(
      makeFailure({
        step,
        expectedCode: expected,
        urlUniverse: state.universe,
        currentUniverseLabel: state.currentLabel,
        mapIdentity: state.mapUniverse === expected ? "OK" : `STALE:${state.mapUniverse || "EMPTY"}`,
        chartRequested: state.chartRequested,
        chartRendered: state.chartRendered,
        rankingsIdentity: state.boardUniverse === expected && !staleCard ? "OK" : "STALE",
        visibleError: state.visibleError,
        notes: failures.join("; "),
      }),
    );
  }
}

async function run() {
  if (busanProbeMode) {
    await runBusanProbe();
    return;
  }
  if (commandPaletteProbeMode) {
    await runCommandPaletteProbe();
    return;
  }

  console.log(`[browser-smoke] base_url=${baseUrl}`);
  const browser = await launchBrowser();
  const { client } = browser;

  try {
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    await navigate(client, "/");
    let state = await getState(client);
    assertState(state, "KOREA_ALL", "HOME_KOREA_ALL");
    console.log("[browser-smoke] ok step=HOME_KOREA_ALL");

    for (const spec of regionalSteps) {
      await clickUniverseOption(client, spec);
      await waitForUniverseSignal(client, spec);
      await waitForBoardUniverse(client, spec);
      await waitForChartUniverse(client, spec);
      state = await getState(client);
      assertState(state, spec.code, spec.step);
      console.log(`[browser-smoke] ok step=${spec.step} universe=${spec.code}`);
    }

    for (const spec of sggBrowserSteps) {
      await click(client, '[data-testid="universe-finder-toggle"]');
      await waitFor(client, "Boolean(document.querySelector('[data-testid=\"universe-search-input\"]'))");
      await fill(client, '[data-testid="universe-search-input"]', spec.code);
      const clickResult = await clickUniverseOptionActionable(client, spec);
      await waitForBoardUniverse(client, spec, clickResult.strategy);
      await waitForChartUniverse(client, spec, clickResult.strategy);
      state = await getState(client);
      assertState(state, spec.code, spec.step);
      console.log(`[browser-smoke] ok step=${spec.step} universe=${spec.code}`);
    }

    if (top1000BaselineGateMode) {
      await navigate(client, "/ranking?universe=ULSAN_ALL&q=%EC%9B%94%EB%93%9C&tier=S&complexId=178897");
    await waitFor(client, "Boolean(document.querySelector('[data-testid=\"complex-detail-sheet\"]'))");
    state = await getState(client);
    assertState(state, "ULSAN_ALL", "TOP1000_DEEP_LINK", { expectMap: false });
    if (state.pathname !== "/ranking" || state.q !== "월드" || state.tier !== "S" || state.complexId !== "178897") {
      throw new Error(
        makeFailure({
          step: "TOP1000_DEEP_LINK",
          expectedCode: "ULSAN_ALL",
          urlUniverse: state.universe,
          currentUniverseLabel: state.currentLabel,
          mapIdentity: "N/A",
          chartRequested: "N/A",
          chartRendered: "N/A",
          rankingsIdentity: "STALE",
          visibleError: state.visibleError,
          notes: `URL state mismatch pathname=${state.pathname}, q=${state.q}, tier=${state.tier}, complexId=${state.complexId}`,
        }),
      );
    }
    await click(client, '[data-testid="complex-detail-close"]');
    await waitFor(client, "!new URLSearchParams(location.search).has('complexId')");
    state = await getState(client);
    if (state.complexId || state.q !== "월드" || state.tier !== "S" || state.universe !== "ULSAN_ALL") {
      throw new Error(
        makeFailure({
          step: "TOP1000_DETAIL_CLOSE",
          expectedCode: "ULSAN_ALL",
          urlUniverse: state.universe,
          currentUniverseLabel: state.currentLabel,
          mapIdentity: "N/A",
          chartRequested: "N/A",
          chartRendered: "N/A",
          rankingsIdentity: "STALE",
          visibleError: state.visibleError,
          notes: `Close did not preserve URL state q=${state.q}, tier=${state.tier}, complexId=${state.complexId}`,
        }),
      );
    }
      console.log("[browser-smoke] ok step=TOP1000_DEEP_LINK_AND_CLOSE");

    }

    await navigate(client, "/?universe=ULSAN_ALL");
    await fillCommandPaletteInput(client, "월드", "COMMAND_PALETTE_REGIONAL_SELECT");
    await waitForCommandPaletteResult(client, "ULSAN_ALL", "COMMAND_PALETTE_REGIONAL_SELECT");
    await click(client, '[data-testid="command-result-card"][data-universe-code="ULSAN_ALL"]');
    await waitFor(client, "new URLSearchParams(location.search).has('complexId')");
    state = await getState(client);
    assertState(state, "ULSAN_ALL", "COMMAND_PALETTE_REGIONAL_SELECT");
    if (!state.complexId || state.detailOpen === false) {
      throw new Error(
        makeFailure({
          step: "COMMAND_PALETTE_REGIONAL_SELECT",
          expectedCode: "ULSAN_ALL",
          urlUniverse: state.universe,
          currentUniverseLabel: state.currentLabel,
          mapIdentity: state.mapUniverse === "ULSAN_ALL" ? "OK" : "STALE",
          chartRequested: state.chartRequested,
          chartRendered: state.chartRendered,
          rankingsIdentity: "STALE",
          visibleError: state.visibleError,
          notes: `Command result did not open same-universe detail complexId=${state.complexId}, detailOpen=${state.detailOpen}`,
        }),
      );
    }
    console.log("[browser-smoke] ok step=COMMAND_PALETTE_REGIONAL_SELECT");
    console.log("[browser-smoke] pass");
  } finally {
    client.close();
    await browser.close();
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("[REGIONAL_IDENTITY_SMOKE_FAIL]")) {
    console.error(message);
  } else {
    console.error(
      makeFailure({
        step: "BROWSER_HARNESS",
        expectedCode: "UNKNOWN",
        rankingsIdentity: "ERROR",
        visibleError: message,
        notes: "Browser smoke failed before a scenario assertion completed.",
      }),
    );
  }
  process.exit(1);
});
