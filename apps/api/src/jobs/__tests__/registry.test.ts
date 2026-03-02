import { describe, expect, it } from "vitest";
import type { Env } from "../../types";
import { getJobRegistry } from "../registry";

describe("job registry", () => {
  it("returns all expected job definitions", () => {
    const env = {} as Env;
    const jobs = getJobRegistry(env);

    expect(jobs.map((job) => job.name)).toEqual([
      "fas-sync",
      "publish-scheduled-announcements",
      "metrics-alert-check",
      "fas-full-sync-daily",
      "overdue-action-check",
      "pii-lifecycle-cleanup",
      "vote-reward-distribution",
      "data-retention",
      "month-end-snapshot",
      "auto-nomination",
    ]);
  });

  it("maps 5-minute jobs to interval-only schedule", () => {
    const jobs = getJobRegistry({} as Env);
    const fiveMinuteJobs = jobs.filter((job) =>
      [
        "fas-sync",
        "publish-scheduled-announcements",
        "metrics-alert-check",
      ].includes(job.name),
    );

    for (const job of fiveMinuteJobs) {
      expect(job.intervalMs).toBe(5 * 60 * 1000);
      expect(job.kstHour).toBeNull();
      expect(job.dayOfWeek).toBeNull();
      expect(job.dayOfMonth).toBeNull();
    }
  });

  it("maps daily, weekly, and monthly KST schedules", () => {
    const jobs = getJobRegistry({} as Env);

    expect(
      jobs.find((job) => job.name === "fas-full-sync-daily"),
    ).toMatchObject({
      intervalMs: 24 * 60 * 60 * 1000,
      kstHour: 21,
      dayOfWeek: null,
      dayOfMonth: null,
    });

    expect(jobs.find((job) => job.name === "data-retention")).toMatchObject({
      intervalMs: 7 * 24 * 60 * 60 * 1000,
      kstHour: 3,
      dayOfWeek: 0,
      dayOfMonth: null,
    });

    expect(jobs.find((job) => job.name === "month-end-snapshot")).toMatchObject(
      {
        intervalMs: 30 * 24 * 60 * 60 * 1000,
        kstHour: 0,
        dayOfWeek: null,
        dayOfMonth: 1,
      },
    );

    expect(jobs.find((job) => job.name === "auto-nomination")).toMatchObject({
      intervalMs: 30 * 24 * 60 * 60 * 1000,
      kstHour: 0,
      dayOfWeek: null,
      dayOfMonth: 1,
    });
  });
});
