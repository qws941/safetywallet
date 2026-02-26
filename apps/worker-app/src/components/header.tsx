"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/hooks/use-translation";
import { useAttendanceToday } from "@/hooks/use-api";
import { LocaleSwitcher } from "./locale-switcher";
import { SystemBanner } from "./system-banner";
import { CheckCircle, XCircle } from "lucide-react";

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function Header() {
  const t = useTranslation();
  const { currentSiteId, isAuthenticated, _hasHydrated } = useAuth();
  const isReady = _hasHydrated && isAuthenticated;
  const { data: attendance } = useAttendanceToday(
    isReady ? currentSiteId : null,
  );

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 safe-top">
      <div className="flex items-center justify-between h-14 px-4">
        <h1 className="text-lg font-bold text-primary">
          {t("components.appTitle")}
        </h1>
        <div className="flex items-center gap-2">
          {isReady &&
            attendance &&
            (attendance.attended ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                <CheckCircle className="h-3.5 w-3.5" />
                {formatTime(attendance.checkinAt)} 출근
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                <XCircle className="h-3.5 w-3.5" />
                미출근
              </span>
            ))}
          <LocaleSwitcher />
        </div>
      </div>
      <SystemBanner />
    </header>
  );
}
