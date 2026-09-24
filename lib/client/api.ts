import type { ApiDataBody, ApiErrorBody } from "@/lib/domain/types";

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function apiRequest<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const writing = !!init?.method && !["GET", "HEAD"].includes(init.method.toUpperCase());
  const uncertain = writing ? "尚未确认保存结果，请保留草稿并先检查资料库，避免重复提交。" : "请检查网络连接后重试。";
  let response: Response;
  try { response = await fetch(input, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json; charset=utf-8" } : {}),
      ...init?.headers,
    },
  }); } catch {
    throw new ApiClientError("NETWORK_ERROR", `连接失败。${uncertain}`);
  }
  if (response.status === 401 || response.status === 403 || response.redirected) {
    throw new ApiClientError("AUTH_REQUIRED", "登录已失效或没有访问权限。请在新标签页重新登录，保留当前草稿后再试。");
  }
  if (response.status >= 500) throw new ApiClientError("SERVER_ERROR", `服务暂时不可用。${uncertain}`);
  let payload: ApiDataBody<T> | ApiErrorBody;
  try { payload = await response.json(); }
  catch { throw new ApiClientError("INVALID_RESPONSE", `服务器返回了无法识别的结果。${uncertain}`); }
  if (!payload || typeof payload !== "object" || (!("data" in payload) && !("error" in payload))) {
    throw new ApiClientError("INVALID_RESPONSE", `服务器返回了不完整的结果。${uncertain}`);
  }
  if (!response.ok || "error" in payload) {
    const error = "error" in payload
      ? payload.error
      : { code: "REQUEST_FAILED", message: "请求失败，请稍后重试" };
    if (!error || typeof error.code !== "string" || typeof error.message !== "string") {
      throw new ApiClientError("INVALID_RESPONSE", `服务器返回了不完整的结果。${uncertain}`);
    }
    const message = response.status === 409
      ? "云端资料已在其他页面更新。请保留或下载草稿，重新打开最新资料后手动合并，不要直接覆盖。"
      : error.message;
    throw new ApiClientError(error.code, message, error.fields);
  }
  if (writing && ["POST", "PATCH", "PUT"].includes(init!.method!.toUpperCase()) && /^\/api\/(items|projects)(\/[^/?]+)?$/.test(input)) {
    const record = payload.data as Record<string, unknown> | null;
    const fields = input.startsWith("/api/items")
      ? ["id", "projectId", "type", "title", "body", "status", "createdAt", "updatedAt"]
      : ["id", "title", "genre", "logline", "description", "status", "createdAt", "updatedAt"];
    if (!record || typeof record !== "object" || fields.some(field => typeof record[field] !== "string") || !record.id || !record.updatedAt) {
      throw new ApiClientError("INVALID_RESPONSE", `未收到完整的保存确认。${uncertain}`);
    }
  }
  return payload.data;
}
