import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { Viewport } from "@xyflow/react";

import { DEFAULT_BG_COLOR, DEFAULT_SHOW_DOTS } from "@/utils/flow-snapshot";
import { SESSION_MESSAGE_ROLES } from "@/utils/session-message";

const defaultViewportJson = JSON.stringify({ x: 0, y: 0, zoom: 1 }).replaceAll(
  "'",
  "''",
);

export const messageRole = pgEnum("message_role", SESSION_MESSAGE_ROLES);
export const modelProvider = pgEnum("model_provider", ["deepseek"]);

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().default("Untitled"),
  viewport: jsonb("viewport")
    .$type<Viewport>()
    .notNull()
    .default(sql.raw(`'${defaultViewportJson}'::jsonb`)),
  bgColor: text("bg_color").notNull().default(DEFAULT_BG_COLOR),
  showDots: boolean("show_dots").notNull().default(DEFAULT_SHOW_DOTS),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const canvasItems = pgTable(
  "canvas_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    skillId: text("skill_id").notNull(),
    state: jsonb("state").$type<Record<string, unknown>>().notNull().default({}),
    positionX: real("position_x").notNull().default(0),
    positionY: real("position_y").notNull().default(0),
    width: real("width").notNull().default(400),
    height: real("height").notNull().default(120),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("canvas_items_project_id_idx").on(table.projectId)],
);

export const canvasEdges = pgTable(
  "canvas_edges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    sourceItemId: uuid("source_item_id")
      .notNull()
      .references(() => canvasItems.id, { onDelete: "cascade" }),
    targetItemId: uuid("target_item_id")
      .notNull()
      .references(() => canvasItems.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("canvas_edges_project_id_idx").on(table.projectId),
    index("canvas_edges_source_item_id_idx").on(table.sourceItemId),
    index("canvas_edges_target_item_id_idx").on(table.targetItemId),
  ],
);

export const itemMessages = pgTable(
  "item_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => canvasItems.id, { onDelete: "cascade" }),
    role: messageRole("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("item_messages_item_id_idx").on(table.itemId)],
);

export const userProfile = pgTable("user_profile", {
  id: text("id").primaryKey().default("default"),
  name: text("name").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const modelConfigs = pgTable("model_configs", {
  provider: modelProvider("provider").primaryKey(),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  validatedAt: timestamp("validated_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const imageModelConfigs = pgTable("image_model_configs", {
  id: text("id").primaryKey().default("cloudflare-workers-ai"),
  accountId: text("account_id").notNull(),
  apiTokenEncrypted: text("api_token_encrypted").notNull(),
  model: text("model").notNull(),
  validatedAt: timestamp("validated_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projectsRelations = relations(projects, ({ many }) => ({
  items: many(canvasItems),
  edges: many(canvasEdges),
}));

export const canvasItemsRelations = relations(canvasItems, ({ one, many }) => ({
  project: one(projects, {
    fields: [canvasItems.projectId],
    references: [projects.id],
  }),
  messages: many(itemMessages),
}));

export const canvasEdgesRelations = relations(canvasEdges, ({ one }) => ({
  project: one(projects, {
    fields: [canvasEdges.projectId],
    references: [projects.id],
  }),
}));

export const itemMessagesRelations = relations(itemMessages, ({ one }) => ({
  item: one(canvasItems, {
    fields: [itemMessages.itemId],
    references: [canvasItems.id],
  }),
}));
