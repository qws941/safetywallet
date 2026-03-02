"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@safetywallet/ui";
import { Badge } from "@safetywallet/ui";
import { Server, AlertTriangle, Zap, Shield } from "lucide-react";
import { formatDuration, getErrorRateColor } from "./helpers";

interface StatusBreakdown {
  "2xx": number;
  "4xx": number;
  "5xx": number;
}

interface MonitoringSummary {
  periodMinutes: number;
  from: string;
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  avgDurationMs: number;
  maxDurationMs: number;
  statusBreakdown: StatusBreakdown;
}

interface SummaryCardsProps {
  summary: MonitoringSummary | undefined;
  isLoading: boolean;
}

export function SummaryCards({ summary, isLoading }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardDescription>로딩 중...</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-12 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>총 요청 수</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Server className="h-8 w-8 text-blue-500" />
            <span className="text-3xl font-bold">
              {summary.totalRequests.toLocaleString()}
            </span>
            <span className="text-muted-foreground">건</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>에러율</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={`h-8 w-8 ${getErrorRateColor(summary.errorRate)}`}
            />
            <span
              className={`text-3xl font-bold ${getErrorRateColor(summary.errorRate)}`}
            >
              {summary.errorRate.toFixed(1)}
            </span>
            <span className="text-muted-foreground">%</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            에러 {summary.totalErrors.toLocaleString()}건
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>평균 응답 시간</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Zap className="h-8 w-8 text-green-500" />
            <span className="text-3xl font-bold">
              {formatDuration(summary.avgDurationMs)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            최대 {formatDuration(summary.maxDurationMs)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>상태 코드 분포</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-purple-500" />
            <div className="flex gap-2">
              <Badge variant="outline" className="text-green-600">
                2xx: {summary.statusBreakdown["2xx"]}
              </Badge>
              <Badge variant="outline" className="text-yellow-600">
                4xx: {summary.statusBreakdown["4xx"]}
              </Badge>
              <Badge variant="outline" className="text-red-600">
                5xx: {summary.statusBreakdown["5xx"]}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
