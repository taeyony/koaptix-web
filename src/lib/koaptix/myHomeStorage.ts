import { requireUniformUniverseServicePublication } from "./currentness";
import type { KoaptixPublicationSelectionIdentity } from "./currentness";
import { resolveUniverseRequest } from "./universes";

export const MY_HOME_STORAGE_KEY = "koaptix_my_home";

export type MyHomeViewedPublication = KoaptixPublicationSelectionIdentity & {
  complexId: string;
};

export type MyHomeStorage = {
  version: 1;
  primaryComplexId: string | null;
  lastViewedByUniverse: Record<string, MyHomeViewedPublication>;
};

export function emptyMyHomeStorage(): MyHomeStorage {
  return { version: 1, primaryComplexId: null, lastViewedByUniverse: {} };
}

export function readMyHomePublication(value: unknown): MyHomeViewedPublication | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.complexId !== "string" || !/^[1-9]\d*$/.test(row.complexId)) return null;
  if (typeof row.universe_code !== "string") return null;
  const scope = resolveUniverseRequest(row.universe_code, { capability: "ranking" });
  if (scope.universeUnavailable || scope.requestedUniverseCode !== row.universe_code) return null;
  try {
    const identity = requireUniformUniverseServicePublication([row], row.universe_code);
    return { ...identity, complexId: row.complexId };
  } catch {
    return null;
  }
}

// Publication versions advance across generations, including rollback events.
// A different observation date or snapshot alone is not a new publication.
export function isNewerMyHomePublication(current: unknown, seen: unknown): boolean {
  const next = readMyHomePublication(current);
  const previous = readMyHomePublication(seen);
  return Boolean(next && previous &&
    next.complexId === previous.complexId &&
    next.universe_code === previous.universe_code &&
    next.publication_version > previous.publication_version &&
    Date.parse(next.published_at) > Date.parse(previous.published_at) &&
    next.publication_event_id !== previous.publication_event_id);
}

export function parseMyHomeStorage(stored: string | null, bookmarks: readonly string[]): MyHomeStorage {
  try {
    const value: unknown = stored ? JSON.parse(stored) : null;
    if (!value || typeof value !== "object" || Array.isArray(value)) return emptyMyHomeStorage();
    const row = value as Record<string, unknown>;
    if (row.version !== 1 || typeof row.primaryComplexId !== "string" ||
      !/^[1-9]\d*$/.test(row.primaryComplexId) || !bookmarks.includes(row.primaryComplexId)) return emptyMyHomeStorage();
    const lastViewedByUniverse: MyHomeStorage["lastViewedByUniverse"] = {};
    if (row.lastViewedByUniverse && typeof row.lastViewedByUniverse === "object" && !Array.isArray(row.lastViewedByUniverse)) {
      for (const [code, value] of Object.entries(row.lastViewedByUniverse)) {
        const identity = readMyHomePublication(value);
        if (identity && identity.complexId === row.primaryComplexId && identity.universe_code === code) {
          lastViewedByUniverse[code] = identity;
        }
      }
    }
    return { version: 1, primaryComplexId: row.primaryComplexId, lastViewedByUniverse };
  } catch {
    return emptyMyHomeStorage();
  }
}

export function recordMyHomePublication(state: MyHomeStorage, value: unknown): MyHomeStorage {
  const identity = readMyHomePublication(value);
  if (!identity || identity.complexId !== state.primaryComplexId) return state;
  const previous = state.lastViewedByUniverse[identity.universe_code];
  if (previous && !isNewerMyHomePublication(identity, previous)) return state;
  return {
    ...state,
    lastViewedByUniverse: { ...state.lastViewedByUniverse, [identity.universe_code]: identity },
  };
}
