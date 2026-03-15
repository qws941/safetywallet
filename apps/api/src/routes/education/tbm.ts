import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  CreateTbmInputSchema,
  UpdateTbmInputSchema,
  TbmRecordFilterSchema,
  AttendTbmSchema,
} from "../../validators/schemas";
import {
  tbmRecords,
  tbmTopicCategoryEnum,
  tbmAttendees,
  siteMemberships,
  users,
} from "../../db/schema";
import { success, error } from "../../lib/response";
import { logAuditWithContext } from "../../lib/audit";
import {
  analyzeTbmRecord,
  generateTbmMeetingMinutes,
  getAiCredentials,
} from "../../lib/gemini-ai";
import type { AppType } from "./helpers";
import { createLogger } from "../../lib/logger";

const logger = createLogger("tbm");

const app = new Hono<AppType>();

app.post("/", zValidator("json", CreateTbmInputSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");

  const body = c.req.valid("json");

  if (!body.siteId || !body.date || !body.topic) {
    return error(c, "MISSING_FIELDS", "siteId, date, topic are required", 400);
  }

  const adminMembership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, body.siteId),
        eq(siteMemberships.status, "ACTIVE"),
        eq(siteMemberships.role, "SITE_ADMIN"),
      ),
    )
    .get();
  if (!adminMembership && user.role !== "SUPER_ADMIN") {
    return error(c, "SITE_ADMIN_REQUIRED", "관리자 권한이 필요합니다", 403);
  }

  if (body.leaderId) {
    const leaderMembership = await db
      .select()
      .from(siteMemberships)
      .where(
        and(
          eq(siteMemberships.userId, body.leaderId),
          eq(siteMemberships.siteId, body.siteId),
          eq(siteMemberships.status, "ACTIVE"),
        ),
      )
      .get();
    if (!leaderMembership) {
      return error(
        c,
        "LEADER_NOT_SITE_MEMBER",
        "leaderId must be an active site member",
        400,
      );
    }
  }

  const tbm = await db
    .insert(tbmRecords)
    .values({
      siteId: body.siteId,
      date: Math.floor(new Date(body.date).getTime() / 1000),
      topic: body.topic,
      topicCategory: body.topicCategory ?? null,
      content: body.content ?? null,
      leaderId: body.leaderId ?? user.id,
      weatherCondition: body.weatherCondition ?? null,
      specialNotes: body.specialNotes ?? null,
    })
    .returning()
    .get();

  await logAuditWithContext(
    c,
    db,
    "TBM_CREATED",
    user.id,
    "TBM_RECORD",
    tbm.id,
    {
      siteId: tbm.siteId,
      topic: tbm.topic,
      date: tbm.date,
    },
  );

  const aiConfig = getAiCredentials(c.env);
  if (aiConfig) {
    c.executionCtx.waitUntil(
      (async () => {
        try {
          const result = await analyzeTbmRecord(aiConfig, {
            topic: tbm.topic,
            content: tbm.content,
            weatherCondition: tbm.weatherCondition,
            specialNotes: tbm.specialNotes,
          });
          if (result) {
            await db
              .update(tbmRecords)
              .set({
                aiAnalysis: JSON.stringify(result),
                aiAnalyzedAt: new Date().toISOString(),
              })
              .where(eq(tbmRecords.id, tbm.id));
          }
        } catch (error) {
          logger.error(
            "TBM AI analysis failed",
            error instanceof Error ? error : undefined,
          );
        }
      })(),
    );

    c.executionCtx.waitUntil(
      (async () => {
        try {
          const result = await generateTbmMeetingMinutes(aiConfig, {
            topic: tbm.topic,
            content: tbm.content,
            weatherCondition: tbm.weatherCondition,
            specialNotes: tbm.specialNotes,
          });
          if (result) {
            await db
              .update(tbmRecords)
              .set({
                aiMeetingMinutes: JSON.stringify(result),
                aiMinutesGeneratedAt: new Date().toISOString(),
              })
              .where(eq(tbmRecords.id, tbm.id));
          }
        } catch (e) {
          logger.error(
            "TBM meeting minutes generation failed:",
            e instanceof Error ? e : undefined,
          );
        }
      })(),
    );
  }

  return success(c, tbm, 201);
});

app.get("/", zValidator("query", TbmRecordFilterSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const validatedQuery = c.req.valid("query");
  const siteId = validatedQuery?.siteId ?? c.req.query("siteId");
  const date = validatedQuery?.date ?? c.req.query("date");
  const topicCategoryRaw =
    validatedQuery?.topicCategory ?? c.req.query("topicCategory");
  const topicCategory =
    topicCategoryRaw &&
    tbmTopicCategoryEnum.includes(
      topicCategoryRaw as (typeof tbmTopicCategoryEnum)[number],
    )
      ? (topicCategoryRaw as (typeof tbmTopicCategoryEnum)[number])
      : undefined;
  const limit = Math.min(
    validatedQuery?.limit ?? Number.parseInt(c.req.query("limit") || "20", 10),
    100,
  );
  const offset =
    validatedQuery?.offset ?? Number.parseInt(c.req.query("offset") || "0", 10);

  if (!siteId) {
    return error(c, "MISSING_SITE_ID", "siteId is required", 400);
  }

  const membership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, siteId),
        eq(siteMemberships.status, "ACTIVE"),
      ),
    )
    .get();
  if (!membership && user.role !== "SUPER_ADMIN") {
    return error(c, "NOT_SITE_MEMBER", "Site membership required", 403);
  }

  const whereConditions = [eq(tbmRecords.siteId, siteId)];

  if (date) {
    whereConditions.push(
      eq(tbmRecords.date, Math.floor(new Date(date).getTime() / 1000)),
    );
  }

  if (topicCategory) {
    whereConditions.push(eq(tbmRecords.topicCategory, topicCategory));
  }

  const whereClause = and(...whereConditions);

  const [records, countResult] = await Promise.all([
    db
      .select({
        tbm: tbmRecords,
        leaderName: users.name,
        attendeeCount: sql<number>`(SELECT COUNT(*) FROM ${tbmAttendees} WHERE ${tbmAttendees.tbmRecordId} = ${tbmRecords.id})`,
      })
      .from(tbmRecords)
      .innerJoin(users, eq(tbmRecords.leaderId, users.id))
      .where(whereClause)
      .orderBy(desc(tbmRecords.createdAt))
      .limit(limit)
      .offset(offset)
      .all(),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(tbmRecords)
      .where(whereClause)
      .get(),
  ]);

  return success(c, {
    records,
    total: countResult?.count ?? 0,
    limit,
    offset,
  });
});

app.get("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const id = c.req.param("id");

  const tbm = await db
    .select({
      record: tbmRecords,
      leaderName: users.name,
    })
    .from(tbmRecords)
    .innerJoin(users, eq(tbmRecords.leaderId, users.id))
    .where(eq(tbmRecords.id, id))
    .get();

  if (!tbm) {
    return error(c, "TBM_NOT_FOUND", "TBM record not found", 404);
  }

  const membership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, tbm.record.siteId),
        eq(siteMemberships.status, "ACTIVE"),
      ),
    )
    .get();
  if (!membership && user.role !== "SUPER_ADMIN") {
    return error(c, "NOT_SITE_MEMBER", "Site membership required", 403);
  }

  const attendees = await db
    .select({
      attendee: tbmAttendees,
      userName: users.name,
    })
    .from(tbmAttendees)
    .innerJoin(users, eq(tbmAttendees.userId, users.id))
    .where(eq(tbmAttendees.tbmRecordId, id))
    .orderBy(desc(tbmAttendees.attendedAt))
    .all();

  return success(c, {
    ...tbm.record,
    leaderName: tbm.leaderName,
    attendees,
    attendeeCount: attendees.length,
  });
});

app.put("/:id", zValidator("json", UpdateTbmInputSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const existing = await db
    .select()
    .from(tbmRecords)
    .where(eq(tbmRecords.id, id))
    .get();

  if (!existing) {
    return error(c, "TBM_NOT_FOUND", "TBM record not found", 404);
  }

  const adminMembership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, existing.siteId),
        eq(siteMemberships.status, "ACTIVE"),
        eq(siteMemberships.role, "SITE_ADMIN"),
      ),
    )
    .get();
  if (!adminMembership && user.role !== "SUPER_ADMIN") {
    return error(c, "SITE_ADMIN_REQUIRED", "관리자 권한이 필요합니다", 403);
  }

  const changedFields = Object.keys(body);

  const updated = await db
    .update(tbmRecords)
    .set({
      ...(body.date !== undefined && {
        date: Math.floor(new Date(body.date).getTime() / 1000),
      }),
      ...(body.topic !== undefined && { topic: body.topic }),
      ...(body.topicCategory !== undefined && {
        topicCategory: body.topicCategory,
      }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.weatherCondition !== undefined && {
        weatherCondition: body.weatherCondition,
      }),
      ...(body.specialNotes !== undefined && {
        specialNotes: body.specialNotes,
      }),
      updatedAt: new Date(new Date().toISOString()),
    })
    .where(and(eq(tbmRecords.id, id), eq(tbmRecords.siteId, existing.siteId)))
    .returning()
    .get();

  if (!updated) {
    return error(c, "TBM_NOT_FOUND", "TBM record not found", 404);
  }

  await logAuditWithContext(c, db, "TBM_UPDATED", user.id, "TBM_RECORD", id, {
    action: "UPDATED",
    siteId: existing.siteId,
    changedFields,
  });

  return success(c, updated);
});

app.post("/:tbmId/attend", zValidator("json", AttendTbmSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const tbmId = c.req.param("tbmId");

  const tbm = await db
    .select()
    .from(tbmRecords)
    .where(eq(tbmRecords.id, tbmId))
    .get();

  if (!tbm) {
    return error(c, "TBM_NOT_FOUND", "TBM record not found", 404);
  }

  const membership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, tbm.siteId),
        eq(siteMemberships.status, "ACTIVE"),
      ),
    )
    .get();

  if (!membership && user.role !== "SUPER_ADMIN") {
    return error(c, "NOT_SITE_MEMBER", "Site membership required", 403);
  }

  c.req.valid("json");

  const existing = await db
    .select()
    .from(tbmAttendees)
    .where(
      and(
        eq(tbmAttendees.tbmRecordId, tbmId),
        eq(tbmAttendees.userId, user.id),
      ),
    )
    .get();

  if (existing) {
    return error(c, "ALREADY_ATTENDED", "Already attended", 400);
  }

  const attendee = await db
    .insert(tbmAttendees)
    .values({
      tbmRecordId: tbmId,
      userId: user.id,
    })
    .returning()
    .get();

  return success(c, attendee, 201);
});

app.get("/:tbmId/attendees", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const tbmId = c.req.param("tbmId");

  const tbm = await db
    .select()
    .from(tbmRecords)
    .where(eq(tbmRecords.id, tbmId))
    .get();

  if (!tbm) {
    return error(c, "TBM_NOT_FOUND", "TBM record not found", 404);
  }

  const membership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, tbm.siteId),
        eq(siteMemberships.status, "ACTIVE"),
      ),
    )
    .get();

  if (!membership && user.role !== "SUPER_ADMIN") {
    return error(c, "NOT_SITE_MEMBER", "Site membership required", 403);
  }

  const attendees = await db
    .select({
      attendee: tbmAttendees,
      userName: users.name,
    })
    .from(tbmAttendees)
    .innerJoin(users, eq(tbmAttendees.userId, users.id))
    .where(eq(tbmAttendees.tbmRecordId, tbmId))
    .orderBy(desc(tbmAttendees.attendedAt))
    .all();

  return success(c, { attendees });
});

app.delete("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const id = c.req.param("id");

  const existing = await db
    .select()
    .from(tbmRecords)
    .where(eq(tbmRecords.id, id))
    .get();

  if (!existing) {
    return error(c, "TBM_NOT_FOUND", "TBM record not found", 404);
  }

  const adminMembership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, existing.siteId),
        eq(siteMemberships.status, "ACTIVE"),
        eq(siteMemberships.role, "SITE_ADMIN"),
      ),
    )
    .get();
  if (!adminMembership && user.role !== "SUPER_ADMIN") {
    return error(c, "SITE_ADMIN_REQUIRED", "관리자 권한이 필요합니다", 403);
  }

  await db.delete(tbmAttendees).where(eq(tbmAttendees.tbmRecordId, id));

  await db
    .delete(tbmRecords)
    .where(and(eq(tbmRecords.id, id), eq(tbmRecords.siteId, existing.siteId)));

  await logAuditWithContext(c, db, "TBM_DELETED", user.id, "TBM_RECORD", id, {
    action: "DELETED",
    siteId: existing.siteId,
    topic: existing.topic,
  });

  return success(c, { deleted: true });
});

app.post("/:id/analyze", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const id = c.req.param("id");

  const aiConfig = getAiCredentials(c.env);
  if (!aiConfig) {
    return error(c, "AI_NOT_CONFIGURED", "AI 분석이 설정되지 않았습니다", 503);
  }

  const tbm = await db
    .select()
    .from(tbmRecords)
    .where(eq(tbmRecords.id, id))
    .get();

  if (!tbm) {
    return error(c, "TBM_NOT_FOUND", "TBM record not found", 404);
  }

  const adminMembership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, tbm.siteId),
        eq(siteMemberships.status, "ACTIVE"),
        eq(siteMemberships.role, "SITE_ADMIN"),
      ),
    )
    .get();
  if (!adminMembership && user.role !== "SUPER_ADMIN") {
    return error(c, "SITE_ADMIN_REQUIRED", "관리자 권한이 필요합니다", 403);
  }

  const result = await analyzeTbmRecord(aiConfig, {
    topic: tbm.topic,
    content: tbm.content,
    weatherCondition: tbm.weatherCondition,
    specialNotes: tbm.specialNotes,
  });

  if (!result) {
    return error(c, "AI_ANALYSIS_FAILED", "AI 분석에 실패했습니다", 500);
  }

  await db
    .update(tbmRecords)
    .set({
      aiAnalysis: JSON.stringify(result),
      aiAnalyzedAt: new Date().toISOString(),
    })
    .where(eq(tbmRecords.id, id));

  return success(c, {
    analysis: result,
    analyzedAt: new Date().toISOString(),
  });
});

app.get("/:id/ai-analysis", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const id = c.req.param("id");

  const tbm = await db
    .select()
    .from(tbmRecords)
    .where(eq(tbmRecords.id, id))
    .get();

  if (!tbm) {
    return error(c, "TBM_NOT_FOUND", "TBM record not found", 404);
  }

  const membership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, tbm.siteId),
        eq(siteMemberships.status, "ACTIVE"),
      ),
    )
    .get();
  if (!membership && user.role !== "SUPER_ADMIN") {
    return error(c, "NOT_SITE_MEMBER", "Site membership required", 403);
  }

  return success(c, {
    analysis: tbm.aiAnalysis ? JSON.parse(tbm.aiAnalysis) : null,
    analyzedAt: tbm.aiAnalyzedAt ?? null,
  });
});

app.post("/:id/generate-minutes", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const id = c.req.param("id");

  const aiConfig = getAiCredentials(c.env);
  if (!aiConfig) {
    return error(c, "AI_NOT_CONFIGURED", "AI 분석이 설정되지 않았습니다", 503);
  }

  const tbm = await db
    .select({
      record: tbmRecords,
      leaderName: users.name,
      attendeeCount: sql<number>`(SELECT COUNT(*) FROM ${tbmAttendees} WHERE ${tbmAttendees.tbmRecordId} = ${tbmRecords.id})`,
    })
    .from(tbmRecords)
    .innerJoin(users, eq(tbmRecords.leaderId, users.id))
    .where(eq(tbmRecords.id, id))
    .get();

  if (!tbm) {
    return error(c, "TBM_NOT_FOUND", "TBM record not found", 404);
  }

  const adminMembership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, tbm.record.siteId),
        eq(siteMemberships.status, "ACTIVE"),
        eq(siteMemberships.role, "SITE_ADMIN"),
      ),
    )
    .get();
  if (!adminMembership && user.role !== "SUPER_ADMIN") {
    return error(c, "SITE_ADMIN_REQUIRED", "관리자 권한이 필요합니다", 403);
  }

  const result = await generateTbmMeetingMinutes(aiConfig, {
    topic: tbm.record.topic,
    content: tbm.record.content,
    weatherCondition: tbm.record.weatherCondition,
    specialNotes: tbm.record.specialNotes,
    leaderName: tbm.leaderName,
    attendeeCount: tbm.attendeeCount,
    date: new Date(tbm.record.date * 1000).toLocaleString("ko-KR"),
  });

  if (!result) {
    return error(c, "AI_MINUTES_FAILED", "AI 회의록 생성에 실패했습니다", 500);
  }

  const generatedAt = new Date().toISOString();
  await db
    .update(tbmRecords)
    .set({
      aiMeetingMinutes: JSON.stringify(result),
      aiMinutesGeneratedAt: generatedAt,
    })
    .where(eq(tbmRecords.id, id));

  return success(c, {
    success: true,
    minutes: result,
  });
});

app.get("/:id/meeting-minutes", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const id = c.req.param("id");

  const tbm = await db
    .select()
    .from(tbmRecords)
    .where(eq(tbmRecords.id, id))
    .get();

  if (!tbm) {
    return error(c, "TBM_NOT_FOUND", "TBM record not found", 404);
  }

  const membership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, tbm.siteId),
        eq(siteMemberships.status, "ACTIVE"),
      ),
    )
    .get();
  if (!membership && user.role !== "SUPER_ADMIN") {
    return error(c, "NOT_SITE_MEMBER", "Site membership required", 403);
  }

  return success(c, {
    minutes: tbm.aiMeetingMinutes ? JSON.parse(tbm.aiMeetingMinutes) : null,
    generatedAt: tbm.aiMinutesGeneratedAt ?? null,
  });
});

export default app;
