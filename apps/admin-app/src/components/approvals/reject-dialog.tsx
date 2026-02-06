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
  toast,
} from "@safetywallet/ui";
import { useRejectManualRequest } from "@/hooks/use-api";

interface RejectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  approvalId: string;
}

export function RejectDialog({
  isOpen,
  onClose,
  approvalId,
}: RejectDialogProps) {
  const [reason, setReason] = useState("");
  const rejectMutation = useRejectManualRequest();

  const handleSubmit = () => {
    if (!reason || reason.length < 5) {
      toast({
        variant: "destructive",
        description: "거절 사유를 5자 이상 입력해주세요.",
      });
      return;
    }

    rejectMutation.mutate(
      { id: approvalId, reason },
      {
        onSuccess: () => {
          onClose();
          setReason("");
          toast({
            description: "요청이 거절되었습니다.",
          });
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            description: "거절 실패: " + error.message,
          });
        },
      },
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md bg-white shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
          <CardTitle>요청 거절</CardTitle>
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
            <label className="text-sm font-medium">거절 사유</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="거절 사유를 입력하세요"
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rejectMutation.isPending || !reason}
            variant="destructive"
          >
            {rejectMutation.isPending ? "처리 중..." : "거절"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
