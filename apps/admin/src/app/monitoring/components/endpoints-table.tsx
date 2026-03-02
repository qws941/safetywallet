"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@safetywallet/ui";
import { Skeleton } from "@safetywallet/ui";
import { Badge } from "@safetywallet/ui";
import { Server } from "lucide-react";
import { formatDuration } from "./helpers";

interface MetricsRow {
  bucket?: string;
  endpoint?: string;
  method?: string;
  totalRequests: number;
  totalErrors: number;
  avgDurationMs: number;
  maxDurationMs: number;
  total2xx: number;
  total4xx: number;
  total5xx: number;
}

interface MetricsResponse {
  groupBy: string;
  from: string;
  to: string;
  rows: MetricsRow[];
}

interface EndpointsTableProps {
  endpointMetrics: MetricsResponse | undefined;
  isLoading: boolean;
  maxEndpointRequests: number;
}

export function EndpointsTable({
  endpointMetrics,
  isLoading,
  maxEndpointRequests,
}: EndpointsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          엔드포인트별 요청
        </CardTitle>
        <CardDescription>API 엔드포인트별 요청 수 및 응답 시간</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48" />
        ) : endpointMetrics?.rows?.length ? (
          <div className="space-y-2">
            {endpointMetrics.rows
              .sort((a, b) => b.totalRequests - a.totalRequests)
              .slice(0, 15)
              .map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-xs w-14 justify-center shrink-0"
                  >
                    {row.method}
                  </Badge>
                  <span className="text-xs truncate w-40 shrink-0 font-mono">
                    {row.endpoint}
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{
                        width: `${(row.totalRequests / maxEndpointRequests) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs w-10 text-right font-mono">
                    {row.totalRequests}
                  </span>
                  <span className="text-xs w-16 text-right text-muted-foreground">
                    {formatDuration(row.avgDurationMs)}
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            데이터 없음
          </p>
        )}
      </CardContent>
    </Card>
  );
}
