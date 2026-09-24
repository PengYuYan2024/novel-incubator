import { z, type SafeParseReturnType, type ZodIssue } from "zod";

import {
  CONTENT_STATUSES,
  INSPIRATION_SUBTYPES,
  ITEM_TYPES,
  PROJECT_STATUSES,
  RELATION_TYPES,
  WORLD_SUBTYPES,
} from "./constants";
import type {
  CharacterMetadata,
  ItemInput,
  ProjectInput,
  RelationInput,
  WorldMetadata,
} from "./types";

const trimmed = (maximum: number) => z.string().trim().max(maximum);

// D1 caps a table row at 2,000,000 bytes. Keep headroom for IDs, timestamps,
// SQLite record overhead, and the remaining item columns.
const MAX_ITEM_STORED_TEXT_BYTES = 1_500_000;
export const MAX_ITEM_RESTORE_JSON_BYTES = 1_400_000;
const utf8Encoder = new TextEncoder();

const projectSchema = z.object({
  title: trimmed(120).min(1, "请输入项目名称"),
  genre: trimmed(80).default(""),
  logline: trimmed(500).default(""),
  description: trimmed(20_000).default(""),
  status: z.enum(PROJECT_STATUSES),
});

const rawItemSchema = z.object({
  projectId: trimmed(120).min(1, "请选择所属项目"),
  type: z.enum(ITEM_TYPES),
  subtype: z.string().trim().max(40).nullable().default(null),
  title: trimmed(200).default(""),
  body: trimmed(50_000).default(""),
  status: z.enum(CONTENT_STATUSES),
  tags: z.array(trimmed(40)).max(30).default([]),
  metadata: z.record(
    z.string(),
    z.string().trim().max(50_000, "每个资料字段不能超过 50000 个字符"),
  ).default({}),
});

const relationSchema = z
  .object({
    sourceItemId: trimmed(120).min(1),
    targetItemId: trimmed(120).min(1),
    relationType: z.enum(RELATION_TYPES),
    note: trimmed(1_000).default(""),
  })
  .superRefine((value, context) => {
    if (value.sourceItemId === value.targetItemId) {
      context.addIssue({
        code: "custom",
        path: ["targetItemId"],
        message: "不能关联内容自身",
      });
    }
  });

function characterMetadata(metadata: Record<string, string>): CharacterMetadata {
  return {
    role: metadata.role?.trim() ?? "",
    coreDesire: metadata.coreDesire?.trim() ?? "",
    innerConflict: metadata.innerConflict?.trim() ?? "",
    traits: metadata.traits?.trim() ?? "",
    history: metadata.history?.trim() ?? "",
    notes: metadata.notes?.trim() ?? "",
  };
}

function worldMetadata(metadata: Record<string, string>): WorldMetadata {
  return {
    rules: metadata.rules?.trim() ?? "",
    cost: metadata.cost?.trim() ?? "",
  };
}

function storedItemTextBytes(
  title: string,
  body: string,
  metadata: ItemInput["metadata"],
): number {
  const searchText = [title, body, ...Object.values(metadata)]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return [title, body, JSON.stringify(metadata), searchText]
    .reduce((total, value) => total + utf8Encoder.encode(value).byteLength, 0);
}

function restoreItemJsonBytes(
  value: z.infer<typeof rawItemSchema>,
  tags: string[],
  metadata: ItemInput["metadata"],
): number {
  const searchText = [value.title, value.body, ...Object.values(metadata)]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return utf8Encoder.encode(JSON.stringify({ ...value, tags, metadata, searchText })).byteLength;
}

export function normalizeTags(tags: string[]): string[] {
  const unique = new Set<string>();
  for (const tag of tags) {
    const value = tag.trim();
    if (value) unique.add(value);
  }
  return [...unique];
}

export function validateProject(input: unknown) {
  return projectSchema.safeParse(input) as SafeParseReturnType<unknown, ProjectInput>;
}

export function validateItem(input: unknown): SafeParseReturnType<unknown, ItemInput> {
  const result = rawItemSchema.safeParse(input);
  if (!result.success) return result as SafeParseReturnType<unknown, ItemInput>;

  const value = result.data;
  const metadata: ItemInput["metadata"] =
    value.type === "character"
      ? characterMetadata(value.metadata)
      : value.type === "world"
        ? worldMetadata(value.metadata)
        : {};
  const tags = normalizeTags(value.tags);
  const issues: ZodIssue[] = [];
  if (value.type === "inspiration" && !value.body) {
    issues.push({ code: "custom", path: ["body"], message: "请输入正文" });
  }
  if ((value.type === "character" || value.type === "world") && !value.title) {
    issues.push({ code: "custom", path: ["title"], message: value.type === "character" ? "请输入姓名" : "请输入设定名称" });
  }
  if (
    value.type === "inspiration" &&
    !INSPIRATION_SUBTYPES.includes(value.subtype as (typeof INSPIRATION_SUBTYPES)[number])
  ) {
    issues.push({ code: "custom", path: ["subtype"], message: "请选择记录类型" });
  }
  if (
    value.type === "world" &&
    !WORLD_SUBTYPES.includes(value.subtype as (typeof WORLD_SUBTYPES)[number])
  ) {
    issues.push({ code: "custom", path: ["subtype"], message: "请选择设定分类" });
  }
  if (value.type === "character" && value.subtype !== null) {
    issues.push({ code: "custom", path: ["subtype"], message: "人物卡不使用分类" });
  }
  if (
    storedItemTextBytes(value.title, value.body, metadata) > MAX_ITEM_STORED_TEXT_BYTES ||
    restoreItemJsonBytes(value, tags, metadata) > MAX_ITEM_RESTORE_JSON_BYTES
  ) {
    issues.push({
      code: "custom",
      path: [],
      message: "内容总量过大，请缩短正文或资料字段后再保存",
    });
  }

  if (issues.length > 0) {
    return {
      success: false,
      error: new z.ZodError(issues),
    };
  }

  return {
    success: true,
    data: {
      ...value,
      subtype: value.subtype as ItemInput["subtype"],
      tags,
      metadata,
    },
  };
}

export function validateRelation(input: unknown) {
  return relationSchema.safeParse(input) as SafeParseReturnType<unknown, RelationInput>;
}
