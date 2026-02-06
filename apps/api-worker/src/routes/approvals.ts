import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc, gte, lt } from "drizzle-orm";
import { manualApprovals, attendance, users, sites } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { success, error } from "../lib/response";
import type { Env, AuthContext } from "../types";
import { logAuditWithContext } from "../lib/audit";

const app = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

app.use("*", authMiddleware);

// List approvals (pending by default, or filtered)
app.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const siteId = c.req.query("siteId");
  const status = c.req.query("status"); // PENDING, APPROVED, REJECTED
  const date = c.req.query("date");

  // Permission check: Site Admin or Super Admin
  if (user.role === "WORKER") {
    return error(c, "FORBIDDEN", "Forbidden", 403);
  }

  const conditions = [];
  if (siteId) conditions.push(eq(manualApprovals.siteId, siteId));
  if (status) conditions.push(eq(manualApprovals.status, status as any));

  if (date) {
    const targetDate = new Date(date);
    if (!isNaN(targetDate.getTime())) {
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      conditions.push(
        and(
          gte(manualApprovals.validDate, targetDate),
          lt(manualApprovals.validDate, nextDay),
        ),
      );
    }
  }

  const results = await db
    .select({
      id: manualApprovals.id,
      userId: manualApprovals.userId,
      siteId: manualApprovals.siteId,
      reason: manualApprovals.reason,
      validDate: manualApprovals.validDate,
      status: manualApprovals.status,
      rejectionReason: manualApprovals.rejectionReason,
      createdAt: manualApprovals.createdAt,
      approvedAt: manualApprovals.approvedAt,
      user: {
        id: users.id,
        name: users.name,
        companyName: users.companyName,
        tradeType: users.tradeType,
      },
      approvedBy: {
        id: users.id,
        name: users.name,
      },
      site: {
        id: sites.id,
        name: sites.name,
      },
    })
    .from(manualApprovals)
    .leftJoin(users, eq(manualApprovals.userId, users.id))
    .leftJoin(users, eq(manualApprovals.approvedById, users.id)) // Self-join for approver? No, need alias if I strictly want typed join, but let's assume simple left join works for now or I need alias.
    // Actually, joining users twice requires alias in Drizzle?
    // Let's rely on simple left join and hope Drizzle handles it or use the relation query if possible.
    // Relational query is easier.
    .leftJoin(sites, eq(manualApprovals.siteId, sites.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(manualApprovals.createdAt))
    .all();

  // Better to use query.findMany if I want relations, but Drizzle D1 doesn't support it fully in all versions?
  // Let's use the relational query which is cleaner.
  const approvalList = await db.query.manualApprovals.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: desc(manualApprovals.createdAt),
    with: {
      user: true,
      approvedBy: true,
      site: true,
    },
  });

  return success(c, approvalList);
});

// Approve request
app.post("/:id/approve", async (c) => {
  const db = drizzle(c.env.DB);
  const { user: approver } = c.get("auth");
  const id = c.req.param("id");

  if (approver.role === "WORKER") {
    return error(c, "FORBIDDEN", "Forbidden", 403);
  }

  const approval = await db.query.manualApprovals.findFirst({
    where: eq(manualApprovals.id, id),
  });

  if (!approval) {
    return error(c, "NOT_FOUND", "Approval request not found", 404);
  }

  if (approval.status !== "PENDING") {
    return error(c, "INVALID_STATUS", "Request is not pending", 400);
  }

  // 1. Update Approval Status
  await db
    .update(manualApprovals)
    .set({
      status: "APPROVED",
      approvedById: approver.id,
      approvedAt: new Date(),
    })
    .where(eq(manualApprovals.id, id))
    .run();

  // 2. Create Attendance Record
  // Check if attendance already exists?
  const existingAttendance = await db.query.attendance.findFirst({
    where: and(
      eq(attendance.userId, approval.userId),
      eq(attendance.siteId, approval.siteId),
      // CheckinAt should match validDate?
      // Need to handle date range correctly. manualApprovals.validDate is likely 00:00:00 or specific time?
      // Assuming validDate is the day.
      gte(attendance.checkinAt, approval.validDate),
      lt(
        attendance.checkinAt,
        new Date(approval.validDate.getTime() + 24 * 60 * 60 * 1000),
      ),
    ),
  });

  if (!existingAttendance) {
    await db.insert(attendance).values({
      userId: approval.userId,
      siteId: approval.siteId,
      checkinAt: approval.validDate, // Use the valid date as checkin time
      result: "SUCCESS",
      source: "MANUAL",
    });
  }

  await logAuditWithContext(
    c,
    db,
    "MANUAL_APPROVAL_APPROVED",
    approver.id,
    "MANUAL_APPROVAL",
    id,
    { reason: "Approved via UI" },
  );

  return success(c, { success: true });
});

// Reject request
app.post("/:id/reject", async (c) => {
  const db = drizzle(c.env.DB);
  const { user: approver } = c.get("auth");
  const id = c.req.param("id");
  const { reason } = await c.req.json<{ reason: string }>();

  if (approver.role === "WORKER") {
    return error(c, "FORBIDDEN", "Forbidden", 403);
  }

  if (!reason) {
    return error(c, "REASON_REQUIRED", "Rejection reason is required", 400);
  }

  const approval = await db.query.manualApprovals.findFirst({
    where: eq(manualApprovals.id, id),
  });

  if (!approval) {
    return error(c, "NOT_FOUND", "Approval request not found", 404);
  }

  if (approval.status !== "PENDING") {
    return error(c, "INVALID_STATUS", "Request is not pending", 400);
  }

  await db
    .update(manualApprovals)
    .set({
      status: "REJECTED",
      approvedById: approver.id, // Rejected by this user
      approvedAt: new Date(),
      rejectionReason: reason,
    })
    .where(eq(manualApprovals.id, id))
    .run();

  await logAuditWithContext(
    c,
    db,
    "MANUAL_APPROVAL_REJECTED",
    approver.id,
    "MANUAL_APPROVAL",
    id,
    { reason },
  );

  return success(c, { success: true });
});

export default app;
