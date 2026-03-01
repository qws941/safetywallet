import type { Env } from "../types";
import { initFasConfig } from "../lib/fas";
import { fireAlert, buildFasDownAlert } from "../lib/alerting";
import { log, withRetry, persistSyncFailure } from "./helpers";
import {
  runMonthEndSnapshot,
  runAutoNomination,
  runVoteRewardDistribution,
} from "./monthly-jobs";
import { runFasFullSync, runFasSyncIncremental } from "./sync-jobs";
import {
  runDataRetention,
  runOverdueActionCheck,
  runPiiLifecycleCleanup,
  publishScheduledAnnouncements,
  runMetricsAlertCheck,
} from "./daily-jobs";

async function runScheduled(
  controller: ScheduledController,
  env: Env,
): Promise<void> {
  initFasConfig(env);
  const trigger = controller.cron;
  log.info("Scheduled trigger", { trigger });

  try {
    if (trigger.startsWith("*/5 ") || trigger === "*/5 * * * *") {
      const lastFullSync = await env.KV?.get("fas-last-full-sync");
      if (!lastFullSync) {
        try {
          await withRetry(() => runFasFullSync(env), 2, 5000);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          log.error("FAS bootstrap full sync failed", { error: errorMsg });
          await persistSyncFailure(env, {
            syncType: "FAS_WORKER",
            errorCode: "FULL_SYNC_FAILED",
            errorMessage: errorMsg,
            lockName: "fas-full",
            setFasDownStatus: true,
          });
          if (env.KV) {
            await fireAlert(
              env.KV,
              buildFasDownAlert(errorMsg),
              env.ALERT_WEBHOOK_URL,
            ).catch((alertErr: unknown) => {
              log.error("Alert webhook delivery failed", {
                error:
                  alertErr instanceof Error
                    ? alertErr.message
                    : String(alertErr),
              });
            });
          }
        }
      } else {
        try {
          await withRetry(() => runFasSyncIncremental(env), 3, 5000);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          const errorCode =
            typeof err === "object" &&
            err !== null &&
            "code" in err &&
            typeof err.code === "string"
              ? err.code
              : "UNKNOWN";
          log.error("FAS sync failed after 3 retries", {
            error: errorMsg,
            errorCode,
            trigger,
          });
          await persistSyncFailure(env, {
            syncType: "FAS_WORKER",
            errorCode,
            errorMessage: errorMsg,
            lockName: "fas",
            setFasDownStatus: true,
          });
          if (env.KV) {
            await fireAlert(
              env.KV,
              buildFasDownAlert(errorMsg),
              env.ALERT_WEBHOOK_URL,
            ).catch((alertErr: unknown) => {
              log.error("Alert webhook delivery failed", {
                error:
                  alertErr instanceof Error
                    ? alertErr.message
                    : String(alertErr),
              });
            });
          }
        }
      }

      await Promise.all([
        publishScheduledAnnouncements(env).catch((err: unknown) => {
          log.error("Announcements publish failed", {
            error: err instanceof Error ? err.message : String(err),
          });
        }),
        runMetricsAlertCheck(env).catch((err: unknown) => {
          log.error("Metrics alert check failed", {
            error: err instanceof Error ? err.message : String(err),
          });
        }),
      ]);
    }

    if (trigger === "0 0 1 * *") {
      try {
        await withRetry(() => runMonthEndSnapshot(env), 2, 3000);
      } catch (err) {
        log.error("Month-end snapshot failed after 2 retries", {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      try {
        await withRetry(() => runAutoNomination(env), 2, 3000);
      } catch (err) {
        log.error("Auto-nomination failed after 2 retries", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (trigger === "0 3 * * 0" || trigger === "0 3 * * SUN") {
      try {
        await withRetry(() => runDataRetention(env), 2, 3000);
      } catch (err) {
        log.error("Data retention failed after 2 retries", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (trigger === "0 21 * * *") {
      try {
        await withRetry(() => runFasFullSync(env), 2, 5000);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        log.error("FAS daily full sync failed", { error: errorMsg });
        await persistSyncFailure(env, {
          syncType: "FAS_WORKER",
          errorCode: "FULL_SYNC_FAILED",
          errorMessage: errorMsg,
          lockName: "fas-full",
          setFasDownStatus: true,
        });
        if (env.KV) {
          await fireAlert(
            env.KV,
            buildFasDownAlert(errorMsg),
            env.ALERT_WEBHOOK_URL,
          ).catch((alertErr: unknown) => {
            log.error("Alert webhook delivery failed", {
              error:
                alertErr instanceof Error ? alertErr.message : String(alertErr),
            });
          });
        }
      }

      await Promise.all([
        withRetry(() => runOverdueActionCheck(env), 2, 3000).catch(
          (err: unknown) => {
            log.error("Overdue action check failed", {
              error: err instanceof Error ? err.message : String(err),
            });
          },
        ),
        withRetry(() => runPiiLifecycleCleanup(env), 2, 3000).catch(
          (err: unknown) => {
            log.error("PII cleanup failed", {
              error: err instanceof Error ? err.message : String(err),
            });
          },
        ),
        withRetry(() => runVoteRewardDistribution(env), 2, 3000).catch(
          (err: unknown) => {
            log.error("Vote reward distribution failed", {
              error: err instanceof Error ? err.message : String(err),
            });
          },
        ),
      ]);
    }

    log.info("Scheduled tasks completed", { trigger });
  } catch (error) {
    log.error("Scheduled task fatal error", {
      error: error instanceof Error ? error.message : String(error),
      trigger,
    });
    throw error;
  }
}

export function scheduled(
  controller: ScheduledController,
  env: Env,
  ctx: ExecutionContext,
): void {
  ctx.waitUntil(runScheduled(controller, env));
}
