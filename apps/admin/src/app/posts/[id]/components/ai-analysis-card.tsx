"use client";

import { Card, Badge, Skeleton } from "@safetywallet/ui";
import {
  Brain,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { usePostAiAnalysis } from "@/hooks/use-ai-analysis";

const severityConfig: Record<string, { label: string; className: string }> = {
  critical: {
    label: "심각",
    className: "bg-red-600 text-white hover:bg-red-600/90",
  },
  high: {
    label: "높음",
    className: "bg-red-100 text-red-800 hover:bg-red-100/80",
  },
  medium: {
    label: "보통",
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80",
  },
  low: {
    label: "낮음",
    className: "bg-green-100 text-green-800 hover:bg-green-100/80",
  },
};

const hazardTypeLabels: Record<string, string> = {
  fall_hazard: "추락 위험",
  electrical: "전기 위험",
  chemical: "화학물질 위험",
  fire: "화재 위험",
  confined_space: "밀폐공간 위험",
  ppe_violation: "보호구 미착용",
  structural: "구조물 위험",
  machinery: "기계 위험",
  general: "일반 위험",
  ergonomic: "인체공학 위험",
  environmental: "환경 위험",
  vehicle: "차량 위험",
  noise: "소음 위험",
  biological: "생물학적 위험",
};

interface AiAnalysisCardProps {
  postId: string;
}

export function AiAnalysisCard({ postId }: AiAnalysisCardProps) {
  const { data, isLoading, error } = usePostAiAnalysis(postId);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[80%]" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    );
  }

  if (error || !data || !data.analyses || data.analyses.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6 border-b pb-4">
        <Brain className="w-5 h-5 text-primary" />
        <h3 className="font-medium text-lg">🤖 AI 위험 분석</h3>
      </div>

      <div className="space-y-8">
        {data.analyses.map((item, index) => {
          const { analysis } = item;
          const severity = severityConfig[analysis.severity] || {
            label: analysis.severity,
            className: "bg-slate-100 text-slate-800 hover:bg-slate-200",
          };
          const hazardType =
            hazardTypeLabels[analysis.hazardType] || analysis.hazardType;

          return (
            <div
              key={index}
              className="space-y-5 pb-8 border-b last:border-0 last:pb-0"
            >
              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={severity.className} variant="secondary">
                  <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
                  {severity.label}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-primary/20 text-primary"
                >
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                  {hazardType}
                </Badge>
                {item.filename && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {item.filename}
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-sm leading-relaxed text-foreground">
                {analysis.description}
              </p>

              {/* Detected Objects */}
              {analysis.detectedObjects &&
                analysis.detectedObjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {analysis.detectedObjects.map((obj, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-xs font-normal"
                      >
                        {obj}
                      </Badge>
                    ))}
                  </div>
                )}

              {/* Recommendations */}
              {analysis.recommendations &&
                analysis.recommendations.length > 0 && (
                  <div className="bg-muted/40 rounded-lg p-4 space-y-3 mt-4">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      권장 안전 조치
                    </h4>
                    <ul className="space-y-2.5">
                      {analysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start text-sm gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                          <span className="text-muted-foreground leading-snug">
                            {rec}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Related Regulations */}
              {analysis.relatedRegulations &&
                analysis.relatedRegulations.length > 0 && (
                  <div className="flex items-start gap-2.5 mt-4 text-sm text-muted-foreground bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900/50">
                    <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-blue-900 dark:text-blue-300 block mb-1.5">
                        관련 규정
                      </span>
                      <ul className="list-disc list-inside space-y-1">
                        {analysis.relatedRegulations.map((reg, i) => (
                          <li
                            key={i}
                            className="text-blue-800/80 dark:text-blue-300/80"
                          >
                            {reg}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

              {/* Footer: Confidence & Model */}
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-dashed">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">
                    신뢰도
                  </span>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500 ease-in-out"
                      style={{
                        width: `${Math.round(analysis.confidence * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {Math.round(analysis.confidence * 100)}%
                  </span>
                </div>
                {analysis.modelVersion && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {analysis.modelVersion}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
