"use client";

import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  type Viewport,
} from "@xyflow/react";

import { CanvasControls } from "@/components/canvas/canvas-controls";
import { CanvasHeader } from "@/components/canvas/canvas-header";
import { FlowCanvasToolbar } from "@/components/canvas/flow-canvas-toolbar";
import { useKey } from "@/hooks/use-key";
import { useFlowCanvasState } from "@/hooks/use-flow-canvas-state";
import { getSkillNodeTypes } from "@/lib/skills/client-nodes";
import type { CanvasItemWithMessages } from "@/db/queries";
import type { CanvasEdgeRow } from "@/types/skill";
import { deriveDotColor } from "@/utils/canvas";

type SkillOption = {
  id: string;
  name: string;
};

type FlowCanvasProps = {
  projectId: string;
  boardName: string;
  items: CanvasItemWithMessages[];
  edges: CanvasEdgeRow[];
  activeItemId: string | null;
  skillOptions: SkillOption[];
  skillNames: Record<string, string>;
  skillNodeTypes: Record<string, string>;
  initialViewport: Viewport;
  bgColor: string;
  showDots: boolean;
  isItemPanelOpen: boolean;
  onItemSelect: (itemId: string) => void;
  onItemAdd: (skillId: string) => void;
  onItemDelete: (itemId: string) => void;
  onItemPositionChange: (
    itemId: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => void;
  onItemContentChange: (itemId: string, content: string) => void;
  onItemGenerate?: (itemId: string) => void;
  onEdgeAdd: (edge: CanvasEdgeRow) => void;
  onEdgeRemove: (edgeId: string) => void;
  onToggleItemPanel: () => void;
  upstreamDocumentCounts?: Record<string, number>;
};

export function FlowCanvas({
  projectId,
  boardName,
  items,
  edges: initialEdges,
  activeItemId,
  skillOptions,
  skillNames,
  skillNodeTypes,
  initialViewport,
  bgColor: initialBgColor,
  showDots: initialShowDots,
  isItemPanelOpen,
  onItemSelect,
  onItemAdd,
  onItemDelete,
  onItemPositionChange,
  onItemContentChange,
  onItemGenerate,
  onEdgeAdd,
  onEdgeRemove,
  onToggleItemPanel,
  upstreamDocumentCounts,
}: FlowCanvasProps) {
  const nodeTypes = useMemo(() => getSkillNodeTypes(), []);

  const {
    nodes,
    edges,
    bgColor,
    showDots,
    showMinimap,
    setShowMinimap,
    isCanvasEmpty,
    handleInit,
    handleNodesChange,
    handleEdgesChange,
    handleConnect,
    handleNodeDragStop,
    handleMoveEnd,
    handleSetZoom,
    handleBgColorChange,
    handleShowDotsChange,
    handleZoomIn,
    handleZoomOut,
    handleFitView,
    selectCanvasItem,
  } = useFlowCanvasState({
    projectId,
    items,
    initialEdges,
    skillNames,
    skillNodeTypes,
    activeItemId,
    initialViewport,
    initialBgColor,
    initialShowDots,
    onItemDelete,
    onItemPositionChange,
    onItemContentChange,
    onItemSelect,
    onItemGenerate,
    onEdgeAdd,
    onEdgeRemove,
    upstreamDocumentCounts,
  });

  useKey({ key: "1", shiftKey: true }, (event) => {
    event.preventDefault();
    handleFitView();
  });

  return (
    <ReactFlow
      style={{ background: bgColor }}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={handleConnect}
      onInit={handleInit}
      onMoveEnd={handleMoveEnd}
      onNodeClick={(_event, node) => selectCanvasItem(node.id)}
      onNodeDragStop={handleNodeDragStop}
      nodesConnectable
      elementsSelectable
      zoomOnScroll
      zoomOnPinch
      minZoom={0.1}
      maxZoom={2.5}
      proOptions={{ hideAttribution: true }}
    >
      {showDots ? (
        <Background
          color={deriveDotColor(bgColor)}
          gap={24}
          variant={BackgroundVariant.Dots}
        />
      ) : null}
      {isCanvasEmpty ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <p className="text-lg font-medium">画布为空</p>
          <p className="text-sm">点击右上角「新增节点」开始创作</p>
        </div>
      ) : null}
      {showMinimap ? (
        <MiniMap
          pannable
          zoomable
          position="bottom-left"
          style={{ marginBottom: 46 }}
        />
      ) : null}
      <CanvasHeader boardName={boardName} />
      <FlowCanvasToolbar
        skillOptions={skillOptions}
        activeItemId={activeItemId}
        isItemPanelOpen={isItemPanelOpen}
        onItemAdd={onItemAdd}
        onToggleItemPanel={onToggleItemPanel}
      />
      <CanvasControls
        bgColor={bgColor}
        onBgColorChange={handleBgColorChange}
        showDots={showDots}
        onShowDotsChange={handleShowDotsChange}
        showMinimap={showMinimap}
        onShowMinimapChange={setShowMinimap}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onSetZoom={handleSetZoom}
      />
    </ReactFlow>
  );
}
