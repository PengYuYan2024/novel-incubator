import type { ContentStatus, ItemRecord, StatusCounts } from "@/lib/domain/types";

export function projectMaturityCounts(items: ItemRecord[]): StatusCounts {
  const counts: StatusCounts = { inbox: 0, seed: 0, growing: 0, ready: 0, archived: 0 };
  for (const item of items) counts[item.status] += 1;
  return counts;
}

export function filterProjectItems(
  items: ItemRecord[],
  filters: { status?: ContentStatus; tag?: string },
): ItemRecord[] {
  return items.filter((item) => {
    if (filters.status && item.status !== filters.status) return false;
    if (filters.tag?.trim() && !item.tags.includes(filters.tag.trim())) return false;
    return true;
  });
}
