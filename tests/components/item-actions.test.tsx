import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ItemActions } from "@/components/items/item-actions";
import type { ItemRecord } from "@/lib/domain/types";

const item: ItemRecord = {
  id: "item-1",
  projectId: "project-1",
  projectTitle: "未命名长期小说",
  type: "inspiration",
  subtype: "idea",
  title: "旧车站",
  body: "一段灵感",
  status: "seed",
  tags: [],
  metadata: {},
  searchText: "旧车站 一段灵感",
  createdAt: "2026-09-10T08:00:00.000Z",
  updatedAt: "2026-09-10T08:00:00.000Z",
};

describe("ItemActions", () => {
  it("allows direct maturity changes", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn(async () => undefined);
    render(<ItemActions item={item} busy={false} onEdit={vi.fn()} onStatusChange={onStatusChange} onDelete={vi.fn()} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "直接修改成熟度" }), "ready");
    expect(onStatusChange).toHaveBeenCalledWith("ready");
  });

  it("does not delete until the confirmation action", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => undefined);
    render(<ItemActions item={item} busy={false} onEdit={vi.fn()} onStatusChange={vi.fn()} onDelete={onDelete} />);
    await user.click(screen.getByRole("button", { name: "永久删除" }));
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "确认永久删除" }));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
