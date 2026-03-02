"use client";

import { AlertTriangle } from "lucide-react";
import { Button, Card } from "@safetywallet/ui";

interface UrgentConfirmProps {
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function UrgentConfirm({
  isPending,
  onConfirm,
  onCancel,
}: UrgentConfirmProps) {
  return (
    <Card className="p-4 border-red-200 bg-red-50">
      <h3 className="mb-3 font-medium text-red-800 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        긴급 건으로 지정하시겠습니까?
      </h3>
      <p className="mb-4 text-sm text-red-700">
        이 제보를 긴급 상태로 변경합니다. 즉각적인 조치가 필요한 경우에만
        사용하세요.
      </p>
      <div className="flex gap-2">
        <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
          긴급 지정
        </Button>
        <Button variant="outline" onClick={onCancel}>
          취소
        </Button>
      </div>
    </Card>
  );
}
