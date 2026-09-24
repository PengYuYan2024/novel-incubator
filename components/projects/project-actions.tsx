"use client";

import { Pencil, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/domain/constants";
import type { ProjectRecord, ProjectStatus } from "@/lib/domain/types";

type Props = {
  project: ProjectRecord;
  contentCount?: number;
  busy: boolean;
  onEdit: () => void;
  onStatusChange: (status: ProjectStatus) => Promise<unknown> | unknown;
  onDelete: () => Promise<unknown> | unknown;
};

export function ProjectActions({ project, contentCount, busy, onEdit, onStatusChange, onDelete }: Props) {
  const counts = project.counts ?? { inspiration: 0, character: 0, world: 0 };
  const total = contentCount ?? counts.inspiration + counts.character + counts.world;
  return (
    <div className="flex flex-wrap gap-2">
      <NativeSelect aria-label="直接修改项目阶段" value={project.status} disabled={busy} onChange={(event) => void onStatusChange(event.target.value as ProjectStatus)} className="h-11 bg-white">
        {PROJECT_STATUSES.map((value) => <NativeSelectOption key={value} value={value}>{PROJECT_STATUS_LABELS[value]}</NativeSelectOption>)}
      </NativeSelect>
      <Button type="button" variant="outline" onClick={onEdit} disabled={busy} className="min-h-11 bg-white"><Pencil aria-hidden="true" />编辑</Button>
      <AlertDialog>
        <AlertDialogTrigger asChild><Button type="button" variant="outline" disabled={busy} className="min-h-11 border-red-300 bg-white text-red-800"><Trash2 aria-hidden="true" />删除项目</Button></AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{total > 0 ? "这个项目还不能删除" : "永久删除这个项目？"}</AlertDialogTitle>
            <AlertDialogDescription>{total > 0 ? `请先迁移或删除项目中的 ${total} 条内容` : "空项目会被永久删除，之后无法恢复。"}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>返回</AlertDialogCancel>
            {total === 0 ? <AlertDialogAction variant="destructive" onClick={() => void onDelete()}>确认删除项目</AlertDialogAction> : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
