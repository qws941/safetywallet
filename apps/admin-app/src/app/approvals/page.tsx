"use client";

import { useState } from "react";
import { Button } from "@safetywallet/ui";
import { Plus } from "lucide-react";
import { ApprovalDialog } from "@/components/approvals/approval-dialog";
import { ApprovalHistory } from "@/components/approvals/approval-history";

export default function ApprovalsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">승인 관리</h1>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          수동 승인 생성
        </Button>
      </div>

      <ApprovalHistory />
      <ApprovalDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </div>
  );
}
