import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ItemForm } from "@/components/items/item-form";
import type { ProjectRecord } from "@/lib/domain/types";

const projects: ProjectRecord[] = [{
  id: "project-1",
  title: "未命名长期小说",
  genre: "待确定",
  logline: "",
  description: "",
  status: "warming",
  createdAt: "2026-09-10T08:00:00.000Z",
  updatedAt: "2026-09-10T08:00:00.000Z",
}];

describe("ItemForm", () => {
  it("shows every character field and keeps common input when type changes", async () => {
    const user = userEvent.setup();
    render(<ItemForm projects={projects} onSubmit={vi.fn()} />);
    await user.type(screen.getByRole("textbox", { name: "标题（可选）" }), "先写下的名字");
    await user.selectOptions(screen.getByRole("combobox", { name: "内容类型" }), "character");
    expect(screen.getByRole("textbox", { name: "姓名" })).toHaveValue("先写下的名字");
    for (const label of ["角色定位", "核心欲望", "内在矛盾", "性格特征", "人物经历", "备注"]) {
      expect(screen.getByRole("textbox", { name: label })).toBeInTheDocument();
    }
  });

  it("shows all world categories and rule fields", async () => {
    const user = userEvent.setup();
    render(<ItemForm projects={projects} onSubmit={vi.fn()} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "内容类型" }), "world");
    const category = screen.getByRole("combobox", { name: "分类" });
    for (const label of ["地点", "势力", "制度", "历史", "文化", "规则", "物品"]) {
      expect(screen.getByRole("option", { name: label })).toBeInTheDocument();
    }
    expect(category).toHaveValue("location");
    expect(screen.getByRole("textbox", { name: "简介" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "详细规则" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "限制或代价" })).toBeInTheDocument();
  });

  it("submits a complete normalized character card", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    render(<ItemForm projects={projects} onSubmit={onSubmit} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "内容类型" }), "character");
    await user.type(screen.getByRole("textbox", { name: "姓名" }), "林见秋");
    await user.type(screen.getByRole("textbox", { name: "核心欲望" }), "找到回家的路");
    await user.type(screen.getByRole("textbox", { name: "标签" }), "主角,成长");
    await user.click(screen.getByRole("button", { name: "保存人物卡" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-1",
      type: "character",
      title: "林见秋",
      tags: ["主角", "成长"],
      metadata: expect.objectContaining({ coreDesire: "找到回家的路" }),
    }));
  });
});
