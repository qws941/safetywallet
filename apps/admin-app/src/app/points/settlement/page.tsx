"use client";

import { useMemo } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  toast,
} from "@safetywallet/ui";
import {
  useCreateSettlementSnapshot,
  useFinalizeSettlement,
  useSettlementStatus,
  type SettlementDispute,
  type SettlementMonthHistory,
} from "@/hooks/use-api";
import { DataTable, type Column } from "@/components/data-table";

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function PointsSettlementPage() {
  const month = useMemo(() => getCurrentMonth(), []);
  const { data, isLoading, refetch } = useSettlementStatus(month);
  const snapshotMutation = useCreateSettlementSnapshot();
  const finalizeMutation = useFinalizeSettlement();

  const disputeColumns: Column<SettlementDispute>[] = [
    {
      key: "createdAt",
      header: "등록일",
      render: (row) => new Date(row.createdAt).toLocaleDateString("ko-KR"),
    },
    { key: "title", header: "제목" },
    { key: "userName", header: "요청자", render: (row) => row.userName || "-" },
    {
      key: "status",
      header: "상태",
      render: (row) => (
        <Badge variant={row.status === "OPEN" ? "destructive" : "secondary"}>
          {row.status}
        </Badge>
      ),
    },
  ];

  const historyColumns: Column<SettlementMonthHistory>[] = [
    { key: "month", header: "월" },
    {
      key: "entryCount",
      header: "건수",
      render: (row) => `${row.entryCount.toLocaleString()}건`,
    },
    {
      key: "totalAmount",
      header: "합계 포인트",
      render: (row) => `${row.totalAmount.toLocaleString()}P`,
    },
    {
      key: "lastOccurredAt",
      header: "최근 반영일",
      render: (row) => new Date(row.lastOccurredAt).toLocaleString("ko-KR"),
    },
  ];

  const handleSnapshot = () => {
    snapshotMutation.mutate(undefined, {
      onSuccess: async () => {
        toast({ description: "월말 스냅샷이 생성되었습니다." });
        await refetch();
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          description: `스냅샷 생성 실패: ${error.message}`,
        });
      },
    });
  };

  const handleFinalize = () => {
    finalizeMutation.mutate(undefined, {
      onSuccess: async () => {
        toast({ description: "월말 정산이 확정되었습니다." });
        await refetch();
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          description: `정산 확정 실패: ${error.message}`,
        });
      },
    });
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">월말 정산</h1>
        <Badge variant="outline">대상 월: {month}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>이번 달 정산 상태</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">스냅샷 생성</p>
              <p className="mt-1 font-semibold">
                {data?.snapshotTaken ? "완료" : "미생성"}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">분쟁 건수</p>
              <p className="mt-1 font-semibold">
                {(data?.disputeOpenCount ?? 0).toLocaleString()}건
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">최종 확정</p>
              <p className="mt-1 font-semibold">
                {data?.finalized ? "완료" : "미확정"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleSnapshot}
              disabled={
                snapshotMutation.isPending || finalizeMutation.isPending
              }
            >
              월말 스냅샷 생성
            </Button>
            <Button
              variant="destructive"
              onClick={handleFinalize}
              disabled={
                finalizeMutation.isPending ||
                snapshotMutation.isPending ||
                (data?.disputeOpenCount ?? 0) > 0
              }
            >
              월말 정산 확정
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>분쟁 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={disputeColumns}
            data={data?.disputes ?? []}
            emptyMessage={
              isLoading ? "로딩 중..." : "진행 중인 분쟁이 없습니다"
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>월별 정산 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={historyColumns}
            data={data?.history ?? []}
            emptyMessage={isLoading ? "로딩 중..." : "정산 이력이 없습니다"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
