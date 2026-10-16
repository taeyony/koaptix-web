"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import {
  emptyMyHomeStorage,
  MY_HOME_STORAGE_KEY,
  parseMyHomeStorage,
  recordMyHomePublication,
} from "../lib/koaptix/myHomeStorage";
import type { MyHomeStorage, MyHomeViewedPublication } from "../lib/koaptix/myHomeStorage";
import { resolveUniverseRequest } from "../lib/koaptix/universes";

export type BookmarkDetail = { name: string; locationLabel: string; universeCode?: string };
type BookmarkState = {
  bookmarks: string[];
  details: Record<string, BookmarkDetail>;
  myHome: MyHomeStorage;
  storageUnavailable: boolean;
};
const BOOKMARK_KEY = "koaptix_bookmarks";
const DETAIL_KEY = "koaptix_bookmark_details";
const CHANGE_EVENT = "koaptix-bookmarks-changed";

export function parseBookmarkIds(stored: string | null): string[] {
  try {
    const value: unknown = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(value)) return [];
    return [...new Set(value.flatMap((id: unknown) => {
      const text = typeof id === "string" ? id.trim() : typeof id === "number" && Number.isSafeInteger(id) ? String(id) : "";
      return /^[1-9]\d*$/.test(text) ? [text] : [];
    }))];
  } catch {
    return [];
  }
}

function parseDetails(stored: string | null): Record<string, BookmarkDetail> {
  try {
    const value: unknown = JSON.parse(stored ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).flatMap(([id, detail]) => {
      if (!/^[1-9]\d*$/.test(id) || !detail || typeof detail !== "object") return [];
      const row = detail as Partial<BookmarkDetail>;
      if (typeof row.name !== "string") return [];
      const scope = typeof row.universeCode === "string" ? resolveUniverseRequest(row.universeCode, { capability: "ranking" }) : null;
      const universeCode = scope && !scope.universeUnavailable && scope.requestedUniverseCode === row.universeCode ? row.universeCode : undefined;
      return [[id, { name: row.name, locationLabel: typeof row.locationLabel === "string" ? row.locationLabel : "", ...(universeCode ? { universeCode } : {}) }]];
    }));
  } catch {
    return {};
  }
}

function readStoredState(): BookmarkState {
  const bookmarks = parseBookmarkIds(localStorage.getItem(BOOKMARK_KEY));
  return {
    bookmarks,
    details: parseDetails(localStorage.getItem(DETAIL_KEY)),
    myHome: parseMyHomeStorage(localStorage.getItem(MY_HOME_STORAGE_KEY), bookmarks),
    storageUnavailable: false,
  };
}

export function useBookmarks() {
  const [state, setState] = useState<BookmarkState>(() => ({
    bookmarks: [], details: {}, myHome: emptyMyHomeStorage(), storageUnavailable: false,
  }));
  const stateRef = useRef(state);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const update = (next: BookmarkState) => {
      stateRef.current = next;
      setState(next);
    };
    const read = () => {
      try {
        update(readStoredState());
      } catch {
        update({ ...stateRef.current, storageUnavailable: true });
      }
      setIsLoaded(true);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === BOOKMARK_KEY || event.key === DETAIL_KEY || event.key === MY_HOME_STORAGE_KEY) read();
    };
    const onLocalChange = (event: Event) => {
      const next = (event as CustomEvent<{
        bookmarks: string[]; details: Record<string, BookmarkDetail>; myHome?: MyHomeStorage; saved: boolean;
      }>).detail;
      if (!next) return;
      const bookmarks = parseBookmarkIds(JSON.stringify(next.bookmarks));
      update({
        bookmarks,
        details: parseDetails(JSON.stringify(next.details)),
        myHome: parseMyHomeStorage(JSON.stringify(next.myHome ?? stateRef.current.myHome), bookmarks),
        storageUnavailable: !next.saved,
      });
    };
    read();
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, onLocalChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGE_EVENT, onLocalChange);
    };
  }, []);

  const change = useCallback((mutate: (previous: BookmarkState) => BookmarkState) => {
    let previous = stateRef.current;
    // Keep unsaved page edits when reads work but browser writes are blocked.
    // A real cross-tab storage event can resynchronize the page state.
    if (!previous.storageUnavailable) {
      try { previous = readStoredState(); }
      catch { /* Use the page state while browser storage is blocked. */ }
    }
    const changed = mutate(previous);
    if (changed === previous) return;
    const next = { ...changed, details: parseDetails(JSON.stringify(changed.details)) };
    let saved = false;
    try {
      localStorage.setItem(BOOKMARK_KEY, JSON.stringify(next.bookmarks));
      localStorage.setItem(DETAIL_KEY, JSON.stringify(next.details));
      localStorage.setItem(MY_HOME_STORAGE_KEY, JSON.stringify(next.myHome));
      saved = true;
    } catch { /* The shared event still updates every mounted control. */ }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, {
      detail: { bookmarks: next.bookmarks, details: next.details, myHome: next.myHome, saved },
    }));
  }, []);

  const toggleBookmark = useCallback((complexId: string, detail?: BookmarkDetail) => {
    if (!/^[1-9]\d*$/.test(complexId)) return;
    change((previous) => {
      const removing = previous.bookmarks.includes(complexId);
      const bookmarks = removing ? previous.bookmarks.filter((id) => id !== complexId) : [...previous.bookmarks, complexId];
      const details = { ...previous.details };
      if (removing) delete details[complexId];
      else if (detail) details[complexId] = detail;
      return {
        ...previous, bookmarks, details,
        myHome: removing && previous.myHome.primaryComplexId === complexId ? emptyMyHomeStorage() : previous.myHome,
      };
    });
  }, [change]);

  const setPrimaryBookmark = useCallback((complexId: string, detail?: BookmarkDetail) => {
    if (!/^[1-9]\d*$/.test(complexId)) return;
    change((previous) => ({
      ...previous,
      bookmarks: previous.bookmarks.includes(complexId) ? previous.bookmarks : [...previous.bookmarks, complexId],
      details: detail ? { ...previous.details, [complexId]: detail } : previous.details,
      myHome: previous.myHome.primaryComplexId === complexId ? previous.myHome : {
        ...emptyMyHomeStorage(), primaryComplexId: complexId,
      },
    }));
  }, [change]);

  const clearPrimaryBookmark = useCallback(() => {
    change((previous) => previous.myHome.primaryComplexId ? { ...previous, myHome: emptyMyHomeStorage() } : previous);
  }, [change]);

  const markPrimaryViewed = useCallback((identity: MyHomeViewedPublication) => {
    change((previous) => {
      const myHome = recordMyHomePublication(previous.myHome, identity);
      return myHome === previous.myHome ? previous : { ...previous, myHome };
    });
  }, [change]);

  return {
    bookmarks: state.bookmarks,
    bookmarkDetails: state.details,
    toggleBookmark,
    isLoaded,
    storageUnavailable: state.storageUnavailable,
    primaryComplexId: state.myHome.primaryComplexId,
    lastViewedByUniverse: state.myHome.lastViewedByUniverse,
    setPrimaryBookmark,
    clearPrimaryBookmark,
    markPrimaryViewed,
  };
}
