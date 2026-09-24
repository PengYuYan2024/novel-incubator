import { ProjectDetail } from "@/components/projects/project-detail";
import { AppShell } from "@/components/shell/app-shell";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AppShell><ProjectDetail projectId={id} /></AppShell>;
}
