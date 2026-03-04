import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { drizzle } from "drizzle-orm/d1";
import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import type { Env, AuthContext } from "../../types";
import { success } from "../../lib/response";
import {
  educationCompletions,
  educationContents,
  users,
} from "../../db/schema";
import * as schema from "../../db/schema";
import { requireAdmin } from "./helpers";

const app = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

app.get(
  "/education/completions",
  requireAdmin,
  zValidator(
    "query",
    z.object({
      siteId: z.string(),
      contentId: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
    }),
  ),
  async (c) => {
    const db = drizzle(c.env.DB, { schema });
    const { siteId, contentId, startDate, endDate, page, limit } =
      c.req.valid("query");

    const conditions = [eq(educationCompletions.siteId, siteId)] as ReturnType<
      typeof eq
    >[];

    if (contentId)
      conditions.push(eq(educationCompletions.contentId, contentId));
    if (startDate)
      conditions.push(
        gte(educationCompletions.signedAt, new Date(`${startDate}T00:00:00Z`)),
      );
    if (endDate)
      conditions.push(
        lte(educationCompletions.signedAt, new Date(`${endDate}T23:59:59Z`)),
      );

    const where = conditions.length === 1 ? conditions[0] : and(...conditions);
    const offset = (page - 1) * limit;

    const [items, totalResult] = await Promise.all([
      db
        .select({
          id: educationCompletions.id,
          contentId: educationCompletions.contentId,
          contentTitle: educationContents.title,
          userName: users.name,
          userCompany: users.companyName,
          signedAt: educationCompletions.signedAt,
          signatureData: educationCompletions.signatureData,
        })
        .from(educationCompletions)
        .leftJoin(
          educationContents,
          eq(educationCompletions.contentId, educationContents.id),
        )
        .leftJoin(users, eq(educationCompletions.userId, users.id))
        .where(where)
        .orderBy(desc(educationCompletions.signedAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(educationCompletions).where(where),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return success(c, {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  },
);

export default app;
