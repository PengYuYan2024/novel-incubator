import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WebMCPTools } from "@/components/webmcp-tools";
import type { ItemRecord } from "@/lib/domain/types";

type RegisteredTool = {
  name: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: unknown) => Promise<unknown> | unknown;
};

afterEach(() => {
  Reflect.deleteProperty(document, "modelContext");
});

describe("WebMCPTools", () => {
  it("registers one create tool and one read-only search tool using visible app actions", async () => {
    const tools: RegisteredTool[] = [];
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool: (tool: RegisteredTool) => {
          tools.push(tool);
        },
      },
    });
    const createdItem: ItemRecord = {
      id: "item-1",
      projectId: "project-1",
      projectTitle: "未命名长期小说",
      type: "inspiration",
      subtype: "idea",
      title: "",
      body: "一条灵感",
      status: "inbox",
      tags: [],
      metadata: {},
      searchText: "一条灵感",
      createdAt: "2026-09-11T08:00:00.000Z",
      updatedAt: "2026-09-11T08:00:00.000Z",
    };
    const createInspiration = vi.fn(async () => createdItem);
    const searchLibrary = vi.fn(async () => [{ id: "item-1", title: "线索" }]);
    const createdEvent = vi.fn();
    window.addEventListener("novel-incubator:item-created", createdEvent);
    render(<WebMCPTools createInspiration={createInspiration} searchLibrary={searchLibrary} />);
    await waitFor(() => expect(tools).toHaveLength(2));
    const create = tools.find((tool) => tool.name === "create_inspiration");
    const search = tools.find((tool) => tool.name === "search_library");
    expect(create?.annotations?.readOnlyHint).toBe(false);
    expect(search?.annotations?.readOnlyHint).toBe(true);
    await expect(create?.execute({ projectId: "project-1", body: "一条灵感" })).resolves.toEqual({ id: "item-1", status: "inbox" });
    expect(createdEvent).toHaveBeenCalledOnce();
    expect((createdEvent.mock.calls[0][0] as CustomEvent<ItemRecord>).detail).toEqual(createdItem);
    await expect(create?.execute({ projectId: "project-1", body: " " })).rejects.toThrow("请输入正文");
    await expect(search?.execute({ q: "线索" })).resolves.toEqual([{ id: "item-1", title: "线索" }]);
    window.removeEventListener("novel-incubator:item-created", createdEvent);
  });
});
