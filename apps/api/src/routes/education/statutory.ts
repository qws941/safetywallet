import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  CreateStatutoryTrainingInputSchema,
  UpdateStatutoryTrainingSchema,
} from "../../validators/schemas";
import { statutoryTrainings, siteMemberships, users } from "../../db/schema";
import { success, error } from "../../lib/response";
import { logAuditWithContext } from "../../lib/audit";
import type {
  AppType,
  CreateStatutoryTrainingBody,
  UpdateStatutoryTrainingBody,
} from "./helpers";

const app = new Hono<AppType>();

app.post(
  "/",
  zValidator("json", CreateStatutoryTrainingInputSchema),
  async (c) => {
    const db = drizzle(c.env.DB);
    const { user } = c.get("auth");

    const body = c.req.valid("json") as CreateStatutoryTrainingBody;

    if (
      !body.siteId ||
      !body.userId ||
      !body.trainingType ||
      !body.trainingName ||
      !body.trainingDate
    ) {
      return error(
        c,
        "MISSING_FIELDS",
        "siteId, userId, trainingType, trainingName, trainingDate are required",
        400,
      );
    }

    if (
      !["NEW_WORKER", "SPECIAL", "REGULAR", "CHANGE_OF_WORK"].includes(
        body.trainingType,
      )
    ) {
      return error(c, "INVALID_TRAINING_TYPE", "Invalid trainingType", 400);
    }

    if (
      body.status &&
      !["SCHEDULED", "COMPLETED", "EXPIRED"].includes(body.status)
    ) {
      return error(c, "INVALID_STATUS", "Invalid status", 400);
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

    const targetMembership = await db
      .select()
      .from(siteMemberships)
      .where(
        and(
          eq(siteMemberships.userId, body.userId),
          eq(siteMemberships.siteId, body.siteId),
          eq(siteMemberships.status, "ACTIVE"),
        ),
      )
      .get();

    if (!targetMembership) {
      return error(
        c,
        "TARGET_NOT_SITE_MEMBER",
        "Target user is not an active member of this site",
        400,
      );
    }

    const training = await db
      .insert(statutoryTrainings)
      .values({
        siteId: body.siteId,
        userId: body.userId,
        trainingType: body.trainingType,
        trainingName: body.trainingName,
        trainingDate: Math.floor(new Date(body.trainingDate).getTime() / 1000),
        expirationDate: body.expirationDate
          ? Math.floor(new Date(body.expirationDate).getTime() / 1000)
          : null,
        provider: body.provider ?? null,
        certificateUrl: body.certificateUrl ?? null,
        hoursCompleted: body.hoursCompleted ?? 0,
        status: body.status ?? "SCHEDULED",
        createdById: user.id,
        notes: body.notes ?? null,
      })
      .returning()
      .get();

    await logAuditWithContext(
      c,
      db,
      "STATUTORY_TRAINING_CREATED",
      user.id,
      "STATUTORY_TRAINING",
      training.id,
      {
        siteId: training.siteId,
        targetUserId: training.userId,
        trainingType: training.trainingType,
      },
    );

    return success(c, training, 201);
  },
);

app.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const siteId = c.req.query("siteId");
  const userId = c.req.query("userId");
  const trainingType = c.req.query("trainingType");
  const status = c.req.query("status");

  if (!siteId) {
    return error(c, "MISSING_SITE_ID", "siteId is required", 400);
  }

  if (
    trainingType &&
    !["NEW_WORKER", "SPECIAL", "REGULAR", "CHANGE_OF_WORK"].includes(
      trainingType,
    )
  ) {
    return error(c, "INVALID_TRAINING_TYPE", "Invalid trainingType", 400);
  }

  if (status && !["SCHEDULED", "COMPLETED", "EXPIRED"].includes(status)) {
    return error(c, "INVALID_STATUS", "Invalid status", 400);
  }

  const adminMembership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, siteId),
        eq(siteMemberships.status, "ACTIVE"),
        eq(siteMemberships.role, "SITE_ADMIN"),
      ),
    )
    .get();
  if (!adminMembership && user.role !== "SUPER_ADMIN") {
    return error(c, "SITE_ADMIN_REQUIRED", "관리자 권한이 필요합니다", 403);
  }

  const limit = Math.min(
    Number.parseInt(c.req.query("limit") || "20", 10),
    100,
  );
  const offset = Number.parseInt(c.req.query("offset") || "0", 10);

  const conditions = [eq(statutoryTrainings.siteId, siteId)];
  if (userId) conditions.push(eq(statutoryTrainings.userId, userId));
  if (trainingType) {
    conditions.push(
      eq(
        statutoryTrainings.trainingType,
        trainingType as "NEW_WORKER" | "SPECIAL" | "REGULAR" | "CHANGE_OF_WORK",
      ),
    );
  }
  if (status) {
    conditions.push(
      eq(
        statutoryTrainings.status,
        status as "SCHEDULED" | "COMPLETED" | "EXPIRED",
      ),
    );
  }

  const trainings = await db
    .select({
      training: statutoryTrainings,
      userName: users.name,
    })
    .from(statutoryTrainings)
    .innerJoin(users, eq(statutoryTrainings.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(statutoryTrainings.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  const countResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(statutoryTrainings)
    .where(and(...conditions))
    .get();

  return success(c, {
    trainings,
    total: countResult?.count ?? 0,
    limit,
    offset,
  });
});

app.put(
  "/:id",
  zValidator("json", UpdateStatutoryTrainingSchema),
  async (c) => {
    const db = drizzle(c.env.DB);
    const { user } = c.get("auth");
    const id = c.req.param("id");

    const existing = await db
      .select()
      .from(statutoryTrainings)
      .where(eq(statutoryTrainings.id, id))
      .get();

    if (!existing) {
      return error(
        c,
        "STATUTORY_TRAINING_NOT_FOUND",
        "Statutory training not found",
        404,
      );
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

    const body = c.req.valid("json") as UpdateStatutoryTrainingBody;

    if (
      body.trainingType &&
      !["NEW_WORKER", "SPECIAL", "REGULAR", "CHANGE_OF_WORK"].includes(
        body.trainingType,
      )
    ) {
      return error(c, "INVALID_TRAINING_TYPE", "Invalid trainingType", 400);
    }

    if (
      body.status &&
      !["SCHEDULED", "COMPLETED", "EXPIRED"].includes(body.status)
    ) {
      return error(c, "INVALID_STATUS", "Invalid status", 400);
    }

    const updated = await db
      .update(statutoryTrainings)
      .set({
        ...(body.trainingType !== undefined && {
          trainingType: body.trainingType,
        }),
        ...(body.trainingName !== undefined && {
          trainingName: body.trainingName,
        }),
        ...(body.trainingDate !== undefined && {
          trainingDate: Math.floor(
            new Date(body.trainingDate).getTime() / 1000,
          ),
        }),
        ...(body.expirationDate !== undefined && {
          expirationDate: body.expirationDate
            ? Math.floor(new Date(body.expirationDate).getTime() / 1000)
            : null,
        }),
        ...(body.provider !== undefined && { provider: body.provider }),
        ...(body.certificateUrl !== undefined && {
          certificateUrl: body.certificateUrl,
        }),
        ...(body.hoursCompleted !== undefined && {
          hoursCompleted: body.hoursCompleted,
        }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
        updatedAt: new Date(),
      })
      .where(eq(statutoryTrainings.id, id))
      .returning()
      .get();

    return success(c, updated);
  },
);

app.delete("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const id = c.req.param("id");

  const existing = await db
    .select()
    .from(statutoryTrainings)
    .where(eq(statutoryTrainings.id, id))
    .get();

  if (!existing) {
    return error(
      c,
      "STATUTORY_TRAINING_NOT_FOUND",
      "Statutory training not found",
      404,
    );
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

  await db
    .delete(statutoryTrainings)
    .where(
      and(
        eq(statutoryTrainings.id, id),
        eq(statutoryTrainings.siteId, existing.siteId),
      ),
    );

  await logAuditWithContext(
    c,
    db,
    "STATUTORY_TRAINING_DELETED",
    user.id,
    "STATUTORY_TRAINING",
    id,
    {
      action: "DELETED",
      siteId: existing.siteId,
      targetUserId: existing.userId,
      trainingType: existing.trainingType,
    },
  );

  return success(c, { deleted: true });
});

export default app;
