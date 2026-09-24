import type {
  BackupDocument,
  DashboardData,
  ItemFilters,
  ItemRecord,
  ProjectRecord,
  RelationInput,
  RelationRecord,
  RelationView,
} from "@/lib/domain/types";
import { relationLabelForViewer } from "@/lib/domain/relations";
import { getD1Binding } from "@/db";

export type WriteResult = "updated" | "not_found" | "conflict";

export type SeedBundle = {
  project: ProjectRecord;
  items: ItemRecord[];
  relations: RelationRecord[];
};

export type RepositorySnapshot = Pick<
  BackupDocument,
  "projects" | "items" | "relations"
>;

export interface NovelRepository {
  seedIfNeeded(bundle: SeedBundle): Promise<boolean>;
  listProjects(): Promise<ProjectRecord[]>;
  getProject(id: string): Promise<ProjectRecord | null>;
  insertProject(project: ProjectRecord): Promise<void>;
  updateProject(project: ProjectRecord, expectedUpdatedAt: string): Promise<WriteResult>;
  countProjectItems(projectId: string): Promise<number>;
  deleteProject(projectId: string): Promise<boolean>;
  listItems(filters?: ItemFilters): Promise<ItemRecord[]>;
  getItem(id: string): Promise<ItemRecord | null>;
  insertItem(item: ItemRecord): Promise<void>;
  updateItem(item: ItemRecord, expectedUpdatedAt: string): Promise<WriteResult>;
  deleteItem(id: string, projectUpdatedAt: string): Promise<boolean>;
  listRelations(itemId: string): Promise<RelationView[]>;
  findEquivalentRelation(input: RelationInput): Promise<RelationRecord | null>;
  insertRelation(relation: RelationRecord): Promise<void>;
  deleteRelation(id: string): Promise<boolean>;
  dashboard(todayStart: string, todayEnd: string): Promise<DashboardData>;
  exportAll(): Promise<RepositorySnapshot>;
  replaceAll(snapshot: RepositorySnapshot): Promise<void>;
}

type ProjectDbRow = {
  id: string;
  title: string;
  genre: string;
  logline: string;
  description: string;
  status: ProjectRecord["status"];
  created_at: string;
  updated_at: string;
  inspiration_count?: number;
  character_count?: number;
  world_count?: number;
};

type ItemDbRow = {
  id: string;
  project_id: string;
  project_title?: string;
  type: ItemRecord["type"];
  subtype: ItemRecord["subtype"];
  title: string;
  body: string;
  status: ItemRecord["status"];
  metadata: string;
  search_text: string;
  created_at: string;
  updated_at: string;
};

type RelationDbRow = {
  id: string;
  source_item_id: string;
  target_item_id: string;
  relation_type: RelationRecord["relationType"];
  note: string;
  created_at: string;
};

function projectFromRow(row: ProjectDbRow): ProjectRecord {
  return {
    id: row.id,
    title: row.title,
    genre: row.genre,
    logline: row.logline,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    counts: {
      inspiration: Number(row.inspiration_count ?? 0),
      character: Number(row.character_count ?? 0),
      world: Number(row.world_count ?? 0),
    },
  };
}

function safeMetadata(raw: string): ItemRecord["metadata"] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as ItemRecord["metadata"])
      : {};
  } catch {
    return {};
  }
}

function itemFromRow(row: ItemDbRow, tags: string[] = []): ItemRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    projectTitle: row.project_title,
    type: row.type,
    subtype: row.subtype,
    title: row.title,
    body: row.body,
    status: row.status,
    tags,
    metadata: safeMetadata(row.metadata),
    searchText: row.search_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function relationFromRow(row: RelationDbRow): RelationRecord {
  return {
    id: row.id,
    sourceItemId: row.source_item_id,
    targetItemId: row.target_item_id,
    relationType: row.relation_type,
    note: row.note,
    createdAt: row.created_at,
  };
}

function changed(result: D1Result<unknown>): number {
  return Number(result.meta?.changes ?? 0);
}

// Keep each bound JSON value comfortably below D1's 2 MB value limit while
// ensuring a valid 10 MB backup fits inside the 50-query Worker batch quota.
const D1_JSON_CHUNK_BYTES = 1_500_000;

function jsonChunks<T>(rows: T[]): string[] {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let current: string[] = [];
  let currentBytes = 2;
  for (const row of rows) {
    const serialized = JSON.stringify(row);
    const rowBytes = encoder.encode(serialized).byteLength + (current.length ? 1 : 0);
    if (current.length && currentBytes + rowBytes > D1_JSON_CHUNK_BYTES) {
      chunks.push(`[${current.join(",")}]`);
      current = [];
      currentBytes = 2;
    }
    current.push(serialized);
    currentBytes += encoder.encode(serialized).byteLength + (current.length > 1 ? 1 : 0);
  }
  if (current.length) chunks.push(`[${current.join(",")}]`);
  return chunks;
}

export class D1NovelRepository implements NovelRepository {
  constructor(private readonly database: D1Database = getD1Binding()) {}

  async seedIfNeeded(bundle: SeedBundle): Promise<boolean> {
    const ownerToken = `seed-${crypto.randomUUID()}`;
    const statements: D1PreparedStatement[] = [
      this.database
        .prepare(
          `INSERT INTO app_meta (key,value)
           SELECT 'seed_version', ?
           WHERE NOT EXISTS (SELECT 1 FROM app_meta WHERE key='seed_version')
             AND NOT EXISTS (SELECT 1 FROM projects)
             AND NOT EXISTS (SELECT 1 FROM items)
           ON CONFLICT(key) DO NOTHING`,
        )
        .bind(ownerToken),
      this.database
        .prepare(
          `INSERT INTO projects (id,title,genre,logline,description,status,created_at,updated_at)
           SELECT ?,?,?,?,?,?,?,?
           WHERE EXISTS (SELECT 1 FROM app_meta WHERE key='seed_version' AND value=?)`,
        )
        .bind(
          bundle.project.id,
          bundle.project.title,
          bundle.project.genre,
          bundle.project.logline,
          bundle.project.description,
          bundle.project.status,
          bundle.project.createdAt,
          bundle.project.updatedAt,
          ownerToken,
        ),
    ];
    for (const item of bundle.items) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO items (id,project_id,type,subtype,title,body,status,metadata,search_text,created_at,updated_at)
             SELECT ?,?,?,?,?,?,?,?,?,?,?
             WHERE EXISTS (SELECT 1 FROM app_meta WHERE key='seed_version' AND value=?)`,
          )
          .bind(
            item.id,
            item.projectId,
            item.type,
            item.subtype,
            item.title,
            item.body,
            item.status,
            JSON.stringify(item.metadata),
            item.searchText,
            item.createdAt,
            item.updatedAt,
            ownerToken,
          ),
      );
      for (const tag of item.tags) {
        statements.push(
          this.database
            .prepare(
              `INSERT INTO item_tags (item_id,tag)
               SELECT ?,?
               WHERE EXISTS (SELECT 1 FROM app_meta WHERE key='seed_version' AND value=?)`,
            )
            .bind(item.id, tag, ownerToken),
        );
      }
    }
    for (const relation of bundle.relations) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO relations (id,source_item_id,target_item_id,relation_type,note,created_at)
             SELECT ?,?,?,?,?,?
             WHERE EXISTS (SELECT 1 FROM app_meta WHERE key='seed_version' AND value=?)`,
          )
          .bind(
            relation.id,
            relation.sourceItemId,
            relation.targetItemId,
            relation.relationType,
            relation.note,
            relation.createdAt,
            ownerToken,
          ),
      );
    }
    statements.push(
      this.database
        .prepare("INSERT INTO app_meta (key,value) VALUES ('seed_version','existing-data') ON CONFLICT(key) DO NOTHING"),
    );
    const results = await this.database.batch(statements);
    return changed(results[0]) > 0;
  }

  async listProjects(): Promise<ProjectRecord[]> {
    const result = await this.database.prepare(
      `SELECT p.*,
        SUM(CASE WHEN i.status <> 'archived' AND i.type = 'inspiration' THEN 1 ELSE 0 END) AS inspiration_count,
        SUM(CASE WHEN i.status <> 'archived' AND i.type = 'character' THEN 1 ELSE 0 END) AS character_count,
        SUM(CASE WHEN i.status <> 'archived' AND i.type = 'world' THEN 1 ELSE 0 END) AS world_count
       FROM projects p
       LEFT JOIN items i ON i.project_id = p.id
       GROUP BY p.id
       ORDER BY p.updated_at DESC, p.id DESC`,
    ).all<ProjectDbRow>();
    return result.results.map(projectFromRow);
  }

  async getProject(id: string): Promise<ProjectRecord | null> {
    const row = await this.database.prepare(
      `SELECT p.*,
        SUM(CASE WHEN i.status <> 'archived' AND i.type = 'inspiration' THEN 1 ELSE 0 END) AS inspiration_count,
        SUM(CASE WHEN i.status <> 'archived' AND i.type = 'character' THEN 1 ELSE 0 END) AS character_count,
        SUM(CASE WHEN i.status <> 'archived' AND i.type = 'world' THEN 1 ELSE 0 END) AS world_count
       FROM projects p
       LEFT JOIN items i ON i.project_id = p.id
       WHERE p.id = ?
       GROUP BY p.id
       LIMIT 1`,
    ).bind(id).first<ProjectDbRow>();
    return row ? projectFromRow(row) : null;
  }

  async insertProject(project: ProjectRecord): Promise<void> {
    await this.database
      .prepare("INSERT INTO projects (id,title,genre,logline,description,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")
      .bind(
        project.id,
        project.title,
        project.genre,
        project.logline,
        project.description,
        project.status,
        project.createdAt,
        project.updatedAt,
      )
      .run();
  }

  async updateProject(project: ProjectRecord, expectedUpdatedAt: string): Promise<WriteResult> {
    const result = await this.database
      .prepare("UPDATE projects SET title=?,genre=?,logline=?,description=?,status=?,updated_at=? WHERE id=? AND updated_at=?")
      .bind(
        project.title,
        project.genre,
        project.logline,
        project.description,
        project.status,
        project.updatedAt,
        project.id,
        expectedUpdatedAt,
      )
      .run();
    if (changed(result) > 0) return "updated";
    const exists = await this.database
      .prepare("SELECT id FROM projects WHERE id=? LIMIT 1")
      .bind(project.id)
      .first<{ id: string }>();
    return exists ? "conflict" : "not_found";
  }

  async countProjectItems(projectId: string): Promise<number> {
    const row = await this.database
      .prepare("SELECT COUNT(*) AS count FROM items WHERE project_id=?")
      .bind(projectId)
      .first<{ count: number }>();
    return Number(row?.count ?? 0);
  }

  async deleteProject(projectId: string): Promise<boolean> {
    const result = await this.database
      .prepare("DELETE FROM projects WHERE id=?")
      .bind(projectId)
      .run();
    return changed(result) > 0;
  }

  async listItems(filters: ItemFilters = {}): Promise<ItemRecord[]> {
    const where: string[] = [];
    const values: unknown[] = [];
    if (!filters.includeArchived && filters.status !== "archived") {
      where.push("i.status <> 'archived'");
    }
    if (filters.type) {
      where.push("i.type = ?");
      values.push(filters.type);
    }
    if (filters.projectId) {
      where.push("i.project_id = ?");
      values.push(filters.projectId);
    }
    if (filters.status) {
      where.push("i.status = ?");
      values.push(filters.status);
    }
    if (filters.tag) {
      where.push("EXISTS (SELECT 1 FROM item_tags exact_tag WHERE exact_tag.item_id=i.id AND exact_tag.tag=?)");
      values.push(filters.tag);
    }
    if (filters.updatedFrom) {
      where.push("i.updated_at >= ?");
      values.push(filters.updatedFrom);
    }
    if (filters.updatedTo) {
      where.push("i.updated_at < ?");
      values.push(filters.updatedTo);
    }
    if (filters.q?.trim()) {
      where.push(`(instr(lower(i.search_text), lower(?)) > 0 OR instr(lower(p.title), lower(?)) > 0 OR EXISTS (
        SELECT 1 FROM item_tags search_tag WHERE search_tag.item_id=i.id AND instr(lower(search_tag.tag), lower(?)) > 0
      ))`);
      const query = filters.q.trim();
      values.push(query, query, query);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const limit = filters.limit && filters.limit > 0 ? Math.floor(filters.limit) : null;
    if (limit) values.push(limit);
    const result = await this.database
      .prepare(
        `SELECT i.*, p.title AS project_title
         FROM items i
         INNER JOIN projects p ON p.id=i.project_id
         ${clause}
         ORDER BY i.updated_at DESC, i.id DESC
         ${limit ? "LIMIT ?" : ""}`,
      )
      .bind(...values)
      .all<ItemDbRow>();
    return this.hydrateItems(result.results);
  }

  async getItem(id: string): Promise<ItemRecord | null> {
    const row = await this.database
      .prepare("SELECT i.*,p.title AS project_title FROM items i INNER JOIN projects p ON p.id=i.project_id WHERE i.id=? LIMIT 1")
      .bind(id)
      .first<ItemDbRow>();
    if (!row) return null;
    return (await this.hydrateItems([row]))[0] ?? null;
  }

  async insertItem(item: ItemRecord): Promise<void> {
    const statements = [
      this.database
        .prepare("INSERT INTO items (id,project_id,type,subtype,title,body,status,metadata,search_text,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .bind(
          item.id,
          item.projectId,
          item.type,
          item.subtype,
          item.title,
          item.body,
          item.status,
          JSON.stringify(item.metadata),
          item.searchText,
          item.createdAt,
          item.updatedAt,
        ),
      ...item.tags.map((tag) =>
        this.database
          .prepare("INSERT INTO item_tags (item_id,tag) VALUES (?,?)")
          .bind(item.id, tag),
      ),
      this.database
        .prepare("UPDATE projects SET updated_at=CASE WHEN updated_at < ? THEN ? ELSE updated_at END WHERE id=?")
        .bind(item.updatedAt, item.updatedAt, item.projectId),
    ];
    await this.database.batch(statements);
  }

  async updateItem(item: ItemRecord, expectedUpdatedAt: string): Promise<WriteResult> {
    const existing = await this.database
      .prepare("SELECT project_id,updated_at FROM items WHERE id=? LIMIT 1")
      .bind(item.id)
      .first<{ project_id: string; updated_at: string }>();
    if (!existing) return "not_found";
    if (existing.updated_at !== expectedUpdatedAt) return "conflict";

    const statements: D1PreparedStatement[] = [
      this.database
        .prepare("DELETE FROM item_tags WHERE item_id=? AND EXISTS (SELECT 1 FROM items WHERE id=? AND updated_at=?)")
        .bind(item.id, item.id, expectedUpdatedAt),
      ...item.tags.map((tag) =>
        this.database
          .prepare("INSERT INTO item_tags (item_id,tag) SELECT ?,? WHERE EXISTS (SELECT 1 FROM items WHERE id=? AND updated_at=?)")
          .bind(item.id, tag, item.id, expectedUpdatedAt),
      ),
    ];
    const itemUpdateIndex = statements.length;
    statements.push(
      this.database
        .prepare("UPDATE items SET project_id=?,type=?,subtype=?,title=?,body=?,status=?,metadata=?,search_text=?,updated_at=? WHERE id=? AND updated_at=?")
        .bind(
          item.projectId,
          item.type,
          item.subtype,
          item.title,
          item.body,
          item.status,
          JSON.stringify(item.metadata),
          item.searchText,
          item.updatedAt,
          item.id,
          expectedUpdatedAt,
        ),
    );
    for (const projectId of new Set([existing.project_id, item.projectId])) {
      statements.push(
        this.database
          .prepare(
            `UPDATE projects
             SET updated_at=CASE WHEN updated_at < ? THEN ? ELSE updated_at END
             WHERE id=? AND EXISTS (SELECT 1 FROM items WHERE id=? AND updated_at=?)`,
          )
          .bind(item.updatedAt, item.updatedAt, projectId, item.id, item.updatedAt),
      );
    }
    const results = await this.database.batch(statements);
    return changed(results[itemUpdateIndex]) > 0 ? "updated" : "conflict";
  }

  async deleteItem(id: string, projectUpdatedAt: string): Promise<boolean> {
    const results = await this.database.batch([
      this.database
        .prepare(
          `UPDATE projects
           SET updated_at=CASE WHEN updated_at < ? THEN ? ELSE updated_at END
           WHERE id=(SELECT project_id FROM items WHERE id=? LIMIT 1)`,
        )
        .bind(projectUpdatedAt, projectUpdatedAt, id),
      this.database.prepare("DELETE FROM items WHERE id=?").bind(id),
    ]);
    return changed(results[1]) > 0;
  }

  async listRelations(itemId: string): Promise<RelationView[]> {
    const result = await this.database
      .prepare("SELECT id,source_item_id,target_item_id,relation_type,note,created_at FROM relations WHERE source_item_id=? OR target_item_id=? ORDER BY created_at DESC,id DESC")
      .bind(itemId, itemId)
      .all<RelationDbRow>();
    const relations = result.results.map(relationFromRow);
    const counterpartIds = relations.map((relation) =>
      relation.sourceItemId === itemId ? relation.targetItemId : relation.sourceItemId,
    );
    const counterparts = new Map(
      (await this.getItemsByIds(counterpartIds)).map((item) => [item.id, item]),
    );
    return relations.flatMap((relation) => {
      const viewerSide = relation.sourceItemId === itemId ? "source" : "target";
      const counterpartId = viewerSide === "source" ? relation.targetItemId : relation.sourceItemId;
      const counterpart = counterparts.get(counterpartId);
      if (!counterpart) return [];
      return [{
        ...relation,
        viewerSide,
        label: relationLabelForViewer(relation.relationType, viewerSide),
        counterpart,
      }];
    });
  }

  async findEquivalentRelation(input: RelationInput): Promise<RelationRecord | null> {
    const row = await this.database
      .prepare("SELECT id,source_item_id,target_item_id,relation_type,note,created_at FROM relations WHERE source_item_id=? AND target_item_id=? AND relation_type=? LIMIT 1")
      .bind(input.sourceItemId, input.targetItemId, input.relationType)
      .first<RelationDbRow>();
    return row ? relationFromRow(row) : null;
  }

  async insertRelation(relation: RelationRecord): Promise<void> {
    await this.database
      .prepare("INSERT INTO relations (id,source_item_id,target_item_id,relation_type,note,created_at) VALUES (?,?,?,?,?,?)")
      .bind(
        relation.id,
        relation.sourceItemId,
        relation.targetItemId,
        relation.relationType,
        relation.note,
        relation.createdAt,
      )
      .run();
  }

  async deleteRelation(id: string): Promise<boolean> {
    const result = await this.database
      .prepare("DELETE FROM relations WHERE id=?")
      .bind(id)
      .run();
    return changed(result) > 0;
  }

  async dashboard(todayStart: string, todayEnd: string): Promise<DashboardData> {
    const [statusResult, today, projects, items] = await Promise.all([
      this.database.prepare("SELECT status,COUNT(*) AS count FROM items GROUP BY status").all<{ status: ItemRecord["status"]; count: number }>(),
      this.database.prepare("SELECT COUNT(*) AS count FROM items WHERE created_at >= ? AND created_at < ?").bind(todayStart, todayEnd).first<{ count: number }>(),
      this.listProjects(),
      this.listItems({ limit: 8 }),
    ]);
    const statusCounts: DashboardData["statusCounts"] = {
      inbox: 0,
      seed: 0,
      growing: 0,
      ready: 0,
      archived: 0,
    };
    for (const row of statusResult.results) statusCounts[row.status] = Number(row.count);
    return {
      inboxCount: statusCounts.inbox,
      todayCount: Number(today?.count ?? 0),
      statusCounts,
      recentProjects: projects.slice(0, 4),
      recentItems: items.slice(0, 8),
    };
  }

  async exportAll(): Promise<RepositorySnapshot> {
    const [projectResult, itemResult, tagResult, relationResult] = await this.database.batch([
      this.database.prepare(
        `SELECT p.*,
          SUM(CASE WHEN i.status <> 'archived' AND i.type = 'inspiration' THEN 1 ELSE 0 END) AS inspiration_count,
          SUM(CASE WHEN i.status <> 'archived' AND i.type = 'character' THEN 1 ELSE 0 END) AS character_count,
          SUM(CASE WHEN i.status <> 'archived' AND i.type = 'world' THEN 1 ELSE 0 END) AS world_count
         FROM projects p
         LEFT JOIN items i ON i.project_id = p.id
         GROUP BY p.id
         ORDER BY p.updated_at DESC, p.id DESC`,
      ),
      this.database.prepare(
        `SELECT i.*,p.title AS project_title
         FROM items i
         INNER JOIN projects p ON p.id=i.project_id
         ORDER BY i.updated_at DESC,i.id DESC`,
      ),
      this.database.prepare("SELECT item_id,tag FROM item_tags ORDER BY item_id,tag"),
      this.database.prepare("SELECT id,source_item_id,target_item_id,relation_type,note,created_at FROM relations ORDER BY created_at,id"),
    ]);
    const tags = new Map<string, string[]>();
    for (const row of tagResult.results as Array<{ item_id: string; tag: string }>) {
      const current = tags.get(row.item_id) ?? [];
      current.push(row.tag);
      tags.set(row.item_id, current);
    }
    return {
      projects: (projectResult.results as ProjectDbRow[]).map(projectFromRow),
      items: (itemResult.results as ItemDbRow[]).map((row) => itemFromRow(row, tags.get(row.id) ?? [])),
      relations: (relationResult.results as RelationDbRow[]).map(relationFromRow),
    };
  }

  async replaceAll(snapshot: RepositorySnapshot): Promise<void> {
    const statements: D1PreparedStatement[] = [
      this.database.prepare("DELETE FROM relations"),
      this.database.prepare("DELETE FROM item_tags"),
      this.database.prepare("DELETE FROM items"),
      this.database.prepare("DELETE FROM projects"),
    ];
    for (const chunk of jsonChunks(snapshot.projects)) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO projects (id,title,genre,logline,description,status,created_at,updated_at)
             SELECT json_extract(value,'$.id'),json_extract(value,'$.title'),json_extract(value,'$.genre'),
                    json_extract(value,'$.logline'),json_extract(value,'$.description'),json_extract(value,'$.status'),
                    json_extract(value,'$.createdAt'),json_extract(value,'$.updatedAt')
             FROM json_each(?)`,
          )
          .bind(chunk),
      );
    }
    for (const chunk of jsonChunks(snapshot.items)) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO items (id,project_id,type,subtype,title,body,status,metadata,search_text,created_at,updated_at)
             SELECT json_extract(value,'$.id'),json_extract(value,'$.projectId'),json_extract(value,'$.type'),
                    json_extract(value,'$.subtype'),json_extract(value,'$.title'),json_extract(value,'$.body'),
                    json_extract(value,'$.status'),json_extract(value,'$.metadata'),json_extract(value,'$.searchText'),
                    json_extract(value,'$.createdAt'),json_extract(value,'$.updatedAt')
             FROM json_each(?)`,
          )
          .bind(chunk),
      );
      statements.push(
        this.database
          .prepare(
            `INSERT INTO item_tags (item_id,tag)
             SELECT json_extract(item.value,'$.id'),tag.value
             FROM json_each(?) AS item
             JOIN json_each(item.value,'$.tags') AS tag`,
          )
          .bind(chunk),
      );
    }
    for (const chunk of jsonChunks(snapshot.relations)) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO relations (id,source_item_id,target_item_id,relation_type,note,created_at)
             SELECT json_extract(value,'$.id'),json_extract(value,'$.sourceItemId'),json_extract(value,'$.targetItemId'),
                    json_extract(value,'$.relationType'),json_extract(value,'$.note'),json_extract(value,'$.createdAt')
             FROM json_each(?)`,
          )
          .bind(chunk),
      );
    }
    statements.push(
      this.database
        .prepare("INSERT INTO app_meta (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
        .bind("seed_version", "restored-1"),
    );
    await this.database.batch(statements);
  }

  private async hydrateItems(rows: ItemDbRow[]): Promise<ItemRecord[]> {
    const tags = await this.tagsForItemIds(rows.map((row) => row.id));
    return rows.map((row) => itemFromRow(row, tags.get(row.id) ?? []));
  }

  private async tagsForItemIds(itemIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (itemIds.length === 0) return map;
    for (let offset = 0; offset < itemIds.length; offset += 90) {
      const chunk = itemIds.slice(offset, offset + 90);
      const placeholders = chunk.map(() => "?").join(",");
      const result = await this.database
        .prepare(`SELECT item_id,tag FROM item_tags WHERE item_id IN (${placeholders}) ORDER BY item_id,tag`)
        .bind(...chunk)
        .all<{ item_id: string; tag: string }>();
      for (const row of result.results) {
        const tags = map.get(row.item_id) ?? [];
        tags.push(row.tag);
        map.set(row.item_id, tags);
      }
    }
    return map;
  }

  private async getItemsByIds(itemIds: string[]): Promise<ItemRecord[]> {
    const unique = [...new Set(itemIds)];
    if (unique.length === 0) return [];
    const rows: ItemDbRow[] = [];
    for (let offset = 0; offset < unique.length; offset += 90) {
      const chunk = unique.slice(offset, offset + 90);
      const placeholders = chunk.map(() => "?").join(",");
      const result = await this.database
        .prepare(`SELECT i.*,p.title AS project_title FROM items i INNER JOIN projects p ON p.id=i.project_id WHERE i.id IN (${placeholders})`)
        .bind(...chunk)
        .all<ItemDbRow>();
      rows.push(...result.results);
    }
    return this.hydrateItems(rows);
  }
}

export function createD1NovelRepository(): NovelRepository {
  return new D1NovelRepository();
}
