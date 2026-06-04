"use client";

import { useSyncExternalStore } from "react";

const THEME_STORAGE_KEY = "lumio-theme";
const THEME_CHANGE_EVENT = "lumio-theme-change";

export type ThemeMode = "light" | "dark";

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark";
}

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  return isThemeMode(storedTheme) ? storedTheme : "light";
}

export function applyTheme(theme: ThemeMode) {
  if (typeof window === "undefined") {
    return;
  }

  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  document.body.classList.toggle("dark", theme === "dark");
  document.body.dataset.theme = theme;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Theme switching should still work when storage is unavailable.
  }

  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

function subscribeToThemeChange(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === THEME_STORAGE_KEY) {
      onStoreChange();
    }
  }

  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useThemeMode() {
  return useSyncExternalStore(subscribeToThemeChange, getStoredTheme, () => "light");
}
