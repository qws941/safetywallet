"use client";

import { useState } from "react";
import { Check, X, HelpCircle, AlertTriangle } from "lucide-react";
import { Button, Card, Input } from "@safetywallet/ui";
import { ReviewAction, RejectReason, ReviewStatus } from "@safetywallet/types";
import { useReviewPost } from "@/hooks/use-api";

const rejectReasons: {
  value: RejectReason;
  label: string;
  template: string;
}[] = [
  {
    value: RejectReason.DUPLICATE,
    label: "중복 제보",
    template: "이미 동일한 내용이 보고되었습니다.",
  },
  {
    value: RejectReason.UNCLEAR_PHOTO,
    label: "사진 불명확",
    template: "사진이 불명확하거나 상황을 충분히 보여주지 않습니다.",
  },
  {
    value: RejectReason.INSUFFICIENT,
    label: "정보 부족",
    template: "안전 문제를 판단하기에 제공된 정보가 부족합니다.",
  },
  {
    value: RejectReason.FALSE,
    label: "허위 제보",
    template: "부적절하거나 허위 내용이 포함되어 있습니다.",
  },
  {
    value: RejectReason.IRRELEVANT,
    label: "관련 없음",
    template: "안전과 직접적으로 관련되지 않은 내용입니다.",
  },
  {
    value: RejectReason.OTHER,
    label: "기타",
    template: "",
  },
];

interface ReviewActionsProps {
  postId: string;
  currentStatus?: ReviewStatus;
  onComplete?: () => void;
}

export function ReviewActions({
  postId,
  currentStatus,
  onComplete,
}: ReviewActionsProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showInfoRequest, setShowInfoRequest] = useState(false);
  const [showUrgentConfirm, setShowUrgentConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState<RejectReason | null>(null);
  const [note, setNote] = useState("");

  const reviewMutation = useReviewPost();

  const handleApprove = () => {
    reviewMutation.mutate(
      { postId, action: ReviewAction.APPROVE },
      { onSuccess: onComplete },
    );
  };

  const handleMarkUrgent = () => {
    reviewMutation.mutate(
      { postId, action: ReviewAction.MARK_URGENT },
      {
        onSuccess: () => {
          setShowUrgentConfirm(false);
          onComplete?.();
        },
      },
    );
  };

  const handleReject = () => {
    if (!rejectReason) return;
    reviewMutation.mutate(
      {
        postId,
        action: ReviewAction.REJECT,
        reason: rejectReason,
        comment: note,
      },
      {
        onSuccess: () => {
          setShowRejectForm(false);
          setRejectReason(null);
          setNote("");
          onComplete?.();
        },
      },
    );
  };

  const handleRequestInfo = () => {
    if (!note.trim()) return;
    reviewMutation.mutate(
      { postId, action: ReviewAction.REQUEST_MORE, comment: note },
      {
        onSuccess: () => {
          setShowInfoRequest(false);
          setNote("");
          onComplete?.();
        },
      },
    );
  };

  if (showUrgentConfirm) {
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
          <Button
            variant="destructive"
            onClick={handleMarkUrgent}
            disabled={reviewMutation.isPending}
          >
            긴급 지정
          </Button>
          <Button variant="outline" onClick={() => setShowUrgentConfirm(false)}>
            취소
          </Button>
        </div>
      </Card>
    );
  }

  if (showRejectForm) {
    return (
      <Card className="p-4">
        <h3 className="mb-3 font-medium">거절 사유 선택</h3>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {rejectReasons.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => {
                setRejectReason(r.value);
                if (r.template) setNote(r.template);
              }}
              className={`rounded-lg border p-3 text-left transition-colors ${
                rejectReason === r.value
                  ? "border-red-500 bg-red-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span className="block text-sm font-medium">{r.label}</span>
              {r.template && (
                <span className="mt-1 block text-xs text-gray-500">
                  {r.template}
                </span>
              )}
            </button>
          ))}
        </div>
        <Input
          placeholder="추가 설명 (선택)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mb-3"
        />
        <div className="flex gap-2">
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={!rejectReason || reviewMutation.isPending}
          >
            거절
          </Button>
          <Button variant="outline" onClick={() => setShowRejectForm(false)}>
            취소
          </Button>
        </div>
      </Card>
    );
  }

  if (showInfoRequest) {
    return (
      <Card className="p-4">
        <h3 className="mb-3 font-medium">추가 정보 요청</h3>
        <Input
          placeholder="필요한 정보를 입력하세요"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mb-3"
        />
        <div className="flex gap-2">
          <Button
            onClick={handleRequestInfo}
            disabled={!note.trim() || reviewMutation.isPending}
          >
            요청 보내기
          </Button>
          <Button variant="outline" onClick={() => setShowInfoRequest(false)}>
            취소
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleApprove}
        disabled={reviewMutation.isPending}
        className="gap-1"
      >
        <Check size={16} />
        승인
      </Button>
      <Button
        variant="destructive"
        onClick={() => setShowRejectForm(true)}
        disabled={reviewMutation.isPending}
        className="gap-1"
      >
        <X size={16} />
        거절
      </Button>
      <Button
        variant="outline"
        onClick={() => setShowInfoRequest(true)}
        disabled={reviewMutation.isPending}
        className="gap-1"
      >
        <HelpCircle size={16} />
        추가 정보 요청
      </Button>
      {currentStatus &&
        [
          ReviewStatus.PENDING,
          ReviewStatus.IN_REVIEW,
          ReviewStatus.NEED_INFO,
        ].includes(currentStatus) && (
          <Button
            variant="secondary"
            onClick={() => setShowUrgentConfirm(true)}
            disabled={reviewMutation.isPending}
            className="gap-1 text-red-600 bg-red-100 hover:bg-red-200"
          >
            <AlertTriangle size={16} />
            긴급 지정
          </Button>
        )}
    </div>
  );
}
