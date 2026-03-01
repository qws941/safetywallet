"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  useToast,
} from "@safetywallet/ui";
import {
  useCreateQuizQuestion,
  useDeleteQuizQuestion,
  useUpdateQuizQuestion,
  type CreateQuizQuestionInput,
  type QuizQuestion,
} from "@/hooks/use-api";
import { getErrorMessage } from "../../education-helpers";
import type { QuestionFormState, QuizDetail } from "../education-types";
import { INITIAL_QUESTION_FORM } from "./constants";
import { createMultiOption, parseMultiChoiceAnswers } from "./utils";
import type { QuestionType, MultiOption } from "./types";
import { QuestionForm } from "./question-form";
import { QuestionList } from "./question-list";

interface Props {
  expandedQuizId: string;
  typedQuizDetail: QuizDetail;
}

export function QuestionManagement({ expandedQuizId, typedQuizDetail }: Props) {
  const { toast } = useToast();

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null,
  );
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(
    INITIAL_QUESTION_FORM,
  );
  const [multiOptions, setMultiOptions] = useState<MultiOption[]>(() => [
    createMultiOption(),
    createMultiOption(),
  ]);
  const [multiCorrectAnswers, setMultiCorrectAnswers] = useState<number[]>([]);

  const createQuestionMutation = useCreateQuizQuestion();
  const updateQuestionMutation = useUpdateQuizQuestion();
  const deleteQuestionMutation = useDeleteQuizQuestion();

  const sortedQuizQuestions = useMemo(() => {
    if (!typedQuizDetail?.questions) return [];
    return [...typedQuizDetail.questions].sort(
      (a, b) => a.orderIndex - b.orderIndex,
    );
  }, [typedQuizDetail?.questions]);

  const resetQuestionForm = () => {
    setEditingQuestionId(null);
    setQuestionForm(INITIAL_QUESTION_FORM);
    setMultiOptions([createMultiOption(), createMultiOption()]);
    setMultiCorrectAnswers([]);
  };

  const fillQuestionForm = (question: QuizQuestion) => {
    const questionType = (question.questionType ??
      "SINGLE_CHOICE") as QuestionType;
    setEditingQuestionId(question.id);
    setQuestionForm({
      question: question.question,
      questionType,
      option1: question.options[0] || "",
      option2: question.options[1] || "",
      option3: question.options[2] || "",
      option4: question.options[3] || "",
      correctAnswer: String(question.correctAnswer ?? 0),
      correctAnswerText: question.correctAnswerText || "",
      explanation: question.explanation || "",
    });

    if (questionType === "MULTI_CHOICE") {
      setMultiOptions(
        question.options.length > 0
          ? question.options.map((option) => createMultiOption(option))
          : [createMultiOption(), createMultiOption()],
      );
      setMultiCorrectAnswers(
        parseMultiChoiceAnswers(question.correctAnswerText),
      );
    } else {
      setMultiOptions([createMultiOption(), createMultiOption()]);
      setMultiCorrectAnswers([]);
    }
  };

  const onSubmitQuestion = async () => {
    if (!expandedQuizId || !questionForm.question.trim()) return;

    const questionType = questionForm.questionType;
    let options: string[] = [];
    let correctAnswer = 0;
    let correctAnswerText: string | undefined;

    if (questionType === "SINGLE_CHOICE") {
      options = [
        questionForm.option1,
        questionForm.option2,
        questionForm.option3,
        questionForm.option4,
      ].filter((value) => value.trim().length > 0);

      if (options.length < 2) {
        toast({
          variant: "destructive",
          description: "선택지는 최소 2개 이상 입력해야 합니다.",
        });
        return;
      }

      const selected = Number(questionForm.correctAnswer);
      if (
        !Number.isInteger(selected) ||
        selected < 0 ||
        selected >= options.length
      ) {
        toast({
          variant: "destructive",
          description: "정답을 올바르게 선택해 주세요.",
        });
        return;
      }

      correctAnswer = selected;
    }

    if (questionType === "OX") {
      options = ["O", "X"];
      const selected = Number(questionForm.correctAnswer);
      if (selected !== 0 && selected !== 1) {
        toast({
          variant: "destructive",
          description: "OX 정답을 선택해 주세요.",
        });
        return;
      }
      correctAnswer = selected;
    }

    if (questionType === "MULTI_CHOICE") {
      options = multiOptions
        .map((option) => option.value)
        .filter((value) => value.trim().length > 0);

      if (options.length < 2) {
        toast({
          variant: "destructive",
          description: "복수 선택 문항은 선택지가 최소 2개 필요합니다.",
        });
        return;
      }

      const selectedIndexes = Array.from(new Set(multiCorrectAnswers)).sort(
        (a, b) => a - b,
      );
      if (selectedIndexes.length === 0) {
        toast({
          variant: "destructive",
          description: "복수 선택 문항의 정답을 1개 이상 선택해 주세요.",
        });
        return;
      }

      const hasOutOfRange = selectedIndexes.some(
        (index) => index >= options.length,
      );
      if (hasOutOfRange) {
        toast({
          variant: "destructive",
          description: "정답 선택이 선택지 범위를 벗어났습니다.",
        });
        return;
      }

      correctAnswer = selectedIndexes[0];
      correctAnswerText = JSON.stringify(selectedIndexes);
    }

    if (questionType === "SHORT_ANSWER") {
      const answerText = questionForm.correctAnswerText.trim();
      if (!answerText) {
        toast({
          variant: "destructive",
          description: "정답 텍스트를 입력해 주세요.",
        });
        return;
      }
      options = [];
      correctAnswer = 0;
      correctAnswerText = answerText;
    }

    const editingQuestion = sortedQuizQuestions.find(
      (item) => item.id === editingQuestionId,
    );

    const payload: CreateQuizQuestionInput = {
      question: questionForm.question,
      questionType,
      options,
      correctAnswer,
      correctAnswerText,
      explanation: questionForm.explanation || undefined,
      orderIndex: editingQuestion
        ? editingQuestion.orderIndex
        : sortedQuizQuestions.length,
    };

    try {
      if (editingQuestionId) {
        await updateQuestionMutation.mutateAsync({
          quizId: expandedQuizId,
          questionId: editingQuestionId,
          data: payload,
        });
        toast({ description: "문항이 수정되었습니다." });
      } else {
        await createQuestionMutation.mutateAsync({
          quizId: expandedQuizId,
          data: payload,
        });
        toast({ description: "문항이 등록되었습니다." });
      }
      resetQuestionForm();
    } catch (error) {
      toast({ variant: "destructive", description: getErrorMessage(error) });
    }
  };

  const onDeleteQuestion = async (questionId: string) => {
    if (!expandedQuizId) return;
    try {
      await deleteQuestionMutation.mutateAsync({
        quizId: expandedQuizId,
        questionId,
      });
      toast({ description: "문항이 삭제되었습니다." });
      if (editingQuestionId === questionId) {
        resetQuestionForm();
      }
    } catch (error) {
      toast({ variant: "destructive", description: getErrorMessage(error) });
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">
          문항 관리 - {typedQuizDetail.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <QuestionForm
          questionForm={questionForm}
          setQuestionForm={setQuestionForm}
          multiOptions={multiOptions}
          setMultiOptions={setMultiOptions}
          multiCorrectAnswers={multiCorrectAnswers}
          setMultiCorrectAnswers={setMultiCorrectAnswers}
          editingQuestionId={editingQuestionId}
          onSubmitQuestion={onSubmitQuestion}
          resetQuestionForm={resetQuestionForm}
        />
        <QuestionList
          sortedQuizQuestions={sortedQuizQuestions}
          fillQuestionForm={fillQuestionForm}
          onDeleteQuestion={onDeleteQuestion}
        />
      </CardContent>
    </Card>
  );
}
