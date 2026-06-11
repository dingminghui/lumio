import type { Node, Viewport } from "@xyflow/react";

/** 节点进入/退出编辑时视口动画时长 */
export const DOCUMENT_EDIT_LAYOUT_ANIMATION_MS = 560;

const LAYOUT_ANIMATION_BUFFER_MS = 48;

/** 布局动画结束后再聚焦编辑器 */
export const DOCUMENT_EDIT_FOCUS_DELAY_MS =
  DOCUMENT_EDIT_LAYOUT_ANIMATION_MS + LAYOUT_ANIMATION_BUFFER_MS;

/** 编辑态 zIndex，确保节点置于其他节点之上 */
export const DOCUMENT_EDIT_NODE_Z_INDEX = 1000;

const DOCUMENT_EDITING_CLASS = "lumio-text-node--document-editing";

export type DocumentEditSnapshot = {
  zIndex?: number;
  className?: string;
  width: number | undefined;
  height: number | undefined;
  style: React.CSSProperties | undefined;
  viewport: Viewport;
};

function cleanClassName(className?: string): string | undefined {
  const parts = className
    ?.split(/\s+/)
    .filter((c) => c && c !== DOCUMENT_EDITING_CLASS);

  return parts && parts.length > 0 ? parts.join(" ") : undefined;
}

export function captureDocumentEditSnapshot(
  node: Node,
  viewport: Viewport,
): DocumentEditSnapshot {
  return {
    zIndex: node.zIndex,
    className: cleanClassName(node.className),
    width: node.width,
    height: node.height,
    style: node.style ? { ...node.style } : undefined,
    viewport: { ...viewport },
  };
}

export function enterDocumentEditState(
  node: Node,
  targetWidth: number,
  targetHeight: number,
): Node {
  const base = cleanClassName(node.className) ?? "";
  const className = [base, DOCUMENT_EDITING_CLASS].filter(Boolean).join(" ");

  return {
    ...node,
    zIndex: DOCUMENT_EDIT_NODE_Z_INDEX,
    className,
    width: targetWidth,
    height: targetHeight,
    style: { ...node.style, width: targetWidth, height: targetHeight },
  };
}

export function exitDocumentEditState(
  node: Node,
  snapshot: DocumentEditSnapshot,
): Node {
  return {
    ...node,
    zIndex: snapshot.zIndex,
    className: snapshot.className,
    width: snapshot.width,
    height: snapshot.height,
    style: snapshot.style,
  };
}
