"use client";

import { useStats } from "@/hooks/use-stats";
import {
  DateRangePicker,
  getInitialDateRange,
  type DateRangeValue,
} from "./date-range-picker";
import { TrendChart } from "./trend-chart";
import { PointsChart } from "./points-chart";
import {
  useAttendanceTrend,
  usePointsDistribution,
  usePostsTrend,
} from "@/hooks/use-trends";
import { StatsCard } from "@/components/stats-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@safetywallet/ui";
import { useAuthStore } from "@/stores/auth";
import { useState } from "react";
import {
  BarChart3,
  Users,
  MapPin,
  FileText,
  Activity,
  Clock,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";

export default function AnalyticsPage() {
  const siteId = useAuthStore((s) => s.currentSiteId);
  const [dateRange, setDateRange] = useState<DateRangeValue>(
    getInitialDateRange(),
  );

  const { data, isLoading } = useStats();
  const postsTrendQuery = usePostsTrend(
    dateRange.startDate,
    dateRange.endDate,
    siteId || undefined,
  );
  const attendanceTrendQuery = useAttendanceTrend(
    dateRange.startDate,
    dateRange.endDate,
    siteId || undefined,
  );
  const pointsDistributionQuery = usePointsDistribution(
    dateRange.startDate,
    dateRange.endDate,
    siteId || undefined,
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          대시보드 분석
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from(
            { length: 8 },
            (_, idx) => `stats-skeleton-${idx + 1}`,
          ).map((key) => (
            <Skeleton key={key} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const statCards = [
    {
      label: "전체 사용자",
      value: data.totalUsers,
      suffix: "명",
      icon: Users,
    },
    {
      label: "전체 현장",
      value: data.totalSites,
      suffix: "개",
      icon: MapPin,
    },
    {
      label: "전체 게시물",
      value: data.totalPosts,
      suffix: "건",
      icon: FileText,
    },
    {
      label: "오늘 활성 사용자",
      value: data.activeUsersToday,
      suffix: "명",
      icon: Activity,
    },
    {
      label: "오늘 게시물",
      value: data.todayPostsCount,
      suffix: "건",
      icon: FileText,
    },
    {
      label: "대기 중",
      value: data.pendingCount,
      suffix: "건",
      icon: Clock,
    },
    {
      label: "긴급 건수",
      value: data.urgentCount,
      suffix: "건",
      icon: AlertTriangle,
    },
    {
      label: "조치 대기",
      value: data.avgProcessingHours,
      suffix: "시간",
      icon: AlertCircle,
    },
  ];

  const isTrendLoading =
    postsTrendQuery.isLoading ||
    attendanceTrendQuery.isLoading ||
    pointsDistributionQuery.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          대시보드 분석
        </h1>
        <p className="text-muted-foreground mt-1">
          현장 안전 보고 현황을 한눈에 확인합니다
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <StatsCard
            key={stat.label}
            title={stat.label}
            value={`${typeof stat.value === "number" ? (Number.isInteger(stat.value) ? stat.value.toLocaleString() : stat.value.toFixed(1)) : stat.value}${stat.suffix}`}
            icon={stat.icon}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>기간 필터</CardTitle>
          <CardDescription>
            게시물/출근/포인트 트렌드를 조회할 기간을 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </CardContent>
      </Card>

      {isTrendLoading ? (
        <div className="grid grid-cols-1 gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : (
        <>
          <TrendChart
            postsTrend={postsTrendQuery.data ?? []}
            attendanceTrend={attendanceTrendQuery.data ?? []}
          />
          <PointsChart data={pointsDistributionQuery.data ?? []} />
        </>
      )}
    </div>
  );
}
