import { describe, expect, it } from "vitest";
import {
  ActionPriority,
  ActionStatus,
  ApprovalStatus,
  AttendanceResult,
  AttendanceSource,
  Category,
  DisputeStatus,
  DisputeType,
  EducationContentType,
  MembershipRole,
  MembershipStatus,
  QuizStatus,
  RejectReason,
  ReviewAction,
  ReviewStatus,
  RiskLevel,
  StatutoryTrainingType,
  SyncErrorStatus,
  SyncType,
  TaskStatus,
  TrainingCompletionStatus,
  UserRole,
  Visibility,
  VoteCandidateSource,
} from "../enums";

describe("shared enums", () => {
  it("has stable user and membership enums", () => {
    expect(UserRole).toEqual({
      WORKER: "WORKER",
      SITE_ADMIN: "SITE_ADMIN",
      SUPER_ADMIN: "SUPER_ADMIN",
      SYSTEM: "SYSTEM",
    });

    expect(MembershipStatus).toEqual({
      PENDING: "PENDING",
      ACTIVE: "ACTIVE",
      LEFT: "LEFT",
      REMOVED: "REMOVED",
    });

    expect(MembershipRole).toEqual({
      WORKER: "WORKER",
      SITE_ADMIN: "SITE_ADMIN",
    });
  });

  it("has stable post and review enums", () => {
    expect(Category).toEqual({
      HAZARD: "HAZARD",
      UNSAFE_BEHAVIOR: "UNSAFE_BEHAVIOR",
      INCONVENIENCE: "INCONVENIENCE",
      SUGGESTION: "SUGGESTION",
      BEST_PRACTICE: "BEST_PRACTICE",
    });

    expect(RiskLevel).toEqual({
      HIGH: "HIGH",
      MEDIUM: "MEDIUM",
      LOW: "LOW",
    });

    expect(Visibility).toEqual({
      WORKER_PUBLIC: "WORKER_PUBLIC",
      ADMIN_ONLY: "ADMIN_ONLY",
    });

    expect(ReviewStatus).toEqual({
      PENDING: "PENDING",
      IN_REVIEW: "IN_REVIEW",
      NEED_INFO: "NEED_INFO",
      APPROVED: "APPROVED",
      REJECTED: "REJECTED",
      URGENT: "URGENT",
    });

    expect(ActionStatus).toEqual({
      NONE: "NONE",
      ASSIGNED: "ASSIGNED",
      IN_PROGRESS: "IN_PROGRESS",
      COMPLETED: "COMPLETED",
      VERIFIED: "VERIFIED",
      OVERDUE: "OVERDUE",
    });

    expect(ActionPriority).toEqual({
      HIGH: "HIGH",
      MEDIUM: "MEDIUM",
      LOW: "LOW",
    });

    expect(ReviewAction).toEqual({
      APPROVE: "APPROVE",
      REJECT: "REJECT",
      REQUEST_MORE: "REQUEST_MORE",
      MARK_URGENT: "MARK_URGENT",
      ASSIGN: "ASSIGN",
      CLOSE: "CLOSE",
    });

    expect(TaskStatus).toEqual({
      OPEN: "OPEN",
      IN_PROGRESS: "IN_PROGRESS",
      DONE: "DONE",
    });

    expect(RejectReason).toEqual({
      DUPLICATE: "DUPLICATE",
      UNCLEAR_PHOTO: "UNCLEAR_PHOTO",
      INSUFFICIENT: "INSUFFICIENT",
      FALSE: "FALSE",
      IRRELEVANT: "IRRELEVANT",
      OTHER: "OTHER",
    });

    expect(ApprovalStatus).toEqual({
      PENDING: "PENDING",
      APPROVED: "APPROVED",
      REJECTED: "REJECTED",
    });
  });

  it("has stable education and attendance enums", () => {
    expect(EducationContentType).toEqual({
      VIDEO: "VIDEO",
      IMAGE: "IMAGE",
      TEXT: "TEXT",
      DOCUMENT: "DOCUMENT",
    });

    expect(QuizStatus).toEqual({
      DRAFT: "DRAFT",
      PUBLISHED: "PUBLISHED",
      ARCHIVED: "ARCHIVED",
    });

    expect(StatutoryTrainingType).toEqual({
      NEW_WORKER: "NEW_WORKER",
      SPECIAL: "SPECIAL",
      REGULAR: "REGULAR",
      CHANGE_OF_WORK: "CHANGE_OF_WORK",
    });

    expect(TrainingCompletionStatus).toEqual({
      SCHEDULED: "SCHEDULED",
      COMPLETED: "COMPLETED",
      EXPIRED: "EXPIRED",
    });

    expect(AttendanceResult).toEqual({
      SUCCESS: "SUCCESS",
      FAIL: "FAIL",
    });

    expect(AttendanceSource).toEqual({
      FAS: "FAS",
      MANUAL: "MANUAL",
    });
  });

  it("has stable vote, dispute, and sync enums", () => {
    expect(VoteCandidateSource).toEqual({
      ADMIN: "ADMIN",
      AUTO: "AUTO",
    });

    expect(DisputeStatus).toEqual({
      OPEN: "OPEN",
      IN_REVIEW: "IN_REVIEW",
      RESOLVED: "RESOLVED",
      REJECTED: "REJECTED",
    });

    expect(DisputeType).toEqual({
      REVIEW_APPEAL: "REVIEW_APPEAL",
      POINT_DISPUTE: "POINT_DISPUTE",
      ATTENDANCE_DISPUTE: "ATTENDANCE_DISPUTE",
      OTHER: "OTHER",
    });

    expect(SyncType).toEqual({
      FAS_ATTENDANCE: "FAS_ATTENDANCE",
      FAS_WORKER: "FAS_WORKER",
      ATTENDANCE_MANUAL: "ATTENDANCE_MANUAL",
    });

    expect(SyncErrorStatus).toEqual({
      OPEN: "OPEN",
      RESOLVED: "RESOLVED",
      IGNORED: "IGNORED",
    });
  });
});
