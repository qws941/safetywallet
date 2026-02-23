"use client";

import { useState } from "react";
import {
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@safetywallet/ui";
import { Database } from "lucide-react";
import { useFasSyncStatus } from "@/hooks/use-fas-sync";
import { FAS_SOURCES } from "../attendance-helpers";
import { StatusCards } from "./components/status-cards";
import { ManualSyncCard } from "./components/manual-sync-card";
import { FasSearchCard } from "./components/fas-search-card";
import { SyncErrorsCard } from "./components/sync-errors-card";
import { SyncLogsCard } from "./components/sync-logs-card";

export default function AttendanceSyncPage() {
  const [source, setSource] = useState<string>("");
  const { data: syncStatus, isLoading } = useFasSyncStatus(source || undefined);

  const currentSourceLabel =
    FAS_SOURCES.find((s) => s.value === source)?.label ?? "전체 현장";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">FAS 연동 현황</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const normalizedFasStatus = (syncStatus?.fasStatus ?? "")
    .trim()
    .toLowerCase();
  const isHealthy =
    normalizedFasStatus === "" ||
    normalizedFasStatus === "0" ||
    normalizedFasStatus === "up" ||
    normalizedFasStatus === "ok" ||
    normalizedFasStatus === "healthy";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            FAS 연동 현황
          </h1>
          <p className="text-muted-foreground mt-1">
            FAS 출근데이터 동기화 상태 및 에러 모니터링
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

      {syncStatus && (
        <StatusCards syncStatus={syncStatus} isHealthy={isHealthy} />
      )}
      <ManualSyncCard />
      <FasSearchCard source={source || undefined} />
      <SyncErrorsCard />
      <SyncLogsCard syncLogs={syncStatus?.recentSyncLogs ?? []} />
    </div>
  );
}
