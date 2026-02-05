"use client";

import { DataTable, type Column } from "@/components/data-table";
import { useManualApprovals, type ManualApproval } from "@/hooks/use-api";

interface ApprovalHistoryProps {
  siteId?: string;
}

export function ApprovalHistory({ siteId }: ApprovalHistoryProps) {
  const { data: approvals = [], isLoading } = useManualApprovals(siteId);

  const columns: Column<ManualApproval>[] = [
    {
      key: "user.name",
      header: "작업자",
      sortable: true,
      render: (item) =>
        `${item.user.name || "-"} (${item.user.companyName || "-"})`,
    },
    {
      key: "reason",
      header: "사유",
      className: "max-w-xs truncate",
    },
    {
      key: "validDate",
      header: "유효 날짜",
      sortable: true,
      render: (item) => new Date(item.validDate).toLocaleDateString("ko-KR"),
    },
    {
      key: "approvedBy.name",
      header: "승인자",
      render: (item) => item.approvedBy?.name || "-",
    },
    {
      key: "createdAt",
      header: "생성일",
      sortable: true,
      render: (item) => new Date(item.createdAt).toLocaleString("ko-KR"),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={approvals}
      searchable
      searchPlaceholder="이름, 사유 검색..."
      emptyMessage={isLoading ? "로딩 중..." : "승인 내역이 없습니다"}
    />
  );
}
