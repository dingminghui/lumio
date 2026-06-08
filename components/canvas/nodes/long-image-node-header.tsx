"use client";

import { DownloadIcon, Loader2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type LongImageNodeHeaderProps = {
  skillName: string;
  hasContent: boolean;
  showGenerateButton: boolean;
  isGenerating: boolean;
  canGenerate: boolean;
  isExporting: boolean;
  onGenerate?: () => void;
  onExport: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

export function LongImageNodeHeader({
  skillName,
  hasContent,
  showGenerateButton,
  isGenerating,
  canGenerate,
  isExporting,
  onGenerate,
  onExport,
}: LongImageNodeHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
      <Badge variant="secondary" className="w-fit text-xs">
        {skillName}
      </Badge>
      {hasContent ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="nodrag size-6 shrink-0"
          aria-label="导出长图"
          title="导出长图"
          disabled={isExporting}
          onClick={onExport}
        >
          {isExporting ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <DownloadIcon />
          )}
        </Button>
      ) : showGenerateButton ? (
        <Button
          type="button"
          variant="default"
          size="sm"
          className="nodrag h-6 shrink-0 px-2 text-xs"
          disabled={!canGenerate}
          title={
            canGenerate
              ? "根据上游文档生成长图"
              : "请先连接至少一个有内容的文档节点"
          }
          onClick={(event) => {
            event.stopPropagation();
            onGenerate?.();
          }}
        >
          开始生成
        </Button>
      ) : isGenerating ? (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2Icon className="size-3.5 animate-spin" />
          生成中
        </span>
      ) : null}
    </div>
  );
}
