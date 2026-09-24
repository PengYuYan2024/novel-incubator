"use client";

import { useEffect } from "react";

import { apiRequest } from "@/lib/client/api";
import { buildItemQuery } from "@/lib/client/item-filters";
import type { ItemInput, ItemRecord } from "@/lib/domain/types";
import { validateItem } from "@/lib/domain/validation";

type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => Promise<unknown>;
};

type ModelContext = {
  registerTool: (tool: ToolDefinition, options?: { signal?: AbortSignal }) => void | Promise<void>;
};

declare global {
  interface Document {
    readonly modelContext?: ModelContext;
  }
}

type Props = {
  createInspiration?: (input: ItemInput) => Promise<ItemRecord>;
  searchLibrary?: (input: Record<string, unknown>) => Promise<unknown>;
};

async function defaultCreate(input: ItemInput) {
  return apiRequest<ItemRecord>("/api/items", { method: "POST", body: JSON.stringify(input) });
}

async function defaultSearch(input: Record<string, unknown>) {
  const query = buildItemQuery({
    q: typeof input.q === "string" ? input.q : undefined,
    projectId: typeof input.projectId === "string" ? input.projectId : undefined,
    type: input.type === "inspiration" || input.type === "character" || input.type === "world" ? input.type : undefined,
    status: input.status === "inbox" || input.status === "seed" || input.status === "growing" || input.status === "ready" || input.status === "archived" ? input.status : undefined,
    includeArchived: input.status === "archived",
  });
  const items = await apiRequest<ItemRecord[]>(`/api/items${query ? `?${query}` : ""}`);
  return items.slice(0, 50).map((item) => ({
    id: item.id,
    title: item.title || item.body.slice(0, 60),
    type: item.type,
    project: item.projectTitle,
    status: item.status,
  }));
}

function inputObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("输入必须是对象");
  return value as Record<string, unknown>;
}

export function WebMCPTools({ createInspiration = defaultCreate, searchLibrary = defaultSearch }: Props) {
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const createTool: ToolDefinition = {
      name: "create_inspiration",
      title: "记录小说灵感",
      description: "在指定小说项目的收集箱中创建一条灵感，并返回新内容编号。",
      inputSchema: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "所属项目编号" },
          body: { type: "string", description: "灵感正文" },
          title: { type: "string", description: "可选标题" },
          subtype: { type: "string", enum: ["idea", "plot", "dialogue", "scene", "question"] },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["projectId", "body"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(value) {
        const input = inputObject(value);
        const parsed = validateItem({
          projectId: input.projectId,
          type: "inspiration",
          subtype: typeof input.subtype === "string" ? input.subtype : "idea",
          title: typeof input.title === "string" ? input.title : "",
          body: input.body,
          status: "inbox",
          tags: Array.isArray(input.tags) ? input.tags : [],
          metadata: {},
        });
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "灵感内容无效");
        const item = await createInspiration(parsed.data);
        window.dispatchEvent(new CustomEvent<ItemRecord>("novel-incubator:item-created", { detail: item }));
        return { id: item.id, status: item.status };
      },
    };
    const searchTool: ToolDefinition = {
      name: "search_library",
      title: "搜索小说资料库",
      description: "按关键词及可选项目、内容类型、成熟度搜索资料库。",
      inputSchema: {
        type: "object",
        properties: {
          q: { type: "string" },
          projectId: { type: "string" },
          type: { type: "string", enum: ["inspiration", "character", "world"] },
          status: { type: "string", enum: ["inbox", "seed", "growing", "ready", "archived"] },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(value) {
        return searchLibrary(inputObject(value));
      },
    };
    for (const tool of [createTool, searchTool]) {
      try {
        void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch((error) => console.error("WebMCP registration failed", error));
      } catch (error) {
        console.error("WebMCP registration failed", error);
      }
    }
    return () => lifecycle.abort();
  }, [createInspiration, searchLibrary]);

  return null;
}
