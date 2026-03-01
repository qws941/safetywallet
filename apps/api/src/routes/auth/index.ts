import { Hono } from "hono";
import type { AuthContext, Env } from "../../types";
import registerRoute from "./register";
import loginRoute from "./login";
import passwordRoute from "./password";
import sessionRoute from "./session";

const auth = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

auth.route("/", registerRoute);
auth.route("/", loginRoute);
auth.route("/", passwordRoute);
auth.route("/", sessionRoute);

export default auth;
