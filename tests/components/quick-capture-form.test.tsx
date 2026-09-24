import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QuickCaptureForm } from "@/components/dashboard/quick-capture-form";
import { mergeSavedItemIntoDashboard } from "@/lib/client/dashboard";
import type {
  DashboardData,
  ItemRecord,
  ProjectRecord,
} from "@/lib/domain/types";

const project: ProjectRecord = {
  id: "project-1",
  title: "未命名长期小说",
  genre: "待确定",
  logline: "",
  description: "",
  status: "warming",
  createdAt: "2026-09-10T08:00:00.000Z",
  updatedAt: "2026-09-10T08:00:00.000Z",
  counts: { inspiration: 1, character: 1, world: 1 },
};

const savedItem: ItemRecord = {
  id: "item-new",
  projectId: project.id,
  projectTitle: project.title,
  type: "inspiration",
  subtype: "idea",
  title: "",
  body: "新灵感",
  status: "inbox",
  tags: ["伏笔"],
  metadata: {},
  searchText: "新灵感",
  createdAt: "2026-09-10T12:00:00.000Z",
  updatedAt: "2026-09-10T12:00:00.000Z",
};

afterEach(() => localStorage.clear());

describe("QuickCaptureForm", () => {
  it("keeps the draft when saving fails", async () => {
    const user = userEvent.setup();
    render(
      <QuickCaptureForm
        projects={[project]}
        saveItem={async () => {
          throw new Error("暂时无法保存");
        }}
      />,
    );
    await user.type(screen.getByRole("textbox", { name: "正文" }), "不要丢掉这句话");
    await user.click(screen.getByRole("button", { name: "保存记录" }));
    expect(screen.getByDisplayValue("不要丢掉这句话")).toBeInTheDocument();
    expect(await screen.findByText("暂时无法保存")).toBeInTheDocument();
  });

  it("saves normalized input and offers continue and organize actions", async () => {
    const user = userEvent.setup();
    const saveItem = vi.fn(async () => savedItem);
    render(<QuickCaptureForm projects={[project]} saveItem={saveItem} />);
    await user.type(screen.getByRole("textbox", { name: "正文" }), "新灵感");
    await user.type(screen.getByRole("textbox", { name: "标签" }), " 伏笔,人物,伏笔 ");
    await user.click(screen.getByRole("button", { name: "保存记录" }));
    expect(saveItem).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: project.id,
        body: "新灵感",
        status: "inbox",
        tags: ["伏笔", "人物"],
      }),
    );
    expect(await screen.findByRole("button", { name: "继续记录" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打开整理" })).toHaveAttribute(
      "href",
      `/items/${savedItem.id}`,
    );
  });

  it("clears the written fields but keeps the project when continuing", async () => {
    const user = userEvent.setup();
    render(<QuickCaptureForm projects={[project]} saveItem={async () => savedItem} />);
    await user.type(screen.getByRole("textbox", { name: "标题（可选）" }), "标题");
    await user.type(screen.getByRole("textbox", { name: "正文" }), "正文");
    await user.click(screen.getByRole("button", { name: "保存记录" }));
    await user.click(await screen.findByRole("button", { name: "继续记录" }));
    expect(screen.getByRole("textbox", { name: "标题（可选）" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "正文" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "所属项目" })).toHaveValue(project.id);
  });

  it("turns Enter in the tag field into a tag instead of submitting the form", async () => {
    const user = userEvent.setup();
    const saveItem = vi.fn(async () => savedItem);
    render(<QuickCaptureForm projects={[project]} saveItem={saveItem} />);

    await user.type(screen.getByRole("textbox", { name: "标签" }), "伏笔{Enter}");

    expect(saveItem).not.toHaveBeenCalled();
    expect(screen.getByText("#伏笔")).toBeInTheDocument();
  });
});

describe("dashboard optimistic update", () => {
  it("prepends a capture and synchronizes visible totals", () => {
    const dashboard: DashboardData = {
      inboxCount: 1,
      todayCount: 1,
      statusCounts: { inbox: 1, seed: 2, growing: 0, ready: 0, archived: 0 },
      recentProjects: [project],
      recentItems: [],
    };
    const next = mergeSavedItemIntoDashboard(dashboard, savedItem);
    expect(next.inboxCount).toBe(2);
    expect(next.todayCount).toBe(2);
    expect(next.statusCounts.inbox).toBe(2);
    expect(next.recentItems[0].id).toBe(savedItem.id);
    expect(next.recentProjects[0].updatedAt).toBe(savedItem.updatedAt);
  });
});
