import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ItemList } from "@/components/items/item-list";
import type { ItemRecord } from "@/lib/domain/types";

const item: ItemRecord = {
  id: "item-1",
  projectId: "project-1",
  projectTitle: "未命名长期小说",
  type: "world",
  subtype: "location",
  title: "旧车站",
  body: "雨停之后仍有人等车。",
  status: "growing",
  tags: ["地点", "雨夜"],
  metadata: { rules: "", cost: "" },
  searchText: "旧车站 雨停之后仍有人等车",
  createdAt: "2026-09-10T08:00:00.000Z",
  updatedAt: "2026-09-11T07:00:00.000Z",
};

describe("ItemList", () => {
  it("labels every result with type, project, and maturity", () => {
    render(<ItemList items={[item]} hasFilters={false} onClearFilters={vi.fn()} />);
    expect(screen.getByRole("link", { name: /旧车站/ })).toHaveAttribute("href", "/items/item-1");
    expect(screen.getByText("世界观设定")).toBeInTheDocument();
    expect(screen.getByText("未命名长期小说")).toBeInTheDocument();
    expect(screen.getByText("生长中")).toBeInTheDocument();
  });

  it("keeps an empty filtered state recoverable", async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();
    render(<ItemList items={[]} hasFilters onClearFilters={onClearFilters} />);
    expect(screen.getByText("没有找到符合条件的内容")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "清除筛选" }));
    expect(onClearFilters).toHaveBeenCalledOnce();
  });
});
