import { FolderOpen } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CONTENT_STATUS_META } from "@/lib/domain/constants";
import type { DashboardData } from "@/lib/domain/types";

const dots = {
  inbox: "bg-amber-500",
  seed: "bg-yellow-600",
  growing: "bg-teal-600",
  ready: "bg-emerald-700",
  archived: "bg-stone-400",
} as const;

export function DashboardStats({ data }: { data: DashboardData }) {
  const total = Object.values(data.statusCounts).reduce((sum, count) => sum + count, 0);
  return (
    <Card className="border-stone-300 bg-[#fffdf8] shadow-none">
      <CardHeader><CardTitle className="font-serif text-xl">成熟度</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(CONTENT_STATUS_META).map(([status, meta]) => (
          <div key={status} className="flex items-center gap-3" title={meta.description}>
            <span className={`size-2.5 rounded-full ${dots[status as keyof typeof dots]}`} />
            <span className="flex-1 text-sm text-stone-700">{meta.label}</span>
            <strong className="font-serif text-lg">{data.statusCounts[status as keyof typeof data.statusCounts]}</strong>
          </div>
        ))}
        <div className="flex items-center gap-2 border-t border-stone-200 pt-4 text-sm text-stone-600">
          <FolderOpen aria-hidden="true" className="size-4" /> 共 {total} 条创作资料
        </div>
      </CardContent>
    </Card>
  );
}
