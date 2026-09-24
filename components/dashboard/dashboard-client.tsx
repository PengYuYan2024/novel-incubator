"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/client/api";
import { mergeSavedItemIntoDashboard } from "@/lib/client/dashboard";
import { localDateRange } from "@/lib/client/local-date";
import type { DashboardData, ItemInput, ItemRecord, ProjectRecord } from "@/lib/domain/types";
import { DashboardStats } from "./dashboard-stats";
import { QuickCaptureForm } from "./quick-capture-form";
import { RecentItems } from "./recent-items";
import { RecentProjects } from "./recent-projects";

export function DashboardClient() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    await apiRequest<{ created: boolean }>("/api/bootstrap", { method: "POST" });
    const today = localDateRange();
    const todayQuery = new URLSearchParams({
      todayStart: today.start,
      todayEnd: today.end,
    });
    const [nextDashboard, nextProjects] = await Promise.all([
      apiRequest<DashboardData>(`/api/dashboard?${todayQuery}`),
      apiRequest<ProjectRecord[]>("/api/projects"),
    ]);
    return { nextDashboard, nextProjects };
  }, []);

  const refreshFromServer = useCallback(() => {
    void fetchDashboard()
      .then(({ nextDashboard, nextProjects }) => {
        setDashboard(nextDashboard);
        setProjects(nextProjects);
      })
      .catch(() => {
        // The optimistic update remains visible; the next page load retries.
      });
  }, [fetchDashboard]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { nextDashboard, nextProjects } = await fetchDashboard();
      setDashboard(nextDashboard);
      setProjects(nextProjects);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "资料加载失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [fetchDashboard]);

  useEffect(() => {
    let active = true;
    void fetchDashboard()
      .then(({ nextDashboard, nextProjects }) => {
        if (!active) return;
        setDashboard(nextDashboard);
        setProjects(nextProjects);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "资料加载失败，请稍后重试");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchDashboard]);

  useEffect(() => {
    function handleToolCreation(event: Event) {
      const item = (event as CustomEvent<ItemRecord>).detail;
      if (!item?.id) return;
      setDashboard((current) => current ? mergeSavedItemIntoDashboard(current, item) : current);
      setProjects((current) => current.map((project) => {
        if (project.id !== item.projectId) return project;
        const counts = project.counts ?? { inspiration: 0, character: 0, world: 0 };
        return {
          ...project,
          updatedAt: item.updatedAt,
          counts: item.status === "archived"
            ? counts
            : { ...counts, inspiration: counts.inspiration + 1 },
        };
      }));
      refreshFromServer();
    }
    window.addEventListener("novel-incubator:item-created", handleToolCreation);
    return () => window.removeEventListener("novel-incubator:item-created", handleToolCreation);
  }, [refreshFromServer]);

  async function saveItem(input: ItemInput) {
    const item = await apiRequest<ItemRecord>("/api/items", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setDashboard((current) => current ? mergeSavedItemIntoDashboard(current, item) : current);
    setProjects((current) => current.map((project) => {
      if (project.id !== item.projectId) return project;
      const counts = project.counts ?? { inspiration: 0, character: 0, world: 0 };
      return {
        ...project,
        updatedAt: item.updatedAt,
        counts: { ...counts, inspiration: counts.inspiration + 1 },
      };
    }));
    refreshFromServer();
    return item;
  }

  if (loading && !dashboard) {
    return (
      <div className="space-y-6" aria-label="正在加载工作台">
        <Skeleton className="h-20 w-3/4" />
        <Skeleton className="h-[26rem] w-full rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-2xl">
        <AlertTitle>暂时打不开资料库</AlertTitle>
        <AlertDescription>
          <p>{error ?? "请稍后重试"}</p>
          <Button type="button" variant="outline" className="mt-3 min-h-11" onClick={() => void load()}>重新加载</Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm text-amber-800">今天记录了 {dashboard.todayCount} 条</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">把一闪而过的念头留下</h1>
        </div>
        <p className="max-w-md text-sm leading-6 text-stone-600">先收下来，之后再慢慢长成人物、设定或情节。</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
        <QuickCaptureForm projects={projects.filter((project) => project.status !== "archived")} saveItem={saveItem} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Card className="border-stone-300 bg-[#f1ede4] shadow-none">
            <CardContent className="pt-1">
              <p className="text-sm font-medium text-stone-600">待整理</p>
              <strong className="mt-3 block font-serif text-4xl text-amber-950">{dashboard.inboxCount}</strong>
              <p className="mt-2 text-sm text-stone-600">条记录还在收集箱</p>
            </CardContent>
          </Card>
          <RecentProjects projects={dashboard.recentProjects} />
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <RecentItems items={dashboard.recentItems} />
        <DashboardStats data={dashboard} />
      </section>
    </div>
  );
}
