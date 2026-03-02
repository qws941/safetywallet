import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import {
  CreateTbmInputSchema,
  AttendTbmSchema,
} from "../../validators/schemas";
import {
  tbmRecords,
  tbmAttendees,
  siteMemberships,
  users,
} from "../../db/schema";
import { success, error } from "../../lib/response";
import { logAuditWithContext } from "../../lib/audit";
import type { AppType, CreateTbmBody } from "./helpers";

const app = new Hono<AppType>();

const UpdateTbmInputSchema = z
  .object({
    date: z.string().datetime().optional(),
    topic: z.string().min(1).optional(),
    content: z.string().optional(),
    weatherCondition: z.string().optional(),
    specialNotes: z.string().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

app.post("/", zValidator("json", CreateTbmInputSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");

  const body = c.req.valid("json") as CreateTbmBody;

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

  return success(c, tbm, 201);
});

app.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const siteId = c.req.query("siteId");
  const date = c.req.query("date");

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

  const limit = Math.min(
    Number.parseInt(c.req.query("limit") || "20", 10),
    100,
  );
  const offset = Number.parseInt(c.req.query("offset") || "0", 10);

  const whereClause = date
    ? and(
        eq(tbmRecords.siteId, siteId),
        eq(tbmRecords.date, Math.floor(new Date(date).getTime() / 1000)),
      )
    : eq(tbmRecords.siteId, siteId);

  const records = await db
    .select({
      tbm: tbmRecords,
      leaderName: users.name,
    })
    .from(tbmRecords)
    .innerJoin(users, eq(tbmRecords.leaderId, users.id))
    .where(whereClause)
    .orderBy(desc(tbmRecords.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  const countResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(tbmRecords)
    .where(whereClause)
    .get();

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

export default app;
