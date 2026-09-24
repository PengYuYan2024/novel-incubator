export const DRAFT_PREFIX = "novel-incubator:draft:v1:";
export type DraftRecord<T = unknown> = {
  version: 1; scope: string; savedAt: string; baseUpdatedAt?: string; data: T;
};
export type StoredDraft = { key: string; raw: string; record: DraftRecord | null };

export function readDrafts(storage: Storage, scope?: string): StoredDraft[] {
  const found: StoredDraft[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith(DRAFT_PREFIX)) continue;
    const raw = storage.getItem(key);
    if (raw === null) continue;
    let record: DraftRecord | null = null;
    try {
      const value = JSON.parse(raw);
      if (value?.version === 1 && typeof value.scope === "string" && typeof value.savedAt === "string" &&
          Number.isFinite(Date.parse(value.savedAt)) && value.data && typeof value.data === "object" &&
          (value.baseUpdatedAt === undefined || typeof value.baseUpdatedAt === "string")) record = value;
    } catch { /* Keep damaged data available for manual export. */ }
    if (!scope || record?.scope === scope || (!record && key.startsWith(`${DRAFT_PREFIX}${encodeURIComponent(scope)}:`))) {
      found.push({ key, raw, record });
    }
  }
  return found.sort((a, b) => (b.record?.savedAt ?? "").localeCompare(a.record?.savedAt ?? ""));
}

// Compare-and-remove: never erase a draft another page has changed meanwhile.
export function removeDraft(storage: Storage, entry: Pick<StoredDraft, "key" | "raw">) {
  if (storage.getItem(entry.key) === entry.raw) storage.removeItem(entry.key);
}

export function sameShape(value: unknown, example: unknown): boolean {
  if (typeof example === "string") return typeof value === "string";
  if (Array.isArray(example)) return Array.isArray(value) && value.every(v => typeof v === "string");
  if (example && typeof example === "object") {
    return !!value && typeof value === "object" && !Array.isArray(value) &&
      Object.entries(example).every(([key, sample]) => Object.hasOwn(value, key) && sameShape((value as Record<string, unknown>)[key], sample));
  }
  return typeof value === typeof example;
}

export function downloadDraft(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `小说草稿-${new Date().toISOString().replaceAll(":", "-")}.txt`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
