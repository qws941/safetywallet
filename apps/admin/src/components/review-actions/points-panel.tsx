"use client";

import { Check, Coins, ChevronDown } from "lucide-react";
import { Button, Card, Input } from "@safetywallet/ui";
import { PointPolicy } from "@/hooks/use-points-api";
import { Category } from "@safetywallet/types";
import { DEFAULT_BASE_POINTS, DEFAULT_RISK_BONUS } from "./constants";

interface PointsPanelProps {
  activePolicies: PointPolicy[];
  selectedPolicyId: string;
  pointsToAward: number;
  reasonCode: string;
  category?: Category;
  riskLevel?: string;
  suggestedPoints: number;
  isPending: boolean;
  onPolicySelect: (policyId: string) => void;
  onPointsChange: (points: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PointsPanel({
  activePolicies,
  selectedPolicyId,
  pointsToAward,
  reasonCode,
  category,
  riskLevel,
  suggestedPoints,
  isPending,
  onPolicySelect,
  onPointsChange,
  onConfirm,
  onCancel,
}: PointsPanelProps) {
  const selectedPolicy = activePolicies.find((p) => p.id === selectedPolicyId);
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
            onChange={(e) => onPolicySelect(e.target.value)}
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
              onPointsChange(Math.max(0, parseInt(e.target.value) || 0))
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
          onClick={onConfirm}
          disabled={isPending || pointsToAward < 0}
          className="gap-1"
        >
          <Check size={16} />
          승인 ({pointsToAward}점 지급)
        </Button>
        <Button variant="outline" onClick={onCancel}>
          취소
        </Button>
      </div>
    </Card>
  );
}
