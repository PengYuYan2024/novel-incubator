import { Clock3 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ITEM_TYPE_LABELS } from "@/lib/domain/constants";
import type { ItemRecord } from "@/lib/domain/types";

function displayTitle(item: ItemRecord) {
  if (item.title) return item.title;
  return item.body.split(/\r?\n/)[0].slice(0, 42) || "未命名记录";
}

export function RecentItems({ items }: { items: ItemRecord[] }) {
  return (
    <Card className="border-stone-300 bg-[#fffdf8] shadow-none">
      <CardHeader><CardTitle className="font-serif text-xl">最近记录</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 px-4 py-10 text-center text-sm text-stone-600">
            这里会显示刚刚记下的内容。
          </div>
        ) : items.map((item) => (
          <Link
            key={item.id}
            href={`/items/${item.id}`}
            className="flex min-h-16 items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white px-4 py-3 transition hover:border-amber-300 hover:bg-amber-50/40"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{displayTitle(item)}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
                <Clock3 aria-hidden="true" className="size-3" />
                {new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(item.updatedAt))}
                <span aria-hidden="true">·</span> {item.projectTitle}
              </p>
            </div>
            <Badge variant="outline">{ITEM_TYPE_LABELS[item.type].replace("记录", "").replace("卡", "").replace("设定", "")}</Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
