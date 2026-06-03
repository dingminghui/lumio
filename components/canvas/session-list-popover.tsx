"use client";

import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ProjectSessionItem } from "@/db/queries";
import { cn } from "@/lib/utils";

type SessionListPopoverProps = {
  sessions: ProjectSessionItem[];
  activeSessionId: string;
  isCreatingSession: boolean;
  onCreateSession: () => void;
  onActiveSessionIdChange: (sessionId: string) => void;
};

export function SessionListPopover({
  sessions,
  activeSessionId,
  isCreatingSession,
  onCreateSession,
  onActiveSessionIdChange,
}: SessionListPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          会话列表
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCreateSession}
          disabled={isCreatingSession}
          className="mb-1 w-full justify-start"
        >
          <PlusIcon data-icon="inline-start" />
          新增会话
        </Button>
        <ScrollArea className="max-h-56">
          <div className="flex flex-col gap-1 pr-1">
            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => onActiveSessionIdChange(session.id)}
                className={cn(
                  "flex h-8 items-center rounded-lg px-2 text-left text-sm transition-colors",
                  "hover:bg-muted hover:text-foreground",
                  session.id === activeSessionId &&
                    "bg-muted font-medium text-foreground",
                )}
              >
                <span className="truncate">{session.title}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
