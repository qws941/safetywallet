"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  Badge,
  Button,
  Input,
  toast,
} from "@safetywallet/ui";
import {
  Database,
  Wifi,
  WifiOff,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Link2,
} from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import {
  useFasSyncStatus,
  useAcetimeSync,
  useAcetimeCrossMatch,
  useSearchFasMariadb,
  type FasSyncLogEntry,
  type FasSearchResult,
} from "@/hooks/use-fas-sync";
import { useSyncErrors, type SyncErrorItem } from "@/hooks/use-sync-errors";

export const runtime = "edge";

function formatKstDateTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  } catch {
    return dateStr;
  }
}

const ACTION_LABELS: Record<string, string> = {
  FAS_SYNC_COMPLETED: "동기화 완료",
  FAS_SYNC_FAILED: "동기화 실패",
  FAS_WORKERS_SYNCED: "수동 동기화",
};

const ACTION_BADGES: Record<string, "default" | "destructive" | "secondary"> = {
  FAS_SYNC_COMPLETED: "default",
  FAS_SYNC_FAILED: "destructive",
  FAS_WORKERS_SYNCED: "secondary",
};

export default function AttendanceSyncPage() {
  const { data: syncStatus, isLoading } = useFasSyncStatus();
  const { data: syncErrorsData, isLoading: syncErrorsLoading } = useSyncErrors({
    status: "OPEN",
    limit: 50,
  });

  const acetimeSync = useAcetimeSync();
  const crossMatch = useAcetimeCrossMatch();

  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [activeSearch, setActiveSearch] = useState<{
    name?: string;
    phone?: string;
  }>({});

  const { data: searchData, isLoading: searchLoading } =
    useSearchFasMariadb(activeSearch);

  const handleSearch = () => {
    if (!searchName && !searchPhone) return;
    setActiveSearch({
      name: searchName || undefined,
      phone: searchPhone || undefined,
    });
  };

  const isHealthy = syncStatus?.fasStatus !== "down";

  const syncLogs = syncStatus?.recentSyncLogs ?? [];
  const syncErrors = syncErrorsData?.errors ?? [];

  const syncLogsWithIndex = useMemo(
    () => syncLogs.map((log, i) => ({ ...log, index: i + 1 })),
    [syncLogs],
  );

  const syncErrorsWithIndex = useMemo(
    () => syncErrors.map((err, i) => ({ ...err, index: i + 1 })),
    [syncErrors],
  );

  const logColumns: Column<(typeof syncLogsWithIndex)[0]>[] = [
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

  const errorColumns: Column<(typeof syncErrorsWithIndex)[0]>[] = [
    {
      key: "index",
      header: "No",
      render: (item) => (
        <span className="text-muted-foreground">{item.index}</span>
      ),
      className: "w-[60px]",
    },
    {
      key: "syncType",
      header: "유형",
      sortable: true,
      render: (item) => (
        <Badge variant="outline" className="text-xs">
          {item.syncType}
        </Badge>
      ),
    },
    {
      key: "errorCode",
      header: "에러코드",
      render: (item) => (
        <span className="font-mono text-xs">{item.errorCode ?? "-"}</span>
      ),
    },
    {
      key: "errorMessage",
      header: "메시지",
      render: (item) => (
        <span className="text-sm truncate max-w-[300px] block">
          {item.errorMessage}
        </span>
      ),
    },
    {
      key: "retryCount",
      header: "재시도",
      render: (item) => <span className="text-sm">{item.retryCount}회</span>,
    },
    {
      key: "createdAt",
      header: "발생시각",
      sortable: true,
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {formatKstDateTime(item.createdAt)}
        </span>
      ),
    },
  ];

  const searchResultsWithIndex = useMemo(
    () => (searchData?.results ?? []).map((r, i) => ({ ...r, index: i + 1 })),
    [searchData?.results],
  );

  const searchColumns: Column<(typeof searchResultsWithIndex)[0]>[] = [
    {
      key: "index",
      header: "No",
      render: (item) => (
        <span className="text-muted-foreground">{item.index}</span>
      ),
      className: "w-[60px]",
    },
    {
      key: "emplCd",
      header: "사번",
      render: (item) => (
        <span className="font-mono text-xs">{item.emplCd}</span>
      ),
    },
    {
      key: "name",
      header: "이름",
      sortable: true,
      render: (item) => <span className="font-medium">{item.name}</span>,
    },
    {
      key: "companyName",
      header: "업체명",
      sortable: true,
      render: (item) => <span className="text-sm">{item.companyName}</span>,
    },
    {
      key: "phone",
      header: "연락처",
      render: (item) => (
        <span className="font-mono text-xs">{item.phone || "-"}</span>
      ),
    },
    {
      key: "stateFlag",
      header: "상태",
      sortable: true,
      render: (item) => (
        <Badge variant={item.stateFlag === "W" ? "default" : "secondary"}>
          {item.stateFlag === "W" ? "재직" : item.stateFlag}
        </Badge>
      ),
    },
    {
      key: "entrDay",
      header: "입사일",
      render: (item) => <span className="text-sm">{item.entrDay || "-"}</span>,
    },
  ];

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6" />
          FAS 연동 현황
        </h1>
        <p className="text-muted-foreground mt-1">
          FAS 출근데이터 동기화 상태 및 에러 모니터링
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">FAS 연결상태</CardTitle>
            {isHealthy ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={isHealthy ? "default" : "destructive"}>
                {isHealthy ? "정상" : "연결 실패"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {syncStatus?.fasStatus
                ? `상태: ${syncStatus.fasStatus}`
                : "Hyperdrive 연결 정상"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              마지막 전체동기화
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatRelativeTime(syncStatus?.lastFullSync ?? null)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {syncStatus?.lastFullSync
                ? formatKstDateTime(syncStatus.lastFullSync)
                : "동기화 기록 없음"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              FAS 연동 사용자
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {syncStatus?.userStats.fasLinked.toLocaleString() ?? 0}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                / {syncStatus?.userStats.total.toLocaleString() ?? 0}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              미등록 전화번호 {syncStatus?.userStats.missingPhone ?? 0}건
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">동기화 에러</CardTitle>
            <AlertTriangle
              className={`h-4 w-4 ${
                (syncStatus?.syncErrorCounts.open ?? 0) > 0
                  ? "text-destructive"
                  : "text-green-500"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {syncStatus?.syncErrorCounts.open ?? 0}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                건 미해결
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              해결 {syncStatus?.syncErrorCounts.resolved ?? 0} / 무시{" "}
              {syncStatus?.syncErrorCounts.ignored ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            수동 동기화
          </CardTitle>
          <CardDescription>
            AceTime R2 데이터 동기화 및 FAS 크로스매칭을 수동으로 실행합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={acetimeSync.isPending}
            onClick={() =>
              acetimeSync.mutate(undefined, {
                onSuccess: (data) => {
                  toast({
                    description: `AceTime 동기화 완료: ${data.sync.created}건 생성, ${data.sync.updated}건 갱신, FAS 매칭 ${data.fasCrossMatch.matched}건`,
                  });
                },
                onError: () => {
                  toast({
                    variant: "destructive",
                    description: "AceTime 동기화 실패",
                  });
                },
              })
            }
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${acetimeSync.isPending ? "animate-spin" : ""}`}
            />
            {acetimeSync.isPending ? "동기화 중..." : "AceTime R2 동기화"}
          </Button>
          <Button
            variant="outline"
            disabled={crossMatch.isPending}
            onClick={() =>
              crossMatch.mutate(100, {
                onSuccess: (data) => {
                  toast({
                    description: `FAS 크로스매칭 완료: ${data.results.matched}건 매칭${data.hasMore ? " (추가 데이터 있음)" : ""}`,
                  });
                },
                onError: () => {
                  toast({
                    variant: "destructive",
                    description: "FAS 크로스매칭 실패",
                  });
                },
              })
            }
          >
            <Link2
              className={`h-4 w-4 mr-2 ${crossMatch.isPending ? "animate-spin" : ""}`}
            />
            {crossMatch.isPending ? "매칭 중..." : "FAS 크로스매칭"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            FAS MariaDB 검색
          </CardTitle>
          <CardDescription>
            FAS 원본 데이터베이스에서 근로자를 검색합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label htmlFor="fas-search-name" className="text-sm font-medium">
                이름
              </label>
              <Input
                id="fas-search-name"
                placeholder="근로자 이름"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-48"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="fas-search-phone" className="text-sm font-medium">
                연락처
              </label>
              <Input
                id="fas-search-phone"
                placeholder="전화번호"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-48"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={(!searchName && !searchPhone) || searchLoading}
            >
              <Search className="h-4 w-4 mr-2" />
              {searchLoading ? "검색 중..." : "검색"}
            </Button>
          </div>
          {searchData && (
            <>
              <p className="text-sm text-muted-foreground">
                검색 결과: {searchData.count}건
              </p>
              <DataTable
                columns={searchColumns}
                data={searchResultsWithIndex}
                searchable
                searchPlaceholder="이름 또는 업체 검색..."
                emptyMessage="검색 결과가 없습니다."
                pageSize={10}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            미해결 동기화 에러
          </CardTitle>
          <CardDescription>OPEN 상태의 동기화 에러 목록</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={errorColumns}
            data={syncErrorsWithIndex}
            searchable
            searchPlaceholder="에러 메시지 검색..."
            emptyMessage={
              syncErrorsLoading ? "로딩 중..." : "미해결 에러가 없습니다."
            }
            pageSize={10}
          />
        </CardContent>
      </Card>

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
    </div>
  );
}
