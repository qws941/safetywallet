"use client";

import { FileText, Users, Clock, AlertTriangle } from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { useDashboardStats } from "@/hooks/use-api";
import { Skeleton } from "@safetywallet/ui";

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, idx) => `dash-skel-${idx + 1}`).map(
            (key) => (
              <Skeleton key={key} className="h-32" />
            ),
          )}
        </div>
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
                48시간 이상 미검토 건이 있습니다
              </p>
              <p className="text-sm text-red-600">
                미검토 {stats?.pendingCount}건 · 조치 대기{" "}
                {stats?.avgProcessingHours}시간
              </p>
            </div>
          </div>
        )}

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="오늘의 출근 현황"
          value={stats?.activeUsersToday ?? 0}
          icon={Users}
          description="금일 출석 인원"
        />
        <StatsCard
          title="오늘 제보"
          value={stats?.todayPostsCount ?? 0}
          icon={FileText}
          description="금일 등록된 제보"
        />
        <StatsCard
          title="미검토 건수"
          value={stats?.pendingCount ?? 0}
          icon={Clock}
          description="검토 대기 중"
        />
      </div>
    </div>
  );
}
