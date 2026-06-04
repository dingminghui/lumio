"use client";

import { PanelRightCloseIcon } from "lucide-react";

import { ItemChat } from "@/components/canvas/session-chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CanvasItemWithMessages } from "@/db/queries";
import type { ModelProviderId } from "@/lib/model-providers";
import type { SimpleSkillOutput, SkillStage } from "@/types/skill";
import type { StoredTextMessage } from "@/utils/session-message";

type ItemPanelProps = {
  projectId: string;
  item: CanvasItemWithMessages;
  skillName: string;
  currentStage: SkillStage | null;
  modelOptions: {
    provider: ModelProviderId;
    label: string;
    model: string;
  }[];
  onItemUpdate: (itemId: string, output: SimpleSkillOutput) => void;
  onMessagesSync: (itemId: string, messages: StoredTextMessage[]) => void;
  onClose: () => void;
};

export function ItemPanel({
  projectId,
  item,
  skillName,
  currentStage,
  modelOptions,
  onItemUpdate,
  onMessagesSync,
  onClose,
}: ItemPanelProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-medium">节点对话</h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <p className="truncate text-xs text-muted-foreground">{skillName}</p>
            {currentStage ? (
              <Badge variant="outline" className="text-[10px]">
                {currentStage.label}
              </Badge>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="关闭对话"
          onClick={onClose}
        >
          <PanelRightCloseIcon />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 p-4">
        <ItemChat
          key={item.id}
          projectId={projectId}
          itemId={item.id}
          skillName={skillName}
          initialMessages={item.messages}
          modelOptions={modelOptions}
          onItemUpdate={(output) => onItemUpdate(item.id, output)}
          onMessagesSync={(messages) => onMessagesSync(item.id, messages)}
        />
      </div>
    </aside>
  );
}
