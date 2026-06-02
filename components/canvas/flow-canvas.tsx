"use client";

import { useCallback, useState } from "react";
import {
  addEdge,
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
} from "@xyflow/react";

import { CanvasHeader } from "@/components/canvas/canvas-header";
import { CanvasControls } from "@/components/canvas/canvas-controls";
import { defaultEdges, defaultNodes } from "@/components/canvas/default-flow";
import { useKey } from "@/hooks/use-key";
import { deriveDotColor, isHexColor } from "@/utils/canvas";
import {
  DEFAULT_BG_COLOR,
  DEFAULT_BOARD_NAME,
  DEFAULT_SHOW_DOTS,
  FLOW_STORAGE_KEY,
  type FlowSnapshot,
  isFlowSnapshot,
} from "@/components/canvas/flow-storage";

export function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
  const [boardName, setBoardName] = useState(DEFAULT_BOARD_NAME);
  const [bgColor, setBgColor] = useState(DEFAULT_BG_COLOR);
  const [showDots, setShowDots] = useState(DEFAULT_SHOW_DOTS);
  const [showMinimap, setShowMinimap] = useState(false);
  const { fitView, getEdges, getNodes, getViewport, setViewport, zoomIn, zoomOut } =
    useReactFlow();

  const persistFlow = useCallback(
    (overrides?: Partial<FlowSnapshot>) => {
      requestAnimationFrame(() => {
        window.localStorage.setItem(
          FLOW_STORAGE_KEY,
          JSON.stringify({
            nodes: overrides?.nodes ?? getNodes(),
            edges: overrides?.edges ?? getEdges(),
            viewport: overrides?.viewport ?? getViewport(),
            name: overrides?.name ?? boardName,
            bgColor: overrides?.bgColor ?? bgColor,
            showDots: overrides?.showDots ?? showDots,
          }),
        );
      });
    },
    [bgColor, boardName, getEdges, getNodes, getViewport, showDots],
  );

  const handleInit = useCallback(() => {
    const savedFlow = window.localStorage.getItem(FLOW_STORAGE_KEY);

    if (savedFlow) {
      try {
        const parsed = JSON.parse(savedFlow);

        if (isFlowSnapshot(parsed)) {
          setNodes(parsed.nodes);
          setEdges(parsed.edges);
          setBoardName(parsed.name ?? DEFAULT_BOARD_NAME);
          setBgColor(isHexColor(parsed.bgColor) ? parsed.bgColor : DEFAULT_BG_COLOR);
          setShowDots(parsed.showDots ?? DEFAULT_SHOW_DOTS);

          if (parsed.viewport) {
            requestAnimationFrame(() => setViewport(parsed.viewport));
          }
        }
      } catch {
        window.localStorage.removeItem(FLOW_STORAGE_KEY);
      }
    }
  }, [setEdges, setNodes, setViewport]);

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      onNodesChange(changes);
      persistFlow();
    },
    [onNodesChange, persistFlow],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      onEdgesChange(changes);
      persistFlow();
    },
    [onEdgesChange, persistFlow],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) => addEdge(connection, currentEdges));
      persistFlow();
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
