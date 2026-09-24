"use client";

import { RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { dateInputValue } from "@/lib/client/local-date";
import { CONTENT_STATUSES, CONTENT_STATUS_META } from "@/lib/domain/constants";
import type { ContentStatus, ItemFilters as ItemFilterValues, ProjectRecord } from "@/lib/domain/types";

type Props = {
  filters: ItemFilterValues;
  projects: ProjectRecord[];
  onChange: (patch: Partial<ItemFilterValues>) => void;
  onClear: () => void;
};

export function ItemFilters({ filters, projects, onChange, onClear }: Props) {
  return (
    <section aria-label="资料筛选" className="rounded-2xl border border-stone-300 bg-[#f2eee6] p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(14rem,1.5fr)_repeat(3,minmax(10rem,1fr))]">
        <div className="space-y-2">
          <Label htmlFor="library-query">关键词</Label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-500" />
            <Input id="library-query" type="search" aria-label="搜索资料库" value={filters.q ?? ""} onChange={(event) => onChange({ q: event.target.value })} placeholder="标题、正文、姓名或设定" className="h-11 bg-white pl-10" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="library-project">所属项目</Label>
          <NativeSelect id="library-project" aria-label="所属项目筛选" value={filters.projectId ?? ""} onChange={(event) => onChange({ projectId: event.target.value || undefined })} className="h-11 min-w-full bg-white">
            <NativeSelectOption value="">全部项目</NativeSelectOption>
            {projects.map((project) => <NativeSelectOption key={project.id} value={project.id}>{project.title}</NativeSelectOption>)}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="library-status">成熟度</Label>
          <NativeSelect id="library-status" aria-label="成熟度筛选" value={filters.status ?? ""} onChange={(event) => onChange({ status: event.target.value ? event.target.value as ContentStatus : undefined })} className="h-11 min-w-full bg-white">
            <NativeSelectOption value="">全部成熟度</NativeSelectOption>
            {CONTENT_STATUSES.map((value) => <NativeSelectOption key={value} value={value}>{CONTENT_STATUS_META[value].label}</NativeSelectOption>)}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="library-tag">标签</Label>
          <Input id="library-tag" aria-label="标签筛选" value={filters.tag ?? ""} onChange={(event) => onChange({ tag: event.target.value })} placeholder="精确标签" className="h-11 bg-white" />
        </div>
      </div>
      <div className="mt-4 grid gap-4 border-t border-stone-300 pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="library-updated-from">更新开始日期</Label>
          <Input
            id="library-updated-from"
            aria-label="更新开始日期"
            type="date"
            value={dateInputValue(filters.updatedFrom)}
            onChange={(event) => onChange({
              updatedFrom: event.target.value || undefined,
            })}
            className="h-11 bg-white"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="library-updated-to">更新结束日期</Label>
          <Input
            id="library-updated-to"
            aria-label="更新结束日期"
            type="date"
            value={dateInputValue(filters.updatedTo)}
            onChange={(event) => onChange({
              updatedTo: event.target.value || undefined,
            })}
            className="h-11 bg-white"
          />
        </div>
        <Button type="button" variant="ghost" onClick={onClear} className="min-h-11 text-stone-600">
          <RotateCcw aria-hidden="true" />清除筛选
        </Button>
      </div>
    </section>
  );
}
