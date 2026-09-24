import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { ItemFilters } from "@/components/items/item-filters";
import type { ProjectRecord } from "@/lib/domain/types";

const project: ProjectRecord = {
  id: "project-1",
  title: "未命名长期小说",
  genre: "待确定",
  logline: "",
  description: "",
  status: "warming",
  createdAt: "2026-09-10T08:00:00.000Z",
  updatedAt: "2026-09-10T08:00:00.000Z",
};

const previousTimezone = process.env.TZ;

beforeAll(() => {
  process.env.TZ = "Asia/Shanghai";
});

afterAll(() => {
  process.env.TZ = previousTimezone;
});

describe("ItemFilters", () => {
  it("emits combinable keyword, project, maturity, tag, and date values", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ItemFilters filters={{}} projects={[project]} onChange={onChange} onClear={vi.fn()} />);
    await user.type(screen.getByRole("searchbox", { name: "搜索资料库" }), "车站");
    expect(onChange).toHaveBeenLastCalledWith({ q: "站" });
    await user.selectOptions(screen.getByRole("combobox", { name: "所属项目筛选" }), "project-1");
    expect(onChange).toHaveBeenLastCalledWith({ projectId: "project-1" });
    await user.selectOptions(screen.getByRole("combobox", { name: "成熟度筛选" }), "ready");
    expect(onChange).toHaveBeenLastCalledWith({ status: "ready" });
    await user.type(screen.getByRole("textbox", { name: "标签筛选" }), "伏笔");
    expect(onChange).toHaveBeenLastCalledWith({ tag: "笔" });
    await user.type(screen.getByLabelText("更新开始日期"), "2026-09-01");
    expect(onChange).toHaveBeenLastCalledWith({ updatedFrom: "2026-09-01" });
    await user.type(screen.getByLabelText("更新结束日期"), "2026-09-12");
    expect(onChange).toHaveBeenLastCalledWith({ updatedTo: "2026-09-12" });
  });
});
