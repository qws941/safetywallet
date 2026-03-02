"use client";

// Barrel re-exports from domain sub-files

// Dashboard
export { useDashboardStats } from "./use-admin-dashboard-api";

// Members
export {
  type Member,
  useMembers,
  useMember,
  useSetMemberActiveStatus,
} from "./use-admin-members-api";

// Announcements
export {
  useAdminAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
} from "./use-admin-announcements-api";

// Audit
export { type AuditLog, useAuditLogs } from "./use-admin-audit-api";

// Sites
export { type SiteMembership, useMySites } from "./use-admin-sites-api";

// Approvals
export {
  type ManualApproval,
  useManualApprovals,
  useApproveManualRequest,
  useRejectManualRequest,
  useCreateManualApproval,
} from "./use-admin-approvals-api";
