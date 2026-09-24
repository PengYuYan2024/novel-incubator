"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

import { primaryNavigation } from "./navigation";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="主导航"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-300 bg-[#f7f4ed]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-3">
        {primaryNavigation.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs text-stone-600 focus-visible:outline-2 focus-visible:outline-primary aria-[current=page]:bg-amber-950 aria-[current=page]:text-amber-50"
              >
                <Icon aria-hidden="true" className="size-5" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
