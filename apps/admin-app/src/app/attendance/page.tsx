"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from "@safetywallet/ui";
import { DataTable, type Column } from "@/components/data-table";
import { useAttendanceLogs, useUnmatchedRecords } from "@/hooks/use-attendance";
import { useAuthStore } from "@/stores/auth";
import { Users, CheckCircle, AlertTriangle } from "lucide-react";

const formatDateForInput = (date: Date) => {
  return date.toISOString().split("T")[0];
};

const formatTime = (dateStr: string | null) => {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "-";
  }
};

export const runtime = "edge";

export default function AttendancePage() {
  const siteId = useAuthStore((s) => s.currentSiteId);
  const [activeTab, setActiveTab] = useState<"logs" | "unmatched">("logs");
  const [date, setDate] = useState<string>(formatDateForInput(new Date()));
  const [resultFilter, setResultFilter] = useState<"ALL" | "SUCCESS" | "FAIL">(
    "ALL",
  );

  const { data: logsResponse, isLoading: isLogsLoading } = useAttendanceLogs(
    1,
    2000,
    { date },
  );

  const { data: unmatchedList = [], isLoading: isUnmatchedLoading } =
    useUnmatchedRecords();

  const allLogs = logsResponse?.items || [];

  const stats = useMemo(() => {
    return {
      total: allLogs.length,
      success: allLogs.filter((l) => l.result === "SUCCESS").length,
      fail: allLogs.filter((l) => l.result === "FAIL").length,
    };
  }, [allLogs]);

  const filteredLogs = useMemo(() => {
    let logs = allLogs;
    if (resultFilter !== "ALL") {
      logs = allLogs.filter((l) => l.result === resultFilter);
    }
    return logs.map((log, i) => ({ ...log, index: i + 1 }));
  }, [allLogs, resultFilter]);

  const unmatchedWithIndex = useMemo(() => {
    return unmatchedList.map((item, i) => ({ ...item, index: i + 1 }));
  }, [unmatchedList]);

  const logColumns: Column<(typeof filteredLogs)[0]>[] = [
    {
      key: "index",
      header: "No",
      render: (item) => (
        <span className="text-muted-foreground">{item.index}</span>
      ),
      className: "w-[60px]",
    },
    {
      key: "user",
      header: "사용자",
      sortable: true,
      render: (item) => (
        <div>
          <p className="font-medium">{item.userName || "-"}</p>
          <p className="text-xs text-muted-foreground">
            {item.companyName || "-"}
          </p>
        </div>
      ),
    },
    {
      key: "result",
      header: "상태",
      sortable: true,
      render: (item) => (
        <Badge
          variant={item.result === "SUCCESS" ? "default" : "destructive"}
          className="capitalize"
        >
          {item.result === "SUCCESS" ? "성공" : "실패"}
        </Badge>
      ),
    },
    {
      key: "checkInTime",
      header: "출근시간",
      sortable: true,
      render: (item) => formatTime(item.checkInTime),
    },
    {
      key: "checkOutTime",
      header: "퇴근시간",
      sortable: true,
      render: (item) => formatTime(item.checkOutTime),
    },
    {
      key: "source",
      header: "출처",
      render: (item) => (
        <span className="text-xs text-muted-foreground">{item.source}</span>
      ),
    },
  ];

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
      key: "name",
      header: "이름",
      sortable: true,
      render: (item) => (
        <div>
          <p className="font-medium">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            External ID: {item.externalId}
          </p>
        </div>
      ),
    },
    {
      key: "companyName",
      header: "소속",
      sortable: true,
      render: (item) => item.companyName || "-",
    },
    {
      key: "checkInTime",
      header: "태깅시간",
      sortable: true,
      render: (item) => formatTime(item.checkInTime),
    },
    {
      key: "reason",
      header: "사유",
      render: (item) => (
        <Badge variant="outline" className="text-xs">
          {item.reason || "미매칭"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">오늘 출근</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}명</div>
            <p className="text-xs text-muted-foreground">전체 출근 시도</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">출근 성공</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.success}명</div>
            <p className="text-xs text-muted-foreground">정상 출근 처리</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">출근 실패</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.fail}명</div>
            <p className="text-xs text-muted-foreground">인증/위치 실패</p>
          </CardContent>
        </Card>
      </div>

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
            {unmatchedList.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                {unmatchedList.length}
              </Badge>
            )}
          </Button>
        </div>

        {activeTab === "logs" && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle>출근 목록</CardTitle>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-[150px]"
                  />
                  <Select
                    value={resultFilter}
                    onValueChange={(val: "ALL" | "SUCCESS" | "FAIL") =>
                      setResultFilter(val)
                    }
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="상태" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">전체</SelectItem>
                      <SelectItem value="SUCCESS">성공</SelectItem>
                      <SelectItem value="FAIL">실패</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!siteId ? (
                <div className="text-center py-8 text-muted-foreground">
                  현장을 선택해주세요.
                </div>
              ) : (
                <DataTable
                  columns={logColumns}
                  data={filteredLogs}
                  searchable
                  searchPlaceholder="이름, 소속 검색..."
                  emptyMessage={
                    isLogsLoading ? "로딩 중..." : "출근 기록이 없습니다."
                  }
                  pageSize={20}
                />
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "unmatched" && (
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
                  emptyMessage={
                    isUnmatchedLoading
                      ? "로딩 중..."
                      : "미매칭 기록이 없습니다."
                  }
                  pageSize={20}
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
