import { afterEach, expect, test } from "vitest";
import { DRAFT_PREFIX, readDrafts, removeDraft } from "@/lib/client/draft-store";
afterEach(() => localStorage.clear());
test("drafts from separate pages coexist, are ordered by time, and are isolated by purpose", () => {
  localStorage.setItem(`${DRAFT_PREFIX}item%3Aone:tab-a`, JSON.stringify({ version: 1, scope: "item:one", savedAt: "2026-09-20T01:00:00Z", data: { title: "第一份" } }));
  localStorage.setItem(`${DRAFT_PREFIX}item%3Aone:tab-b`, JSON.stringify({ version: 1, scope: "item:one", savedAt: "2026-09-20T02:00:00Z", data: { title: "第二份" } }));
  localStorage.setItem(`${DRAFT_PREFIX}project%3Anew:tab-a`, JSON.stringify({ version: 1, scope: "project:new", savedAt: "2026-09-20T03:00:00Z", data: { title: "项目" } }));
  expect(readDrafts(localStorage, "item:one").map(d => d.record?.data)).toEqual([{ title: "第二份" }, { title: "第一份" }]);
});
test("removing a previously read draft never deletes a newer replacement", () => {
  const key = `${DRAFT_PREFIX}capture:new:tab-a`;
  localStorage.setItem(key, "old");
  localStorage.setItem(key, "new");
  removeDraft(localStorage, { key, raw: "old" });
  expect(localStorage.getItem(key)).toBe("new");
});
test("damaged drafts remain available for raw recovery, and ordinary browser data is excluded", () => {
  localStorage.setItem(`${DRAFT_PREFIX}item%3Aone:tab-a`, "{损坏");
  localStorage.setItem("preference", "safe");
  expect(readDrafts(localStorage, "item:one")).toEqual([{ key: `${DRAFT_PREFIX}item%3Aone:tab-a`, raw: "{损坏", record: null }]);
});
