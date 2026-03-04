"use client";

import { useState } from "react";
import { useIssues, useCreateIssue } from "@/hooks/use-issues-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  ExternalLink,
  Bot,
  Loader2,
  CircleDot,
  CheckCircle2,
} from "lucide-react";

export default function IssuesPage() {
  const [stateFilter, setStateFilter] = useState("open");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [assignCodex, setAssignCodex] = useState(true);

  const { data: issues, isLoading } = useIssues(stateFilter);
  const createIssue = useCreateIssue();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await createIssue.mutateAsync({
      title: title.trim(),
      body: body.trim() || undefined,
      assignCodex,
    });

    setTitle("");
    setBody("");
    setAssignCodex(true);
    setDialogOpen(false);
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
                <Label htmlFor="title">제목</Label>
                <Input
                  id="title"
                  placeholder="이슈 제목을 입력하세요"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">내용</Label>
                <Textarea
                  id="body"
                  placeholder="이슈 내용을 입력하세요"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="assignCodex"
                  checked={assignCodex}
                  onCheckedChange={(checked) =>
                    setAssignCodex(checked === true)
                  }
                />
                <Label
                  htmlFor="assignCodex"
                  className="flex items-center gap-1.5 text-sm"
                >
                  <Bot className="h-4 w-4" />
                  Codex 자동 할당
                </Label>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createIssue.isPending || !title.trim()}
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
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">열린 이슈</SelectItem>
            <SelectItem value="closed">닫힌 이슈</SelectItem>
            <SelectItem value="all">전체</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
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
