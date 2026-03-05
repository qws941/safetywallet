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

const ISSUE_TYPES = ["🐛 버그", "✨ 기능 요청", "🔧 유지보수", "📝 문서"];
const ISSUE_PRIORITIES = [
  "🔴 긴급 (P0)",
  "🟠 높음 (P1)",
  "🟡 보통 (P2)",
  "🟢 낮음 (P3)",
];

export function buildIssueBody(input: {
  type: string;
  priority: string;
  summary: string;
  description: string;
  additionalInfo?: string;
}) {
  const sanitize = (value: string) => value.trim() || "없음";

  return [
    "### 유형",
    sanitize(input.type),
    "",
    "### 우선순위",
    sanitize(input.priority),
    "",
    "### 요약",
    sanitize(input.summary),
    "",
    "### 상세 설명",
    sanitize(input.description),
    "",
    "### 추가 정보",
    sanitize(input.additionalInfo ?? ""),
  ].join("\n");
}

export default function IssuesPage() {
  const [stateFilter, setStateFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [priority, setPriority] = useState(ISSUE_PRIORITIES[2]);
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
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

  const submitDisabled = useMemo(
    () =>
      createIssue.isPending ||
      !title.trim() ||
      !summary.trim() ||
      !description.trim(),
    [createIssue.isPending, description, summary, title],
  );

  const errorMessage =
    error instanceof Error ? error.message : "이슈를 불러오지 못했습니다.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitDisabled) return;

    try {
      const formattedBody = buildIssueBody({
        type: issueType,
        priority,
        summary,
        description,
        additionalInfo,
      });

      await createIssue.mutateAsync({
        title: title.trim(),
        body: formattedBody,
        assignCodex,
      });

      toast({ description: "이슈가 등록되었습니다." });
      setTitle("");
      setIssueType(ISSUE_TYPES[0]);
      setPriority(ISSUE_PRIORITIES[2]);
      setSummary("");
      setDescription("");
      setAdditionalInfo("");
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  GitHub 템플릿과 동일한 형식으로 이슈를 작성합니다.
                </p>
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
              <div className="space-y-2">
                <label className="text-sm font-medium">유형</label>
                <Select value={issueType} onValueChange={setIssueType}>
                  <SelectTrigger>
                    <SelectValue placeholder="유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_TYPES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">우선순위</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="우선순위 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_PRIORITIES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="summary" className="text-sm font-medium">
                  요약
                </label>
                <Input
                  id="summary"
                  placeholder="이슈를 한 줄로 요약하세요"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  상세 설명
                </label>
                <textarea
                  id="description"
                  placeholder="- 현재 동작:\n- 기대 동작:\n- 재현 방법:"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setDescription(e.target.value)
                  }
                  rows={6}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="additionalInfo" className="text-sm font-medium">
                  추가 정보
                </label>
                <textarea
                  id="additionalInfo"
                  placeholder="관련 로그, 스크린샷, 환경 정보 등을 첨부하세요"
                  value={additionalInfo}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setAdditionalInfo(e.target.value)
                  }
                  rows={4}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="flex items-center space-x-2">
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
          <SelectTrigger className="w-[140px]">
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
