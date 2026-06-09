import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { Viewport } from "@xyflow/react";

import { db } from "@/db";
import { canvasEdges, canvasItems, itemMessages, projects } from "@/db/schema";
import type { CanvasEdgeRow, CanvasItemRow } from "@/types/skill";
import { DEFAULT_BOARD_NAME } from "@/utils/flow-snapshot";
import type { StoredMessageRole, StoredTextMessage } from "@/utils/session-message";

export type ProjectListItem = {
  id: string;
  name: string;
  updatedAt: Date;
};

export type ProjectDetailProject = {
  id: string;
  name: string;
  viewport: Viewport;
  bgColor: string;
  showDots: boolean;
};

export type CanvasItemWithMessages = CanvasItemRow & {
  messages: StoredTextMessage[];
};

function mapCanvasEdge(row: {
  id: string;
  projectId: string;
  sourceItemId: string;
  targetItemId: string;
  createdAt: Date;
}): CanvasEdgeRow {
  return {
    id: row.id,
    projectId: row.projectId,
    sourceItemId: row.sourceItemId,
    targetItemId: row.targetItemId,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapCanvasItem(row: {
  id: string;
  projectId: string;
  skillId: string;
  state: Record<string, unknown> | null;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  createdAt: Date;
  updatedAt: Date;
}): CanvasItemRow {
  return {
    id: row.id,
    projectId: row.projectId,
    skillId: row.skillId,
    state: row.state ?? {},
    positionX: row.positionX,
    positionY: row.positionY,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createProject({ name }: { name?: string } = {}) {
  const [project] = await db
    .insert(projects)
    .values({ name: name ?? DEFAULT_BOARD_NAME })
    .returning({ id: projects.id });

  return project;
}

export async function listProjects(): Promise<ProjectListItem[]> {
  return db
    .select({
      id: projects.id,
      name: projects.name,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .orderBy(desc(projects.updatedAt));
}

export async function getProjectDetail(projectId: string) {
  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      viewport: projects.viewport,
      bgColor: projects.bgColor,
      showDots: projects.showDots,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    return null;
  }

  const itemRows = await db
    .select()
    .from(canvasItems)
    .where(eq(canvasItems.projectId, projectId))
    .orderBy(asc(canvasItems.createdAt));

  const itemIds = itemRows.map((row) => row.id);
  const messageRows = itemIds.length
    ? await db
        .select({
          id: itemMessages.id,
          itemId: itemMessages.itemId,
          role: itemMessages.role,
          content: itemMessages.content,
          createdAt: itemMessages.createdAt,
        })
        .from(itemMessages)
        .where(inArray(itemMessages.itemId, itemIds))
        .orderBy(asc(itemMessages.createdAt))
    : [];

  const messagesByItem = new Map<string, StoredTextMessage[]>();

  for (const message of messageRows) {
    const list = messagesByItem.get(message.itemId) ?? [];
    list.push({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    });
    messagesByItem.set(message.itemId, list);
  }

  const edgeRows = await db
    .select()
    .from(canvasEdges)
    .where(eq(canvasEdges.projectId, projectId));

  return {
    project: {
      id: project.id,
      name: project.name,
      viewport: project.viewport ?? { x: 0, y: 0, zoom: 1 },
      bgColor: project.bgColor,
      showDots: project.showDots,
    },
    items: itemRows.map((row) => ({
      ...mapCanvasItem(row),
      messages: messagesByItem.get(row.id) ?? [],
    })),
    edges: edgeRows.map(mapCanvasEdge),
  };
}

export async function createCanvasEdge({
  projectId,
  sourceItemId,
  targetItemId,
}: {
  projectId: string;
  sourceItemId: string;
  targetItemId: string;
}) {
  if (sourceItemId === targetItemId) {
    throw new Error("Cannot connect a node to itself");
  }

  const [source] = await db
    .select({ id: canvasItems.id })
    .from(canvasItems)
    .where(and(eq(canvasItems.id, sourceItemId), eq(canvasItems.projectId, projectId)))
    .limit(1);

  const [target] = await db
    .select({ id: canvasItems.id })
    .from(canvasItems)
    .where(and(eq(canvasItems.id, targetItemId), eq(canvasItems.projectId, projectId)))
    .limit(1);

  if (!source || !target) {
    throw new Error("Invalid connection endpoints");
  }

  const [existing] = await db
    .select({ id: canvasEdges.id })
    .from(canvasEdges)
    .where(
      and(
        eq(canvasEdges.projectId, projectId),
        eq(canvasEdges.sourceItemId, sourceItemId),
        eq(canvasEdges.targetItemId, targetItemId),
      ),
    )
    .limit(1);

  if (existing) {
    throw new Error("Connection already exists");
  }

  const [edge] = await db
    .insert(canvasEdges)
    .values({ projectId, sourceItemId, targetItemId })
    .returning();

  await db
    .update(projects)
    .set({ updatedAt: sql`now()` })
    .where(eq(projects.id, projectId));

  return mapCanvasEdge(edge);
}

export async function deleteCanvasEdge(edgeId: string) {
  await db.delete(canvasEdges).where(eq(canvasEdges.id, edgeId));
}

export async function updateProjectViewport(
  projectId: string,
  data: { viewport?: Viewport; bgColor?: string; showDots?: boolean; name?: string },
) {
  await db
    .update(projects)
    .set({
      ...(data.viewport !== undefined ? { viewport: data.viewport } : {}),
      ...(data.bgColor !== undefined ? { bgColor: data.bgColor } : {}),
      ...(data.showDots !== undefined ? { showDots: data.showDots } : {}),
      ...(data.name !== undefined ? { name: data.name } : {}),
      updatedAt: sql`now()`,
    })
    .where(eq(projects.id, projectId));
}

export async function createCanvasItem({
  projectId,
  skillId,
  positionX = 0,
  positionY = 0,
  width = 400,
  height = 120,
  state = {},
}: {
  projectId: string;
  skillId: string;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  state?: Record<string, unknown>;
}) {
  const [item] = await db
    .insert(canvasItems)
    .values({
      projectId,
      skillId,
      state,
      positionX,
      positionY,
      width,
      height,
    })
    .returning();

  await db
    .update(projects)
    .set({ updatedAt: sql`now()` })
    .where(eq(projects.id, projectId));

  return mapCanvasItem(item);
}

export async function getCanvasItem(itemId: string) {
  const [item] = await db
    .select()
    .from(canvasItems)
    .where(eq(canvasItems.id, itemId))
    .limit(1);

  return item ? mapCanvasItem(item) : null;
}

export async function updateCanvasItemState(
  itemId: string,
  state: Record<string, unknown>,
) {
  const [updatedItem] = await db
    .update(canvasItems)
    .set({ state, updatedAt: sql`now()` })
    .where(eq(canvasItems.id, itemId))
    .returning({ projectId: canvasItems.projectId });

  if (!updatedItem) {
    throw new Error("Canvas item not found");
  }

  await db
    .update(projects)
    .set({ updatedAt: sql`now()` })
    .where(eq(projects.id, updatedItem.projectId));
}

export async function updateCanvasItemPosition(
  itemId: string,
  positionX: number,
  positionY: number,
  width: number,
  height: number,
) {
  const [updatedItem] = await db
    .update(canvasItems)
    .set({ positionX, positionY, width, height, updatedAt: sql`now()` })
    .where(eq(canvasItems.id, itemId))
    .returning({ projectId: canvasItems.projectId });

  if (!updatedItem) {
    throw new Error("Canvas item not found");
  }

  await db
    .update(projects)
    .set({ updatedAt: sql`now()` })
    .where(eq(projects.id, updatedItem.projectId));
}

export async function deleteCanvasItem(itemId: string) {
  const [deletedItem] = await db
    .delete(canvasItems)
    .where(eq(canvasItems.id, itemId))
    .returning({ projectId: canvasItems.projectId });

  if (!deletedItem) {
    throw new Error("Canvas item not found");
  }

  await db
    .update(projects)
    .set({ updatedAt: sql`now()` })
    .where(eq(projects.id, deletedItem.projectId));
}

export async function listCanvasItems(projectId: string) {
  const items = await db
    .select()
    .from(canvasItems)
    .where(eq(canvasItems.projectId, projectId))
    .orderBy(asc(canvasItems.createdAt));

  return items.map(mapCanvasItem);
}

export async function listItemMessages(itemId: string) {
  const messages = await db
    .select({
      id: itemMessages.id,
      role: itemMessages.role,
      content: itemMessages.content,
      createdAt: itemMessages.createdAt,
    })
    .from(itemMessages)
    .where(eq(itemMessages.itemId, itemId))
    .orderBy(asc(itemMessages.createdAt));

  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function createItemMessage({
  itemId,
  projectId,
  role,
  content,
}: {
  itemId: string;
  projectId?: string;
  role: StoredMessageRole;
  content: string;
}) {
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    throw new Error("Message content is required");
  }

  const resolvedProjectId = projectId ?? (await getCanvasItem(itemId))?.projectId;

  if (!resolvedProjectId) {
    throw new Error("Canvas item not found");
  }

  const [message] = await db
    .insert(itemMessages)
    .values({ itemId, role, content: trimmedContent })
    .returning({
      id: itemMessages.id,
      role: itemMessages.role,
      content: itemMessages.content,
      createdAt: itemMessages.createdAt,
    });

  await db
    .update(canvasItems)
    .set({ updatedAt: sql`now()` })
    .where(eq(canvasItems.id, itemId));

  await db
    .update(projects)
    .set({ updatedAt: sql`now()` })
    .where(eq(projects.id, resolvedProjectId));

  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function replaceItemMessages({
  itemId,
  projectId,
  messages,
}: {
  itemId: string;
  projectId?: string;
  messages: StoredTextMessage[];
}) {
  const persistedMessages = messages
    .map((m) => ({ ...m, content: m.content.trim() }))
    .filter((m) => m.content.length > 0);

  const resolvedProjectId = projectId ?? (await getCanvasItem(itemId))?.projectId;

  if (!resolvedProjectId) {
    throw new Error("Canvas item not found");
  }

  return db.transaction(async (tx) => {
    await tx.delete(itemMessages).where(eq(itemMessages.itemId, itemId));

    if (!persistedMessages.length) {
      return [];
    }

    const inserted = await tx
      .insert(itemMessages)
      .values(
        persistedMessages.map((m) => ({
          itemId,
          role: m.role,
          content: m.content,
          createdAt: new Date(m.createdAt),
        })),
      )
      .returning({
        id: itemMessages.id,
        role: itemMessages.role,
        content: itemMessages.content,
        createdAt: itemMessages.createdAt,
      });

    await tx
      .update(canvasItems)
      .set({ updatedAt: sql`now()` })
      .where(eq(canvasItems.id, itemId));

    await tx
      .update(projects)
      .set({ updatedAt: sql`now()` })
      .where(eq(projects.id, resolvedProjectId));

    return inserted.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    }));
  });
}
