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

type QuestionType = "SINGLE_CHOICE" | "OX" | "MULTI_CHOICE" | "SHORT_ANSWER";
type AnswerValue = number | number[] | string;

const getQuestionType = (value: string | undefined): QuestionType => {
  if (
    value === "SINGLE_CHOICE" ||
    value === "OX" ||
    value === "MULTI_CHOICE" ||
    value === "SHORT_ANSWER"
  ) {
    return value;
  }
  return "SINGLE_CHOICE";
};

const getQuestionTypeLabel = (type: QuestionType): string => {
  if (type === "OX") return "OX 퀴즈";
  if (type === "MULTI_CHOICE") return "복수 선택";
  if (type === "SHORT_ANSWER") return "주관식";
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
    <div className="min-h-screen bg-gray-50 pb-nav">
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
  } | null>(null);

  // If already passed, show result state by default
  useEffect(() => {
    if (attempts && attempts.length > 0) {
      const passedAttempt = attempts.find((a) => a.passed);
      if (passedAttempt) {
        setShowResult(true);
        setLastResult({ score: passedAttempt.score, passed: true });
      }
    }
  }, [attempts]);

  if (isQuizLoading || isAttemptsLoading) {
    return <LoadingState />;
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 pb-nav">
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
          });
          setShowResult(true);
          toast({
            title: data.attempt.passed
              ? t("education.quiz.congratulations")
              : t("education.quiz.failedMessage"),
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
    return (
      <div className="min-h-screen bg-gray-50 pb-nav">
        <Header />
        <main className="p-4 flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="text-6xl mb-2">{lastResult.passed ? "🎉" : "😢"}</div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">
              {lastResult.passed
                ? t("education.quiz.passedMessage")
                : t("education.quiz.failedMessage")}
            </h2>
            <p className="text-muted-foreground">
              {t("common.score")}{" "}
              <span className="font-bold text-primary text-xl">
                {lastResult.score}
              </span>
              {t("education.quiz.scorePoints")} (
              {t("education.quiz.passingScoreLabel")} {quiz.passingScore}
              {t("education.quiz.scorePoints")})
            </p>
          </div>

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
    <div className="min-h-screen bg-gray-50 pb-nav">
      <Header />

      <main className="p-4 space-y-6">
        <div className="space-y-2">
          <h1 className="text-xl font-bold">{quiz.title}</h1>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {t("education.quiz.passingScore")} {quiz.passingScore}
              {t("education.quiz.scorePoints")}
            </Badge>
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
            <p className="text-sm text-gray-600">{quiz.description}</p>
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
                  {questionType === "SINGLE_CHOICE" &&
                    options.map((option: string, optIdx: number) => (
                      <div
                        key={`${q.id}-single-${optIdx}`}
                        role="radio"
                        aria-checked={answer === optIdx}
                        tabIndex={0}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          answer === optIdx
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                        onClick={() => handleAnswerSelect(q.id, optIdx)}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            handleAnswerSelect(q.id, optIdx);
                          }
                        }}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            answer === optIdx
                              ? "border-primary"
                              : "border-gray-400"
                          }`}
                        >
                          {answer === optIdx && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <span className="text-sm">{option}</span>
                      </div>
                    ))}

                  {questionType === "OX" && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        className={`rounded-lg border px-4 py-6 text-xl font-bold transition-colors ${
                          answer === 0
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                        onClick={() => handleAnswerSelect(q.id, 0)}
                      >
                        ⭕ O
                      </button>
                      <button
                        type="button"
                        className={`rounded-lg border px-4 py-6 text-xl font-bold transition-colors ${
                          answer === 1
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-gray-200 hover:bg-gray-50"
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
                        <div
                          key={`${q.id}-multi-${optIdx}`}
                          role="checkbox"
                          aria-checked={selected}
                          tabIndex={0}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selected
                              ? "border-primary bg-primary/5"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                          onClick={() => handleMultiChoiceToggle(q.id, optIdx)}
                          onKeyDown={(e) => {
                            if (e.key === " " || e.key === "Enter") {
                              e.preventDefault();
                              handleMultiChoiceToggle(q.id, optIdx);
                            }
                          }}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              selected
                                ? "border-primary bg-primary"
                                : "border-gray-400"
                            }`}
                          >
                            {selected && (
                              <div className="w-2 h-2 rounded-sm bg-white" />
                            )}
                          </div>
                          <span className="text-sm">{option}</span>
                        </div>
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
