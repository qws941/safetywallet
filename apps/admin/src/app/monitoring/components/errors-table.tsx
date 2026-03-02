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
import { AlertTriangle, Shield } from "lucide-react";
import { getErrorRateBadge } from "./helpers";

interface ErrorRow {
  endpoint: string;
  method: string;
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  total5xx: number;
}

interface TopErrorsResponse {
  from: string;
  to: string;
  rows: ErrorRow[];
}

interface ErrorsTableProps {
  topErrors: TopErrorsResponse | undefined;
  isLoading: boolean;
}

export function ErrorsTable({ topErrors, isLoading }: ErrorsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          에러 상위 엔드포인트
        </CardTitle>
        <CardDescription>에러율이 높은 API 엔드포인트</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48" />
        ) : topErrors?.rows?.length ? (
          <div className="space-y-3">
            {topErrors.rows.map((row, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between border-b pb-2 last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="text-xs shrink-0">
                    {row.method}
                  </Badge>
                  <span className="text-sm font-mono truncate">
                    {row.endpoint}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {row.totalRequests}건
                  </span>
                  <Badge variant={getErrorRateBadge(row.errorRate)}>
                    {row.errorRate.toFixed(1)}%
                  </Badge>
                  {row.total5xx > 0 && (
                    <span className="text-xs text-red-600 font-medium">
                      5xx: {row.total5xx}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Shield className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              에러가 감지되지 않았습니다.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
