import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = name => path.join(root, "src/lib/koaptix", `${name}.ts`);
const cardFile = path.join(root, "src/components/home/v2/HomeV2MyHome.tsx");
const text = html => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function harness(hookChanges = {}) {
  const modules = new Map();
  const state = [];
  const acknowledged = [];
  const comparisonProps = [];
  let stateIndex = 0;
  const bookmarkState = {
    bookmarks: ["42"], bookmarkDetails: { "42": { name: "저장한 단지", locationLabel: "서울 송파구 잠실동", universeCode: "SGG_11710" } },
    primaryComplexId: "42", lastViewedByUniverse: {}, isLoaded: true, storageUnavailable: false,
    clearPrimaryBookmark() {}, markPrimaryViewed: value => acknowledged.push(value), ...hookChanges,
  };
  const mockReact = {
    ...React,
    useEffect() {},
    useMemo: calculate => calculate(),
    useState(initial) {
      const index = stateIndex++;
      if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
      return [state[index], next => { state[index] = typeof next === "function" ? next(state[index]) : next; }];
    },
  };
  function load(file) {
    if (modules.has(file)) return modules.get(file).exports;
    const module = { exports: {} };
    modules.set(file, module);
    const code = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    runInNewContext(code, { module, exports: module.exports, URLSearchParams, require(name) {
      if (name === "react") return mockReact;
      if (name === "next/link") return { __esModule: true, default: ({ href, ...props }) => React.createElement("a", { href, ...props }) };
      if (!name.startsWith(".")) return require(name);
      const resolved = path.resolve(path.dirname(file), name);
      if (resolved === path.join(root, "src/hooks/useBookmarks")) return { useBookmarks: () => bookmarkState };
      if (resolved.endsWith(path.join("home", "ComparisonSheet"))) return { __esModule: true, default: props => {
        comparisonProps.push(props);
        return React.createElement("aside", { "data-testid": "comparison-sheet" }, props.items.map(item => item.name).join(" · "));
      } };
      const dependency = [resolved + ".ts", resolved + ".tsx"].find(existsSync);
      if (!dependency) throw new Error(`Unexpected local dependency: ${name}`);
      return load(dependency);
    } }, { filename: file });
    return module.exports;
  }
  const { HomeV2MyHome } = load(cardFile);
  const { readMyHomeBoard } = load(lib("myHomeRanking"));
  return {
    acknowledged, comparisonProps, bookmarkState, readMyHomeBoard,
    render(props) {
      stateIndex = 0;
      const tree = HomeV2MyHome(props);
      const html = renderToStaticMarkup(tree);
      return { tree, html, text: text(html) };
    },
  };
}

function publication(code = "KOREA_ALL", date = "2026-08-31", changes = {}) {
  return {
    generation_id: "733d03e6-e029-449b-a748-26c4b032df05", publication_version: 2,
    publication_event_id: "90f8bd8d-9a97-44df-834c-8c23c4077d40", published_at: "2026-10-15T00:22:12.07608+00:00",
    surface_code: "UNIVERSE_SERVICE", universe_code: code, snapshot_date: date, ...changes,
  };
}
function board(h, code, date, rows, changes = {}) {
  const identity = publication(code, date, changes);
  return h.readMyHomeBoard({
    ...identity, ok: true, requestedUniverseCode: code, renderedUniverseCode: code, latestBoardDate: date,
    items: rows.map(([id, rank, name, cap = 1_200_000_000_000]) => ({
      ...identity, complexId: String(id), name, rank, rank_all: rank, marketCapKrw: cap,
      marketCapTrillionKrw: cap / 1_000_000_000_000, universeCode: code, snapshotDate: date,
      cityName: "서울", sigunguName: "송파구", legalDongName: "잠실동", locationLabel: "서울 송파구 잠실동",
      rankDelta7d: null, recoveryRate52w: null,
    })),
  }, code);
}
function props(h, { nationalRows, regionalRows, nationalPublication = {} } = {}) {
  return {
    nationalStatus: "ready",
    nationalBoard: board(h, "KOREA_ALL", "2026-08-31", nationalRows ?? [[41, 8, "전국 바로 위"], [42, 9, "내 아파트"], [43, 10, "전국 바로 아래"]], nationalPublication),
    selectedBoard: board(h, "SGG_11710", "2026-07-03", regionalRows ?? [[50, 1, "지역 바로 위"], [42, 2, "내 아파트", 900_000_000_000], [51, 3, "지역 바로 아래"]]),
  };
}
function elements(tree, predicate) {
  if (!React.isValidElement(tree)) return [];
  return [...(predicate(tree) ? [tree] : []), ...React.Children.toArray(tree.props.children).flatMap(child => elements(child, predicate))];
}
function button(tree, label) {
  const found = elements(tree, element => element.type === "button" && element.props["aria-label"] === label);
  assert.equal(found.length, 1, `Expected one button: ${label}`);
  return found[0];
}
function metric(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const found = html.match(new RegExp(`<dt[^>]*>${escaped}</dt>\\s*<dd[^>]*>(.*?)</dd>\\s*<p[^>]*>(.*?)</p>`));
  assert.ok(found, `Expected metric: ${label}`);
  return text(`${found[1]} ${found[2]}`);
}

test("the rendered card keeps national and regional ranks with their own exact publication dates", () => {
  const h = harness();
  const rendered = h.render(props(h));
  assert.equal(metric(rendered.html, "전국 공개 순위"), "9위 2026-08-31 기준");
  assert.equal(metric(rendered.html, "송파구 공개 순위"), "2위 2026-07-03 기준");
  assert.equal(metric(rendered.html, "단지 전체 추정 시가총액"), "1.20조원 2026-08-31 · 전국 공표 기준");
  assert.match(rendered.text, /전국과 지역의 기준일이 달라요/);
  assert.match(rendered.html, /universe=KOREA_ALL&amp;complexId=42/);
  assert.doesNotMatch(rendered.text, /현재 시세|상위 [\d.]+%|(?:^|\s)0위(?:\s|$)/);
});

test("a regional-only saved apartment uses its selected public scope and never invents a national rank", () => {
  const h = harness();
  const rendered = h.render(props(h, { nationalRows: [[999, 1, "다른 전국 단지"]] }));
  assert.equal(metric(rendered.html, "전국 공개 순위"), "공개 순위 미확인 불러온 공개 랭킹에서 확인하지 못했어요");
  assert.equal(metric(rendered.html, "송파구 공개 순위"), "2위 2026-07-03 기준");
  assert.equal(metric(rendered.html, "단지 전체 추정 시가총액"), "9,000.0억원 2026-07-03 · 송파구 공표 기준");
  assert.match(rendered.html, /universe=SGG_11710&amp;complexId=42/);
  assert.match(rendered.text, /지역 바로 위/);
  assert.match(rendered.text, /지역 바로 아래/);
  assert.doesNotMatch(rendered.text, /TOP1000 밖|TOP1000에 없는|0위|0원/);
});

test("a saved complex absent from both loaded boards keeps unknown ranks and a blank capital value", () => {
  const h = harness();
  const rendered = h.render(props(h, { nationalRows: [[999, 1, "다른 전국 단지"]], regionalRows: [[888, 1, "다른 지역 단지"]] }));
  assert.equal(metric(rendered.html, "전국 공개 순위"), "공개 순위 미확인 불러온 공개 랭킹에서 확인하지 못했어요");
  assert.equal(metric(rendered.html, "송파구 공개 순위"), "공개 순위 미확인 불러온 공개 랭킹에서 확인하지 못했어요");
  assert.equal(metric(rendered.html, "단지 전체 추정 시가총액"), "— 공개된 값을 확인하고 있어요");
  assert.doesNotMatch(rendered.text, /0위|0원|TOP1000 밖|TOP1000에 없는|바로 위·아래 단지는/);
});

test("first observation, unchanged publication, date-only changes and other-scope seen state have no new-publication badge", () => {
  for (const seen of [null, publication(), publication("KOREA_ALL", "2026-08-24"), publication("SGG_11710", "2026-07-03")]) {
    const h = harness({ lastViewedByUniverse: seen ? { KOREA_ALL: { ...seen, complexId: "42" } } : {} });
    const rendered = h.render(props(h));
    assert.doesNotMatch(rendered.html, /aria-label="새 공표 확인 완료"/);
    assert.equal(h.acknowledged.length, 0);
  }
});

test("a genuinely newer publication shows a badge and acknowledgement records its real identity and date", () => {
  const h = harness({ lastViewedByUniverse: { KOREA_ALL: { ...publication(), complexId: "42" } } });
  const currentProps = props(h, { nationalPublication: {
    generation_id: "833d03e6-e029-449b-a748-26c4b032df05", publication_version: 3,
    publication_event_id: "80f8bd8d-9a97-44df-834c-8c23c4077d40", published_at: "2026-10-16T00:00:00Z",
  } });
  const rendered = h.render(currentProps);
  assert.match(rendered.text, /새 공표 · 확인했어요/);
  button(rendered.tree, "새 공표 확인 완료").props.onClick();
  assert.equal(h.acknowledged.length, 2);
  for (const observedBoard of [currentProps.nationalBoard, currentProps.selectedBoard]) {
    const acknowledged = h.acknowledged.find(value => value.universe_code === observedBoard.publication.universe_code);
    assert.equal(acknowledged.complexId, "42");
    for (const key of ["generation_id", "publication_version", "publication_event_id", "published_at", "surface_code", "snapshot_date", "universe_code"]) {
      assert.equal(acknowledged[key], observedBoard.publication[key]);
    }
  }
  assert.equal(h.acknowledged.find(value => value.universe_code === "KOREA_ALL").snapshot_date, "2026-08-31");
});

test("a newer regional publication has a badge even when the national publication is unchanged", () => {
  const h = harness({ lastViewedByUniverse: {
    KOREA_ALL: { ...publication(), complexId: "42" },
    SGG_11710: { ...publication("SGG_11710", "2026-07-03", {
      publication_version: 1, publication_event_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", published_at: "2026-10-14T00:00:00Z",
    }), complexId: "42" },
  } });
  assert.match(h.render(props(h)).html, /aria-label="새 공표 확인 완료"/);
});

test("neighbor comparison receives only the selected and exact adjacent national rows from one publication", () => {
  const h = harness();
  const currentProps = props(h);
  const rendered = h.render(currentProps);
  assert.match(rendered.text, /전국 바로 위/);
  assert.match(rendered.text, /전국 바로 아래/);
  assert.doesNotMatch(rendered.text, /지역 바로 위|지역 바로 아래/);
  button(rendered.tree, "내 아파트와 전국 바로 위 비교").props.onClick();
  assert.match(h.render(currentProps).html, /data-testid="comparison-sheet"/);
  const compared = h.comparisonProps.at(-1).items;
  assert.equal(compared[0].complexId, "42"); assert.equal(compared[1].complexId, "41");
  assert.equal(compared[0].rank - compared[1].rank, 1);
  for (const key of ["generation_id", "publication_version", "publication_event_id", "published_at", "surface_code", "snapshotDate", "universeCode"]) {
    assert.equal(compared[0][key], compared[1][key]);
  }
});

test("gaps and TOP1000 boundaries do not render fabricated adjacent comparisons", () => {
  const h = harness();
  const gaps = h.render(props(h, { nationalRows: [[40, 7, "두 순위 위"], [42, 9, "내 아파트"], [44, 11, "두 순위 아래"]] }));
  assert.doesNotMatch(gaps.text, /바로 위·아래 단지는|두 순위 위|두 순위 아래|지역 바로 위|지역 바로 아래/);
  const boundary = h.render(props(h, { nationalRows: [[41, 999, "999위 단지"], [42, 1000, "내 아파트"]] }));
  assert.match(boundary.text, /999위 단지/);
  assert.doesNotMatch(boundary.text, /1,001위|1001위|0위 단지/);
});

test("an opened comparison cannot survive a publication replacement for the same primary complex", () => {
  const h = harness();
  const original = props(h);
  button(h.render(original).tree, "내 아파트와 전국 바로 위 비교").props.onClick();
  assert.match(h.render(original).html, /data-testid="comparison-sheet"/);
  const replaced = props(h, { nationalPublication: {
    generation_id: "833d03e6-e029-449b-a748-26c4b032df05", publication_version: 3,
    publication_event_id: "80f8bd8d-9a97-44df-834c-8c23c4077d40", published_at: "2026-10-16T00:00:00Z",
  } });
  assert.doesNotMatch(h.render(replaced).html, /data-testid="comparison-sheet"/);
});

test("first-view identity is recorded only after intersection visibility while a seen newer publication stays unacknowledged", () => {
  const first = harness();
  const initial = first.render(props(first));
  const initialMarkers = elements(initial.tree, element => typeof element.type === "function" && element.type.name === "InitialPublicationView");
  assert.equal(initialMarkers.length, 2);
  assert.equal(first.acknowledged.length, 0);
  const markerProps = initialMarkers.find(element => element.props.publication.universe_code === "KOREA_ALL").props;

  // Run the actual private visibility component, attaching its ref as the DOM
  // does after render. The card props above came through the real board reader.
  const source = ts.createSourceFile(cardFile, readFileSync(cardFile, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "InitialPublicationView");
  assert.ok(declaration);
  const module = { exports: {} };
  let effect;
  let marker;
  let observer;
  const section = {};
  const observed = [];
  let disconnected = 0;
  const code = ts.transpileModule(`${declaration.getText(source)}\nexport { InitialPublicationView };`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(code, {
    module, exports: module.exports, require,
    useRef: value => { marker = { current: value }; return marker; },
    useEffect: callback => { effect = callback; },
    IntersectionObserver: class {
      constructor(callback) { observer = { callback }; }
      observe(node) { observed.push(node); }
      disconnect() { disconnected++; }
    },
  });
  module.exports.InitialPublicationView(markerProps);
  assert.equal(first.acknowledged.length, 0);
  marker.current = { closest: selector => { assert.equal(selector, "section"); return section; } };
  const cleanup = effect();
  assert.equal(observed.length, 1); assert.equal(observed[0], section);
  assert.equal(first.acknowledged.length, 0);
  observer.callback([{ isIntersecting: false }]);
  assert.equal(first.acknowledged.length, 0);
  observer.callback([{ isIntersecting: true }]);
  assert.equal(first.acknowledged.length, 1);
  assert.equal(first.acknowledged[0].complexId, "42");
  for (const key of ["generation_id", "publication_version", "publication_event_id", "published_at", "surface_code", "snapshot_date", "universe_code"]) {
    assert.equal(first.acknowledged[0][key], markerProps.publication[key]);
  }
  assert.equal(disconnected, 1);
  cleanup();
  assert.equal(disconnected, 2);

  const seen = harness({ lastViewedByUniverse: {
    KOREA_ALL: { ...publication(), complexId: "42" },
    SGG_11710: { ...publication("SGG_11710", "2026-07-03"), complexId: "42" },
  } });
  const newer = seen.render(props(seen, { nationalPublication: {
    publication_version: 3, publication_event_id: "80f8bd8d-9a97-44df-834c-8c23c4077d40", published_at: "2026-10-16T00:00:00Z",
  } }));
  assert.match(newer.html, /aria-label="새 공표 확인 완료"/);
  assert.equal(elements(newer.tree, element => typeof element.type === "function" && element.type.name === "InitialPublicationView").length, 0);
  assert.equal(seen.acknowledged.length, 0);
});
