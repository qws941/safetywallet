"use client";

import { Button, Card, Input } from "@safetywallet/ui";
import { RejectReason } from "@safetywallet/types";
import { rejectReasons } from "./constants";

interface RejectFormProps {
  rejectReason: RejectReason | null;
  note: string;
  isPending: boolean;
  onReasonSelect: (reason: RejectReason, template: string) => void;
  onNoteChange: (note: string) => void;
  onReject: () => void;
  onCancel: () => void;
}

export function RejectForm({
  rejectReason,
  note,
  isPending,
  onReasonSelect,
  onNoteChange,
  onReject,
  onCancel,
}: RejectFormProps) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 font-medium">거절 사유 선택</h3>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {rejectReasons.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => onReasonSelect(r.value, r.template)}
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
        onChange={(e) => onNoteChange(e.target.value)}
        className="mb-3"
      />
      <div className="flex gap-2">
        <Button
          variant="destructive"
          onClick={onReject}
          disabled={!rejectReason || isPending}
        >
          거절
        </Button>
        <Button variant="outline" onClick={onCancel}>
          취소
        </Button>
      </div>
    </Card>
  );
}
