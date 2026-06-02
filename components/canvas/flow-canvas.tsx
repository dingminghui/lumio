"use client";

import { useCallback } from "react";
import {
  addEdge,
  Background,
  BackgroundVariant,
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

import { defaultEdges, defaultNodes } from "@/components/canvas/default-flow";
import { FLOW_STORAGE_KEY, isFlowSnapshot } from "@/components/canvas/flow-storage";

export function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
  const { getEdges, getNodes, getViewport, setViewport } = useReactFlow();

  const persistFlow = useCallback(() => {
    requestAnimationFrame(() => {
      window.localStorage.setItem(
        FLOW_STORAGE_KEY,
        JSON.stringify({
          nodes: getNodes(),
          edges: getEdges(),
          viewport: getViewport(),
        }),
      );
    });
  }, [getEdges, getNodes, getViewport]);

  const handleInit = useCallback(() => {
    const savedFlow = window.localStorage.getItem(FLOW_STORAGE_KEY);

    if (savedFlow) {
      try {
        const parsed = JSON.parse(savedFlow);

        if (isFlowSnapshot(parsed)) {
          setNodes(parsed.nodes);
          setEdges(parsed.edges);

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

  return (
    <ReactFlow
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
      <Background color="#d4d4d8" gap={24} variant={BackgroundVariant.Dots} />
    </ReactFlow>
  );
}
