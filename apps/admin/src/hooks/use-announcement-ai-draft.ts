import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface AnnouncementDraftResponse {
  title: string;
  content: string;
}

export function useGenerateAnnouncementDraft() {
  return useMutation({
    mutationFn: ({ keywords, siteId }: { keywords: string; siteId: string }) =>
      apiFetch<AnnouncementDraftResponse>("/announcements/generate-draft", {
        method: "POST",
        body: JSON.stringify({ keywords, siteId }),
      }),
  });
}
