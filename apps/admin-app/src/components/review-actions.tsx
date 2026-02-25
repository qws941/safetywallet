"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Check,
  X,
  HelpCircle,
  AlertTriangle,
  Coins,
  ChevronDown,
} from "lucide-react";
import { Button, Card, Input } from "@safetywallet/ui";
import {
  ReviewAction,
  RejectReason,
  ReviewStatus,
  Category,
} from "@safetywallet/types";
import { useReviewPost, useAdminReviewPost } from "@/hooks/use-posts-api";
import { usePolicies } from "@/hooks/use-points-api";

const DEFAULT_BASE_POINTS: Record<string, number> = {
  [Category.HAZARD]: 10,
  [Category.UNSAFE_BEHAVIOR]: 8,
  [Category.INCONVENIENCE]: 5,
  [Category.SUGGESTION]: 7,
  [Category.BEST_PRACTICE]: 10,
};

const DEFAULT_RISK_BONUS: Record<string, number> = {
  HIGH: 5,
  MEDIUM: 3,
  LOW: 0,
};

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
  category?: Category;
  riskLevel?: string;
  onComplete?: () => void;
}

export function ReviewActions({
  postId,
  currentStatus,
  category,
  riskLevel,
  onComplete,
}: ReviewActionsProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showInfoRequest, setShowInfoRequest] = useState(false);
  const [showUrgentConfirm, setShowUrgentConfirm] = useState(false);
  const [showPointsPanel, setShowPointsPanel] = useState(false);
  const [rejectReason, setRejectReason] = useState<RejectReason | null>(null);
  const [note, setNote] = useState("");

  // Points two-track state
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const [pointsToAward, setPointsToAward] = useState(0);
  const [reasonCode, setReasonCode] = useState("");

  const reviewMutation = useReviewPost();
  const adminReviewMutation = useAdminReviewPost();
  const { data: policies } = usePolicies();

  // Calculate default points from category + risk
  const suggestedPoints = useMemo(() => {
    const base = category ? (DEFAULT_BASE_POINTS[category] ?? 5) : 5;
    const bonus = riskLevel ? (DEFAULT_RISK_BONUS[riskLevel] ?? 0) : 0;
    return base + bonus;
  }, [category, riskLevel]);

  // Initialize points to suggested on panel open
  useEffect(() => {
    if (showPointsPanel && !selectedPolicyId) {
      setPointsToAward(suggestedPoints);
      setReasonCode("POST_APPROVED");
    }
  }, [showPointsPanel, suggestedPoints, selectedPolicyId]);

  const activePolicies = useMemo(
    () => (policies ?? []).filter((p) => p.isActive),
    [policies],
  );

  const handlePolicySelect = (policyId: string) => {
    setSelectedPolicyId(policyId);
    if (policyId) {
      const policy = activePolicies.find((p) => p.id === policyId);
      if (policy) {
        setPointsToAward(policy.defaultAmount);
        setReasonCode(policy.reasonCode);
      }
    } else {
      // "자동 계산" selected — revert to defaults
      setPointsToAward(suggestedPoints);
      setReasonCode("POST_APPROVED");
    }
  };

  const handleConfirmApprove = () => {
    adminReviewMutation.mutate(
      {
        postId,
        action: "APPROVE",
        pointsToAward,
        reasonCode: reasonCode || "POST_APPROVED",
      },
      {
        onSuccess: () => {
          setShowPointsPanel(false);
          setSelectedPolicyId("");
          onComplete?.();
        },
      },
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
    adminReviewMutation.mutate(
      {
        postId,
        action: "REJECT",
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
    adminReviewMutation.mutate(
      { postId, action: "REQUEST_MORE", comment: note },
      {
        onSuccess: () => {
          setShowInfoRequest(false);
          setNote("");
          onComplete?.();
        },
      },
    );
  };

  const isPending = reviewMutation.isPending || adminReviewMutation.isPending;

  // --- Points panel (approve flow) ---
  if (showPointsPanel) {
    const selectedPolicy = activePolicies.find(
      (p) => p.id === selectedPolicyId,
    );
    const minPts = selectedPolicy?.minAmount ?? 0;
    const maxPts = selectedPolicy?.maxAmount ?? 100;

    return (
      <Card className="p-4 border-blue-200 bg-blue-50">
        <h3 className="mb-3 font-medium text-blue-800 flex items-center gap-2">
          <Coins className="h-5 w-5" />
          포인트 지급 설정
        </h3>

        {/* Policy dropdown */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            포인트 정책
          </label>
          <div className="relative">
            <select
              value={selectedPolicyId}
              onChange={(e) => handlePolicySelect(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
            >
              <option value="">자동 계산 (카테고리+위험도)</option>
              {activePolicies.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {policy.name} ({policy.defaultAmount}점)
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          {!selectedPolicyId && category && (
            <p className="mt-1 text-xs text-gray-500">
              기본: {category} {DEFAULT_BASE_POINTS[category] ?? 5}점
              {riskLevel
                ? ` + ${riskLevel} 위험도 ${DEFAULT_RISK_BONUS[riskLevel] ?? 0}점`
                : ""}
              {" = "}
              {suggestedPoints}점
            </p>
          )}
          {selectedPolicy && selectedPolicy.description && (
            <p className="mt-1 text-xs text-gray-500">
              {selectedPolicy.description}
            </p>
          )}
        </div>

        {/* Points manual override */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            지급 포인트
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={minPts}
              max={maxPts}
              value={pointsToAward}
              onChange={(e) =>
                setPointsToAward(Math.max(0, parseInt(e.target.value) || 0))
              }
              className="w-24"
            />
            <span className="text-sm text-gray-500">점</span>
            {selectedPolicy && (
              <span className="text-xs text-gray-400">
                (범위: {minPts}~{maxPts})
              </span>
            )}
          </div>
        </div>

        {/* Reason code display */}
        <div className="mb-4">
          <p className="text-xs text-gray-500">
            사유 코드: <span className="font-mono">{reasonCode}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleConfirmApprove}
            disabled={isPending || pointsToAward < 0}
            className="gap-1"
          >
            <Check size={16} />
            승인 ({pointsToAward}점 지급)
          </Button>
          <Button variant="outline" onClick={() => setShowPointsPanel(false)}>
            취소
          </Button>
        </div>
      </Card>
    );
  }

  // --- Urgent confirm ---
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
            disabled={isPending}
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

  // --- Reject form ---
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
            disabled={!rejectReason || isPending}
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

  // --- Info request form ---
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
            disabled={!note.trim() || isPending}
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

  // --- Default action buttons ---
  return (
    <div className="flex gap-2">
      <Button
        onClick={() => setShowPointsPanel(true)}
        disabled={isPending}
        className="gap-1"
      >
        <Check size={16} />
        승인
      </Button>
      <Button
        variant="destructive"
        onClick={() => setShowRejectForm(true)}
        disabled={isPending}
        className="gap-1"
      >
        <X size={16} />
        거절
      </Button>
      <Button
        variant="outline"
        onClick={() => setShowInfoRequest(true)}
        disabled={isPending}
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
