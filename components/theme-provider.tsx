"use client";

import { useEffect, type ReactNode } from "react";

import { applyTheme, getStoredTheme } from "@/components/theme-utils";

type ThemeProviderProps = {
  children?: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  return children;
}
