"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  ClipboardCheck,
  CopyCheck,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@safetywallet/ui";
import {
  useAnomalyInsights,
  useDuplicateRecommendations,
  useIssueTriage,
  usePolicyQuery,
  useReviewCopilot,
  useSummaryReport,
} from "@/hooks/use-ai-insights-api";

export default function AiInsightsPage() {
  const [policyQuestion, setPolicyQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");

  const triageQuery = useIssueTriage(7, 10);
  const reviewCopilotQuery = useReviewCopilot(7);
  const duplicateQuery = useDuplicateRecommendations(14, 8);
  const summaryQuery = useSummaryReport(7);
  const anomalyQuery = useAnomalyInsights(14);
  const policyQuery = usePolicyQuery(submittedQuestion);

  const isLoadingAny =
    triageQuery.isLoading ||
    reviewCopilotQuery.isLoading ||
    duplicateQuery.isLoading ||
    summaryQuery.isLoading ||
    anomalyQuery.isLoading;

  const topTriage = triageQuery.data?.items.slice(0, 5) ?? [];
  const topDuplicates = duplicateQuery.data?.candidates.slice(0, 5) ?? [];
  const topAnomalies = anomalyQuery.data?.anomalies.slice(0, 5) ?? [];
  const copilotChecklist =
    reviewCopilotQuery.data?.reviewCopilot.suggestedChecklist ?? [];
  const reportLines = summaryQuery.data?.summaryReport ?? [];
  const policyAnswer = policyQuery.data?.answer ?? [];

  const kpiChips = useMemo(() => {
    if (!summaryQuery.data) {
      return [];
    }
    return [
      {
        label: "제보",
        value: `${summaryQuery.data.kpi.totalPosts.toLocaleString()}건`,
      },
      {
        label: "검토대기",
        value: `${summaryQuery.data.kpi.pendingPosts.toLocaleString()}건`,
      },
      {
        label: "긴급",
        value: `${summaryQuery.data.kpi.urgentPosts.toLocaleString()}건`,
      },
      {
        label: "포인트",
        value: `${summaryQuery.data.kpi.totalPointAmount.toLocaleString()}점`,
      },
    ];
  }, [summaryQuery.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="h-6 w-6" />
          AI 운영 인사이트
        </h1>
        <p className="mt-1 text-muted-foreground">
          이슈 분류, 리뷰 우선순위, 중복 제보, 정책 질의, 요약 보고서, 이상
          탐지를 한 화면에서 관리합니다.
        </p>
      </div>

      {isLoadingAny && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          최신 인사이트를 계산 중입니다.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpiChips.map((chip) => (
          <Card key={chip.label}>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">{chip.label}</p>
              <p className="mt-1 text-xl font-semibold">{chip.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              자동 이슈 트리아지
            </CardTitle>
            <CardDescription>
              긴급도/위험도/미조치 상태를 기반으로 우선 검토 목록을 추천합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topTriage.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                추천 항목이 없습니다.
              </p>
            ) : (
              topTriage.map((item) => (
                <div key={item.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{item.category}</Badge>
                    <Badge>{item.riskLevel}</Badge>
                    {item.isUrgent && (
                      <Badge variant="destructive">URGENT</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      점수 {item.score}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">{item.preview}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.reasons.join(" · ")}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              리뷰 코파일럿
            </CardTitle>
            <CardDescription>
              대기 제보 분포와 최근 리뷰 패턴을 기반으로 검토 가이드를
              제공합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(reviewCopilotQuery.data?.reviewCopilot.overview ?? []).map(
              (line) => (
                <p key={line} className="text-sm">
                  {line}
                </p>
              ),
            )}
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">권장 체크리스트</p>
              {copilotChecklist.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  데이터를 불러오는 중입니다.
                </p>
              ) : (
                copilotChecklist.map((line) => (
                  <p key={line} className="text-sm text-muted-foreground">
                    - {line}
                  </p>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CopyCheck className="h-4 w-4" />
              중복/유사 제보 추천
            </CardTitle>
            <CardDescription>
              동일 카테고리 제보 간 문장 유사도를 계산해 병합 후보를 제시합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topDuplicates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                중복 후보가 없습니다.
              </p>
            ) : (
              topDuplicates.map((candidate) => (
                <div
                  key={`${candidate.sourcePostId}-${candidate.targetPostId}`}
                  className="rounded-md border p-3"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      유사도 {candidate.similarity}%
                    </span>
                    <span className="text-muted-foreground">
                      {candidate.reason}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    A: {candidate.sourcePreview}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    B: {candidate.targetPreview}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              운영 정책 질의
            </CardTitle>
            <CardDescription>
              포인트 정책/출근 정책 기준으로 질의에 대한 운영 답변을 생성합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={policyQuestion}
                onChange={(e) => setPolicyQuestion(e.target.value)}
                placeholder="예: 지각 감점 정책 한도는?"
              />
              <Button
                onClick={() => setSubmittedQuestion(policyQuestion.trim())}
                disabled={!policyQuestion.trim()}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {policyQuery.isFetching && (
              <p className="text-sm text-muted-foreground">
                정책 답변 생성 중...
              </p>
            )}
            {policyAnswer.map((line) => (
              <p key={line} className="text-sm">
                {line}
              </p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>자동 요약 리포트</CardTitle>
            <CardDescription>
              최근 운영 KPI를 자연어 요약으로 정리해 인수인계/일일 보고에
              활용합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {reportLines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                요약 리포트 준비 중입니다.
              </p>
            ) : (
              reportLines.map((line) => (
                <p key={line} className="text-sm">
                  {line}
                </p>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>이상 징후 탐지</CardTitle>
            <CardDescription>
              출근/포인트/검토량에서 급증·급감 패턴을 감지합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topAnomalies.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                탐지된 이상 징후가 없습니다.
              </p>
            ) : (
              topAnomalies.map((anomaly) => (
                <div
                  key={`${anomaly.type}-${anomaly.day}`}
                  className="rounded-md border p-3"
                >
                  <div className="flex items-center justify-between text-sm">
                    <Badge variant="outline">{anomaly.type}</Badge>
                    <span className="text-muted-foreground">{anomaly.day}</span>
                  </div>
                  <p className="mt-1 text-sm">{anomaly.message}</p>
                  <p className="text-xs text-muted-foreground">
                    값 {anomaly.value} / 기준 {anomaly.baseline} (
                    {anomaly.deviationRate}% 편차)
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
