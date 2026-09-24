import { describe, expect, it } from "vitest";

import {
  filterProjectItems,
  projectMaturityCounts,
} from "@/lib/client/project-view";
import type { ItemRecord } from "@/lib/domain/types";

const base: ItemRecord = {
  id: "one",
  projectId: "project-1",
  type: "inspiration",
  subtype: "idea",
  title: "第一条",
  body: "",
  status: "seed",
  tags: ["伏笔"],
  metadata: {},
  searchText: "第一条",
  createdAt: "2026-09-10T08:00:00.000Z",
  updatedAt: "2026-09-11T08:00:00.000Z",
};

const items: ItemRecord[] = [
  base,
  { ...base, id: "two", type: "character", subtype: null, title: "角色", status: "growing", tags: ["主角"], metadata: { role: "", coreDesire: "", innerConflict: "", traits: "", history: "", notes: "" } },
  { ...base, id: "three", type: "world", subtype: "rule", title: "规则", status: "seed", tags: ["伏笔", "规则"], metadata: { rules: "", cost: "" } },
];

describe("project detail view", () => {
  it("counts every maturity state", () => {
    expect(projectMaturityCounts(items)).toEqual({ inbox: 0, seed: 2, growing: 1, ready: 0, archived: 0 });
  });

  it("combines maturity and tag filters", () => {
    expect(filterProjectItems(items, { status: "seed", tag: "伏笔" }).map((item) => item.id)).toEqual(["one", "three"]);
    expect(filterProjectItems(items, { status: "growing", tag: "伏笔" })).toEqual([]);
  });
});
