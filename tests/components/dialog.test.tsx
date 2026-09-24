import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

describe("Dialog", () => {
  it("uses a Chinese accessible name and a mobile-sized close target", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>资料设置</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    const close = screen.getByRole("button", { name: "关闭" });
    expect(close).toHaveClass("min-h-11", "min-w-11");
  });
});
