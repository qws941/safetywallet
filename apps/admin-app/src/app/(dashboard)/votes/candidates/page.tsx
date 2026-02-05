"use client";

import { useState } from "react";
import { Input, Button } from "@safetywallet/ui";
import { DataTable, type Column } from "@/components/data-table";
import { CandidateDialog } from "@/components/votes/candidate-dialog";
import {
  useVoteCandidates,
  useDeleteVoteCandidate,
  type VoteCandidate,
} from "@/hooks/use-votes";
import { Trash2 } from "lucide-react";

export default function VoteCandidatesPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const { data: candidates, isLoading } = useVoteCandidates(month);
  const { mutate: deleteCandidate } = useDeleteVoteCandidate();

  const handleDelete = (id: string) => {
    if (confirm("정말 이 후보자를 삭제하시겠습니까?")) {
      deleteCandidate(
        { id },
        {
          onSuccess: () => alert("삭제되었습니다."),
          onError: (err) => alert("삭제 실패: " + err.message),
        },
      );
    }
  };

  const columns: Column<VoteCandidate>[] = [
    {
      key: "user.nameMasked",
      header: "이름",
      render: (item) => (
        <div>
          <div className="font-medium">{item.user.nameMasked}</div>
        </div>
      ),
    },
    {
      key: "user.companyName",
      header: "소속",
    },
    {
      key: "user.tradeType",
      header: "직종",
    },
    {
      key: "source",
      header: "등록 출처",
      render: (item) => (
        <span
          className={
            item.source === "ADMIN" ? "text-blue-600" : "text-slate-600"
          }
        >
          {item.source}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "등록일",
      render: (item) => new Date(item.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "관리",
      render: (item) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(item.id);
          }}
          className="text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={16} />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">투표 후보 관리</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">조회 월</span>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-40"
            />
          </div>
          <CandidateDialog />
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-slate-500">로딩 중...</div>
      ) : (
        <DataTable
          columns={columns}
          data={candidates || []}
          searchable
          searchPlaceholder="이름 또는 소속 검색..."
          emptyMessage="등록된 후보자가 없습니다."
        />
      )}
    </div>
  );
}
