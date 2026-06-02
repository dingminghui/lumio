"use client";

import { ReactFlowProvider } from "@xyflow/react";

import { FlowCanvas } from "@/components/canvas/flow-canvas";

export function CanvasHome() {
  return (
    <main className="fixed inset-0 bg-background">
      <ReactFlowProvider>
        <FlowCanvas />
      </ReactFlowProvider>
    </main>
  );
}
