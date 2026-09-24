import type {
  CONTENT_STATUSES,
  INSPIRATION_SUBTYPES,
  ITEM_TYPES,
  PROJECT_STATUSES,
  RELATION_TYPES,
  WORLD_SUBTYPES,
} from "./constants";

export type ContentStatus = (typeof CONTENT_STATUSES)[number];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type ItemType = (typeof ITEM_TYPES)[number];
export type InspirationSubtype = (typeof INSPIRATION_SUBTYPES)[number];
export type WorldSubtype = (typeof WORLD_SUBTYPES)[number];
export type RelationType = (typeof RELATION_TYPES)[number];

export type CharacterMetadata = {
  role: string;
  coreDesire: string;
  innerConflict: string;
  traits: string;
  history: string;
  notes: string;
};

export type WorldMetadata = {
  rules: string;
  cost: string;
};

export type ItemMetadata = CharacterMetadata | WorldMetadata | Record<string, never>;

export type ProjectInput = {
  title: string;
  genre: string;
  logline: string;
  description: string;
  status: ProjectStatus;
};

export type ProjectRecord = ProjectInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
  counts?: {
    inspiration: number;
    character: number;
    world: number;
  };
};

export type ItemInput = {
  projectId: string;
  type: ItemType;
  subtype: InspirationSubtype | WorldSubtype | null;
  title: string;
  body: string;
  status: ContentStatus;
  tags: string[];
  metadata: ItemMetadata;
};

export type ItemRecord = ItemInput & {
  id: string;
  searchText: string;
  createdAt: string;
  updatedAt: string;
  projectTitle?: string;
};

export type RelationInput = {
  sourceItemId: string;
  targetItemId: string;
  relationType: RelationType;
  note: string;
};

export type RelationRecord = RelationInput & {
  id: string;
  createdAt: string;
};

export type RelationView = RelationRecord & {
  viewerSide: "source" | "target";
  label: string;
  counterpart: ItemRecord;
};

export type ItemFilters = {
  q?: string;
  type?: ItemType;
  projectId?: string;
  status?: ContentStatus;
  tag?: string;
  updatedFrom?: string;
  updatedTo?: string;
  includeArchived?: boolean;
  limit?: number;
};

export type StatusCounts = Record<ContentStatus, number>;

export type DashboardData = {
  inboxCount: number;
  todayCount: number;
  statusCounts: StatusCounts;
  recentProjects: ProjectRecord[];
  recentItems: ItemRecord[];
};

export type BackupDocument = {
  schemaVersion: 1;
  exportedAt: string;
  projects: ProjectRecord[];
  items: ItemRecord[];
  relations: RelationRecord[];
};

export type BackupExportDocument = Omit<BackupDocument, "projects" | "items"> & {
  projects: Array<Omit<ProjectRecord, "counts">>;
  items: Array<Omit<ItemRecord, "projectTitle" | "searchText">>;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
};

export type ApiDataBody<T> = { data: T };
