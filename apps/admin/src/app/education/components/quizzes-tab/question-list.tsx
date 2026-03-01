"use client";

import { Badge, Button } from "@safetywallet/ui";
import type { QuizQuestion } from "@/hooks/use-api";
import { parseMultiChoiceAnswers, getQuestionTypeLabel } from "./utils";
import type { QuestionType } from "./types";

interface Props {
  sortedQuizQuestions: QuizQuestion[];
  fillQuestionForm: (question: QuizQuestion) => void;
  onDeleteQuestion: (questionId: string) => void;
}

export function QuestionList({
  sortedQuizQuestions,
  fillQuestionForm,
  onDeleteQuestion,
}: Props) {
  return (
    <div className="space-y-2">
      {sortedQuizQuestions.map((item, idx) => {
        const itemType = (item.questionType ?? "SINGLE_CHOICE") as QuestionType;
        const correctMultiAnswers =
          itemType === "MULTI_CHOICE"
            ? parseMultiChoiceAnswers(item.correctAnswerText)
            : [];

        return (
          <div key={item.id} className="rounded-md border p-3 text-sm">
            <div className="mb-2 flex items-center gap-2">
              <div className="font-medium">
                {idx + 1}. {item.question}
              </div>
              <Badge variant="outline">{getQuestionTypeLabel(itemType)}</Badge>
            </div>

            {itemType !== "SHORT_ANSWER" && (
              <ol className="ml-5 list-decimal space-y-1 text-muted-foreground">
                {item.options.map((opt, optionIdx) => {
                  const isCorrect =
                    itemType === "MULTI_CHOICE"
                      ? correctMultiAnswers.includes(optionIdx)
                      : optionIdx === item.correctAnswer;
                  return (
                    <li
                      key={`${item.id}-${optionIdx}`}
                      className={
                        isCorrect ? "font-semibold text-foreground" : ""
                      }
                    >
                      {opt}
                    </li>
                  );
                })}
              </ol>
            )}

            {itemType === "SHORT_ANSWER" && (
              <div className="text-muted-foreground">
                정답 텍스트:{" "}
                <span className="font-semibold text-foreground">
                  {item.correctAnswerText || "-"}
                </span>
              </div>
            )}

            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fillQuestionForm(item)}
              >
                수정
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => onDeleteQuestion(item.id)}
              >
                삭제
              </Button>
            </div>
          </div>
        );
      })}
      {sortedQuizQuestions.length === 0 && (
        <p className="text-sm text-muted-foreground">등록된 문항이 없습니다.</p>
      )}
    </div>
  );
}
