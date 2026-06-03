"use client";

import { useCallback, useMemo, useState } from "react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  Panel,
} from "@xyflow/react";
import { MessageSquareIcon } from "lucide-react";

import { updateProjectFlowAction } from "@/app/projects/actions";
import { CanvasControls } from "@/components/canvas/canvas-controls";
import { CanvasHeader } from "@/components/canvas/canvas-header";
import {
  DEFAULT_BG_COLOR,
  DEFAULT_FLOW_SNAPSHOT,
  DEFAULT_SHOW_DOTS,
  type FlowSnapshot,
} from "@/utils/flow-snapshot";
import { Button } from "@/components/ui/button";
import { useKey } from "@/hooks/use-key";
import { deriveDotColor, isHexColor } from "@/utils/canvas";

type FlowCanvasProps = {
  projectId: string;
  boardName: string;
  initialSnapshot: FlowSnapshot;
  isSessionPanelOpen: boolean;
  onToggleSessionPanel: () => void;
};

export function FlowCanvas({
  projectId,
  boardName,
  initialSnapshot,
  isSessionPanelOpen,
  onToggleSessionPanel,
}: FlowCanvasProps) {
  const initialFlowSnapshot = useMemo(
    () => ({
      ...DEFAULT_FLOW_SNAPSHOT,
      ...initialSnapshot,
    }),
    [initialSnapshot],
  );
  const [nodes, setNodes] = useNodesState(initialFlowSnapshot.nodes);
  const [edges, setEdges] = useEdgesState(initialFlowSnapshot.edges);
  const [bgColor, setBgColor] = useState(
    isHexColor(initialFlowSnapshot.bgColor)
      ? initialFlowSnapshot.bgColor
      : DEFAULT_BG_COLOR,
  );
  const [showDots, setShowDots] = useState(
    initialFlowSnapshot.showDots ?? DEFAULT_SHOW_DOTS,
  );
  const [showMinimap, setShowMinimap] = useState(false);
  const { fitView, getEdges, getNodes, getViewport, setViewport, zoomIn, zoomOut } =
    useReactFlow();

  const persistFlow = useCallback(
    (overrides?: Partial<FlowSnapshot>) => {
      requestAnimationFrame(() => {
        void updateProjectFlowAction(projectId, {
          nodes: overrides?.nodes ?? getNodes(),
          edges: overrides?.edges ?? getEdges(),
          viewport: overrides?.viewport ?? getViewport(),
          name: boardName,
          bgColor: overrides?.bgColor ?? bgColor,
          showDots: overrides?.showDots ?? showDots,
        });
      });
    },
    [bgColor, boardName, getEdges, getNodes, getViewport, projectId, showDots],
  );

  const handleInit = useCallback(() => {
    const viewport = initialFlowSnapshot.viewport;

    if (viewport) {
      requestAnimationFrame(() => setViewport(viewport));
    }
  }, [initialFlowSnapshot.viewport, setViewport]);

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      setNodes((currentNodes) => {
        const nextNodes = applyNodeChanges(changes, currentNodes);
        persistFlow({ nodes: nextNodes });

        return nextNodes;
      });
    },
    [persistFlow, setNodes],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      setEdges((currentEdges) => {
        const nextEdges = applyEdgeChanges(changes, currentEdges);
        persistFlow({ edges: nextEdges });

        return nextEdges;
      });
    },
    [persistFlow, setEdges],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) => {
        const nextEdges = addEdge(connection, currentEdges);
        persistFlow({ edges: nextEdges });

        return nextEdges;
      });
    },
    [persistFlow, setEdges],
  );

  const handleSetZoom = useCallback(
    (zoom: number) => {
      const viewport = getViewport();
      setViewport({ ...viewport, zoom });
      persistFlow({ viewport: { ...viewport, zoom } });
    },
    [getViewport, persistFlow, setViewport],
  );

  const handleBgColorChange = useCallback(
    (color: string) => {
      setBgColor(color);
      persistFlow({ bgColor: color });
    },
    [persistFlow],
  );

  const handleShowDotsChange = useCallback(
    (value: boolean) => {
      setShowDots(value);
      persistFlow({ showDots: value });
    },
    [persistFlow],
  );

  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 180 });
    requestAnimationFrame(() => persistFlow());
  }, [persistFlow, zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 180 });
    requestAnimationFrame(() => persistFlow());
  }, [persistFlow, zoomOut]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.3, duration: 200 });
    requestAnimationFrame(() => persistFlow());
  }, [fitView, persistFlow]);

  useKey({ key: "1", shiftKey: true }, (event) => {
    event.preventDefault();
    handleFitView();
  });
  useKey({ key: "+", metaKey: true }, (event) => {
    event.preventDefault();
    handleZoomIn();
  });
  useKey({ key: "+", ctrlKey: true }, (event) => {
    event.preventDefault();
    handleZoomIn();
  });
  useKey({ key: "=", metaKey: true }, (event) => {
    event.preventDefault();
    handleZoomIn();
  });
  useKey({ key: "=", ctrlKey: true }, (event) => {
    event.preventDefault();
    handleZoomIn();
  });
  useKey({ key: "-", metaKey: true }, (event) => {
    event.preventDefault();
    handleZoomOut();
  });
  useKey({ key: "-", ctrlKey: true }, (event) => {
    event.preventDefault();
    handleZoomOut();
  });
  useKey({ key: "_", metaKey: true }, (event) => {
    event.preventDefault();
    handleZoomOut();
  });
  useKey({ key: "_", ctrlKey: true }, (event) => {
    event.preventDefault();
    handleZoomOut();
  });

  const isCanvasEmpty = nodes.length === 0;

  return (
    <ReactFlow
      style={{ background: bgColor }}
      nodes={nodes}
      edges={edges}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={handleConnect}
      onInit={handleInit}
      onMoveEnd={() => persistFlow()}
      onNodeDragStop={() => persistFlow()}
      fitView
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
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg font-medium text-muted-foreground">
          输入你的想法开始创作
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
      <Panel position="top-right" className="rounded-md p-1 backdrop-blur">
        <Button
          type="button"
          variant={isSessionPanelOpen ? "default" : "secondary"}
          aria-pressed={isSessionPanelOpen}
          onClick={onToggleSessionPanel}
        >
          <MessageSquareIcon data-icon="inline-start" />
          会话
        </Button>
      </Panel>
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
