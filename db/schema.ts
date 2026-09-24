import { sql } from "drizzle-orm";
import {
  check,
  index,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    genre: text("genre").notNull().default(""),
    logline: text("logline").notNull().default(""),
    description: text("description").notNull().default(""),
    status: text("status").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    check(
      "projects_status_check",
      sql`${table.status} in ('warming','forming','writing','revising','paused','completed','archived')`,
    ),
    index("idx_projects_updated_at").on(table.updatedAt),
  ],
);

export const items = sqliteTable(
  "items",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    type: text("type").notNull(),
    subtype: text("subtype"),
    title: text("title").notNull().default(""),
    body: text("body").notNull().default(""),
    status: text("status").notNull(),
    metadata: text("metadata").notNull().default("{}"),
    searchText: text("search_text").notNull().default(""),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    check("items_type_check", sql`${table.type} in ('inspiration','character','world')`),
    check(
      "items_status_check",
      sql`${table.status} in ('inbox','seed','growing','ready','archived')`,
    ),
    index("idx_items_project_id").on(table.projectId),
    index("idx_items_type_status").on(table.type, table.status),
    index("idx_items_updated_at").on(table.updatedAt),
  ],
);

export const itemTags = sqliteTable(
  "item_tags",
  {
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.itemId, table.tag] }),
    index("idx_item_tags_tag").on(table.tag),
  ],
);

export const relations = sqliteTable(
  "relations",
  {
    id: text("id").primaryKey(),
    sourceItemId: text("source_item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    targetItemId: text("target_item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    relationType: text("relation_type").notNull(),
    note: text("note").notNull().default(""),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    check(
      "relations_type_check",
      sql`${table.relationType} in ('related','appears_in','influences','conflicts_with','belongs_to','generated_by')`,
    ),
    check("relations_not_self", sql`${table.sourceItemId} <> ${table.targetItemId}`),
    uniqueIndex("uq_relations_edge_type").on(
      table.sourceItemId,
      table.targetItemId,
      table.relationType,
    ),
    index("idx_relations_source_item_id").on(table.sourceItemId),
    index("idx_relations_target_item_id").on(table.targetItemId),
  ],
);

export const appMeta = sqliteTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type ProjectRow = typeof projects.$inferSelect;
export type ItemRow = typeof items.$inferSelect;
export type RelationRow = typeof relations.$inferSelect;
