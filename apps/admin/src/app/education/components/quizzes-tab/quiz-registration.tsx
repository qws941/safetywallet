"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from "@safetywallet/ui";
import {
  useCreateQuiz,
  useUpdateQuiz,
  type CreateQuizInput,
} from "@/hooks/use-api";
import { useAuthStore } from "@/stores/auth";
import { getErrorMessage } from "../../education-helpers";
import type { QuizFormState, QuizItem } from "../education-types";
import { INITIAL_QUIZ_FORM } from "./constants";

interface Props {
  editingQuiz?: QuizItem | null;
  onCancelEdit?: () => void;
}

export function QuizRegistration({ editingQuiz, onCancelEdit }: Props = {}) {
  const currentSiteId = useAuthStore((s) => s.currentSiteId);
  const { toast } = useToast();
  const [quizForm, setQuizForm] = useState<QuizFormState>(INITIAL_QUIZ_FORM);
  const createQuizMutation = useCreateQuiz();
  const updateQuizMutation = useUpdateQuiz();

  useEffect(() => {
    if (editingQuiz) {
      setQuizForm({
        title: editingQuiz.title,
        description: editingQuiz.description || "",
        status: editingQuiz.status,
        pointsReward: String(editingQuiz.pointsReward || 0),
        passingScore: String(editingQuiz.passingScore || 70),
        timeLimitMinutes: editingQuiz.timeLimitMinutes
          ? String(editingQuiz.timeLimitMinutes)
          : "",
      });
    } else {
      setQuizForm(INITIAL_QUIZ_FORM);
    }
  }, [editingQuiz]);
  const onSubmitQuiz = async () => {
    if (!currentSiteId || !quizForm.title) return;
    try {
      if (editingQuiz) {
        await updateQuizMutation.mutateAsync({
          id: editingQuiz.id,
          data: {
            title: quizForm.title,
            description: quizForm.description || undefined,
            status: quizForm.status,
            pointsReward: Number(quizForm.pointsReward || 0),
            passingScore: Number(quizForm.passingScore || 70),
            timeLimitMinutes: quizForm.timeLimitMinutes
              ? Number(quizForm.timeLimitMinutes)
              : undefined,
          },
        });
        toast({ description: "퀴즈가 수정되었습니다." });
        onCancelEdit?.();
      } else {
        await createQuizMutation.mutateAsync({
          siteId: currentSiteId,
          title: quizForm.title,
          description: quizForm.description || undefined,
          status: quizForm.status,
          pointsReward: Number(quizForm.pointsReward || 0),
          passingScore: Number(quizForm.passingScore || 70),
          timeLimitMinutes: quizForm.timeLimitMinutes
            ? Number(quizForm.timeLimitMinutes)
            : undefined,
        });
        toast({ description: "퀴즈가 등록되었습니다." });
        setQuizForm(INITIAL_QUIZ_FORM);
      }
    } catch (error) {
      toast({ variant: "destructive", description: getErrorMessage(error) });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editingQuiz ? "퀴즈 수정" : "퀴즈 등록"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="퀴즈 제목"
          value={quizForm.title}
          onChange={(e) =>
            setQuizForm((prev) => ({ ...prev, title: e.target.value }))
          }
        />
        <textarea
          className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="설명"
          value={quizForm.description}
          onChange={(e) =>
            setQuizForm((prev) => ({
              ...prev,
              description: e.target.value,
            }))
          }
        />
        <div className="grid gap-3 md:grid-cols-4">
          <Select
            value={quizForm.status}
            onValueChange={(value) =>
              setQuizForm((prev) => ({
                ...prev,
                status: value as CreateQuizInput["status"],
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">초안</SelectItem>
              <SelectItem value="PUBLISHED">게시</SelectItem>
              <SelectItem value="ARCHIVED">보관</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="보상 포인트"
            value={quizForm.pointsReward}
            onChange={(e) =>
              setQuizForm((prev) => ({
                ...prev,
                pointsReward: e.target.value,
              }))
            }
          />
          <Input
            type="number"
            placeholder="통과 점수"
            value={quizForm.passingScore}
            onChange={(e) =>
              setQuizForm((prev) => ({
                ...prev,
                passingScore: e.target.value,
              }))
            }
          />
          <Input
            type="number"
            placeholder="제한 시간(분)"
            value={quizForm.timeLimitMinutes}
            onChange={(e) =>
              setQuizForm((prev) => ({
                ...prev,
                timeLimitMinutes: e.target.value,
              }))
            }
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={onSubmitQuiz}
            disabled={
              !currentSiteId ||
              !quizForm.title ||
              createQuizMutation.isPending ||
              updateQuizMutation.isPending
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            {editingQuiz ? "퀴즈 수정" : "퀴즈 등록"}
          </Button>
          {editingQuiz && (
            <Button type="button" variant="outline" onClick={onCancelEdit}>
              취소
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { useEffect } from "react";
