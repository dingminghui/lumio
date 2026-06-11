"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useStore,
  type Connection,
  type EdgeChange,
  type Node,
  type NodeChange,
  type Viewport,
} from "@xyflow/react";

import {
  createCanvasEdgeAction,
  deleteCanvasEdgeAction,
  updateCanvasItemPositionAction,
  updateProjectViewportAction,
} from "@/app/projects/actions";
import {
  LAYOUT_SAVE_DEBOUNCE_MS,
  VIEWPORT_SAVE_DEBOUNCE_MS,
} from "@/lib/canvas/constants";
import {
  edgesToFlow,
  itemsToNodes,
  NOOP_NODE_HANDLERS,
  nodeDimension,
  syncNodesFromItems,
  type NodeInteractionHandlers,
} from "@/lib/canvas/flow-mapper";
import {
  captureDocumentEditSnapshot,
  type DocumentEditSnapshot,
  DOCUMENT_EDIT_LAYOUT_ANIMATION_MS,
  enterDocumentEditState,
  exitDocumentEditState,
} from "@/lib/canvas/document-node-focus";
import { NODE_DEFAULT_HEIGHT } from "@/lib/canvas/node-layout";
import type { CanvasItemWithMessages } from "@/db/queries";
import type { CanvasEdgeRow } from "@/types/skill";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { isHexColor } from "@/utils/canvas";
import { DEFAULT_BG_COLOR, DEFAULT_SHOW_DOTS } from "@/utils/flow-snapshot";

type UseFlowCanvasStateOptions = {
  projectId: string;
  items: CanvasItemWithMessages[];
  initialEdges: CanvasEdgeRow[];
  skillNames: Record<string, string>;
  skillNodeTypes: Record<string, string>;
  activeItemId: string | null;
  initialViewport: Viewport;
  initialBgColor: string;
  initialShowDots: boolean;
  onItemDelete: (itemId: string) => void;
  onItemPositionChange: (
    itemId: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => void;
  onItemContentChange: (itemId: string, content: string) => void;
  onItemSelect: (itemId: string) => void;
  onEdgeAdd: (edge: CanvasEdgeRow) => void;
  onEdgeRemove: (edgeId: string) => void;
};

export function useFlowCanvasState({
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
  onEdgeAdd,
  onEdgeRemove,
}: UseFlowCanvasStateOptions) {
  const hasAutoFitRef = useRef(false);
  const documentEditSnapshotsRef = useRef<Map<string, DocumentEditSnapshot>>(new Map());
  const scheduleLayoutSave = useDebouncedCallback(LAYOUT_SAVE_DEBOUNCE_MS);
  const scheduleViewportSave = useDebouncedCallback(VIEWPORT_SAVE_DEBOUNCE_MS);

  const [nodes, setNodes, onNodesChange] = useNodesState(
    itemsToNodes(items, skillNames, activeItemId, NOOP_NODE_HANDLERS, skillNodeTypes),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    edgesToFlow(initialEdges, activeItemId),
  );
  const [bgColor, setBgColor] = useState(
    isHexColor(initialBgColor) ? initialBgColor : DEFAULT_BG_COLOR,
  );
  const [showDots, setShowDots] = useState(initialShowDots ?? DEFAULT_SHOW_DOTS);
  const [showMinimap, setShowMinimap] = useState(false);

  const { fitView, getNode, getViewport, setCenter, setViewport, zoomIn, zoomOut } =
    useReactFlow();

  // Actual ReactFlow container pixel dimensions (excludes any sidebars/panels).
  const rfWidth = useStore((s) => s.width);
  const rfHeight = useStore((s) => s.height);


  const updateNodeSize = useCallback(
    (itemId: string, width: number, height: number) => {
      setNodes((current) =>
        current.map((node) =>
          node.id === itemId
            ? {
                ...node,
                width,
                height,
                style: { ...node.style, width, height },
              }
            : node,
        ),
      );
    },
    [setNodes],
  );

  const persistItemLayout = useCallback(
    (
      itemId: string,
      positionX: number,
      positionY: number,
      width: number,
      height: number,
    ) => {
      onItemPositionChange(itemId, positionX, positionY, width, height);
      scheduleLayoutSave(() => {
        void updateCanvasItemPositionAction(
          itemId,
          positionX,
          positionY,
          width,
          height,
        );
      });
    },
    [onItemPositionChange, scheduleLayoutSave],
  );

  const handleResizeEnd = useCallback(
    (itemId: string, width: number, height: number) => {
      let positionX = 0;
      let positionY = 0;
      let shouldPersist = false;

      setNodes((current) => {
        const node = current.find((entry) => entry.id === itemId);

        if (node) {
          positionX = node.position.x;
          positionY = node.position.y;
          shouldPersist = true;
        }

        return current.map((entry) =>
          entry.id === itemId
            ? {
                ...entry,
                width,
                height,
                style: { ...entry.style, width, height },
              }
            : entry,
        );
      });

      if (shouldPersist) {
        queueMicrotask(() => {
          persistItemLayout(itemId, positionX, positionY, width, height);
        });
      }
    },
    [persistItemLayout, setNodes],
  );

  const persistViewport = useCallback(
    (viewport: Viewport) => {
      scheduleViewportSave(() => {
        void updateProjectViewportAction(projectId, { viewport });
      });
    },
    [projectId, scheduleViewportSave],
  );

  const selectCanvasItem = useCallback(
    (itemId: string) => {
      onItemSelect(itemId);
      setNodes((current) =>
        current.map((node) => ({
          ...node,
          selected: node.id === itemId,
        })),
      );
    },
    [onItemSelect, setNodes],
  );

  const focusNodeForDocumentEdit = useCallback(
    (itemId: string) => {
      const node = getNode(itemId);

      if (!node) {
        return;
      }

      const viewport = getViewport();

      if (!documentEditSnapshotsRef.current.has(itemId)) {
        documentEditSnapshotsRef.current.set(
          itemId,
          captureDocumentEditSnapshot(node, viewport),
        );
      }

      // Always enter edit mode at zoom=1 so text is readable.
      // At zoom=1, canvas units equal screen pixels, so node size is simply
      // rfWidth/rfHeight multiplied by the fill ratio.
      const EDIT_ZOOM = 1;
      const targetWidth = rfWidth * 0.8;
      const targetHeight = rfHeight * 0.75;

      setNodes((current) =>
        current.map((entry) =>
          entry.id === itemId
            ? enterDocumentEditState(entry, targetWidth, targetHeight)
            : entry,
        ),
      );

      const centerX = node.position.x + targetWidth / 2;
      const centerY = node.position.y + targetHeight / 2;

      requestAnimationFrame(() => {
        void setCenter(centerX, centerY, {
          zoom: EDIT_ZOOM,
          duration: DOCUMENT_EDIT_LAYOUT_ANIMATION_MS,
        }).then(() => persistViewport(getViewport()));
      });
    },
    [getNode, getViewport, persistViewport, rfHeight, rfWidth, setCenter, setNodes],
  );

  const restoreNodeAfterDocumentEdit = useCallback(
    (itemId: string) => {
      const snapshot = documentEditSnapshotsRef.current.get(itemId);

      if (!snapshot) {
        return;
      }

      documentEditSnapshotsRef.current.delete(itemId);

      setNodes((current) =>
        current.map((entry) =>
          entry.id === itemId ? exitDocumentEditState(entry, snapshot) : entry,
        ),
      );

      requestAnimationFrame(() => {
        void setViewport(snapshot.viewport, {
          duration: DOCUMENT_EDIT_LAYOUT_ANIMATION_MS,
        }).then(() => persistViewport(getViewport()));
      });
    },
    [getViewport, persistViewport, setNodes, setViewport],
  );

  const startDocumentEdit = useCallback(
    (itemId: string) => {
      selectCanvasItem(itemId);
      focusNodeForDocumentEdit(itemId);
    },
    [focusNodeForDocumentEdit, selectCanvasItem],
  );

  const endDocumentEdit = useCallback(
    (itemId: string) => {
      restoreNodeAfterDocumentEdit(itemId);
    },
    [restoreNodeAfterDocumentEdit],
  );

  const nodeHandlers = useMemo<NodeInteractionHandlers>(
    () => ({
      onResize: updateNodeSize,
      onResizeEnd: handleResizeEnd,
      onContentChange: onItemContentChange,
      onStartDocumentEdit: startDocumentEdit,
      onEndDocumentEdit: endDocumentEdit,
    }),
    [
      endDocumentEdit,
      handleResizeEnd,
      onItemContentChange,
      startDocumentEdit,
      updateNodeSize,
    ],
  );

  useEffect(() => {
    setNodes((currentNodes) =>
      syncNodesFromItems(
        currentNodes,
        items,
        skillNames,
        activeItemId,
        nodeHandlers,
        skillNodeTypes,
      ),
    );
  }, [activeItemId, items, nodeHandlers, setNodes, skillNames, skillNodeTypes]);

  useEffect(() => {
    setEdges(edgesToFlow(initialEdges, activeItemId));
  }, [activeItemId, initialEdges, setEdges]);

  useEffect(() => {
    if (items.length === 0 || hasAutoFitRef.current) {
      return;
    }

    hasAutoFitRef.current = true;
    requestAnimationFrame(() => {
      fitView({ padding: 0.3, duration: 200 });
    });
  }, [fitView, items.length]);

  const persistProjectSettings = useCallback(
    (overrides: { bgColor?: string; showDots?: boolean }) => {
      void updateProjectViewportAction(projectId, overrides);
    },
    [projectId],
  );

  const handleInit = useCallback(() => {
    requestAnimationFrame(() => setViewport(initialViewport));
  }, [initialViewport, setViewport]);

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      onNodesChange(changes);

      for (const change of changes) {
        if (change.type === "remove") {
          onItemDelete(change.id);
        }
      }
    },
    [onItemDelete, onNodesChange],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);

      for (const change of changes) {
        if (change.type === "remove") {
          onEdgeRemove(change.id);
          void deleteCanvasEdgeAction(change.id);
        }
      }
    },
    [onEdgeRemove, onEdgesChange],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return;
      }

      void (async () => {
        try {
          const row = await createCanvasEdgeAction(
            projectId,
            connection.source,
            connection.target,
          );

          setEdges((current) =>
            addEdge(
              {
                ...connection,
                id: row.id,
                sourceHandle: "source",
                targetHandle: "target",
                className: edgesToFlow([row], activeItemId)[0]?.className,
              },
              current,
            ),
          );
          onEdgeAdd(row);
        } catch {
          // duplicate or invalid connection
        }
      })();
    },
    [activeItemId, onEdgeAdd, projectId, setEdges],
  );

  const handleNodeDragStop = useCallback(
    (_event: unknown, node: Node) => {
      const width = nodeDimension(node, "width") ?? 400;
      const height = nodeDimension(node, "height") ?? NODE_DEFAULT_HEIGHT;

      persistItemLayout(node.id, node.position.x, node.position.y, width, height);
    },
    [persistItemLayout],
  );

  const handleMoveEnd = useCallback(() => {
    persistViewport(getViewport());
  }, [getViewport, persistViewport]);

  const handleSetZoom = useCallback(
    (zoom: number) => {
      const viewport = getViewport();
      const next = { ...viewport, zoom };
      setViewport(next);
      persistViewport(next);
    },
    [getViewport, persistViewport, setViewport],
  );

  const handleBgColorChange = useCallback(
    (color: string) => {
      setBgColor(color);
      persistProjectSettings({ bgColor: color });
    },
    [persistProjectSettings],
  );

  const handleShowDotsChange = useCallback(
    (value: boolean) => {
      setShowDots(value);
      persistProjectSettings({ showDots: value });
    },
    [persistProjectSettings],
  );

  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 180 });
    requestAnimationFrame(() => persistViewport(getViewport()));
  }, [getViewport, persistViewport, zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 180 });
    requestAnimationFrame(() => persistViewport(getViewport()));
  }, [getViewport, persistViewport, zoomOut]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.3, duration: 200 });
    requestAnimationFrame(() => persistViewport(getViewport()));
  }, [fitView, getViewport, persistViewport]);

  return {
    nodes,
    edges,
    bgColor,
    showDots,
    showMinimap,
    setShowMinimap,
    isCanvasEmpty: items.length === 0,
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
  };
}
