import { Archive, SearchX } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/items/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ITEM_TYPE_LABELS } from "@/lib/domain/constants";
import type { ItemRecord } from "@/lib/domain/types";

function itemTitle(item: ItemRecord) {
  return item.title || item.body.split(/\r?\n/)[0].slice(0, 60) || "未命名内容";
}

export function ItemList({
  items,
  hasFilters,
  onClearFilters,
}: {
  items: ItemRecord[];
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  if (items.length === 0) {
    return (
      <Empty className="min-h-72 border border-stone-300 bg-[#fffdf8]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {hasFilters ? <SearchX aria-hidden="true" /> : <Archive aria-hidden="true" />}
          </EmptyMedia>
          <EmptyTitle>{hasFilters ? "没有找到符合条件的内容" : "资料库还没有内容"}</EmptyTitle>
          <EmptyDescription>
            {hasFilters ? "保留当前条件继续调整，或清除筛选查看全部内容。" : "从一条灵感、一张人物卡或一个世界观设定开始。"}
          </EmptyDescription>
        </EmptyHeader>
        {hasFilters ? (
          <EmptyContent>
            <Button type="button" variant="outline" onClick={onClearFilters} className="min-h-11 bg-white">清除筛选</Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/items/${item.id}`}
          className="group rounded-2xl border border-stone-300 bg-[#fffdf8] p-4 transition hover:border-amber-400 hover:shadow-[0_10px_32px_rgba(69,55,35,0.07)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <Badge variant="outline" className="border-stone-300 bg-white">{ITEM_TYPE_LABELS[item.type]}</Badge>
                <span>{item.projectTitle}</span>
              </div>
              <h2 className="font-serif text-lg font-semibold text-stone-950 group-hover:text-amber-950">{itemTitle(item)}</h2>
              {item.body ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">{item.body}</p> : null}
            </div>
            <StatusBadge status={item.status} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-200 pt-3">
            {item.tags.map((tag) => <Badge key={tag} variant="secondary" className="bg-stone-100 text-stone-700">#{tag}</Badge>)}
            <time className="ml-auto text-xs text-stone-500" dateTime={item.updatedAt}>
              {new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" }).format(new Date(item.updatedAt))}
            </time>
          </div>
        </Link>
      ))}
    </div>
  );
}
