// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Miniflare } from "miniflare";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getD1Binding } = vi.hoisted(() => ({
  getD1Binding: vi.fn(),
}));

vi.mock("@/db", () => ({ getD1Binding }));

import { GET as exportBackup } from "@/app/api/backup/export/route";
import { GET as getDashboard } from "@/app/api/dashboard/route";
import { GET as listItems, POST as createItem } from "@/app/api/items/route";
import { POST as createProject } from "@/app/api/projects/route";

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
  getD1Binding.mockReturnValue(database);
});

afterEach(async () => {
  getD1Binding.mockReset();
  await miniflare.dispose();
});

async function responseData<T>(response: Response): Promise<T> {
  const body = await response.json() as { data: T };
  return body.data;
}

describe("API routes with D1", () => {
  it("creates a project and inspiration, then returns them from search, dashboard, and backup", async () => {
    const projectResponse = await createProject(new Request("http://local.test/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "长夜列车",
        genre: "待确定",
        logline: "一段尚未定形的旅程。",
        description: "",
        status: "warming",
      }),
    }));
    expect(projectResponse.status).toBe(201);
    const project = await responseData<{ id: string }>(projectResponse);

    const itemResponse = await createItem(new Request("http://local.test/api/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        type: "inspiration",
        subtype: "scene",
        title: "午夜车站",
        body: "末班车驶入没有名字的站台。",
        status: "inbox",
        tags: ["车站", "夜晚"],
        metadata: {},
      }),
    }));
    expect(itemResponse.status).toBe(201);

    const searchResponse = await listItems(new Request("http://local.test/api/items?q=%E8%BD%A6%E7%AB%99"));
    const items = await responseData<Array<{ title: string; tags: string[] }>>(searchResponse);
    expect(items).toEqual([
      expect.objectContaining({ title: "午夜车站", tags: ["夜晚", "车站"] }),
    ]);

    const dashboardResponse = await getDashboard(new Request(
      "http://local.test/api/dashboard?todayStart=2000-01-01T00%3A00%3A00.000Z&todayEnd=2100-01-01T00%3A00%3A00.000Z",
    ));
    const dashboard = await responseData<{ todayCount: number; inboxCount: number }>(dashboardResponse);
    expect(dashboard).toMatchObject({ todayCount: 1, inboxCount: 1 });

    const backup = await responseData<{ projects: unknown[]; items: unknown[] }>(
      await exportBackup(),
    );
    expect(backup.projects).toHaveLength(1);
    expect(backup.items).toHaveLength(1);
  });

  it("rejects an oversized multibyte character before D1 inserts a row", async () => {
    const projectResponse = await createProject(new Request("http://local.test/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "容量边界项目",
        genre: "",
        logline: "",
        description: "",
        status: "warming",
      }),
    }));
    const project = await responseData<{ id: string }>(projectResponse);
    const multibyteText = `${"😀".repeat(10_000)}${"界".repeat(30_000)}`;

    const itemResponse = await createItem(new Request("http://local.test/api/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        type: "character",
        subtype: null,
        title: "容量边界人物",
        body: "",
        status: "growing",
        tags: [],
        metadata: {
          role: multibyteText,
          coreDesire: multibyteText,
          innerConflict: multibyteText,
          traits: multibyteText,
          history: multibyteText,
          notes: multibyteText,
        },
      }),
    }));

    expect(itemResponse.status).toBe(400);
    await expect(itemResponse.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        fields: {
          form: ["内容总量过大，请缩短正文或资料字段后再保存"],
        },
      },
    });
    const stored = await database.prepare("SELECT count(*) AS count FROM items").first<{ count: number }>();
    expect(stored?.count).toBe(0);
  });
});
