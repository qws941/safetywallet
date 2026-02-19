"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from "@safetywallet/ui";
import { Clock } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import type { FasSyncLogEntry } from "@/hooks/use-fas-sync";
import {
  formatKstDateTime,
  ACTION_LABELS,
  ACTION_BADGES,
} from "../sync-helpers";

type LogRow = FasSyncLogEntry & { index: number };

const logColumns: Column<LogRow>[] = [
  {
    key: "index",
    header: "No",
    render: (item) => (
      <span className="text-muted-foreground">{item.index}</span>
    ),
    className: "w-[60px]",
  },
  {
    key: "action",
    header: "유형",
    sortable: true,
    render: (item) => (
      <Badge variant={ACTION_BADGES[item.action] ?? "outline"}>
        {ACTION_LABELS[item.action] ?? item.action}
      </Badge>
    ),
  },
  {
    key: "reason",
    header: "상세",
    render: (item) => <span className="text-sm">{item.reason ?? "-"}</span>,
  },
  {
    key: "createdAt",
    header: "시각",
    sortable: true,
    render: (item) => (
      <span className="text-sm text-muted-foreground">
        {formatKstDateTime(item.createdAt)}
      </span>
    ),
  },
];

interface SyncLogsCardProps {
  syncLogs: FasSyncLogEntry[];
}

export function SyncLogsCard({ syncLogs }: SyncLogsCardProps) {
  const syncLogsWithIndex = useMemo(
    () => syncLogs.map((log, i) => ({ ...log, index: i + 1 })),
    [syncLogs],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          최근 동기화 로그
        </CardTitle>
        <CardDescription>최근 20건의 FAS 동기화 작업 기록</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={logColumns}
          data={syncLogsWithIndex}
          searchable
          searchPlaceholder="로그 검색..."
          emptyMessage="동기화 로그가 없습니다."
          pageSize={10}
        />
      </CardContent>
    </Card>
  );
}
