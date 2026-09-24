"use client";

import { FormEvent, useState } from "react";
import { Link2, Search, Trash2 } from "lucide-react";
import Link from "next/link";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RELATION_TYPES, RELATION_TYPE_LABELS } from "@/lib/domain/constants";
import type {
  ItemRecord,
  RelationInput,
  RelationType,
  RelationView,
} from "@/lib/domain/types";

type Props = {
  item: ItemRecord;
  relations: RelationView[];
  searchCandidates: (query: string) => Promise<ItemRecord[]>;
  createRelation: (input: RelationInput) => Promise<unknown> | unknown;
  deleteRelation: (id: string) => Promise<unknown> | unknown;
};

function displayTitle(item: ItemRecord) {
  return item.title || item.body.split(/\r?\n/)[0].slice(0, 45) || "未命名内容";
}

export function RelationManager({
  item,
  relations,
  searchCandidates,
  createRelation,
  deleteRelation,
}: Props) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<ItemRecord[]>([]);
  const [searched, setSearched] = useState(false);
  const [target, setTarget] = useState<ItemRecord | null>(null);
  const [relationType, setRelationType] = useState<RelationType>("related");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const results = await searchCandidates(query.trim());
      setCandidates(results.filter((candidate) => candidate.id !== item.id));
      setSearched(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "搜索失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  async function addRelation() {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      await createRelation({
        sourceItemId: item.id,
        targetItemId: target.id,
        relationType,
        note,
      });
      setTarget(null);
      setCandidates([]);
      setSearched(false);
      setQuery("");
      setNote("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "创建关联失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  async function removeRelation(id: string) {
    setBusy(true);
    setError(null);
    try {
      await deleteRelation(id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "取消关联失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="relations-title" className="space-y-5">
      <div>
        <h2 id="relations-title" className="flex items-center gap-2 font-serif text-xl font-semibold">
          <Link2 aria-hidden="true" className="size-5 text-amber-800" />关联内容
        </h2>
        <p className="mt-1 text-sm text-stone-600">关联只保存一次，但会在双方详情中同时出现。</p>
      </div>

      <div className="space-y-3">
        {relations.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 p-5 text-sm text-stone-600">还没有关联内容。</p>
        ) : relations.map((relation) => (
          <div key={relation.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white p-3">
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-950">{relation.label}</Badge>
            <Link href={`/items/${relation.counterpart.id}`} className="min-w-0 flex-1 truncate font-medium text-amber-950 hover:underline">
              {displayTitle(relation.counterpart)}
            </Link>
            {relation.note ? <span className="text-sm text-stone-500">{relation.note}</span> : null}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="ghost" size="icon" aria-label={`取消与${displayTitle(relation.counterpart)}的关联`} disabled={busy} className="size-11">
                  <Trash2 aria-hidden="true" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>取消这条关联？</AlertDialogTitle>
                  <AlertDialogDescription>只会移除关联，不会删除任何人物、设定或灵感。</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>返回</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={() => void removeRelation(relation.id)}>确认取消</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-stone-300 bg-[#f5f1e8] p-4">
        <form onSubmit={search} role="search" className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Label htmlFor="relation-search" className="sr-only">搜索关联内容</Label>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-500" />
            <Input
              id="relation-search"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearched(false);
              }}
              placeholder="按标题、正文或标签搜索"
              className="h-11 bg-white pl-10"
            />
          </div>
          <Button type="submit" variant="outline" disabled={busy} className="min-h-11 bg-white">搜索内容</Button>
        </form>

        {candidates.length > 0 && !target ? (
          <div className="mt-3 grid gap-2">
            {candidates.map((candidate) => (
              <Button key={candidate.id} type="button" variant="outline" onClick={() => setTarget(candidate)} className="min-h-11 justify-start bg-white text-left">
                <span className="truncate">{displayTitle(candidate)} · {candidate.projectTitle}</span>
              </Button>
            ))}
          </div>
        ) : null}

        {searched && candidates.length === 0 && !target ? (
          <p className="mt-3 rounded-lg border border-dashed border-stone-300 bg-white p-3 text-sm text-stone-600">
            没有找到可关联的内容
          </p>
        ) : null}

        {target ? (
          <div className="mt-4 space-y-4 border-t border-stone-300 pt-4">
            <p className="text-sm">关联到 <strong>{displayTitle(target)}</strong></p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="relation-type">关系类型</Label>
                <NativeSelect id="relation-type" aria-label="关系类型" value={relationType} onChange={(event) => setRelationType(event.target.value as RelationType)} className="h-11 min-w-full bg-white">
                  {RELATION_TYPES.map((value) => <NativeSelectOption key={value} value={value}>{RELATION_TYPE_LABELS[value]}</NativeSelectOption>)}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="relation-note">关系备注（可选）</Label>
                <Input id="relation-note" value={note} onChange={(event) => setNote(event.target.value)} className="h-11 bg-white" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={busy} onClick={() => void addRelation()} className="min-h-11 bg-amber-950 text-amber-50">建立关联</Button>
              <Button type="button" variant="ghost" onClick={() => setTarget(null)} className="min-h-11">取消选择</Button>
            </div>
          </div>
        ) : null}
        {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
      </div>
    </section>
  );
}
