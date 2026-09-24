"use client";

import { BookOpenText, Download } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { primaryNavigation } from "./navigation";

export function DesktopSidebar({ onBackup }: { onBackup?: () => void }) {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="none"
      className="hidden border-r border-stone-300/80 bg-[#eeeae1] md:flex"
    >
      <SidebarHeader className="gap-0 px-5 pb-5 pt-7">
        <Link href="/" className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
          <span className="grid size-10 place-items-center rounded-xl border border-amber-900/15 bg-[#fbf8f0] text-amber-800 shadow-sm">
            <BookOpenText aria-hidden="true" className="size-5" />
          </span>
          <span>
            <strong className="block font-serif text-lg tracking-wide">小说孵化器</strong>
            <span className="text-xs text-stone-600">私人创作工作室</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-3">
          <SidebarGroupLabel className="px-3 text-[0.75rem] tracking-[0.14em] text-stone-500">
            工作区
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {primaryNavigation.map(({ href, label, icon: Icon }) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      size="lg"
                      className="h-11 rounded-xl px-3 text-[0.9375rem] data-[active=true]:bg-amber-950 data-[active=true]:text-amber-50"
                    >
                      <Link href={href} aria-current={active ? "page" : undefined}>
                        <Icon aria-hidden="true" />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <Button type="button" variant="ghost" onClick={onBackup} className="h-11 justify-start rounded-xl text-stone-600">
          <Download aria-hidden="true" />
          导出全部资料
        </Button>
        <p className="px-3 pb-2 text-xs leading-5 text-stone-500">资料将安全保存在私人站点中</p>
      </SidebarFooter>
    </Sidebar>
  );
}
