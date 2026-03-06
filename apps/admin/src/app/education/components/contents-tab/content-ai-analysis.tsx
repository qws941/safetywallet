"use client";

import { Bot, RefreshCw, Sparkles } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@safetywallet/ui";
import {
  useEducationAiAnalysis,
  useTriggerEducationAiAnalysis,
} from "@/hooks/use-education-ai-analysis";
import type { EducationAiAnalysisResult } from "@safetywallet/types";

interface Props {
  contentId: string;
  contentType: string;
}

const QUALITY_LABELS: Record<string, { label: string; variant: string }> = {
  excellent: { label: "우수", variant: "bg-green-100 text-green-700" },
  good: { label: "양호", variant: "bg-blue-100 text-blue-700" },
  adequate: { label: "보통", variant: "bg-yellow-100 text-yellow-700" },
  needs_improvement: {
    label: "개선 필요",
    variant: "bg-orange-100 text-orange-700",
  },
  poor: { label: "미흡", variant: "bg-red-100 text-red-700" },
};

const CATEGORY_LABELS: Record<string, string> = {
  safety_training: "안전교육",
  equipment_operation: "장비운용",
  emergency_response: "비상대응",
  hazard_awareness: "위험인식",
  ppe_usage: "보호구 착용",
  regulatory_compliance: "법규준수",
  health_wellness: "건강관리",
  general_safety: "일반안전",
};

export function ContentAiAnalysis({ contentId, contentType }: Props) {
  const { data, isLoading } = useEducationAiAnalysis(contentId);
  const triggerMutation = useTriggerEducationAiAnalysis();

  if (contentType === "VIDEO") return null;

  const analysis = data?.analysis as EducationAiAnalysisResult | null;
  const analyzedAt = data?.analyzedAt;

  const handleAnalyze = () => {
    triggerMutation.mutate(contentId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" />
            AI 콘텐츠 분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">분석 결과 로딩 중...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" />
            AI 콘텐츠 분석
          </CardTitle>
          <CardDescription>아직 AI 분석이 수행되지 않았습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            size="sm"
            onClick={handleAnalyze}
            disabled={triggerMutation.isPending}
          >
            {triggerMutation.isPending ? (
              <>
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                분석 중...
              </>
            ) : (
              <>
                <Sparkles className="mr-1 h-3 w-3" />
                AI 분석 시작
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const quality = QUALITY_LABELS[analysis.qualityLevel] ?? {
    label: analysis.qualityLevel,
    variant: "bg-gray-100 text-gray-700",
  };
  const category = CATEGORY_LABELS[analysis.category] ?? analysis.category;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" />
            AI 콘텐츠 분석
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAnalyze}
            disabled={triggerMutation.isPending}
          >
            {triggerMutation.isPending ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        </div>
        {analyzedAt && (
          <CardDescription>
            분석일시: {new Date(analyzedAt).toLocaleString("ko-KR")}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge className={quality.variant}>{quality.label}</Badge>
          <Badge variant="outline">{category}</Badge>
          <span className="ml-auto text-xs text-muted-foreground">
            신뢰도: {Math.round(analysis.confidence * 100)}%
          </span>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-1">요약</h4>
          <p className="text-sm text-muted-foreground">{analysis.summary}</p>
        </div>

        {analysis.keyLearningPoints.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-1">주요 학습 포인트</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
              {analysis.keyLearningPoints.map((point: string, i: number) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium mb-1">안전 관련성</h4>
          <p className="text-sm text-muted-foreground">
            {analysis.safetyRelevance}
          </p>
        </div>

        {analysis.relatedStatutoryTraining.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-1">관련 법정교육</h4>
            <div className="flex flex-wrap gap-1">
              {analysis.relatedStatutoryTraining.map((t: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {analysis.improvements.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-1">개선 제안</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
              {analysis.improvements.map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>대상: {analysis.targetAudience}</span>
          <span>{analysis.modelVersion}</span>
        </div>
      </CardContent>
    </Card>
  );
}
