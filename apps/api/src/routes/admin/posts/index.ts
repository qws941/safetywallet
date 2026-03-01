import { Hono } from "hono";
import type { Env, AuthContext } from "../../../types";
import { registerListRoutes } from "./list-routes";
import { registerModerationRoutes } from "./moderation-routes";

const adminPosts = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

registerListRoutes(adminPosts);
registerModerationRoutes(adminPosts);

export { adminPosts };
export default adminPosts;
