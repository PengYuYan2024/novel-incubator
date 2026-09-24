import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProjectActions } from "@/components/projects/project-actions";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectForm } from "@/components/projects/project-form";
import type { ProjectRecord } from "@/lib/domain/types";

const project: ProjectRecord = {
  id: "project-1",
  title: "未命名长期小说",
  genre: "待确定",
  logline: "一部慢慢积累的小说。",
  description: "",
  status: "warming",
  createdAt: "2026-09-10T08:00:00.000Z",
  updatedAt: "2026-09-11T07:00:00.000Z",
  counts: { inspiration: 3, character: 2, world: 4 },
};

describe("ProjectForm", () => {
  it("offers all seven project stages and submits the complete form", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    render(<ProjectForm onSubmit={onSubmit} />);
    const status = screen.getByRole("combobox", { name: "当前阶段" });
    for (const label of ["预热积累", "构思成形", "正在创作", "修改打磨", "暂停", "已完成", "已归档"]) {
      expect(screen.getByRole("option", { name: label })).toBeInTheDocument();
    }
    await user.type(screen.getByRole("textbox", { name: "项目名称" }), "北岸");
    await user.type(screen.getByRole("textbox", { name: "类型" }), "待确定");
    await user.type(screen.getByRole("textbox", { name: "一句话梗概" }), "一个尚未定形的故事。");
    await user.selectOptions(status, "forming");
    await user.click(screen.getByRole("button", { name: "保存项目" }));
    expect(onSubmit).toHaveBeenCalledWith({
      title: "北岸",
      genre: "待确定",
      logline: "一个尚未定形的故事。",
      description: "",
      status: "forming",
    });
  });
});

describe("ProjectCard", () => {
  it("shows stage, update time, and active counts for all three content types", () => {
    render(<ProjectCard project={project} />);
    expect(screen.getByRole("link", { name: /未命名长期小说/ })).toHaveAttribute("href", "/projects/project-1");
    expect(screen.getByText("预热积累")).toBeInTheDocument();
    expect(screen.getByText("3 条灵感")).toBeInTheDocument();
    expect(screen.getByText("2 位人物")).toBeInTheDocument();
    expect(screen.getByText("4 条设定")).toBeInTheDocument();
  });
});

describe("ProjectActions", () => {
  it("explains why a non-empty project cannot be permanently deleted", async () => {
    const user = userEvent.setup();
    render(<ProjectActions project={project} busy={false} onEdit={vi.fn()} onStatusChange={vi.fn()} onDelete={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "删除项目" }));
    expect(screen.getByText("请先迁移或删除项目中的 9 条内容")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "确认删除项目" })).not.toBeInTheDocument();
  });

  it("requires confirmation before deleting an empty project", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => undefined);
    render(<ProjectActions project={{ ...project, counts: { inspiration: 0, character: 0, world: 0 } }} busy={false} onEdit={vi.fn()} onStatusChange={vi.fn()} onDelete={onDelete} />);
    await user.click(screen.getByRole("button", { name: "删除项目" }));
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "确认删除项目" }));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
