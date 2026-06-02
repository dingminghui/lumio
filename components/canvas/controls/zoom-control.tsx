"use client";

import { useViewport } from "@xyflow/react";
import { ArrowBigUp, ChevronUp, Command, Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

type ZoomControlProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onSetZoom: (zoom: number) => void;
};

export function ZoomControl({
  onZoomIn,
  onZoomOut,
  onFitView,
  onSetZoom,
}: ZoomControlProps) {
  const { zoom } = useViewport();
  const zoomLabel = useMemo(() => `${Math.round(zoom * 100)}%`, [zoom]);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  return (
    <Popover open={isZoomOpen} onOpenChange={setIsZoomOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          title="缩放选项"
          aria-label="缩放选项"
          size="sm"
          variant={isZoomOpen ? "secondary" : "ghost"}
          className="min-w-12 px-2"
        >
          {zoomLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-52 gap-y-1.5 p-1">
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full justify-between px-3 py-1.5 text-sm font-normal"
          onClick={onZoomIn}
        >
          <span>放大</span>
          <Kbd className="gap-0.5">
            <Command className="size-3" />
            <Plus className="size-3" />
          </Kbd>
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full justify-between px-3 py-1.5 text-sm font-normal"
          onClick={onZoomOut}
        >
          <span>缩小</span>
          <Kbd className="gap-0.5">
            <Command className="size-3" />
            <Minus className="size-3" />
          </Kbd>
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full justify-between px-3 py-1.5 text-sm font-normal"
          onClick={onFitView}
        >
          <span>显示画布所有元素</span>
          <Kbd className="gap-0.5">
            <ArrowBigUp className="size-3" />
            <ChevronUp className="size-3" />
            <span className="text-[10px] leading-none">1</span>
          </Kbd>
        </Button>
        <Separator className="bg-zinc-100" />
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full justify-between px-3 py-1.5 text-sm font-normal"
          onClick={() => onSetZoom(0.5)}
        >
          缩放至50%
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full justify-between px-3 py-1.5 text-sm font-normal"
          onClick={() => onSetZoom(1)}
        >
          缩放至100%
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full justify-between px-3 py-1.5 text-sm font-normal"
          onClick={() => onSetZoom(2)}
        >
          缩放至200%
        </Button>
      </PopoverContent>
    </Popover>
  );
}
