import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./use-api-base";

interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: string;
  labels: { name: string; color: string }[];
  created_at: string;
  updated_at: string;
  html_url: string;
  user: { login: string; avatar_url: string };
}

interface CreateIssueInput {
  title: string;
  body?: string;
  labels?: string[];
  assignCodex?: boolean;
}

export function useIssues(state: string = "open") {
  return useQuery({
    queryKey: ["admin", "issues", state],
    queryFn: async () => {
      const res = await apiFetch(`/admin/issues?state=${state}&per_page=50`);
      const data = (await res.json()) as {
        success: boolean;
        data: GitHubIssue[];
      };
      if (!data.success) throw new Error("Failed to fetch issues");
      return data.data;
    },
  });
}

export function useCreateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateIssueInput) => {
      const res = await apiFetch("/admin/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as {
        success: boolean;
        data: GitHubIssue;
      };
      if (!data.success) throw new Error("Failed to create issue");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "issues"] });
    },
  });
}
