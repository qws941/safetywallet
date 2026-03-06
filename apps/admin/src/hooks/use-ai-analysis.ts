import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

export interface AiAnalysis {
  imageUrl: string;
  filename: string;
  analysis: {
    hazardType: string;
    severity: string;
    description: string;
    recommendations: string[];
    detectedObjects: string[];
    confidence: number;
    relatedRegulations: string[];
    modelVersion: string;
  };
}

export interface AiAnalysisResponse {
  analyses: AiAnalysis[];
}

export function usePostAiAnalysis(postId: string) {
  const currentSiteId = useAuthStore((state) => state.currentSiteId);

  return useQuery({
    queryKey: ["admin", "posts", postId, "ai-analysis"],
    queryFn: () =>
      apiFetch<AiAnalysisResponse>(
        `/admin/images/ai-analysis-by-post/${postId}`,
      ),
    enabled: !!postId && !!currentSiteId,
  });
}
