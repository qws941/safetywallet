"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ReviewAction,
  RejectReason,
  ReviewStatus,
  Category,
} from "@safetywallet/types";
import { useReviewPost, useAdminReviewPost } from "@/hooks/use-posts-api";
import { usePolicies } from "@/hooks/use-points-api";
import { PointsPanel } from "./points-panel";
import { UrgentConfirm } from "./urgent-confirm";
import { RejectForm } from "./reject-form";
import { InfoRequestForm } from "./info-request-form";
import { ActionButtons } from "./action-buttons";
import { DEFAULT_BASE_POINTS, DEFAULT_RISK_BONUS } from "./constants";

export interface ReviewActionsProps {
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
    return (
      <PointsPanel
        activePolicies={activePolicies}
        selectedPolicyId={selectedPolicyId}
        pointsToAward={pointsToAward}
        reasonCode={reasonCode}
        category={category}
        riskLevel={riskLevel}
        suggestedPoints={suggestedPoints}
        isPending={isPending}
        onPolicySelect={handlePolicySelect}
        onPointsChange={setPointsToAward}
        onConfirm={handleConfirmApprove}
        onCancel={() => setShowPointsPanel(false)}
      />
    );
  }

  // --- Urgent confirm ---
  if (showUrgentConfirm) {
    return (
      <UrgentConfirm
        isPending={isPending}
        onConfirm={handleMarkUrgent}
        onCancel={() => setShowUrgentConfirm(false)}
      />
    );
  }

  // --- Reject form ---
  if (showRejectForm) {
    return (
      <RejectForm
        rejectReason={rejectReason}
        note={note}
        isPending={isPending}
        onReasonSelect={(reason, template) => {
          setRejectReason(reason);
          if (template) setNote(template);
        }}
        onNoteChange={setNote}
        onReject={handleReject}
        onCancel={() => setShowRejectForm(false)}
      />
    );
  }

  // --- Info request form ---
  if (showInfoRequest) {
    return (
      <InfoRequestForm
        note={note}
        isPending={isPending}
        onNoteChange={setNote}
        onSubmit={handleRequestInfo}
        onCancel={() => setShowInfoRequest(false)}
      />
    );
  }

  // --- Default action buttons ---
  return (
    <ActionButtons
      currentStatus={currentStatus}
      isPending={isPending}
      onApproveClick={() => setShowPointsPanel(true)}
      onRejectClick={() => setShowRejectForm(true)}
      onInfoRequestClick={() => setShowInfoRequest(true)}
      onUrgentClick={() => setShowUrgentConfirm(true)}
    />
  );
}
