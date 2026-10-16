import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function moduleLoader(globals = {}, react) {
  const modules = new Map();
  return function load(relative) {
    const file = path.resolve(root, relative);
    if (modules.has(file)) return modules.get(file).exports;
    const module = { exports: {} };
    modules.set(file, module);
    const source = readFileSync(file, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText;
    runInNewContext(output, {
      module, exports: module.exports, ...globals,
      require(name) {
        if (name === "react") return react;
        if (!name.startsWith(".")) throw new Error("Unexpected dependency: " + name);
        return load(path.resolve(path.dirname(file), name + ".ts"));
      },
    }, { filename: file });
    return module.exports;
  };
}

const storage = moduleLoader()("src/lib/koaptix/myHomeStorage.ts");
const publication = (overrides = {}) => ({
  complexId: "5037", universe_code: "KOREA_ALL", snapshot_date: "2026-08-31",
  generation_id: "11111111-1111-4111-8111-111111111111", publication_version: 7,
  publication_event_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", published_at: "2026-10-15T00:00:00Z",
  surface_code: "UNIVERSE_SERVICE", ...overrides,
});
const newer = (overrides = {}) => publication({
  generation_id: "22222222-2222-4222-8222-222222222222", publication_version: 8,
  publication_event_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", published_at: "2026-10-16T00:00:00Z", ...overrides,
});
const metadata = (overrides = {}) => ({ version: 1, primaryComplexId: "5037", lastViewedByUniverse: {}, ...overrides });
const plain = (value) => JSON.parse(JSON.stringify(value));

test("additive metadata requires an explicit favorite and preserves only valid same-primary public identities", () => {
  for (const stored of [null, "invalid", "[]", JSON.stringify(metadata({ version: 2 })), JSON.stringify(metadata({ primaryComplexId: "0" }))]) {
    assert.deepEqual(plain(storage.parseMyHomeStorage(stored, ["5037"])), plain(storage.emptyMyHomeStorage()));
  }
  assert.equal(storage.parseMyHomeStorage(JSON.stringify(metadata()), []).primaryComplexId, null);
  const parsed = storage.parseMyHomeStorage(JSON.stringify(metadata({ lastViewedByUniverse: {
    KOREA_ALL: { ...publication(), marketCapKrw: 100, sourceObservedAt: "2026-10-16" },
    SEOUL_ALL: publication({ complexId: "5084", universe_code: "SEOUL_ALL" }),
    SGG_11710: publication({ universe_code: "SEOUL_ALL" }),
    UNKNOWN: publication({ universe_code: "UNKNOWN" }),
  } })), ["5037", "5084"]);
  assert.deepEqual(Object.keys(parsed.lastViewedByUniverse), ["KOREA_ALL"]);
  assert.equal("marketCapKrw" in parsed.lastViewedByUniverse.KOREA_ALL, false);
  assert.equal("sourceObservedAt" in parsed.lastViewedByUniverse.KOREA_ALL, false);
});

test("new publication detection requires the actual newer event/version/time in the same complex and universe", () => {
  // Same snapshot republication is still a new publication, with its real old date.
  assert.equal(storage.isNewerMyHomePublication(newer(), publication()), true);
  for (const next of [publication(), null, newer({ complexId: "5084" }), newer({ universe_code: "SEOUL_ALL" }),
    publication({ snapshot_date: "2026-09-07", sourceObservedAt: "2026-10-16" }),
    newer({ publication_version: 7 }), newer({ publication_version: 1 }),
    newer({ published_at: publication().published_at }), newer({ published_at: "2026-10-14T00:00:00Z" }),
    newer({ publication_event_id: publication().publication_event_id }), newer({ surface_code: "GLOBAL_LATEST" }),
    newer({ snapshot_date: "2026-02-30" }), newer({ universe_code: "SGG_99999" })]) {
    assert.equal(storage.isNewerMyHomePublication(next, publication()), false, JSON.stringify(next));
  }
  assert.equal(storage.isNewerMyHomePublication(newer(), null), false);
});

test("explicit viewed records keep first baseline, separate universes and reject delayed or conflicting replacements", () => {
  let state = metadata();
  assert.equal(storage.recordMyHomePublication(state, publication({ complexId: "5084" })), state);
  state = storage.recordMyHomePublication(state, publication());
  const baseline = state;
  assert.equal(storage.recordMyHomePublication(state, publication()), state);
  assert.equal(storage.recordMyHomePublication(state, newer({ publication_version: 7 })), state);
  state = storage.recordMyHomePublication(state, newer());
  assert.equal(state.lastViewedByUniverse.KOREA_ALL.publication_version, 8);
  assert.equal(storage.recordMyHomePublication(state, publication()), state);
  state = storage.recordMyHomePublication(state, publication({ universe_code: "SEOUL_ALL" }));
  assert.deepEqual(Object.keys(state.lastViewedByUniverse), ["KOREA_ALL", "SEOUL_ALL"]);
  assert.equal(baseline.lastViewedByUniverse.KOREA_ALL.publication_version, 7);
});

function hookHarness(initial = {}) {
  const values = new Map(Object.entries(initial));
  const listeners = new Map();
  const failures = { read: false, write: false, writeKey: null };
  const writes = [];
  const localStorage = {
    getItem(key) { if (failures.read) throw new Error("storage denied"); return values.get(key) ?? null; },
    setItem(key, value) { if (failures.write || failures.writeKey === key) throw new Error("storage full"); values.set(key, value); writes.push(key); },
  };
  const window = {
    addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(callback); },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
    dispatchEvent(event) { for (const callback of [...(listeners.get(event.type) ?? [])]) callback(event); return true; },
  };
  let active;
  const effects = [];
  const react = {
    useState(initialValue) {
      const client = active;
      const index = client.cursor++;
      if (!(index in client.slots)) client.slots[index] = typeof initialValue === "function" ? initialValue() : initialValue;
      return [client.slots[index], (value) => { client.slots[index] = typeof value === "function" ? value(client.slots[index]) : value; }];
    },
    useRef(value) {
      const index = active.cursor++;
      if (!(index in active.slots)) active.slots[index] = { current: value };
      return active.slots[index];
    },
    useCallback(callback) { return callback; },
    useEffect(effect) {
      const index = active.cursor++;
      if (!(index in active.slots)) { active.slots[index] = true; effects.push(effect); }
    },
  };
  class CustomEvent { constructor(type, options) { this.type = type; this.detail = options.detail; } }
  const { useBookmarks, parseBookmarkIds } = moduleLoader({ localStorage, window, CustomEvent }, react)("src/hooks/useBookmarks.ts");
  const render = (client) => { active = client; client.cursor = 0; client.current = useBookmarks(); active = null; return client.current; };
  const mount = () => { const client = { slots: [], cursor: 0 }; render(client); while (effects.length) effects.shift()(); render(client); return client; };
  return { values, failures, writes, window, mount, render, parseBookmarkIds,
    storageEvent(key) { window.dispatchEvent({ type: "storage", key }); },
  };
}

test("existing favorite IDs/details load unchanged; primary designation adds only needed favorite and canonical scope metadata", () => {
  const h = hookHarness({ koaptix_bookmarks: '[5037,"5084","5037","0",null]', koaptix_bookmark_details: JSON.stringify({
    5037: { name: "잠실엘스", locationLabel: "송파구 잠실동" },
  }) });
  const client = h.mount();
  assert.deepEqual(plain(client.current.bookmarks), ["5037", "5084"]);
  assert.deepEqual(plain(client.current.bookmarkDetails["5037"]), { name: "잠실엘스", locationLabel: "송파구 잠실동" });
  assert.equal(client.current.primaryComplexId, null);
  assert.equal(client.current.isLoaded, true);
  client.current.setPrimaryBookmark("170015", { name: "현진", locationLabel: "광산구 수완동", universeCode: "GWANGJU_ALL" });
  const current = h.render(client);
  assert.deepEqual(plain(current.bookmarks), ["5037", "5084", "170015"]);
  assert.equal(current.bookmarkDetails["170015"].universeCode, "GWANGJU_ALL");
  assert.equal(current.primaryComplexId, "170015");
  assert.deepEqual(plain(current.lastViewedByUniverse), {});
  const reopened = h.mount();
  assert.equal(reopened.current.primaryComplexId, "170015");
  assert.equal(reopened.current.bookmarkDetails["170015"].universeCode, "GWANGJU_ALL");
  current.setPrimaryBookmark("5037", { name: "잠실엘스", locationLabel: "송파구", universeCode: "UNKNOWN", rank: 1, marketCapKrw: 100 });
  assert.deepEqual(JSON.parse(h.values.get("koaptix_bookmark_details"))["5037"], { name: "잠실엘스", locationLabel: "송파구" });
});

test("same-tab controls share primary/viewed state; changing/removing primary resets only its metadata", () => {
  const h = hookHarness();
  const left = h.mount(); const right = h.mount();
  left.current.setPrimaryBookmark("5037");
  assert.equal(h.render(right).primaryComplexId, "5037");
  right.current.markPrimaryViewed(publication());
  assert.equal(h.render(left).lastViewedByUniverse.KOREA_ALL.publication_version, 7);
  left.current.toggleBookmark("5084");
  left.current.toggleBookmark("5084");
  assert.equal(h.render(right).primaryComplexId, "5037");
  assert.equal(right.current.lastViewedByUniverse.KOREA_ALL.publication_version, 7);
  right.current.setPrimaryBookmark("5084");
  assert.deepEqual(plain(h.render(left).lastViewedByUniverse), {});
  left.current.toggleBookmark("5084");
  assert.equal(h.render(right).primaryComplexId, null);
  assert.deepEqual(plain(right.current.bookmarks), ["5037"]);
  right.current.setPrimaryBookmark("5037");
  right.current.clearPrimaryBookmark();
  assert.equal(h.render(left).primaryComplexId, null);
  assert.deepEqual(plain(left.current.bookmarks), ["5037"]);
});

test("cross-tab metadata/favorite changes and clear synchronize; each mutation preserves latest persisted favorites", () => {
  const h = hookHarness({ koaptix_bookmarks: '["5037"]' });
  const client = h.mount();
  h.values.set("koaptix_bookmarks", '["5037","5084"]');
  h.values.set(storage.MY_HOME_STORAGE_KEY, JSON.stringify(metadata()));
  h.storageEvent(storage.MY_HOME_STORAGE_KEY);
  assert.equal(h.render(client).primaryComplexId, "5037");
  client.current.markPrimaryViewed(publication());
  h.values.set("koaptix_bookmarks", '["5037","5084","170015"]');
  client.current.toggleBookmark("6000");
  assert.deepEqual(plain(h.render(client).bookmarks), ["5037", "5084", "170015", "6000"]);
  h.values.set("koaptix_bookmarks", '["5084"]');
  h.storageEvent("koaptix_bookmarks");
  assert.equal(h.render(client).primaryComplexId, null);
  assert.deepEqual(plain(client.current.lastViewedByUniverse), {});
  h.values.clear(); h.storageEvent(null);
  assert.deepEqual(plain(h.render(client).bookmarks), []);
});

test("blocked reads/writes and partial writes preserve in-page edits across controls and can recover", () => {
  const h = hookHarness();
  h.failures.read = true; h.failures.write = true;
  const left = h.mount(); const right = h.mount();
  assert.equal(left.current.storageUnavailable, true);
  left.current.setPrimaryBookmark("5037");
  h.render(right).markPrimaryViewed(publication());
  assert.equal(h.render(left).lastViewedByUniverse.KOREA_ALL.publication_version, 7);
  h.failures.read = false;
  left.current.toggleBookmark("5084");
  assert.deepEqual(plain(h.render(right).bookmarks), ["5037", "5084"]);
  h.failures.write = false;
  right.current.setPrimaryBookmark("5037");
  assert.equal(h.render(left).storageUnavailable, false);
  assert.deepEqual(JSON.parse(h.values.get("koaptix_bookmarks")), ["5037", "5084"]);
  h.failures.writeKey = storage.MY_HOME_STORAGE_KEY;
  left.current.clearPrimaryBookmark();
  assert.equal(h.render(right).primaryComplexId, null);
  assert.equal(right.current.storageUnavailable, true);
  h.failures.writeKey = null;
  right.current.setPrimaryBookmark("5084");
  assert.equal(h.render(left).primaryComplexId, "5084");
  assert.equal(left.current.storageUnavailable, false);
});

test("invalid designation and stale, conflicting or other-primary acknowledgements do not change durable state", () => {
  const h = hookHarness(); const client = h.mount();
  for (const id of ["", "0", "../1", " 5037", "1.2"]) client.current.setPrimaryBookmark(id);
  assert.equal(h.writes.length, 0);
  client.current.setPrimaryBookmark("5037");
  client.current.markPrimaryViewed(publication());
  client.current.markPrimaryViewed(newer());
  const count = h.writes.length;
  client.current.markPrimaryViewed(publication());
  client.current.markPrimaryViewed(newer({ publication_version: 8, publication_event_id: publication().publication_event_id }));
  client.current.markPrimaryViewed(newer({ complexId: "5084" }));
  assert.equal(h.writes.length, count);
  assert.equal(h.render(client).lastViewedByUniverse.KOREA_ALL.publication_version, 8);
});
