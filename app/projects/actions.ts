"use server";

import { revalidatePath } from "next/cache";

import {
  createCanvasEdge,
  createCanvasItem,
  deleteCanvasEdge,
  deleteCanvasItem,
  deleteProject,
  replaceItemMessages,
  updateCanvasItemPosition,
  updateCanvasItemState,
  updateProjectViewport,
} from "@/db/queries";
import { getSkillRegistry } from "@/lib/skills/register-builtins";
import type { StoredTextMessage } from "@/utils/session-message";
import type { Viewport } from "@xyflow/react";

export async function createCanvasItemAction(
  projectId: string,
  skillId: string,
  position?: { x: number; y: number; width?: number; height?: number },
) {
  const registry = getSkillRegistry();
  const manifest = registry.get(skillId) ?? registry.require(skillId);
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

export async function deleteProjectAction(projectId: string) {
  await deleteProject(projectId);
  revalidatePath("/projects");
}
