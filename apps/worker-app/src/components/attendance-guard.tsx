"use client";

import { useAuth } from "@/hooks/use-auth";
import { useAttendanceToday } from "@/hooks/use-api";
import { ShieldAlert, Loader2 } from "lucide-react";

interface AttendanceGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AttendanceGuard({ children, fallback }: AttendanceGuardProps) {
  const { currentSiteId, isAuthenticated } = useAuth();
  const { data, isLoading } = useAttendanceToday(currentSiteId);

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">출근 확인 중...</p>
      </div>
    );
  }

  if (!data?.attended) {
    return (
      fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
          <div className="rounded-full bg-orange-100 p-4">
            <ShieldAlert className="h-10 w-10 text-orange-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">출근 후 이용 가능합니다</h2>
            <p className="text-sm text-muted-foreground">
              해당 현장에 출근 기록이 확인되어야
              <br />이 기능을 사용할 수 있습니다.
            </p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}
