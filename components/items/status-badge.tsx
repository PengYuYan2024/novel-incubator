import { Badge } from "@/components/ui/badge";
import { CONTENT_STATUS_META } from "@/lib/domain/constants";
import type { ContentStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const statusClasses: Record<ContentStatus, string> = {
  inbox: "border-amber-300 bg-amber-100 text-amber-950",
  seed: "border-yellow-300 bg-yellow-100 text-yellow-950",
  growing: "border-teal-300 bg-teal-100 text-teal-950",
  ready: "border-emerald-300 bg-emerald-100 text-emerald-950",
  archived: "border-stone-300 bg-stone-100 text-stone-700",
};

export function StatusBadge({ status, className }: { status: ContentStatus; className?: string }) {
  return (
    <Badge
      variant="outline"
      title={CONTENT_STATUS_META[status].description}
      className={cn("px-2.5 py-1 text-xs", statusClasses[status], className)}
    >
      {CONTENT_STATUS_META[status].label}
    </Badge>
  );
}
