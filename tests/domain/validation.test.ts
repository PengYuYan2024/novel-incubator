import { describe, expect, it } from "vitest";

import {
  validateItem,
  validateProject,
  validateRelation,
} from "@/lib/domain/validation";

const projectBase = {
  title: " 未命名长期小说 ",
  genre: " 待确定 ",
  logline: " 一部慢慢积累的小说。 ",
  description: " ",
};

describe("project validation", () => {
  it("accepts and normalizes every supported project stage", () => {
    const stages = [
      "warming",
      "forming",
      "writing",
      "revising",
      "paused",
      "completed",
      "archived",
    ] as const;

    for (const status of stages) {
      const result = validateProject({ ...projectBase, status });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("未命名长期小说");
        expect(result.data.genre).toBe("待确定");
      }
    }
  });

  it("rejects a project without a name", () => {
    const result = validateProject({ ...projectBase, title: "  ", status: "warming" });
    expect(result.success).toBe(false);
  });
});

describe("item validation", () => {
  it("rejects a quick capture whose body is blank", () => {
    const result = validateItem({
      projectId: "project-1",
      type: "inspiration",
      subtype: "idea",
      title: "",
      body: "   ",
      status: "inbox",
      tags: [],
      metadata: {},
    });
    expect(result.success).toBe(false);
  });

  it("normalizes and deduplicates Chinese tags", () => {
    const result = validateItem({
      projectId: "project-1",
      type: "inspiration",
      subtype: "dialogue",
      title: " 一句话 ",
      body: " 对话正文 ",
      status: "seed",
      tags: [" 伏笔 ", "人物", "伏笔", ""],
      metadata: {},
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual(["伏笔", "人物"]);
      expect(result.data.title).toBe("一句话");
      expect(result.data.body).toBe("对话正文");
    }
  });

  it("requires a character name", () => {
    const result = validateItem({
      projectId: "project-1",
      type: "character",
      subtype: null,
      title: " ",
      body: "",
      status: "growing",
      tags: [],
      metadata: {
        role: "主角",
        coreDesire: "回家",
        innerConflict: "不敢面对过去",
        traits: "谨慎",
        history: "",
        notes: "",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unsupported world category", () => {
    const result = validateItem({
      projectId: "project-1",
      type: "world",
      subtype: "planet",
      title: "远方",
      body: "简介",
      status: "ready",
      tags: [],
      metadata: { rules: "", cost: "" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects oversized type-specific text before it reaches D1", () => {
    const result = validateItem({
      projectId: "project-1",
      type: "character",
      subtype: null,
      title: "林见秋",
      body: "",
      status: "growing",
      tags: [],
      metadata: {
        role: "主角",
        coreDesire: "回家",
        innerConflict: "不敢面对过去",
        traits: "谨慎",
        history: "经历".repeat(25_001),
        notes: "",
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: ["metadata", "history"] }),
      ]));
    }
  });

  it("rejects an aggregate multibyte payload that would exceed the safe D1 row budget", () => {
    const multibyteText = `${"😀".repeat(10_000)}${"界".repeat(30_000)}`;
    const result = validateItem({
      projectId: "project-1",
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
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({
          path: [],
          message: "内容总量过大，请缩短正文或资料字段后再保存",
        }),
      ]));
    }
  });

  it("rejects text whose JSON escaping would exceed the restore parameter budget", () => {
    const escapedMetadata = "\\".repeat(50_000);
    const result = validateItem({
      projectId: "project-1",
      type: "character",
      subtype: null,
      title: "JSON 边界人物",
      body: "\u0001".repeat(50_000),
      status: "growing",
      tags: [],
      metadata: {
        role: escapedMetadata,
        coreDesire: escapedMetadata,
        innerConflict: escapedMetadata,
        traits: escapedMetadata,
        history: escapedMetadata,
        notes: escapedMetadata,
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: [] }),
      ]));
    }
  });
});

describe("relation validation", () => {
  it("rejects a self relation", () => {
    const result = validateRelation({
      sourceItemId: "same",
      targetItemId: "same",
      relationType: "related",
      note: "",
    });
    expect(result.success).toBe(false);
  });
});
