import { render, screen, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { LibraryRouteView } from "@/components/items/library-client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  const data = url.includes("/api/projects") || url.includes("/api/items")
    ? []
    : { created: false };
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

vi.stubGlobal("fetch", fetchMock);

const previousTimezone = process.env.TZ;

beforeAll(() => {
  process.env.TZ = "Asia/Shanghai";
});

afterAll(() => {
  process.env.TZ = previousTimezone;
});

describe("LibraryRouteView", () => {
  it("converts date-only URL filters only when requesting items", async () => {
    const { container } = render(
      <LibraryRouteView initialFilters={{ updatedFrom: "2026-09-01", updatedTo: "2026-09-12" }} />,
    );

    expect(container.querySelector("#library-updated-from")).toHaveValue("2026-09-01");
    expect(container.querySelector("#library-updated-to")).toHaveValue("2026-09-12");
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([input]) => String(input) === "/api/items?updatedFrom=2026-08-31T16%3A00%3A00.000Z&updatedTo=2026-09-12T16%3A00%3A00.000Z")).toBe(true);
    });
  });

  it("resets visible filters when global search navigates to a new query", () => {
    const view = render(<LibraryRouteView initialFilters={{ q: "旧查询", type: "character" }} />);
    expect(screen.getByRole("searchbox", { name: "搜索资料库" })).toHaveValue("旧查询");
    expect(screen.getByRole("tab", { name: "人物卡" })).toHaveAttribute("data-state", "active");
    view.rerender(<LibraryRouteView initialFilters={{ q: "新查询" }} />);
    expect(screen.getByRole("searchbox", { name: "搜索资料库" })).toHaveValue("新查询");
    expect(screen.getByRole("tab", { name: "全部内容" })).toHaveAttribute("data-state", "active");
  });
});
