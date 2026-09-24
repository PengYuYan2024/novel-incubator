"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarDays } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DraftDialog as Dialog } from "@/components/drafts/draft-dialog";

import { ItemActions } from "@/components/items/item-actions";
import { ItemForm } from "@/components/items/item-form";
import { RelationManager } from "@/components/items/relation-manager";
import { StatusBadge } from "@/components/items/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/client/api";
import { INSPIRATION_SUBTYPE_LABELS, ITEM_TYPE_LABELS, WORLD_SUBTYPE_LABELS } from "@/lib/domain/constants";
import type {
  CharacterMetadata,
  ContentStatus,
  ItemInput,
  ItemRecord,
  ProjectRecord,
  RelationInput,
  RelationRecord,
  RelationView,
  WorldMetadata,
} from "@/lib/domain/types";

type DetailPayload = { item: ItemRecord; relations: RelationView[] };

function displayTitle(item: ItemRecord) {
  return item.title || item.body.split(/\r?\n/)[0].slice(0, 60) || "未命名内容";
}

export function ItemDetail({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [item, setItem] = useState<ItemRecord | null>(null);
  const [relations, setRelations] = useState<RelationView[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    await apiRequest<{ created: boolean }>("/api/bootstrap", { method: "POST" });
    const [detail, projectList] = await Promise.all([
      apiRequest<DetailPayload>(`/api/items/${encodeURIComponent(itemId)}`),
      apiRequest<ProjectRecord[]>("/api/projects"),
    ]);
    return { detail, projectList };
  }, [itemId]);

  const reload = useCallback(async () => {
    try {
      const { detail, projectList } = await fetchDetail();
      setItem(detail.item);
      setRelations(detail.relations);
      setProjects(projectList);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "内容加载失败");
    } finally {
      setLoading(false);
    }
  }, [fetchDetail]);

  useEffect(() => {
    let active = true;
    void fetchDetail()
      .then(({ detail, projectList }) => {
        if (!active) return;
        setItem(detail.item);
        setRelations(detail.relations);
        setProjects(projectList);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "内容加载失败");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchDetail]);

  async function update(input: ItemInput, expectedUpdatedAt?: string) {
    if (!item) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await apiRequest<ItemRecord>(`/api/items/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ ...input, expectedUpdatedAt: expectedUpdatedAt ?? item.updatedAt }),
      });
      setItem(updated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败，请稍后重试");
      throw reason;
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status: ContentStatus) {
    if (!item || status === item.status) return;
    try {
      await update({ ...item, status });
    } catch {
      // The visible error is set by update().
    }
  }

  async function deleteItem() {
    if (!item) return;
    setBusy(true);
    setError(null);
    try {
      await apiRequest<{ deleted: true }>(`/api/items/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      router.push("/library");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "删除失败，请稍后重试");
      setBusy(false);
    }
  }

  async function searchCandidates(query: string) {
    const search = new URLSearchParams({ includeArchived: "true" });
    if (query) search.set("q", query);
    return apiRequest<ItemRecord[]>(`/api/items?${search.toString()}`);
  }

  async function createRelation(input: RelationInput) {
    await apiRequest<RelationRecord>("/api/relations", { method: "POST", body: JSON.stringify(input) });
    await reload();
  }

  async function deleteRelation(id: string) {
    await apiRequest<{ deleted: true }>(`/api/relations/${encodeURIComponent(id)}`, { method: "DELETE" });
    setRelations((current) => current.filter((relation) => relation.id !== id));
  }

  if (loading) {
    return <div aria-label="正在加载内容" className="space-y-5"><Skeleton className="h-12 w-2/3" /><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;
  }
  if (!item) {
    return (
      <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-900">
        <p>{error ?? "内容不存在或已被删除"}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="min-h-11 bg-white" onClick={() => {
            setLoading(true);
            void reload();
          }}>重新加载</Button>
          <Button asChild variant="ghost" className="min-h-11"><Link href="/library">返回资料库</Link></Button>
        </div>
      </div>
    );
  }

  const character = item.type === "character" ? item.metadata as CharacterMetadata : null;
  const world = item.type === "world" ? item.metadata as WorldMetadata : null;
  const subtypeLabel = item.type === "inspiration"
    ? INSPIRATION_SUBTYPE_LABELS[item.subtype as keyof typeof INSPIRATION_SUBTYPE_LABELS]
    : item.type === "world"
      ? WORLD_SUBTYPE_LABELS[item.subtype as keyof typeof WORLD_SUBTYPE_LABELS]
      : null;

  return (
    <div className="space-y-6">
      <Link href="/library" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-amber-900 hover:underline"><ArrowLeft aria-hidden="true" className="size-4" />返回资料库</Link>
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2"><Badge variant="outline">{ITEM_TYPE_LABELS[item.type]}</Badge>{subtypeLabel ? <Badge variant="secondary">{subtypeLabel}</Badge> : null}<StatusBadge status={item.status} /></div>
          <h1 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">{displayTitle(item)}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-stone-600"><span>{item.projectTitle}</span><span aria-hidden="true">·</span><CalendarDays aria-hidden="true" className="size-4" /><time dateTime={item.updatedAt}>{new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(item.updatedAt))}</time></p>
        </div>
        <ItemActions item={item} busy={busy} onEdit={() => setEditOpen(true)} onStatusChange={changeStatus} onDelete={deleteItem} />
      </header>

      {error ? <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">{error}</p> : null}

      <Card className="border-stone-300 bg-[#fffdf8] shadow-none">
        <CardHeader><CardTitle className="font-serif text-xl">内容资料</CardTitle></CardHeader>
        <CardContent className="space-y-5 text-[1rem] leading-8">
          {item.body ? <p className="whitespace-pre-wrap">{item.body}</p> : null}
          {character ? <dl className="grid gap-4 sm:grid-cols-2">{([
            ["角色定位", character.role], ["核心欲望", character.coreDesire], ["内在矛盾", character.innerConflict], ["性格特征", character.traits], ["人物经历", character.history], ["备注", character.notes],
          ] as const).map(([label, value]) => <div key={label} className={label === "人物经历" || label === "备注" ? "sm:col-span-2" : ""}><dt className="text-sm font-medium text-stone-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap">{value || "尚未补充"}</dd></div>)}</dl> : null}
          {world ? <dl className="grid gap-5"><div><dt className="text-sm font-medium text-stone-500">详细规则</dt><dd className="mt-1 whitespace-pre-wrap">{world.rules || "尚未补充"}</dd></div><div><dt className="text-sm font-medium text-stone-500">限制或代价</dt><dd className="mt-1 whitespace-pre-wrap">{world.cost || "尚未补充"}</dd></div></dl> : null}
          <div className="flex flex-wrap gap-2 border-t border-stone-200 pt-4">{item.tags.length ? item.tags.map((tag) => <Badge key={tag} variant="secondary">#{tag}</Badge>) : <span className="text-sm text-stone-500">还没有标签</span>}</div>
        </CardContent>
      </Card>

      <Card className="border-stone-300 bg-[#fffdf8] shadow-none"><CardContent className="pt-1"><RelationManager item={item} relations={relations} searchCandidates={searchCandidates} createRelation={createRelation} deleteRelation={deleteRelation} /></CardContent></Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-[#f7f4ed] sm:max-w-3xl">
          <DialogHeader><DialogTitle className="font-serif text-2xl">编辑内容</DialogTitle><DialogDescription>保存时会检查这条内容是否已在其他页面更新。</DialogDescription></DialogHeader>
          <ItemForm projects={projects.filter((project) => project.status !== "archived" || project.id === item.projectId)} initialItem={item} onSubmit={update} onSaved={() => setEditOpen(false)} onCancel={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
