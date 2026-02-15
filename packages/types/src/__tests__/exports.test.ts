import { describe, expect, it, expectTypeOf } from "vitest";
import * as root from "../index";
import type {
  AnnouncementDto,
  ApiResponse,
  AuthResponseDto,
  CreatePostDto,
  ErrorResponse,
  I18n,
  Ko,
  MeResponseDto,
  PaginatedResponse,
  PostDto,
  SiteDto,
  UserDto,
  VoteDto,
} from "../index";

describe("root exports coverage", () => {
  it("re-exports runtime modules from enums/api/i18n", () => {
    expect(root.UserRole.WORKER).toBe("WORKER");
    expect(root.ReviewStatus.IN_REVIEW).toBe("IN_REVIEW");
    expect(root.i18n.ko["login.title"]).toBe("안전지갑");
    expect(root.ko["common.loading"]).toBe("로딩 중...");
  });

  it("contains major enum families on root barrel", () => {
    const enumKeys = [
      "UserRole",
      "MembershipStatus",
      "Category",
      "RiskLevel",
      "Visibility",
      "ReviewStatus",
      "ActionStatus",
      "ActionPriority",
      "ReviewAction",
      "TaskStatus",
      "RejectReason",
      "ApprovalStatus",
      "EducationContentType",
      "QuizStatus",
      "StatutoryTrainingType",
      "TrainingCompletionStatus",
      "MembershipRole",
      "AttendanceResult",
      "AttendanceSource",
      "VoteCandidateSource",
      "DisputeStatus",
      "DisputeType",
      "SyncType",
      "SyncErrorStatus",
    ] as const;

    for (const key of enumKeys) {
      expect(root).toHaveProperty(key);
    }
  });

  it("exports API envelope interfaces at type level", () => {
    expectTypeOf<ApiResponse<{ id: string }>>().toMatchTypeOf<{
      success: boolean;
      data: { id: string };
      timestamp: string;
      message?: string;
    }>();

    expectTypeOf<PaginatedResponse<{ id: string }>>().toMatchTypeOf<{
      success: boolean;
      data: Array<{ id: string }>;
      meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
      timestamp: string;
    }>();

    expectTypeOf<ErrorResponse>().toMatchTypeOf<{
      success: false;
      error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
      };
      timestamp: string;
    }>();
  });

  it("exports representative DTO interfaces at type level", () => {
    expectTypeOf<UserDto>().toMatchTypeOf<{
      id: string;
      phone: string;
      nameMasked: string | null;
      role: root.UserRole;
      createdAt: string;
    }>();

    expectTypeOf<AuthResponseDto>().toMatchTypeOf<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      user: {
        id: string;
        phone: string;
        nameMasked: string | null;
        role: string;
      };
    }>();

    expectTypeOf<MeResponseDto>().toMatchTypeOf<{
      id: string;
      permissions: string[];
      todayAttendance: { status: string; checkInAt: string } | null;
    }>();

    expectTypeOf<SiteDto>().toMatchTypeOf<{
      id: string;
      name: string;
      closedAt: string | null;
    }>();

    expectTypeOf<CreatePostDto>().toMatchTypeOf<{
      siteId: string;
      category: root.Category;
      content: string;
    }>();

    expectTypeOf<PostDto>().toMatchTypeOf<{
      id: string;
      reviewStatus: root.ReviewStatus;
      actionStatus: root.ActionStatus;
      images: Array<{ id: string }>;
    }>();

    expectTypeOf<AnnouncementDto>().toMatchTypeOf<{
      id: string;
      title: string;
      author: { id: string; nameMasked: string | null };
    }>();

    expectTypeOf<VoteDto>().toMatchTypeOf<{
      id: string;
      month: string;
      candidateId: string;
    }>();
  });

  it("exports i18n types", () => {
    expectTypeOf<Ko>().toMatchTypeOf<typeof root.ko>();
    expectTypeOf<I18n>().toMatchTypeOf<typeof root.i18n>();
  });
});
