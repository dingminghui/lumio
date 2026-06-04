"use client";

import "./text-node.css";

/* eslint-disable @next/next/no-img-element */
import { Expand, ImageIcon } from "lucide-react";
import { Handle, type NodeProps, NodeResizer, Position } from "@xyflow/react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IMAGE_NODE_IMAGE_LIMIT } from "@/lib/skills/image/constants";
import {
  NODE_MAX_HEIGHT,
  NODE_MAX_WIDTH,
  NODE_MIN_HEIGHT,
  NODE_MIN_WIDTH,
} from "@/lib/canvas/node-layout";
import { cn } from "@/lib/utils";

type ImageNodeImage = {
  id?: string;
  src: string;
  prompt?: string;
  createdAt?: string;
};

type ImageNodeState = {
  description?: unknown;
  style?: unknown;
  aspectRatio?: unknown;
  usage?: unknown;
  images?: unknown;
  status?: unknown;
  error?: unknown;
};

export type ImageNodeData = {
  skillName: string;
  state: ImageNodeState;
  onResize?: (width: number, height: number) => void;
  onResizeEnd?: (width: number, height: number) => void;
};

function getImages(state: ImageNodeState): ImageNodeImage[] {
  if (!Array.isArray(state.images)) {
    return [];
  }

  return state.images.filter(
    (image): image is ImageNodeImage =>
      Boolean(image) &&
      typeof image === "object" &&
      "src" in image &&
      typeof image.src === "string",
  );
}

function getStatusText(state: ImageNodeState, imageCount: number) {
  if (imageCount >= IMAGE_NODE_IMAGE_LIMIT) {
    return "已达上限";
  }

  if (state.status === "generating") {
    return "生成中";
  }

  if (state.status === "awaiting_confirmation") {
    return "待确认";
  }

  if (state.status === "error") {
    return "生成失败";
  }

  if (imageCount > 0) {
    return "已生成";
  }

  return "待描述";
}

export function ImageNode({ data, selected }: NodeProps) {
  const nodeData = data as ImageNodeData;
  const images = getImages(nodeData.state);
  const statusText = getStatusText(nodeData.state, images.length);
  const error =
    typeof nodeData.state.error === "string" ? nodeData.state.error.trim() : "";

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
          "flex h-full w-full cursor-grab flex-col overflow-hidden rounded-xl border border-transparent bg-card text-card-foreground shadow-xs transition-[border-color,box-shadow] active:cursor-grabbing",
          selected
            ? "border-primary shadow-md ring-2 ring-primary/20"
            : "border-transparent",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
          <Badge variant="secondary" className="w-fit text-xs">
            {nodeData.skillName}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {images.length}/{IMAGE_NODE_IMAGE_LIMIT}
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 pt-3 pb-2">
          {images.length ? (
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto">
              {images.map((image, index) => (
                <Dialog key={image.id ?? `${image.src}-${index}`}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="nodrag group relative aspect-square overflow-hidden rounded-md border bg-muted"
                      aria-label={`预览图片 ${index + 1}`}
                    >
                      <img
                        src={image.src}
                        alt={image.prompt || `生成图片 ${index + 1}`}
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                      <span className="absolute top-1.5 right-1.5 rounded-md bg-background/85 p-1 opacity-0 shadow-xs transition-opacity group-hover:opacity-100">
                        <Expand className="size-3.5" />
                      </span>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl">
                    <DialogHeader>
                      <DialogTitle>图片预览</DialogTitle>
                      <DialogDescription>
                        {image.prompt || "Cloudflare Workers AI 生成图片"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex max-h-[75vh] items-center justify-center overflow-hidden rounded-lg bg-muted">
                      <img
                        src={image.src}
                        alt={image.prompt || `生成图片 ${index + 1}`}
                        className="max-h-[75vh] max-w-full object-contain"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <ImageIcon className="size-8" />
              <p className="text-sm">选中节点后在右侧描述图片需求</p>
            </div>
          )}

          {error ? (
            <p className="mt-2 line-clamp-2 text-xs text-destructive">{error}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border/50 px-3 py-1.5 text-[11px] leading-none text-muted-foreground">
          <span>{statusText}</span>
          <span>最多 {IMAGE_NODE_IMAGE_LIMIT} 张</span>
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
