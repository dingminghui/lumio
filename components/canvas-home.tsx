"use client";

import { Tldraw } from "tldraw";

export function CanvasHome() {
  return (
    <main className="fixed inset-0 bg-background">
      <div className="h-full w-full">
        <Tldraw persistenceKey="lumio-canvas-v1" />
      </div>
    </main>
  );
}
