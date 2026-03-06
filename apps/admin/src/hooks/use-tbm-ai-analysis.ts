import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { TbmAiAnalysisDto } from "@safetywallet/types";

export function useTbmAiAnalysis(tbmId: string | null) {
  const currentSiteId = useAuthStore((state) => state.currentSiteId);

  return useQuery({
    queryKey: ["admin", "education", "tbm", tbmId, "ai-analysis"],
    queryFn: () =>
      apiFetch<TbmAiAnalysisDto>(`/education/tbm/${tbmId}/ai-analysis`),
    enabled: !!tbmId && !!currentSiteId,
  });
}

export function useTriggerTbmAiAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tbmId: string) =>
      apiFetch<TbmAiAnalysisDto>(`/education/tbm/${tbmId}/analyze`, {
        method: "POST",
      }),
    onSuccess: (_data, tbmId) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "education", "tbm", tbmId, "ai-analysis"],
      });
    },
  });
}
