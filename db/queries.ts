import { asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { projectSessions, projects, sessionMessages } from "@/db/schema";
import {
  applyStatePatchToProjectState,
  normalizeProjectStateForSkill,
} from "@/lib/skills/project-state";
import type { AnySkillDefinition, ProjectState, StatePatch } from "@/types/skill";
import {
  DEFAULT_BOARD_NAME,
  DEFAULT_FLOW_SNAPSHOT,
  type FlowSnapshot,
  normalizeFlowSnapshot,
} from "@/utils/flow-snapshot";
import type { StoredMessageRole, StoredTextMessage } from "@/utils/session-message";

export type ProjectListItem = {
  id: string;
  name: string;
  updatedAt: Date;
  sessionCount: number;
};

export type SessionMessageItem = StoredTextMessage;

export type ProjectSessionItem = {
  id: string;
  title: string;
  messages: SessionMessageItem[];
};

export async function getProjectStateForSkill(
  projectId: string,
  skill: AnySkillDefinition,
): Promise<ProjectState> {
  const [project] = await db
    .select({
      projectState: projects.projectState,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    throw new Error("Project not found");
  }

  return normalizeProjectStateForSkill(project.projectState, skill);
}

export async function applyProjectStatePatch({
  projectId,
  skill,
  patch,
  lastUserMessage,
}: {
  projectId: string;
  skill: AnySkillDefinition;
  patch: StatePatch;
  lastUserMessage: string;
}) {
  return db.transaction(async (tx) => {
    const [project] = await tx
      .select({
        projectState: projects.projectState,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      throw new Error("Project not found");
    }

    const currentProjectState = normalizeProjectStateForSkill(
      project.projectState,
      skill,
    );
    const patchedProjectState = applyStatePatchToProjectState(
      currentProjectState,
      patch,
      {
        lastUserMessage,
        lastStage: skill.deriveStage(currentProjectState.state).id,
      },
    );

    const nextProjectState = {
      ...patchedProjectState,
      metadata: {
        ...patchedProjectState.metadata,
        lastStage: skill.deriveStage(patchedProjectState.state).id,
      },
    };

    await tx
      .update(projects)
      .set({
        skillId: skill.id,
        projectState: nextProjectState,
        updatedAt: sql`now()`,
      })
      .where(eq(projects.id, projectId));

    return nextProjectState;
  });
}

export async function createProjectWithDefaultSession() {
  return db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        name: DEFAULT_BOARD_NAME,
        flowSnapshot: DEFAULT_FLOW_SNAPSHOT,
      })
      .returning({ id: projects.id });

    await tx.insert(projectSessions).values({
      projectId: project.id,
      title: "默认会话",
    });

    return project;
  });
}

export async function listProjects(): Promise<ProjectListItem[]> {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      updatedAt: projects.updatedAt,
      sessionCount: sql<number>`count(${projectSessions.id})::int`,
    })
    .from(projects)
    .leftJoin(projectSessions, eq(projectSessions.projectId, projects.id))
    .groupBy(projects.id)
    .orderBy(desc(projects.updatedAt));

  return rows;
}

export async function getProjectDetail(projectId: string) {
  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      skillId: projects.skillId,
      projectState: projects.projectState,
      flowSnapshot: projects.flowSnapshot,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    return null;
  }

  const sessions = await db
    .select({
      id: projectSessions.id,
      title: projectSessions.title,
    })
    .from(projectSessions)
    .where(eq(projectSessions.projectId, project.id))
    .orderBy(asc(projectSessions.createdAt));

  const messages = sessions.length
    ? await db
        .select({
          id: sessionMessages.id,
          sessionId: sessionMessages.sessionId,
          role: sessionMessages.role,
          content: sessionMessages.content,
          createdAt: sessionMessages.createdAt,
        })
        .from(sessionMessages)
        .where(
          inArray(
            sessionMessages.sessionId,
            sessions.map((session) => session.id),
          ),
        )
        .orderBy(asc(sessionMessages.createdAt))
    : [];

  const messagesBySession = new Map<string, SessionMessageItem[]>();

  for (const message of messages) {
    const sessionMessages = messagesBySession.get(message.sessionId) ?? [];
    sessionMessages.push({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    });
    messagesBySession.set(message.sessionId, sessionMessages);
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      skillId: project.skillId,
      projectState: project.projectState,
      flowSnapshot: normalizeFlowSnapshot(project.flowSnapshot),
    },
    sessions: sessions.map((session) => ({
      ...session,
      messages: messagesBySession.get(session.id) ?? [],
    })),
  };
}

export async function createProjectSession(projectId: string) {
  return db.transaction(async (tx) => {
    const [project] = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      throw new Error("Project not found");
    }

    const [{ count }] = await tx
      .select({
        count: sql<number>`count(${projectSessions.id})::int`,
      })
      .from(projectSessions)
      .where(eq(projectSessions.projectId, projectId));

    const [session] = await tx
      .insert(projectSessions)
      .values({
        projectId,
        title: `会话 ${count + 1}`,
      })
      .returning({
        id: projectSessions.id,
        title: projectSessions.title,
      });

    await tx
      .update(projects)
      .set({ updatedAt: sql`now()` })
      .where(eq(projects.id, projectId));

    return {
      ...session,
      messages: [],
    };
  });
}

export async function updateProjectFlow(projectId: string, flowSnapshot: FlowSnapshot) {
  await db
    .update(projects)
    .set({
      flowSnapshot,
      updatedAt: sql`now()`,
    })
    .where(eq(projects.id, projectId));
}

type CreateSessionMessageInput = {
  sessionId: string;
  role: StoredMessageRole;
  content: string;
  projectId?: string;
};

export async function createSessionMessage({
  sessionId,
  role,
  content,
  projectId,
}: CreateSessionMessageInput) {
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    throw new Error("Message content is required");
  }

  return db.transaction(async (tx) => {
    const [session] = await tx
      .select({
        projectId: projectSessions.projectId,
      })
      .from(projectSessions)
      .where(eq(projectSessions.id, sessionId))
      .limit(1);

    if (!session) {
      throw new Error("Session not found");
    }

    if (projectId && session.projectId !== projectId) {
      throw new Error("Session not found");
    }

    const [message] = await tx
      .insert(sessionMessages)
      .values({
        sessionId,
        role,
        content: trimmedContent,
      })
      .returning({
        id: sessionMessages.id,
        role: sessionMessages.role,
        content: sessionMessages.content,
        createdAt: sessionMessages.createdAt,
      });

    await tx
      .update(projectSessions)
      .set({ updatedAt: sql`now()` })
      .where(eq(projectSessions.id, sessionId));

    await tx
      .update(projects)
      .set({ updatedAt: sql`now()` })
      .where(eq(projects.id, session.projectId));

    return {
      ...message,
      createdAt: message.createdAt.toISOString(),
    };
  });
}
