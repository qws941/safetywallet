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
import { TrendingUp } from "lucide-react";
import { formatTime, getErrorRateBadge } from "./helpers";

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

interface TimeSeriesChartProps {
  timeMetrics: MetricsResponse | undefined;
  isLoading: boolean;
  maxRequests: number;
}

export function TimeSeriesChart({
  timeMetrics,
  isLoading,
  maxRequests,
}: TimeSeriesChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          요청 추이
        </CardTitle>
        <CardDescription>시간대별 API 요청 수 및 에러율</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48" />
        ) : timeMetrics?.rows?.length ? (
          <div className="space-y-1">
            {timeMetrics.rows.map((row) => {
              const errorPct =
                row.totalRequests > 0
                  ? (row.totalErrors / row.totalRequests) * 100
                  : 0;
              return (
                <div key={row.bucket} className="flex items-center gap-3">
                  <span className="text-xs w-12 shrink-0 text-muted-foreground font-mono">
                    {formatTime(row.bucket ?? "")}
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden relative">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all"
                      style={{
                        width: `${(row.totalRequests / maxRequests) * 100}%`,
                      }}
                    />
                    {errorPct > 0 && (
                      <div
                        className="bg-red-500 h-full rounded-full absolute top-0 left-0"
                        style={{
                          width: `${(row.totalErrors / maxRequests) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                  <span className="text-xs w-16 text-right font-mono">
                    {row.totalRequests}
                  </span>
                  {errorPct > 0 && (
                    <Badge
                      variant={getErrorRateBadge(errorPct)}
                      className="text-xs"
                    >
                      {errorPct.toFixed(1)}%
                    </Badge>
                  )}
                </div>
              );
            })}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                요청
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                에러
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            해당 기간에 수집된 메트릭이 없습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
