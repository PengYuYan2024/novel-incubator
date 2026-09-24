import { canonicalRelationEndpoints } from "./relations";
import type { BackupDocument, ItemRecord, ProjectRecord, RelationRecord } from "./types";
import {
  MAX_ITEM_RESTORE_JSON_BYTES,
  validateItem,
  validateProject,
  validateRelation,
} from "./validation";

const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const MAX_BACKUP_RECORDS = 10_000;
const MAX_RECORD_ID_LENGTH = 120;
const MAX_TIMESTAMP_LENGTH = 64;
const utf8Encoder = new TextEncoder();

export type BackupCounts = { projects: number; items: number; relations: number };
export type BackupValidation =
  | { success: true; data: BackupDocument; counts: BackupCounts }
  | { success: false; error: string };

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_TIMESTAMP_LENGTH &&
    Number.isFinite(Date.parse(value));
}

function validRecordId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_RECORD_ID_LENGTH;
}

function duplicate(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

function parseProject(value: unknown): ProjectRecord | null {
  const row = objectValue(value);
  if (!row || !validRecordId(row.id) || !validTimestamp(row.createdAt) || !validTimestamp(row.updatedAt)) return null;
  const input = validateProject(row);
  if (!input.success) return null;
  return {
    ...input.data,
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseItem(value: unknown): ItemRecord | null {
  const row = objectValue(value);
  if (!row || !validRecordId(row.id) || !validTimestamp(row.createdAt) || !validTimestamp(row.updatedAt)) return null;
  const input = validateItem(row);
  if (!input.success) return null;
  const searchText = [input.data.title, input.data.body, ...Object.values(input.data.metadata)]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const item: ItemRecord = {
    ...input.data,
    id: row.id,
    searchText,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  if (utf8Encoder.encode(JSON.stringify(item)).byteLength > MAX_ITEM_RESTORE_JSON_BYTES) return null;
  return item;
}

function parseRelation(value: unknown): RelationRecord | null {
  const row = objectValue(value);
  if (!row || !validRecordId(row.id) || !validTimestamp(row.createdAt)) return null;
  const input = validateRelation(row);
  if (!input.success) return null;
  const [sourceItemId, targetItemId] = canonicalRelationEndpoints(
    input.data.relationType,
    input.data.sourceItemId,
    input.data.targetItemId,
  );
  return {
    ...input.data,
    sourceItemId,
    targetItemId,
    id: row.id,
    createdAt: row.createdAt,
  };
}

export function validateBackupDocument(
  value: unknown,
  byteLength?: number,
): BackupValidation {
  if (byteLength !== undefined && byteLength > MAX_BACKUP_BYTES) {
    return { success: false, error: "备份文件不能超过 10 MB" };
  }
  const document = objectValue(value);
  if (!document || document.schemaVersion !== 1) {
    return { success: false, error: "不支持的备份版本" };
  }
  if (
    !validTimestamp(document.exportedAt) ||
    !Array.isArray(document.projects) ||
    !Array.isArray(document.items) ||
    !Array.isArray(document.relations)
  ) {
    return { success: false, error: "备份结构不完整" };
  }
  const counts: BackupCounts = {
    projects: document.projects.length,
    items: document.items.length,
    relations: document.relations.length,
  };
  if (counts.projects + counts.items + counts.relations > MAX_BACKUP_RECORDS) {
    return { success: false, error: "备份记录不能超过 10000 条" };
  }

  const projects = document.projects.map(parseProject);
  if (projects.some((project) => !project)) return { success: false, error: "项目数据无效" };
  const projectRows = projects as ProjectRecord[];
  if (duplicate(projectRows.map((project) => project.id))) return { success: false, error: "项目编号重复" };

  const items = document.items.map(parseItem);
  if (items.some((item) => !item)) return { success: false, error: "内容数据无效" };
  const itemRows = items as ItemRecord[];
  if (duplicate(itemRows.map((item) => item.id))) return { success: false, error: "内容编号重复" };
  const projectIds = new Set(projectRows.map((project) => project.id));
  if (itemRows.some((item) => !projectIds.has(item.projectId))) {
    return { success: false, error: "内容引用了不存在的项目" };
  }

  const relations = document.relations.map(parseRelation);
  if (relations.some((relation) => !relation)) {
    const selfRelation = document.relations.some((value) => {
      const row = objectValue(value);
      return row?.sourceItemId === row?.targetItemId && typeof row?.sourceItemId === "string";
    });
    return { success: false, error: selfRelation ? "关联不能指向内容自身" : "关联数据无效" };
  }
  const relationRows = relations as RelationRecord[];
  if (duplicate(relationRows.map((relation) => relation.id))) return { success: false, error: "关联编号重复" };
  const itemIds = new Set(itemRows.map((item) => item.id));
  if (relationRows.some((relation) => !itemIds.has(relation.sourceItemId) || !itemIds.has(relation.targetItemId))) {
    return { success: false, error: "关联引用了不存在的内容" };
  }
  const relationKeys = relationRows.map((relation) =>
    `${relation.sourceItemId}\u0000${relation.targetItemId}\u0000${relation.relationType}`,
  );
  if (duplicate(relationKeys)) return { success: false, error: "关联重复" };

  return {
    success: true,
    counts,
    data: {
      schemaVersion: 1,
      exportedAt: document.exportedAt,
      projects: projectRows,
      items: itemRows,
      relations: relationRows,
    },
  };
}

export function parseBackupJson(text: string): BackupValidation {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { success: false, error: "文件不是有效的 JSON" };
  }
  return validateBackupDocument(value, new TextEncoder().encode(text).byteLength);
}
