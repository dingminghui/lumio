"use client";

import { useCallback } from "react";

import { useEvent } from "@/hooks/use-event";

type UseKeyEvent = {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
};

type UseKeyOptions = {
  event?: "keydown" | "keyup" | "keypress";
  target?: Window | null;
};

function matches(event: KeyboardEvent, expected: UseKeyEvent) {
  return (
    event.key === expected.key &&
    (!!expected.metaKey === event.metaKey || expected.metaKey === undefined) &&
    (!!expected.ctrlKey === event.ctrlKey || expected.ctrlKey === undefined) &&
    (!!expected.shiftKey === event.shiftKey || expected.shiftKey === undefined)
  );
}

export function useKey(
  expected: UseKeyEvent,
  handler: (event: KeyboardEvent) => void,
  options: UseKeyOptions = {},
) {
  const eventName = options.event ?? "keydown";
  const target = options.target ?? (typeof window !== "undefined" ? window : null);
  const { key, metaKey, ctrlKey, shiftKey } = expected;

  const handle = useCallback(
    (event: KeyboardEvent) => {
      if (matches(event, { key, metaKey, ctrlKey, shiftKey })) {
        handler(event);
      }
    },
    [ctrlKey, handler, key, metaKey, shiftKey],
  );

  useEvent({ name: eventName, handler: handle, target });
}
