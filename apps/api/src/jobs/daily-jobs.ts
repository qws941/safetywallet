import type { Env } from "../types";
import { drizzle } from "drizzle-orm/d1";
import { eq, sql, and, gte, lt } from "drizzle-orm";
import {
  pointsLedger,
  users,
  siteMemberships,
  auditLogs,
  actions,
  posts,
  announcements,
  votes,
  attendance,
  apiMetrics,
} from "../db/schema";
import { dbBatchChunked } from "../db/helpers";
import {
  fireAlert,
  getAlertConfig,
  buildHighErrorRateAlert,
  buildHighLatencyAlert,
} from "../lib/alerting";
import {
  log,
  getKSTDate,
  chunkArray,
  getOrCreateSystemUser,
  deleteFromOptionalTableByAge,
} from "./helpers";

export async function runDataRetention(env: Env): Promise<void> {
  const db = drizzle(env.DB);
  const kstNow = getKSTDate();
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
  const THREE_YEARS_MS = 3 * 365 * 24 * 60 * 60 * 1000;
  const oneYearCutoffDate = new Date(kstNow.getTime() - ONE_YEAR_MS);
  const cutoffDate = new Date(kstNow.getTime() - THREE_YEARS_MS);

  log.info("Running data retention cleanup", {
    cutoff: cutoffDate.toISOString(),
  });

  const systemUserId = await getOrCreateSystemUser(db);

  const deletedActions = await db
    .delete(actions)
    .where(lt(actions.createdAt, cutoffDate))
    .returning({ id: actions.id });

  const deletedPosts = await db
    .delete(posts)
    .where(lt(posts.createdAt, cutoffDate))
    .returning({ id: posts.id });

  const deletedAuditLogs = await db
    .delete(auditLogs)
    .where(lt(auditLogs.createdAt, cutoffDate))
    .returning({ id: auditLogs.id });

  const deletedAttendanceLogs = await db
    .delete(attendance)
    .where(lt(attendance.createdAt, cutoffDate))
    .returning({ id: attendance.id });

  const deletedVotes = await db
    .delete(votes)
    .where(lt(votes.votedAt, cutoffDate))
    .returning({ id: votes.id });

  const deletedPointsLedger = await db
    .delete(pointsLedger)
    .where(
      and(
        lt(pointsLedger.createdAt, cutoffDate),
        sql`${pointsLedger.reasonCode} != 'MONTHLY_SNAPSHOT'`,
      ),
    )
    .returning({ id: pointsLedger.id });

  const deletedNotifications = await deleteFromOptionalTableByAge(
    env,
    "notifications",
    ["created_at", "createdAt", "sent_at", "sentAt"],
    oneYearCutoffDate,
  );

  const deletedVoteResults = await deleteFromOptionalTableByAge(
    env,
    "vote_results",
    ["created_at", "createdAt", "calculated_at", "calculatedAt"],
    cutoffDate,
  );

  const deletedAttendanceLogsLegacy = await deleteFromOptionalTableByAge(
    env,
    "attendance_logs",
    ["created_at", "createdAt", "checkin_at", "checkinAt"],
    cutoffDate,
  );

  const staleImageKeys: string[] = [];
  let cursor: string | undefined;
  do {
    const listed = await env.R2.list({ cursor });
    for (const object of listed.objects) {
      if (object.uploaded < cutoffDate) {
        staleImageKeys.push(object.key);
      }
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  for (const keyChunk of chunkArray(staleImageKeys, 100)) {
    if (keyChunk.length > 0) {
      await env.R2.delete(keyChunk);
    }
  }

  log.info("Deleted data retention entries", {
    actions: deletedActions.length,
    posts: deletedPosts.length,
    auditLogs: deletedAuditLogs.length,
    attendanceLogs: deletedAttendanceLogs.length,
    votes: deletedVotes.length,
    voteResults: deletedVoteResults,
    pointsLedger: deletedPointsLedger.length,
    notifications: deletedNotifications,
    attendanceLogsLegacy: deletedAttendanceLogsLegacy,
    r2Images: staleImageKeys.length,
  });

  await db.insert(auditLogs).values({
    actorId: systemUserId,
    action: "DATA_RETENTION_CLEANUP",
    targetType: "SYSTEM",
    targetId: cutoffDate.toISOString(),
    reason: JSON.stringify({
      cutoffDate: cutoffDate.toISOString(),
      deletedActions: deletedActions.length,
      deletedPosts: deletedPosts.length,
      deletedAuditLogs: deletedAuditLogs.length,
      deletedAttendanceLogs: deletedAttendanceLogs.length,
      deletedVotes: deletedVotes.length,
      deletedVoteResults,
      deletedPointsLedger: deletedPointsLedger.length,
      deletedNotifications,
      deletedAttendanceLogsLegacy,
      deletedR2Images: staleImageKeys.length,
    }),
    ip: "SYSTEM",
  });
}

export async function runOverdueActionCheck(env: Env): Promise<void> {
  const db = drizzle(env.DB);
  const systemUserId = await getOrCreateSystemUser(db);
  const now = new Date();

  const overdueActions = await db
    .select({ id: actions.id, postId: actions.postId })
    .from(actions)
    .where(
      and(
        sql`${actions.actionStatus} IN ('ASSIGNED', 'IN_PROGRESS')`,
        lt(actions.dueDate, now),
      ),
    );

  if (overdueActions.length === 0) return;

  const ops: Promise<unknown>[] = [];

  for (const action of overdueActions) {
    ops.push(
      db
        .update(actions)
        .set({ actionStatus: "OVERDUE" })
        .where(eq(actions.id, action.id)),
    );

    if (action.postId) {
      ops.push(
        db
          .update(posts)
          .set({ actionStatus: "OVERDUE", updatedAt: now })
          .where(eq(posts.id, action.postId)),
      );

      ops.push(
        db.insert(auditLogs).values({
          actorId: systemUserId,
          action: "ACTION_STATUS_CHANGE",
          targetType: "ACTION",
          targetId: action.id,
          reason: JSON.stringify({
            from: "IN_PROGRESS",
            to: "OVERDUE",
            cause: "automated_overdue_check",
          }),
          createdAt: now,
        }),
      );
    }
  }

  await dbBatchChunked(db, ops);

  log.info("Overdue action check complete", { count: overdueActions.length });
}

export async function runPiiLifecycleCleanup(env: Env): Promise<void> {
  const db = drizzle(env.DB);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const usersToHardDelete = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        sql`${users.deletionRequestedAt} IS NOT NULL`,
        lt(users.deletionRequestedAt, thirtyDaysAgo),
        sql`${users.deletedAt} IS NULL`,
      ),
    );

  if (usersToHardDelete.length === 0) return;

  const ops = usersToHardDelete.map((user) =>
    db
      .update(users)
      .set({
        phoneEncrypted: "",
        phoneHash: "",
        name: "[삭제됨]",
        nameMasked: "[삭제됨]",
        dobEncrypted: "",
        dobHash: "",
        companyName: null,
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, user.id)),
  );

  try {
    await dbBatchChunked(db, ops);
  } catch (err) {
    log.error("PII lifecycle cleanup batch failed", {
      userCount: usersToHardDelete.length,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  const deletedUserIds = usersToHardDelete.map((user) => user.id);

  const postOps = deletedUserIds.map((userId) =>
    db
      .update(posts)
      .set({
        isAnonymous: true,
        updatedAt: now,
      })
      .where(eq(posts.userId, userId)),
  );

  const membershipOps = deletedUserIds.map((userId) =>
    db
      .update(siteMemberships)
      .set({
        status: "REMOVED",
        leftAt: now,
        leftReason: "USER_DELETED",
      })
      .where(eq(siteMemberships.userId, userId)),
  );

  const attendanceOps = deletedUserIds.map((userId) =>
    db
      .update(attendance)
      .set({ userId: null })
      .where(eq(attendance.userId, userId)),
  );

  const cascadeOps = [...postOps, ...membershipOps, ...attendanceOps];
  if (cascadeOps.length > 0) {
    await dbBatchChunked(db, cascadeOps);
  }

  log.info("PII lifecycle cleanup", {
    usersHardDeleted: usersToHardDelete.length,
  });
}

export async function publishScheduledAnnouncements(env: Env): Promise<void> {
  const db = drizzle(env.DB);
  const now = new Date();

  const result = await db
    .update(announcements)
    .set({ isPublished: true })
    .where(
      and(
        eq(announcements.isPublished, false),
        lt(announcements.scheduledAt, now),
      ),
    );

  const count = result.meta?.changes ?? 0;
  if (count > 0) {
    log.info("Published scheduled announcements", { count });
  }
}

export async function runMetricsAlertCheck(env: Env): Promise<void> {
  if (!env.KV) return;

  const config = await getAlertConfig(env.KV);
  if (!config.enabled || !config.webhookUrl) return;

  const db = drizzle(env.DB);
  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const fromBucket = fiveMinAgo.toISOString().slice(0, 16);

  const [summary] = await db
    .select({
      totalRequests: sql<number>`coalesce(sum(${apiMetrics.requestCount}), 0)`,
      total5xx: sql<number>`coalesce(sum(${apiMetrics.status5xx}), 0)`,
      avgDurationMs: sql<number>`coalesce(cast(sum(${apiMetrics.totalDurationMs}) as real) / nullif(sum(${apiMetrics.requestCount}), 0), 0)`,
      maxDurationMs: sql<number>`coalesce(max(${apiMetrics.maxDurationMs}), 0)`,
    })
    .from(apiMetrics)
    .where(gte(apiMetrics.bucket, fromBucket));

  if (!summary || summary.totalRequests === 0) return;

  const errorRate = (summary.total5xx / summary.totalRequests) * 100;
  if (errorRate > config.errorRateThresholdPercent) {
    await fireAlert(
      env.KV,
      buildHighErrorRateAlert(
        errorRate,
        config.errorRateThresholdPercent,
        summary.total5xx,
        summary.totalRequests,
      ),
      env.ALERT_WEBHOOK_URL,
    );
  }

  if (summary.avgDurationMs > config.latencyThresholdMs) {
    await fireAlert(
      env.KV,
      buildHighLatencyAlert(
        summary.avgDurationMs,
        config.latencyThresholdMs,
        summary.maxDurationMs,
      ),
      env.ALERT_WEBHOOK_URL,
    );
  }
}
