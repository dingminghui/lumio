import type { Edge, Node, Viewport } from "@xyflow/react";

export const DEFAULT_BOARD_NAME = "Untitled";
export const DEFAULT_BG_COLOR = "#f5f5f5";
export const DEFAULT_SHOW_DOTS = true;

export type FlowSnapshot = {
  nodes: Node[];
  edges: Edge[];
  viewport?: Viewport;
  name?: string;
  bgColor?: string;
  showDots?: boolean;
};

export const DEFAULT_FLOW_SNAPSHOT: FlowSnapshot = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  bgColor: DEFAULT_BG_COLOR,
  showDots: DEFAULT_SHOW_DOTS,
};

function isViewport(value: unknown): value is Viewport {
  if (!value || typeof value !== "object") {
    return false;
  }

  const viewport = value as Partial<Viewport>;
  return (
    typeof viewport.x === "number" &&
    typeof viewport.y === "number" &&
    typeof viewport.zoom === "number"
  );
}

export function isFlowSnapshot(value: unknown): value is FlowSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as Partial<FlowSnapshot>;
  return (
    Array.isArray(snapshot.nodes) &&
    Array.isArray(snapshot.edges) &&
    (snapshot.viewport === undefined || isViewport(snapshot.viewport)) &&
    (snapshot.name === undefined || typeof snapshot.name === "string") &&
    (snapshot.bgColor === undefined || typeof snapshot.bgColor === "string") &&
    (snapshot.showDots === undefined || typeof snapshot.showDots === "boolean")
  );
}

export function normalizeFlowSnapshot(value: unknown): FlowSnapshot {
  if (!isFlowSnapshot(value)) {
    return DEFAULT_FLOW_SNAPSHOT;
  }

  return {
    ...DEFAULT_FLOW_SNAPSHOT,
    ...value,
  };
}
