"use client";

import { useCallback, useState, useEffect } from "react";

type BookmarkDetail = { name: string; locationLabel: string };
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

function readDetails(): Record<string, BookmarkDetail> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(DETAIL_KEY) ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).flatMap(([id, detail]) => {
      if (!/^[1-9]\d*$/.test(id) || !detail || typeof detail !== "object") return [];
      const row = detail as Partial<BookmarkDetail>;
      return typeof row.name === "string" ? [[id, { name: row.name, locationLabel: typeof row.locationLabel === "string" ? row.locationLabel : "" }]] : [];
    }));
  } catch {
    return {};
  }
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [bookmarkDetails, setBookmarkDetails] = useState<Record<string, BookmarkDetail>>({});
  const [storageUnavailable, setStorageUnavailable] = useState(false);

  useEffect(() => {
    const read = () => {
      try {
        setBookmarks(parseBookmarkIds(localStorage.getItem(BOOKMARK_KEY)));
        setBookmarkDetails(readDetails());
        setStorageUnavailable(false);
      } catch {
        setStorageUnavailable(true);
      }
      setIsLoaded(true);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === BOOKMARK_KEY || event.key === DETAIL_KEY) read();
    };
    const onLocalChange = (event: Event) => {
      const next = (event as CustomEvent<{ bookmarks: string[]; details: Record<string, BookmarkDetail>; saved: boolean }>).detail;
      setBookmarks(next.bookmarks);
      setBookmarkDetails(next.details);
      setStorageUnavailable(!next.saved);
    };
    read();
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, onLocalChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGE_EVENT, onLocalChange);
    };
  }, []);

  const toggleBookmark = useCallback((complexId: string, detail?: BookmarkDetail) => {
    if (!/^[1-9]\d*$/.test(complexId)) return;
    let previous = bookmarks;
    let details = { ...bookmarkDetails };
    try {
      previous = parseBookmarkIds(localStorage.getItem(BOOKMARK_KEY));
      details = readDetails();
    } catch { /* Keep the current page usable if browser storage is blocked. */ }
    const removing = previous.includes(complexId);
    const next = removing ? previous.filter((id) => id !== complexId) : [...previous, complexId];
    if (removing) delete details[complexId];
    else if (detail) details[complexId] = detail;
    let saved = false;
    try {
      localStorage.setItem(BOOKMARK_KEY, JSON.stringify(next));
      localStorage.setItem(DETAIL_KEY, JSON.stringify(details));
      saved = true;
    } catch { /* The shared event still updates every mounted bookmark control. */ }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { bookmarks: next, details, saved } }));
  }, [bookmarks, bookmarkDetails]);

  return { bookmarks, bookmarkDetails, toggleBookmark, isLoaded, storageUnavailable };
}
