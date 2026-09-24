"use client";

import { FormEvent, useState } from "react";
import { useLocalDraft } from "@/lib/client/use-local-draft";
import { DraftPanel } from "@/components/drafts/draft-panel";
import { CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/items/status-badge";
import { TagField } from "@/components/items/tag-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  INSPIRATION_SUBTYPES,
  INSPIRATION_SUBTYPE_LABELS,
} from "@/lib/domain/constants";
import type {
  InspirationSubtype,
  ItemInput,
  ItemRecord,
  ProjectRecord,
} from "@/lib/domain/types";
import { normalizeTags } from "@/lib/domain/validation";

const LAST_PROJECT_KEY = "novel-incubator:last-project";

type Props = {
  projects: ProjectRecord[];
  saveItem: (input: ItemInput) => Promise<ItemRecord>;
  onSaved?: (item: ItemRecord) => void;
};

export function QuickCaptureForm({ projects, saveItem, onSaved }: Props) {
  const [projectId, setProjectId] = useState(() => {
    if (typeof window !== "undefined") {
      let remembered: string | null = null;
      try { remembered = localStorage.getItem(LAST_PROJECT_KEY); } catch { /* Draft panel reports unavailable storage. */ }
      if (remembered && projects.some((project) => project.id === remembered)) {
        return remembered;
      }
    }
    return projects[0]?.id ?? "";
  });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [subtype, setSubtype] = useState<InspirationSubtype>("idea");
  const [tagText, setTagText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<ItemRecord | null>(null);
  const selectedProjectId = projects.some((project) => project.id === projectId) ? projectId : "";
  const value = { projectId, title, body, subtype, tagText };
  const draft = useLocalDraft({ scope: "capture:new", value, saving,
    restore(data) { setProjectId(data.projectId); setTitle(data.title); setBody(data.body); setSubtype(data.subtype); setTagText(data.tagText); },
  });

  function selectProject(value: string) {
    setProjectId(value);
    try { localStorage.setItem(LAST_PROJECT_KEY, value); } catch { /* Remembering a preference must not block editing. */ }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!body.trim()) {
      setError("请输入正文");
      return;
    }
    if (!selectedProjectId) {
      setError("请先创建一个小说项目");
      return;
    }
    setSaving(true);
    draft.flush();
    setError(null);
    try {
      const item = await saveItem({
        projectId: selectedProjectId,
        type: "inspiration",
        subtype,
        title,
        body,
        status: "inbox",
        tags: normalizeTags(tagText.split(/[,，\n]/)),
        metadata: {},
      });
      draft.saved();
      setSaved(item);
      onSaved?.(item);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "暂时无法保存");
    } finally {
      setSaving(false);
    }
  }

  function continueCapture() {
    draft.discard();
    setTitle("");
    setBody("");
    setTagText("");
    setSaved(null);
    setError(null);
  }

  return (
    <Card className="border-stone-300 bg-[#fffdf8] shadow-[0_18px_55px_rgba(69,55,35,0.08)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 font-serif text-xl">
            <Sparkles aria-hidden="true" className="size-5 text-amber-700" />
            快速记录
          </CardTitle>
          <StatusBadge status="inbox" />
        </div>
      </CardHeader>
      <CardContent>
        {saved ? (
          <Alert className="border-emerald-300 bg-emerald-50 text-emerald-950">
            <CheckCircle2 aria-hidden="true" />
            <AlertTitle>已经收进来了</AlertTitle>
            <AlertDescription>
              <p>这条记录已进入收集箱。</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" onClick={continueCapture} className="min-h-11 bg-amber-950 text-amber-50">
                  继续记录
                </Button>
                <Button asChild type="button" variant="outline" className="min-h-11 bg-white">
                  <Link href={`/items/${saved.id}`}>打开整理</Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <DraftPanel draft={draft} value={value} />
            {!selectedProjectId && projects.length > 0 && <p role="alert">原所属项目已不存在，草稿未被转移。请复制或下载内容，或明确选择另一个项目。</p>}
            <fieldset disabled={saving} className="min-w-0 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="capture-title">标题（可选）</Label>
                <Input
                  id="capture-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="给它一个便于找回的名字"
                  className="h-11 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capture-project">所属项目</Label>
                <NativeSelect
                  id="capture-project"
                  aria-label="所属项目"
                  value={selectedProjectId}
                  onChange={(event) => selectProject(event.target.value)}
                  className="h-11 bg-white"
                  disabled={projects.length === 0}
                >
                  {!selectedProjectId ? (
                    <NativeSelectOption value="">请选择有效项目</NativeSelectOption>
                  ) : null}
                  {projects.map((project) => (
                    <NativeSelectOption key={project.id} value={project.id}>
                      {project.title}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="capture-body">正文</Label>
              <Textarea
                id="capture-body"
                required
                rows={7}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="一句台词、一个画面、突然想到的问题……"
                className="resize-y bg-white text-base leading-7"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="capture-kind">类型</Label>
                <NativeSelect
                  id="capture-kind"
                  value={subtype}
                  onChange={(event) => setSubtype(event.target.value as InspirationSubtype)}
                  className="h-11 bg-white"
                >
                  {INSPIRATION_SUBTYPES.map((value) => (
                    <NativeSelectOption key={value} value={value}>
                      {INSPIRATION_SUBTYPE_LABELS[value]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="capture-tags">标签</Label>
                <TagField id="capture-tags" value={tagText} onChange={setTagText} className="h-11 bg-white" />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={saving || !selectedProjectId}
                className="h-11 bg-amber-950 px-6 text-amber-50 hover:bg-amber-900"
              >
                {saving ? "保存中…" : "保存记录"}
              </Button>
            </div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            {projects.length === 0 ? (
              <p className="text-sm text-stone-600">
                需要先<Link href="/projects" className="mx-1 font-medium text-amber-900 underline">创建项目</Link>再记录。
              </p>
            ) : null}
            </fieldset>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
