"use client";

import {
  FileText,
  Users,
  Clock,
  AlertTriangle,
  BarChart3,
  Timer,
} from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { useDashboardStats } from "@/hooks/use-api";
import { Skeleton, Card } from "@safetywallet/ui";

const CATEGORY_LABELS: Record<string, string> = {
  HAZARD: "위험요소",
  UNSAFE_BEHAVIOR: "불안전 행동",
  INCONVENIENCE: "불편사항",
  SUGGESTION: "개선 제안",
  BEST_PRACTICE: "모범 사례",
};

const CATEGORY_COLORS: Record<string, string> = {
  HAZARD: "bg-red-500",
  UNSAFE_BEHAVIOR: "bg-orange-500",
  INCONVENIENCE: "bg-yellow-500",
  SUGGESTION: "bg-blue-500",
  BEST_PRACTICE: "bg-green-500",
};

const CATEGORY_HEX_COLORS: Record<string, string> = {
  HAZARD: "#ef4444",
  UNSAFE_BEHAVIOR: "#f97316",
  INCONVENIENCE: "#eab308",
  SUGGESTION: "#3b82f6",
  BEST_PRACTICE: "#22c55e",
};

function CategoryDistributionChart({ data }: { data: Record<string, number> }) {
  const total = Object.values(data).reduce((sum, count) => sum + count, 0);
  if (total === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">카테고리 분포</h3>
        <p className="text-muted-foreground">데이터가 없습니다</p>
      </Card>
    );
  }

  const sortedCategories = Object.entries(data).sort(([, a], [, b]) => b - a);
  const maxValue = Math.max(...Object.values(data), 1);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">카테고리 분포</h3>
      <div className="mb-3 grid grid-cols-4 text-xs text-muted-foreground">
        <span>0</span>
        <span className="text-center">25%</span>
        <span className="text-center">50%</span>
        <span className="text-right">100%</span>
      </div>
      <div className="space-y-4">
        {sortedCategories.map(([category, count]) => {
          const percentage = Math.round((count / total) * 100);
          const scaledPercentage = Math.max(
            Math.round((count / maxValue) * 100),
            count > 0 ? 8 : 0,
          );

          return (
            <div key={category} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {CATEGORY_LABELS[category] || category}
                </span>
                <span className="text-muted-foreground">
                  {count}건 ({percentage}%)
                </span>
              </div>
              <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-1/4 w-px bg-background/70" />
                <div className="absolute inset-y-0 left-2/4 w-px bg-background/70" />
                <div className="absolute inset-y-0 left-3/4 w-px bg-background/70" />
                <div
                  className={`h-full ${CATEGORY_COLORS[category] || "bg-gray-500"} transition-all`}
                  style={{ width: `${scaledPercentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function HotspotChart({
  pendingCount,
  urgentCount,
  avgProcessingHours,
  todayPostsCount,
}: {
  pendingCount: number;
  urgentCount: number;
  avgProcessingHours: number;
  todayPostsCount: number;
}) {
  const hotspots = [
    {
      key: "pending",
      label: "미처리 백로그",
      value: pendingCount,
      unit: "건",
      color: "#f97316",
    },
    {
      key: "urgent",
      label: "긴급 제보",
      value: urgentCount,
      unit: "건",
      color: "#ef4444",
    },
    {
      key: "processing",
      label: "평균 처리 시간",
      value: avgProcessingHours,
      unit: "시간",
      color: "#3b82f6",
    },
    {
      key: "today",
      label: "오늘 접수량",
      value: todayPostsCount,
      unit: "건",
      color: "#22c55e",
    },
  ].sort((a, b) => b.value - a.value);

  const maxValue = Math.max(...hotspots.map((item) => item.value), 1);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">핫스팟 지표</h3>
      <div className="space-y-3">
        {hotspots.map((item) => {
          const width = Math.max(Math.round((item.value / maxValue) * 100), 8);
          return (
            <div key={item.key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">
                  {item.value.toLocaleString()}
                  {item.unit}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${width}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, idx) => `dash-skel-${idx + 1}`).map(
            (key) => (
              <Skeleton key={key} className="h-32" />
            ),
          )}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">대시보드</h1>

      {(stats?.pendingCount ?? 0) > 0 &&
        (stats?.avgProcessingHours ?? 0) >= 48 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="font-medium text-red-800">
                48시간 이상 미처리 백로그가 있습니다
              </p>
              <p className="text-sm text-red-600">
                미처리 {stats?.pendingCount}건 · 평균 처리시간{" "}
                {stats?.avgProcessingHours}시간
              </p>
            </div>
          </div>
        )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="오늘 제보"
          value={stats?.todayPostsCount ?? 0}
          icon={FileText}
          description="금일 등록된 제보"
        />
        <StatsCard
          title="미처리 백로그"
          value={stats?.pendingCount ?? 0}
          icon={Clock}
          description="검토 대기 중"
        />
        <StatsCard
          title="긴급 제보"
          value={stats?.urgentCount ?? 0}
          icon={AlertTriangle}
          description="즉시 처리 필요"
        />
        <StatsCard
          title="평균 처리 시간"
          value={`${stats?.avgProcessingHours ?? 0}h`}
          icon={Timer}
          description="승인/반려까지"
        />
        <StatsCard
          title="전체 사용자"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          description="등록된 사용자 수"
        />
        <StatsCard
          title="전체 제보"
          value={stats?.totalPosts ?? 0}
          icon={FileText}
          description="누적 제보 수"
        />
        <StatsCard
          title="오늘 출근"
          value={stats?.activeUsersToday ?? 0}
          icon={Users}
          description="금일 출석 인원"
        />
        <StatsCard
          title="전체 현장"
          value={stats?.totalSites ?? 0}
          icon={BarChart3}
          description="등록된 현장 수"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryDistributionChart data={stats?.categoryDistribution ?? {}} />
        <HotspotChart
          pendingCount={stats?.pendingCount ?? 0}
          urgentCount={stats?.urgentCount ?? 0}
          avgProcessingHours={stats?.avgProcessingHours ?? 0}
          todayPostsCount={stats?.todayPostsCount ?? 0}
        />
      </div>

      {Object.entries(stats?.categoryDistribution ?? {}).length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">카테고리 점유율 요약</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats?.categoryDistribution ?? {}).map(
              ([category, count]) => (
                <span
                  key={category}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        CATEGORY_HEX_COLORS[category] || "#6b7280",
                    }}
                  />
                  {CATEGORY_LABELS[category] || category}
                  <strong>{count}건</strong>
                </span>
              ),
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
