"use client";
import { DraftDialog as Dialog } from "@/components/drafts/draft-dialog";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Lightbulb, Tags } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/client/api";
import { filterProjectItems, projectMaturityCounts } from "@/lib/client/project-view";
import { CONTENT_STATUSES, CONTENT_STATUS_META, ITEM_TYPE_LABELS, PROJECT_STATUS_LABELS } from "@/lib/domain/constants";
import type { ContentStatus, ItemRecord, ItemType, ProjectInput, ProjectRecord, ProjectStatus } from "@/lib/domain/types";
import { ProjectActions } from "./project-actions";
import { ProjectForm } from "./project-form";

type Payload = { project: ProjectRecord; items: ItemRecord[] };

function itemTitle(item: ItemRecord) {
  return item.title || item.body.split(/\r?\n/)[0].slice(0, 48) || "未命名内容";
}

function ProjectItems({ title, type, items }: { title: string; type: ItemType; items: ItemRecord[] }) {
  const subset = items.filter((item) => item.type === type);
  return (
    <Card className="border-stone-300 bg-[#fffdf8] shadow-none">
      <CardHeader><CardTitle className="flex items-center justify-between gap-3 font-serif text-xl"><span>{title}</span><Badge variant="outline">{subset.length}</Badge></CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {subset.length ? subset.map((item) => (
          <Link key={item.id} href={`/items/${item.id}`} className="flex min-h-14 items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2 hover:border-amber-300">
            <StatusBadge status={item.status} /><span className="min-w-0 flex-1 truncate font-medium">{itemTitle(item)}</span>
          </Link>
        )) : <p className="rounded-xl border border-dashed border-stone-300 p-5 text-center text-sm text-stone-500">还没有{title}</p>}
      </CardContent>
    </Card>
  );
}

export function ProjectDetail({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "">("");
  const [tagFilter, setTagFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    await apiRequest<{ created: boolean }>("/api/bootstrap", { method: "POST" });
    return apiRequest<Payload>(`/api/projects/${encodeURIComponent(projectId)}`);
  }, [projectId]);

  useEffect(() => {
    let active = true;
    void fetchProject()
      .then((payload) => {
        if (!active) return;
        setProject(payload.project);
        setItems(payload.items);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "项目加载失败");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchProject]);

  async function retryInitialLoad() {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchProject();
      setProject(payload.project);
      setItems(payload.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "项目加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function updateProject(input: ProjectInput, expectedUpdatedAt?: string) {
    if (!project) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await apiRequest<ProjectRecord>(`/api/projects/${encodeURIComponent(project.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ ...input, expectedUpdatedAt: expectedUpdatedAt ?? project.updatedAt }),
      });
      setProject(updated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败，请稍后重试");
      throw reason;
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status: ProjectStatus) {
    if (!project || status === project.status) return;
    try {
      await updateProject({ ...project, status });
    } catch {
      // updateProject exposes the actionable error.
    }
  }

  async function deleteProject() {
    if (!project) return;
    setBusy(true);
    setError(null);
    try {
      await apiRequest<{ deleted: true }>(`/api/projects/${encodeURIComponent(project.id)}`, { method: "DELETE" });
      router.push("/projects");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "删除失败，请稍后重试");
      setBusy(false);
    }
  }

  const filteredItems = useMemo(
    () => filterProjectItems(items, { status: statusFilter || undefined, tag: tagFilter || undefined }),
    [items, statusFilter, tagFilter],
  );
  const recentItems = useMemo(
    () => statusFilter === "archived"
      ? filteredItems
      : filteredItems.filter((item) => item.status !== "archived"),
    [filteredItems, statusFilter],
  );
  const counts = useMemo(() => projectMaturityCounts(items), [items]);

  if (loading) return <div aria-label="正在加载项目" className="space-y-5"><Skeleton className="h-16 w-2/3" /><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>;
  if (!project) {
    return (
      <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-900">
        <p>{error ?? "项目不存在或已被删除"}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="min-h-11 bg-white" onClick={() => void retryInitialLoad()}>重新加载</Button>
          <Button asChild variant="ghost" className="min-h-11"><Link href="/projects">返回小说项目</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <Link href="/projects" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-amber-900 hover:underline"><ArrowLeft aria-hidden="true" className="size-4" />返回小说项目</Link>
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-2"><Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-950">{PROJECT_STATUS_LABELS[project.status]}</Badge><Badge variant="secondary">{project.genre || "类型待确定"}</Badge></div>
          <h1 className="font-serif text-3xl font-semibold sm:text-4xl">{project.title}</h1>
          <p className="mt-3 text-lg leading-8 text-stone-700">{project.logline || "还没有填写一句话梗概。"}</p>
          <p className="mt-3 flex items-center gap-2 text-sm text-stone-500"><CalendarDays aria-hidden="true" className="size-4" />更新于 {new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(new Date(project.updatedAt))}</p>
        </div>
        <ProjectActions project={project} contentCount={items.length} busy={busy} onEdit={() => setEditOpen(true)} onStatusChange={changeStatus} onDelete={deleteProject} />
      </header>

      {error ? <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">{error}</p> : null}
      {project.description ? <Card className="border-stone-300 bg-[#fffdf8] shadow-none"><CardHeader><CardTitle className="font-serif text-xl">项目说明</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap leading-8">{project.description}</p></CardContent></Card> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="成熟度分布">
        {CONTENT_STATUSES.map((status) => <button key={status} type="button" onClick={() => setStatusFilter(statusFilter === status ? "" : status)} className={`rounded-2xl border p-4 text-left transition ${statusFilter === status ? "border-amber-700 bg-amber-50" : "border-stone-300 bg-[#fffdf8] hover:border-amber-300"}`}><span className="text-sm text-stone-600">{CONTENT_STATUS_META[status].label}</span><strong className="mt-2 block font-serif text-3xl">{counts[status]}</strong></button>)}
      </section>

      <section className="rounded-2xl border border-stone-300 bg-[#f2eee6] p-4" aria-label="项目内容筛选">
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-2"><Label htmlFor="project-maturity">成熟度</Label><NativeSelect id="project-maturity" aria-label="项目成熟度筛选" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ContentStatus | "")} className="h-11 min-w-full bg-white"><NativeSelectOption value="">全部成熟度</NativeSelectOption>{CONTENT_STATUSES.map((value) => <NativeSelectOption key={value} value={value}>{CONTENT_STATUS_META[value].label}</NativeSelectOption>)}</NativeSelect></div>
          <div className="space-y-2"><Label htmlFor="project-tag">标签</Label><div className="relative"><Tags aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-500" /><Input id="project-tag" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} placeholder="输入精确标签" className="h-11 bg-white pl-10" /></div></div>
          <Link href={`/library?project=${encodeURIComponent(project.id)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-amber-950 px-4 text-sm font-medium text-amber-50"><Lightbulb aria-hidden="true" className="size-4" />打开项目资料库</Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-serif text-2xl font-semibold">最近关联内容</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{recentItems.slice(0, 6).map((item) => <Link key={item.id} href={`/items/${item.id}`} className="rounded-xl border border-stone-300 bg-[#fffdf8] p-4 hover:border-amber-300"><div className="flex items-center justify-between gap-2"><Badge variant="outline">{ITEM_TYPE_LABELS[item.type]}</Badge><StatusBadge status={item.status} /></div><p className="mt-3 truncate font-medium">{itemTitle(item)}</p></Link>)}</div>
        {recentItems.length === 0 ? <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">当前筛选下没有内容。</p> : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-3"><ProjectItems title="灵感" type="inspiration" items={filteredItems} /><ProjectItems title="人物" type="character" items={filteredItems} /><ProjectItems title="世界观" type="world" items={filteredItems} /></section>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-[#f7f4ed] sm:max-w-2xl"><DialogHeader><DialogTitle className="font-serif text-2xl">编辑项目</DialogTitle><DialogDescription>项目阶段与普通内容成熟度彼此独立。</DialogDescription></DialogHeader><ProjectForm initialProject={project} onSubmit={updateProject} onSaved={() => setEditOpen(false)} onCancel={() => setEditOpen(false)} /></DialogContent>
      </Dialog>
    </div>
  );
}
