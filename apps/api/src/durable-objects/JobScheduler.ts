import type { Env } from "../types";
import { createLogger } from "../lib/logger";
import { initFasConfig } from "../lib/fas";
import { getJobRegistry, type JobDefinition } from "../jobs/registry";
import { persistSyncFailure } from "../jobs/helpers";

const TICK_INTERVAL = 60_000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

type JobSchedulerRequest =
  | { action: "status" }
  | { action: "list" }
  | { action: "trigger"; jobName: string }
  | { action: "enable"; jobName: string }
  | { action: "disable"; jobName: string };

interface JobStatus {
  name: string;
  enabled: boolean;
  lastRun: number | null;
  dueNow: boolean;
  schedule: {
    intervalMs: number;
    kstHour: number | null;
    dayOfWeek: number | null;
    dayOfMonth: number | null;
  };
}

const logger = createLogger("job-scheduler");

export class JobScheduler {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    state.blockConcurrencyWhile(async () => {
      const alarm = await state.storage.getAlarm();
      if (alarm === null) {
        await state.storage.setAlarm(Date.now() + TICK_INTERVAL);
      }
    });
  }

  async alarm(): Promise<void> {
    try {
      await this.runDueJobs();
    } finally {
      await this.state.storage.setAlarm(Date.now() + TICK_INTERVAL);
    }
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let payload: JobSchedulerRequest;
    try {
      payload = (await request.json()) as JobSchedulerRequest;
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (!payload || typeof payload !== "object" || !("action" in payload)) {
      return new Response("Invalid payload", { status: 400 });
    }

    if (payload.action === "status") {
      return Response.json({ jobs: await this.getStatus() });
    }

    if (payload.action === "list") {
      return Response.json({ jobs: this.getJobRegistry() });
    }

    if (payload.action === "trigger") {
      const result = await this.triggerJob(payload.jobName);
      return Response.json(result, { status: result.ok ? 200 : 404 });
    }

    if (payload.action === "enable") {
      const result = await this.setJobEnabled(payload.jobName, true);
      return Response.json(result, { status: result.ok ? 200 : 404 });
    }

    if (payload.action === "disable") {
      const result = await this.setJobEnabled(payload.jobName, false);
      return Response.json(result, { status: result.ok ? 200 : 404 });
    }

    return new Response("Unknown action", { status: 400 });
  }

  private getJobRegistry(): JobDefinition[] {
    return getJobRegistry(this.env);
  }

  private async runDueJobs(): Promise<void> {
    initFasConfig(this.env);
    const jobs = this.getJobRegistry();
    const now = Date.now();
    const nowKst = this.toKstDate(now);

    for (const job of jobs) {
      const enabled = await this.isJobEnabled(job.name);
      if (!enabled) {
        continue;
      }

      const lastRun = await this.getJobLastRun(job.name);
      if (!this.isJobDue(job, now, nowKst, lastRun)) {
        continue;
      }

      await this.executeJob(job);
    }
  }

  private async executeJob(job: JobDefinition): Promise<void> {
    try {
      await job.fn(this.env);
      await this.setJobLastRun(job.name, Date.now());
      logger.info("Job executed", { jobName: job.name });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Job execution failed", {
        jobName: job.name,
        error: message,
      });

      if (job.name === "fas-sync" || job.name === "fas-full-sync-daily") {
        const errorCode =
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          typeof err.code === "string"
            ? err.code
            : "UNKNOWN";

        await persistSyncFailure(this.env, {
          syncType: "FAS_WORKER",
          errorCode,
          errorMessage: message,
          lockName: job.name === "fas-full-sync-daily" ? "fas-full" : "fas",
          setFasDownStatus: true,
        });
      }
    }
  }

  private async getStatus(): Promise<JobStatus[]> {
    const jobs = this.getJobRegistry();
    const now = Date.now();
    const nowKst = this.toKstDate(now);
    const statuses: JobStatus[] = [];

    for (const job of jobs) {
      const [enabled, lastRun] = await Promise.all([
        this.isJobEnabled(job.name),
        this.getJobLastRun(job.name),
      ]);

      statuses.push({
        name: job.name,
        enabled,
        lastRun,
        dueNow: enabled && this.isJobDue(job, now, nowKst, lastRun),
        schedule: {
          intervalMs: job.intervalMs,
          kstHour: job.kstHour,
          dayOfWeek: job.dayOfWeek,
          dayOfMonth: job.dayOfMonth,
        },
      });
    }

    return statuses;
  }

  private async triggerJob(
    jobName: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const job = this.getJobRegistry().find((item) => item.name === jobName);
    if (!job) {
      return { ok: false, error: "Job not found" };
    }

    initFasConfig(this.env);
    await this.executeJob(job);
    return { ok: true };
  }

  private async setJobEnabled(
    jobName: string,
    enabled: boolean,
  ): Promise<{ ok: boolean; jobName?: string; enabled?: boolean }> {
    const job = this.getJobRegistry().find((item) => item.name === jobName);
    if (!job) {
      return { ok: false };
    }

    await this.state.storage.put(`job:${jobName}:enabled`, enabled);
    return { ok: true, jobName, enabled };
  }

  private async isJobEnabled(jobName: string): Promise<boolean> {
    const enabled = await this.state.storage.get<boolean>(
      `job:${jobName}:enabled`,
    );
    return enabled ?? true;
  }

  private async getJobLastRun(jobName: string): Promise<number | null> {
    const lastRun = await this.state.storage.get<number>(
      `job:${jobName}:lastRun`,
    );
    return typeof lastRun === "number" ? lastRun : null;
  }

  private async setJobLastRun(
    jobName: string,
    timestamp: number,
  ): Promise<void> {
    await this.state.storage.put(`job:${jobName}:lastRun`, timestamp);
  }

  private toKstDate(timestamp: number): Date {
    return new Date(timestamp + KST_OFFSET_MS);
  }

  private isWithinKstWindow(job: JobDefinition, nowKst: Date): boolean {
    if (job.kstHour !== null && nowKst.getUTCHours() !== job.kstHour) {
      return false;
    }
    if (job.dayOfWeek !== null && nowKst.getUTCDay() !== job.dayOfWeek) {
      return false;
    }
    if (job.dayOfMonth !== null && nowKst.getUTCDate() !== job.dayOfMonth) {
      return false;
    }
    return true;
  }

  private getWindowKey(nowKst: Date): string {
    const year = nowKst.getUTCFullYear();
    const month = String(nowKst.getUTCMonth() + 1).padStart(2, "0");
    const day = String(nowKst.getUTCDate()).padStart(2, "0");
    const hour = String(nowKst.getUTCHours()).padStart(2, "0");
    return `${year}-${month}-${day}-${hour}`;
  }

  private getWindowKeyFromTimestamp(timestamp: number): string {
    return this.getWindowKey(this.toKstDate(timestamp));
  }

  private isJobDue(
    job: JobDefinition,
    now: number,
    nowKst: Date,
    lastRun: number | null,
  ): boolean {
    if (!this.isWithinKstWindow(job, nowKst)) {
      return false;
    }

    if (lastRun === null) {
      return true;
    }

    if (
      job.kstHour === null &&
      job.dayOfWeek === null &&
      job.dayOfMonth === null
    ) {
      return now - lastRun >= job.intervalMs;
    }

    return (
      this.getWindowKey(nowKst) !== this.getWindowKeyFromTimestamp(lastRun)
    );
  }
}
