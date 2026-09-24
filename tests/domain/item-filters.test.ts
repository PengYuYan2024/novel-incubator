import { describe, expect, it } from "vitest";

import { buildItemQuery } from "@/lib/client/item-filters";

describe("item filter query", () => {
  it("combines keyword, type, project, maturity, tag, and update bounds", () => {
    const query = buildItemQuery({
      q: "  旧车站  ",
      type: "world",
      projectId: "project 1",
      status: "growing",
      tag: "地点",
      updatedFrom: "2026-09-01",
      updatedTo: "2026-09-11",
    });
    expect(query).toBe(
      "q=%E6%97%A7%E8%BD%A6%E7%AB%99&type=world&project=project+1&status=growing&tag=%E5%9C%B0%E7%82%B9&updatedFrom=2026-09-01&updatedTo=2026-09-11",
    );
  });

  it("omits empty values without enabling archived content", () => {
    expect(buildItemQuery({ q: " ", includeArchived: false })).toBe("");
  });

  it("includes archived records when explicitly requested", () => {
    expect(buildItemQuery({ includeArchived: true })).toBe("includeArchived=true");
  });
});
