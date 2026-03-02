"use client";

import { Input } from "@safetywallet/ui";

interface Props {
  sourceUrl: string;
  onSourceUrlChange: (url: string) => void;
}

export function KoshaSection({ sourceUrl, onSourceUrlChange }: Props) {
  return (
    <div className="space-y-2 rounded-md border p-3">
      <Input
        placeholder="KOSHA URL"
        value={sourceUrl}
        onChange={(e) => onSourceUrlChange(e.target.value)}
      />
    </div>
  );
}
