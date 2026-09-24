"use client";

import type { KeyboardEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { normalizeTags } from "@/lib/domain/validation";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function TagField({ id, value, onChange, className }: Props) {
  const tags = normalizeTags(value.split(/[,，\n]/));

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (tags.length > 0) onChange(`${tags.join("，")}，`);
  }

  return (
    <div className="space-y-2">
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入后按回车或逗号"
        className={className}
      />
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5" aria-label="已输入标签">
          {tags.map((tag) => <Badge key={tag} variant="secondary">#{tag}</Badge>)}
        </div>
      ) : null}
    </div>
  );
}
