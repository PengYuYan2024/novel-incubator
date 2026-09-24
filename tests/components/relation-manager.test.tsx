import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RelationManager } from "@/components/items/relation-manager";
import type { ItemRecord, RelationView } from "@/lib/domain/types";

const self: ItemRecord = {
  id: "self",
  projectId: "project-1",
  projectTitle: "未命名长期小说",
  type: "character",
  subtype: null,
  title: "林见秋",
  body: "",
  status: "seed",
  tags: [],
  metadata: { role: "主角", coreDesire: "", innerConflict: "", traits: "", history: "", notes: "" },
  searchText: "林见秋",
  createdAt: "2026-09-10T08:00:00.000Z",
  updatedAt: "2026-09-10T08:00:00.000Z",
};

const counterpart: ItemRecord = {
  ...self,
  id: "other",
  type: "world",
  subtype: "location",
  title: "旧车站",
  metadata: { rules: "", cost: "" },
  searchText: "旧车站",
};

const relation: RelationView = {
  id: "relation-1",
  sourceItemId: self.id,
  targetItemId: counterpart.id,
  relationType: "appears_in",
  note: "第一幕",
  createdAt: "2026-09-10T09:00:00.000Z",
  viewerSide: "source",
  label: "出场于",
  counterpart,
};

describe("RelationManager", () => {
  it("shows viewer-facing relation labels and excludes the current item from search", async () => {
    const user = userEvent.setup();
    render(
      <RelationManager
        item={self}
        relations={[relation]}
        searchCandidates={async () => [self, counterpart]}
        createRelation={vi.fn()}
        deleteRelation={vi.fn()}
      />,
    );
    expect(screen.getByText("出场于")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "旧车站" })).toHaveAttribute("href", "/items/other");
    await user.type(screen.getByRole("searchbox", { name: "搜索关联内容" }), "车站");
    await user.click(screen.getByRole("button", { name: "搜索内容" }));
    expect(
      await screen.findByRole("button", { name: "旧车站 · 未命名长期小说" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /林见秋/ })).not.toBeInTheDocument();
  });

  it("requires confirmation before removing a relation", async () => {
    const user = userEvent.setup();
    const deleteRelation = vi.fn(async () => undefined);
    render(
      <RelationManager
        item={self}
        relations={[relation]}
        searchCandidates={async () => []}
        createRelation={vi.fn()}
        deleteRelation={deleteRelation}
      />,
    );
    await user.click(screen.getByRole("button", { name: "取消与旧车站的关联" }));
    expect(deleteRelation).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "确认取消" }));
    expect(deleteRelation).toHaveBeenCalledWith("relation-1");
  });

  it("explains when a relation search has no matches", async () => {
    const user = userEvent.setup();
    render(
      <RelationManager
        item={self}
        relations={[]}
        searchCandidates={async () => []}
        createRelation={vi.fn()}
        deleteRelation={vi.fn()}
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: "搜索关联内容" }), "不存在");
    await user.click(screen.getByRole("button", { name: "搜索内容" }));

    expect(await screen.findByText("没有找到可关联的内容")).toBeInTheDocument();
  });
});
