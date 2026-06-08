"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  LONG_IMAGE_EMPTY_MIN_HEIGHT,
  LONG_IMAGE_NODE_CHROME_HEIGHT,
} from "@/lib/skills/long-image/constants";

type UseLongImageNodeSizeOptions = {
  hasContent: boolean;
  nodeWidth: number;
  onResize?: (width: number, height: number) => void;
  onResizeEnd?: (width: number, height: number) => void;
  contentRef: React.RefObject<HTMLDivElement | null>;
  contentVersion: string;
};

export function useLongImageNodeSize({
  hasContent,
  nodeWidth,
  onResize,
  onResizeEnd,
  contentRef,
  contentVersion,
}: UseLongImageNodeSizeOptions) {
  const lastReportedHeightRef = useRef(0);

  const reportHeight = useCallback(
    (height: number) => {
      if (Math.abs(height - lastReportedHeightRef.current) < 2) {
        return;
      }

      lastReportedHeightRef.current = height;
      onResize?.(nodeWidth, height);
      onResizeEnd?.(nodeWidth, height);
    },
    [nodeWidth, onResize, onResizeEnd],
  );

  const reportContentHeight = useCallback(() => {
    const element = contentRef.current;

    if (!element) {
      return;
    }

    reportHeight(LONG_IMAGE_NODE_CHROME_HEIGHT + element.offsetHeight);
  }, [contentRef, reportHeight]);

  useEffect(() => {
    if (!hasContent) {
      reportHeight(LONG_IMAGE_EMPTY_MIN_HEIGHT);
      return;
    }

    const element = contentRef.current;

    if (!element) {
      return;
    }

    reportContentHeight();

    const observer = new ResizeObserver(() => {
      reportContentHeight();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [contentRef, contentVersion, hasContent, reportContentHeight, reportHeight]);

  return { reportContentHeight };
}
