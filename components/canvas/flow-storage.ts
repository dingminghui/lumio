import type { Edge, Node, Viewport } from "@xyflow/react";

export const FLOW_STORAGE_KEY = "lumio-react-flow-canvas-v1";

export type FlowSnapshot = {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
};

export function isFlowSnapshot(value: unknown): value is FlowSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as Partial<FlowSnapshot>;
  return Array.isArray(snapshot.nodes) && Array.isArray(snapshot.edges);
}
