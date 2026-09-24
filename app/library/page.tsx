import { LibraryRouteView } from "@/components/items/library-client";
import { AppShell } from "@/components/shell/app-shell";
import { CONTENT_STATUSES, ITEM_TYPES } from "@/lib/domain/constants";
import type { ContentStatus, ItemFilters, ItemType } from "@/lib/domain/types";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parameters = await searchParams;
  const typeValue = first(parameters.type);
  const statusValue = first(parameters.status);
  const initialFilters: ItemFilters = {
    q: first(parameters.q),
    type: typeValue && ITEM_TYPES.includes(typeValue as ItemType) ? typeValue as ItemType : undefined,
    projectId: first(parameters.project),
    status: statusValue && CONTENT_STATUSES.includes(statusValue as ContentStatus) ? statusValue as ContentStatus : undefined,
    tag: first(parameters.tag),
    updatedFrom: first(parameters.updatedFrom),
    updatedTo: first(parameters.updatedTo),
    includeArchived: first(parameters.includeArchived) === "true",
  };
  return <AppShell><LibraryRouteView initialFilters={initialFilters} /></AppShell>;
}
