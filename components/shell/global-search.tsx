"use client";

import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/library?q=${encodeURIComponent(value)}` : "/library");
  }

  return (
    <form role="search" onSubmit={submit} className="relative w-full max-w-xl">
      <label htmlFor="global-search" className="sr-only">
        全局搜索
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id="global-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="搜索灵感、人物、设定或项目"
        className="h-11 rounded-xl border-stone-300 bg-white/80 pl-10 pr-14 shadow-none"
      />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        aria-label="提交搜索"
        className="absolute right-0 top-1/2 size-11 -translate-y-1/2 text-muted-foreground"
      >
        <span aria-hidden="true">↵</span>
      </Button>
    </form>
  );
}
