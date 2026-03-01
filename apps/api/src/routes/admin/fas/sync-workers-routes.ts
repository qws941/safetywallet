import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, or, inArray } from "drizzle-orm";
import { users, sites, siteMemberships, auditLogs } from "../../../db/schema";
import { hmac, encrypt } from "../../../lib/crypto";
import { success, error } from "../../../lib/response";
import { AdminSyncWorkersSchema } from "../../../validators/schemas";
import { requireAdmin } from "../helpers";
import { chunkArray, IN_QUERY_CHUNK_SIZE } from "./helpers";
import type {
  AdminFasBindings,
  AdminFasVariables,
  SyncFasWorkersBody,
} from "./types";

const app = new Hono<{
  Bindings: AdminFasBindings;
  Variables: AdminFasVariables;
}>();

app.post(
  "/fas/sync-workers",
  requireAdmin,
  zValidator("json", AdminSyncWorkersSchema as never),
  async (c) => {
    const db = drizzle(c.env.DB);
    const { user: currentUser } = c.get("auth");

    c.req.valid("json");
    const body = (await c.req.raw.clone().json()) as SyncFasWorkersBody;

    if (!body.siteId || !Array.isArray(body.workers)) {
      return error(
        c,
        "MISSING_REQUIRED_FIELDS",
        "siteId and workers array required",
        400,
      );
    }

    const site = await db
      .select()
      .from(sites)
      .where(eq(sites.id, body.siteId))
      .get();

    if (!site) {
      return error(c, "SITE_NOT_FOUND", "Site not found", 404);
    }

    const results = {
      created: 0,
      updated: 0,
      membershipCreated: 0,
    };

    const processedWorkers: Array<{
      externalWorkerId: string;
      name: string;
      nameMasked: string;
      phoneHash: string;
      phoneEncrypted: string;
      dobHash: string;
      dobEncrypted: string;
    }> = [];

    for (const worker of body.workers) {
      if (
        !worker.externalWorkerId ||
        !worker.name ||
        !worker.phone ||
        !worker.dob
      ) {
        continue;
      }

      const normalizedPhone = worker.phone.replace(/[^0-9]/g, "");
      const phoneHash = await hmac(c.env.HMAC_SECRET, normalizedPhone);
      const dobHash = await hmac(c.env.HMAC_SECRET, worker.dob);
      const phoneEncrypted = await encrypt(
        c.env.ENCRYPTION_KEY,
        normalizedPhone,
      );
      const dobEncrypted = await encrypt(c.env.ENCRYPTION_KEY, worker.dob);

      processedWorkers.push({
        externalWorkerId: worker.externalWorkerId,
        name: worker.name,
        nameMasked:
          worker.name.length > 1
            ? worker.name[0] + "*".repeat(worker.name.length - 1)
            : worker.name,
        phoneHash,
        phoneEncrypted,
        dobHash,
        dobEncrypted,
      });
    }

    if (processedWorkers.length > 0) {
      const externalWorkerIds = [
        ...new Set(processedWorkers.map((worker) => worker.externalWorkerId)),
      ];
      const phoneHashes = [
        ...new Set(processedWorkers.map((worker) => worker.phoneHash)),
      ];

      const existingUsers: (typeof users.$inferSelect)[] = [];

      if (
        externalWorkerIds.length <= IN_QUERY_CHUNK_SIZE &&
        phoneHashes.length <= IN_QUERY_CHUNK_SIZE
      ) {
        const chunkUsers = await db
          .select()
          .from(users)
          .where(
            or(
              inArray(users.externalWorkerId, externalWorkerIds),
              inArray(users.phoneHash, phoneHashes),
            ),
          )
          .all();
        existingUsers.push(...chunkUsers);
      } else {
        for (const workerChunk of chunkArray(
          externalWorkerIds,
          IN_QUERY_CHUNK_SIZE,
        )) {
          const chunkUsers = await db
            .select()
            .from(users)
            .where(inArray(users.externalWorkerId, workerChunk))
            .all();
          existingUsers.push(...chunkUsers);
        }

        for (const phoneChunk of chunkArray(phoneHashes, IN_QUERY_CHUNK_SIZE)) {
          const chunkUsers = await db
            .select()
            .from(users)
            .where(inArray(users.phoneHash, phoneChunk))
            .all();
          existingUsers.push(...chunkUsers);
        }
      }

      const userByExternalWorkerId = new Map<
        string,
        typeof users.$inferSelect
      >();
      const userByPhoneHash = new Map<string, typeof users.$inferSelect>();

      for (const existingUser of existingUsers) {
        if (existingUser.externalWorkerId) {
          userByExternalWorkerId.set(
            existingUser.externalWorkerId,
            existingUser,
          );
        }
        if (existingUser.phoneHash) {
          userByPhoneHash.set(existingUser.phoneHash, existingUser);
        }
      }

      const usersToUpdate = new Map<
        string,
        {
          id: string;
          externalWorkerId: string;
          name: string;
          nameMasked: string;
          phoneHash: string;
          phoneEncrypted: string;
          dobHash: string;
          dobEncrypted: string;
          updatedAt: Date;
        }
      >();
      const usersToInsert: Array<typeof users.$inferInsert> = [];
      const membershipCandidateUserIds = new Set<string>();

      for (const worker of processedWorkers) {
        const existingUser =
          userByExternalWorkerId.get(worker.externalWorkerId) ||
          userByPhoneHash.get(worker.phoneHash);

        if (existingUser) {
          usersToUpdate.set(existingUser.id, {
            id: existingUser.id,
            externalWorkerId: worker.externalWorkerId,
            name: worker.name,
            nameMasked: worker.nameMasked,
            phoneHash: worker.phoneHash,
            phoneEncrypted: worker.phoneEncrypted,
            dobHash: worker.dobHash,
            dobEncrypted: worker.dobEncrypted,
            updatedAt: new Date(),
          });
          membershipCandidateUserIds.add(existingUser.id);
          results.updated++;
          continue;
        }

        usersToInsert.push({
          externalWorkerId: worker.externalWorkerId,
          externalSystem: "FAS",
          phoneHash: worker.phoneHash,
          phoneEncrypted: worker.phoneEncrypted,
          dobHash: worker.dobHash,
          dobEncrypted: worker.dobEncrypted,
          name: worker.name,
          nameMasked: worker.nameMasked,
          role: "WORKER",
        });
        results.created++;
      }

      if (usersToUpdate.size > 0) {
        for (const userToUpdate of usersToUpdate.values()) {
          try {
            await db
              .update(users)
              .set({
                externalWorkerId: userToUpdate.externalWorkerId,
                name: userToUpdate.name,
                nameMasked: userToUpdate.nameMasked,
                phoneHash: userToUpdate.phoneHash,
                phoneEncrypted: userToUpdate.phoneEncrypted,
                dobHash: userToUpdate.dobHash,
                dobEncrypted: userToUpdate.dobEncrypted,
                updatedAt: userToUpdate.updatedAt,
              })
              .where(eq(users.id, userToUpdate.id))
              .run();
          } catch {
            await db
              .update(users)
              .set({
                externalWorkerId: userToUpdate.externalWorkerId,
                name: userToUpdate.name,
                nameMasked: userToUpdate.nameMasked,
                updatedAt: userToUpdate.updatedAt,
              })
              .where(eq(users.id, userToUpdate.id))
              .run();
          }
        }
      }

      if (usersToInsert.length > 0) {
        const insertedUsers = await db
          .insert(users)
          .values(usersToInsert)
          .returning()
          .all();

        for (const insertedUser of insertedUsers) {
          membershipCandidateUserIds.add(insertedUser.id);
        }
      }

      if (membershipCandidateUserIds.size > 0) {
        const candidateUserIds = Array.from(membershipCandidateUserIds);
        const existingMemberships: (typeof siteMemberships.$inferSelect)[] = [];

        for (const userIdChunk of chunkArray(
          candidateUserIds,
          IN_QUERY_CHUNK_SIZE,
        )) {
          const chunkMemberships = await db
            .select()
            .from(siteMemberships)
            .where(
              and(
                eq(siteMemberships.siteId, body.siteId),
                inArray(siteMemberships.userId, userIdChunk),
              ),
            )
            .all();
          existingMemberships.push(...chunkMemberships);
        }

        const existingMembershipUserIds = new Set(
          existingMemberships.map((membership) => membership.userId),
        );

        const membershipsToInsert = candidateUserIds
          .filter((userId) => !existingMembershipUserIds.has(userId))
          .map((userId) => ({
            userId,
            siteId: body.siteId,
            role: "WORKER" as const,
            status: "ACTIVE" as const,
          }));

        if (membershipsToInsert.length > 0) {
          await db.insert(siteMemberships).values(membershipsToInsert);
          results.membershipCreated += membershipsToInsert.length;
        }
      }
    }

    await db.insert(auditLogs).values({
      action: "FAS_WORKERS_SYNCED",
      actorId: currentUser.id,
      targetType: "SITE",
      targetId: body.siteId,
      reason: `Synced ${results.created} created, ${results.updated} updated, ${results.membershipCreated} memberships`,
    });

    return success(c, { results });
  },
);

export default app;
