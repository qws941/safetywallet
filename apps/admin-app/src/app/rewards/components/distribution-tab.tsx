"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@safetywallet/ui";
import { DataTable, type Column } from "@/components/data-table";
import { useAuthStore } from "@/stores/auth";
import { usePointsHistory, type PointsHistoryEntry } from "@/hooks/use-rewards";

interface DistributionRow {
  id: string;
  createdAt: string;
  targetName: string;
  amount: number;
  reason: string;
  status: "지급" | "차감";
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function DistributionTab() {
  const siteId = useAuthStore((s) => s.currentSiteId);
  const [month, setMonth] = useState(getCurrentMonth());
  const { data, isLoading } = usePointsHistory({
    siteId: siteId ?? undefined,
    limit: 1000,
    offset: 0,
  });

  const rows = useMemo<DistributionRow[]>(() => {
    const entries = data?.entries ?? [];

    return entries
      .filter((entry: PointsHistoryEntry) => {
        const monthKey = new Date(entry.createdAt).toISOString().slice(0, 7);
        if (monthKey !== month) {
          return false;
        }

        const reasonText =
          `${entry.reasonCode || ""} ${entry.reasonText || ""}`.toUpperCase();
        const rewardLike =
          reasonText.includes("REWARD") ||
          reasonText.includes("AWARD") ||
          reasonText.includes("BONUS") ||
          reasonText.includes("포상") ||
          reasonText.includes("지급");

        return rewardLike;
      })
      .map((entry: PointsHistoryEntry) => ({
        id: entry.id,
        createdAt: entry.createdAt,
        targetName: entry.member.user.nameMasked,
        amount: entry.amount,
        reason: entry.reasonText || entry.reasonCode || "-",
        status: entry.amount >= 0 ? "지급" : "차감",
      }));
  }, [data?.entries, month]);

  const columns: Column<DistributionRow>[] = [
    {
      key: "createdAt",
      header: "날짜",
      render: (row) => new Date(row.createdAt).toLocaleDateString("ko-KR"),
    },
    { key: "targetName", header: "대상자" },
    {
      key: "amount",
      header: "금액",
      render: (row) =>
        `${row.amount > 0 ? "+" : ""}${row.amount.toLocaleString()}P`,
    },
    { key: "reason", header: "사유" },
    { key: "status", header: "상태" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>배분 기록</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="w-full max-w-[220px]">
          <Input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </div>
        <DataTable
          columns={columns}
          data={rows}
          emptyMessage={
            isLoading ? "로딩 중..." : "선택한 월의 배분 기록이 없습니다"
          }
        />
      </CardContent>
    </Card>
  );
}
