"use client";

import { Map } from "lucide-react";

import { Button } from "@/components/ui/button";

type MinimapToggleProps = {
  showMinimap: boolean;
  onShowMinimapChange: (value: boolean) => void;
};

export function MinimapToggle({
  showMinimap,
  onShowMinimapChange,
}: MinimapToggleProps) {
  return (
    <Button
      type="button"
      title="小地图"
      aria-label="小地图"
      aria-pressed={showMinimap}
      size="icon-sm"
      variant={showMinimap ? "secondary" : "ghost"}
      data-active={showMinimap}
      onClick={() => onShowMinimapChange(!showMinimap)}
    >
      <Map className="text-foreground/80" />
    </Button>
  );
}
