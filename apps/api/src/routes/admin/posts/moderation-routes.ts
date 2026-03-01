import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env, AuthContext } from "../../../types";
import {
  AdminReviewPostSchema,
  AdminManualApprovalSchema,
  AdminEmergencyDeleteSchema,
  AdminEmergencyActionPurgeSchema,
  AdminDeletePostSchema,
} from "../../../validators/schemas";
import { requireManagerOrAdmin } from "../helpers";
import { reviewPostHandler, manualApprovalHandler } from "./review-handlers";
import {
  deletePostHandler,
  emergencyPurgePostHandler,
  emergencyPurgeActionHandler,
} from "./delete-handlers";

type AdminPostsApp = Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>;

export function registerModerationRoutes(app: AdminPostsApp) {
  app.post(
    "/posts/:id/review",
    requireManagerOrAdmin,
    zValidator("json", AdminReviewPostSchema as never),
    reviewPostHandler,
  );

  app.post(
    "/manual-approval",
    requireManagerOrAdmin,
    zValidator("json", AdminManualApprovalSchema as never),
    manualApprovalHandler,
  );

  app.delete(
    "/posts/:id",
    requireManagerOrAdmin,
    zValidator("json", AdminDeletePostSchema as never),
    deletePostHandler,
  );

  app.delete(
    "/posts/:id/emergency-purge",
    zValidator("json", AdminEmergencyDeleteSchema),
    emergencyPurgePostHandler,
  );

  app.delete(
    "/actions/:id/emergency-purge",
    zValidator("json", AdminEmergencyActionPurgeSchema),
    emergencyPurgeActionHandler,
  );
}
