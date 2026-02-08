import type { Env } from "../types";
import { drizzle } from "drizzle-orm/d1";
import { eq, sql, and, gte, lt } from "drizzle-orm";
import {
  pointsLedger,
  siteMemberships,
  auditLogs,
  users,
  syncErrors,
} from "../db/schema";
import {
  fasGetUpdatedEmployees,
  testConnection as testFasConnection,
} from "../lib/fas-mariadb";
import { hmac } from "../lib/crypto";

function getKSTDate(): Date {
  const now = new Date();
  const kstOffset = 9 * 60;
  return new Date(now.getTime() + kstOffset * 60 * 1000);
}

function getMonthRange(date: Date): { start: Date; end: Date } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
  return { start, end };
}

function formatSettleMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      await new Promise((r) =>
        setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)),
      );
    }
  }
  throw new Error("Unreachable");
}

async function getOrCreateSystemUser(
  db: ReturnType<typeof drizzle>,
): Promise<string> {
  const existingSystem = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "SYSTEM"))
    .get();

  if (existingSystem) {
    return existingSystem.id;
  }

  const systemUserId = crypto.randomUUID();
  await db.insert(users).values({
    id: systemUserId,
    phone: "SYSTEM",
    role: "SYSTEM",
    name: "시스템",
  });

  return systemUserId;
}

async function runMonthEndSnapshot(env: Env): Promise<void> {
  const db = drizzle(env.DB);
  const kstNow = getKSTDate();
  const { start, end } = getMonthRange(kstNow);
  const settleMonth = formatSettleMonth(kstNow);

  console.log(`Running month-end snapshot for ${kstNow.toISOString()}`);

  const systemUserId = await getOrCreateSystemUser(db);

  const memberships = await db
    .select({
      userId: siteMemberships.userId,
      siteId: siteMemberships.siteId,
    })
    .from(siteMemberships)
    .where(eq(siteMemberships.status, "ACTIVE"))
    .all();

  let snapshotCount = 0;
  for (const membership of memberships) {
    const result = await db
      .select({
        balance: sql<number>`COALESCE(SUM(${pointsLedger.amount}), 0)`,
      })
      .from(pointsLedger)
      .where(
        and(
          eq(pointsLedger.userId, membership.userId),
          eq(pointsLedger.siteId, membership.siteId),
          gte(pointsLedger.createdAt, start),
          lt(pointsLedger.createdAt, end),
        ),
      )
      .get();

    const monthlyBalance = result?.balance || 0;
    if (monthlyBalance !== 0) {
      await db.insert(pointsLedger).values({
        userId: membership.userId,
        siteId: membership.siteId,
        amount: 0,
        reasonCode: "MONTHLY_SNAPSHOT",
        reasonText: `월간 정산 스냅샷 - ${kstNow.getFullYear()}년 ${kstNow.getMonth() + 1}월 (잔액: ${monthlyBalance})`,
        settleMonth,
      });
      snapshotCount++;
    }
  }

  await db.insert(auditLogs).values({
    actorId: systemUserId,
    action: "MONTH_END_SNAPSHOT",
    targetType: "POINTS",
    targetId: settleMonth,
    reason: JSON.stringify({
      period: settleMonth,
      membershipCount: memberships.length,
      snapshotCount,
    }),
    ip: "SYSTEM",
  });

  console.log(`Snapshot complete: ${snapshotCount} records created`);
}

async function runDataRetention(env: Env): Promise<void> {
  const db = drizzle(env.DB);
  const kstNow = getKSTDate();
  const THREE_YEARS_MS = 3 * 365 * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(kstNow.getTime() - THREE_YEARS_MS);

  console.log(
    `Running data retention cleanup, cutoff: ${cutoffDate.toISOString()}`,
  );

  const systemUserId = await getOrCreateSystemUser(db);

  const deletedAuditLogs = await db
    .delete(auditLogs)
    .where(lt(auditLogs.createdAt, cutoffDate))
    .returning({ id: auditLogs.id });

  console.log(`Deleted ${deletedAuditLogs.length} audit log entries`);

  await db.insert(auditLogs).values({
    actorId: systemUserId,
    action: "DATA_RETENTION_CLEANUP",
    targetType: "SYSTEM",
    targetId: cutoffDate.toISOString(),
    reason: JSON.stringify({
      cutoffDate: cutoffDate.toISOString(),
      deletedAuditLogs: deletedAuditLogs.length,
    }),
    ip: "SYSTEM",
  });
}

async function runFasSyncIncremental(env: Env): Promise<void> {
  if (!env.FAS_HYPERDRIVE) {
    console.log("FAS_HYPERDRIVE not configured, skipping sync");
    return;
  }

  const fasHyperdrive = env.FAS_HYPERDRIVE;

  const db = drizzle(env.DB);
  const kstNow = getKSTDate();
  const fiveMinutesAgo = new Date(kstNow.getTime() - 5 * 60 * 1000);

  console.log(
    `Running FAS incremental sync, since: ${fiveMinutesAgo.toISOString()}`,
  );

  const isConnected = await testFasConnection(env.FAS_HYPERDRIVE);
  if (!isConnected) {
    console.error("FAS MariaDB connection failed");
    return;
  }

  try {
    const companyId = env.FAS_COMPANY_ID ? parseInt(env.FAS_COMPANY_ID, 10) : 1;
    const updatedEmployees = await withRetry(() =>
      fasGetUpdatedEmployees(
        fasHyperdrive,
        companyId,
        fiveMinutesAgo.toISOString(),
      ),
    );

    console.log(`Found ${updatedEmployees.length} updated employees`);

    let upsertCount = 0;
    for (const employee of updatedEmployees) {
      const phoneHash = await hmac(env.HMAC_SECRET, employee.phone);
      const dobHash = employee.birthDate
        ? await hmac(env.HMAC_SECRET, employee.birthDate.replace(/-/g, ""))
        : null;

      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.phoneHash, phoneHash))
        .get();

      if (existingUser) {
        await db
          .update(users)
          .set({
            name: employee.name,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));
      } else if (dobHash) {
        await db.insert(users).values({
          id: crypto.randomUUID(),
          name: employee.name,
          phone: phoneHash,
          phoneHash,
          dobHash,
          role: "WORKER",
        });
      }
      upsertCount++;
    }

    console.log(`FAS sync complete: ${upsertCount} users upserted`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorCode =
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      typeof err.code === "string"
        ? err.code
        : "UNKNOWN";

    console.error("FAS incremental sync failed:", err);

    await db.insert(syncErrors).values({
      syncType: "FAS_WORKER",
      status: "OPEN",
      errorCode,
      errorMessage,
      payload: JSON.stringify({ timestamp: new Date().toISOString() }),
    });

    throw err;
  }
}

export async function scheduled(
  controller: ScheduledController,
  env: Env,
): Promise<void> {
  const trigger = controller.cron;
  console.log(`Scheduled trigger: ${trigger}`);

  try {
    if (trigger.startsWith("*/5 ") || trigger === "*/5 * * * *") {
      await runFasSyncIncremental(env);
    }

    if (trigger === "0 0 1 * *") {
      await runMonthEndSnapshot(env);
    }

    if (trigger === "0 3 * * 0") {
      await runDataRetention(env);
    }
  } catch (error) {
    console.error("Scheduled task error:", error);
    throw error;
  }
}
