"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./use-api-base";
import { useAuthStore } from "@/stores/auth";

interface DateRange {
  from: string;
  to: string;
  days: number;
}

export interface IssueTriageItem {
  id: string;
  siteId: string;
  createdAt: string | null;
  category: string;
  riskLevel: string;
  reviewStatus: string;
  actionStatus: string;
  isUrgent: boolean;
  score: number;
  reasons: string[];
  preview: string;
}

export interface IssueTriageResponse {
  range: DateRange;
  summary: {
    candidateCount: number;
    pendingCount: number;
    urgentCount: number;
  };
  items: IssueTriageItem[];
}

export interface ReviewCopilotResponse {
  range: DateRange;
  pendingCount: number;
  categoryTop: Array<{ category: string; count: number }>;
  reviewActivity: Array<{ action: string; count: number }>;
  reviewCopilot: {
    recommendedFocus: string;
    suggestedChecklist: string[];
    overview: string[];
  };
}

export interface DuplicateCandidate {
  sourcePostId: string;
  targetPostId: string;
  similarity: number;
  reason: string;
  sourcePreview: string;
  targetPreview: string;
  sourceCreatedAt: string | null;
  targetCreatedAt: string | null;
}

export interface DuplicateResponse {
  range: DateRange;
  summary: {
    scannedPosts: number;
    candidatePairs: number;
    existingDuplicateFlags: number;
  };
  candidates: DuplicateCandidate[];
}

export interface PolicyQueryResponse {
  question: string;
  answer: string[];
  policyMatches: Array<{
    reasonCode: string;
    name: string;
    defaultAmount: number;
    minAmount: number | null;
    maxAmount: number | null;
    dailyLimit: number | null;
    monthlyLimit: number | null;
    isActive: boolean;
  }>;
}

export interface SummaryReportResponse {
  range: DateRange;
  kpi: {
    totalPosts: number;
    pendingPosts: number;
    urgentPosts: number;
    reviewsProcessed: number;
    pointTransactions: number;
    totalPointAmount: number;
  };
  summaryReport: string[];
}

export interface AnomalyResponse {
  range: DateRange;
  baseline: {
    avgAttendance: number;
    avgPointAmount: number;
    avgReviewCount: number;
  };
  anomalies: Array<{
    type: "attendance" | "points" | "review";
    day: string;
    value: number;
    baseline: number;
    deviationRate: number;
    message: string;
  }>;
}

function useSiteId() {
  return useAuthStore((state) => state.currentSiteId);
}

function withSite(basePath: string, siteId?: string | null) {
  const params = new URLSearchParams();
  if (siteId) {
    params.set("siteId", siteId);
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function useIssueTriage(days = 7, limit = 20) {
  const siteId = useSiteId();

  return useQuery({
    queryKey: ["admin", "ai-insights", "issue-triage", siteId, days, limit],
    queryFn: () =>
      apiFetch<IssueTriageResponse>(
        `${withSite("/admin/ai-insights/issue-triage", siteId)}${siteId ? "&" : "?"}days=${days}&limit=${limit}`,
      ),
    enabled: !!siteId,
    refetchInterval: 60_000,
  });
}

export function useReviewCopilot(days = 7) {
  const siteId = useSiteId();

  return useQuery({
    queryKey: ["admin", "ai-insights", "review-copilot", siteId, days],
    queryFn: () =>
      apiFetch<ReviewCopilotResponse>(
        `${withSite("/admin/ai-insights/review-copilot", siteId)}${siteId ? "&" : "?"}days=${days}`,
      ),
    enabled: !!siteId,
    refetchInterval: 60_000,
  });
}

export function useDuplicateRecommendations(days = 14, limit = 20) {
  const siteId = useSiteId();

  return useQuery({
    queryKey: ["admin", "ai-insights", "duplicates", siteId, days, limit],
    queryFn: () =>
      apiFetch<DuplicateResponse>(
        `${withSite("/admin/ai-insights/duplicates", siteId)}${siteId ? "&" : "?"}days=${days}&limit=${limit}`,
      ),
    enabled: !!siteId,
    refetchInterval: 60_000,
  });
}

export function useSummaryReport(days = 7) {
  const siteId = useSiteId();

  return useQuery({
    queryKey: ["admin", "ai-insights", "summary-report", siteId, days],
    queryFn: () =>
      apiFetch<SummaryReportResponse>(
        `${withSite("/admin/ai-insights/summary-report", siteId)}${siteId ? "&" : "?"}days=${days}`,
      ),
    enabled: !!siteId,
    refetchInterval: 60_000,
  });
}

export function useAnomalyInsights(days = 14) {
  const siteId = useSiteId();

  return useQuery({
    queryKey: ["admin", "ai-insights", "anomalies", siteId, days],
    queryFn: () =>
      apiFetch<AnomalyResponse>(
        `${withSite("/admin/ai-insights/anomalies", siteId)}${siteId ? "&" : "?"}days=${days}`,
      ),
    enabled: !!siteId,
    refetchInterval: 60_000,
  });
}

export function usePolicyQuery(question: string) {
  const siteId = useSiteId();
  const normalized = question.trim();

  return useQuery({
    queryKey: ["admin", "ai-insights", "policy-query", siteId, normalized],
    queryFn: () => {
      const params = new URLSearchParams();
      if (siteId) {
        params.set("siteId", siteId);
      }
      params.set("question", normalized);
      return apiFetch<PolicyQueryResponse>(
        `/admin/ai-insights/policy-query?${params.toString()}`,
      );
    },
    enabled: !!siteId && normalized.length > 1,
    staleTime: 10_000,
  });
}
