import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSyncFailureEventId,
  emitSyncFailureToElk,
  formatSettleMonth,
  getElkDailyIndexDate,
  getKSTDate,
  getMonthRange,
  withRetry,
} from "../helpers";
import type { Env } from "../../types";

describe("scheduled helpers", () => {
  // ---------- getKSTDate ----------

  describe("getKSTDate", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns a Date object", () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
      const result = getKSTDate();
      expect(result).toBeInstanceOf(Date);
    });

    it("is 9 hours ahead of UTC", () => {
      // 2025-06-15T12:00:00Z -> KST 21:00
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
      const utcNow = new Date();
      const kst = getKSTDate();
      const diffMs = kst.getTime() - utcNow.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      expect(diffHours).toBe(9);
    });

    it("rolls over to next day when UTC is past 15:00", () => {
      // UTC 16:00 = KST 01:00 next day
      vi.setSystemTime(new Date("2025-06-15T16:00:00Z"));
      const kst = getKSTDate();
      expect(kst.getUTCDate()).toBe(16); // Next day in KST
    });
  });

  // ---------- getMonthRange ----------

  describe("getMonthRange", () => {
    it("returns start and end for a given month", () => {
      const date = new Date("2025-06-15T12:00:00Z");
      const range = getMonthRange(date);

      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);
    });

    it("start is first day of month at 00:00:00", () => {
      const date = new Date("2025-06-15T12:00:00Z");
      const range = getMonthRange(date);

      expect(range.start.getUTCDate()).toBe(1);
      expect(range.start.getUTCHours()).toBe(0);
      expect(range.start.getUTCMinutes()).toBe(0);
      expect(range.start.getUTCSeconds()).toBe(0);
    });

    it("end is last day of month at 23:59:59", () => {
      const date = new Date("2025-06-15T12:00:00Z");
      const range = getMonthRange(date);

      // June has 30 days
      expect(range.end.getUTCDate()).toBe(30);
      expect(range.end.getUTCHours()).toBe(23);
      expect(range.end.getUTCMinutes()).toBe(59);
      expect(range.end.getUTCSeconds()).toBe(59);
    });

    it("handles February in leap year", () => {
      const date = new Date("2024-02-15T12:00:00Z");
      const range = getMonthRange(date);

      expect(range.start.getUTCDate()).toBe(1);
      expect(range.end.getUTCDate()).toBe(29);
    });

    it("handles February in non-leap year", () => {
      const date = new Date("2025-02-15T12:00:00Z");
      const range = getMonthRange(date);

      expect(range.end.getUTCDate()).toBe(28);
    });

    it("handles December correctly", () => {
      const date = new Date("2025-12-20T12:00:00Z");
      const range = getMonthRange(date);

      expect(range.start.getUTCMonth()).toBe(11); // December (0-indexed)
      expect(range.end.getUTCDate()).toBe(31);
    });

    it("handles January correctly", () => {
      const date = new Date("2025-01-05T12:00:00Z");
      const range = getMonthRange(date);

      expect(range.start.getUTCMonth()).toBe(0); // January (0-indexed)
      expect(range.end.getUTCDate()).toBe(31);
    });
  });

  // ---------- formatSettleMonth ----------

  describe("formatSettleMonth", () => {
    it("formats as YYYY-MM", () => {
      const date = new Date("2025-06-15T12:00:00Z");
      expect(formatSettleMonth(date)).toBe("2025-06");
    });

    it("pads single-digit month with zero", () => {
      const date = new Date("2025-01-15T12:00:00Z");
      expect(formatSettleMonth(date)).toBe("2025-01");
    });

    it("formats December correctly", () => {
      const date = new Date("2025-12-01T12:00:00Z");
      expect(formatSettleMonth(date)).toBe("2025-12");
    });
  });

  // ---------- withRetry ----------

  describe("withRetry", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns result on first success", async () => {
      const fn = vi.fn().mockResolvedValue("ok");
      const result = await withRetry(fn, 3, 10);
      expect(result).toBe("ok");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("retries on failure and succeeds eventually", async () => {
      vi.useRealTimers();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("fail1"))
        .mockResolvedValue("ok");

      const result = await withRetry(fn, 3, 1);

      expect(result).toBe("ok");
      expect(fn).toHaveBeenCalledTimes(2);
      vi.useFakeTimers();
    });

    it("throws after max attempts exhausted", async () => {
      vi.useRealTimers();
      let callCount = 0;
      const fn = vi.fn().mockImplementation(async () => {
        callCount++;
        throw new Error("always-fail");
      });

      await expect(withRetry(fn, 2, 1)).rejects.toThrow("always-fail");
      expect(callCount).toBe(2);
      vi.useFakeTimers();
    });

    it("uses default values (maxAttempts=3, baseDelayMs=1000)", async () => {
      const fn = vi.fn().mockResolvedValue(42);
      const result = await withRetry(fn);
      expect(result).toBe(42);
    });
  });

  describe("ELK telemetry helpers", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("builds daily index date from ISO timestamp", () => {
      expect(getElkDailyIndexDate("2026-02-20T02:03:04.567Z")).toBe(
        "2026.02.20",
      );
    });

    it("builds deterministic sync failure event id", () => {
      const eventId = buildSyncFailureEventId({
        timestamp: "2026-02-20T02:03:04.567Z",
        correlationId: "corr-123",
        syncType: "FAS_WORKER",
        errorCode: "FULL_SYNC_FAILED",
        errorMessage: "boom",
        lockName: "fas-full",
      });

      expect(eventId).toBe("FAS_WORKER-corr-123");
    });

    it("skips ELK emission when ELASTICSEARCH_URL is missing", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      await emitSyncFailureToElk({} as Env, {
        timestamp: "2026-02-20T02:03:04.567Z",
        correlationId: "corr-123",
        syncType: "FAS_WORKER",
        errorCode: "FULL_SYNC_FAILED",
        errorMessage: "boom",
        lockName: "fas-full",
      });

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("emits PUT request with deterministic _doc id", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response(null, { status: 201 }));

      await emitSyncFailureToElk(
        { ELASTICSEARCH_URL: "https://elastic.example" } as Env,
        {
          timestamp: "2026-02-20T02:03:04.567Z",
          correlationId: "corr-123",
          syncType: "FAS_WORKER",
          errorCode: "FAS_WORKER_SYNC_FAILED",
          errorMessage: "worker down",
          lockName: "fas-full",
        },
      );

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0];
      expect(String(url)).toBe(
        "https://elastic.example/safetywallet-logs-2026.02.20/_doc/FAS_WORKER-corr-123",
      );
      expect(init?.method).toBe("PUT");

      const body = JSON.parse(String(init?.body)) as {
        metadata: { correlationId: string; eventId: string; lockName: string };
      };
      expect(body.metadata.correlationId).toBe("corr-123");
      expect(body.metadata.eventId).toBe("FAS_WORKER-corr-123");
      expect(body.metadata.lockName).toBe("fas-full");
    });

    it("uses overridden Elasticsearch index prefix when provided", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response(null, { status: 201 }));

      await emitSyncFailureToElk(
        {
          ELASTICSEARCH_URL: "https://elastic.example",
          ELASTICSEARCH_INDEX_PREFIX: "safetywallet-logs",
        } as Env,
        {
          timestamp: "2026-02-20T02:03:04.567Z",
          correlationId: "corr-123",
          syncType: "FAS_WORKER",
          errorCode: "FULL_SYNC_FAILED",
          errorMessage: "boom",
          lockName: "fas-full",
        },
      );

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url] = fetchSpy.mock.calls[0];
      expect(String(url)).toBe(
        "https://elastic.example/safetywallet-logs-2026.02.20/_doc/FAS_WORKER-corr-123",
      );
    });

    it("retries once when first ELK request fails", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockRejectedValueOnce(new Error("network fail"))
        .mockResolvedValueOnce(new Response(null, { status: 201 }));

      await emitSyncFailureToElk(
        { ELASTICSEARCH_URL: "https://elastic.example" } as Env,
        {
          timestamp: "2026-02-20T02:03:04.567Z",
          correlationId: "corr-123",
          syncType: "FAS_WORKER",
          errorCode: "FULL_SYNC_FAILED",
          errorMessage: "boom",
          lockName: "fas-full",
        },
      );

      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});

describe("scheduled orchestrators", () => {
  interface SelectPlan {
    all?: unknown[];
    get?: unknown;
    value?: unknown;
    limit?: unknown;
  }

  interface MockState {
    selectPlans: SelectPlan[];
    deletePlans: unknown[][];
    updatePlans: unknown[];
  }

  const state: MockState = {
    selectPlans: [],
    deletePlans: [],
    updatePlans: [],
  };

  const mockAcquireSyncLock = vi.fn();
  const mockReleaseSyncLock = vi.fn();
  const mockFasGetUpdatedEmployees = vi.fn();
  const mockFasGetEmployeesBatch = vi.fn();
  const mockTestFasConnection = vi.fn();
  const mockSyncFasEmployeesToD1 = vi.fn();
  const mockSyncSingleFasEmployee = vi.fn();
  const mockDeactivateRetiredEmployees = vi.fn();
  const mockDbBatchChunked = vi.fn();
  const mockHmac = vi.fn();
  const mockFireAlert = vi.fn();
  const mockGetAlertConfig = vi.fn();
  const mockBuildFasDownAlert = vi.fn();
  const mockBuildCronFailureAlert = vi.fn();
  const mockBuildHighErrorRateAlert = vi.fn();
  const mockBuildHighLatencyAlert = vi.fn();
  const mockInfo = vi.fn();
  const mockWarn = vi.fn();
  const mockError = vi.fn();

  function makeSelectChain(plan: SelectPlan) {
    const finalValue =
      plan.value ?? plan.all ?? plan.limit ?? plan.get ?? ([] as unknown[]);

    const chain = new Proxy<Record<string, unknown>>(
      {},
      {
        get(_target, prop) {
          if (prop === "then") {
            return Promise.resolve(finalValue).then.bind(
              Promise.resolve(finalValue),
            );
          }
          if (
            prop === "from" ||
            prop === "where" ||
            prop === "groupBy" ||
            prop === "orderBy"
          ) {
            return () => chain;
          }
          if (prop === "limit") {
            return async () => plan.limit ?? finalValue;
          }
          if (prop === "all") {
            return async () => (plan.all ?? finalValue) as unknown[];
          }
          if (prop === "get") {
            return async () => plan.get ?? null;
          }
          return undefined;
        },
      },
    );

    return chain;
  }

  function makeInsertChain() {
    const chain = new Proxy<Record<string, unknown>>(
      {},
      {
        get(_target, prop) {
          if (prop === "then") {
            return Promise.resolve().then.bind(Promise.resolve());
          }
          if (prop === "values") {
            return () => chain;
          }
          if (prop === "onConflictDoNothing" || prop === "onConflictDoUpdate") {
            return async () => {};
          }
          return undefined;
        },
      },
    );

    return chain;
  }

  function makeUpdateChain() {
    const chain = new Proxy<Record<string, unknown>>(
      {},
      {
        get(_target, prop) {
          if (prop === "then") {
            return Promise.resolve(
              state.updatePlans.shift() ?? { meta: { changes: 0 } },
            ).then.bind(
              Promise.resolve(
                state.updatePlans.shift() ?? { meta: { changes: 0 } },
              ),
            );
          }
          if (prop === "set") {
            return () => chain;
          }
          if (prop === "where") {
            return async () =>
              state.updatePlans.shift() ?? { meta: { changes: 0 } };
          }
          return undefined;
        },
      },
    );

    return chain;
  }

  function makeDeleteChain() {
    return {
      where: () => ({
        returning: async () => state.deletePlans.shift() ?? [],
      }),
    };
  }

  const mockDb = {
    select: vi.fn(() => makeSelectChain(state.selectPlans.shift() ?? {})),
    insert: vi.fn(() => makeInsertChain()),
    update: vi.fn(() => makeUpdateChain()),
    delete: vi.fn(() => makeDeleteChain()),
  };

  const sqlTag = (strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
    as: (_alias: string) => ({ strings, values }),
  });

  vi.doMock("../../lib/fas", () => ({
    fasGetUpdatedEmployees: (...args: unknown[]) =>
      mockFasGetUpdatedEmployees(...args),
    fasGetEmployeesBatch: (...args: unknown[]) =>
      mockFasGetEmployeesBatch(...args),
    testConnection: (...args: unknown[]) => mockTestFasConnection(...args),
    initFasConfig: vi.fn(),
  }));

  vi.doMock("../../lib/fas-sync", () => ({
    syncFasEmployeesToD1: (...args: unknown[]) =>
      mockSyncFasEmployeesToD1(...args),
    syncSingleFasEmployee: (...args: unknown[]) =>
      mockSyncSingleFasEmployee(...args),
    deactivateRetiredEmployees: (...args: unknown[]) =>
      mockDeactivateRetiredEmployees(...args),
  }));

  vi.doMock("../../lib/crypto", () => ({
    hmac: (...args: unknown[]) => mockHmac(...args),
  }));

  vi.doMock("../../utils/common", () => ({
    maskName: (name: string) => `${name}-masked`,
  }));

  vi.doMock("../../db/helpers", () => ({
    dbBatchChunked: (...args: unknown[]) => mockDbBatchChunked(...args),
  }));

  vi.doMock("../../lib/sync-lock", () => ({
    acquireSyncLock: (...args: unknown[]) => mockAcquireSyncLock(...args),
    releaseSyncLock: (...args: unknown[]) => mockReleaseSyncLock(...args),
  }));

  vi.doMock("../../lib/alerting", () => ({
    fireAlert: (...args: unknown[]) => mockFireAlert(...args),
    getAlertConfig: (...args: unknown[]) => mockGetAlertConfig(...args),
    buildFasDownAlert: (...args: unknown[]) => mockBuildFasDownAlert(...args),
    buildCronFailureAlert: (...args: unknown[]) =>
      mockBuildCronFailureAlert(...args),
    buildHighErrorRateAlert: (...args: unknown[]) =>
      mockBuildHighErrorRateAlert(...args),
    buildHighLatencyAlert: (...args: unknown[]) =>
      mockBuildHighLatencyAlert(...args),
  }));

  vi.doMock("../../lib/logger", () => ({
    createLogger: () => ({
      info: (...args: unknown[]) => mockInfo(...args),
      warn: (...args: unknown[]) => mockWarn(...args),
      error: (...args: unknown[]) => mockError(...args),
      debug: vi.fn(),
    }),
  }));

  vi.doMock("drizzle-orm/d1", () => ({
    drizzle: vi.fn(() => mockDb),
  }));

  vi.doMock("drizzle-orm", () => ({
    eq: vi.fn((...args: unknown[]) => ({ op: "eq", args })),
    sql: sqlTag,
    and: vi.fn((...args: unknown[]) => ({ op: "and", args })),
    gte: vi.fn((...args: unknown[]) => ({ op: "gte", args })),
    lt: vi.fn((...args: unknown[]) => ({ op: "lt", args })),
    like: vi.fn((...args: unknown[]) => ({ op: "like", args })),
    inArray: vi.fn((...args: unknown[]) => ({ op: "inArray", args })),
    isNull: vi.fn((...args: unknown[]) => ({ op: "isNull", args })),
    desc: vi.fn((arg: unknown) => ({ op: "desc", arg })),
  }));

  vi.doMock("../../db/schema", () => ({
    pointsLedger: {
      id: "pointsLedger.id",
      amount: "pointsLedger.amount",
      reasonCode: "pointsLedger.reasonCode",
      settleMonth: "pointsLedger.settleMonth",
      userId: "pointsLedger.userId",
      siteId: "pointsLedger.siteId",
      createdAt: "pointsLedger.createdAt",
    },
    siteMemberships: {
      userId: "siteMemberships.userId",
      siteId: "siteMemberships.siteId",
      status: "siteMemberships.status",
      joinedAt: "siteMemberships.joinedAt",
      leftAt: "siteMemberships.leftAt",
      leftReason: "siteMemberships.leftReason",
    },
    auditLogs: {
      id: "auditLogs.id",
      createdAt: "auditLogs.createdAt",
    },
    users: {
      id: "users.id",
      role: "users.role",
      deletedAt: "users.deletedAt",
      externalSystem: "users.externalSystem",
      externalWorkerId: "users.externalWorkerId",
      deletionRequestedAt: "users.deletionRequestedAt",
      phoneHash: "users.phoneHash",
    },
    sites: {
      id: "sites.id",
      active: "sites.active",
      name: "sites.name",
      autoNominationTopN: "sites.autoNominationTopN",
    },
    syncErrors: {},
    actions: {
      id: "actions.id",
      postId: "actions.postId",
      actionStatus: "actions.actionStatus",
      dueDate: "actions.dueDate",
      createdAt: "actions.createdAt",
    },
    posts: {
      id: "posts.id",
      userId: "posts.userId",
      createdAt: "posts.createdAt",
      actionStatus: "posts.actionStatus",
    },
    announcements: {
      isPublished: "announcements.isPublished",
      scheduledAt: "announcements.scheduledAt",
    },
    voteCandidates: {},
    attendance: {
      $inferInsert: {},
      externalWorkerId: "attendance.externalWorkerId",
      siteId: "attendance.siteId",
      checkinAt: "attendance.checkinAt",
      userId: "attendance.userId",
    },
    apiMetrics: {
      requestCount: "apiMetrics.requestCount",
      status5xx: "apiMetrics.status5xx",
      totalDurationMs: "apiMetrics.totalDurationMs",
      maxDurationMs: "apiMetrics.maxDurationMs",
      bucket: "apiMetrics.bucket",
    },
  }));

  function buildEnv(overrides: Partial<Env> = {}): Env {
    const kv = {
      get: vi.fn(async () => null),
      put: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
    } as unknown as KVNamespace;

    return {
      DB: {} as D1Database,
      R2: {} as R2Bucket,
      ASSETS: { fetch: vi.fn() } as unknown as Fetcher,
      KV: kv,
      JWT_SECRET: "jwt",
      HMAC_SECRET: "hmac",
      ENCRYPTION_KEY: "enc",
      REQUIRE_ATTENDANCE_FOR_LOGIN: "false",
      REQUIRE_ATTENDANCE_FOR_POST: "false",
      ENVIRONMENT: "test",
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    state.selectPlans = [];
    state.deletePlans = [];
    state.updatePlans = [];
    mockAcquireSyncLock.mockResolvedValue({ acquired: true });
    mockReleaseSyncLock.mockResolvedValue(undefined);
    mockTestFasConnection.mockResolvedValue(true);
    mockSyncFasEmployeesToD1.mockResolvedValue({
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    });
    mockDeactivateRetiredEmployees.mockResolvedValue(0);
    mockDbBatchChunked.mockResolvedValue({
      totalOps: 0,
      completedOps: 0,
      failedChunks: 0,
      errors: [],
    });
    mockFasGetUpdatedEmployees.mockResolvedValue([]);
    mockFasGetEmployeesBatch.mockResolvedValue(new Map());
    mockSyncSingleFasEmployee.mockResolvedValue(undefined);
    mockHmac.mockResolvedValue("hash");
    mockFireAlert.mockResolvedValue(undefined);
    mockGetAlertConfig.mockResolvedValue({
      enabled: false,
      webhookUrl: "",
      errorRateThresholdPercent: 10,
      latencyThresholdMs: 1000,
    });
    mockBuildFasDownAlert.mockReturnValue({ title: "fas-down" });
    mockBuildCronFailureAlert.mockReturnValue({ title: "cron-fail" });
    mockBuildHighErrorRateAlert.mockReturnValue({ title: "high-error" });
    mockBuildHighLatencyAlert.mockReturnValue({ title: "high-latency" });
  });

  it("runFasFullSync processes active/retired workers and ensures memberships", async () => {
    const { runFasFullSync: runFasFullSyncWithMocks } =
      await import("../sync-jobs");
    state.selectPlans.push(
      { get: { id: "system" } },
      { all: [{ id: "user-1" }, { id: "user-2" }] },
      { all: [{ id: "site-1" }] },
      { all: [] },
    );
    mockFasGetUpdatedEmployees.mockResolvedValue([
      { emplCd: "E-1", stateFlag: "W" },
      { emplCd: "E-2", stateFlag: "R" },
    ]);
    mockSyncFasEmployeesToD1.mockResolvedValue({
      created: 1,
      updated: 0,
      skipped: 0,
      errors: ["minor"],
    });
    mockDeactivateRetiredEmployees.mockResolvedValue(1);

    const env = buildEnv({
      FAS_HYPERDRIVE: {
        connectionString: "conn",
        host: "host",
        port: 3306,
        user: "user",
        password: "pw",
        database: "db",
      },
    });

    await runFasFullSyncWithMocks(env);

    expect(mockAcquireSyncLock).toHaveBeenCalledWith(env.KV, "fas-full", 600);
    expect(mockFasGetUpdatedEmployees).toHaveBeenCalledTimes(1);
    expect(mockSyncFasEmployeesToD1).toHaveBeenCalledTimes(1);
    expect(mockDeactivateRetiredEmployees).toHaveBeenCalledWith(
      ["E-2"],
      expect.any(Object),
    );
    expect(mockReleaseSyncLock).toHaveBeenCalledWith(env.KV, "fas-full");
  });

  it("runFasFullSync skips when lock is not acquired", async () => {
    const { runFasFullSync: runFasFullSyncWithMocks } =
      await import("../sync-jobs");
    mockAcquireSyncLock.mockResolvedValue({ acquired: false });
    const env = buildEnv({
      FAS_HYPERDRIVE: {
        connectionString: "conn",
        host: "host",
        port: 3306,
        user: "user",
        password: "pw",
        database: "db",
      },
    });

    await runFasFullSyncWithMocks(env);

    expect(mockFasGetUpdatedEmployees).not.toHaveBeenCalled();
    expect(mockReleaseSyncLock).not.toHaveBeenCalled();
  });

  it("runFasFullSync throws sync error and releases lock", async () => {
    const { runFasFullSync: runFasFullSyncWithMocks } =
      await import("../sync-jobs");
    state.selectPlans.push({ get: { id: "system" } });
    mockFasGetUpdatedEmployees.mockRejectedValue(new Error("fas down"));
    const env = buildEnv({
      FAS_HYPERDRIVE: {
        connectionString: "conn",
        host: "host",
        port: 3306,
        user: "user",
        password: "pw",
        database: "db",
      },
    });

    await expect(runFasFullSyncWithMocks(env)).rejects.toThrow("fas down");
    expect(mockReleaseSyncLock).toHaveBeenCalledWith(env.KV, "fas-full");
  });

  it("scheduled routes */5 trigger to full sync branch and side jobs", async () => {
    const { scheduled: scheduledWithMocks } = await import("../index");
    state.selectPlans.push({ get: { id: "system" } });
    const kv = {
      get: vi.fn(async () => null),
      put: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
    } as unknown as KVNamespace;
    const env = buildEnv({
      KV: kv,
      FAS_HYPERDRIVE: {
        connectionString: "conn",
        host: "host",
        port: 3306,
        user: "user",
        password: "pw",
        database: "db",
      },
    });
    const waitUntil = vi.fn((promise: Promise<void>) => promise);
    const ctx = {
      waitUntil,
      passThroughOnException: vi.fn(),
    } as unknown as ExecutionContext;

    scheduledWithMocks(
      { cron: "*/5 * * * *" } as ScheduledController,
      env,
      ctx,
    );
    await waitUntil.mock.calls[0][0];

    expect(mockAcquireSyncLock).toHaveBeenCalledWith(env.KV, "fas-full", 600);
  });

  it("scheduled routes */5 trigger to incremental path when full sync marker exists", async () => {
    const { scheduled: scheduledWithMocks } = await import("../index");
    state.selectPlans.push({ get: { id: "system" } });
    const kv = {
      get: vi.fn(async () => "done"),
      put: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
    } as unknown as KVNamespace;
    const env = buildEnv({
      KV: kv,
      FAS_HYPERDRIVE: {
        connectionString: "conn",
        host: "host",
        port: 3306,
        user: "user",
        password: "pw",
        database: "db",
      },
    });
    const waitUntil = vi.fn((promise: Promise<void>) => promise);
    const ctx = {
      waitUntil,
      passThroughOnException: vi.fn(),
    } as unknown as ExecutionContext;

    scheduledWithMocks(
      { cron: "*/5 * * * *" } as ScheduledController,
      env,
      ctx,
    );
    await waitUntil.mock.calls[0][0];

    expect(mockAcquireSyncLock).toHaveBeenCalledWith(env.KV, "fas", 240);
  });

  it("scheduled routes monthly trigger to month-end jobs", async () => {
    const { scheduled: scheduledWithMocks } = await import("../index");
    state.selectPlans.push(
      { get: { id: "system" } },
      { all: [] },
      { all: [] },
      { get: { id: "system" } },
      { value: [] },
    );

    const env = buildEnv({
      FAS_HYPERDRIVE: {
        connectionString: "conn",
        host: "host",
        port: 3306,
        user: "user",
        password: "pw",
        database: "db",
      },
    });
    const waitUntil = vi.fn((promise: Promise<void>) => promise);
    const ctx = {
      waitUntil,
      passThroughOnException: vi.fn(),
    } as unknown as ExecutionContext;

    scheduledWithMocks({ cron: "0 0 1 * *" } as ScheduledController, env, ctx);
    await waitUntil.mock.calls[0][0];

    expect(mockInfo).toHaveBeenCalled();
  });

  it("scheduled routes weekly trigger to data retention", async () => {
    const { scheduled: scheduledWithMocks } = await import("../index");
    state.selectPlans.push({ get: { id: "system" } });
    state.deletePlans.push([], [], []);

    const env = buildEnv();
    const waitUntil = vi.fn((promise: Promise<void>) => promise);
    const ctx = {
      waitUntil,
      passThroughOnException: vi.fn(),
    } as unknown as ExecutionContext;

    scheduledWithMocks(
      { cron: "0 3 * * SUN" } as ScheduledController,
      env,
      ctx,
    );
    await waitUntil.mock.calls[0][0];

    expect(mockInfo).toHaveBeenCalled();
  });

  it("scheduled routes daily trigger to full-sync, overdue, and pii jobs", async () => {
    const { scheduled: scheduledWithMocks } = await import("../index");
    state.selectPlans.push(
      { get: { id: "system" } },
      { get: { id: "system" } },
      { value: [] },
      { value: [] },
    );

    const env = buildEnv({
      FAS_HYPERDRIVE: {
        connectionString: "conn",
        host: "host",
        port: 3306,
        user: "user",
        password: "pw",
        database: "db",
      },
    });

    const waitUntil = vi.fn((promise: Promise<void>) => promise);
    const ctx = {
      waitUntil,
      passThroughOnException: vi.fn(),
    } as unknown as ExecutionContext;

    scheduledWithMocks({ cron: "0 21 * * *" } as ScheduledController, env, ctx);
    await waitUntil.mock.calls[0][0];

    expect(mockAcquireSyncLock).toHaveBeenCalledWith(env.KV, "fas-full", 600);
  });
});
