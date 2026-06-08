"use client";

import "./text-node.css";

import { FileImageIcon } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Handle, type NodeProps, NodeResizer, Position } from "@xyflow/react";
import { toast } from "sonner";

import { LongImageNodeHeader } from "@/components/canvas/nodes/long-image-node-header";
import { LongImagePreview } from "@/components/canvas/nodes/long-image-preview";
import { useLongImageNodeSize } from "@/hooks/use-long-image-node-size";
import {
  NODE_MAX_WIDTH,
  NODE_MIN_HEIGHT,
  NODE_MIN_WIDTH,
} from "@/lib/canvas/node-layout";
import {
  LONG_IMAGE_DEFAULT_WIDTH,
  LONG_IMAGE_EMPTY_MIN_HEIGHT,
  LONG_IMAGE_MAX_HEIGHT,
  LONG_IMAGE_NODE_CHROME_HEIGHT,
} from "@/lib/skills/long-image/constants";
import {
  createLongImageFileName,
  parseLongImageState,
  type LongImageState,
} from "@/lib/skills/long-image/state";
import { cn } from "@/lib/utils";

export type LongImageNodeData = {
  skillName: string;
  state: LongImageState;
  upstreamDocumentCount?: number;
  onResize?: (width: number, height: number) => void;
  onResizeEnd?: (width: number, height: number) => void;
  onGenerate?: () => void;
};

export function LongImageNode({ data, selected, width }: NodeProps) {
  const nodeData = data as LongImageNodeData;
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const nodeWidth =
    typeof width === "number" ? width : LONG_IMAGE_DEFAULT_WIDTH;

  const parsed = useMemo(
    () => parseLongImageState(nodeData.state),
    [nodeData.state],
  );
  const imagesById = useMemo(
    () => new Map(parsed.images.map((image) => [image.id, image])),
    [parsed.images],
  );
  const contentVersion = useMemo(
    () =>
      [
        parsed.title,
        parsed.subtitle,
        parsed.summary,
        parsed.sections.length,
        parsed.images.length,
      ].join("|"),
    [parsed],
  );

  const upstreamDocumentCount = nodeData.upstreamDocumentCount ?? 0;

  const { reportContentHeight } = useLongImageNodeSize({
    hasContent: parsed.hasContent,
    nodeWidth,
    onResize: nodeData.onResize,
    onResizeEnd: nodeData.onResizeEnd,
    contentRef: exportRef,
    contentVersion,
  });

  const handleExport = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();

      if (!exportRef.current || !parsed.hasContent) {
        return;
      }

      setIsExporting(true);

      try {
        const { toPng } = await import("html-to-image");
        const element = exportRef.current;
        const dataUrl = await toPng(element, {
          backgroundColor: "#f4efdf",
          cacheBust: true,
          pixelRatio: 2,
          width: element.scrollWidth,
          height: element.scrollHeight,
          style: {
            margin: "0",
            transform: "none",
          },
        });
        const link = document.createElement("a");

        link.download = createLongImageFileName(parsed.title);
        link.href = dataUrl;
        link.click();
        toast.success("长图已导出");
      } catch (exportError) {
        console.error("Failed to export long image", exportError);
        toast.error("导出失败，请稍后重试");
      } finally {
        setIsExporting(false);
      }
    },
    [parsed.hasContent, parsed.title],
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
        className={cn(
          "flex h-full w-full cursor-grab flex-col overflow-visible rounded-xl border border-transparent bg-card text-card-foreground shadow-xs transition-[border-color,box-shadow] active:cursor-grabbing",
          selected
            ? "border-primary shadow-md ring-2 ring-primary/20"
            : "border-transparent",
        )}
      >
        <LongImageNodeHeader
          skillName={nodeData.skillName}
          hasContent={parsed.hasContent}
          showGenerateButton={parsed.showGenerateButton}
          isGenerating={parsed.isGenerating}
          canGenerate={upstreamDocumentCount > 0}
          isExporting={isExporting}
          onGenerate={nodeData.onGenerate}
          onExport={handleExport}
        />

        <div className="shrink-0 bg-[#e7e2d0] p-1.5">
          {parsed.hasContent ? (
            <LongImagePreview
              contentRef={exportRef}
              title={parsed.title}
              subtitle={parsed.subtitle}
              summary={parsed.summary}
              sections={parsed.sections}
              imagesById={imagesById}
              onImageLoad={reportContentHeight}
            />
          ) : (
            <div
              className="flex flex-col items-center justify-center gap-3 text-center text-muted-foreground"
              style={{
                minHeight:
                  LONG_IMAGE_EMPTY_MIN_HEIGHT - LONG_IMAGE_NODE_CHROME_HEIGHT,
              }}
            >
              <FileImageIcon className="size-9" />
              <div className="flex max-w-64 flex-col gap-1">
                <p className="text-sm font-medium text-foreground">还没有长图内容</p>
                <p className="text-xs leading-5">
                  连接至少一个有内容的文档节点后，点击右上角「开始生成」。
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border/50 px-3 py-1.5 text-[11px] leading-none text-muted-foreground">
          <span>{parsed.statusText}</span>
          <span>{parsed.hasContent ? `${parsed.sections.length} 节` : "需连接文档"}</span>
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
          maxHeight={LONG_IMAGE_MAX_HEIGHT}
          lineClassName="!z-20 !border-primary/30"
          handleClassName="lumio-text-node__resize-handle"
          onResize={(_event, { width: nodeResizeWidth, height }) => {
            nodeData.onResize?.(nodeResizeWidth, height);
          }}
          onResizeEnd={(_event, { width: nodeResizeWidth, height }) => {
            nodeData.onResizeEnd?.(nodeResizeWidth, height);
          }}
        />
      ) : null}
    </>
  );
}
