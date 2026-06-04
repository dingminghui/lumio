"use client";

import { MessageSquareIcon, PlusIcon } from "lucide-react";
import { Panel } from "@xyflow/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  COMING_SOON_NODE_LABELS,
  COMING_SOON_TOAST_MESSAGE,
} from "@/lib/canvas/node-menu";

type SkillOption = {
  id: string;
  name: string;
};

type FlowCanvasToolbarProps = {
  skillOptions: SkillOption[];
  activeItemId: string | null;
  isItemPanelOpen: boolean;
  onItemAdd: (skillId: string) => void;
  onToggleItemPanel: () => void;
};

export function FlowCanvasToolbar({
  skillOptions,
  activeItemId,
  isItemPanelOpen,
  onItemAdd,
  onToggleItemPanel,
}: FlowCanvasToolbarProps) {
  return (
    <Panel position="top-right" className="flex gap-1 rounded-md p-1 backdrop-blur">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="secondary" size="sm">
            <PlusIcon data-icon="inline-start" />
            新增节点
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {skillOptions.map((option) => (
            <DropdownMenuItem key={option.id} onClick={() => onItemAdd(option.id)}>
              {option.name}
            </DropdownMenuItem>
          ))}
          {COMING_SOON_NODE_LABELS.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              {COMING_SOON_NODE_LABELS.map((label) => (
                <DropdownMenuItem
                  key={label}
                  onClick={() => toast.info(COMING_SOON_TOAST_MESSAGE)}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        type="button"
        variant={isItemPanelOpen ? "default" : "secondary"}
        size="sm"
        aria-pressed={isItemPanelOpen}
        onClick={onToggleItemPanel}
        disabled={!activeItemId}
      >
        <MessageSquareIcon data-icon="inline-start" />
        对话
      </Button>
    </Panel>
  );
}
