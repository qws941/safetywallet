"use client";

import { useAuth } from "@/hooks/use-auth";
import { useAttendanceToday } from "@/hooks/use-api";
import { useTranslation } from "@/hooks/use-translation";
import { ShieldAlert, Loader2 } from "lucide-react";

interface AttendanceGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AttendanceGuard({ children, fallback }: AttendanceGuardProps) {
  const t = useTranslation();
  const { currentSiteId, isAuthenticated } = useAuth();
  const { data, isLoading } = useAttendanceToday(currentSiteId);

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {t("components.attendanceCheckingLabel")}
        </p>
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
            <h2 className="text-lg font-semibold">
              {t("components.attendanceRequiredTitle")}
            </h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {t("components.attendanceRequiredDescription")}
            </p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}
