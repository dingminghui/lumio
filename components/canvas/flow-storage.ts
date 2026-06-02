import type { Edge, Node, Viewport } from "@xyflow/react";

export const FLOW_STORAGE_KEY = "lumio-react-flow-canvas-v1";

export const DEFAULT_BOARD_NAME = "Untitled";
export const DEFAULT_BG_COLOR = "#f5f5f5";
export const DEFAULT_SHOW_DOTS = true;

export type FlowSnapshot = {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  name?: string;
  bgColor?: string;
  showDots?: boolean;
};

export function isFlowSnapshot(value: unknown): value is FlowSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as Partial<FlowSnapshot>;
  return Array.isArray(snapshot.nodes) && Array.isArray(snapshot.edges);
}
