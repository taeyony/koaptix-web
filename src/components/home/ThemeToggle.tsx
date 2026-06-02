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

  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "day" || stored === "night" ? stored : "night";
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
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
