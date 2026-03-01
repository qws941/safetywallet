"use client";

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@safetywallet/ui";
import type { QuestionFormState } from "../education-types";
import { QUESTION_TYPE_OPTIONS } from "./constants";
import { createMultiOption } from "./utils";
import type { QuestionType, MultiOption } from "./types";

interface Props {
  questionForm: QuestionFormState;
  setQuestionForm: React.Dispatch<React.SetStateAction<QuestionFormState>>;
  multiOptions: MultiOption[];
  setMultiOptions: React.Dispatch<React.SetStateAction<MultiOption[]>>;
  multiCorrectAnswers: number[];
  setMultiCorrectAnswers: React.Dispatch<React.SetStateAction<number[]>>;
  editingQuestionId: string | null;
  onSubmitQuestion: () => void;
  resetQuestionForm: () => void;
}

export function QuestionForm({
  questionForm,
  setQuestionForm,
  multiOptions,
  setMultiOptions,
  multiCorrectAnswers,
  setMultiCorrectAnswers,
  editingQuestionId,
  onSubmitQuestion,
  resetQuestionForm,
}: Props) {
  return (
    <>
      <textarea
        className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        placeholder="문항"
        value={questionForm.question}
        onChange={(e) =>
          setQuestionForm((prev) => ({
            ...prev,
            question: e.target.value,
          }))
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        <Select
          value={questionForm.questionType}
          onValueChange={(value) => {
            const nextType = value as QuestionType;
            setQuestionForm((prev) => ({
              ...prev,
              questionType: nextType,
              correctAnswerText:
                nextType === "SHORT_ANSWER" ? prev.correctAnswerText : "",
            }));
            if (nextType === "MULTI_CHOICE") {
              setMultiOptions([createMultiOption(), createMultiOption()]);
              setMultiCorrectAnswers([]);
            }
            if (nextType !== "MULTI_CHOICE") {
              setMultiCorrectAnswers([]);
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="문항 유형" />
          </SelectTrigger>
          <SelectContent>
            {QUESTION_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="해설"
          value={questionForm.explanation}
          onChange={(e) =>
            setQuestionForm((prev) => ({
              ...prev,
              explanation: e.target.value,
            }))
          }
        />
      </div>

      {questionForm.questionType === "SINGLE_CHOICE" && (
        <>
          <div className="grid gap-2 md:grid-cols-2">
            {(["option1", "option2", "option3", "option4"] as const).map(
              (key, idx) => (
                <Input
                  key={key}
                  placeholder={`선택지 ${idx + 1}`}
                  value={questionForm[key]}
                  onChange={(e) =>
                    setQuestionForm((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                    }))
                  }
                />
              ),
            )}
          </div>
          <Select
            value={questionForm.correctAnswer}
            onValueChange={(value) =>
              setQuestionForm((prev) => ({
                ...prev,
                correctAnswer: value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="정답" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">1번</SelectItem>
              <SelectItem value="1">2번</SelectItem>
              <SelectItem value="2">3번</SelectItem>
              <SelectItem value="3">4번</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}

      {questionForm.questionType === "OX" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border p-3 text-center font-medium">
              O
            </div>
            <div className="rounded-md border p-3 text-center font-medium">
              X
            </div>
          </div>
          <Select
            value={questionForm.correctAnswer}
            onValueChange={(value) =>
              setQuestionForm((prev) => ({
                ...prev,
                correctAnswer: value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="정답" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">O (⭕)</SelectItem>
              <SelectItem value="1">X (❌)</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}

      {questionForm.questionType === "MULTI_CHOICE" && (
        <div className="space-y-2">
          <div className="text-sm font-medium">선택지</div>
          {multiOptions.map((option, optionIdx) => (
            <div key={option.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={multiCorrectAnswers.includes(optionIdx)}
                onChange={(e) => {
                  setMultiCorrectAnswers((prev) => {
                    if (e.target.checked) {
                      return [...prev, optionIdx];
                    }
                    return prev.filter((value) => value !== optionIdx);
                  });
                }}
              />
              <Input
                placeholder={`선택지 ${optionIdx + 1}`}
                value={option.value}
                onChange={(e) => {
                  const next = [...multiOptions];
                  next[optionIdx] = {
                    ...next[optionIdx],
                    value: e.target.value,
                  };
                  setMultiOptions(next);
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (multiOptions.length <= 2) return;
                  const next = multiOptions.filter(
                    (_, idx) => idx !== optionIdx,
                  );
                  setMultiOptions(next);
                  setMultiCorrectAnswers((prev) =>
                    prev
                      .filter((value) => value !== optionIdx)
                      .map((value) => (value > optionIdx ? value - 1 : value)),
                  );
                }}
              >
                제거
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setMultiOptions((prev) => [...prev, createMultiOption()])
            }
          >
            선택지 추가
          </Button>
        </div>
      )}

      {questionForm.questionType === "SHORT_ANSWER" && (
        <Input
          placeholder="정답 텍스트"
          value={questionForm.correctAnswerText}
          onChange={(e) =>
            setQuestionForm((prev) => ({
              ...prev,
              correctAnswerText: e.target.value,
            }))
          }
        />
      )}

      <div className="flex gap-2">
        <Button type="button" onClick={onSubmitQuestion}>
          {editingQuestionId ? "문항 수정" : "문항 추가"}
        </Button>
        {editingQuestionId && (
          <Button type="button" variant="outline" onClick={resetQuestionForm}>
            취소
          </Button>
        )}
      </div>
    </>
  );
}
