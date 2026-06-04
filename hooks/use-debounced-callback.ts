"use client";

import { useCallback, useEffect, useRef } from "react";

export function useDebouncedCallback(delayMs: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = useCallback(
    (callback: () => void) => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        callback();
        timerRef.current = null;
      }, delayMs);
    },
    [delayMs],
  );

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  return schedule;
}
