import type { Edge, Node } from "@xyflow/react";

import type { CanvasItemWithMessages } from "@/db/queries";
import { isDocumentSkill } from "@/lib/canvas/node-content";
import { NODE_DEFAULT_HEIGHT } from "@/lib/canvas/node-layout";
import type { CanvasEdgeRow } from "@/types/skill";

export type NodeInteractionHandlers = {
  onResize: (itemId: string, width: number, height: number) => void;
  onResizeEnd: (itemId: string, width: number, height: number) => void;
  onContentChange: (itemId: string, content: string) => void;
  onStartDocumentEdit: (itemId: string) => void;
};

export const NOOP_NODE_HANDLERS: NodeInteractionHandlers = {
  onResize: () => {},
  onResizeEnd: () => {},
  onContentChange: () => {},
  onStartDocumentEdit: () => {},
};

export function edgesToFlow(edges: CanvasEdgeRow[]): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.sourceItemId,
    target: edge.targetItemId,
    sourceHandle: "source",
    targetHandle: "target",
  }));
}

export function nodeDimension(
  node: Node,
  axis: "width" | "height",
): number | undefined {
  const value = node[axis];

  if (typeof value === "number") {
    return value;
  }

  const styleValue = node.style?.[axis];

  return typeof styleValue === "number" ? styleValue : undefined;
}

export function mergeNodeLayout(
  node: Node,
  layout: {
    position: Node["position"];
    width?: number;
    height?: number;
  },
): Node {
  const width = layout.width ?? node.width;
  const height = layout.height ?? node.height;
  const hasWidth = typeof width === "number";
  const hasHeight = typeof height === "number";

  if (!hasWidth && !hasHeight) {
    return { ...node, position: layout.position };
  }

  return {
    ...node,
    position: layout.position,
    ...(hasWidth ? { width } : {}),
    ...(hasHeight ? { height } : {}),
    style: {
      ...node.style,
      ...(hasWidth ? { width } : {}),
      ...(hasHeight ? { height } : {}),
    },
  };
}

export function itemsToNodes(
  items: CanvasItemWithMessages[],
  skillNames: Record<string, string>,
  activeItemId: string | null,
  handlers: NodeInteractionHandlers,
  skillNodeTypes: Record<string, string> = {},
): Node[] {
  return items.map((item) => {
    const height = item.height ?? NODE_DEFAULT_HEIGHT;

    return {
      id: item.id,
      type: skillNodeTypes[item.skillId] ?? "text",
      position: { x: item.positionX, y: item.positionY },
      width: item.width,
      height,
      style: { width: item.width, height },
      selected: item.id === activeItemId,
      data: {
        skillId: item.skillId,
        skillName: skillNames[item.skillId] ?? item.skillId,
        state: item.state,
        onResize: (width: number, nodeHeight: number) => {
          handlers.onResize(item.id, width, nodeHeight);
        },
        onResizeEnd: (width: number, nodeHeight: number) => {
          handlers.onResizeEnd(item.id, width, nodeHeight);
        },
        onContentChange: isDocumentSkill(item.skillId)
          ? (content: string) => {
              handlers.onContentChange(item.id, content);
            }
          : undefined,
        onStartDocumentEdit: isDocumentSkill(item.skillId)
          ? () => {
              handlers.onStartDocumentEdit(item.id);
            }
          : undefined,
      },
    };
  });
}

export function syncNodesFromItems(
  currentNodes: Node[],
  items: CanvasItemWithMessages[],
  skillNames: Record<string, string>,
  activeItemId: string | null,
  handlers: NodeInteractionHandlers,
  skillNodeTypes: Record<string, string> = {},
): Node[] {
  const layoutById = new Map(
    currentNodes.map((node) => [
      node.id,
      {
        position: node.position,
        width: nodeDimension(node, "width"),
        height: nodeDimension(node, "height"),
      },
    ]),
  );

  return itemsToNodes(items, skillNames, activeItemId, handlers, skillNodeTypes).map(
    (node) => {
      const layout = layoutById.get(node.id);

      return layout ? mergeNodeLayout(node, layout) : node;
    },
  );
}
