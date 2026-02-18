"use client";

import { Card } from "@safetywallet/ui";

interface MetadataCardProps {
  metadata: Record<string, unknown>;
}

export function MetadataCard({ metadata }: MetadataCardProps) {
  return (
    <Card className="p-6">
      <h3 className="mb-4 font-medium">추가 정보</h3>
      <dl className="space-y-2 text-sm">
        {Object.entries(metadata).map(([key, value]) => (
          <div key={key}>
            <dt className="text-muted-foreground">{key}</dt>
            <dd className="font-medium">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
