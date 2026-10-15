"use client";

import { useEffect, useState } from "react";

type ThemeMode = "night" | "day";

const STORAGE_KEY = "koaptix-theme-mode";

const MODES: Array<{ value: ThemeMode; label: string }> = [
  { value: "night", label: "야간" },
  { value: "day", label: "주간" },
];

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "night";

  try {
    return window.localStorage.getItem(STORAGE_KEY) === "day" ? "day" : "night";
  } catch {
    return "night";
  }
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // The current page can still switch themes when storage is unavailable.
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("night");

  useEffect(() => {
    const stored = readStoredTheme();
    applyTheme(stored);

    const timer = window.setTimeout(() => {
      setTheme(stored);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const selectTheme = (nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <div className="theme-toggle" role="group" aria-label="화면 테마">
      {MODES.map((mode) => {
        const active = mode.value === theme;

        return (
          <button
            key={mode.value}
            type="button"
            aria-pressed={active}
            data-active={active}
            onClick={() => selectTheme(mode.value)}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
