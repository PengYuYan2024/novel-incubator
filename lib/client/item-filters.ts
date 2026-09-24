import type { ItemFilters } from "@/lib/domain/types";

const queryOrder: Array<[keyof ItemFilters, string]> = [
  ["q", "q"],
  ["type", "type"],
  ["projectId", "project"],
  ["status", "status"],
  ["tag", "tag"],
  ["updatedFrom", "updatedFrom"],
  ["updatedTo", "updatedTo"],
];

export function buildItemQuery(filters: ItemFilters): string {
  const parameters = new URLSearchParams();
  for (const [field, name] of queryOrder) {
    const value = filters[field];
    if (typeof value === "string" && value.trim()) {
      parameters.set(name, value.trim());
    }
  }
  if (filters.includeArchived) parameters.set("includeArchived", "true");
  return parameters.toString();
}

export function hasItemFilters(filters: ItemFilters): boolean {
  return buildItemQuery(filters).length > 0;
}
