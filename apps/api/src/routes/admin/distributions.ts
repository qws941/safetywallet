import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Env, AuthContext } from "../../types";
import { pointsLedger, users } from "../../db/schema";
import { error, success } from "../../lib/response";
import { requireManagerOrAdmin } from "./helpers";
import { DistributionQuerySchema } from "../../validators/schemas";

const app = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

const DISTRIBUTION_REASON_CODES = [
  "MANUAL_AWARD",
  "VOTE_REWARD_RANK_1",
  "VOTE_REWARD_RANK_2",
  "VOTE_REWARD_RANK_3",
  "MONTHLY_BONUS",
  "QUIZ_PASS",
] as const;

app.get("/distributions", requireManagerOrAdmin, async (c) => {
  const db = drizzle(c.env.DB);
  const siteId = c.req.query("siteId")?.trim();

  const parsed = DistributionQuerySchema.safeParse({
    month: c.req.query("month"),
    reasonCode: c.req.query("reasonCode"),
    page: c.req.query("page"),
    limit: c.req.query("limit"),
  });

  if (!parsed.success) {
    return error(c, "INVALID_QUERY", "Invalid query parameters", 400);
  }

  const page = parsed.data.page ?? 1;
  const limit = parsed.data.limit ?? 20;
  const offset = (page - 1) * limit;

  if (
    parsed.data.reasonCode &&
    !DISTRIBUTION_REASON_CODES.includes(
      parsed.data.reasonCode as (typeof DISTRIBUTION_REASON_CODES)[number],
    )
  ) {
    return error(c, "INVALID_REASON_CODE", "Unsupported reasonCode", 400);
  }

  const conditions: SQL[] = [
    inArray(pointsLedger.reasonCode, [...DISTRIBUTION_REASON_CODES]),
  ];
  if (siteId) {
    conditions.push(eq(pointsLedger.siteId, siteId));
  }
  if (parsed.data.month) {
    conditions.push(eq(pointsLedger.settleMonth, parsed.data.month));
  }
  if (parsed.data.reasonCode) {
    conditions.push(eq(pointsLedger.reasonCode, parsed.data.reasonCode));
  }

  const [rows, summary] = await Promise.all([
    db
      .select({
        userId: pointsLedger.userId,
        userName: users.name,
        amount: pointsLedger.amount,
        reasonCode: pointsLedger.reasonCode,
        reasonText: pointsLedger.reasonText,
        createdAt: pointsLedger.createdAt,
      })
      .from(pointsLedger)
      .leftJoin(users, eq(pointsLedger.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(pointsLedger.createdAt))
      .limit(limit)
      .offset(offset)
      .all(),
    db
      .select({
        totalAmount: sql<number>`COALESCE(SUM(${pointsLedger.amount}), 0)`,
        recordCount: sql<number>`COUNT(*)`,
      })
      .from(pointsLedger)
      .where(and(...conditions))
      .get(),
  ]);

  return success(c, {
    records: rows,
    summary: {
      totalAmount: summary?.totalAmount ?? 0,
      recordCount: summary?.recordCount ?? 0,
    },
    pagination: {
      page,
      limit,
      count: rows.length,
    },
  });
});

export default app;
