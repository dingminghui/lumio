"use client";

import { useEffect, useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";

import { FlowCanvas } from "@/components/canvas/flow-canvas";
import { SessionPanel } from "@/components/canvas/session-panel";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { ProjectSessionItem } from "@/db/queries";
import { cn } from "@/lib/utils";
import type { FlowSnapshot } from "@/utils/flow-snapshot";

const SESSION_PANEL_ANIMATION_MS = 260;
const CANVAS_ONLY_LAYOUT = { canvas: 100 };
const WITH_SESSIONS_LAYOUT = { canvas: 60, sessions: 40 };

type CanvasHomeProps = {
  projectId: string;
  boardName: string;
  initialSnapshot: FlowSnapshot;
  sessions: ProjectSessionItem[];
};

export function CanvasHome({
  projectId,
  boardName,
  initialSnapshot,
  sessions,
}: CanvasHomeProps) {
  const [isSessionPanelOpen, setIsSessionPanelOpen] = useState(true);
  const [isSessionPanelRendered, setIsSessionPanelRendered] = useState(true);
  const [isSessionPanelVisible, setIsSessionPanelVisible] = useState(true);
  const [projectSessions, setProjectSessions] = useState(sessions);
  const [activeSessionId, setActiveSessionId] = useState(sessions[0]?.id ?? "");
  const closeTimerRef = useRef<number | null>(null);
  const openRafRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (openRafRef.current !== null) {
      window.cancelAnimationFrame(openRafRef.current);
      openRafRef.current = null;
    }
  };

  const openSessionPanel = () => {
    clearTimers();
    setIsSessionPanelOpen(true);
    setIsSessionPanelRendered(true);
    openRafRef.current = window.requestAnimationFrame(() => {
      setIsSessionPanelVisible(true);
      openRafRef.current = null;
    });
  };

  const closeSessionPanel = () => {
    clearTimers();
    setIsSessionPanelOpen(false);
    setIsSessionPanelVisible(false);
    closeTimerRef.current = window.setTimeout(() => {
      setIsSessionPanelRendered(false);
      closeTimerRef.current = null;
    }, SESSION_PANEL_ANIMATION_MS);
  };

  useEffect(
    () => () => {
      clearTimers();
    },
    [],
  );

  return (
    <main className="fixed inset-0 bg-background">
      <ResizablePanelGroup
        key={isSessionPanelRendered ? "with-sessions" : "canvas-only"}
        orientation="horizontal"
        defaultLayout={
          isSessionPanelRendered ? WITH_SESSIONS_LAYOUT : CANVAS_ONLY_LAYOUT
        }
      >
        <ResizablePanel
          id="canvas"
          defaultSize={
            isSessionPanelRendered
              ? `${WITH_SESSIONS_LAYOUT.canvas}%`
              : `${CANVAS_ONLY_LAYOUT.canvas}%`
          }
          minSize="50%"
        >
          <ReactFlowProvider>
            <FlowCanvas
              projectId={projectId}
              boardName={boardName}
              initialSnapshot={initialSnapshot}
              isSessionPanelOpen={isSessionPanelOpen}
              onToggleSessionPanel={() =>
                isSessionPanelOpen ? closeSessionPanel() : openSessionPanel()
              }
            />
          </ReactFlowProvider>
        </ResizablePanel>

        {isSessionPanelRendered ? (
          <>
            <ResizableHandle
              withHandle
              className={cn(
                "transition-opacity duration-300 ease-out",
                isSessionPanelVisible ? "opacity-100" : "opacity-0",
              )}
            />
            <ResizablePanel
              id="sessions"
              defaultSize={`${WITH_SESSIONS_LAYOUT.sessions}%`}
              minSize="24%"
              maxSize="50%"
              className={cn(
                "transition-all duration-300 ease-out",
                isSessionPanelVisible
                  ? "translate-x-0 opacity-100"
                  : "pointer-events-none translate-x-3 opacity-0",
              )}
            >
              <SessionPanel
                projectId={projectId}
                sessions={projectSessions}
                onSessionsChange={setProjectSessions}
                activeSessionId={activeSessionId}
                onActiveSessionIdChange={setActiveSessionId}
                onClose={closeSessionPanel}
              />
            </ResizablePanel>
          </>
        ) : null}
      </ResizablePanelGroup>
    </main>
  );
}
