"use client";

import Image from "next/image";
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
  useActionImageAiAnalysis,
  useTriggerActionImageAnalysis,
} from "@/hooks/use-action-ai-analysis";

interface ActionImageAiAnalysisResult {
  complianceStatus:
    | "compliant"
    | "non_compliant"
    | "partial"
    | "not_applicable";
  ppeDetected: string[];
  ppeMissing: string[];
  safetyObservations: string[];
  improvementAreas: string[];
  beforeAfterComparison: string | null;
  overallAssessment: string;
  confidence: number;
  modelVersion: string;
}

interface Props {
  actionId: string;
  imageId: string;
  fileUrl: string;
  imageType: "BEFORE" | "AFTER" | null;
}

const COMPLIANCE_LABELS: Record<
  ActionImageAiAnalysisResult["complianceStatus"],
  { label: string; className: string }
> = {
  compliant: { label: "준수", className: "bg-green-100 text-green-700" },
  non_compliant: {
    label: "미준수",
    className: "bg-red-100 text-red-700",
  },
  partial: { label: "부분 준수", className: "bg-yellow-100 text-yellow-700" },
  not_applicable: {
    label: "해당 없음",
    className: "bg-gray-100 text-gray-700",
  },
};

const IMAGE_TYPE_LABELS: Record<string, string> = {
  BEFORE: "개선 전",
  AFTER: "개선 후",
};

export function ActionImageAiAnalysis({
  actionId,
  imageId,
  fileUrl,
  imageType,
}: Props) {
  const { data, isLoading } = useActionImageAiAnalysis(actionId, imageId);
  const triggerMutation = useTriggerActionImageAnalysis();

  const analysis = data?.aiAnalysis as ActionImageAiAnalysisResult | null;
  const analyzedAt = data?.aiAnalyzedAt;

  const handleAnalyze = () => {
    triggerMutation.mutate({ actionId, imageId });
  };

  const compliance = analysis
    ? COMPLIANCE_LABELS[analysis.complianceStatus]
    : undefined;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" />
            조치 사진 AI 분석
          </CardTitle>
          <div className="flex items-center gap-2">
            {imageType && (
              <Badge variant="outline">
                {IMAGE_TYPE_LABELS[imageType] ?? imageType}
              </Badge>
            )}
            <Button
              variant={analysis ? "ghost" : "default"}
              size="sm"
              onClick={handleAnalyze}
              disabled={triggerMutation.isPending}
            >
              {triggerMutation.isPending ? (
                <>
                  <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                  분석 중...
                </>
              ) : analysis ? (
                <RefreshCw className="h-3 w-3" />
              ) : (
                <>
                  <Sparkles className="mr-1 h-3 w-3" />
                  AI 분석 시작
                </>
              )}
            </Button>
          </div>
        </div>
        {analyzedAt && (
          <CardDescription>
            분석일시: {new Date(analyzedAt).toLocaleString("ko-KR")}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative w-full h-48 rounded-md overflow-hidden border bg-muted/20">
          <Image
            src={`/r2/${fileUrl}`}
            alt="조치 이미지"
            fill
            unoptimized
            className="object-contain"
          />
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground">분석 결과 로딩 중...</p>
        )}

        {!isLoading && !analysis && (
          <p className="text-sm text-muted-foreground">
            아직 AI 분석이 수행되지 않았습니다.
          </p>
        )}

        {analysis && compliance && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className={compliance.className}>{compliance.label}</Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                신뢰도: {analysis.confidence}%
              </span>
            </div>

            {analysis.ppeDetected.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1">감지된 PPE</h4>
                <div className="flex flex-wrap gap-1">
                  {analysis.ppeDetected.map((item) => (
                    <Badge key={item} variant="secondary" className="text-xs">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {analysis.ppeMissing.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1 text-red-700">
                  누락된 PPE
                </h4>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-0.5">
                  {analysis.ppeMissing.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.safetyObservations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1">안전 관찰 사항</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                  {analysis.safetyObservations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.improvementAreas.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1">개선 필요 영역</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                  {analysis.improvementAreas.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.beforeAfterComparison && (
              <div>
                <h4 className="text-sm font-medium mb-1">개선 전후 비교</h4>
                <p className="text-sm text-muted-foreground">
                  {analysis.beforeAfterComparison}
                </p>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium mb-1">종합 평가</h4>
              <p className="text-sm text-muted-foreground">
                {analysis.overallAssessment}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
              <div className="w-36 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${analysis.confidence}%` }}
                />
              </div>
              <span>{analysis.modelVersion}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
