import { describe, expect, it } from "vitest";
import {
  FasEmployeePayloadSchema,
  AceViewerEmployeesPayloadSchema,
  FasGetUpdatedEmployeesParamsSchema,
  AttendanceSyncEventSchema,
  AttendanceSyncBodySchema,
} from "../fas-sync";

describe("fas-sync validators", () => {
  // ---------- FasEmployeePayloadSchema ----------

  describe("FasEmployeePayloadSchema", () => {
    it("accepts valid employee", () => {
      const result = FasEmployeePayloadSchema.parse({
        externalWorkerId: "W001",
        name: "김철수",
        companyName: "한성건설",
        position: "근로자",
        trade: "철근",
        lastSeen: "2025-06-15 14:30:00",
      });
      expect(result.externalWorkerId).toBe("W001");
    });

    it("accepts minimal required fields", () => {
      const result = FasEmployeePayloadSchema.parse({
        externalWorkerId: "W001",
        name: "김철수",
      });
      expect(result.name).toBe("김철수");
    });

    it("rejects empty externalWorkerId", () => {
      expect(() =>
        FasEmployeePayloadSchema.parse({
          externalWorkerId: "",
          name: "김철수",
        }),
      ).toThrow();
    });

    it("rejects externalWorkerId over 20 chars", () => {
      expect(() =>
        FasEmployeePayloadSchema.parse({
          externalWorkerId: "a".repeat(21),
          name: "김철수",
        }),
      ).toThrow();
    });

    it("rejects empty name", () => {
      expect(() =>
        FasEmployeePayloadSchema.parse({
          externalWorkerId: "W001",
          name: "",
        }),
      ).toThrow();
    });

    it("accepts null optional fields", () => {
      const result = FasEmployeePayloadSchema.parse({
        externalWorkerId: "W001",
        name: "김철수",
        companyName: null,
        position: null,
        trade: null,
        lastSeen: null,
      });
      expect(result.companyName).toBeNull();
    });

    it("rejects invalid lastSeen format", () => {
      expect(() =>
        FasEmployeePayloadSchema.parse({
          externalWorkerId: "W001",
          name: "김철수",
          lastSeen: "2025-06-15T14:30:00Z",
        }),
      ).toThrow();
    });

    it("trims whitespace from strings", () => {
      const result = FasEmployeePayloadSchema.parse({
        externalWorkerId: "  W001  ",
        name: "  김철수  ",
      });
      expect(result.externalWorkerId).toBe("W001");
      expect(result.name).toBe("김철수");
    });
  });

  // ---------- AceViewerEmployeesPayloadSchema ----------

  describe("AceViewerEmployeesPayloadSchema", () => {
    it("accepts valid payload", () => {
      const result = AceViewerEmployeesPayloadSchema.parse({
        employees: [{ externalWorkerId: "W001", name: "김철수" }],
        total: 1,
      });
      expect(result.employees).toHaveLength(1);
    });

    it("accepts empty employees array", () => {
      const result = AceViewerEmployeesPayloadSchema.parse({
        employees: [],
        total: 0,
      });
      expect(result.employees).toHaveLength(0);
    });

    it("rejects negative total", () => {
      expect(() =>
        AceViewerEmployeesPayloadSchema.parse({
          employees: [],
          total: -1,
        }),
      ).toThrow();
    });
  });

  // ---------- FasGetUpdatedEmployeesParamsSchema ----------

  describe("FasGetUpdatedEmployeesParamsSchema", () => {
    it("accepts valid timestamp", () => {
      const result = FasGetUpdatedEmployeesParamsSchema.parse({
        sinceTimestamp: "2025-06-15 14:30:00",
      });
      expect(result.sinceTimestamp).toBe("2025-06-15 14:30:00");
    });

    it("defaults sinceTimestamp to null", () => {
      const result = FasGetUpdatedEmployeesParamsSchema.parse({});
      expect(result.sinceTimestamp).toBeNull();
    });

    it("accepts null sinceTimestamp", () => {
      const result = FasGetUpdatedEmployeesParamsSchema.parse({
        sinceTimestamp: null,
      });
      expect(result.sinceTimestamp).toBeNull();
    });

    it("rejects invalid timestamp format", () => {
      expect(() =>
        FasGetUpdatedEmployeesParamsSchema.parse({
          sinceTimestamp: "2025-06-15",
        }),
      ).toThrow();
    });
  });

  // ---------- AttendanceSyncEventSchema ----------

  describe("AttendanceSyncEventSchema", () => {
    it("accepts valid event with FAS timestamp", () => {
      const result = AttendanceSyncEventSchema.parse({
        fasEventId: "EVT-001",
        fasUserId: "W001",
        checkinAt: "2025-06-15 08:30:00",
      });
      expect(result.fasEventId).toBe("EVT-001");
    });

    it("accepts valid event with ISO datetime", () => {
      const result = AttendanceSyncEventSchema.parse({
        fasEventId: "EVT-001",
        fasUserId: "W001",
        checkinAt: "2025-06-15T08:30:00Z",
      });
      expect(result.checkinAt).toBe("2025-06-15T08:30:00Z");
    });

    it("accepts optional siteId as UUID", () => {
      const result = AttendanceSyncEventSchema.parse({
        fasEventId: "EVT-001",
        fasUserId: "W001",
        checkinAt: "2025-06-15 08:30:00",
        siteId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.siteId).toBe("550e8400-e29b-41d4-a716-446655440000");
    });

    it("rejects empty fasEventId", () => {
      expect(() =>
        AttendanceSyncEventSchema.parse({
          fasEventId: "",
          fasUserId: "W001",
          checkinAt: "2025-06-15 08:30:00",
        }),
      ).toThrow();
    });

    it("rejects empty fasUserId", () => {
      expect(() =>
        AttendanceSyncEventSchema.parse({
          fasEventId: "EVT-001",
          fasUserId: "",
          checkinAt: "2025-06-15 08:30:00",
        }),
      ).toThrow();
    });

    it("rejects invalid siteId (not UUID)", () => {
      expect(() =>
        AttendanceSyncEventSchema.parse({
          fasEventId: "EVT-001",
          fasUserId: "W001",
          checkinAt: "2025-06-15 08:30:00",
          siteId: "not-a-uuid",
        }),
      ).toThrow();
    });
  });

  // ---------- AttendanceSyncBodySchema ----------

  describe("AttendanceSyncBodySchema", () => {
    it("accepts valid body with events", () => {
      const result = AttendanceSyncBodySchema.parse({
        events: [
          {
            fasEventId: "EVT-001",
            fasUserId: "W001",
            checkinAt: "2025-06-15 08:30:00",
          },
        ],
      });
      expect(result.events).toHaveLength(1);
    });

    it("rejects empty events array", () => {
      expect(() => AttendanceSyncBodySchema.parse({ events: [] })).toThrow();
    });

    it("rejects missing events field", () => {
      expect(() => AttendanceSyncBodySchema.parse({})).toThrow();
    });
  });
});
