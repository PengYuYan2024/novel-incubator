import { ProjectsClient } from "@/components/projects/projects-client";
import { AppShell } from "@/components/shell/app-shell";

export default function ProjectsPage() {
  return <AppShell><ProjectsClient /></AppShell>;
}
