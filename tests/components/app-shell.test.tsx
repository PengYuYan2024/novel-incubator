import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/shell/app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

describe("AppShell", () => {
  it("exposes the three primary destinations and global search", () => {
    render(
      <AppShell>
        <p>正文</p>
      </AppShell>,
    );

    expect(
      screen.getAllByRole("link", { name: "灵感收集台" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: "内容资料库" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: "小说项目" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("searchbox", { name: "全局搜索" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("正文");
  });
});
