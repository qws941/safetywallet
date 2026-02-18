"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import {
  Button,
  Card,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@safetywallet/ui";
import type { ReviewAction } from "@safetywallet/types";
import { useMembers, useCreateAction, useReviewPost } from "@/hooks/use-api";
import { useAuthStore } from "@/stores/auth";

interface AssignmentFormProps {
  postId: string;
  onRefresh: () => void;
}

export function AssignmentForm({ postId, onRefresh }: AssignmentFormProps) {
  const { currentSiteId } = useAuthStore();
  const { data: members } = useMembers(currentSiteId ?? "");
  const createAction = useCreateAction();
  const reviewPost = useReviewPost();

  const [showAssign, setShowAssign] = useState(false);
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [priority, setPriority] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAssign = async () => {
    if (!assignee || !dueDate) return;
    setIsAssigning(true);
    try {
      await createAction.mutateAsync({
        postId,
        assigneeId: assignee,
        dueDate,
        description: actionNote || undefined,
        priority: priority || undefined,
      });
      await reviewPost.mutateAsync({
        postId,
        action: "ASSIGN" as ReviewAction,
        comment: actionNote || undefined,
      });
      setShowAssign(false);
      setAssignee("");
      setDueDate("");
      setActionNote("");
      setPriority("");
      onRefresh();
    } catch {
      // Error handled by react-query
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 font-medium">
          <UserPlus className="h-4 w-4" />
          시정조치 배정
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAssign(!showAssign)}
        >
          {showAssign ? "취소" : "배정하기"}
        </Button>
      </div>
      {showAssign && (
        <div className="space-y-4">
          <div>
            <label htmlFor="assignee-select" className="text-sm font-medium">
              담당자
            </label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger id="assignee-select">
                <SelectValue placeholder="담당자 선택" />
              </SelectTrigger>
              <SelectContent>
                {members?.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.user.nameMasked}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="due-date-input" className="text-sm font-medium">
              마감일
            </label>
            <Input
              id="due-date-input"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="priority-select" className="text-sm font-medium">
              우선순위
            </label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="priority-select">
                <SelectValue placeholder="우선순위 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HIGH">높음</SelectItem>
                <SelectItem value="MEDIUM">보통</SelectItem>
                <SelectItem value="LOW">낮음</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="action-note" className="text-sm font-medium">
              비고
            </label>
            <textarea
              id="action-note"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="시정조치 내용을 입력하세요"
              value={actionNote}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setActionNote(e.target.value)
              }
            />
          </div>
          <Button
            disabled={!assignee || !dueDate || isAssigning}
            className="w-full"
            onClick={handleAssign}
          >
            {isAssigning ? "배정 중..." : "시정조치 배정"}
          </Button>
        </div>
      )}
    </Card>
  );
}
