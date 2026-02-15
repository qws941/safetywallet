import { describe, expect, it } from "vitest";
import {
  ExportPostsQuerySchema,
  ExportUsersQuerySchema,
  ExportAttendanceQuerySchema,
} from "../export";

describe("export validators", () => {
  // ---------- ExportPostsQuerySchema ----------

  describe("ExportPostsQuerySchema", () => {
    it("accepts empty object with defaults", () => {
      const result = ExportPostsQuerySchema.parse({});
      expect(result.format).toBe("csv");
      expect(result.withContent).toBe(false);
      expect(result.page).toBe(1);
    });

    it("accepts valid parameters", () => {
      const result = ExportPostsQuerySchema.parse({
        format: "csv",
        site: "550e8400-e29b-41d4-a716-446655440000",
        category: "safety",
        status: "APPROVED",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        page: "3",
      });
      expect(result.page).toBe(3);
      expect(result.status).toBe("APPROVED");
    });

    it("rejects invalid date format", () => {
      expect(() =>
        ExportPostsQuerySchema.parse({ startDate: "2025/01/01" }),
      ).toThrow();
    });

    it("rejects date outside range", () => {
      expect(() =>
        ExportPostsQuerySchema.parse({ startDate: "1999-01-01" }),
      ).toThrow();
    });

    it("rejects invalid status", () => {
      expect(() =>
        ExportPostsQuerySchema.parse({ status: "INVALID" }),
      ).toThrow();
    });

    it("rejects non-UUID site", () => {
      expect(() =>
        ExportPostsQuerySchema.parse({ site: "not-a-uuid" }),
      ).toThrow();
    });

    it("transforms invalid page to 1", () => {
      const result = ExportPostsQuerySchema.parse({ page: "abc" });
      expect(result.page).toBe(1);
    });

    it("transforms negative page to 1", () => {
      const result = ExportPostsQuerySchema.parse({ page: "-5" });
      expect(result.page).toBe(1);
    });

    it("transforms '0' page to 1", () => {
      const result = ExportPostsQuerySchema.parse({ page: "0" });
      expect(result.page).toBe(1);
    });

    it("accepts all valid status values", () => {
      const statuses = [
        "PENDING",
        "RECEIVED",
        "IN_REVIEW",
        "APPROVED",
        "REJECTED",
        "NEED_INFO",
      ];
      for (const status of statuses) {
        const result = ExportPostsQuerySchema.parse({ status });
        expect(result.status).toBe(status);
      }
    });
  });

  // ---------- ExportUsersQuerySchema ----------

  describe("ExportUsersQuerySchema", () => {
    it("accepts empty object with defaults", () => {
      const result = ExportUsersQuerySchema.parse({});
      expect(result.format).toBe("csv");
      expect(result.page).toBe(1);
    });

    it("accepts valid search and role", () => {
      const result = ExportUsersQuerySchema.parse({
        search: "김철수",
        role: "WORKER",
      });
      expect(result.search).toBe("김철수");
      expect(result.role).toBe("WORKER");
    });

    it("rejects invalid date", () => {
      expect(() =>
        ExportUsersQuerySchema.parse({ startDate: "not-a-date" }),
      ).toThrow();
    });

    it("transforms NaN page to 1", () => {
      const result = ExportUsersQuerySchema.parse({ page: "xyz" });
      expect(result.page).toBe(1);
    });

    it("transforms negative page to 1", () => {
      const result = ExportUsersQuerySchema.parse({ page: "-3" });
      expect(result.page).toBe(1);
    });
  });

  // ---------- ExportAttendanceQuerySchema ----------

  describe("ExportAttendanceQuerySchema", () => {
    it("accepts empty object with defaults", () => {
      const result = ExportAttendanceQuerySchema.parse({});
      expect(result.format).toBe("csv");
      expect(result.page).toBe(1);
    });

    it("accepts valid userId filter", () => {
      const result = ExportAttendanceQuerySchema.parse({
        userId: "user-123",
      });
      expect(result.userId).toBe("user-123");
    });

    it("accepts valid date range", () => {
      const result = ExportAttendanceQuerySchema.parse({
        startDate: "2025-06-01",
        endDate: "2025-06-30",
      });
      expect(result.startDate).toBe("2025-06-01");
    });

    it("transforms NaN page to 1", () => {
      const result = ExportAttendanceQuerySchema.parse({ page: "abc" });
      expect(result.page).toBe(1);
    });

    it("transforms zero page to 1", () => {
      const result = ExportAttendanceQuerySchema.parse({ page: "0" });
      expect(result.page).toBe(1);
    });
  });
});
