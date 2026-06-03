"use client";

import { PanelRightCloseIcon } from "lucide-react";
import { type Dispatch, type SetStateAction, useState, useTransition } from "react";

import { createProjectSessionAction } from "@/app/projects/actions";
import { SessionChat } from "@/components/canvas/session-chat";
import { SessionListPopover } from "@/components/canvas/session-list-popover";
import { Button } from "@/components/ui/button";
import type { ProjectSessionItem } from "@/db/queries";

type SessionPanelProps = {
  projectId: string;
  sessions: ProjectSessionItem[];
  onSessionsChange: Dispatch<SetStateAction<ProjectSessionItem[]>>;
  activeSessionId: string;
  onActiveSessionIdChange: (sessionId: string) => void;
  onClose: () => void;
};

export function SessionPanel({
  projectId,
  sessions,
  onSessionsChange,
  activeSessionId,
  onActiveSessionIdChange,
  onClose,
}: SessionPanelProps) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const activeSession = sessions.find((session) => session.id === activeSessionId);

  function handleCreateSession() {
    setError("");
    startTransition(async () => {
      try {
        const session = await createProjectSessionAction(projectId);
        onSessionsChange((currentSessions) => [...currentSessions, session]);
        onActiveSessionIdChange(session.id);
      } catch {
        setError("会话创建失败");
      }
    });
  }

  return (
    <aside className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-medium">会话</h2>
          <p className="truncate text-xs text-muted-foreground">项目内的创作问答记录</p>
        </div>
        <div className="relative flex items-center gap-1">
          <SessionListPopover
            sessions={sessions}
            activeSessionId={activeSessionId}
            isCreatingSession={isPending}
            onCreateSession={handleCreateSession}
            onActiveSessionIdChange={onActiveSessionIdChange}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="关闭会话"
            onClick={onClose}
          >
            <PanelRightCloseIcon />
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 p-4">
        {activeSession ? (
          <SessionChat
            key={activeSession.id}
            projectId={projectId}
            session={activeSession}
            onSessionsChange={onSessionsChange}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            暂无会话
          </div>
        )}
      </div>

      {error ? <p className="px-4 pb-3 text-xs text-destructive">{error}</p> : null}
    </aside>
  );
}
