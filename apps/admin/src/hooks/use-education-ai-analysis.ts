import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { EducationAiAnalysisDto } from "@safetywallet/types";

export function useEducationAiAnalysis(contentId: string | null) {
  const currentSiteId = useAuthStore((state) => state.currentSiteId);

  return useQuery({
    queryKey: ["admin", "education", "contents", contentId, "ai-analysis"],
    queryFn: () =>
      apiFetch<EducationAiAnalysisDto>(
        `/education/contents/${contentId}/ai-analysis`,
      ),
    enabled: !!contentId && !!currentSiteId,
  });
}

export function useTriggerEducationAiAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contentId: string) =>
      apiFetch<EducationAiAnalysisDto>(
        `/education/contents/${contentId}/analyze`,
        { method: "POST" },
      ),
    onSuccess: (_data, contentId) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "education", "contents", contentId, "ai-analysis"],
      });
    },
  });
}
