"use client";

import { type ReactNode, useState } from "react";
import { Download, Feather } from "lucide-react";
import Link from "next/link";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { BackupDialog } from "@/components/backup/backup-dialog";
import { WebMCPTools } from "@/components/webmcp-tools";
import { DesktopSidebar } from "./desktop-sidebar";
import { GlobalSearch } from "./global-search";
import { MobileNav } from "./mobile-nav";

export function AppShell({ children }: { children: ReactNode }) {
  const [backupOpen, setBackupOpen] = useState(false);
  return (
    <SidebarProvider defaultOpen>
      <DesktopSidebar onBackup={() => setBackupOpen(true)} />
      <SidebarInset className="min-w-0 bg-transparent">
        <header className="sticky top-0 z-30 border-b border-stone-300/80 bg-[#f7f4ed]/94 px-4 py-3 backdrop-blur sm:px-6 lg:px-10">
          <div className="mx-auto flex max-w-[96rem] items-center gap-4">
            <Link
              href="/"
              aria-label="小说孵化器首页"
              className="grid size-11 shrink-0 place-items-center rounded-xl border border-amber-900/15 bg-[#fffdf8] text-amber-800 md:hidden"
            >
              <Feather aria-hidden="true" className="size-5" />
            </Link>
            <GlobalSearch />
            <Button type="button" variant="outline" size="icon" aria-label="备份与恢复" onClick={() => setBackupOpen(true)} className="size-11 shrink-0 bg-white md:hidden"><Download aria-hidden="true" /></Button>
          </div>
        </header>
        <div className="mx-auto w-full max-w-[96rem] flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-9">
          {children}
        </div>
      </SidebarInset>
      <MobileNav />
      <Toaster position="top-center" richColors />
      <BackupDialog open={backupOpen} onOpenChange={setBackupOpen} />
      <WebMCPTools />
    </SidebarProvider>
  );
}
