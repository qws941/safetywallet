import { zValidator } from "@hono/zod-validator";
import { createLogger } from "../../lib/logger";

export const logger = createLogger("actions");

export type ActionStatus =
  | "NONE"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "VERIFIED"
  | "OVERDUE";

export const ACTION_STATUSES: ActionStatus[] = [
  "NONE",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "VERIFIED",
  "OVERDUE",
];

export const VALID_ACTION_TRANSITIONS: Record<ActionStatus, ActionStatus[]> = {
  NONE: ["ASSIGNED"],
  ASSIGNED: ["IN_PROGRESS", "NONE"],
  IN_PROGRESS: ["COMPLETED", "ASSIGNED"],
  COMPLETED: ["VERIFIED"],
  VERIFIED: ["IN_PROGRESS"],
  OVERDUE: ["ASSIGNED"],
};

export function isValidActionTransition(
  from: ActionStatus,
  to: ActionStatus,
): boolean {
  return VALID_ACTION_TRANSITIONS[from]?.includes(to) ?? false;
}

export const validateJson = zValidator as (
  target: "json",
  schema: unknown,
) => ReturnType<typeof zValidator>;
