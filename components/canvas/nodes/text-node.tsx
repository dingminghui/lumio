"use client";

import "./text-node.css";

import dynamic from "next/dynamic";
import { PencilLine } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Handle, type NodeProps, NodeResizer, Position } from "@xyflow/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageResponse } from "@/components/ai-elements/message";
import { handleNodeContentWheel } from "@/lib/canvas/node-wheel";
import {
  getDocumentMarkdown,
  getFallbackNodeContent,
  isDocumentSkill,
} from "@/lib/canvas/node-content";
import {
  NODE_MAX_HEIGHT,
  NODE_MAX_WIDTH,
  NODE_MIN_HEIGHT,
  NODE_MIN_WIDTH,
} from "@/lib/canvas/node-layout";
import { LUMIO_SCROLLBAR_CLASS } from "@/lib/ui/scroll";
import { cn } from "@/lib/utils";

const DocumentPlateEditor = dynamic(
  () =>
    import("@/components/canvas/nodes/document-plate-editor").then(
      (module) => module.DocumentPlateEditor,
    ),
  {
    ssr: false,
    loading: () => <p className="text-sm text-muted-foreground">加载编辑器…</p>,
  },
);

export type TextNodeData = {
  skillId: string;
  skillName: string;
  state: Record<string, unknown>;
  onResize?: (width: number, height: number) => void;
  onResizeEnd?: (width: number, height: number) => void;
  onContentChange?: (content: string) => void;
  onStartDocumentEdit?: () => void;
};

export function TextNode({ data, selected }: NodeProps) {
  const nodeData = data as TextNodeData;
  const isDocumentNode = isDocumentSkill(nodeData.skillId);
  const documentMarkdown = getDocumentMarkdown(nodeData.state);
  const fallbackContent = getFallbackNodeContent(nodeData.state);
  const [isEditing, setIsEditing] = useState(false);
  const nodeCardRef = useRef<HTMLDivElement>(null);

  const isActiveEdit = selected && isEditing;

  const handleStartEdit = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();

      if (isActiveEdit) {
        return;
      }

      nodeData.onStartDocumentEdit?.();
      setIsEditing(true);
    },
    [isActiveEdit, nodeData],
  );

  const handleEditEnd = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleCardBlurCapture = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      if (!isActiveEdit) {
        return;
      }

      const next = event.relatedTarget;

      if (next instanceof HTMLElement && nodeCardRef.current?.contains(next)) {
        return;
      }

      handleEditEnd();
    },
    [handleEditEnd, isActiveEdit],
  );

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        className="lumio-text-node__connect-handle"
      />

      <div
        ref={nodeCardRef}
        onBlurCapture={handleCardBlurCapture}
        className={cn(
          "flex h-full w-full cursor-grab flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow active:cursor-grabbing",
          selected
            ? "border-primary shadow-md ring-2 ring-primary/20"
            : "border-border",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
          <Badge variant="secondary" className="w-fit text-xs">
            {nodeData.skillName}
          </Badge>
          {isDocumentNode && !isActiveEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="nodrag size-5 shrink-0"
              aria-label="编辑文档"
              title="编辑文档"
              onClick={handleStartEdit}
            >
              <PencilLine className="size-3.5" />
            </Button>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 pt-2 pb-3">
          {isDocumentNode ? (
            <DocumentPlateEditor
              markdown={documentMarkdown}
              editable={isActiveEdit}
              onContentChange={nodeData.onContentChange}
            />
          ) : fallbackContent ? (
            <div
              className={cn(
                LUMIO_SCROLLBAR_CLASS,
                "nodrag nowheel min-h-0 flex-1 overflow-y-auto text-sm",
              )}
              onWheel={handleNodeContentWheel}
            >
              <MessageResponse className="prose prose-sm dark:prose-invert max-w-none">
                {fallbackContent}
              </MessageResponse>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              暂无内容，选中节点后在右侧对话生成
            </p>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        className="lumio-text-node__connect-handle"
      />

      {selected ? (
        <NodeResizer
          minWidth={NODE_MIN_WIDTH}
          maxWidth={NODE_MAX_WIDTH}
          minHeight={NODE_MIN_HEIGHT}
          maxHeight={NODE_MAX_HEIGHT}
          lineClassName="!z-20 !border-primary/30"
          handleClassName="lumio-text-node__resize-handle"
          onResize={(_event, { width, height }) => {
            nodeData.onResize?.(width, height);
          }}
          onResizeEnd={(_event, { width, height }) => {
            nodeData.onResizeEnd?.(width, height);
          }}
        />
      ) : null}
    </>
  );
}
