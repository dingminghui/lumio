import type { Node } from "@xyflow/react";

import { nodeDimension } from "@/lib/canvas/flow-mapper";
import {
  DOCUMENT_EDIT_CONTAINER_HEIGHT_RATIO,
  DOCUMENT_EDIT_CONTAINER_WIDTH_RATIO,
  NODE_DEFAULT_HEIGHT,
  NODE_MAX_HEIGHT,
  NODE_MAX_WIDTH,
  NODE_MIN_HEIGHT,
  NODE_MIN_WIDTH,
} from "@/lib/canvas/node-layout";

export type DocumentEditContainerSize = {
  width: number;
  height: number;
  zoom: number;
};

/** 节点尺寸/位移与视口 fitView 共用时长 */
export const DOCUMENT_EDIT_LAYOUT_ANIMATION_MS = 560;

const LAYOUT_ANIMATION_BUFFER_MS = 48;

/** 布局动画结束后再聚焦编辑器 */
export const DOCUMENT_EDIT_FOCUS_DELAY_MS =
  DOCUMENT_EDIT_LAYOUT_ANIMATION_MS + LAYOUT_ANIMATION_BUFFER_MS;

const DOCUMENT_EDIT_LAYOUT_CLASS = "lumio-text-node--layout-animating";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeDocumentEditSize({
  width: containerWidth,
  height: containerHeight,
  zoom,
}: DocumentEditContainerSize): { width: number; height: number } {
  const safeZoom = Math.max(zoom, 0.1);

  return {
    width: Math.round(
      clamp(
        (containerWidth * DOCUMENT_EDIT_CONTAINER_WIDTH_RATIO) / safeZoom,
        NODE_MIN_WIDTH,
        NODE_MAX_WIDTH,
      ),
    ),
    height: Math.round(
      clamp(
        (containerHeight * DOCUMENT_EDIT_CONTAINER_HEIGHT_RATIO) / safeZoom,
        NODE_MIN_HEIGHT,
        NODE_MAX_HEIGHT,
      ),
    ),
  };
}

function withLayoutAnimationClass(className?: string): string {
  const parts = className?.split(/\s+/).filter(Boolean) ?? [];

  if (!parts.includes(DOCUMENT_EDIT_LAYOUT_CLASS)) {
    parts.push(DOCUMENT_EDIT_LAYOUT_CLASS);
  }

  return parts.join(" ");
}

function withoutLayoutAnimationClass(className?: string): string | undefined {
  const next = className
    ?.split(/\s+/)
    .filter((part) => part && part !== DOCUMENT_EDIT_LAYOUT_CLASS);

  return next && next.length > 0 ? next.join(" ") : undefined;
}

export function layoutKeepingCenter(
  position: { x: number; y: number },
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number,
): { x: number; y: number } {
  return {
    x: position.x - (newWidth - oldWidth) / 2,
    y: position.y - (newHeight - oldHeight) / 2,
  };
}

export function getDocumentEditLayout(
  node: Node,
  container: DocumentEditContainerSize,
): {
  position: { x: number; y: number };
  width: number;
  height: number;
} {
  const oldWidth = nodeDimension(node, "width") ?? 400;
  const oldHeight = nodeDimension(node, "height") ?? NODE_DEFAULT_HEIGHT;
  const { width, height } = computeDocumentEditSize(container);

  return {
    position: layoutKeepingCenter(
      node.position,
      oldWidth,
      oldHeight,
      width,
      height,
    ),
    width,
    height,
  };
}

export function applyDocumentEditLayoutToNode(
  node: Node,
  layout: {
    position: { x: number; y: number };
    width: number;
    height: number;
  },
): Node {
  return {
    ...node,
    className: withLayoutAnimationClass(node.className),
    position: layout.position,
    width: layout.width,
    height: layout.height,
    style: {
      ...node.style,
      width: layout.width,
      height: layout.height,
    },
  };
}

export function clearDocumentEditLayoutAnimation(node: Node): Node {
  return {
    ...node,
    className: withoutLayoutAnimationClass(node.className),
  };
}
