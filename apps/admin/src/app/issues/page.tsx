"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useIssues,
  useCreateIssue,
  useIssueTemplates,
} from "@/hooks/use-issues-api";
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
import type { IssueTemplate } from "./issue-template";
import { buildIssueBody } from "./issue-template";

function getDefaultFieldValues(
  template: IssueTemplate,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of template.fields) {
    if (field.type === "dropdown" && field.options?.length) {
      values[field.id] = field.options[0];
    } else {
      values[field.id] = "";
    }
  }
  return values;
}

export default function IssuesPage() {
  const [stateFilter, setStateFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
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
  const { data: templates, isLoading: templatesLoading } = useIssueTemplates();
  const { toast } = useToast();

  const selectedTemplate = useMemo(
    () => templates?.find((t) => t.slug === selectedSlug),
    [templates, selectedSlug],
  );

  // Auto-select first template on load
  useEffect(() => {
    if (templates?.length && !selectedSlug) {
      setSelectedSlug(templates[0].slug);
      setFieldValues(getDefaultFieldValues(templates[0]));
    }
  }, [templates, selectedSlug]);

  const handleTemplateChange = (slug: string) => {
    setSelectedSlug(slug);
    const tpl = templates?.find((t) => t.slug === slug);
    if (tpl) setFieldValues(getDefaultFieldValues(tpl));
  };

  const handleFieldChange = (id: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [id]: value }));
  };

  const submitDisabled = useMemo(() => {
    if (createIssue.isPending || !title.trim() || !selectedTemplate)
      return true;
    return selectedTemplate.fields.some(
      (f) => f.required && !fieldValues[f.id]?.trim(),
    );
  }, [createIssue.isPending, title, selectedTemplate, fieldValues]);

  const errorMessage =
    error instanceof Error ? error.message : "이슈를 불러오지 못했습니다.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitDisabled || !selectedTemplate) return;

    try {
      const formattedBody = buildIssueBody(
        selectedTemplate.fields,
        fieldValues,
      );
      const labels = [...selectedTemplate.labels];

      await createIssue.mutateAsync({
        title: title.trim(),
        body: formattedBody,
        labels,
        assignCodex,
      });

      toast({ description: "이슈가 등록되었습니다." });
      setTitle("");
      setFieldValues(getDefaultFieldValues(selectedTemplate));
      setAssignCodex(true);
      setDialogOpen(false);
    } catch (err) {
      toast({
        variant: "destructive",
        description:
          err instanceof Error ? err.message : "이슈 등록에 실패했습니다.",
      });
    }
  };

  const dropdownFields =
    selectedTemplate?.fields.filter((f) => f.type === "dropdown") ?? [];
  const textareaFields =
    selectedTemplate?.fields.filter((f) => f.type === "textarea") ?? [];

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
                {templatesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    템플릿 로딩 중...
                  </div>
                ) : (
                  <Select
                    value={selectedSlug}
                    onValueChange={handleTemplateChange}
                  >
                    <SelectTrigger className="[&>span]:truncate">
                      <SelectValue placeholder="템플릿 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates?.map((t) => (
                        <SelectItem key={t.slug} value={t.slug}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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

              {selectedTemplate && (
                <>
                  {dropdownFields.length > 0 && (
                    <div className="flex gap-4">
                      {dropdownFields.map((field) => (
                        <div key={field.id} className="space-y-2 flex-1">
                          <label className="text-sm font-medium">
                            {field.label}
                          </label>
                          <Select
                            value={fieldValues[field.id] || ""}
                            onValueChange={(v) =>
                              handleFieldChange(field.id, v)
                            }
                          >
                            <SelectTrigger className="[&>span]:truncate">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map((o) => (
                                <SelectItem key={o} value={o}>
                                  {o}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  )}
                  {textareaFields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <label htmlFor={field.id} className="text-sm font-medium">
                        {field.label}
                        {!field.required && (
                          <span className="ml-1 text-xs text-muted-foreground font-normal">
                            (선택)
                          </span>
                        )}
                      </label>
                      {field.description && (
                        <p className="text-xs text-muted-foreground">
                          {field.description}
                        </p>
                      )}
                      <textarea
                        id={field.id}
                        placeholder={field.placeholder}
                        value={fieldValues[field.id] || ""}
                        onChange={(e) =>
                          handleFieldChange(field.id, e.target.value)
                        }
                        rows={field.required ? 3 : 2}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        required={field.required}
                      />
                    </div>
                  ))}
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
