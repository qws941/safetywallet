import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { auditLogs } from "../../../db/schema";
import { success, error } from "../../../lib/response";
import { createLogger } from "../../../lib/logger";
import { requireAdmin } from "../helpers";
import {
  fasGetAllEmployeesPaginated,
  resolveFasSource,
} from "../../../lib/fas";
import {
  syncFasEmployeesToD1,
  deactivateRetiredEmployees,
} from "../../../lib/fas-sync";
import { normalizeAccsDay } from "./helpers";
import type { AdminFasBindings, AdminFasVariables } from "./types";

const logger = createLogger("admin/fas");

const app = new Hono<{
  Bindings: AdminFasBindings;
  Variables: AdminFasVariables;
}>();

app.post("/fas/sync-hyperdrive", requireAdmin, async (c) => {
  if (!c.env.FAS_HYPERDRIVE) {
    return error(
      c,
      "SERVICE_UNAVAILABLE",
      "FAS_HYPERDRIVE not configured",
      503,
    );
  }

  try {
    const { user: currentUser } = c.get("auth");
    const body = (await c.req
      .json<{
        offset?: number;
        limit?: number;
        accsDay?: string;
        source?: string;
      }>()
      .catch(() => ({}))) as {
      offset?: number;
      limit?: number;
      accsDay?: string;
      source?: string;
    };

    const offset = Number.isFinite(body.offset)
      ? Math.max(0, Math.trunc(body.offset as number))
      : 0;
    const limit = Number.isFinite(body.limit)
      ? Math.min(500, Math.max(1, Math.trunc(body.limit as number)))
      : 100;
    const normalizedAccsDay = normalizeAccsDay(body.accsDay);
    const source = resolveFasSource(body.source);
    if (body.accsDay && !normalizedAccsDay) {
      return error(
        c,
        "VALIDATION_ERROR",
        "accsDay must be YYYYMMDD or YYYY-MM-DD",
        400,
      );
    }

    const db = drizzle(c.env.DB);
    const runId = crypto.randomUUID();

    await db.insert(auditLogs).values({
      action: "FAS_HYPERDRIVE_SYNC_TRIGGERED",
      actorId: currentUser.id,
      targetType: "FAS_SYNC",
      targetId: runId,
      reason: JSON.stringify({
        offset,
        limit,
        accsDay: normalizedAccsDay ?? null,
        source: source.dbName,
      }),
    });

    const { employees, total } = await fasGetAllEmployeesPaginated(
      c.env.FAS_HYPERDRIVE,
      offset,
      limit,
      source,
    );

    const activeEmployees = employees.filter((e) => e.stateFlag === "W");
    const retiredEmplCds = employees
      .filter((e) => e.stateFlag !== "W")
      .map((e) => e.emplCd);

    const syncResult = await syncFasEmployeesToD1(activeEmployees, db, {
      HMAC_SECRET: c.env.HMAC_SECRET,
      ENCRYPTION_KEY: c.env.ENCRYPTION_KEY,
    });

    let deactivated = 0;
    if (retiredEmplCds.length > 0) {
      deactivated = await deactivateRetiredEmployees(retiredEmplCds, db);
    }

    const hasMore = offset + employees.length < total;
    const nextOffset = hasMore ? offset + employees.length : null;

    await db.insert(auditLogs).values({
      action: "FAS_HYPERDRIVE_SYNC_COMPLETED",
      actorId: currentUser.id,
      targetType: "FAS_SYNC",
      targetId: runId,
      reason: JSON.stringify({
        offset,
        limit,
        fetched: employees.length,
        total,
        active: activeEmployees.length,
        retired: retiredEmplCds.length,
        created: syncResult.created,
        updated: syncResult.updated,
        skipped: syncResult.skipped,
        errors: syncResult.errors.length,
        deactivated,
        hasMore,
        nextOffset,
        accsDay: normalizedAccsDay ?? null,
        source: source.dbName,
      }),
    });

    return success(c, {
      message: "Hyperdrive sync completed",
      runId,
      source: source.dbName,
      batch: {
        offset,
        limit,
        fetched: employees.length,
        total,
        hasMore,
        nextOffset,
      },
      sync: syncResult,
      deactivated,
    });
  } catch (err) {
    try {
      const db = drizzle(c.env.DB);
      const { user: currentUser } = c.get("auth");
      await db.insert(auditLogs).values({
        action: "FAS_HYPERDRIVE_SYNC_FAILED",
        actorId: currentUser.id,
        targetType: "FAS_SYNC",
        targetId: crypto.randomUUID(),
        reason: JSON.stringify({
          message: err instanceof Error ? err.message : String(err),
        }),
      });
    } catch (auditErr) {
      logger.warn("Failed to write FAS sync failure audit log", {
        action: "fas_hyperdrive_sync_failed_audit_log_error",
        error: {
          name: "AuditLogWriteError",
          message:
            auditErr instanceof Error ? auditErr.message : String(auditErr),
        },
      });
    }
    return error(c, "INTERNAL_ERROR", String(err), 500);
  }
});

export default app;
