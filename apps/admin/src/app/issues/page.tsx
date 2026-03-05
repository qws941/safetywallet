"use client";

import { useMemo, useState } from "react";
import { useIssues, useCreateIssue } from "@/hooks/use-issues-api";
import {
  Button,
  Input,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from "@safetywallet/ui";
import {
  Plus,
  ExternalLink,
  Bot,
  Loader2,
  CircleDot,
  CheckCircle2,
} from "lucide-react";
import {
  BUG_SEVERITY_OPTIONS,
  BUG_PRIORITY_OPTIONS,
  FEATURE_KIND_OPTIONS,
  FEATURE_PRIORITY_OPTIONS,
  TASK_AREA_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  buildIssueBody,
} from "./issue-template";
import type { TemplateType } from "./issue-template";

export default function IssuesPage() {
  const [stateFilter, setStateFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [templateType, setTemplateType] = useState<TemplateType>("bug");

  const [bugSeverity, setBugSeverity] = useState(BUG_SEVERITY_OPTIONS[1]);
  const [bugPriority, setBugPriority] = useState(BUG_PRIORITY_OPTIONS[2]);
  const [bugDescription, setBugDescription] = useState("");
  const [bugSteps, setBugSteps] = useState("");
  const [bugExpected, setBugExpected] = useState("");
  const [bugActual, setBugActual] = useState("");
  const [bugEnvironment, setBugEnvironment] = useState("");
  const [bugScreenshots, setBugScreenshots] = useState("");

  const [featureKind, setFeatureKind] = useState(FEATURE_KIND_OPTIONS[0]);
  const [featurePriority, setFeaturePriority] = useState(
    FEATURE_PRIORITY_OPTIONS[2],
  );
  const [featureSummary, setFeatureSummary] = useState("");
  const [featureMotivation, setFeatureMotivation] = useState("");
  const [featureSolution, setFeatureSolution] = useState("");
  const [featureAlternatives, setFeatureAlternatives] = useState("");
  const [featureAcceptance, setFeatureAcceptance] = useState("");

  const [taskArea, setTaskArea] = useState(TASK_AREA_OPTIONS[0]);
  const [taskPriority, setTaskPriority] = useState(TASK_PRIORITY_OPTIONS[1]);
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAcceptance, setTaskAcceptance] = useState("");
  const [taskContext, setTaskContext] = useState("");

  const resetTemplateFields = () => {
    setBugSeverity(BUG_SEVERITY_OPTIONS[1]);
    setBugPriority(BUG_PRIORITY_OPTIONS[2]);
    setBugDescription("");
    setBugSteps("");
    setBugExpected("");
    setBugActual("");
    setBugEnvironment("");
    setBugScreenshots("");

    setFeatureKind(FEATURE_KIND_OPTIONS[0]);
    setFeaturePriority(FEATURE_PRIORITY_OPTIONS[2]);
    setFeatureSummary("");
    setFeatureMotivation("");
    setFeatureSolution("");
    setFeatureAlternatives("");
    setFeatureAcceptance("");

    setTaskArea(TASK_AREA_OPTIONS[0]);
    setTaskPriority(TASK_PRIORITY_OPTIONS[1]);
    setTaskDescription("");
    setTaskAcceptance("");
    setTaskContext("");
  };

  const handleTemplateChange = (val: TemplateType) => {
    setTemplateType(val);
    resetTemplateFields();
  };
  const [assignCodex, setAssignCodex] = useState(true);

  const {
    data: issues,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useIssues(stateFilter);
  const createIssue = useCreateIssue();
  const { toast } = useToast();

  const submitDisabled = useMemo(() => {
    if (createIssue.isPending || !title.trim()) return true;

    if (templateType === "bug") {
      return (
        !bugDescription.trim() ||
        !bugSteps.trim() ||
        !bugExpected.trim() ||
        !bugActual.trim()
      );
    }
    if (templateType === "feature") {
      return !featureSummary.trim() || !featureMotivation.trim();
    }
    if (templateType === "task") {
      return !taskDescription.trim();
    }
    return true;
  }, [
    createIssue.isPending,
    title,
    templateType,
    bugDescription,
    bugSteps,
    bugExpected,
    bugActual,
    featureSummary,
    featureMotivation,
    taskDescription,
  ]);

  const errorMessage =
    error instanceof Error ? error.message : "이슈를 불러오지 못했습니다.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitDisabled) return;

    try {
      let formattedBody = "";
      let labels: string[] = [];

      if (templateType === "bug") {
        formattedBody = buildIssueBody("bug", {
          severity: bugSeverity,
          priority: bugPriority,
          description: bugDescription,
          steps: bugSteps,
          expected: bugExpected,
          actual: bugActual,
          environment: bugEnvironment,
          screenshots: bugScreenshots,
        });
        labels = ["type:bug"];
      } else if (templateType === "feature") {
        formattedBody = buildIssueBody("feature", {
          kind: featureKind,
          priority: featurePriority,
          summary: featureSummary,
          motivation: featureMotivation,
          solution: featureSolution,
          alternatives: featureAlternatives,
          acceptance: featureAcceptance,
        });
        labels = ["type:feature"];
      } else if (templateType === "task") {
        formattedBody = buildIssueBody("task", {
          area: taskArea,
          priority: taskPriority,
          description: taskDescription,
          acceptance: taskAcceptance,
          context: taskContext,
        });
        labels = ["type:task"];
      }

      await createIssue.mutateAsync({
        title: title.trim(),
        body: formattedBody,
        labels,
        assignCodex,
      });

      toast({ description: "이슈가 등록되었습니다." });
      setTitle("");
      setTemplateType("bug");
      resetTemplateFields();
      setAssignCodex(true);
      setDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        description:
          error instanceof Error ? error.message : "이슈 등록에 실패했습니다.",
      });
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">이슈 관리</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              이슈 등록
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>새 이슈 등록</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={handleSubmit}
              className="space-y-4 max-h-[70vh] overflow-y-auto px-1"
            >
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  GitHub 템플릿과 동일한 형식으로 이슈를 작성합니다.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">템플릿</label>
                <Select
                  value={templateType}
                  onValueChange={handleTemplateChange}
                >
                  <SelectTrigger className="[&>span]:truncate">
                    <SelectValue placeholder="템플릿 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">🐛 버그 리포트</SelectItem>
                    <SelectItem value="feature">✨ 기능 요청</SelectItem>
                    <SelectItem value="task">📋 작업 요청</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  제목
                </label>
                <Input
                  id="title"
                  placeholder="이슈 제목을 입력하세요"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {templateType === "bug" && (
                <>
                  <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                      <label className="text-sm font-medium">심각도</label>
                      <Select
                        value={bugSeverity}
                        onValueChange={setBugSeverity}
                      >
                        <SelectTrigger className="[&>span]:truncate">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BUG_SEVERITY_OPTIONS.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 flex-1">
                      <label className="text-sm font-medium">우선순위</label>
                      <Select
                        value={bugPriority}
                        onValueChange={setBugPriority}
                      >
                        <SelectTrigger className="[&>span]:truncate">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BUG_PRIORITY_OPTIONS.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="bugDescription"
                      className="text-sm font-medium"
                    >
                      설명
                    </label>
                    <textarea
                      id="bugDescription"
                      value={bugDescription}
                      onChange={(e) => setBugDescription(e.target.value)}
                      rows={3}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="bugSteps" className="text-sm font-medium">
                      재현 단계
                    </label>
                    <textarea
                      id="bugSteps"
                      placeholder="1. ...&#10;2. ...&#10;3. ..."
                      value={bugSteps}
                      onChange={(e) => setBugSteps(e.target.value)}
                      rows={3}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="bugExpected"
                      className="text-sm font-medium"
                    >
                      기대 동작
                    </label>
                    <textarea
                      id="bugExpected"
                      value={bugExpected}
                      onChange={(e) => setBugExpected(e.target.value)}
                      rows={2}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="bugActual" className="text-sm font-medium">
                      실제 동작
                    </label>
                    <textarea
                      id="bugActual"
                      value={bugActual}
                      onChange={(e) => setBugActual(e.target.value)}
                      rows={2}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="bugEnvironment"
                      className="text-sm font-medium"
                    >
                      환경 정보
                    </label>
                    <textarea
                      id="bugEnvironment"
                      value={bugEnvironment}
                      onChange={(e) => setBugEnvironment(e.target.value)}
                      rows={2}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="bugScreenshots"
                      className="text-sm font-medium"
                    >
                      스크린샷/로그
                    </label>
                    <textarea
                      id="bugScreenshots"
                      value={bugScreenshots}
                      onChange={(e) => setBugScreenshots(e.target.value)}
                      rows={2}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </>
              )}

              {templateType === "feature" && (
                <>
                  <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                      <label className="text-sm font-medium">유형</label>
                      <Select
                        value={featureKind}
                        onValueChange={setFeatureKind}
                      >
                        <SelectTrigger className="[&>span]:truncate">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FEATURE_KIND_OPTIONS.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 flex-1">
                      <label className="text-sm font-medium">우선순위</label>
                      <Select
                        value={featurePriority}
                        onValueChange={setFeaturePriority}
                      >
                        <SelectTrigger className="[&>span]:truncate">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FEATURE_PRIORITY_OPTIONS.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="featureSummary"
                      className="text-sm font-medium"
                    >
                      요약
                    </label>
                    <textarea
                      id="featureSummary"
                      value={featureSummary}
                      onChange={(e) => setFeatureSummary(e.target.value)}
                      rows={2}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="featureMotivation"
                      className="text-sm font-medium"
                    >
                      동기
                    </label>
                    <textarea
                      id="featureMotivation"
                      value={featureMotivation}
                      onChange={(e) => setFeatureMotivation(e.target.value)}
                      rows={3}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="featureSolution"
                      className="text-sm font-medium"
                    >
                      제안하는 해결 방법
                    </label>
                    <textarea
                      id="featureSolution"
                      value={featureSolution}
                      onChange={(e) => setFeatureSolution(e.target.value)}
                      rows={3}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="featureAlternatives"
                      className="text-sm font-medium"
                    >
                      고려한 대안
                    </label>
                    <textarea
                      id="featureAlternatives"
                      value={featureAlternatives}
                      onChange={(e) => setFeatureAlternatives(e.target.value)}
                      rows={2}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="featureAcceptance"
                      className="text-sm font-medium"
                    >
                      완료 기준
                    </label>
                    <textarea
                      id="featureAcceptance"
                      placeholder="- [ ] 기준 1&#10;- [ ] 기준 2"
                      value={featureAcceptance}
                      onChange={(e) => setFeatureAcceptance(e.target.value)}
                      rows={3}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </>
              )}

              {templateType === "task" && (
                <>
                  <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                      <label className="text-sm font-medium">관련 영역</label>
                      <Select value={taskArea} onValueChange={setTaskArea}>
                        <SelectTrigger className="[&>span]:truncate">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_AREA_OPTIONS.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 flex-1">
                      <label className="text-sm font-medium">우선순위</label>
                      <Select
                        value={taskPriority}
                        onValueChange={setTaskPriority}
                      >
                        <SelectTrigger className="[&>span]:truncate">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_PRIORITY_OPTIONS.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="taskDescription"
                      className="text-sm font-medium"
                    >
                      작업 내용
                    </label>
                    <textarea
                      id="taskDescription"
                      placeholder="예:&#10;- ○○ 엔드포인트에 페이지네이션 추가&#10;- ○○ 컴포넌트를 공통 패키지로 이동"
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      rows={4}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="taskAcceptance"
                      className="text-sm font-medium"
                    >
                      완료 기준 (선택)
                    </label>
                    <textarea
                      id="taskAcceptance"
                      placeholder="- [ ] 기준 1&#10;- [ ] 기준 2"
                      value={taskAcceptance}
                      onChange={(e) => setTaskAcceptance(e.target.value)}
                      rows={3}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="taskContext"
                      className="text-sm font-medium"
                    >
                      참고 사항 (선택)
                    </label>
                    <textarea
                      id="taskContext"
                      value={taskContext}
                      onChange={(e) => setTaskContext(e.target.value)}
                      rows={2}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="assignCodex"
                  checked={assignCodex}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAssignCodex(e.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label
                  htmlFor="assignCodex"
                  className="flex items-center gap-1.5 text-sm"
                >
                  <Bot className="h-4 w-4" />
                  Codex 자동 할당
                </label>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={submitDisabled}
              >
                {createIssue.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    등록 중...
                  </>
                ) : (
                  "이슈 등록"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-[140px] [&>span]:truncate">
            <SelectValue placeholder="전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">열린 이슈</SelectItem>
            <SelectItem value="closed">닫힌 이슈</SelectItem>
            <SelectItem value="all">전체</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <Card>
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-sm text-destructive">{errorMessage}</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => refetch()}>
                다시 시도
              </Button>
              {isFetching && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !issues?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">등록된 이슈가 없습니다</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <Card key={issue.number}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {issue.state === "open" ? (
                      <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />
                    )}
                    <div>
                      <CardTitle className="text-base">
                        <a
                          href={issue.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {issue.title}
                        </a>
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          #{issue.number}
                        </span>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {new Date(issue.created_at).toLocaleDateString("ko-KR")}{" "}
                        · {issue.user?.login}
                      </CardDescription>
                    </div>
                  </div>
                  <a
                    href={issue.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </a>
                </div>
              </CardHeader>
              {(issue.labels?.length > 0 || issue.body) && (
                <CardContent className="pt-0">
                  {issue.labels?.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {issue.labels.map((label) => (
                        <Badge
                          key={label.name}
                          variant="outline"
                          className="text-xs"
                          style={{
                            borderColor: `#${label.color}`,
                            color: `#${label.color}`,
                          }}
                        >
                          {label.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {issue.body && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {issue.body}
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
