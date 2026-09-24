import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { QuickCaptureForm } from "@/components/dashboard/quick-capture-form";
import { ProjectForm } from "@/components/projects/project-form";
import { ItemForm } from "@/components/items/item-form";
import { DraftDialog } from "@/components/drafts/draft-dialog";
import { DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import { apiRequest } from "@/lib/client/api";
import type { ProjectRecord } from "@/lib/domain/types";

const project: ProjectRecord = { id: "p", title: "测试", genre: "", logline: "", description: "", status: "warming", createdAt: "2026-09-20T00:00:00Z", updatedAt: "2026-09-20T00:00:00Z" };
test("recovery discard cannot delete a live source form draft", async () => {
  const first = render(<ProjectForm onSubmit={vi.fn()} />);
  fireEvent.change(within(first.container).getByLabelText("项目名称"), { target: { value: "原标签页" } });
  fireEvent(window, new PageTransitionEvent("pagehide", { persisted: true }));
  const sourceKeys = Object.keys(localStorage);
  const second = render(<ProjectForm onSubmit={vi.fn()} />);
  fireEvent.click(await within(second.container).findByRole("button", { name: "恢复草稿" }));
  fireEvent.click(within(second.container).getByRole("button", { name: "丢弃当前修改" }));
  fireEvent.click(within(second.container).getByRole("button", { name: "确认丢弃" }));
  expect(sourceKeys.every(key => localStorage.getItem(key) !== null)).toBe(true);
});
test("undoing all edits removes the obsolete owned draft", async () => {
  const first = render(<ProjectForm onSubmit={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("项目名称"), { target: { value: "撤回" } });
  fireEvent(window, new Event("pagehide"));
  fireEvent.change(screen.getByLabelText("项目名称"), { target: { value: "" } });
  first.unmount();
  expect(Object.keys(localStorage).filter(key => key.startsWith("novel-incubator:draft:"))).toHaveLength(0);
});
test("success consumes a recovered draft whose original form has closed", async () => {
  const first = render(<ProjectForm onSubmit={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("项目名称"), { target: { value: "可清除" } });
  first.unmount();
  render(<ProjectForm onSubmit={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "恢复草稿" }));
  fireEvent.click(screen.getByRole("button", { name: "保存项目" }));
  await waitFor(() => expect(Object.keys(localStorage).filter(key => key.startsWith("novel-incubator:draft:"))).toHaveLength(0));
});
test("missing item project shows a placeholder and allows explicit reassignment", async () => {
  const first = render(<ItemForm projects={[project]} onSubmit={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("正文"), { target: { value: "保留正文" } });
  first.unmount();
  render(<ItemForm projects={[{ ...project, id: "another" }]} onSubmit={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "恢复草稿" }));
  expect(screen.getByLabelText("所属项目")).toHaveValue("");
  fireEvent.change(screen.getByLabelText("所属项目"), { target: { value: "another" } });
  expect(screen.getByRole("button", { name: "保存灵感记录" })).not.toBeDisabled();
});
afterEach(() => { cleanup(); localStorage.clear(); vi.useRealTimers(); vi.unstubAllGlobals(); });

test("invalid save confirmation retains form and draft", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ data: null })));
  const onSaved = vi.fn();
  render(<ProjectForm onSubmit={() => apiRequest("/api/projects", { method: "POST" })} onSaved={onSaved} />);
  fireEvent.change(screen.getByLabelText("项目名称"), { target: { value: "未确认不清除" } });
  fireEvent.click(screen.getByRole("button", { name: "保存项目" }));
  await screen.findByText(/尚未确认保存结果/);
  expect(onSaved).not.toHaveBeenCalled();
  expect(screen.getByLabelText("项目名称")).toHaveValue("未确认不清除");
  expect(Object.keys(localStorage).some(key => key.startsWith("novel-incubator:draft:"))).toBe(true);
});
test("world fields and Chinese composition survive recovery", async () => {
  const first = render(<ItemForm projects={[project]} onSubmit={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("内容类型"), { target: { value: "world" } });
  fireEvent.compositionStart(screen.getByLabelText("详细规则"));
  fireEvent.change(screen.getByLabelText("详细规则"), { target: { value: "中文输入规则".repeat(100) } });
  fireEvent.compositionEnd(screen.getByLabelText("详细规则"));
  fireEvent.change(screen.getByLabelText("限制或代价"), { target: { value: "限制条件" } });
  first.unmount();
  render(<ItemForm projects={[project]} onSubmit={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "恢复草稿" }));
  expect(screen.getByLabelText("详细规则")).toHaveValue("中文输入规则".repeat(100));
  expect(screen.getByLabelText("限制或代价")).toHaveValue("限制条件");
});

test("quick capture flushes on unmount and offers explicit recovery without replacing input", async () => {
  const first = render(<QuickCaptureForm projects={[project]} saveItem={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("正文"), { target: { value: "中文草稿\n第二行" } });
  first.unmount();
  render(<QuickCaptureForm projects={[project]} saveItem={vi.fn()} />);
  expect(screen.getByLabelText("正文")).toHaveValue("");
  fireEvent.click(await screen.findByRole("button", { name: "恢复草稿" }));
  expect(screen.getByLabelText("正文")).toHaveValue("中文草稿\n第二行");
});

test("project draft is persisted after 500ms and retained when saving fails", async () => {
  vi.useFakeTimers();
  render(<ProjectForm onSubmit={async () => { throw new Error("测试失败"); }} />);
  fireEvent.change(screen.getByLabelText("项目名称"), { target: { value: "长期小说草稿" } });
  act(() => { vi.advanceTimersByTime(499); });
  expect(screen.queryByText("草稿已暂存于当前浏览器")).not.toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(1); });
  expect(screen.getByText("草稿已暂存于当前浏览器")).toBeInTheDocument();
  vi.useRealTimers();
  fireEvent.click(screen.getByRole("button", { name: "保存项目" }));
  await screen.findByText("测试失败");
  cleanup();
  render(<ProjectForm onSubmit={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "恢复草稿" }));
  expect(screen.getByLabelText("项目名称")).toHaveValue("长期小说草稿");
});

test("saving locks fields and successful save does not resurrect a draft on unmount", async () => {
  let resolve!: () => void;
  const pending = new Promise<void>(r => { resolve = r; });
  const view = render(<ProjectForm onSubmit={() => pending} />);
  fireEvent.change(screen.getByLabelText("项目名称"), { target: { value: "已提交" } });
  fireEvent.click(screen.getByRole("button", { name: "保存项目" }));
  expect(screen.getByLabelText("项目名称")).toBeDisabled();
  await act(async () => resolve());
  view.unmount();
  render(<ProjectForm onSubmit={vi.fn()} />);
  await waitFor(() => expect(screen.queryByRole("button", { name: "恢复草稿" })).not.toBeInTheDocument());
});

test("storage denial keeps text editable and never claims a successful autosave", async () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
  render(<ProjectForm onSubmit={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("项目名称"), { target: { value: "仍保留" } });
  fireEvent(window, new Event("pagehide"));
  expect(await screen.findByText(/草稿暂存失败/)).toBeInTheDocument();
  expect(screen.queryByText("草稿已暂存于当前浏览器")).not.toBeInTheDocument();
  expect(screen.getByLabelText("项目名称")).toHaveValue("仍保留");
});

test("a restored stale project draft cannot overwrite a newer cloud version", async () => {
  const first = render(<ProjectForm initialProject={project} onSubmit={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("项目说明"), { target: { value: "旧版本草稿" } });
  first.unmount();
  const submit = vi.fn();
  render(<ProjectForm initialProject={{ ...project, updatedAt: "2026-09-21T00:00:00Z" }} onSubmit={submit} />);
  fireEvent.click(await screen.findByRole("button", { name: "恢复草稿" }));
  expect(screen.getByText(/云端资料已更新/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "保存项目" })).toBeDisabled();
  expect(screen.getByLabelText("项目说明")).toHaveValue("旧版本草稿");
});

test("deleted project drafts are not silently assigned to the first available project", async () => {
  const first = render(<QuickCaptureForm projects={[project]} saveItem={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("正文"), { target: { value: "不要转移" } });
  first.unmount();
  render(<QuickCaptureForm projects={[{ ...project, id: "another" }]} saveItem={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "恢复草稿" }));
  expect(screen.getByRole("button", { name: "保存记录" })).toBeDisabled();
  expect(screen.getByLabelText("正文")).toHaveValue("不要转移");
});

test("clean form does not block unload, dirty form flushes and requests a warning", () => {
  render(<ProjectForm onSubmit={vi.fn()} />);
  const clean = new Event("beforeunload", { cancelable: true });
  fireEvent(window, clean);
  expect(clean.defaultPrevented).toBe(false);
  fireEvent.change(screen.getByLabelText("项目名称"), { target: { value: "待提交" } });
  const dirty = new Event("beforeunload", { cancelable: true });
  fireEvent(window, dirty);
  expect(dirty.defaultPrevented).toBe(true);
  expect(screen.getByText("草稿已暂存于当前浏览器")).toBeInTheDocument();
});

test("character-specific fields and tags survive explicit draft recovery", async () => {
  const first = render(<ItemForm projects={[project]} onSubmit={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("内容类型"), { target: { value: "character" } });
  fireEvent.change(screen.getByLabelText("姓名"), { target: { value: "测试角色" } });
  fireEvent.change(screen.getByLabelText("核心欲望"), { target: { value: "寻找答案" } });
  fireEvent.change(screen.getByLabelText("标签"), { target: { value: "人物，长线" } });
  first.unmount();
  render(<ItemForm projects={[project]} onSubmit={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "恢复草稿" }));
  expect(screen.getByLabelText("核心欲望")).toHaveValue("寻找答案");
  expect(screen.getByLabelText("标签")).toHaveValue("人物，长线");
});

test("cancel and escape use a three-way guard, keep closes and restores later", async () => {
  function Example() {
    const [open, setOpen] = useState(true);
    return <><button onClick={() => setOpen(true)}>打开表单</button><DraftDialog open={open} onOpenChange={setOpen}><DialogContent><DialogTitle>项目</DialogTitle><DialogDescription>测试表单</DialogDescription><ProjectForm onSubmit={vi.fn()} onCancel={() => setOpen(false)} /></DialogContent></DraftDialog></>;
  }
  render(<Example />);
  fireEvent.change(screen.getByLabelText("项目名称"), { target: { value: "关闭保留" } });
  fireEvent.click(screen.getByRole("button", { name: /^取消$/ }));
  expect(await screen.findByRole("button", { name: "保留草稿并关闭" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "继续编辑" }));
  fireEvent.keyDown(screen.getByLabelText("项目名称"), { key: "Escape" });
  fireEvent.click(await screen.findByRole("button", { name: "保留草稿并关闭" }));
  fireEvent.click(screen.getByRole("button", { name: "打开表单" }));
  fireEvent.click(await screen.findByRole("button", { name: "恢复草稿" }));
  expect(screen.getByLabelText("项目名称")).toHaveValue("关闭保留");
});
