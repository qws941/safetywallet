"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type {
  ReviewStatus,
  ReviewAction,
  RejectReason,
  Category,
} from "@safetywallet/types";

// Types
export interface Post {
  id: string;
  category: Category;
  content: string;
  riskLevel?: string;
  status: ReviewStatus;
  isUrgent: boolean;
  createdAt: string;
  author: {
    id: string;
    nameMasked: string;
  };
  site?: {
    id: string;
    name: string;
  };
}

interface Member {
  id: string;
  userId: string;
  user: {
    id: string;
    phone: string;
    nameMasked: string;
  };
  status: string;
  role: string;
  pointsBalance: number;
  joinedAt: string;
}

interface PointsEntry {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
  member: {
    user: {
      nameMasked: string;
    };
  };
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  createdAt: string;
  actor: {
    nameMasked: string;
  };
}

interface DashboardStats {
  pendingReviews: number;
  postsThisWeek: number;
  activeMembers: number;
  totalPoints: number;
  pendingCount: number;
  urgentCount: number;
  avgProcessingHours: number;
  categoryDistribution: Record<string, number>;
  todayPostsCount: number;
}

// Dashboard
export function useDashboardStats() {
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useQuery({
    queryKey: ["dashboard", "stats", siteId],
    queryFn: () => apiFetch<DashboardStats>(`/sites/${siteId}/stats`),
    enabled: !!siteId,
  });
}

// Posts
export interface PostFilters {
  siteId?: string;
  category?: Category;
  riskLevel?: string;
  reviewStatus?: ReviewStatus;
  isUrgent?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export function useAdminPosts(filters: PostFilters) {
  const currentSiteId = useAuthStore((s) => s.currentSiteId);
  const siteId = filters.siteId || currentSiteId;

  const params = new URLSearchParams();
  if (siteId) params.set("siteId", siteId);
  if (filters.category) params.set("category", filters.category);
  if (filters.riskLevel) params.set("riskLevel", filters.riskLevel);
  if (filters.reviewStatus) params.set("reviewStatus", filters.reviewStatus);
  if (filters.isUrgent) params.set("isUrgent", "true");
  if (filters.startDate)
    params.set("startDate", filters.startDate.toISOString());
  if (filters.endDate) params.set("endDate", filters.endDate.toISOString());

  return useQuery({
    queryKey: ["admin", "posts", siteId, filters],
    queryFn: () =>
      apiFetch<{ posts: Post[] }>(`/admin/posts?${params.toString()}`).then(
        (res) => res.posts,
      ),
    enabled: !!siteId,
  });
}

export function useAdminPost(postId: string) {
  return useQuery({
    queryKey: ["admin", "post", postId],
    queryFn: () => apiFetch<Post>(`/posts/${postId}`),
    enabled: !!postId,
  });
}

export function useReviewPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      action,
      reason,
      note,
    }: {
      postId: string;
      action: ReviewAction;
      reason?: RejectReason;
      note?: string;
    }) =>
      apiFetch(`/reviews`, {
        method: "POST",
        body: JSON.stringify({ postId, action, reason, note }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "posts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// Members
export function useMembers(siteId?: string) {
  const currentSiteId = useAuthStore((s) => s.currentSiteId);
  const targetSiteId = siteId || currentSiteId;

  return useQuery({
    queryKey: ["admin", "members", targetSiteId],
    queryFn: () => apiFetch<Member[]>(`/sites/${targetSiteId}/members`),
    enabled: !!targetSiteId,
  });
}

export function useMember(memberId: string) {
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useQuery({
    queryKey: ["admin", "member", siteId, memberId],
    queryFn: () => apiFetch<Member>(`/sites/${siteId}/members/${memberId}`),
    enabled: !!siteId && !!memberId,
  });
}

// Points
export function usePointsLedger() {
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useQuery({
    queryKey: ["admin", "points", siteId],
    queryFn: () => apiFetch<PointsEntry[]>(`/points/history?siteId=${siteId}`),
    enabled: !!siteId,
  });
}

export function useAwardPoints() {
  const queryClient = useQueryClient();
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useMutation({
    mutationFn: ({
      memberId,
      amount,
      reason,
    }: {
      memberId: string;
      amount: number;
      reason: string;
    }) =>
      apiFetch(`/points/award`, {
        method: "POST",
        body: JSON.stringify({ siteId, memberId, amount, reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "points"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
    },
  });
}

// Announcements
export function useAdminAnnouncements() {
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useQuery({
    queryKey: ["admin", "announcements", siteId],
    queryFn: () => apiFetch<Announcement[]>(`/announcements?siteId=${siteId}`),
    enabled: !!siteId,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useMutation({
    mutationFn: ({
      title,
      content,
      isPinned,
    }: {
      title: string;
      content: string;
      isPinned?: boolean;
    }) =>
      apiFetch(`/announcements`, {
        method: "POST",
        body: JSON.stringify({ siteId, title, content, isPinned }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
    },
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      title,
      content,
      isPinned,
    }: {
      id: string;
      title: string;
      content: string;
      isPinned?: boolean;
    }) =>
      apiFetch(`/announcements/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title, content, isPinned }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/announcements/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
    },
  });
}

// Audit Logs
// Note: Audit logs endpoint not implemented yet - placeholder for future
export function useAuditLogs() {
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useQuery({
    queryKey: ["admin", "audit", siteId],
    queryFn: () => Promise.resolve([] as AuditLog[]),
    enabled: !!siteId,
  });
}

// Actions
interface ActionItem {
  id: string;
  postId: string;
  description: string;
  status: string;
  assignee?: {
    nameMasked: string;
  };
  dueDate?: string;
  createdAt: string;
}

export interface ManualApproval {
  id: string;
  userId: string;
  siteId: string;
  approvedById: string;
  reason: string;
  validDate: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    companyName: string | null;
    tradeType: string | null;
  };
  approvedBy: {
    id: string;
    name: string | null;
  };
}

export interface SiteMembership {
  id: string;
  siteId: string;
  siteName: string;
  status: string;
  role: string;
  joinedAt: string;
}

export function useMySites() {
  return useQuery({
    queryKey: ["admin", "my-sites"],
    queryFn: () => apiFetch<SiteMembership[]>("/users/me/memberships"),
  });
}

export function useManualApprovals(siteId?: string, date?: string) {
  const currentSiteId = useAuthStore((s) => s.currentSiteId);
  const targetSiteId = siteId || currentSiteId;

  const params = new URLSearchParams();
  if (targetSiteId) params.set("siteId", targetSiteId);
  if (date) params.set("date", date);

  return useQuery({
    queryKey: ["admin", "manual-approvals", targetSiteId, date],
    queryFn: () =>
      apiFetch<ManualApproval[]>(
        `/admin/manual-approvals?${params.toString()}`,
      ),
    enabled: !!targetSiteId,
  });
}

export function useCreateManualApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      userId: string;
      siteId: string;
      reason: string;
      validDate: string;
    }) =>
      apiFetch("/admin/manual-approval", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "manual-approvals", variables.siteId],
      });
    },
  });
}

export function useActionItems() {
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useQuery({
    queryKey: ["admin", "actions", siteId],
    queryFn: () => apiFetch<ActionItem[]>(`/actions?siteId=${siteId}`),
    enabled: !!siteId,
  });
}

export function useUpdateAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/actions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "actions"] });
    },
  });
}

// Site Settings
export interface Site {
  id: string;
  name: string;
  active: boolean;
  joinCode: string;
  joinEnabled?: boolean;
  createdAt: string;
  memberCount?: number;
}

export function useSite(siteId?: string) {
  const currentSiteId = useAuthStore((s) => s.currentSiteId);
  const targetSiteId = siteId || currentSiteId;

  return useQuery({
    queryKey: ["site", targetSiteId],
    queryFn: async () => {
      const response = await apiFetch<{ site: Site }>(`/sites/${targetSiteId}`);
      return response.site;
    },
    enabled: !!targetSiteId,
  });
}

export function useUpdateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      siteId,
      data,
    }: {
      siteId: string;
      data: { name?: string; active?: boolean };
    }) =>
      apiFetch<{ site: Site }>(`/sites/${siteId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["site", variables.siteId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "my-sites"] });
    },
  });
}

export function useReissueJoinCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (siteId: string) =>
      apiFetch<{ site: Site; previousCode: string }>(
        `/sites/${siteId}/reissue-join-code`,
        { method: "POST" },
      ),
    onSuccess: (_, siteId) => {
      queryClient.invalidateQueries({ queryKey: ["site", siteId] });
    },
  });
}

// Point Policies
export interface PointPolicy {
  id: string;
  siteId: string;
  reasonCode: string;
  name: string;
  description: string | null;
  defaultAmount: number;
  minAmount: number | null;
  maxAmount: number | null;
  dailyLimit: number | null;
  monthlyLimit: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePolicyBody {
  siteId: string;
  reasonCode: string;
  name: string;
  description?: string;
  defaultAmount: number;
  minAmount?: number;
  maxAmount?: number;
  dailyLimit?: number;
  monthlyLimit?: number;
}

export interface UpdatePolicyBody {
  name?: string;
  description?: string;
  defaultAmount?: number;
  minAmount?: number;
  maxAmount?: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  isActive?: boolean;
}

export function usePolicies(siteId?: string) {
  const currentSiteId = useAuthStore((s) => s.currentSiteId);
  const targetSiteId = siteId || currentSiteId;

  return useQuery({
    queryKey: ["admin", "policies", targetSiteId],
    queryFn: () =>
      apiFetch<{ policies: PointPolicy[] }>(
        `/policies/site/${targetSiteId}`,
      ).then((res) => res.policies),
    enabled: !!targetSiteId,
  });
}

export function useCreatePolicy() {
  const queryClient = useQueryClient();
  const currentSiteId = useAuthStore((s) => s.currentSiteId);

  return useMutation({
    mutationFn: (
      data: Omit<CreatePolicyBody, "siteId"> & { siteId?: string },
    ) => {
      const siteId = data.siteId || currentSiteId;
      if (!siteId) throw new Error("Site ID is required");

      return apiFetch<{ policy: PointPolicy }>("/policies", {
        method: "POST",
        body: JSON.stringify({ ...data, siteId }),
      });
    },
    onSuccess: (_, variables) => {
      const siteId = variables.siteId || currentSiteId;
      queryClient.invalidateQueries({
        queryKey: ["admin", "policies", siteId],
      });
    },
  });
}

export function useUpdatePolicy() {
  const queryClient = useQueryClient();
  const currentSiteId = useAuthStore((s) => s.currentSiteId);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePolicyBody }) =>
      apiFetch<{ policy: PointPolicy }>(`/policies/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "policy", data.policy.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "policies", data.policy.siteId],
      });
      if (currentSiteId) {
        queryClient.invalidateQueries({
          queryKey: ["admin", "policies", currentSiteId],
        });
      }
    },
  });
}

export function useDeletePolicy() {
  const queryClient = useQueryClient();
  const currentSiteId = useAuthStore((s) => s.currentSiteId);

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/policies/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      if (currentSiteId) {
        queryClient.invalidateQueries({
          queryKey: ["admin", "policies", currentSiteId],
        });
      }
    },
  });
}
