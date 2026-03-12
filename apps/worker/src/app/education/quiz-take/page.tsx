"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useQuiz,
  useSubmitQuizAttempt,
  useMyQuizAttempts,
} from "@/hooks/use-api";
import { useTranslation } from "@/hooks/use-translation";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
  Button,
  useToast,
} from "@safetywallet/ui";
import { AlertCircle, CheckCircle2, Clock, RotateCcw } from "lucide-react";

type QuestionType =
  | "SINGLE_CHOICE"
  | "OX"
  | "MULTI_CHOICE"
  | "SHORT_ANSWER"
  | "IMAGE";
type AnswerValue = number | number[] | string;

const getQuestionType = (value: string | undefined): QuestionType => {
  if (
    value === "SINGLE_CHOICE" ||
    value === "OX" ||
    value === "MULTI_CHOICE" ||
    value === "SHORT_ANSWER" ||
    value === "IMAGE"
  ) {
    return value;
  }
  return "SINGLE_CHOICE";
};

const getQuestionTypeLabel = (type: QuestionType): string => {
  if (type === "OX") return "OX 퀴즈";
  if (type === "MULTI_CHOICE") return "복수 선택";
  if (type === "SHORT_ANSWER") return "주관식";
  if (type === "IMAGE") return "이미지 문제";
  return "단일 선택";
};

const parseQuestionOptions = (
  options: string | string[] | undefined,
): string[] => {
  if (Array.isArray(options)) return options;
  if (typeof options === "string") {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

function LoadingState() {
  return (
    <div className="min-h-screen bg-muted pb-nav">
      <Header />
      <main className="p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-24 w-full" />
      </main>
      <BottomNav />
    </div>
  );
}

function QuizTakeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslation();
  const quizId = searchParams.get("id") || "";
  const { data: quiz, isLoading: isQuizLoading } = useQuiz(quizId);
  const { data: attempts, isLoading: isAttemptsLoading } =
    useMyQuizAttempts(quizId);
  const { mutate: submitAttempt, isPending: isSubmitting } =
    useSubmitQuizAttempt();
  const { toast } = useToast();

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<{
    score: number;
    passed: boolean;
    answers?: AnswerValue[] | null;
  } | null>(null);

  // If there is a prior attempt, show the latest result and prefill answers
  useEffect(() => {
    if (quiz && attempts && attempts.length > 0) {
      const [latestAttempt] = attempts;
      setShowResult(true);
      setLastResult({
        score: latestAttempt.score,
        passed: latestAttempt.passed,
        answers: latestAttempt.answers ?? null,
      });

      if (latestAttempt.answers?.length) {
        const restoredAnswers: Record<string, AnswerValue> = {};
        quiz.questions.forEach((question, index) => {
          restoredAnswers[question.id] = latestAttempt.answers?.[index] ?? "";
        });
        setAnswers(restoredAnswers);
      }
    }
  }, [attempts, quiz]);

  const hasAnswerReview =
    Array.isArray(lastResult?.answers) && lastResult.answers.length > 0;

  const formatAnswerValue = (
    questionType: QuestionType,
    options: string[],
    value: AnswerValue | undefined,
  ) => {
    if (questionType === "SHORT_ANSWER") {
      return typeof value === "string" && value.trim().length > 0
        ? value
        : t("education.quiz.noAnswer");
    }

    if (questionType === "MULTI_CHOICE") {
      if (!Array.isArray(value) || value.length === 0) {
        return t("education.quiz.noAnswer");
      }

      const selectedOptions = value
        .map((optionIndex) => options[optionIndex])
        .filter(Boolean);
      return selectedOptions.length > 0
        ? selectedOptions.join(", ")
        : t("education.quiz.noAnswer");
    }

    if (typeof value !== "number") {
      return t("education.quiz.noAnswer");
    }

    if (questionType === "OX") {
      return value === 0
        ? "O"
        : value === 1
          ? "X"
          : t("education.quiz.noAnswer");
    }

    return options[value] ?? t("education.quiz.noAnswer");
  };

  if (isQuizLoading || isAttemptsLoading) {
    return <LoadingState />;
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-muted pb-nav">
        <Header />
        <main className="p-4 text-center py-12">
          <p className="text-4xl mb-4">❌</p>
          <p className="text-muted-foreground">
            {t("education.quiz.quizNotFound")}
          </p>
          <Button className="mt-4" onClick={() => router.back()}>
            {t("common.back")}
          </Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  const handleAnswerSelect = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleMultiChoiceToggle = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => {
      const existing = prev[questionId];
      const current = Array.isArray(existing) ? existing : [];
      const hasValue = current.includes(optionIndex);
      return {
        ...prev,
        [questionId]: hasValue
          ? current.filter((value) => value !== optionIndex)
          : [...current, optionIndex],
      };
    });
  };

  const handleShortAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = () => {
    const hasUnanswered = quiz.questions.some((question) => {
      const questionType = getQuestionType(question.questionType);
      const answer = answers[question.id];

      if (questionType === "MULTI_CHOICE") {
        return !Array.isArray(answer) || answer.length === 0;
      }

      if (questionType === "SHORT_ANSWER") {
        return typeof answer !== "string" || answer.trim().length === 0;
      }

      return typeof answer !== "number";
    });

    if (hasUnanswered) {
      toast({
        title: t("education.quiz.selectAllAnswers"),
        variant: "destructive",
      });
      return;
    }

    submitAttempt(
      {
        quizId,
        answers,
        questionOrder: quiz.questions.map((question) => question.id),
      },
      {
        onSuccess: (data) => {
          setLastResult({
            score: data.attempt.score,
            passed: data.attempt.passed,
            answers: data.attempt.answers ?? null,
          });
          setShowResult(true);
          if (data.attempt.answers?.length) {
            const restoredAnswers: Record<string, AnswerValue> = {};
            quiz.questions.forEach((question, index) => {
              restoredAnswers[question.id] =
                data.attempt.answers?.[index] ?? answers[question.id] ?? "";
            });
            setAnswers(restoredAnswers);
          }
          toast({
            title: data.attempt.passed
              ? t("education.quiz.status.pass")
              : t("education.quiz.status.fail"),
            description: t("education.quiz.scoreDisplay").replace(
              "${score}",
              String(data.attempt.score),
            ),
            variant: data.attempt.passed ? "default" : "destructive",
          });
        },
        onError: () => {
          toast({
            title: t("education.quiz.submitError"),
            variant: "destructive",
          });
        },
      },
    );
  };

  const resetQuiz = () => {
    setAnswers({});
    setShowResult(false);
    setLastResult(null);
  };

  if (showResult && lastResult) {
    const statusLabel = lastResult.passed
      ? t("education.quiz.status.pass")
      : t("education.quiz.status.fail");

    return (
      <div className="min-h-screen bg-muted pb-nav">
        <Header />
        <main className="p-4 flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="text-6xl mb-2">{lastResult.passed ? "🎉" : "😢"}</div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">
              <Badge
                variant={lastResult.passed ? "default" : "destructive"}
                className="px-4 py-2 text-base"
              >
                {statusLabel}
              </Badge>
            </h2>
            <p className="text-muted-foreground">
              {t("common.score")}{" "}
              <span className="font-bold text-primary text-xl">
                {lastResult.score}
              </span>
              {t("education.quiz.scorePoints")}
            </p>
          </div>

          {hasAnswerReview && (
            <div className="w-full max-w-2xl space-y-3">
              <h3 className="text-lg font-semibold text-center">
                {t("education.quiz.answersHeading")}
              </h3>
              {quiz.questions.map((question, index) => {
                const options = parseQuestionOptions(question.options);
                const questionType = getQuestionType(question.questionType);
                const answerValue = lastResult.answers?.[index];
                const answerText = formatAnswerValue(
                  questionType,
                  options,
                  answerValue,
                );
                return (
                  <Card key={question.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <span className="text-primary">Q{index + 1}.</span>
                        <span className="flex-1 break-words">
                          {question.question}
                        </span>
                        <Badge variant="outline" className="ml-1">
                          {getQuestionTypeLabel(questionType)}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                      {questionType === "IMAGE" && question.imageUrl && (
                        <img
                          src={question.imageUrl}
                          alt={`문항 이미지 ${index + 1}`}
                          className="w-full max-h-64 rounded-md border object-contain bg-background"
                        />
                      )}
                      <span className="font-medium text-foreground">
                        {t("education.quiz.answerLabel")}
                      </span>{" "}
                      <span className="text-foreground">{answerText}</span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="w-full max-w-sm space-y-3">
            {!lastResult.passed && (
              <Button className="w-full gap-2" size="lg" onClick={resetQuiz}>
                <RotateCcw className="w-4 h-4" />
                {t("education.retake")}
              </Button>
            )}
            <Button
              className="w-full"
              variant={lastResult.passed ? "default" : "outline"}
              onClick={() => router.push("/education")}
            >
              {t("education.quiz.backToListButton")}
            </Button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted pb-nav">
      <Header />

      <main className="p-4 space-y-6">
        <div className="space-y-2">
          <h1 className="text-xl font-bold break-words">{quiz.title}</h1>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="gap-1">
              <AlertCircle className="w-3 h-3" />
              {t("education.quiz.maximumLabel")} {quiz.maxAttempts}
              {t("education.attempts")}
            </Badge>
            {quiz.timeLimitMinutes && (
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                {quiz.timeLimitMinutes}
                {t("education.minutes")}
              </Badge>
            )}
          </div>
          {quiz.description && (
            <p className="text-sm text-muted-foreground break-words">
              {quiz.description}
            </p>
          )}
        </div>

        <div className="space-y-6">
          {quiz.questions.map((q, idx) => {
            const options = parseQuestionOptions(q.options);
            const questionType = getQuestionType(q.questionType);
            const answer = answers[q.id];

            return (
              <Card key={q.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex gap-2">
                    <span className="text-primary">Q{idx + 1}.</span>
                    {q.question}
                    <Badge variant="outline" className="ml-1">
                      {getQuestionTypeLabel(questionType)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {questionType === "IMAGE" && q.imageUrl && (
                    <div className="pb-2">
                      <img
                        src={q.imageUrl}
                        alt={`문항 이미지 ${idx + 1}`}
                        className="w-full max-h-80 rounded-lg border object-contain bg-background"
                      />
                    </div>
                  )}

                  {(questionType === "SINGLE_CHOICE" ||
                    questionType === "IMAGE") &&
                    options.map((option: string, optIdx: number) => {
                      const selected = answer === optIdx;
                      return (
                        <button
                          type="button"
                          key={`${q.id}-single-${optIdx}`}
                          className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                            selected
                              ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-sm"
                              : "border-border hover:bg-muted"
                          }`}
                          onClick={() => handleAnswerSelect(q.id, optIdx)}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              selected ? "border-primary" : "border-border"
                            }`}
                          >
                            {selected && (
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            )}
                          </div>
                          <span className="text-sm flex-1 break-words">
                            {option}
                          </span>
                          {selected && (
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          )}
                        </button>
                      );
                    })}

                  {questionType === "OX" && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        className={`rounded-lg border px-4 py-6 text-xl font-bold transition-colors ${
                          answer === 0
                            ? "border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/30"
                            : "border-border hover:bg-muted"
                        }`}
                        onClick={() => handleAnswerSelect(q.id, 0)}
                      >
                        ⭕ O
                      </button>
                      <button
                        type="button"
                        className={`rounded-lg border px-4 py-6 text-xl font-bold transition-colors ${
                          answer === 1
                            ? "border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/30"
                            : "border-border hover:bg-muted"
                        }`}
                        onClick={() => handleAnswerSelect(q.id, 1)}
                      >
                        ❌ X
                      </button>
                    </div>
                  )}

                  {questionType === "MULTI_CHOICE" &&
                    options.map((option: string, optIdx: number) => {
                      const selected =
                        Array.isArray(answer) && answer.includes(optIdx);
                      return (
                        <button
                          type="button"
                          key={`${q.id}-multi-${optIdx}`}
                          className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                            selected
                              ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-sm"
                              : "border-border hover:bg-muted"
                          }`}
                          onClick={() => handleMultiChoiceToggle(q.id, optIdx)}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              selected
                                ? "border-primary bg-primary"
                                : "border-border"
                            }`}
                          >
                            {selected && (
                              <div className="w-2 h-2 rounded-sm bg-background" />
                            )}
                          </div>
                          <span className="text-sm flex-1 break-words">
                            {option}
                          </span>
                          {selected && (
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          )}
                        </button>
                      );
                    })}

                  {questionType === "SHORT_ANSWER" && (
                    <input
                      type="text"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="정답을 입력해 주세요"
                      value={typeof answer === "string" ? answer : ""}
                      onChange={(event) =>
                        handleShortAnswerChange(q.id, event.target.value)
                      }
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button
          className="w-full py-6 text-lg"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? t("education.quiz.submitting")
            : t("education.quiz.submitButton")}
        </Button>
      </main>

      <BottomNav />
    </div>
  );
}

export default function QuizTakePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <QuizTakeContent />
    </Suspense>
  );
}
