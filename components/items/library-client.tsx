"use client";
import { DraftDialog as Dialog } from "@/components/drafts/draft-dialog";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/client/api";
import { buildItemQuery, hasItemFilters } from "@/lib/client/item-filters";
import { withUtcDateBounds } from "@/lib/client/local-date";
import type { ItemFilters as FilterValues, ItemInput, ItemRecord, ItemType, ProjectRecord } from "@/lib/domain/types";
import { ItemFilters } from "./item-filters";
import { ItemForm } from "./item-form";
import { ItemList } from "./item-list";

type Props = { initialFilters: FilterValues };

export function LibraryRouteView({ initialFilters }: Props) {
  return (
    <LibraryClient
      key={buildItemQuery(initialFilters)}
      initialFilters={initialFilters}
    />
  );
}

export function LibraryClient({ initialFilters }: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterValues>(initialFilters);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const deferredQuery = useDeferredValue(filters.q);
  const requestFilters = useMemo(
    () => withUtcDateBounds({ ...filters, q: deferredQuery }),
    [deferredQuery, filters],
  );
  const requestQuery = useMemo(() => buildItemQuery(requestFilters), [requestFilters]);

  useEffect(() => {
    let active = true;
    void apiRequest<{ created: boolean }>("/api/bootstrap", { method: "POST" })
      .then(() => apiRequest<ProjectRecord[]>("/api/projects"))
      .then((result) => {
        if (active) {
          setProjects(result);
          setReady(true);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "项目加载失败");
          setRefreshing(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const fetchItems = useCallback(
    () => apiRequest<ItemRecord[]>(`/api/items${requestQuery ? `?${requestQuery}` : ""}`),
    [requestQuery],
  );

  useEffect(() => {
    if (!ready) return;
    let active = true;
    void fetchItems()
      .then((result) => {
        if (!active) return;
        setItems(result);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "内容加载失败");
      })
      .finally(() => {
        if (active) setRefreshing(false);
      });
    return () => {
      active = false;
    };
  }, [fetchItems, ready]);

  function changeFilters(patch: Partial<FilterValues>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    setRefreshing(true);
    const query = buildItemQuery(next);
    router.replace(query ? `/library?${query}` : "/library", { scroll: false });
  }

  function clearFilters() {
    setFilters({});
    setRefreshing(true);
    router.replace("/library", { scroll: false });
  }

  async function createItem(input: ItemInput) {
    await apiRequest<ItemRecord>("/api/items", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setRefreshing(true);
    // The write is already confirmed; a list refresh failure must not invite a duplicate POST.
    void fetchItems().then(setItems).catch(() => setError("内容已保存，但列表刷新失败，请刷新页面查看。")).finally(() => setRefreshing(false));
  }

  async function retryLoad() {
    setError(null);
    setRefreshing(true);
    try {
      if (!ready) {
        await apiRequest<{ created: boolean }>("/api/bootstrap", { method: "POST" });
        setProjects(await apiRequest<ProjectRecord[]>("/api/projects"));
        setReady(true);
      }
      setItems(await fetchItems());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "资料加载失败");
    } finally {
      setRefreshing(false);
    }
  }

  const tab = filters.type ?? "all";

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm text-amber-800">从收集箱到可采用</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">内容资料库</h1>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)} className="min-h-11 bg-amber-950 text-amber-50">
          <Plus aria-hidden="true" />新增内容
        </Button>
      </header>

      <Tabs value={tab} onValueChange={(value) => changeFilters({ type: value === "all" ? undefined : value as ItemType })}>
        <TabsList className="h-auto w-full justify-start overflow-x-auto bg-transparent p-0" variant="line">
          <TabsTrigger value="all" className="min-h-11 px-4">全部内容</TabsTrigger>
          <TabsTrigger value="inspiration" className="min-h-11 px-4">灵感记录</TabsTrigger>
          <TabsTrigger value="character" className="min-h-11 px-4">人物卡</TabsTrigger>
          <TabsTrigger value="world" className="min-h-11 px-4">世界观设定</TabsTrigger>
        </TabsList>
      </Tabs>

      <ItemFilters filters={filters} projects={projects} onChange={changeFilters} onClear={clearFilters} />

      {error ? (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <Button type="button" variant="outline" onClick={() => void retryLoad()} className="min-h-11 bg-white">重新加载</Button>
        </div>
      ) : null}

      {refreshing ? (
        <div aria-label="正在更新内容" className="grid gap-3">
          <Skeleton className="h-36 rounded-2xl" /><Skeleton className="h-36 rounded-2xl" /><Skeleton className="h-36 rounded-2xl" />
        </div>
      ) : (
        <ItemList items={items} hasFilters={hasItemFilters(filters)} onClearFilters={clearFilters} />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-[#f7f4ed] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">新增内容</DialogTitle>
            <DialogDescription>选择灵感、人物或世界观，之后仍可继续补充。</DialogDescription>
          </DialogHeader>
          <ItemForm projects={projects.filter((project) => project.status !== "archived")} onSubmit={createItem} onSaved={() => setCreateOpen(false)} onCancel={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
