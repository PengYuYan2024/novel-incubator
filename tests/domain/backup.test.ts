import { describe, expect, it } from "vitest";

import { parseBackupJson, validateBackupDocument } from "@/lib/domain/backup";
import type { BackupDocument } from "@/lib/domain/types";

const validBackup: BackupDocument = {
  schemaVersion: 1,
  exportedAt: "2026-09-11T08:00:00.000Z",
  projects: [{
    id: "project-1",
    title: "未命名长期小说",
    genre: "待确定",
    logline: "",
    description: "",
    status: "warming",
    createdAt: "2026-09-10T08:00:00.000Z",
    updatedAt: "2026-09-11T08:00:00.000Z",
  }],
  items: [
    { id: "item-1", projectId: "project-1", type: "inspiration", subtype: "idea", title: "", body: "一条灵感", status: "inbox", tags: ["示例"], metadata: {}, searchText: "一条灵感", createdAt: "2026-09-10T08:00:00.000Z", updatedAt: "2026-09-11T08:00:00.000Z" },
    { id: "item-2", projectId: "project-1", type: "character", subtype: null, title: "人物", body: "", status: "seed", tags: [], metadata: { role: "", coreDesire: "", innerConflict: "", traits: "", history: "", notes: "" }, searchText: "人物", createdAt: "2026-09-10T08:00:00.000Z", updatedAt: "2026-09-11T08:00:00.000Z" },
    { id: "item-3", projectId: "project-1", type: "world", subtype: "rule", title: "规则", body: "", status: "growing", tags: [], metadata: { rules: "", cost: "" }, searchText: "规则", createdAt: "2026-09-10T08:00:00.000Z", updatedAt: "2026-09-11T08:00:00.000Z" },
  ],
  relations: [
    { id: "relation-1", sourceItemId: "item-1", targetItemId: "item-2", relationType: "influences", note: "", createdAt: "2026-09-11T08:00:00.000Z" },
    { id: "relation-2", sourceItemId: "item-2", targetItemId: "item-3", relationType: "appears_in", note: "", createdAt: "2026-09-11T08:00:00.000Z" },
  ],
};

describe("backup validation", () => {
  it("accepts a complete backup and returns literal counts", () => {
    const result = validateBackupDocument(validBackup);
    expect(result).toMatchObject({ success: true, counts: { projects: 1, items: 3, relations: 2 } });
  });

  it("rejects malformed JSON", () => {
    expect(parseBackupJson("{not json")).toEqual({ success: false, error: "文件不是有效的 JSON" });
  });

  it("rejects an unsupported schema version", () => {
    expect(validateBackupDocument({ ...validBackup, schemaVersion: 2 })).toMatchObject({ success: false, error: "不支持的备份版本" });
  });

  it("rejects duplicate ids", () => {
    expect(validateBackupDocument({ ...validBackup, items: [validBackup.items[0], validBackup.items[0]] })).toMatchObject({ success: false, error: "内容编号重复" });
  });

  it("rejects missing project references", () => {
    const items = validBackup.items.map((item, index) => index === 0 ? { ...item, projectId: "missing" } : item);
    expect(validateBackupDocument({ ...validBackup, items })).toMatchObject({ success: false, error: "内容引用了不存在的项目" });
  });

  it("rejects missing relation endpoints and self relations", () => {
    expect(validateBackupDocument({ ...validBackup, relations: [{ ...validBackup.relations[0], targetItemId: "missing" }] })).toMatchObject({ success: false, error: "关联引用了不存在的内容" });
    expect(validateBackupDocument({ ...validBackup, relations: [{ ...validBackup.relations[0], targetItemId: "item-1" }] })).toMatchObject({ success: false, error: "关联不能指向内容自身" });
  });

  it("rejects equivalent duplicate relations", () => {
    const duplicate = { ...validBackup.relations[0], id: "relation-copy" };
    expect(validateBackupDocument({ ...validBackup, relations: [...validBackup.relations, duplicate] })).toMatchObject({ success: false, error: "关联重复" });
  });

  it("enforces the byte and record limits", () => {
    expect(validateBackupDocument(validBackup, 10 * 1024 * 1024 + 1)).toMatchObject({ success: false, error: "备份文件不能超过 10 MB" });
    const tooMany = { ...validBackup, items: Array.from({ length: 10_001 }, (_, index) => ({ ...validBackup.items[0], id: `item-${index}` })) };
    expect(validateBackupDocument(tooMany)).toMatchObject({ success: false, error: "备份记录不能超过 10000 条" });
  });

  it("rejects record identifiers that cannot fit the bounded D1 restore shape", () => {
    const oversizedId = "x".repeat(121);
    expect(validateBackupDocument({
      ...validBackup,
      projects: [{ ...validBackup.projects[0], id: oversizedId }],
      items: [],
      relations: [],
    })).toMatchObject({ success: false, error: "项目数据无效" });
    expect(validateBackupDocument({
      ...validBackup,
      items: [{ ...validBackup.items[0], id: oversizedId }],
      relations: [],
    })).toMatchObject({ success: false, error: "内容数据无效" });
    expect(validateBackupDocument({
      ...validBackup,
      relations: [{ ...validBackup.relations[0], id: oversizedId }],
    })).toMatchObject({ success: false, error: "关联数据无效" });
  });

  it("checks the complete serialized item against the restore parameter budget", () => {
    const escaped = "\u0001".repeat(19_439);
    const item = {
      ...validBackup.items[1],
      id: "i".repeat(120),
      title: "x",
      metadata: {
        role: escaped,
        coreDesire: escaped,
        innerConflict: escaped,
        traits: escaped,
        history: escaped,
        notes: escaped,
      },
    };

    expect(validateBackupDocument({
      ...validBackup,
      items: [item],
      relations: [],
    })).toMatchObject({ success: false, error: "内容数据无效" });
  });
});
