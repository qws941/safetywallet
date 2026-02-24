import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Env, AuthContext } from "../../types";
import { disputes, pointsLedger, users } from "../../db/schema";
import { error, success } from "../../lib/response";
import { formatYearMonth, requireManagerOrAdmin } from "./helpers";
import {
  SettlementFinalizeSchema,
  SettlementSnapshotSchema,
} from "../../validators/schemas";

const app = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

function getMonthRange(month: string): { start: Date; end: Date } {
  const start = new Date(`${month}-01T00:00:00+09:00`);
  const [year, monthText] = month.split("-");
  const endMonth = Number(monthText) === 12 ? 1 : Number(monthText) + 1;
  const endYear = Number(monthText) === 12 ? Number(year) + 1 : Number(year);
  const end = new Date(
    `${String(endYear)}-${String(endMonth).padStart(2, "0")}-01T00:00:00+09:00`,
  );
  return { start, end };
}

function getSettlementFinalizedKey(month: string): string {
  return `settlement:${month}:finalized`;
}

function getSettlementSnapshotKey(month: string): string {
  return `settlement:${month}:snapshot`;
}

app.get("/settlements/status", requireManagerOrAdmin, async (c) => {
  const db = drizzle(c.env.DB);
  const month = c.req.query("month")?.trim() || formatYearMonth(new Date());
  const siteId = c.req.query("siteId")?.trim();

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return error(c, "INVALID_MONTH", "month must be YYYY-MM", 400);
  }

  const { start, end } = getMonthRange(month);
  const ledgerConditions: SQL[] = [eq(pointsLedger.settleMonth, month)];
  const disputeConditions: SQL[] = [
    gte(disputes.createdAt, start),
    lt(disputes.createdAt, end),
    sql`${disputes.status} IN ('OPEN', 'IN_REVIEW')`,
  ];

  if (siteId) {
    ledgerConditions.push(eq(pointsLedger.siteId, siteId));
    disputeConditions.push(eq(disputes.siteId, siteId));
  }

  const [ledgerSummary, disputeSummary, finalizedRaw] = await Promise.all([
    db
      .select({
        totalPoints: sql<number>`COALESCE(SUM(${pointsLedger.amount}), 0)`,
        userCount: sql<number>`COUNT(DISTINCT ${pointsLedger.userId})`,
      })
      .from(pointsLedger)
      .where(and(...ledgerConditions))
      .get(),
    db
      .select({
        disputeCount: sql<number>`COUNT(*)`,
      })
      .from(disputes)
      .where(and(...disputeConditions))
      .get(),
    c.env.KV.get(getSettlementFinalizedKey(month)),
  ]);

  let finalizedAt: string | null = null;
  if (finalizedRaw) {
    try {
      const parsed = JSON.parse(finalizedRaw) as { finalizedAt?: string };
      finalizedAt = parsed.finalizedAt ?? null;
    } catch {
      finalizedAt = null;
    }
  }

  return success(c, {
    month,
    totalPoints: ledgerSummary?.totalPoints ?? 0,
    userCount: ledgerSummary?.userCount ?? 0,
    disputeCount: disputeSummary?.disputeCount ?? 0,
    finalized: Boolean(finalizedRaw),
    finalizedAt,
  });
});

app.post(
  "/settlements/snapshot",
  requireManagerOrAdmin,
  zValidator("json", SettlementSnapshotSchema as never),
  async (c) => {
    const db = drizzle(c.env.DB);
    const body: z.infer<typeof SettlementSnapshotSchema> = c.req.valid("json");
    const siteId = c.req.query("siteId")?.trim();
    const month = body.month;

    const finalizedRaw = await c.env.KV.get(getSettlementFinalizedKey(month));
    if (finalizedRaw) {
      return error(
        c,
        "SETTLEMENT_FINALIZED",
        "Settlement already finalized",
        409,
      );
    }

    const conditions: SQL[] = [eq(pointsLedger.settleMonth, month)];
    if (siteId) {
      conditions.push(eq(pointsLedger.siteId, siteId));
    }

    const perUser = await db
      .select({
        userId: pointsLedger.userId,
        totalAmount: sql<number>`COALESCE(SUM(${pointsLedger.amount}), 0)`,
      })
      .from(pointsLedger)
      .where(and(...conditions))
      .groupBy(pointsLedger.userId)
      .all();

    const totalPoints = perUser.reduce((acc, row) => acc + row.totalAmount, 0);
    const summary = {
      month,
      userCount: perUser.length,
      totalPoints,
      generatedAt: new Date().toISOString(),
      perUser,
    };

    await c.env.KV.put(
      getSettlementSnapshotKey(month),
      JSON.stringify(summary),
    );

    return success(c, {
      created: true,
      month,
      userCount: perUser.length,
      totalPoints,
    });
  },
);

app.post(
  "/settlements/finalize",
  requireManagerOrAdmin,
  zValidator("json", SettlementFinalizeSchema as never),
  async (c) => {
    const { user } = c.get("auth");
    const body: z.infer<typeof SettlementFinalizeSchema> = c.req.valid("json");

    if (!body.confirm) {
      return error(c, "CONFIRM_REQUIRED", "confirm must be true", 400);
    }

    const key = getSettlementFinalizedKey(body.month);
    const existing = await c.env.KV.get(key);

    if (existing) {
      return error(
        c,
        "SETTLEMENT_FINALIZED",
        "Settlement already finalized",
        409,
      );
    }

    const payload = {
      month: body.month,
      finalizedAt: new Date().toISOString(),
      finalizedBy: user.id,
    };

    await c.env.KV.put(key, JSON.stringify(payload));

    return success(c, {
      finalized: true,
      month: body.month,
      finalizedAt: payload.finalizedAt,
    });
  },
);

app.get("/settlements/history", requireManagerOrAdmin, async (c) => {
  const db = drizzle(c.env.DB);
  const siteId = c.req.query("siteId")?.trim();
  const page = Math.max(parseInt(c.req.query("page") || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt(c.req.query("limit") || "20", 10), 1),
    100,
  );
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];
  if (siteId) {
    conditions.push(eq(pointsLedger.siteId, siteId));
  }

  const rows = await db
    .select({
      month: pointsLedger.settleMonth,
      totalPoints: sql<number>`COALESCE(SUM(${pointsLedger.amount}), 0)`,
      userCount: sql<number>`COUNT(DISTINCT ${pointsLedger.userId})`,
    })
    .from(pointsLedger)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(pointsLedger.settleMonth)
    .orderBy(desc(pointsLedger.settleMonth))
    .limit(limit)
    .offset(offset)
    .all();

  const history = await Promise.all(
    rows.map(async (row) => {
      const finalizedRaw = await c.env.KV.get(
        getSettlementFinalizedKey(row.month),
      );
      let finalizedAt: string | null = null;
      if (finalizedRaw) {
        try {
          const parsed = JSON.parse(finalizedRaw) as { finalizedAt?: string };
          finalizedAt = parsed.finalizedAt ?? null;
        } catch {
          finalizedAt = null;
        }
      }

      return {
        month: row.month,
        totalPoints: row.totalPoints,
        userCount: row.userCount,
        finalizedAt,
      };
    }),
  );

  return success(c, {
    history,
    pagination: {
      page,
      limit,
      count: history.length,
    },
  });
});

app.get("/settlements/disputes", requireManagerOrAdmin, async (c) => {
  const db = drizzle(c.env.DB);
  const month = c.req.query("month")?.trim() || formatYearMonth(new Date());
  const siteId = c.req.query("siteId")?.trim();
  const page = Math.max(parseInt(c.req.query("page") || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt(c.req.query("limit") || "20", 10), 1),
    100,
  );
  const offset = (page - 1) * limit;

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return error(c, "INVALID_MONTH", "month must be YYYY-MM", 400);
  }

  const { start, end } = getMonthRange(month);
  const conditions: SQL[] = [
    gte(disputes.createdAt, start),
    lt(disputes.createdAt, end),
  ];
  if (siteId) {
    conditions.push(eq(disputes.siteId, siteId));
  }

  const rows = await db
    .select({
      id: disputes.id,
      siteId: disputes.siteId,
      userId: disputes.userId,
      type: disputes.type,
      status: disputes.status,
      title: disputes.title,
      description: disputes.description,
      createdAt: disputes.createdAt,
      userName: users.nameMasked,
    })
    .from(disputes)
    .leftJoin(users, eq(disputes.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(disputes.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  return success(c, {
    month,
    disputes: rows,
    pagination: {
      page,
      limit,
      count: rows.length,
    },
  });
});

export default app;
