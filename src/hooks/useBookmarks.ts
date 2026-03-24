"use client";

import { useState, useEffect } from "react";

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 💡 화면이 켜지면 유저의 브라우저 금고를 몰래 뒤집니다! (SSR 에러 방지용 완벽 방어막)
    const stored = localStorage.getItem("koaptix_bookmarks");
    if (stored) {
      setBookmarks(JSON.parse(stored));
    }
    setIsLoaded(true);
  }, []);

  const toggleBookmark = (complexId: string) => {
    setBookmarks((prev) => {
      const isPinned = prev.includes(complexId);
      const next = isPinned 
        ? prev.filter((id) => id !== complexId) // 이미 있으면 뺀다!
        : [...prev, complexId];                 // 없으면 넣는다!
      
      // 브라우저 금고에 즉시 덮어쓰기!
      localStorage.setItem("koaptix_bookmarks", JSON.stringify(next));
      return next;
    });
  };

  return { bookmarks, toggleBookmark, isLoaded };
}