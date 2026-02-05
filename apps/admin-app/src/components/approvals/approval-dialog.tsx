"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@safetywallet/ui";
import {
  useMySites,
  useMembers,
  useCreateManualApproval,
} from "@/hooks/use-api";

interface ApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApprovalDialog({ isOpen, onClose }: ApprovalDialogProps) {
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [reason, setReason] = useState("");
  const [validDate, setValidDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const { data: sites } = useMySites();
  const { data: members } = useMembers(selectedSiteId);
  const createMutation = useCreateManualApproval();

  const handleSubmit = () => {
    if (!selectedUserId || !selectedSiteId || !reason || !validDate) return;
    if (reason.length < 10) {
      alert("사유는 10자 이상이어야 합니다.");
      return;
    }

    createMutation.mutate(
      {
        userId: selectedUserId,
        siteId: selectedSiteId,
        reason,
        validDate: new Date(validDate).toISOString(),
      },
      {
        onSuccess: () => {
          onClose();
          setReason("");
          setSelectedUserId("");
          setSelectedSiteId("");
        },
        onError: (error) => {
          alert("승인 생성 실패: " + error.message);
        },
      },
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg bg-white shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
          <CardTitle>수동 승인 생성</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full p-0"
          >
            <X size={20} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 px-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">현장 선택</label>
            <select
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
            >
              <option value="">현장 선택...</option>
              {sites?.map((site) => (
                <option key={site.siteId} value={site.siteId}>
                  {site.siteName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">작업자 선택</label>
            <select
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={!selectedSiteId}
            >
              <option value="">작업자 선택...</option>
              {members?.map((member) => (
                <option key={member.user.id} value={member.user.id}>
                  {member.user.nameMasked} ({member.user.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">승인 사유 (10자 이상)</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="승인 사유를 입력하세요"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">유효 날짜</label>
            <Input
              type="date"
              value={validDate}
              onChange={(e) => setValidDate(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              createMutation.isPending || !selectedUserId || !selectedSiteId
            }
          >
            {createMutation.isPending ? "처리 중..." : "승인"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
