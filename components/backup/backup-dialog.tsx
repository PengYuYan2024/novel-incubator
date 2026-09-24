"use client";

import { ChangeEvent, useState } from "react";
import { DraftShelf } from "@/components/drafts/draft-panel";
import { DatabaseBackup, Download, FileJson, Upload } from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/client/api";
import type { BackupCounts } from "@/lib/domain/backup";
import type { BackupExportDocument } from "@/lib/domain/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportData?: () => Promise<BackupExportDocument>;
  preflightText?: (text: string) => Promise<BackupCounts>;
  restoreText?: (text: string) => Promise<BackupCounts>;
  onRestored?: () => void;
};

const defaultExport = () => apiRequest<BackupExportDocument>("/api/backup/export");
const defaultPreflight = (text: string) => apiRequest<BackupCounts>("/api/backup/preflight", { method: "POST", body: text });
const defaultRestore = (text: string) => apiRequest<BackupCounts>("/api/backup/restore", { method: "POST", body: text });

export function BackupDialog({
  open,
  onOpenChange,
  exportData = defaultExport,
  preflightText = defaultPreflight,
  restoreText = defaultRestore,
  onRestored = () => window.location.reload(),
}: Props) {
  const [fileText, setFileText] = useState<string | null>(null);
  const [counts, setCounts] = useState<BackupCounts | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `小说孵化器备份-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setSuccess("全部资料已经导出。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "导出失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setCounts(null);
    setFileText(null);
    setSuccess(null);
    setError(null);
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("备份文件不能超过 10 MB");
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      const nextCounts = await preflightText(text);
      setFileText(text);
      setCounts(nextCounts);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法读取这份备份");
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (!fileText) return;
    setBusy(true);
    setError(null);
    try {
      const restored = await restoreText(fileText);
      setSuccess(`已经恢复 ${restored.projects} 个项目和 ${restored.items} 条内容。`);
      onRestored();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "恢复失败，原有资料没有改变");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#f7f4ed] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-2xl"><DatabaseBackup aria-hidden="true" className="text-amber-800" />备份与恢复</DialogTitle>
          <DialogDescription>站点使用云端数据库；JSON 备份用于额外留存或完整恢复。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border border-stone-300 bg-[#fffdf8] p-5">
            <Download aria-hidden="true" className="size-6 text-amber-800" />
            <h3 className="mt-3 font-serif text-lg font-semibold">导出全部资料</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">下载项目、人物、世界观、灵感、标签与关联。</p>
            <Button type="button" onClick={() => void download()} disabled={busy} className="mt-4 min-h-11 bg-amber-950 text-amber-50">下载 JSON 备份</Button>
          </section>
          <section className="rounded-2xl border border-stone-300 bg-[#fffdf8] p-5">
            <Upload aria-hidden="true" className="size-6 text-amber-800" />
            <h3 className="mt-3 font-serif text-lg font-semibold">从备份恢复</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">先检查文件，再用备份完整替换当前资料。</p>
            <div className="mt-4 space-y-2">
              <Label htmlFor="backup-file">选择 JSON 备份</Label>
              <Input id="backup-file" type="file" accept="application/json,.json" onChange={(event) => void chooseFile(event)} disabled={busy} className="h-11 bg-white" />
            </div>
          </section>
        </div>

        {counts ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="flex items-center gap-2 font-medium"><FileJson aria-hidden="true" className="size-4" />检查通过</p>
            <p className="mt-1">{counts.projects} 个项目、{counts.items} 条内容、{counts.relations} 条关联</p>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button type="button" variant="destructive" disabled={busy} className="mt-4 min-h-11">恢复全部资料</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>用这份备份替换当前资料？</AlertDialogTitle><AlertDialogDescription>当前项目、内容与关联将被完整替换。请确认已导出当前资料作为备用。</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>返回</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => void restore()}>确认完整恢复</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}
        {error ? <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</p> : null}
        {success ? <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{success}</p> : null}
        <DraftShelf />
      </DialogContent>
    </Dialog>
  );
}
