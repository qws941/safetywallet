import { Hono } from "hono";
import type { Env, AuthContext } from "../../types";

const passwordRoute = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

export default passwordRoute;
