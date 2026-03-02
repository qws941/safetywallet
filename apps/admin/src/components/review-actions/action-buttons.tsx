"use client";

import { Check, X, HelpCircle, AlertTriangle } from "lucide-react";
import { Button } from "@safetywallet/ui";
import { ReviewStatus } from "@safetywallet/types";

interface ActionButtonsProps {
  currentStatus?: ReviewStatus;
  isPending: boolean;
  onApproveClick: () => void;
  onRejectClick: () => void;
  onInfoRequestClick: () => void;
  onUrgentClick: () => void;
}

export function ActionButtons({
  currentStatus,
  isPending,
  onApproveClick,
  onRejectClick,
  onInfoRequestClick,
  onUrgentClick,
}: ActionButtonsProps) {
  const showUrgentButton =
    currentStatus &&
    [
      ReviewStatus.PENDING,
      ReviewStatus.IN_REVIEW,
      ReviewStatus.NEED_INFO,
    ].includes(currentStatus);

  return (
    <div className="flex gap-2">
      <Button onClick={onApproveClick} disabled={isPending} className="gap-1">
        <Check size={16} />
        승인
      </Button>
      <Button
        variant="destructive"
        onClick={onRejectClick}
        disabled={isPending}
        className="gap-1"
      >
        <X size={16} />
        거절
      </Button>
      <Button
        variant="outline"
        onClick={onInfoRequestClick}
        disabled={isPending}
        className="gap-1"
      >
        <HelpCircle size={16} />
        추가 정보 요청
      </Button>
      {showUrgentButton && (
        <Button
          variant="secondary"
          onClick={onUrgentClick}
          disabled={isPending}
          className="gap-1 text-red-600 bg-red-100 hover:bg-red-200"
        >
          <AlertTriangle size={16} />
          긴급 지정
        </Button>
      )}
    </div>
  );
}
