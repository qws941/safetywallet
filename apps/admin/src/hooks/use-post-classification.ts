import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

interface PostClassificationResult {
  suggestedCategory: string;
  suggestedHazardType: string | null;
  suggestedHazardSubcategory: string | null;
  suggestedRiskLevel: string;
  classificationReason: string;
  keyFindings: string[];
  confidence: number;
  modelVersion: string;
}

interface PostClassificationDto {
  aiClassification: PostClassificationResult | null;
  aiClassifiedAt: string | null;
}

interface PostDetailResponse {
  post: {
    aiClassification?: string | PostClassificationResult | null;
    aiClassifiedAt?: string | null;
  };
}

function parseClassification(
  value: string | PostClassificationResult | null | undefined,
): PostClassificationResult | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as PostClassificationResult;
    } catch {
      return null;
    }
  }

  return value;
}

export function usePostClassification(postId: string | null) {
  const currentSiteId = useAuthStore((state) => state.currentSiteId);

  return useQuery({
    queryKey: ["admin", "posts", postId, "classification"],
    queryFn: async () => {
      const res = await apiFetch<PostDetailResponse>(`/posts/${postId}`);
      return {
        aiClassification: parseClassification(res.post.aiClassification),
        aiClassifiedAt: res.post.aiClassifiedAt ?? null,
      } satisfies PostClassificationDto;
    },
    enabled: !!postId && !!currentSiteId,
  });
}

export function useTriggerPostClassification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) =>
      apiFetch<{ classification: PostClassificationResult }>(
        `/posts/${postId}/ai-classify`,
        {
          method: "POST",
        },
      ),
    onSuccess: (_data, postId) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "posts", postId, "classification"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "post", postId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "posts"],
      });
    },
  });
}
