"use client";
import { DraftDialog as Dialog } from "@/components/drafts/draft-dialog";

import { useCallback, useEffect, useState } from "react";
import { FolderPlus, LibraryBig } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/client/api";
import type { ProjectInput, ProjectRecord } from "@/lib/domain/types";
import { ProjectCard } from "./project-card";
import { ProjectForm } from "./project-form";

export function ProjectsClient() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    await apiRequest<{ created: boolean }>("/api/bootstrap", { method: "POST" });
    return apiRequest<ProjectRecord[]>("/api/projects");
  }, []);

  useEffect(() => {
    let active = true;
    void fetchProjects()
      .then((result) => {
        if (active) setProjects(result);
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
  }, [fetchProjects]);

  async function retryProjects() {
    setLoading(true);
    setError(null);
    try {
      setProjects(await fetchProjects());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "项目加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function createProject(input: ProjectInput) {
    const created = await apiRequest<ProjectRecord>("/api/projects", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setProjects((current) => [created, ...current]);
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm text-amber-800">让素材逐渐汇入同一个故事</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">小说项目</h1>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)} className="min-h-11 bg-amber-950 text-amber-50"><FolderPlus aria-hidden="true" />新建项目</Button>
      </header>

      {error ? (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <Button type="button" variant="outline" onClick={() => void retryProjects()} className="min-h-11 bg-white">重新加载</Button>
        </div>
      ) : null}
      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
      ) : error ? null : projects.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{projects.map((project) => <ProjectCard key={project.id} project={project} />)}</div>
      ) : (
        <Empty className="min-h-80 border border-stone-300 bg-[#fffdf8]">
          <EmptyHeader><EmptyMedia variant="icon"><LibraryBig aria-hidden="true" /></EmptyMedia><EmptyTitle>还没有小说项目</EmptyTitle><EmptyDescription>创建一个项目，人物、设定和灵感就有了共同归处。</EmptyDescription></EmptyHeader>
          <Button type="button" onClick={() => setCreateOpen(true)} className="min-h-11 bg-amber-950 text-amber-50">创建第一个项目</Button>
        </Empty>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-[#f7f4ed] sm:max-w-2xl">
          <DialogHeader><DialogTitle className="font-serif text-2xl">新建小说项目</DialogTitle><DialogDescription>题材可以暂时留空，先给长期积累一个名字。</DialogDescription></DialogHeader>
          <ProjectForm onSubmit={createProject} onSaved={() => setCreateOpen(false)} onCancel={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
