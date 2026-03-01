import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, sql, gte, lt } from "drizzle-orm";
import {
  posts,
  users,
  reviews,
  pointsLedger,
  manualApprovals,
  auditLogs,
} from "../../../db/schema";
import { success, error } from "../../../lib/response";
import {
  AdminReviewPostSchema,
  AdminManualApprovalSchema,
} from "../../../validators/schemas";
import { AppContext, getTodayRange } from "../helpers";

export async function reviewPostHandler(c: AppContext) {
  const db = drizzle(c.env.DB);
  const { user: reviewer } = c.get("auth");
  const postId = c.req.param("id");

  const body = c.req.valid("json" as never) as z.infer<
    typeof AdminReviewPostSchema
  >;

  const validActions = ["APPROVE", "REJECT", "REQUEST_MORE"];
  if (!body.action || !validActions.includes(body.action)) {
    return error(c, "INVALID_ACTION", "Invalid action", 400);
  }

  const post = await db.select().from(posts).where(eq(posts.id, postId)).get();

  if (!post) {
    return error(c, "POST_NOT_FOUND", "Post not found", 404);
  }

  const isApproveAction = body.action === "APPROVE";
  const pointsToAward = post.isPotentialDuplicate ? 0 : body.pointsToAward || 0;
  let todayRange: { start: Date; end: Date } | null = null;

  let approvedCountCondition = sql`1 = 1`;
  let pointsLimitCondition = sql`1 = 1`;
  if (isApproveAction) {
    const { start, end } = getTodayRange();
    todayRange = { start, end };
    approvedCountCondition = sql`
       (
         SELECT COUNT(*)
         FROM ${reviews}
         INNER JOIN ${posts} ON ${reviews.postId} = ${posts.id}
         WHERE ${reviews.action} = 'APPROVE'
           AND ${posts.userId} = ${post.userId}
           AND ${posts.siteId} = ${post.siteId}
           AND ${reviews.createdAt} >= ${start}
           AND ${reviews.createdAt} < ${end}
       ) < 3
     `;
    pointsLimitCondition = sql`
       (
         SELECT COALESCE(SUM(${pointsLedger.amount}), 0)
         FROM ${pointsLedger}
         WHERE ${pointsLedger.userId} = ${post.userId}
           AND ${pointsLedger.siteId} = ${post.siteId}
           AND ${pointsLedger.occurredAt} >= ${start}
           AND ${pointsLedger.occurredAt} < ${end}
       ) + ${pointsToAward > 0 ? pointsToAward : 0} <= 30
     `;
  }

  const review = await db
    .insert(reviews)
    .select(
      db
        .select({
          postId: sql<string>`${postId}`.as("postId"),
          adminId: sql<string>`${reviewer.id}`.as("adminId"),
          action: sql<typeof body.action>`${body.action}`.as("action"),
          comment: sql<string | null>`${body.comment ?? null}`.as("comment"),
          reasonCode: sql<string | null>`${body.reasonCode ?? null}`.as(
            "reasonCode",
          ),
        })
        .from(posts)
        .where(
          and(
            eq(posts.id, post.id),
            approvedCountCondition,
            pointsLimitCondition,
          ),
        )
        .limit(1),
    )
    .returning()
    .get();

  if (!review && isApproveAction) {
    const { start, end } = todayRange || getTodayRange();
    const [approvedCountRow, pointsSumRow] = await Promise.all([
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(reviews)
        .innerJoin(posts, eq(reviews.postId, posts.id))
        .where(
          and(
            eq(reviews.action, "APPROVE"),
            eq(posts.userId, post.userId),
            eq(posts.siteId, post.siteId),
            gte(reviews.createdAt, start),
            lt(reviews.createdAt, end),
          ),
        )
        .get(),
      db
        .select({
          total: sql<number>`COALESCE(SUM(${pointsLedger.amount}), 0)`,
        })
        .from(pointsLedger)
        .where(
          and(
            eq(pointsLedger.userId, post.userId),
            eq(pointsLedger.siteId, post.siteId),
            gte(pointsLedger.occurredAt, start),
            lt(pointsLedger.occurredAt, end),
          ),
        )
        .get(),
    ]);

    const approvedCount = approvedCountRow?.count ?? 0;
    const pointsAwarded = pointsSumRow?.total ?? 0;
    return error(
      c,
      "DAILY_LIMIT_EXCEEDED",
      `Daily limit exceeded: ${approvedCount} approved posts and ${pointsAwarded} points today for this site.`,
      400,
    );
  }

  if (!review) {
    return error(c, "REVIEW_CREATE_FAILED", "Failed to create review", 500);
  }

  if (body.action === "APPROVE" && pointsToAward > 0) {
    const now = new Date();
    const settleMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const reasonText = `Post approved: ${post.id}`;
    const pointsEntry = await db
      .insert(pointsLedger)
      .select(
        db
          .select({
            userId: sql<string>`${post.userId}`.as("userId"),
            siteId: sql<string>`${post.siteId}`.as("siteId"),
            postId: sql<string>`${post.id}`.as("postId"),
            amount: sql<number>`${pointsToAward}`.as("amount"),
            reasonCode: sql<string>`${"POST_APPROVED"}`.as("reasonCode"),
            reasonText: sql<string>`${reasonText}`.as("reasonText"),
            adminId: sql<string>`${reviewer.id}`.as("adminId"),
            settleMonth: sql<string>`${settleMonth}`.as("settleMonth"),
          })
          .from(posts)
          .where(
            and(
              eq(posts.id, post.id),
              sql`
                 (
                   SELECT COALESCE(SUM(${pointsLedger.amount}), 0)
                   FROM ${pointsLedger}
                   WHERE ${pointsLedger.userId} = ${post.userId}
                     AND ${pointsLedger.siteId} = ${post.siteId}
                     AND ${pointsLedger.occurredAt} >= ${todayRange?.start ?? now}
                     AND ${pointsLedger.occurredAt} < ${todayRange?.end ?? now}
                 ) + ${pointsToAward} <= 30
               `,
            ),
          )
          .limit(1),
      )
      .returning()
      .get();

    if (!pointsEntry) {
      await db.delete(reviews).where(eq(reviews.id, review.id)).run();
      return error(
        c,
        "DAILY_LIMIT_EXCEEDED",
        "Daily limit exceeded while awarding points",
        400,
      );
    }
  }

  if (body.action === "REJECT" && body.reasonCode === "FALSE") {
    const userRecord = await db
      .select({
        falseReportCount: users.falseReportCount,
        restrictedUntil: users.restrictedUntil,
      })
      .from(users)
      .where(eq(users.id, post.userId))
      .get();

    if (userRecord) {
      const nextCount = (userRecord.falseReportCount ?? 0) + 1;
      const now = new Date();
      let restrictedUntil = userRecord.restrictedUntil ?? null;

      if (nextCount >= 3 && (!restrictedUntil || restrictedUntil <= now)) {
        restrictedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      }

      await db
        .update(users)
        .set({
          falseReportCount: nextCount,
          restrictedUntil,
          updatedAt: new Date(),
        })
        .where(eq(users.id, post.userId));
    }
  }

  await db.insert(auditLogs).values({
    action: "POST_REVIEWED",
    actorId: reviewer.id,
    targetType: "POST",
    targetId: postId,
    reason: `Action: ${body.action}, Points: ${pointsToAward}`,
  });

  return success(c, { review });
}

export async function manualApprovalHandler(c: AppContext) {
  const db = drizzle(c.env.DB);
  const { user: approver } = c.get("auth");

  const body = c.req.valid("json" as never) as z.infer<
    typeof AdminManualApprovalSchema
  >;

  if (!body.userId || !body.siteId || !body.reason) {
    return error(
      c,
      "MISSING_REQUIRED_FIELDS",
      "userId, siteId, and reason are required",
      400,
    );
  }

  const targetUser = await db
    .select()
    .from(users)
    .where(eq(users.id, body.userId))
    .get();

  if (!targetUser) {
    return error(c, "USER_NOT_FOUND", "User not found", 404);
  }

  const now = new Date();
  const approval = await db
    .insert(manualApprovals)
    .values({
      userId: body.userId,
      siteId: body.siteId,
      approvedById: approver.id,
      reason: body.reason,
      validDate: now,
      status: "APPROVED",
      approvedAt: new Date(),
    })
    .returning()
    .get();

  await db.insert(auditLogs).values({
    action: "MANUAL_APPROVAL_CREATED",
    actorId: approver.id,
    targetType: "MANUAL_APPROVAL",
    targetId: approval.id,
    reason: `User: ${body.userId}, Site: ${body.siteId}`,
  });

  return success(c, { approval }, 201);
}
