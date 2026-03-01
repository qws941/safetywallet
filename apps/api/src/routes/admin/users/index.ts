import { Hono } from "hono";
import type { Env, AuthContext } from "../../../types";
import { createLogger } from "../../../lib/logger";
import { router } from "./routes";

const logger = createLogger("admin/users");

const app = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

// Mount all user management routes
app.route("/", router);

export default app;
