import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROJECT_STATUS_LABELS } from "@/lib/domain/constants";
import type { ProjectRecord } from "@/lib/domain/types";

export function RecentProjects({ projects }: { projects: ProjectRecord[] }) {
  const project = projects[0];
  return (
    <Card className="border-stone-300 bg-[#eef1ea] shadow-none">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-stone-600">最近更新项目</CardTitle></CardHeader>
      <CardContent>
        {project ? (
          <>
            <p className="font-serif text-lg font-semibold">{project.title}</p>
            <p className="mt-1 text-sm text-stone-600">{PROJECT_STATUS_LABELS[project.status]} · {new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(new Date(project.updatedAt))}</p>
            <Link href={`/projects/${project.id}`} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-amber-900">
              打开项目 <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </>
        ) : (
          <div className="py-3 text-sm text-stone-600">
            还没有项目。<Link href="/projects" className="ml-1 font-medium text-amber-900 underline">创建第一个项目</Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
