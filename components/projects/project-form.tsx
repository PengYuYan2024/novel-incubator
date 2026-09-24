"use client";

import { FormEvent, useState } from "react";
import { useLocalDraft } from "@/lib/client/use-local-draft";
import { DraftPanel } from "@/components/drafts/draft-panel";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/domain/constants";
import type { ProjectInput, ProjectRecord, ProjectStatus } from "@/lib/domain/types";

type Props = {
  initialProject?: ProjectRecord;
  onSubmit: (input: ProjectInput, expectedUpdatedAt?: string) => Promise<unknown> | unknown;
  onSaved?: () => void;
  onCancel?: () => void;
};

export function ProjectForm({ initialProject, onSubmit, onCancel, onSaved }: Props) {
  const [title, setTitle] = useState(initialProject?.title ?? "");
  const [genre, setGenre] = useState(initialProject?.genre ?? "");
  const [logline, setLogline] = useState(initialProject?.logline ?? "");
  const [description, setDescription] = useState(initialProject?.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(initialProject?.status ?? "warming");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = { title, genre, logline, description, status };
  const draft = useLocalDraft({ scope: initialProject ? `project:${initialProject.id}` : "project:new", value, saving, baseUpdatedAt: initialProject?.updatedAt,
    restore(data) { setTitle(data.title); setGenre(data.genre); setLogline(data.logline); setDescription(data.description); setStatus(data.status); },
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || draft.conflict) return;
    draft.flush();
    setSaving(true);
    setError(null);
    try {
      const input = { title, genre, logline, description, status };
      if (draft.baseUpdatedAt) await onSubmit(input, draft.baseUpdatedAt);
      else await onSubmit(input);
      draft.saved();
      onSaved?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <DraftPanel draft={draft} value={value} />
      <fieldset disabled={saving} className="space-y-5 min-w-0">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="project-title">项目名称</Label>
          <Input id="project-title" value={title} onChange={(event) => setTitle(event.target.value)} required className="h-11 bg-white" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="project-genre">类型</Label>
          <Input id="project-genre" value={genre} onChange={(event) => setGenre(event.target.value)} placeholder="待确定" className="h-11 bg-white" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="project-logline">一句话梗概</Label>
        <Textarea id="project-logline" value={logline} onChange={(event) => setLogline(event.target.value)} rows={3} className="bg-white" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="project-description">项目说明</Label>
        <Textarea id="project-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={6} className="bg-white" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="project-status">当前阶段</Label>
        <NativeSelect id="project-status" aria-label="当前阶段" value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)} className="h-11 min-w-full bg-white">
          {PROJECT_STATUSES.map((value) => <NativeSelectOption key={value} value={value}>{PROJECT_STATUS_LABELS[value]}</NativeSelectOption>)}
        </NativeSelect>
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? <Button type="button" variant="outline" onClick={draft.close ?? onCancel} className="min-h-11">取消</Button> : null}
        <Button type="submit" disabled={saving || draft.conflict} className="min-h-11 bg-amber-950 text-amber-50">{saving ? "保存中…" : "保存项目"}</Button>
      </div>
      </fieldset>
    </form>
  );
}
