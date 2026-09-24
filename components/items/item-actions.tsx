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
import { CONTENT_STATUSES, CONTENT_STATUS_META } from "@/lib/domain/constants";
import type { ContentStatus, ItemRecord } from "@/lib/domain/types";

type Props = {
  item: ItemRecord;
  busy: boolean;
  onEdit: () => void;
  onStatusChange: (status: ContentStatus) => Promise<unknown> | unknown;
  onDelete: () => Promise<unknown> | unknown;
};

export function ItemActions({ item, busy, onEdit, onStatusChange, onDelete }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect
        aria-label="直接修改成熟度"
        value={item.status}
        disabled={busy}
        onChange={(event) => void onStatusChange(event.target.value as ContentStatus)}
        className="h-11 bg-white"
      >
        {CONTENT_STATUSES.map((value) => <NativeSelectOption key={value} value={value}>{CONTENT_STATUS_META[value].label}</NativeSelectOption>)}
      </NativeSelect>
      <Button type="button" variant="outline" onClick={onEdit} disabled={busy} className="min-h-11 bg-white">
        <Pencil aria-hidden="true" />编辑
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" disabled={busy} className="min-h-11 border-red-300 bg-white text-red-800 hover:bg-red-50">
            <Trash2 aria-hidden="true" />永久删除
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>永久删除这条内容？</AlertDialogTitle>
            <AlertDialogDescription>内容和它的全部关联都会被删除，且无法通过归档恢复。建议不确定时先改为“已归档”。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>返回</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void onDelete()}>确认永久删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
