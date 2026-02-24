"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  toast,
} from "@safetywallet/ui";
import { ShieldX } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { useMembers, useSetMemberActiveStatus } from "@/hooks/use-api";
import { useAuthStore } from "@/stores/auth";

interface Member {
  id: string;
  user: { id: string; name: string };
  status: string;
  role: string;
  joinedAt: string;
}

const statusLabels: Record<string, string> = {
  ACTIVE: "활성",
  INACTIVE: "비활성",
  SUSPENDED: "정지",
};

export default function MembersPage() {
  const router = useRouter();
  const currentSiteId = useAuthStore((s) => s.currentSiteId);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const { data: members = [], isLoading } = useMembers();
  const setMemberActiveStatus = useSetMemberActiveStatus();
  const [targetMember, setTargetMember] = useState<Member | null>(null);

  const columns: Column<Member>[] = [
    {
      key: "user.name",
      header: "이름",
      sortable: true,
      render: (item) => item.user.name || "-",
    },
    {
      key: "role",
      header: "역할",
      render: (item) => item.role,
    },
    {
      key: "status",
      header: "상태",
      render: (item) => (
        <Badge variant={item.status === "ACTIVE" ? "default" : "secondary"}>
          {statusLabels[item.status] || item.status}
        </Badge>
      ),
    },
    {
      key: "joinedAt",
      header: "가입일",
      sortable: true,
      render: (item) => new Date(item.joinedAt).toLocaleDateString("ko-KR"),
    },
    {
      key: "id",
      header: "관리",
      render: (item) => {
        const active = item.status === "ACTIVE";
        return (
          <Button
            variant={active ? "destructive" : "outline"}
            size="sm"
            className="gap-1"
            onClick={(event) => {
              event.stopPropagation();
              setTargetMember(item);
            }}
          >
            <ShieldX size={14} />
            {active ? "비활성화" : "활성화"}
          </Button>
        );
      },
    },
  ];

  const handleUpdateStatus = () => {
    if (!targetMember) {
      return;
    }

    const nextActive = targetMember.status !== "ACTIVE";
    setMemberActiveStatus.mutate(
      {
        userId: targetMember.user.id,
        active: nextActive,
      },
      {
        onSuccess: () => {
          toast({
            description: `${targetMember.user.name} 회원 상태가 ${nextActive ? "활성" : "비활성"}으로 변경되었습니다.`,
          });
          setTargetMember(null);
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            description: `상태 변경 실패: ${error.message}`,
          });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">회원 관리</h1>

      <DataTable
        columns={columns}
        data={members as Member[]}
        searchable
        searchPlaceholder="이름 검색..."
        onRowClick={(item) => router.push(`/members/${item.id}`)}
        emptyMessage={
          !hasHydrated || !currentSiteId
            ? "현장 정보를 준비하는 중입니다..."
            : isLoading
              ? "로딩 중..."
              : "회원이 없습니다"
        }
      />

      <AlertDialog
        open={!!targetMember}
        onOpenChange={(open) => !open && setTargetMember(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>회원 상태 변경</AlertDialogTitle>
            <AlertDialogDescription>
              {targetMember?.user.name}님을
              {targetMember?.status === "ACTIVE" ? " 비활성화" : " 활성화"}
              하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpdateStatus}
              disabled={setMemberActiveStatus.isPending}
            >
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
