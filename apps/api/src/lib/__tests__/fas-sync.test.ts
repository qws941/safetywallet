import { beforeEach, describe, expect, it, vi } from "vitest";
import { dbBatchChunked } from "../../db/helpers";
import type { FasEmployee } from "../fas-mariadb";
import {
  deactivateRetiredEmployees,
  socialNoToDob,
  syncFasEmployeesToD1,
  syncSingleFasEmployee,
  type SyncEnv,
} from "../fas-sync";
import { encrypt, hmac } from "../crypto";

vi.mock("../crypto", () => ({
  hmac: vi.fn(),
  encrypt: vi.fn(),
}));

vi.mock("../../db/helpers", () => ({
  dbBatchChunked: vi.fn(),
}));

vi.mock("../logger", () => ({
  createLogger: vi.fn(() => ({
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  })),
}));

interface SelectChain {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  all: ReturnType<typeof vi.fn>;
}

interface InsertChain {
  values: ReturnType<typeof vi.fn>;
}

interface UpdateSetChain {
  where: ReturnType<typeof vi.fn>;
}

interface UpdateChain {
  set: ReturnType<typeof vi.fn>;
}

interface MockDb {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
}

const getQueue: unknown[] = [];
const allQueue: unknown[][] = [];
const insertedValues: Array<Record<string, unknown>> = [];
const updatedValues: Array<Record<string, unknown>> = [];

const env: SyncEnv = {
  HMAC_SECRET: "hmac-secret",
  ENCRYPTION_KEY: "encrypt-key",
};

function dequeueGet(): unknown {
  return getQueue.shift();
}

function dequeueAll(): unknown[] {
  return allQueue.shift() ?? [];
}

function makeSelectChain(): SelectChain {
  const chain: SelectChain = {
    from: vi.fn(),
    where: vi.fn(),
    get: vi.fn(() => dequeueGet()),
    all: vi.fn(() => dequeueAll()),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  return chain;
}

function makeInsertChain(): InsertChain {
  const chain: InsertChain = {
    values: vi.fn((value: Record<string, unknown>) => {
      insertedValues.push(value);
      return Promise.resolve();
    }),
  };
  return chain;
}

function makeUpdateChain(): UpdateChain {
  const setChain: UpdateSetChain = {
    where: vi.fn(() => Promise.resolve({ success: true })),
  };
  const chain: UpdateChain = {
    set: vi.fn((value: Record<string, unknown>) => {
      updatedValues.push(value);
      return setChain;
    }),
  };
  return chain;
}

function makeDb(): MockDb {
  return {
    select: vi.fn(() => makeSelectChain()),
    insert: vi.fn(() => makeInsertChain()),
    update: vi.fn(() => makeUpdateChain()),
  };
}

function makeEmployee(overrides: Partial<FasEmployee> = {}): FasEmployee {
  return {
    emplCd: "E-001",
    name: "홍길동",
    partCd: "P-01",
    companyName: "안전건설",
    phone: "010-1234-5678",
    socialNo: "9001011",
    gojoCd: "G-01",
    jijoCd: "J-01",
    careCd: "C-01",
    roleCd: "R-01",
    stateFlag: "W",
    entrDay: "20240101",
    retrDay: "",
    rfid: "RFID-001",
    violCnt: 0,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    isActive: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getQueue.length = 0;
  allQueue.length = 0;
  insertedValues.length = 0;
  updatedValues.length = 0;

  vi.mocked(hmac).mockImplementation(
    async (_secret: string | CryptoKey, value: string) => `hmac:${value}`,
  );
  vi.mocked(encrypt).mockImplementation(
    async (_key: string | CryptoKey, value: string) => `enc:${value}`,
  );
  vi.mocked(dbBatchChunked).mockResolvedValue({
    totalOps: 0,
    completedOps: 0,
    failedChunks: 0,
    errors: [],
  });
  vi.spyOn(crypto, "randomUUID")
    .mockReturnValueOnce("uuid-1")
    .mockReturnValueOnce("uuid-2")
    .mockReturnValueOnce("uuid-3");
});

describe("fas-sync", () => {
  // ---------- socialNoToDob ----------

  describe("socialNoToDob", () => {
    describe("1900s century (gender digits 1, 2, 5, 6)", () => {
      it("converts gender digit 1 (male, 1900s)", () => {
        // 710410 + 1 → 19710410
        expect(socialNoToDob("7104101")).toBe("19710410");
      });

      it("converts gender digit 2 (female, 1900s)", () => {
        // 850325 + 2 → 19850325
        expect(socialNoToDob("8503252")).toBe("19850325");
      });

      it("converts gender digit 5 (foreign male, 1900s)", () => {
        expect(socialNoToDob("9001015")).toBe("19900101");
      });

      it("converts gender digit 6 (foreign female, 1900s)", () => {
        expect(socialNoToDob("7512316")).toBe("19751231");
      });
    });

    describe("2000s century (gender digits 3, 4, 7, 8)", () => {
      it("converts gender digit 3 (male, 2000s)", () => {
        expect(socialNoToDob("0501153")).toBe("20050115");
      });

      it("converts gender digit 4 (female, 2000s)", () => {
        expect(socialNoToDob("1003074")).toBe("20100307");
      });

      it("converts gender digit 7 (foreign male, 2000s)", () => {
        expect(socialNoToDob("0208127")).toBe("20020812");
      });

      it("converts gender digit 8 (foreign female, 2000s)", () => {
        expect(socialNoToDob("0712248")).toBe("20071224");
      });
    });

    describe("1800s century (gender digits 9, 0)", () => {
      it("converts gender digit 9 (male, 1800s)", () => {
        expect(socialNoToDob("9901019")).toBe("18990101");
      });

      it("converts gender digit 0 (female, 1800s)", () => {
        expect(socialNoToDob("8806150")).toBe("18880615");
      });
    });

    describe("edge cases", () => {
      it("returns null for null input", () => {
        expect(socialNoToDob(null)).toBeNull();
      });

      it("returns null for empty string", () => {
        expect(socialNoToDob("")).toBeNull();
      });

      it("returns null for string shorter than 7 chars", () => {
        expect(socialNoToDob("710410")).toBeNull();
      });

      it("returns null for invalid gender digit", () => {
        // 'A' is not a valid gender digit
        expect(socialNoToDob("710410A")).toBeNull();
      });

      it("handles strings longer than 7 chars (uses first 7)", () => {
        // Full 13-digit social number
        expect(socialNoToDob("7104101234567")).toBe("19710410");
      });
    });
  });

  describe("syncSingleFasEmployee", () => {
    it("inserts a new employee with normalized/encrypted PII", async () => {
      const db = makeDb();
      const employee = makeEmployee({
        emplCd: "E-NEW",
        name: "김",
        phone: "010-12 34-5678",
      });

      getQueue.push(undefined);
      getQueue.push({ id: "uuid-1", externalWorkerId: "E-NEW" });

      const result = await syncSingleFasEmployee(employee, db as never, env);

      expect(result).toEqual({ id: "uuid-1", externalWorkerId: "E-NEW" });
      expect(vi.mocked(hmac)).toHaveBeenCalledWith(
        "hmac-secret",
        "01012345678",
      );
      expect(vi.mocked(hmac)).toHaveBeenCalledWith("hmac-secret", "19900101");
      expect(vi.mocked(encrypt)).toHaveBeenCalledWith(
        "encrypt-key",
        "01012345678",
      );
      expect(vi.mocked(encrypt)).toHaveBeenCalledWith(
        "encrypt-key",
        "19900101",
      );

      expect(insertedValues).toHaveLength(1);
      expect(insertedValues[0]).toMatchObject({
        id: expect.stringMatching(/^uuid-/),
        name: "김",
        nameMasked: "김",
        phoneHash: "hmac:01012345678",
        phoneEncrypted: "enc:01012345678",
        dobHash: "hmac:19900101",
        dobEncrypted: "enc:19900101",
        externalSystem: "FAS",
        externalWorkerId: "E-NEW",
        role: "WORKER",
      });
    });

    it("updates existing employee and skips phone hashing when phone is null", async () => {
      const db = makeDb();
      const employee = makeEmployee({
        emplCd: "E-EXIST",
        name: "이순",
        phone: "",
        companyName: "",
        partCd: "",
      });

      getQueue.push({ id: "user-1", externalWorkerId: "E-EXIST" });
      getQueue.push({ id: "user-1", nameMasked: "이*" });

      const result = await syncSingleFasEmployee(employee, db as never, env);

      expect(result).toEqual({ id: "user-1", nameMasked: "이*" });
      expect(vi.mocked(hmac)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(hmac)).toHaveBeenCalledWith("hmac-secret", "19900101");
      expect(updatedValues).toHaveLength(1);
      expect(updatedValues[0]).toMatchObject({
        name: "이순",
        nameMasked: "이*",
        dobHash: "hmac:19900101",
        dobEncrypted: "enc:19900101",
        companyName: null,
        tradeType: null,
      });
      expect(updatedValues[0]).not.toHaveProperty("phoneHash");
      expect(updatedValues[0]).not.toHaveProperty("phoneEncrypted");
    });

    it("updates existing employee with phone-only PII and returns null when refetch misses", async () => {
      const db = makeDb();
      const employee = makeEmployee({
        emplCd: "E-EXIST-REFETCH-NULL",
        socialNo: "123",
      });

      getQueue.push({ id: "user-2", externalWorkerId: "E-EXIST-REFETCH-NULL" });
      getQueue.push(undefined);

      const result = await syncSingleFasEmployee(employee, db as never, env);

      expect(result).toBeNull();
      expect(updatedValues[0]).toMatchObject({
        phoneHash: "hmac:01012345678",
        phoneEncrypted: "enc:01012345678",
      });
      expect(updatedValues[0]).not.toHaveProperty("dobHash");
      expect(updatedValues[0]).not.toHaveProperty("dobEncrypted");
    });

    it("inserts employee with null PII and returns null when inserted row is missing", async () => {
      const db = makeDb();
      const employee = makeEmployee({
        emplCd: "E-NEW-NO-PII",
        phone: "",
        socialNo: "12",
        companyName: "",
        partCd: "",
      });

      getQueue.push(undefined);
      getQueue.push(undefined);

      const result = await syncSingleFasEmployee(employee, db as never, env);

      expect(result).toBeNull();
      expect(insertedValues[0]).toMatchObject({
        phoneHash: null,
        phoneEncrypted: null,
        dobHash: null,
        dobEncrypted: null,
        companyName: null,
        tradeType: null,
      });
    });
  });

  describe("syncFasEmployeesToD1", () => {
    it("returns zero counts for empty list", async () => {
      const db = makeDb();

      const result = await syncFasEmployeesToD1([], db as never, env);

      expect(result).toEqual({
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [],
      });
      expect(db.select).not.toHaveBeenCalled();
    });

    it("updates existing employee in bulk sync", async () => {
      const db = makeDb();
      const employee = makeEmployee({ emplCd: "E-UPD", name: "박철" });

      getQueue.push({ id: "user-upd", externalWorkerId: "E-UPD" });
      getQueue.push({ id: "user-upd", externalWorkerId: "E-UPD" });

      const result = await syncFasEmployeesToD1([employee], db as never, env);

      expect(result).toEqual({
        created: 0,
        updated: 1,
        skipped: 0,
        errors: [],
      });
      expect(updatedValues).toHaveLength(1);
      expect(updatedValues[0]).toMatchObject({
        name: "박철",
        nameMasked: "박*",
        phoneHash: "hmac:01012345678",
        phoneEncrypted: "enc:01012345678",
        dobHash: "hmac:19900101",
        dobEncrypted: "enc:19900101",
      });
    });

    it("normalizes empty company/trade fields to null during bulk update", async () => {
      const db = makeDb();
      const employee = makeEmployee({
        emplCd: "E-UPD-NULL",
        companyName: "",
        partCd: "",
      });

      getQueue.push({ id: "user-upd-null", externalWorkerId: "E-UPD-NULL" });
      getQueue.push({ id: "user-upd-null", externalWorkerId: "E-UPD-NULL" });

      const result = await syncFasEmployeesToD1([employee], db as never, env);

      expect(result).toEqual({
        created: 0,
        updated: 1,
        skipped: 0,
        errors: [],
      });
      expect(updatedValues[0]).toMatchObject({
        companyName: null,
        tradeType: null,
      });
    });

    it("creates new employee and clears PII on fallback-candidate collision", async () => {
      const db = makeDb();
      const employee = makeEmployee({ emplCd: "E-NEW-PII", name: "강호동" });

      getQueue.push(undefined);
      getQueue.push({ id: "candidate-1", externalSystem: "LEGACY" });

      const result = await syncFasEmployeesToD1([employee], db as never, env);

      expect(result).toEqual({
        created: 1,
        updated: 0,
        skipped: 0,
        errors: [],
      });
      expect(insertedValues).toHaveLength(1);
      expect(insertedValues[0]).toMatchObject({
        id: expect.stringMatching(/^uuid-/),
        nameMasked: "강*동",
        phoneHash: null,
        phoneEncrypted: null,
        dobHash: null,
        dobEncrypted: null,
      });
    });

    it("skips PII update when collision belongs to another user", async () => {
      const db = makeDb();
      const employee = makeEmployee({ emplCd: "E-COLLIDE", name: "정민" });

      getQueue.push({ id: "existing-1", externalWorkerId: "E-COLLIDE" });
      getQueue.push({ id: "different-user", externalWorkerId: "OTHER" });

      const result = await syncFasEmployeesToD1([employee], db as never, env);

      expect(result).toEqual({
        created: 0,
        updated: 1,
        skipped: 0,
        errors: [],
      });
      expect(updatedValues).toHaveLength(1);
      expect(updatedValues[0]).toMatchObject({
        name: "정민",
        nameMasked: "정*",
      });
      expect(updatedValues[0]).not.toHaveProperty("phoneHash");
      expect(updatedValues[0]).not.toHaveProperty("dobHash");
    });

    it("normalizes empty company/trade fields to null during bulk insert", async () => {
      const db = makeDb();
      const employee = makeEmployee({
        emplCd: "E-NEW-NULL",
        companyName: "",
        partCd: "",
      });

      getQueue.push(undefined);
      getQueue.push(undefined);

      const result = await syncFasEmployeesToD1([employee], db as never, env);

      expect(result).toEqual({
        created: 1,
        updated: 0,
        skipped: 0,
        errors: [],
      });
      expect(insertedValues[0]).toMatchObject({
        companyName: null,
        tradeType: null,
      });
    });

    it("continues processing when one employee fails", async () => {
      const db = makeDb();
      const bad = makeEmployee({ emplCd: "E-BAD" });
      const good = makeEmployee({ emplCd: "E-GOOD", phone: "", socialNo: "" });

      vi.mocked(hmac).mockImplementationOnce(async () => {
        throw new Error("hash failure");
      });

      getQueue.push(undefined);

      const result = await syncFasEmployeesToD1([bad, good], db as never, env);

      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toEqual(["E-BAD: hash failure"]);
      expect(insertedValues).toHaveLength(1);
      expect(insertedValues[0]).toMatchObject({
        externalWorkerId: "E-GOOD",
        phoneHash: null,
        phoneEncrypted: null,
        dobHash: null,
        dobEncrypted: null,
      });
    });

    it("handles non-Error throw values in bulk error aggregation", async () => {
      const db = makeDb();
      const employee = makeEmployee({ emplCd: "E-THROW" });

      vi.mocked(encrypt).mockImplementationOnce(async () => {
        throw "encryption failed";
      });

      const result = await syncFasEmployeesToD1([employee], db as never, env);

      expect(result).toEqual({
        created: 0,
        updated: 0,
        skipped: 0,
        errors: ["E-THROW: encryption failed"],
      });
    });
  });

  describe("deactivateRetiredEmployees", () => {
    it("returns 0 when retirement list is empty", async () => {
      const db = makeDb();

      const count = await deactivateRetiredEmployees([], db as never);

      expect(count).toBe(0);
      expect(vi.mocked(dbBatchChunked)).not.toHaveBeenCalled();
    });

    it("deactivates only active retired users", async () => {
      const db = makeDb();
      allQueue.push([
        { id: "u1", externalWorkerId: "E-1", deletedAt: null },
        { id: "u2", externalWorkerId: "E-2", deletedAt: null },
        { id: "u3", externalWorkerId: "E-3", deletedAt: new Date() },
        { id: "u4", externalWorkerId: null, deletedAt: null },
      ]);

      const count = await deactivateRetiredEmployees(
        ["E-1", "E-3"],
        db as never,
      );

      expect(count).toBe(1);
      expect(updatedValues).toHaveLength(1);
      expect(updatedValues[0]).toMatchObject({
        deletedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(vi.mocked(dbBatchChunked)).toHaveBeenCalledTimes(1);
      const batchArgs = vi.mocked(dbBatchChunked).mock.calls[0];
      expect(batchArgs[1]).toHaveLength(1);
    });

    it("deactivates multiple retirees", async () => {
      const db = makeDb();
      allQueue.push([
        { id: "u1", externalWorkerId: "R-1", deletedAt: null },
        { id: "u2", externalWorkerId: "R-2", deletedAt: null },
      ]);

      const count = await deactivateRetiredEmployees(
        ["R-1", "R-2"],
        db as never,
      );

      expect(count).toBe(2);
      expect(vi.mocked(dbBatchChunked)).toHaveBeenCalledTimes(1);
      const batchArgs = vi.mocked(dbBatchChunked).mock.calls[0];
      expect(batchArgs[1]).toHaveLength(2);
    });

    it("returns 0 when retired list exists but nobody needs deactivation", async () => {
      const db = makeDb();
      allQueue.push([
        { id: "u1", externalWorkerId: "R-1", deletedAt: new Date() },
        { id: "u2", externalWorkerId: "R-2", deletedAt: new Date() },
      ]);

      const count = await deactivateRetiredEmployees(
        ["R-1", "R-2"],
        db as never,
      );

      expect(count).toBe(0);
      expect(vi.mocked(dbBatchChunked)).not.toHaveBeenCalled();
    });
  });
});
