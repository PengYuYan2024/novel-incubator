import type { DashboardData, ItemRecord, ProjectRecord } from "@/lib/domain/types";

function updateProject(project: ProjectRecord, item: ItemRecord): ProjectRecord {
  if (project.id !== item.projectId) return project;
  const counts = project.counts ?? { inspiration: 0, character: 0, world: 0 };
  return {
    ...project,
    updatedAt: item.updatedAt,
    counts:
      item.status === "archived"
        ? counts
        : { ...counts, [item.type]: counts[item.type] + 1 },
  };
}

export function mergeSavedItemIntoDashboard(
  dashboard: DashboardData,
  item: ItemRecord,
): DashboardData {
  const statusCounts = {
    ...dashboard.statusCounts,
    [item.status]: dashboard.statusCounts[item.status] + 1,
  };
  const recentProjects = dashboard.recentProjects
    .map((project) => updateProject(project, item))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  return {
    ...dashboard,
    inboxCount: statusCounts.inbox,
    todayCount: dashboard.todayCount + 1,
    statusCounts,
    recentProjects,
    recentItems: [item, ...dashboard.recentItems.filter((entry) => entry.id !== item.id)].slice(0, 8),
  };
}
