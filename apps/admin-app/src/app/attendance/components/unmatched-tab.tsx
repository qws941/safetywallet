"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@safetywallet/ui";
import { DataTable, type Column } from "@/components/data-table";
import { formatTime } from "../attendance-helpers";

interface UnmatchedRecord {
  externalWorkerId: string | null;
  siteName: string | null;
  checkinAt: string;
  source: string;
}

interface UnmatchedTabProps {
  siteId: string | null;
  records: UnmatchedRecord[];
  isLoading: boolean;
}

export function UnmatchedTab({
  siteId,
  records,
  isLoading,
}: UnmatchedTabProps) {
  const unmatchedWithIndex = useMemo(() => {
    return records.map((item, i) => ({
      ...item,
      index: i + 1,
    }));
  }, [records]);

  const unmatchedColumns: Column<(typeof unmatchedWithIndex)[0]>[] = [
    {
      key: "index",
      header: "No",
      render: (item) => (
        <span className="text-muted-foreground">{item.index}</span>
      ),
      className: "w-[60px]",
    },
    {
      key: "externalWorkerId",
      header: "근로자 ID",
      sortable: true,
      render: (item) => (
        <div>
          <p className="font-medium">{item.externalWorkerId}</p>
          <p className="text-xs text-muted-foreground">현장: {item.siteName}</p>
        </div>
      ),
    },
    {
      key: "siteName",
      header: "현장",
      sortable: true,
      render: (item) => item.siteName || "-",
    },
    {
      key: "checkinAt",
      header: "태깅시간",
      sortable: true,
      render: (item) => formatTime(item.checkinAt),
    },
    {
      key: "source",
      header: "사유",
      render: () => (
        <Badge variant="outline" className="text-xs">
          {"미매칭"}
        </Badge>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>미매칭 기록</CardTitle>
      </CardHeader>
      <CardContent>
        {!siteId ? (
          <div className="text-center py-8 text-muted-foreground">
            현장을 선택해주세요.
          </div>
        ) : (
          <DataTable
            columns={unmatchedColumns}
            data={unmatchedWithIndex}
            searchable
            searchPlaceholder="이름, ID 검색..."
            emptyMessage={isLoading ? "로딩 중..." : "미매칭 기록이 없습니다."}
            pageSize={20}
          />
        )}
      </CardContent>
    </Card>
  );
}
