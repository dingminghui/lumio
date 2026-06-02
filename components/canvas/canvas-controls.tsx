"use client";

import { Panel } from "@xyflow/react";

import { BgColorControl } from "@/components/canvas/controls/bg-color-control";
import { MinimapToggle } from "@/components/canvas/controls/minimap-toggle";
import { ZoomControl } from "@/components/canvas/controls/zoom-control";
import { Separator } from "@/components/ui/separator";

type CanvasControlsProps = {
  bgColor: string;
  onBgColorChange: (color: string) => void;
  showDots: boolean;
  onShowDotsChange: (value: boolean) => void;
  showMinimap: boolean;
  onShowMinimapChange: (value: boolean) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onSetZoom: (zoom: number) => void;
};

export function CanvasControls({
  bgColor,
  onBgColorChange,
  showDots,
  onShowDotsChange,
  showMinimap,
  onShowMinimapChange,
  onZoomIn,
  onZoomOut,
  onFitView,
  onSetZoom,
}: CanvasControlsProps) {
  return (
    <Panel
      position="bottom-left"
      className="flex items-center gap-1 rounded-md p-1 backdrop-blur"
    >
      <BgColorControl
        bgColor={bgColor}
        onBgColorChange={onBgColorChange}
        showDots={showDots}
        onShowDotsChange={onShowDotsChange}
      />
      <MinimapToggle
        showMinimap={showMinimap}
        onShowMinimapChange={onShowMinimapChange}
      />
      <Separator
        orientation="vertical"
        className="mx-1 h-5 data-vertical:self-center"
      />
      <ZoomControl
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onFitView={onFitView}
        onSetZoom={onSetZoom}
      />
    </Panel>
  );
}
