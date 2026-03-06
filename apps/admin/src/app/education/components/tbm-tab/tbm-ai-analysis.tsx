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
  useTbmAiAnalysis,
  useTriggerTbmAiAnalysis,
} from "@/hooks/use-tbm-ai-analysis";
import type { TbmAiAnalysisResult } from "@safetywallet/types";

interface Props {
  tbmId: string;
}

const RISK_LABELS: Record<string, { label: string; variant: string }> = {
  high: { label: "고위험", variant: "bg-red-100 text-red-700" },
  medium: { label: "중위험", variant: "bg-yellow-100 text-yellow-700" },
  low: { label: "저위험", variant: "bg-green-100 text-green-700" },
};

export function TbmAiAnalysis({ tbmId }: Props) {
  const { data, isLoading } = useTbmAiAnalysis(tbmId);
  const triggerMutation = useTriggerTbmAiAnalysis();

  const analysis = data?.analysis as TbmAiAnalysisResult | null;
  const analyzedAt = data?.analyzedAt;

  const handleAnalyze = () => {
    triggerMutation.mutate(tbmId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" />
            AI TBM 분석
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
            AI TBM 분석
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

  const risk = RISK_LABELS[analysis.riskLevel] ?? {
    label: analysis.riskLevel,
    variant: "bg-gray-100 text-gray-700",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" />
            AI TBM 분석
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
          <Badge className={risk.variant}>{risk.label}</Badge>
          <span className="ml-auto text-xs text-muted-foreground">
            신뢰도: {Math.round(analysis.confidence * 100)}%
          </span>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-1">요약</h4>
          <p className="text-sm text-muted-foreground">{analysis.summary}</p>
        </div>

        {analysis.identifiedRisks.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-1">식별된 위험요소</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
              {analysis.identifiedRisks.map((riskItem: string) => (
                <li key={riskItem}>{riskItem}</li>
              ))}
            </ul>
          </div>
        )}

        {analysis.safetyChecklist.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-1">안전 체크리스트</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
              {analysis.safetyChecklist.map((item: string) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {analysis.precautions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-1">주의사항</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
              {analysis.precautions.map((item: string) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {analysis.relatedRegulations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-1">관련 법규</h4>
            <div className="flex flex-wrap gap-1">
              {analysis.relatedRegulations.map((reg: string) => (
                <Badge key={reg} variant="secondary" className="text-xs">
                  {reg}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end text-xs text-muted-foreground pt-2 border-t">
          <span>{analysis.modelVersion}</span>
        </div>
      </CardContent>
    </Card>
  );
}
