import { describe, expect, it } from "vitest";

import {
  canonicalRelationEndpoints,
  relationLabelForViewer,
} from "@/lib/domain/relations";

describe("relation labels", () => {
  it.each([
    ["related", "相关", "相关"],
    ["appears_in", "出场于", "包含出场"],
    ["influences", "影响", "受影响于"],
    ["conflicts_with", "冲突", "冲突"],
    ["belongs_to", "隶属于", "包含"],
    ["generated_by", "由此产生", "产生了"],
  ] as const)("shows %s from each viewer side", (type, sourceLabel, targetLabel) => {
    expect(relationLabelForViewer(type, "source")).toBe(sourceLabel);
    expect(relationLabelForViewer(type, "target")).toBe(targetLabel);
  });
});

describe("symmetric relation normalization", () => {
  it("sorts related endpoints so reverse duplicates share one key", () => {
    expect(canonicalRelationEndpoints("related", "z-item", "a-item")).toEqual([
      "a-item",
      "z-item",
    ]);
  });

  it("preserves direction for an influence", () => {
    expect(canonicalRelationEndpoints("influences", "z-item", "a-item")).toEqual([
      "z-item",
      "a-item",
    ]);
  });
});
