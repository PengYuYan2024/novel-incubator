// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Miniflare } from "miniflare";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ getD1Binding: vi.fn() }));

import { D1NovelRepository, type SeedBundle } from "@/lib/server/repository";

const migrationStatements = readFileSync(
  resolve(process.cwd(), "drizzle/0000_flat_blue_blade.sql"),
  "utf8",
).split("--> statement-breakpoint").map((statement) => statement.trim()).filter(Boolean);

let miniflare: Miniflare;
let database: D1Database;

beforeEach(async () => {
  miniflare = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok'); } }",
    compatibilityDate: "2026-05-15",
    d1Databases: ["DB"],
  });
  database = await miniflare.getD1Database("DB") as unknown as D1Database;
  await database.batch(migrationStatements.map((statement) => database.prepare(statement)));
});

afterEach(async () => {
  await miniflare.dispose();
});

async function insertProject(id = "project-1") {
  await database.prepare(
    "INSERT INTO projects (id,title,genre,logline,description,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
  ).bind(
    id,
    "长期小说",
    "待确定",
    "",
    "",
    "warming",
    "2026-09-01T00:00:00.000Z",
    "2026-09-01T00:00:00.000Z",
  ).run();
}

async function insertItems(count: number) {
  const rows = Array.from({ length: count }, (_, index) => ({
    id: `item-${String(index).padStart(5, "0")}`,
    title: `资料 ${index}`,
    tag: `标签 ${index}`,
  }));
  await database.prepare(
    `INSERT INTO items (id,project_id,type,subtype,title,body,status,metadata,search_text,created_at,updated_at)
     SELECT json_extract(value,'$.id'),'project-1','inspiration','idea',json_extract(value,'$.title'),'正文','seed','{}',json_extract(value,'$.title'),'2026-09-01T00:00:00.000Z','2026-09-01T00:00:00.000Z'
     FROM json_each(?)`,
  ).bind(JSON.stringify(rows)).run();
  await database.prepare(
    `INSERT INTO item_tags (item_id,tag)
     SELECT json_extract(value,'$.id'),json_extract(value,'$.tag') FROM json_each(?)`,
  ).bind(JSON.stringify(rows)).run();
}

function seedBundle(): SeedBundle {
  return {
    project: {
      id: "seed-project",
      title: "示例项目",
      genre: "待确定",
      logline: "",
      description: "",
      status: "warming",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
    items: [{
      id: "seed-item",
      projectId: "seed-project",
      type: "inspiration",
      subtype: "idea",
      title: "示例灵感",
      body: "正文",
      status: "inbox",
      tags: ["示例"],
      metadata: {},
      searchText: "示例灵感 正文",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    }],
    relations: [],
  };
}

function observeD1BatchLimit(source: D1Database) {
  const batchSizes: number[] = [];
  const observed = new Proxy(source as object, {
    get(target, property, receiver) {
      if (property === "batch") {
        return async (statements: D1PreparedStatement[]) => {
          batchSizes.push(statements.length);
          if (statements.length > 50) {
            throw new Error(`D1 batch query limit exceeded: ${statements.length}`);
          }
          return source.batch(statements);
        };
      }
      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(source) : value;
    },
  }) as D1Database;
  return { observed, batchSizes };
}

describe("D1NovelRepository", () => {
  it("does not inject example records into a database that already has user data", async () => {
    await insertProject();
    const repository = new D1NovelRepository(database);

    const created = await repository.seedIfNeeded(seedBundle());

    expect(created).toBe(false);
    expect((await repository.listProjects()).map((project) => project.id)).toEqual(["project-1"]);
  });

  it("seeds at most once when initialization requests arrive together", async () => {
    const first = new D1NovelRepository(database);
    const second = new D1NovelRepository(database);

    const results = await Promise.all([
      first.seedIfNeeded(seedBundle()),
      second.seedIfNeeded(seedBundle()),
    ]);

    expect(results.sort()).toEqual([false, true]);
    expect(await first.countProjectItems("seed-project")).toBe(1);
  });

  it("hydrates more than 100 items without exceeding D1 bind limits", async () => {
    await insertProject();
    await insertItems(101);
    const repository = new D1NovelRepository(database);

    const items = await repository.listItems({ includeArchived: true });

    expect(items).toHaveLength(101);
    expect(items[0].tags).toHaveLength(1);
    expect(items[100].tags).toHaveLength(1);
  });

  it("loads more than 100 relation counterparts without exceeding D1 bind limits", async () => {
    await insertProject();
    await insertItems(102);
    const relations = Array.from({ length: 101 }, (_, index) => ({
      id: `relation-${String(index).padStart(5, "0")}`,
      sourceItemId: "item-00000",
      targetItemId: `item-${String(index + 1).padStart(5, "0")}`,
    }));
    await database.prepare(
      `INSERT INTO relations (id,source_item_id,target_item_id,relation_type,note,created_at)
       SELECT json_extract(value,'$.id'),json_extract(value,'$.sourceItemId'),json_extract(value,'$.targetItemId'),'related','','2026-09-01T00:00:00.000Z'
       FROM json_each(?)`,
    ).bind(JSON.stringify(relations)).run();
    const repository = new D1NovelRepository(database);

    const result = await repository.listRelations("item-00000");

    expect(result).toHaveLength(101);
    expect(result.every((relation) => relation.counterpart.tags.length === 1)).toBe(true);
  });

  it("supports long Chinese search queries within D1 limits", async () => {
    await insertProject();
    await insertItems(1);
    const query = "夜行车站".repeat(20);
    await database.prepare("UPDATE items SET search_text=? WHERE id='item-00000'").bind(query).run();
    const repository = new D1NovelRepository(database);

    const result = await repository.listItems({ q: query, includeArchived: true });

    expect(result.map((item) => item.id)).toEqual(["item-00000"]);
  });

  it("exports every item when the library grows beyond 500 records", async () => {
    await insertProject();
    await insertItems(501);
    const repository = new D1NovelRepository(database);

    const snapshot = await repository.exportAll();

    expect(snapshot.projects).toHaveLength(1);
    expect(snapshot.items).toHaveLength(501);
    expect(snapshot.items.every((item) => item.tags.length === 1)).toBe(true);
  });

  it("returns complete search results when more than 500 records match", async () => {
    await insertProject();
    await insertItems(501);
    const repository = new D1NovelRepository(database);

    const items = await repository.listItems({ q: "资料", includeArchived: true });

    expect(items).toHaveLength(501);
  });

  it("restores a near-10 MB backup with hundreds of fully tagged records", async () => {
    const timestamp = "2026-09-01T00:00:00.000Z";
    const repository = new D1NovelRepository(database);
    const longBody = "x".repeat(20_000);
    const items = Array.from({ length: 200 }, (_, index) => ({
      id: `restored-item-${String(index).padStart(5, "0")}`,
      projectId: "restored-project",
      type: "inspiration" as const,
      subtype: "idea" as const,
      title: `恢复资料 ${index}`,
      body: longBody,
      status: "seed" as const,
      tags: Array.from({ length: 30 }, (__, tagIndex) => `标签-${tagIndex}`),
      metadata: {},
      searchText: `恢复资料 ${index} ${longBody}`,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    await repository.replaceAll({
      projects: [{
        id: "restored-project",
        title: "恢复项目",
        genre: "待确定",
        logline: "",
        description: "",
        status: "warming",
        createdAt: timestamp,
        updatedAt: timestamp,
      }],
      items,
      relations: [],
    });

    const snapshot = await repository.exportAll();
    const snapshotBytes = new TextEncoder().encode(JSON.stringify(snapshot)).byteLength;
    expect(snapshotBytes).toBeGreaterThan(7 * 1024 * 1024);
    expect(snapshotBytes).toBeLessThan(10 * 1024 * 1024);
    expect(snapshot.items).toHaveLength(200);
    expect(snapshot.items.every((item) => item.tags.length === 30)).toBe(true);
  });

  it("restores the supported 10000-record boundary", async () => {
    const timestamp = "2026-09-01T00:00:00.000Z";
    const repository = new D1NovelRepository(database);
    const items = Array.from({ length: 9_999 }, (_, index) => ({
      id: `boundary-item-${String(index).padStart(5, "0")}`,
      projectId: "boundary-project",
      type: "inspiration" as const,
      subtype: "idea" as const,
      title: `边界资料 ${index}`,
      body: "正文",
      status: "seed" as const,
      tags: [],
      metadata: {},
      searchText: `边界资料 ${index} 正文`,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    await repository.replaceAll({
      projects: [{
        id: "boundary-project",
        title: "边界项目",
        genre: "待确定",
        logline: "",
        description: "",
        status: "warming",
        createdAt: timestamp,
        updatedAt: timestamp,
      }],
      items,
      relations: [],
    });

    const count = await database.prepare("SELECT COUNT(*) AS count FROM items").first<{ count: number }>();
    expect(Number(count?.count)).toBe(9_999);
  });

  it("restores a fully tagged near-10 MB boundary within D1's 50-query batch limit", async () => {
    const timestamp = "2026-09-01T00:00:00.000Z";
    const { observed, batchSizes } = observeD1BatchLimit(database);
    const repository = new D1NovelRepository(observed);
    const body = "x".repeat(300);
    const tags = Array.from({ length: 30 }, (__, tagIndex) => `t${tagIndex}`);
    const items = Array.from({ length: 9_999 }, (_, index) => ({
      id: `i${index}`,
      projectId: "p",
      type: "inspiration" as const,
      subtype: "idea" as const,
      title: "",
      body,
      status: "seed" as const,
      tags,
      metadata: {},
      searchText: body,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    const snapshot = {
      projects: [{
        id: "p",
        title: "p",
        genre: "",
        logline: "",
        description: "",
        status: "warming" as const,
        createdAt: timestamp,
        updatedAt: timestamp,
      }],
      items,
      relations: [],
    };
    const backupBytes = new TextEncoder().encode(JSON.stringify({
      schemaVersion: 1,
      exportedAt: timestamp,
      ...snapshot,
    })).byteLength;

    expect(backupBytes).toBeGreaterThan(9 * 1024 * 1024);
    expect(backupBytes).toBeLessThan(10 * 1024 * 1024);
    await repository.replaceAll(snapshot);

    expect(batchSizes).toHaveLength(1);
    expect(batchSizes[0]).toBeLessThanOrEqual(50);
    const itemCount = await database.prepare("SELECT COUNT(*) AS count FROM items").first<{ count: number }>();
    const tagCount = await database.prepare("SELECT COUNT(*) AS count FROM item_tags").first<{ count: number }>();
    expect(Number(itemCount?.count)).toBe(9_999);
    expect(Number(tagCount?.count)).toBe(9_999 * 30);
  }, 120_000);

  it("rolls back the entire restore when one imported row is invalid", async () => {
    await insertProject();
    await insertItems(1);
    const repository = new D1NovelRepository(database);
    const original = await repository.exportAll();
    const duplicateProject = { ...original.projects[0], title: "冲突项目" };

    await expect(repository.replaceAll({
      projects: [original.projects[0], duplicateProject],
      items: [],
      relations: [],
    })).rejects.toThrow();

    const afterFailure = await repository.exportAll();
    expect(afterFailure.projects.map((project) => project.title)).toEqual(["长期小说"]);
    expect(afterFailure.items.map((item) => item.id)).toEqual(["item-00000"]);
  });

  it("moves a project's recent-update timestamp when content is created", async () => {
    await insertProject();
    const repository = new D1NovelRepository(database);
    await repository.insertItem({
      id: "fresh-item",
      projectId: "project-1",
      type: "inspiration",
      subtype: "idea",
      title: "新灵感",
      body: "正文",
      status: "inbox",
      tags: [],
      metadata: {},
      searchText: "新灵感 正文",
      createdAt: "2026-09-02T00:00:00.000Z",
      updatedAt: "2026-09-02T00:00:00.000Z",
    });

    expect((await repository.getProject("project-1"))?.updatedAt).toBe("2026-09-02T00:00:00.000Z");
  });

  it("updates both projects' timestamps when content moves between them", async () => {
    await insertProject();
    await insertProject("project-2");
    const repository = new D1NovelRepository(database);
    const item = {
      id: "moving-item",
      projectId: "project-1",
      type: "inspiration" as const,
      subtype: "idea" as const,
      title: "迁移中的灵感",
      body: "正文",
      status: "seed" as const,
      tags: ["迁移"],
      metadata: {},
      searchText: "迁移中的灵感 正文",
      createdAt: "2026-09-02T00:00:00.000Z",
      updatedAt: "2026-09-02T00:00:00.000Z",
    };
    await repository.insertItem(item);

    const result = await repository.updateItem({
      ...item,
      projectId: "project-2",
      updatedAt: "2026-09-03T00:00:00.000Z",
    }, item.updatedAt);

    expect(result).toBe("updated");
    expect((await repository.getProject("project-1"))?.updatedAt).toBe("2026-09-03T00:00:00.000Z");
    expect((await repository.getProject("project-2"))?.updatedAt).toBe("2026-09-03T00:00:00.000Z");
  });

  it("updates the owning project's timestamp when content is deleted", async () => {
    await insertProject();
    await insertItems(1);
    const repository = new D1NovelRepository(database);

    const deleted = await repository.deleteItem("item-00000", "2026-09-04T00:00:00.000Z");

    expect(deleted).toBe(true);
    expect((await repository.getProject("project-1"))?.updatedAt).toBe("2026-09-04T00:00:00.000Z");
  });
});
