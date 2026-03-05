"use client";

import { useState, useMemo } from "react";
import { Button } from "@safetywallet/ui";
import { useAttendanceLogs } from "@/hooks/use-attendance";
import { useAuthStore } from "@/stores/auth";
import { Database } from "lucide-react";
import Link from "next/link";
import { formatDateForInput } from "./attendance-helpers";
import { AttendanceStats } from "./components/attendance-stats";
import { AttendanceLogsTab } from "./components/attendance-logs-tab";

export default function AttendancePage() {
  const siteId = useAuthStore((s) => s.currentSiteId);
  const [date, setDate] = useState<string>(formatDateForInput(new Date()));
  const [resultFilter, setResultFilter] = useState<"ALL" | "SUCCESS" | "FAIL">(
    "ALL",
  );
  const [companyFilter, setCompanyFilter] = useState<string>("ALL");

  const { data: logsResponse, isLoading: isLogsLoading } = useAttendanceLogs(
    1,
    2000,
    { date },
  );

  const allLogs = useMemo(() => {
    const logs = logsResponse?.logs ?? [];
    const seen = new Map<string, (typeof logs)[0]>();
    for (const log of logs) {
      const key = log.externalWorkerId ?? `__nokey_${seen.size}`;
      if (!seen.has(key)) {
        seen.set(key, log);
      } else {
        const existing = seen.get(key)!;
        if (
          log.checkinAt &&
          existing.checkinAt &&
          log.checkinAt < existing.checkinAt
        ) {
          seen.set(key, log);
        }
      }
    }
    return [...seen.values()];
  }, [logsResponse?.logs]);

  const stats = useMemo(
    () => ({
      total: logsResponse?.pagination?.total ?? allLogs.length,
      success: allLogs.filter((l) => l.result === "SUCCESS").length,
      fail: allLogs.filter((l) => l.result === "FAIL").length,
    }),
    [allLogs, logsResponse?.pagination?.total],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">출근 현황</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(date).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </p>
        </div>
      </div>

      <AttendanceStats
        total={stats.total}
        success={stats.success}
        fail={stats.fail}
      />

      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <span className="text-sm text-muted-foreground">출근 기록</span>
          <Link href="/attendance/sync">
            <Button variant="ghost" className="rounded-full" size="sm">
              <Database className="h-4 w-4 mr-1" />
              연동 현황
            </Button>
          </Link>
        </div>

        <AttendanceLogsTab
          siteId={siteId}
          allLogs={allLogs}
          isLoading={isLogsLoading}
          date={date}
          setDate={setDate}
          resultFilter={resultFilter}
          setResultFilter={setResultFilter}
          companyFilter={companyFilter}
          setCompanyFilter={setCompanyFilter}
        />
      </div>
    </div>
  );
}
