import {
  CONTENT_STATUSES,
  ITEM_TYPES,
} from "@/lib/domain/constants";
import type { ContentStatus, ItemFilters, ItemType } from "@/lib/domain/types";
import { DomainError } from "./errors";

const statusByCode: Record<string, number> = {
  VALIDATION_ERROR: 400,
  PROJECT_NOT_FOUND: 404,
  ITEM_NOT_FOUND: 404,
  RELATION_NOT_FOUND: 404,
  PROJECT_NOT_EMPTY: 409,
  DUPLICATE_RELATION: 409,
  STALE_WRITE: 409,
  BACKUP_INVALID: 400,
};

export function dataResponse<T>(data: T, status = 200): Response {
  return Response.json(
    { data },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function errorResponse(
  code: string,
  message: string,
  status: number,
  fields?: Record<string, string[]>,
): Response {
  return Response.json(
    { error: { code, message, ...(fields ? { fields } : {}) } },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export async function routeResponse(task: () => Promise<Response>): Promise<Response> {
  try {
    return await task();
  } catch (error) {
    if (error instanceof DomainError) {
      return errorResponse(
        error.code,
        error.message,
        statusByCode[error.code] ?? 400,
        error.fields,
      );
    }
    if (error instanceof SyntaxError) {
      return errorResponse("INVALID_JSON", "请求内容不是有效的 JSON", 400);
    }
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("D1 binding") ||
      message.includes("no such table") ||
      message.includes("database is not available")
    ) {
      return errorResponse("STORAGE_UNAVAILABLE", "资料库暂时不可用，请稍后重试", 503);
    }
    console.error("Unhandled route error", error);
    return errorResponse("INTERNAL_ERROR", "发生了意外错误，请稍后重试", 500);
  }
}

export function parseItemFilters(url: URL): ItemFilters {
  const type = url.searchParams.get("type") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  if (type && !ITEM_TYPES.includes(type as ItemType)) {
    throw new DomainError("VALIDATION_ERROR", "内容类型筛选无效");
  }
  if (status && !CONTENT_STATUSES.includes(status as ContentStatus)) {
    throw new DomainError("VALIDATION_ERROR", "成熟度筛选无效");
  }
  return {
    q: url.searchParams.get("q")?.trim() || undefined,
    type: type as ItemType | undefined,
    projectId: url.searchParams.get("project")?.trim() || undefined,
    status: status as ContentStatus | undefined,
    tag: url.searchParams.get("tag")?.trim() || undefined,
    updatedFrom: url.searchParams.get("updatedFrom")?.trim() || undefined,
    updatedTo: url.searchParams.get("updatedTo")?.trim() || undefined,
    includeArchived: url.searchParams.get("includeArchived") === "true",
  };
}

export async function readObject(request: Request): Promise<Record<string, unknown>> {
  const value = await request.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DomainError("VALIDATION_ERROR", "请求内容必须是一个对象");
  }
  return value as Record<string, unknown>;
}
