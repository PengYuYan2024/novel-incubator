"use client";

import { FormEvent, useState } from "react";
import { useLocalDraft } from "@/lib/client/use-local-draft";
import { DraftPanel } from "@/components/drafts/draft-panel";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { TagField } from "./tag-field";
import {
  CONTENT_STATUSES,
  CONTENT_STATUS_META,
  INSPIRATION_SUBTYPES,
  INSPIRATION_SUBTYPE_LABELS,
  ITEM_TYPES,
  ITEM_TYPE_LABELS,
  WORLD_SUBTYPES,
  WORLD_SUBTYPE_LABELS,
} from "@/lib/domain/constants";
import type {
  CharacterMetadata,
  ContentStatus,
  InspirationSubtype,
  ItemInput,
  ItemRecord,
  ItemType,
  ProjectRecord,
  WorldMetadata,
  WorldSubtype,
} from "@/lib/domain/types";
import { normalizeTags } from "@/lib/domain/validation";

type Props = {
  projects: ProjectRecord[];
  initialItem?: ItemRecord;
  onSubmit: (input: ItemInput, expectedUpdatedAt?: string) => Promise<unknown> | unknown;
  onSaved?: () => void;
  onCancel?: () => void;
};

const emptyCharacter: CharacterMetadata = {
  role: "",
  coreDesire: "",
  innerConflict: "",
  traits: "",
  history: "",
  notes: "",
};

const emptyWorld: WorldMetadata = { rules: "", cost: "" };

function characterFrom(item?: ItemRecord): CharacterMetadata {
  if (item?.type !== "character") return emptyCharacter;
  return { ...emptyCharacter, ...item.metadata };
}

function worldFrom(item?: ItemRecord): WorldMetadata {
  if (item?.type !== "world") return emptyWorld;
  return { ...emptyWorld, ...item.metadata };
}

export function ItemForm({ projects, initialItem, onSubmit, onCancel, onSaved }: Props) {
  const [type, setType] = useState<ItemType>(initialItem?.type ?? "inspiration");
  const [projectId, setProjectId] = useState(initialItem?.projectId ?? projects[0]?.id ?? "");
  const [title, setTitle] = useState(initialItem?.title ?? "");
  const [body, setBody] = useState(initialItem?.body ?? "");
  const [status, setStatus] = useState<ContentStatus>(initialItem?.status ?? "inbox");
  const [subtype, setSubtype] = useState<InspirationSubtype | WorldSubtype>(
    initialItem?.subtype && initialItem.type !== "character" ? initialItem.subtype : "idea",
  );
  const [tags, setTags] = useState(initialItem?.tags.join(", ") ?? "");
  const [character, setCharacter] = useState<CharacterMetadata>(() => characterFrom(initialItem));
  const [world, setWorld] = useState<WorldMetadata>(() => worldFrom(initialItem));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = { type, projectId, title, body, status, subtype, tags, character, world };
  const draft = useLocalDraft({ scope: initialItem ? `item:${initialItem.id}` : "item:new", value, saving, baseUpdatedAt: initialItem?.updatedAt,
    restore(data) { setType(data.type); setProjectId(data.projectId); setTitle(data.title); setBody(data.body); setStatus(data.status); setSubtype(data.subtype); setTags(data.tags); setCharacter(data.character); setWorld(data.world); },
  });
  const missingProject = !projects.some(project => project.id === projectId);

  function changeType(next: ItemType) {
    setType(next);
    if (next === "inspiration" && !INSPIRATION_SUBTYPES.includes(subtype as InspirationSubtype)) {
      setSubtype("idea");
    }
    if (next === "world" && !WORLD_SUBTYPES.includes(subtype as WorldSubtype)) {
      setSubtype("location");
    }
  }

  function changeCharacter(field: keyof CharacterMetadata, value: string) {
    setCharacter((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || draft.conflict || missingProject) return;
    draft.flush();
    setSaving(true);
    setError(null);
    const input: ItemInput = {
      projectId,
      type,
      subtype: type === "character" ? null : type === "world"
        ? (WORLD_SUBTYPES.includes(subtype as WorldSubtype) ? subtype as WorldSubtype : "location")
        : (INSPIRATION_SUBTYPES.includes(subtype as InspirationSubtype) ? subtype as InspirationSubtype : "idea"),
      title,
      body: type === "character" ? "" : body,
      status,
      tags: normalizeTags(tags.split(/[,，\n]/)),
      metadata: type === "character" ? character : type === "world" ? world : {},
    };
    try {
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

  const titleLabel = type === "character" ? "姓名" : type === "world" ? "名称" : "标题（可选）";
  const saveLabel = type === "character" ? "保存人物卡" : type === "world" ? "保存世界观设定" : "保存灵感记录";

  return (
    <form onSubmit={submit} className="space-y-5">
      <DraftPanel draft={draft} value={value} />
      {missingProject && <p role="alert">原所属项目不存在或不可用。草稿未被转移，请先复制或下载；如需另存，请明确选择一个项目。</p>}
      <fieldset disabled={saving} className="min-w-0 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="item-type">内容类型</Label>
          <NativeSelect
            id="item-type"
            aria-label="内容类型"
            value={type}
            disabled={Boolean(initialItem)}
            onChange={(event) => changeType(event.target.value as ItemType)}
            className="h-11 min-w-full bg-white"
          >
            {ITEM_TYPES.map((value) => (
              <NativeSelectOption key={value} value={value}>{ITEM_TYPE_LABELS[value]}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="item-project">所属项目</Label>
          <NativeSelect
            id="item-project"
            aria-label="所属项目"
            value={missingProject ? "" : projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="h-11 min-w-full bg-white"
          >
            {missingProject && <NativeSelectOption value="">请选择项目（原项目不可用）</NativeSelectOption>}
            {projects.map((project) => (
              <NativeSelectOption key={project.id} value={project.id}>{project.title}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="item-title">{titleLabel}</Label>
          <Input
            id="item-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required={type !== "inspiration"}
            className="h-11 bg-white"
          />
        </div>
        {type !== "character" ? (
          <div className="space-y-2">
            <Label htmlFor="item-subtype">{type === "world" ? "分类" : "类型"}</Label>
            <NativeSelect
              id="item-subtype"
              aria-label={type === "world" ? "分类" : "类型"}
              value={type === "world" && !WORLD_SUBTYPES.includes(subtype as WorldSubtype) ? "location" : subtype}
              onChange={(event) => setSubtype(event.target.value as InspirationSubtype | WorldSubtype)}
              className="h-11 min-w-full bg-white"
            >
              {(type === "world" ? WORLD_SUBTYPES : INSPIRATION_SUBTYPES).map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {type === "world"
                    ? WORLD_SUBTYPE_LABELS[value as WorldSubtype]
                    : INSPIRATION_SUBTYPE_LABELS[value as InspirationSubtype]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        ) : null}
      </div>

      {type === "inspiration" ? (
        <div className="space-y-2">
          <Label htmlFor="item-body">正文</Label>
          <Textarea id="item-body" value={body} onChange={(event) => setBody(event.target.value)} required rows={8} className="bg-white text-base leading-7" />
        </div>
      ) : null}

      {type === "character" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {([
            ["role", "角色定位"],
            ["coreDesire", "核心欲望"],
            ["innerConflict", "内在矛盾"],
            ["traits", "性格特征"],
          ] as const).map(([field, label]) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={`character-${field}`}>{label}</Label>
              <Textarea id={`character-${field}`} value={character[field]} onChange={(event) => changeCharacter(field, event.target.value)} rows={3} className="bg-white" />
            </div>
          ))}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="character-history">人物经历</Label>
            <Textarea id="character-history" value={character.history} onChange={(event) => changeCharacter("history", event.target.value)} rows={5} className="bg-white" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="character-notes">备注</Label>
            <Textarea id="character-notes" value={character.notes} onChange={(event) => changeCharacter("notes", event.target.value)} rows={4} className="bg-white" />
          </div>
        </div>
      ) : null}

      {type === "world" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="world-summary">简介</Label>
            <Textarea id="world-summary" value={body} onChange={(event) => setBody(event.target.value)} rows={4} className="bg-white" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="world-rules">详细规则</Label>
            <Textarea id="world-rules" value={world.rules} onChange={(event) => setWorld((current) => ({ ...current, rules: event.target.value }))} rows={6} className="bg-white" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="world-cost">限制或代价</Label>
            <Textarea id="world-cost" value={world.cost} onChange={(event) => setWorld((current) => ({ ...current, cost: event.target.value }))} rows={4} className="bg-white" />
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="item-status">成熟度</Label>
          <NativeSelect id="item-status" aria-label="成熟度" value={status} onChange={(event) => setStatus(event.target.value as ContentStatus)} className="h-11 min-w-full bg-white">
            {CONTENT_STATUSES.map((value) => (
              <NativeSelectOption key={value} value={value}>{CONTENT_STATUS_META[value].label}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="item-tags">标签</Label>
          <TagField id="item-tags" value={tags} onChange={setTags} className="h-11 bg-white" />
        </div>
      </div>

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? <Button type="button" variant="outline" className="min-h-11" onClick={draft.close ?? onCancel}>取消</Button> : null}
        <Button type="submit" disabled={saving || missingProject || draft.conflict} className="min-h-11 bg-amber-950 text-amber-50 hover:bg-amber-900">
          {saving ? "保存中…" : saveLabel}
        </Button>
      </div>
      </fieldset>
    </form>
  );
}
