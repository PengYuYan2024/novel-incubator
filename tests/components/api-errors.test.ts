import { afterEach, expect, test, vi } from "vitest";
import { apiRequest } from "@/lib/client/api";
afterEach(() => vi.unstubAllGlobals());
test("expired sign-in HTML is reported as sign-in failure, not JSON syntax", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>login</html>", { status: 401 })));
  await expect(apiRequest("/api/items")).rejects.toThrow("登录已失效");
});
test("offline writes preserve uncertainty and are never automatically retried", async () => {
  const fetcher = vi.fn(async () => { throw new TypeError("Failed to fetch"); });
  vi.stubGlobal("fetch", fetcher);
  await expect(apiRequest("/api/items", { method: "POST", body: "{}" })).rejects.toThrow("尚未确认保存结果");
  expect(fetcher).toHaveBeenCalledTimes(1);
});
test("server HTML errors are actionable", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("bad gateway", { status: 502 })));
  await expect(apiRequest("/api/items")).rejects.toThrow("服务暂时不可用");
});
test.each([null, {}])("malformed saved record %j is not confirmation", async (data) => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ data })));
  await expect(apiRequest("/api/items", { method: "POST", body: "{}" })).rejects.toThrow("尚未确认保存结果");
});
test("malformed error is actionable", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: null }, { status: 400 })));
  await expect(apiRequest("/api/items", { method: "POST" })).rejects.toThrow("尚未确认保存结果");
});
