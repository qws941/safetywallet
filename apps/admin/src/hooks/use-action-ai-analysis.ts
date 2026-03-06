import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

interface ActionImageAiAnalysisDto {
  aiAnalysis: unknown;
  aiAnalyzedAt: string | null;
}

interface ActionImageItem {
  id: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  imageType: "BEFORE" | "AFTER" | null;
  aiAnalysis?: unknown;
  aiAnalyzedAt?: string | null;
  createdAt: string;
}

interface ActionDetailResponse {
  data: {
    id: string;
    images: ActionImageItem[];
  };
}

export function useActionImages(actionId: string | null) {
  const currentSiteId = useAuthStore((state) => state.currentSiteId);

  return useQuery({
    queryKey: ["admin", "actions", actionId, "images"],
    queryFn: async () => {
      const response = await apiFetch<ActionDetailResponse>(
        `/actions/${actionId}`,
      );
      return response.data.images ?? [];
    },
    enabled: !!actionId && !!currentSiteId,
  });
}

export function useActionImageAiAnalysis(actionId: string, imageId: string) {
  return useQuery({
    queryKey: ["admin", "actions", actionId, "images", imageId, "ai-analysis"],
    queryFn: () =>
      apiFetch<ActionImageAiAnalysisDto>(
        `/actions/${actionId}/images/${imageId}/ai-analysis`,
      ),
    enabled: !!actionId && !!imageId,
  });
}

export function useTriggerActionImageAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      actionId,
      imageId,
    }: {
      actionId: string;
      imageId: string;
    }) =>
      apiFetch(`/actions/${actionId}/images/${imageId}/analyze`, {
        method: "POST",
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "actions"] });
      queryClient.invalidateQueries({
        queryKey: [
          "admin",
          "actions",
          variables.actionId,
          "images",
          variables.imageId,
          "ai-analysis",
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "actions", variables.actionId, "images"],
      });
    },
  });
}
