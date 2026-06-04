"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PANEL_ANIMATION_MS = 260;

export function useCanvasItemPanel(initialOpen: boolean) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isRendered, setIsRendered] = useState(initialOpen);
  const [isVisible, setIsVisible] = useState(initialOpen);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRafRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (openRafRef.current !== null) {
      cancelAnimationFrame(openRafRef.current);
      openRafRef.current = null;
    }
  }, []);

  const open = useCallback(() => {
    clearTimers();
    setIsOpen(true);
    setIsRendered(true);
    openRafRef.current = requestAnimationFrame(() => {
      setIsVisible(true);
      openRafRef.current = null;
    });
  }, [clearTimers]);

  const close = useCallback(() => {
    clearTimers();
    setIsOpen(false);
    setIsVisible(false);
    closeTimerRef.current = setTimeout(() => {
      setIsRendered(false);
      closeTimerRef.current = null;
    }, PANEL_ANIMATION_MS);
  }, [clearTimers]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [close, isOpen, open]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return {
    isOpen,
    isRendered,
    isVisible,
    open,
    close,
    toggle,
  };
}
