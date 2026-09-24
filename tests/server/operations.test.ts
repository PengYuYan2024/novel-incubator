import { describe, expect, it } from "vitest";

import type {
  DashboardData,
  ItemFilters,
  ItemRecord,
  ProjectRecord,
  RelationInput,
  RelationRecord,
  RelationView,
} from "@/lib/domain/types";
import { canonicalRelationEndpoints, relationLabelForViewer } from "@/lib/domain/relations";
import {
  createNovelOperations,
  type OperationContext,
} from "@/lib/server/operations";
import type {
  NovelRepository,
  RepositorySnapshot,
  SeedBundle,
  WriteResult,
} from "@/lib/server/repository";

class MemoryNovelRepository implements NovelRepository {
  projects: ProjectRecord[] = [];
  items: ItemRecord[] = [];
  relations: RelationRecord[] = [];
  seeded = false;

  async seedIfNeeded(bundle: SeedBundle) {
    if (this.seeded) return false;
    this.seeded = true;
    this.projects.push(bundle.project);
    this.items.push(...bundle.items);
    this.relations.push(...bundle.relations);
    return true;
  }

  clearSeedRecordsForTest() {
    this.projects = [];
    this.items = [];
    this.relations = [];
  }

  async listProjects() {
    return this.projects
      .map((project) => ({ ...project, counts: this.countsFor(project.id) }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getProject(id: string) {
    const project = this.projects.find((entry) => entry.id === id);
    return project ? { ...project, counts: this.countsFor(id) } : null;
  }

  async insertProject(project: ProjectRecord) {
    this.projects.push(project);
  }

  async updateProject(project: ProjectRecord, expectedUpdatedAt: string): Promise<WriteResult> {
    const index = this.projects.findIndex((entry) => entry.id === project.id);
    if (index < 0) return "not_found";
    if (this.projects[index].updatedAt !== expectedUpdatedAt) return "conflict";
    this.projects[index] = project;
    return "updated";
  }

  async countProjectItems(projectId: string) {
    return this.items.filter((item) => item.projectId === projectId).length;
  }

  async deleteProject(projectId: string) {
    const before = this.projects.length;
    this.projects = this.projects.filter((project) => project.id !== projectId);
    return before !== this.projects.length;
  }

  async listItems(filters: ItemFilters = {}) {
    const query = filters.q?.trim().toLocaleLowerCase() ?? "";
    return this.items
      .filter((item) => filters.includeArchived || filters.status === "archived" || item.status !== "archived")
      .filter((item) => !filters.type || item.type === filters.type)
      .filter((item) => !filters.projectId || item.projectId === filters.projectId)
      .filter((item) => !filters.status || item.status === filters.status)
      .filter((item) => !filters.tag || item.tags.includes(filters.tag))
      .filter((item) => !filters.updatedFrom || item.updatedAt >= filters.updatedFrom)
      .filter((item) => !filters.updatedTo || item.updatedAt <= filters.updatedTo)
      .filter((item) => {
        if (!query) return true;
        const project = this.projects.find((entry) => entry.id === item.projectId);
        return [item.searchText, project?.title ?? "", ...item.tags]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query);
      })
      .map((item) => ({
        ...item,
        projectTitle: this.projects.find((project) => project.id === item.projectId)?.title,
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getItem(id: string) {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) return null;
    return {
      ...item,
      projectTitle: this.projects.find((project) => project.id === item.projectId)?.title,
    };
  }

  async insertItem(item: ItemRecord) {
    this.items.push(item);
  }

  async updateItem(item: ItemRecord, expectedUpdatedAt: string): Promise<WriteResult> {
    const index = this.items.findIndex((entry) => entry.id === item.id);
    if (index < 0) return "not_found";
    if (this.items[index].updatedAt !== expectedUpdatedAt) return "conflict";
    this.items[index] = item;
    return "updated";
  }

  async deleteItem(id: string) {
    const before = this.items.length;
    this.items = this.items.filter((item) => item.id !== id);
    this.relations = this.relations.filter(
      (relation) => relation.sourceItemId !== id && relation.targetItemId !== id,
    );
    return before !== this.items.length;
  }

  async listRelations(itemId: string): Promise<RelationView[]> {
    const views: RelationView[] = [];
    for (const relation of this.relations) {
      const viewerSide = relation.sourceItemId === itemId ? "source" : relation.targetItemId === itemId ? "target" : null;
      if (!viewerSide) continue;
      const counterpartId = viewerSide === "source" ? relation.targetItemId : relation.sourceItemId;
      const counterpart = await this.getItem(counterpartId);
      if (!counterpart) continue;
      views.push({
        ...relation,
        viewerSide,
        label: relationLabelForViewer(relation.relationType, viewerSide),
        counterpart,
      });
    }
    return views;
  }

  async findEquivalentRelation(input: RelationInput) {
    const [source, target] = canonicalRelationEndpoints(
      input.relationType,
      input.sourceItemId,
      input.targetItemId,
    );
    return (
      this.relations.find((relation) => {
        const [existingSource, existingTarget] = canonicalRelationEndpoints(
          relation.relationType,
          relation.sourceItemId,
          relation.targetItemId,
        );
        return (
          relation.relationType === input.relationType &&
          existingSource === source &&
          existingTarget === target
        );
      }) ?? null
    );
  }

  async insertRelation(relation: RelationRecord) {
    this.relations.push(relation);
  }

  async deleteRelation(id: string) {
    const before = this.relations.length;
    this.relations = this.relations.filter((relation) => relation.id !== id);
    return before !== this.relations.length;
  }

  async dashboard(todayStart: string, todayEnd: string): Promise<DashboardData> {
    const statusCounts = { inbox: 0, seed: 0, growing: 0, ready: 0, archived: 0 };
    for (const item of this.items) statusCounts[item.status] += 1;
    return {
      inboxCount: statusCounts.inbox,
      todayCount: this.items.filter((item) => (
        item.createdAt >= todayStart && item.createdAt < todayEnd
      )).length,
      statusCounts,
      recentProjects: (await this.listProjects()).slice(0, 4),
      recentItems: (await this.listItems()).slice(0, 8),
    };
  }

  async exportAll(): Promise<RepositorySnapshot> {
    return {
      projects: this.projects.map((project) => ({ ...project })),
      items: this.items.map((item) => ({ ...item, tags: [...item.tags] })),
      relations: this.relations.map((relation) => ({ ...relation })),
    };
  }

  async replaceAll(snapshot: RepositorySnapshot): Promise<void> {
    this.projects = snapshot.projects.map((project) => ({ ...project }));
    this.items = snapshot.items.map((item) => ({ ...item, tags: [...item.tags] }));
    this.relations = snapshot.relations.map((relation) => ({ ...relation }));
    this.seeded = true;
  }

  private countsFor(projectId: string) {
    const active = this.items.filter(
      (item) => item.projectId === projectId && item.status !== "archived",
    );
    return {
      inspiration: active.filter((item) => item.type === "inspiration").length,
      character: active.filter((item) => item.type === "character").length,
      world: active.filter((item) => item.type === "world").length,
    };
  }
}

function testContext(): OperationContext {
  let id = 0;
  let tick = 0;
  return {
    createId: () => `id-${++id}`,
    now: () => `2026-09-10T12:00:${String(tick++).padStart(2, "0")}.000Z`,
  };
}

async function seededOperations() {
  const repository = new MemoryNovelRepository();
  const operations = createNovelOperations(repository, testContext());
  await operations.bootstrap();
  const projects = await operations.listProjects();
  return { repository, operations, projectId: projects[0].id };
}

describe("bootstrap and project lifecycle", () => {
  it("creates the sample only once, even after the sample is later deleted", async () => {
    const repository = new MemoryNovelRepository();
    const operations = createNovelOperations(repository, testContext());
    await operations.bootstrap();
    expect((await operations.listProjects())).toHaveLength(1);
    repository.clearSeedRecordsForTest();
    await operations.bootstrap();
    expect((await operations.listProjects())).toHaveLength(0);
  });

  it("refuses to delete a project that still owns content", async () => {
    const { operations, projectId } = await seededOperations();
    await expect(operations.deleteProject(projectId)).rejects.toMatchObject({
      code: "PROJECT_NOT_EMPTY",
    });
  });

  it("deletes an empty project", async () => {
    const repository = new MemoryNovelRepository();
    const operations = createNovelOperations(repository, testContext());
    const project = await operations.createProject({
      title: "空项目",
      genre: "",
      logline: "",
      description: "",
      status: "warming",
    });
    await expect(operations.deleteProject(project.id)).resolves.toEqual({ deleted: true });
  });
});

describe("item operations", () => {
  it("counts today's records using the viewer-provided UTC half-open range", async () => {
    const { operations } = await seededOperations();
    expect((await operations.dashboard(
      "2026-09-09T16:00:00.000Z",
      "2026-09-10T16:00:00.000Z",
    )).todayCount).toBe(3);
    expect((await operations.dashboard(
      "2026-09-08T16:00:00.000Z",
      "2026-09-09T16:00:00.000Z",
    )).todayCount).toBe(0);
  });

  it("updates dashboard counts and excludes archived items from active project counts", async () => {
    const { operations, projectId } = await seededOperations();
    await operations.createItem({
      projectId,
      type: "inspiration",
      subtype: "question",
      title: "",
      body: "这个选择会改变谁？",
      status: "archived",
      tags: ["伏笔"],
      metadata: {},
    });
    const project = (await operations.listProjects())[0];
    expect(project.counts).toEqual({ inspiration: 1, character: 1, world: 1 });
    const dashboard = await operations.dashboard();
    expect(dashboard.statusCounts.archived).toBe(1);
  });

  it("searches normalized metadata, tags, and project names with combined filters", async () => {
    const { operations, projectId } = await seededOperations();
    const byMetadata = await operations.listItems({ q: "核心欲望" });
    expect(byMetadata.map((item) => item.type)).toContain("character");
    const byTagAndType = await operations.listItems({
      projectId,
      type: "inspiration",
      tag: "示例",
    });
    expect(byTagAndType).toHaveLength(1);
    expect(byTagAndType[0].projectTitle).toBe("未命名长期小说");
  });

  it("rejects a stale edit without overwriting the latest record", async () => {
    const { operations } = await seededOperations();
    const item = (await operations.listItems({ type: "inspiration" }))[0];
    const changed = await operations.updateItem(
      item.id,
      { ...item, body: "最新正文" },
      item.updatedAt,
    );
    await expect(
      operations.updateItem(item.id, { ...item, body: "旧页面正文" }, item.updatedAt),
    ).rejects.toMatchObject({ code: "STALE_WRITE" });
    expect((await operations.getItem(item.id)).body).toBe(changed.body);
  });
});

describe("relations", () => {
  it("rejects a reverse duplicate for a symmetric relation", async () => {
    const { operations } = await seededOperations();
    const [left, right] = (await operations.listItems()).slice(0, 2);
    await operations.createRelation({
      sourceItemId: left.id,
      targetItemId: right.id,
      relationType: "related",
      note: "",
    });
    await expect(
      operations.createRelation({
        sourceItemId: right.id,
        targetItemId: left.id,
        relationType: "related",
        note: "",
      }),
    ).rejects.toMatchObject({ code: "DUPLICATE_RELATION" });
  });

  it("removes attached relations when an item is deleted", async () => {
    const { operations } = await seededOperations();
    const items = await operations.listItems();
    const relation = await operations.createRelation({
      sourceItemId: items[0].id,
      targetItemId: items[1].id,
      relationType: "influences",
      note: "",
    });
    await operations.deleteItem(items[0].id);
    await expect(operations.deleteRelation(relation.id)).rejects.toMatchObject({
      code: "RELATION_NOT_FOUND",
    });
  });
});

describe("backup operations", () => {
  it("exports a versioned complete snapshot", async () => {
    const { operations, repository } = await seededOperations();
    repository.projects[0].counts = { inspiration: 1, character: 1, world: 1 };
    repository.items[0].projectTitle = "未命名长期小说";
    const backup = await operations.exportBackup();
    expect(backup.schemaVersion).toBe(1);
    expect(backup.projects).toHaveLength(1);
    expect(backup.items).toHaveLength(3);
    expect(backup.relations).toHaveLength(2);
    expect(Object.keys(backup.projects[0]).sort()).toEqual([
      "createdAt",
      "description",
      "genre",
      "id",
      "logline",
      "status",
      "title",
      "updatedAt",
    ]);
    expect(Object.keys(backup.items[0]).sort()).toEqual([
      "body",
      "createdAt",
      "id",
      "metadata",
      "projectId",
      "status",
      "subtype",
      "tags",
      "title",
      "type",
      "updatedAt",
    ]);
  });

  it("preflights without changing current data", async () => {
    const { operations } = await seededOperations();
    const backup = await operations.exportBackup();
    await operations.createProject({
      title: "保留中的项目",
      genre: "",
      logline: "",
      description: "",
      status: "warming",
    });
    expect(await operations.preflightBackup(backup)).toEqual({
      projects: 1,
      items: 3,
      relations: 2,
    });
    expect(await operations.listProjects()).toHaveLength(2);
  });

  it("restores the validated snapshot as the complete data set", async () => {
    const { operations } = await seededOperations();
    const backup = await operations.exportBackup();
    await operations.createProject({
      title: "恢复时会被替换",
      genre: "",
      logline: "",
      description: "",
      status: "warming",
    });
    expect(await operations.restoreBackup(backup)).toEqual({
      projects: 1,
      items: 3,
      relations: 2,
    });
    expect((await operations.listProjects()).map((project) => project.title)).toEqual([
      "未命名长期小说",
    ]);
  });
});
