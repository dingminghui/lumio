import { Panel } from "@xyflow/react";
import { Focus, Plus, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

type CanvasToolbarProps = {
  onAddNode: () => void;
  onFitView: () => void;
  onReset: () => void;
};

export function CanvasToolbar({ onAddNode, onFitView, onReset }: CanvasToolbarProps) {
  return (
    <Panel
      position="top-left"
      className="flex items-center gap-1 rounded-md border bg-background/90 p-1 shadow-sm backdrop-blur"
    >
      <ToolbarButton title="Add node" onClick={onAddNode}>
        <Plus className="size-4" />
      </ToolbarButton>
      <ToolbarButton title="Fit view" onClick={onFitView}>
        <Focus className="size-4" />
      </ToolbarButton>
      <ToolbarButton title="Reset canvas" onClick={onReset}>
        <RotateCcw className="size-4" />
      </ToolbarButton>
    </Panel>
  );
}

type ToolbarButtonProps = {
  children: ReactNode;
  onClick: () => void;
  title: string;
};

function ToolbarButton({ children, onClick, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className="inline-flex size-8 items-center justify-center rounded-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
