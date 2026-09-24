import { FolderKanban, LibraryBig, Lightbulb } from "lucide-react";

export const primaryNavigation = [
  { href: "/", label: "灵感收集台", icon: Lightbulb },
  { href: "/library", label: "内容资料库", icon: LibraryBig },
  { href: "/projects", label: "小说项目", icon: FolderKanban },
] as const;
