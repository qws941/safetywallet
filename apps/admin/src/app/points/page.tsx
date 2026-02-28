"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, Input } from "@safetywallet/ui";
import { DataTable, type Column } from "@/components/data-table";
import {
  usePointsLedger,
  useAwardPoints,
  useMembers,
  type Member,
} from "@/hooks/use-api";

interface PointsEntry {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
  member: { user: { nameMasked: string } };
}

export default function PointsPage() {
  const { data: ledger = [], isLoading } = usePointsLedger();
  const { data: members = [] } = useMembers();
  const awardMutation = useAwardPoints();

  const [selectedMember, setSelectedMember] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const handleAward = () => {
    if (!selectedMember || !amount || !reason) return;
    awardMutation.mutate(
      {
        memberId: selectedMember,
        amount: parseInt(amount, 10),
        reason,
      },
      {
        onSuccess: () => {
          setSelectedMember("");
          setAmount("");
          setReason("");
        },
      },
    );
  };

  const columns: Column<PointsEntry>[] = [
    {
      key: "member.user.nameMasked",
      header: "회원",
    },
    {
      key: "amount",
      header: "포인트",
      sortable: true,
      render: (item) => (
        <span className={item.amount > 0 ? "text-green-600" : "text-red-600"}>
          {item.amount > 0 ? "+" : ""}
          {item.amount.toLocaleString()}
        </span>
      ),
    },
    { key: "reason", header: "사유" },
    {
      key: "createdAt",
      header: "일시",
      sortable: true,
      render: (item) => new Date(item.createdAt).toLocaleString("ko-KR"),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">포인트 관리</h1>
        <div className="flex items-center gap-2">
          <Link href="/points/settlement">
            <Button variant="outline">월말 정산</Button>
          </Link>
          <Link href="/points/policies">
            <Button variant="outline">포인트 정책 관리</Button>
          </Link>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">수동 포인트 지급</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">회원 선택</option>
            {(members as Member[]).map((m) => (
              <option key={m.id} value={m.id}>
                {m.user.name}
              </option>
            ))}
          </select>
          <Input
            type="number"
            placeholder="포인트"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            placeholder="지급 사유"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            onClick={handleAward}
            disabled={
              !selectedMember || !amount || !reason || awardMutation.isPending
            }
          >
            {awardMutation.isPending ? "처리 중..." : "지급"}
          </Button>
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={ledger}
        searchable
        searchPlaceholder="회원, 사유 검색..."
        emptyMessage={isLoading ? "로딩 중..." : "포인트 내역이 없습니다"}
      />
    </div>
  );
}
