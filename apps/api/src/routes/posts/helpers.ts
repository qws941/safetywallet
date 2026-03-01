import { zValidator } from "@hono/zod-validator";
import type { Hono } from "hono";
import type { Env, AuthContext } from "../../types";

export type PostsRouteEnv = {
  Bindings: Env;
  Variables: { auth: AuthContext };
};

export type PostsRouteApp = Hono<PostsRouteEnv>;

export type CategoryType =
  | "HAZARD"
  | "UNSAFE_BEHAVIOR"
  | "INCONVENIENCE"
  | "SUGGESTION"
  | "BEST_PRACTICE";

export const validCategories: CategoryType[] = [
  "HAZARD",
  "UNSAFE_BEHAVIOR",
  "INCONVENIENCE",
  "SUGGESTION",
  "BEST_PRACTICE",
];

export const validateJson = zValidator as (
  target: "json",
  schema: unknown,
) => ReturnType<typeof zValidator>;
