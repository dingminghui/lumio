import { relations, sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { DEFAULT_FLOW_SNAPSHOT, type FlowSnapshot } from "@/utils/flow-snapshot";
import { SESSION_MESSAGE_ROLES } from "@/utils/session-message";

const defaultFlowSnapshotJson = JSON.stringify(DEFAULT_FLOW_SNAPSHOT).replaceAll(
  "'",
  "''",
);

export const sessionMessageRole = pgEnum(
  "session_message_role",
  SESSION_MESSAGE_ROLES,
);

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().default("Untitled"),
  flowSnapshot: jsonb("flow_snapshot")
    .$type<FlowSnapshot>()
    .notNull()
    .default(sql.raw(`'${defaultFlowSnapshotJson}'::jsonb`)),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projectSessions = pgTable(
  "project_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("默认会话"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("project_sessions_project_id_idx").on(table.projectId)],
);

export const sessionMessages = pgTable(
  "session_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => projectSessions.id, { onDelete: "cascade" }),
    role: sessionMessageRole("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("session_messages_session_id_idx").on(table.sessionId)],
);

export const projectsRelations = relations(projects, ({ many }) => ({
  sessions: many(projectSessions),
}));

export const projectSessionsRelations = relations(projectSessions, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectSessions.projectId],
    references: [projects.id],
  }),
  messages: many(sessionMessages),
}));

export const sessionMessagesRelations = relations(sessionMessages, ({ one }) => ({
  session: one(projectSessions, {
    fields: [sessionMessages.sessionId],
    references: [projectSessions.id],
  }),
}));
