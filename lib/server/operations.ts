import {
  canonicalRelationEndpoints,
} from "@/lib/domain/relations";
import { validateBackupDocument } from "@/lib/domain/backup";
import type {
  BackupExportDocument,
  DashboardData,
  ItemFilters,
  ItemInput,
  ItemRecord,
  ProjectRecord,
  RelationInput,
  RelationRecord,
  RelationView,
} from "@/lib/domain/types";
import {
  validateItem,
  validateProject,
  validateRelation,
} from "@/lib/domain/validation";
import { DomainError, validationError } from "./errors";
import type { NovelRepository, SeedBundle, WriteResult } from "./repository";

export type OperationContext = {
  createId: () => string;
  now: () => string;
};

export type NovelOperations = ReturnType<typeof createNovelOperations>;

function zodFields(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    fields[key] ??= [];
    fields[key].push(issue.message);
  }
  return fields;
}

function requireWrite(result: WriteResult, noun: "项目" | "内容") {
  if (result === "not_found") {
    throw new DomainError(noun === "项目" ? "PROJECT_NOT_FOUND" : "ITEM_NOT_FOUND", `${noun}不存在或已被删除`);
  }
  if (result === "conflict") {
    throw new DomainError("STALE_WRITE", `${noun}已在其他页面更新，请重新载入后再保存`);
  }
}

function createSearchText(input: ItemInput): string {
  return [input.title, input.body, ...Object.values(input.metadata)]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function createSeed(context: OperationContext): SeedBundle {
  const timestamp = context.now();
  const projectId = context.createId();
  const characterId = context.createId();
  const worldId = context.createId();
  const inspirationId = context.createId();
  const project: ProjectRecord = {
    id: projectId,
    title: "未命名长期小说",
    genre: "待确定",
    logline: "一部将在大学期间慢慢积累、毕业后正式创作的小说。",
    description: "这是一个可删除的示例项目。",
    status: "warming",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const inputs: Array<ItemInput & { id: string }> = [
    {
      id: characterId,
      projectId,
      type: "character",
      subtype: null,
      title: "待命名角色",
      body: "",
      status: "seed",
      tags: ["示例"],
      metadata: {
        role: "角色定位待补充",
        coreDesire: "核心欲望待补充",
        innerConflict: "内在矛盾待补充",
        traits: "性格特征待补充",
        history: "人物经历待补充",
        notes: "仅用于演示人物卡字段，可随时删除。",
      },
    },
    {
      id: worldId,
      projectId,
      type: "world",
      subtype: "location",
      title: "待补充地点",
      body: "一个尚未决定用途的地点示例。",
      status: "seed",
      tags: ["示例"],
      metadata: {
        rules: "详细规则待补充",
        cost: "限制或代价待补充",
      },
    },
    {
      id: inspirationId,
      projectId,
      type: "inspiration",
      subtype: "question",
      title: "一次尚未定形的追问",
      body: "如何让一个偶然选择在很久以后显出意义？",
      status: "inbox",
      tags: ["示例"],
      metadata: {},
    },
  ];
  const items = inputs.map(({ id, ...input }) => ({
    ...input,
    id,
    searchText: createSearchText(input),
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
  const relations: RelationRecord[] = [
    {
      id: context.createId(),
      sourceItemId: characterId,
      targetItemId: worldId,
      relationType: "appears_in",
      note: "示例关联",
      createdAt: timestamp,
    },
    {
      id: context.createId(),
      sourceItemId: inspirationId,
      targetItemId: characterId,
      relationType: "influences",
      note: "示例关联",
      createdAt: timestamp,
    },
  ];
  return { project, items, relations };
}

export function createNovelOperations(
  repository: NovelRepository,
  context: OperationContext = {
    createId: () => crypto.randomUUID(),
    now: () => new Date().toISOString(),
  },
) {
  return {
    async bootstrap() {
      return { created: await repository.seedIfNeeded(createSeed(context)) };
    },

    listProjects(): Promise<ProjectRecord[]> {
      return repository.listProjects();
    },

    async getProject(id: string): Promise<ProjectRecord> {
      const project = await repository.getProject(id);
      if (!project) throw new DomainError("PROJECT_NOT_FOUND", "项目不存在或已被删除");
      return project;
    },

    async createProject(input: unknown): Promise<ProjectRecord> {
      const parsed = validateProject(input);
      if (!parsed.success) {
        throw validationError("请检查项目资料", zodFields(parsed.error));
      }
      const timestamp = context.now();
      const project: ProjectRecord = {
        ...parsed.data,
        id: context.createId(),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await repository.insertProject(project);
      return { ...project, counts: { inspiration: 0, character: 0, world: 0 } };
    },

    async updateProject(
      id: string,
      input: unknown,
      expectedUpdatedAt: string,
    ): Promise<ProjectRecord> {
      const existing = await repository.getProject(id);
      if (!existing) throw new DomainError("PROJECT_NOT_FOUND", "项目不存在或已被删除");
      const parsed = validateProject(input);
      if (!parsed.success) throw validationError("请检查项目资料", zodFields(parsed.error));
      const project: ProjectRecord = {
        ...parsed.data,
        id,
        createdAt: existing.createdAt,
        updatedAt: context.now(),
      };
      requireWrite(await repository.updateProject(project, expectedUpdatedAt), "项目");
      return { ...project, counts: existing.counts };
    },

    async deleteProject(id: string) {
      if ((await repository.countProjectItems(id)) > 0) {
        throw new DomainError("PROJECT_NOT_EMPTY", "项目中仍有内容，请先迁移或删除这些内容");
      }
      if (!(await repository.deleteProject(id))) {
        throw new DomainError("PROJECT_NOT_FOUND", "项目不存在或已被删除");
      }
      return { deleted: true };
    },

    listItems(filters: ItemFilters = {}): Promise<ItemRecord[]> {
      return repository.listItems(filters);
    },

    async getItem(id: string): Promise<ItemRecord> {
      const item = await repository.getItem(id);
      if (!item) throw new DomainError("ITEM_NOT_FOUND", "内容不存在或已被删除");
      return item;
    },

    async createItem(input: unknown): Promise<ItemRecord> {
      const parsed = validateItem(input);
      if (!parsed.success) throw validationError("请检查内容资料", zodFields(parsed.error));
      const project = await repository.getProject(parsed.data.projectId);
      if (!project) throw new DomainError("PROJECT_NOT_FOUND", "所属项目不存在或已被删除");
      const timestamp = context.now();
      const item: ItemRecord = {
        ...parsed.data,
        id: context.createId(),
        searchText: createSearchText(parsed.data),
        createdAt: timestamp,
        updatedAt: timestamp,
        projectTitle: project.title,
      };
      await repository.insertItem(item);
      return item;
    },

    async updateItem(
      id: string,
      input: unknown,
      expectedUpdatedAt: string,
    ): Promise<ItemRecord> {
      const existing = await repository.getItem(id);
      if (!existing) throw new DomainError("ITEM_NOT_FOUND", "内容不存在或已被删除");
      const parsed = validateItem(input);
      if (!parsed.success) throw validationError("请检查内容资料", zodFields(parsed.error));
      const project = await repository.getProject(parsed.data.projectId);
      if (!project) throw new DomainError("PROJECT_NOT_FOUND", "所属项目不存在或已被删除");
      const item: ItemRecord = {
        ...parsed.data,
        id,
        searchText: createSearchText(parsed.data),
        createdAt: existing.createdAt,
        updatedAt: context.now(),
        projectTitle: project.title,
      };
      requireWrite(await repository.updateItem(item, expectedUpdatedAt), "内容");
      return item;
    },

    async deleteItem(id: string) {
      if (!(await repository.deleteItem(id, context.now()))) {
        throw new DomainError("ITEM_NOT_FOUND", "内容不存在或已被删除");
      }
      return { deleted: true };
    },

    listRelations(itemId: string): Promise<RelationView[]> {
      return repository.listRelations(itemId);
    },

    async createRelation(input: unknown): Promise<RelationRecord> {
      const parsed = validateRelation(input);
      if (!parsed.success) throw validationError("请检查关联资料", zodFields(parsed.error));
      const [sourceItemId, targetItemId] = canonicalRelationEndpoints(
        parsed.data.relationType,
        parsed.data.sourceItemId,
        parsed.data.targetItemId,
      );
      const normalized: RelationInput = { ...parsed.data, sourceItemId, targetItemId };
      const [source, target] = await Promise.all([
        repository.getItem(sourceItemId),
        repository.getItem(targetItemId),
      ]);
      if (!source || !target) throw new DomainError("ITEM_NOT_FOUND", "关联的内容不存在或已被删除");
      if (await repository.findEquivalentRelation(normalized)) {
        throw new DomainError("DUPLICATE_RELATION", "这条关联已经存在");
      }
      const relation: RelationRecord = {
        ...normalized,
        id: context.createId(),
        createdAt: context.now(),
      };
      await repository.insertRelation(relation);
      return relation;
    },

    async deleteRelation(id: string) {
      if (!(await repository.deleteRelation(id))) {
        throw new DomainError("RELATION_NOT_FOUND", "关联不存在或已被取消");
      }
      return { deleted: true };
    },

    dashboard(todayStart?: string, todayEnd?: string): Promise<DashboardData> {
      const now = new Date(context.now());
      const defaultStart = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
      ));
      return repository.dashboard(
        todayStart ?? defaultStart.toISOString(),
        todayEnd ?? new Date(defaultStart.getTime() + 86_400_000).toISOString(),
      );
    },

    async exportBackup(): Promise<BackupExportDocument> {
      const snapshot = await repository.exportAll();
      return {
        schemaVersion: 1,
        exportedAt: context.now(),
        projects: snapshot.projects.map((project) => ({
          id: project.id,
          title: project.title,
          genre: project.genre,
          logline: project.logline,
          description: project.description,
          status: project.status,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        })),
        items: snapshot.items.map((item) => ({
          id: item.id,
          projectId: item.projectId,
          type: item.type,
          subtype: item.subtype,
          title: item.title,
          body: item.body,
          status: item.status,
          tags: item.tags,
          metadata: item.metadata,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        relations: snapshot.relations,
      };
    },

    async preflightBackup(value: unknown, byteLength?: number) {
      const result = validateBackupDocument(value, byteLength);
      if (!result.success) throw new DomainError("BACKUP_INVALID", result.error);
      return result.counts;
    },

    async restoreBackup(value: unknown, byteLength?: number) {
      const result = validateBackupDocument(value, byteLength);
      if (!result.success) throw new DomainError("BACKUP_INVALID", result.error);
      await repository.replaceAll(result.data);
      return result.counts;
    },
  };
}
