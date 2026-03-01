import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { CreateCourseSchema } from "../../validators/schemas";
import { educationContents, siteMemberships } from "../../db/schema";
import { success, error } from "../../lib/response";
import { logAuditWithContext } from "../../lib/audit";
import type { AppType, CreateContentBody } from "./helpers";

const app = new Hono<AppType>();

app.post("/", zValidator("json", CreateCourseSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");

  const body = c.req.valid("json") as CreateContentBody;

  if (!body.siteId || !body.title || !body.contentType) {
    return error(
      c,
      "MISSING_FIELDS",
      "siteId, title, contentType are required",
      400,
    );
  }

  if (!["VIDEO", "IMAGE", "TEXT", "DOCUMENT"].includes(body.contentType)) {
    return error(c, "INVALID_CONTENT_TYPE", "Invalid contentType", 400);
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

  const content = await db
    .insert(educationContents)
    .values({
      siteId: body.siteId,
      title: body.title,
      description: body.description ?? null,
      contentType: body.contentType,
      contentUrl: body.contentUrl ?? null,
      thumbnailUrl: body.thumbnailUrl ?? null,
      durationMinutes: body.durationMinutes ?? null,
      externalSource: body.externalSource ?? "LOCAL",
      externalId: body.externalId ?? null,
      sourceUrl: body.sourceUrl ?? null,
      isActive: body.isActive ?? true,
      createdById: user.id,
    })
    .returning()
    .get();

  await logAuditWithContext(
    c,
    db,
    "EDUCATION_CONTENT_CREATED",
    user.id,
    "EDUCATION_CONTENT",
    content.id,
    {
      siteId: content.siteId,
      title: content.title,
      contentType: content.contentType,
    },
  );

  return success(c, content, 201);
});

app.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const siteId = c.req.query("siteId");

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

  const includeInactive = c.req.query("includeInactive") === "true";
  const limit = Math.min(
    Number.parseInt(c.req.query("limit") || "20", 10),
    100,
  );
  const offset = Number.parseInt(c.req.query("offset") || "0", 10);

  const whereClause = includeInactive
    ? eq(educationContents.siteId, siteId)
    : and(
        eq(educationContents.siteId, siteId),
        eq(educationContents.isActive, true),
      );

  const contents = await db
    .select()
    .from(educationContents)
    .where(whereClause)
    .orderBy(desc(educationContents.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  const countResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(educationContents)
    .where(whereClause)
    .get();

  return success(c, {
    contents,
    total: countResult?.count ?? 0,
    limit,
    offset,
  });
});

app.get("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const id = c.req.param("id");

  const content = await db
    .select()
    .from(educationContents)
    .where(eq(educationContents.id, id))
    .get();

  if (!content) {
    return error(c, "CONTENT_NOT_FOUND", "Education content not found", 404);
  }

  const membership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, content.siteId),
        eq(siteMemberships.status, "ACTIVE"),
      ),
    )
    .get();
  if (!membership && user.role !== "SUPER_ADMIN") {
    return error(c, "NOT_SITE_MEMBER", "Site membership required", 403);
  }

  return success(c, content);
});

app.delete(
  "/:id",
  zValidator("param", z.object({ id: z.string().min(1) })),
  async (c) => {
    const db = drizzle(c.env.DB);
    const { user } = c.get("auth");
    const id = c.req.valid("param").id;

    const content = await db
      .select()
      .from(educationContents)
      .where(eq(educationContents.id, id))
      .get();

    if (!content) {
      return error(c, "CONTENT_NOT_FOUND", "Education content not found", 404);
    }

    const adminMembership = await db
      .select()
      .from(siteMemberships)
      .where(
        and(
          eq(siteMemberships.userId, user.id),
          eq(siteMemberships.siteId, content.siteId),
          eq(siteMemberships.status, "ACTIVE"),
          eq(siteMemberships.role, "SITE_ADMIN"),
        ),
      )
      .get();
    if (!adminMembership && user.role !== "SUPER_ADMIN") {
      return error(c, "SITE_ADMIN_REQUIRED", "관리자 권한이 필요합니다", 403);
    }

    await db
      .update(educationContents)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(educationContents.id, id));

    await logAuditWithContext(
      c,
      db,
      "EDUCATION_CONTENT_DELETED",
      user.id,
      "EDUCATION_CONTENT",
      id,
      {
        siteId: content.siteId,
        title: content.title,
      },
    );

    return success(c, { deleted: true });
  },
);

export default app;
