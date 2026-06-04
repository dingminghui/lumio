"use server";

import {
  createCanvasEdge,
  createCanvasItem,
  deleteCanvasEdge,
  deleteCanvasItem,
  replaceItemMessages,
  updateCanvasItemPosition,
  updateCanvasItemState,
  updateProjectViewport,
} from "@/db/queries";
import { bootstrapSkillRegistry, getSkillRegistry } from "@/lib/skills/bootstrap";
import type { StoredTextMessage } from "@/utils/session-message";
import type { Viewport } from "@xyflow/react";

export async function createCanvasItemAction(
  projectId: string,
  skillId: string,
  position?: { x: number; y: number; width?: number; height?: number },
) {
  bootstrapSkillRegistry();
  const registry = getSkillRegistry();
  const manifest = registry.get(skillId) ?? registry.getBuiltinFallback();

  return createCanvasItem({
    projectId,
    skillId: manifest.id,
    positionX: position?.x ?? 100,
    positionY: position?.y ?? 100,
    width: position?.width ?? manifest.canvas.defaultSize?.w ?? 400,
    height: position?.height ?? manifest.canvas.defaultSize?.h ?? 120,
    state: structuredClone(manifest.initialState),
  });
}

export async function deleteCanvasItemAction(itemId: string) {
  await deleteCanvasItem(itemId);
}

export async function updateCanvasItemStateAction(
  itemId: string,
  state: Record<string, unknown>,
) {
  await updateCanvasItemState(itemId, state);
}

export async function updateCanvasItemPositionAction(
  itemId: string,
  positionX: number,
  positionY: number,
  width: number,
  height: number,
) {
  await updateCanvasItemPosition(itemId, positionX, positionY, width, height);
}

export async function updateProjectViewportAction(
  projectId: string,
  data: {
    viewport?: Viewport;
    bgColor?: string;
    showDots?: boolean;
    name?: string;
  },
) {
  await updateProjectViewport(projectId, data);
}

export async function syncItemMessagesAction(
  itemId: string,
  messages: StoredTextMessage[],
) {
  return replaceItemMessages({ itemId, messages });
}

export async function createCanvasEdgeAction(
  projectId: string,
  sourceItemId: string,
  targetItemId: string,
) {
  return createCanvasEdge({ projectId, sourceItemId, targetItemId });
}

export async function deleteCanvasEdgeAction(edgeId: string) {
  await deleteCanvasEdge(edgeId);
}
