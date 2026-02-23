"use client";

import { useState, useMemo } from "react";
import {
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@safetywallet/ui";
import { useAttendanceLogs, useUnmatchedRecords } from "@/hooks/use-attendance";
import { useAuthStore } from "@/stores/auth";
import { Database } from "lucide-react";
import Link from "next/link";
import {
  FAS_SOURCES,
  formatDateForInput,
  getKSTHour,
} from "./attendance-helpers";
import { AttendanceStats } from "./components/attendance-stats";
import { AttendanceLogsTab } from "./components/attendance-logs-tab";
import { UnmatchedTab } from "./components/unmatched-tab";

export default function AttendancePage() {
  const siteId = useAuthStore((s) => s.currentSiteId);
  const [activeTab, setActiveTab] = useState<"logs" | "unmatched">("logs");
  const [date, setDate] = useState<string>(formatDateForInput(new Date()));
  const [resultFilter, setResultFilter] = useState<"ALL" | "SUCCESS" | "FAIL">(
    "ALL",
  );
  const [companyFilter, setCompanyFilter] = useState<string>("ALL");
  const [showAnomalyOnly, setShowAnomalyOnly] = useState(false);
  const [source, setSource] = useState<string>("");

  const { data: logsResponse, isLoading: isLogsLoading } = useAttendanceLogs(
    1,
    2000,
    { date },
    source || undefined,
  );

  const { data: unmatchedData, isLoading: isUnmatchedLoading } =
    useUnmatchedRecords(source || undefined);

  const allLogs = useMemo(() => logsResponse?.logs ?? [], [logsResponse?.logs]);

  const stats = useMemo(
    () => ({
      total: allLogs.length,
      success: allLogs.filter((l) => l.result === "SUCCESS").length,
      fail: allLogs.filter((l) => l.result === "FAIL").length,
    }),
    [allLogs],
  );

  const anomalyCount = useMemo(() => {
    const nameCounts = new Map<string, number>();
    for (const l of allLogs) {
      if (l.userName) {
        nameCounts.set(l.userName, (nameCounts.get(l.userName) || 0) + 1);
      }
    }
    return allLogs.filter((log) => {
      if (log.checkinAt) {
        const hour = getKSTHour(log.checkinAt);
        if (hour < 5 || hour >= 12) return true;
      }
      if (log.userName && (nameCounts.get(log.userName) || 0) > 1) return true;
      return false;
    }).length;
  }, [allLogs]);

  const currentSourceLabel =
    FAS_SOURCES.find((s) => s.value === source)?.label ?? "전체 현장";

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
        <Select
          value={source || "__all__"}
          onValueChange={(v) => setSource(v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue>{currentSourceLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {FAS_SOURCES.map((s) => (
              <SelectItem
                key={s.value || "__all__"}
                value={s.value || "__all__"}
              >
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AttendanceStats
        total={stats.total}
        success={stats.success}
        fail={stats.fail}
        anomalyCount={anomalyCount}
      />

      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Button
            variant={activeTab === "logs" ? "default" : "ghost"}
            onClick={() => setActiveTab("logs")}
            className="rounded-full"
            size="sm"
          >
            출근 기록
          </Button>
          <Button
            variant={activeTab === "unmatched" ? "default" : "ghost"}
            onClick={() => setActiveTab("unmatched")}
            className="rounded-full"
            size="sm"
          >
            미매칭 기록
            {(unmatchedData?.records?.length ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                {unmatchedData?.records?.length ?? 0}
              </Badge>
            )}
          </Button>
          <Link href="/attendance/sync">
            <Button variant="ghost" className="rounded-full" size="sm">
              <Database className="h-4 w-4 mr-1" />
              연동 현황
            </Button>
          </Link>
        </div>

        {activeTab === "logs" && (
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
            showAnomalyOnly={showAnomalyOnly}
            setShowAnomalyOnly={setShowAnomalyOnly}
          />
        )}

        {activeTab === "unmatched" && (
          <UnmatchedTab
            siteId={siteId}
            records={unmatchedData?.records ?? []}
            isLoading={isUnmatchedLoading}
          />
        )}
      </div>
    </div>
  );
}
