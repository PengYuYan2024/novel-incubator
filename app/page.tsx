import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { AppShell } from "@/components/shell/app-shell";

export default function Home() {
  return (
    <AppShell>
      <DashboardClient />
    </AppShell>
  );
}
