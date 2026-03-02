import type { Env } from "../types";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { users, auditLogs } from "../db/schema";
import {
  fasGetUpdatedEmployees,
  testConnection as testFasConnection,
} from "../lib/fas";
import {
  syncFasEmployeesToD1,
  deactivateRetiredEmployees,
} from "../lib/fas-sync";
import { acquireSyncLock, releaseSyncLock } from "../lib/sync-lock";
import {
  log,
  withRetry,
  getOrCreateSystemUser,
  getKSTDate,
  chunkArray,
  ensureSiteMemberships,
} from "./helpers";

export async function runFasFullSync(env: Env): Promise<void> {
  if (!env.FAS_HYPERDRIVE) {
    log.info("FAS_HYPERDRIVE not configured, skipping full sync");
    return;
  }

  const lock = await acquireSyncLock(env.KV, "fas-full", 600);
  if (!lock.acquired) {
    log.info("FAS full sync already in progress, skipping");
    return;
  }

  const db = drizzle(env.DB);
  const systemUserId = await getOrCreateSystemUser(db);

  try {
    const isConnected = await testFasConnection(env.FAS_HYPERDRIVE);
    if (!isConnected) {
      throw new Error("FAS MariaDB connection failed during full sync");
    }

    const allEmployees = await withRetry(() =>
      fasGetUpdatedEmployees(env.FAS_HYPERDRIVE!, null),
    );

    log.info("FAS full sync: fetched all employees", {
      count: allEmployees.length,
    });

    if (allEmployees.length === 0) return;

    const activeEmployees = allEmployees.filter((e) => e.stateFlag === "W");
    const retiredEmplCds = allEmployees
      .filter((e) => e.stateFlag !== "W")
      .map((e) => e.emplCd);

    const BATCH_SIZE = 50;
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    const totalErrors: string[] = [];

    for (let i = 0; i < activeEmployees.length; i += BATCH_SIZE) {
      const batch = activeEmployees.slice(i, i + BATCH_SIZE);
      const result = await syncFasEmployeesToD1(batch, db, {
        HMAC_SECRET: env.HMAC_SECRET,
        ENCRYPTION_KEY: env.ENCRYPTION_KEY,
      });
      totalCreated += result.created;
      totalUpdated += result.updated;
      totalSkipped += result.skipped;
      totalErrors.push(...result.errors);
    }

    let totalDeactivated = 0;
    if (retiredEmplCds.length > 0) {
      totalDeactivated = await deactivateRetiredEmployees(retiredEmplCds, db);
    }

    let membershipCreated = 0;
    try {
      const fasUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.externalSystem, "FAS"), isNull(users.deletedAt)))
        .all();
      membershipCreated = await ensureSiteMemberships(
        db,
        fasUsers.map((u) => u.id),
      );
    } catch (err) {
      log.error("Failed to ensure site memberships during full sync", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    await env.KV.put("fas-last-full-sync", new Date().toISOString());
    await env.KV.delete("fas-status");

    await db.insert(auditLogs).values({
      actorId: systemUserId,
      action: "FAS_FULL_SYNC_COMPLETED",
      targetType: "FAS_SYNC",
      targetId: "cron-full",
      reason: JSON.stringify({
        totalFas: allEmployees.length,
        active: activeEmployees.length,
        retired: retiredEmplCds.length,
        created: totalCreated,
        updated: totalUpdated,
        skipped: totalSkipped,
        deactivated: totalDeactivated,
        membershipCreated,
        errors: totalErrors.length,
      }),
    });

    log.info("FAS full sync complete", {
      totalFas: allEmployees.length,
      created: totalCreated,
      updated: totalUpdated,
      skipped: totalSkipped,
      deactivated: totalDeactivated,
      membershipCreated,
      errors: totalErrors.length,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorCode = "FULL_SYNC_FAILED";

    log.error("FAS full sync failed", {
      error: {
        name: "SyncFailureError",
        message: errorMessage,
      },
      errorCode,
      syncType: "FAS_WORKER",
    });

    throw err;
  } finally {
    await releaseSyncLock(env.KV, "fas-full");
  }
}

export async function runFasSyncIncremental(env: Env): Promise<void> {
  if (!env.FAS_HYPERDRIVE) {
    log.info("FAS_HYPERDRIVE not configured, skipping sync");
    return;
  }

  const lock = await acquireSyncLock(env.KV, "fas", 240);
  if (!lock.acquired) {
    log.info("FAS sync already in progress, skipping");
    return;
  }

  const db = drizzle(env.DB);
  const systemUserId = await getOrCreateSystemUser(db);
  const kstNow = getKSTDate();
  const fiveMinutesAgo = new Date(kstNow.getTime() - 5 * 60 * 1000);

  log.info("Running FAS incremental sync", {
    since: fiveMinutesAgo.toISOString(),
  });

  try {
    const isConnected = await testFasConnection(env.FAS_HYPERDRIVE);
    if (!isConnected) {
      throw new Error("FAS MariaDB connection failed during incremental sync");
    }

    const sinceStr = fiveMinutesAgo
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d{3}Z$/, "");
    const updatedEmployees = await withRetry(() =>
      fasGetUpdatedEmployees(env.FAS_HYPERDRIVE!, sinceStr),
    );

    log.info("Found updated employees", { count: updatedEmployees.length });

    if (updatedEmployees.length === 0) {
      if (env.KV) {
        try {
          await env.KV.delete("fas-status");
        } catch {}
      }
      return;
    }

    const syncResult = await syncFasEmployeesToD1(updatedEmployees, db, {
      HMAC_SECRET: env.HMAC_SECRET,
      ENCRYPTION_KEY: env.ENCRYPTION_KEY,
    });

    const retiredEmplCds = updatedEmployees
      .filter((e) => e.stateFlag !== "W")
      .map((e) => e.emplCd);

    let deactivatedCount = 0;
    if (retiredEmplCds.length > 0) {
      deactivatedCount = await deactivateRetiredEmployees(retiredEmplCds, db);
    }

    let membershipCreated = 0;
    try {
      const activeEmplCds = updatedEmployees
        .filter((e) => e.stateFlag === "W")
        .map((e) => e.emplCd);
      if (activeEmplCds.length > 0) {
        const syncedUserIds: string[] = [];
        for (const workerIdChunk of chunkArray(activeEmplCds, 50)) {
          const chunkUsers = await db
            .select({ id: users.id })
            .from(users)
            .where(
              and(
                eq(users.externalSystem, "FAS"),
                inArray(users.externalWorkerId, workerIdChunk),
                isNull(users.deletedAt),
              ),
            )
            .all();
          syncedUserIds.push(...chunkUsers.map((u) => u.id));
        }
        membershipCreated = await ensureSiteMemberships(db, [
          ...new Set(syncedUserIds),
        ]);
      }
    } catch (err) {
      log.error("Failed to ensure site memberships during incremental sync", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    log.info("FAS sync complete", {
      created: syncResult.created,
      updated: syncResult.updated,
      skipped: syncResult.skipped,
      deactivated: deactivatedCount,
      membershipCreated,
    });

    await db.insert(auditLogs).values({
      actorId: systemUserId,
      action: "FAS_SYNC_COMPLETED",
      targetType: "FAS_SYNC",
      targetId: "cron",
      reason: JSON.stringify({
        employeesFound: updatedEmployees.length,
        ...syncResult,
        deactivatedCount,
        membershipCreated,
        since: fiveMinutesAgo.toISOString(),
      }),
    });

    if (env.KV) {
      await env.KV.delete("fas-status");
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorCode =
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      typeof err.code === "string"
        ? err.code
        : "UNKNOWN";

    log.error("FAS incremental sync failed", {
      error: {
        name: "SyncFailureError",
        message: errorMessage,
      },
      errorCode,
      syncType: "FAS_WORKER",
    });

    throw err;
  } finally {
    await releaseSyncLock(env.KV, "fas");
  }
}
