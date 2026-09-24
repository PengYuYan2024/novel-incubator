import { BookOpen, Clock3, Globe2, Lightbulb, Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { PROJECT_STATUS_LABELS } from "@/lib/domain/constants";
import type { ProjectRecord } from "@/lib/domain/types";

export function ProjectCard({ project }: { project: ProjectRecord }) {
  const counts = project.counts ?? { inspiration: 0, character: 0, world: 0 };
  return (
    <Link href={`/projects/${project.id}`} className="group flex min-h-64 flex-col rounded-2xl border border-stone-300 bg-[#fffdf8] p-5 transition hover:border-amber-400 hover:shadow-[0_14px_40px_rgba(69,55,35,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-[#ede5d8] text-amber-900"><BookOpen aria-hidden="true" /></span>
        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-950">{PROJECT_STATUS_LABELS[project.status]}</Badge>
      </div>
      <h2 className="mt-5 font-serif text-2xl font-semibold text-stone-950 group-hover:text-amber-950">{project.title}</h2>
      <p className="mt-1 text-sm text-stone-500">{project.genre || "类型待确定"}</p>
      <p className="mt-4 line-clamp-3 flex-1 text-sm leading-6 text-stone-600">{project.logline || "还没有填写一句话梗概。"}</p>
      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-stone-200 pt-4 text-xs text-stone-600">
        <span className="flex items-center gap-1"><Lightbulb aria-hidden="true" className="size-3.5" />{counts.inspiration} 条灵感</span>
        <span className="flex items-center gap-1"><Users aria-hidden="true" className="size-3.5" />{counts.character} 位人物</span>
        <span className="flex items-center gap-1"><Globe2 aria-hidden="true" className="size-3.5" />{counts.world} 条设定</span>
      </div>
      <time dateTime={project.updatedAt} className="mt-3 flex items-center gap-1 text-xs text-stone-500"><Clock3 aria-hidden="true" className="size-3.5" />更新于 {new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" }).format(new Date(project.updatedAt))}</time>
    </Link>
  );
}
