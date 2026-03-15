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
  usePostClassification,
  useTriggerPostClassification,
} from "@/hooks/use-post-classification";

interface PostClassificationCardProps {
  postId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  HAZARD: "위험요소",
  UNSAFE_BEHAVIOR: "불안전 행동",
  INCONVENIENCE: "불편사항",
  SUGGESTION: "개선 제안",
  BEST_PRACTICE: "모범 사례",
};

const RISK_STYLES: Record<string, { label: string; className: string }> = {
  HIGH: { label: "고위험", className: "bg-red-100 text-red-700" },
  MEDIUM: { label: "중위험", className: "bg-yellow-100 text-yellow-700" },
  LOW: { label: "저위험", className: "bg-green-100 text-green-700" },
};

const HAZARD_SUBCATEGORY_LABELS: Record<string, string> = {
  FALL: "추락",
  COLLAPSE: "붕괴",
  STRUCK_BY: "맞음",
  CAUGHT_IN: "끼임",
  ELECTROCUTION: "감전",
  FIRE: "화재",
  CHEMICAL: "화학물질",
  OTHER: "기타",
};

export function PostClassificationCard({
  postId,
}: PostClassificationCardProps) {
  const { data, isLoading } = usePostClassification(postId);
  const triggerMutation = useTriggerPostClassification();

  const classification = data?.aiClassification ?? null;
  const classifiedAt = data?.aiClassifiedAt ?? null;

  const handleClassify = () => {
    triggerMutation.mutate(postId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" />
            AI 게시글 분류
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">분류 결과 로딩 중...</p>
        </CardContent>
      </Card>
    );
  }

  if (!classification) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" />
            AI 게시글 분류
          </CardTitle>
          <CardDescription>아직 AI 분류가 수행되지 않았습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClassify}
            disabled={triggerMutation.isPending}
          >
            {triggerMutation.isPending ? (
              <>
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                분류 중...
              </>
            ) : (
              <>
                <Sparkles className="mr-1 h-3 w-3" />
                AI 분류 시작
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const categoryLabel =
    CATEGORY_LABELS[classification.suggestedCategory] ||
    classification.suggestedCategory;
  const riskStyle = RISK_STYLES[classification.suggestedRiskLevel] || {
    label: classification.suggestedRiskLevel,
    className: "bg-gray-100 text-gray-700",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" />
            AI 게시글 분류
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClassify}
            disabled={triggerMutation.isPending}
          >
            {triggerMutation.isPending ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        </div>
        {classifiedAt && (
          <CardDescription>
            분류일시: {new Date(classifiedAt).toLocaleString("ko-KR")}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{categoryLabel}</Badge>
          <Badge className={riskStyle.className}>{riskStyle.label}</Badge>
          <span className="ml-auto text-xs text-muted-foreground">
            신뢰도: {Math.round(classification.confidence * 100)}%
          </span>
        </div>

        {classification.suggestedHazardType && (
          <div>
            <h4 className="text-sm font-medium mb-1">위험유형</h4>
            <p className="text-sm text-muted-foreground">
              {classification.suggestedHazardType}
            </p>
          </div>
        )}

        {classification.suggestedHazardSubcategory && (
          <div>
            <h4 className="text-sm font-medium mb-1">위험 세부분류</h4>
            <Badge variant="outline">
              {HAZARD_SUBCATEGORY_LABELS[
                classification.suggestedHazardSubcategory
              ] || classification.suggestedHazardSubcategory}
            </Badge>
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium mb-1">분류 근거</h4>
          <p className="text-sm text-muted-foreground">
            {classification.classificationReason}
          </p>
        </div>

        {classification.keyFindings.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-1">핵심 발견사항</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
              {classification.keyFindings.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-end text-xs text-muted-foreground pt-2 border-t">
          <span>{classification.modelVersion}</span>
        </div>
      </CardContent>
    </Card>
  );
}
