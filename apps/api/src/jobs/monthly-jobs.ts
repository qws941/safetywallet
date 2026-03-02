import type { Env } from "../types";
import { drizzle } from "drizzle-orm/d1";
import { eq, sql, and, gte, lt, desc, inArray } from "drizzle-orm";
import {
  pointsLedger,
  siteMemberships,
  auditLogs,
  sites,
  voteCandidates,
  votePeriods,
  votes,
  pointPolicies,
  pushSubscriptions,
} from "../db/schema";
import { acquireSyncLock, releaseSyncLock } from "../lib/sync-lock";
import { dbBatchChunked } from "../db/helpers";
import {
  enqueueNotification,
  type NotificationQueueMessage,
} from "../lib/notification-queue";
import {
  log,
  getKSTDate,
  getMonthRange,
  formatSettleMonth,
  getOrCreateSystemUser,
  VOTE_REWARD_POINTS,
  VOTE_REWARD_POINT_CODES,
} from "./helpers";

export async function runMonthEndSnapshot(env: Env): Promise<void> {
  const db = drizzle(env.DB);
  const kstNow = getKSTDate();
  const { start, end } = getMonthRange(kstNow);
  const settleMonth = formatSettleMonth(kstNow);

  log.info("Running month-end snapshot", { kstNow: kstNow.toISOString() });

  const systemUserId = await getOrCreateSystemUser(db);

  const existingSnapshots = await db
    .select({ id: pointsLedger.id })
    .from(pointsLedger)
    .where(
      and(
        eq(pointsLedger.reasonCode, "MONTHLY_SNAPSHOT"),
        eq(pointsLedger.settleMonth, settleMonth),
      ),
    )
    .limit(1)
    .all();

  if (existingSnapshots.length > 0) {
    log.warn("Month-end snapshot already exists, skipping", { settleMonth });
    return;
  }

  const memberships = await db
    .select({
      userId: siteMemberships.userId,
      siteId: siteMemberships.siteId,
    })
    .from(siteMemberships)
    .where(eq(siteMemberships.status, "ACTIVE"))
    .all();

  const balances: Array<{
    userId: string;
    siteId: string;
    balance: number;
  }> = [];

  for (const membership of memberships) {
    const result = await db
      .select({
        balance: sql<number>`COALESCE(SUM(${pointsLedger.amount}), 0)`,
      })
      .from(pointsLedger)
      .where(
        and(
          eq(pointsLedger.userId, membership.userId),
          eq(pointsLedger.siteId, membership.siteId),
          gte(pointsLedger.createdAt, start),
          lt(pointsLedger.createdAt, end),
        ),
      )
      .get();

    const monthlyBalance = result?.balance || 0;
    if (monthlyBalance !== 0) {
      balances.push({
        userId: membership.userId,
        siteId: membership.siteId,
        balance: monthlyBalance,
      });
    }
  }

  if (balances.length > 0) {
    const ops: Promise<unknown>[] = balances.map((b) =>
      db.insert(pointsLedger).values({
        userId: b.userId,
        siteId: b.siteId,
        amount: 0,
        reasonCode: "MONTHLY_SNAPSHOT",
        reasonText: `월간 정산 스냅샷 - ${kstNow.getFullYear()}년 ${kstNow.getMonth() + 1}월 (잔액: ${b.balance})`,
        settleMonth,
      }),
    );

    ops.push(
      db.insert(auditLogs).values({
        actorId: systemUserId,
        action: "MONTH_END_SNAPSHOT",
        targetType: "POINTS",
        targetId: settleMonth,
        reason: JSON.stringify({
          period: settleMonth,
          membershipCount: memberships.length,
          snapshotCount: balances.length,
        }),
        ip: "SYSTEM",
      }),
    );

    try {
      await dbBatchChunked(db, ops);
    } catch (err) {
      log.error("Month-end snapshot batch failed", {
        settleMonth,
        balanceCount: balances.length,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  log.info("Snapshot complete", { snapshotCount: balances.length });
}

export async function runAutoNomination(env: Env): Promise<void> {
  const db = drizzle(env.DB);
  const kstNow = getKSTDate();

  const prevMonthDate = new Date(
    kstNow.getFullYear(),
    kstNow.getMonth() - 1,
    1,
  );
  const prevMonth = formatSettleMonth(prevMonthDate);
  const { start: monthStart, end: monthEnd } = getMonthRange(prevMonthDate);

  log.info("Running auto-nomination", { month: prevMonth });

  const systemUserId = await getOrCreateSystemUser(db);

  const activeSites = await db
    .select({
      id: sites.id,
      name: sites.name,
      topN: sites.autoNominationTopN,
    })
    .from(sites)
    .where(and(eq(sites.active, true), gte(sites.autoNominationTopN, 1)));

  if (activeSites.length === 0) {
    log.info("No sites with auto-nomination enabled");
    return;
  }

  let totalNominated = 0;

  for (const site of activeSites) {
    const topEarners = await db
      .select({
        userId: pointsLedger.userId,
        totalPoints: sql<number>`SUM(${pointsLedger.amount})`.as("totalPoints"),
      })
      .from(pointsLedger)
      .where(
        and(
          eq(pointsLedger.siteId, site.id),
          gte(pointsLedger.createdAt, monthStart),
          lt(pointsLedger.createdAt, monthEnd),
        ),
      )
      .groupBy(pointsLedger.userId)
      .orderBy(desc(sql`SUM(${pointsLedger.amount})`))
      .limit(site.topN);

    if (topEarners.length === 0) {
      log.info("No point earners for site", {
        siteId: site.id,
        siteName: site.name,
      });
      continue;
    }

    const activeMembers = await db
      .select({ userId: siteMemberships.userId })
      .from(siteMemberships)
      .where(
        and(
          eq(siteMemberships.siteId, site.id),
          eq(siteMemberships.status, "ACTIVE"),
          inArray(
            siteMemberships.userId,
            topEarners.map((e) => e.userId),
          ),
        ),
      );

    const activeMemberIds = new Set(activeMembers.map((m) => m.userId));
    const eligibleEarners = topEarners.filter((e) =>
      activeMemberIds.has(e.userId),
    );

    if (eligibleEarners.length === 0) {
      log.info("No eligible earners for site", { siteId: site.id });
      continue;
    }

    const insertOps = eligibleEarners.map((earner) =>
      db
        .insert(voteCandidates)
        .values({
          id: crypto.randomUUID(),
          siteId: site.id,
          month: prevMonth,
          userId: earner.userId,
          source: "AUTO",
        })
        .onConflictDoNothing(),
    );

    await dbBatchChunked(db, insertOps);

    totalNominated += eligibleEarners.length;
    log.info("Auto-nominated candidates for site", {
      siteId: site.id,
      siteName: site.name,
      count: eligibleEarners.length,
      topN: site.topN,
    });
  }

  await db.insert(auditLogs).values({
    action: "AUTO_NOMINATE_CANDIDATES",
    actorId: systemUserId,
    targetType: "VOTE_CANDIDATE",
    targetId: prevMonth,
    reason: JSON.stringify({
      month: prevMonth,
      sitesProcessed: activeSites.length,
      totalNominated,
    }),
    ip: "SYSTEM",
  });

  log.info("Auto-nomination complete", {
    month: prevMonth,
    sitesProcessed: activeSites.length,
    totalNominated,
  });
}

export async function runVoteRewardDistribution(env: Env): Promise<void> {
  if (!env.KV) {
    log.warn("KV binding unavailable; skipping vote reward distribution");
    return;
  }

  const lock = await acquireSyncLock(env.KV, "vote-reward-distribution", 600);
  if (!lock.acquired) {
    log.info("Vote reward distribution already in progress, skipping");
    return;
  }

  const db = drizzle(env.DB);
  const nowEpoch = Math.floor(Date.now() / 1000);

  try {
    const systemUserId = await getOrCreateSystemUser(db);
    const completedPeriods = await db
      .select({
        siteId: votePeriods.siteId,
        month: votePeriods.month,
        endDate: votePeriods.endDate,
      })
      .from(votePeriods)
      .where(lt(votePeriods.endDate, nowEpoch))
      .all();

    if (completedPeriods.length === 0) {
      log.info("No completed vote periods for reward distribution");
      return;
    }

    let processedPeriods = 0;
    let skippedPeriods = 0;
    let rewardedUsers = 0;
    let awardedPoints = 0;

    for (const period of completedPeriods) {
      const existingReward = await db
        .select({ id: pointsLedger.id })
        .from(pointsLedger)
        .where(
          and(
            eq(pointsLedger.siteId, period.siteId),
            eq(pointsLedger.settleMonth, period.month),
            sql`${pointsLedger.reasonCode} IN (${VOTE_REWARD_POINT_CODES[0]}, ${VOTE_REWARD_POINT_CODES[1]}, ${VOTE_REWARD_POINT_CODES[2]})`,
          ),
        )
        .limit(1)
        .all();

      if (existingReward.length > 0) {
        skippedPeriods += 1;
        continue;
      }

      const winners = await db
        .select({
          candidateId: votes.candidateId,
          voteCount: sql<number>`COUNT(*)`.as("voteCount"),
        })
        .from(votes)
        .where(
          and(eq(votes.siteId, period.siteId), eq(votes.month, period.month)),
        )
        .groupBy(votes.candidateId)
        .orderBy(desc(sql`COUNT(*)`), sql`MIN(${votes.votedAt})`)
        .limit(3)
        .all();

      if (winners.length === 0) {
        skippedPeriods += 1;
        continue;
      }

      const rewardPolicies = await db
        .select({
          reasonCode: pointPolicies.reasonCode,
          defaultAmount: pointPolicies.defaultAmount,
        })
        .from(pointPolicies)
        .where(
          and(
            eq(pointPolicies.siteId, period.siteId),
            inArray(pointPolicies.reasonCode, [...VOTE_REWARD_POINT_CODES]),
            eq(pointPolicies.isActive, true),
          ),
        )
        .all();

      const rewardAmountMap = new Map<string, number>();
      for (const policy of rewardPolicies) {
        rewardAmountMap.set(policy.reasonCode, policy.defaultAmount);
      }

      const rewards = winners.map((winner, index) => {
        const reasonCode = VOTE_REWARD_POINT_CODES[index];
        const points =
          rewardAmountMap.get(reasonCode) ?? VOTE_REWARD_POINTS[index];
        return {
          userId: winner.candidateId,
          siteId: period.siteId,
          amount: points,
          reasonCode,
          reasonText: `월간 투표 ${index + 1}위 보상 (${winner.voteCount}표)`,
          settleMonth: period.month,
          adminId: systemUserId,
        };
      });

      await db.insert(pointsLedger).values(rewards);

      if (env.NOTIFICATION_QUEUE) {
        try {
          const rewardedUserIds = rewards.map((r) => r.userId);
          const subs = await db
            .select({
              id: pushSubscriptions.id,
              userId: pushSubscriptions.userId,
              endpoint: pushSubscriptions.endpoint,
              p256dh: pushSubscriptions.p256dh,
              auth: pushSubscriptions.auth,
              failCount: pushSubscriptions.failCount,
            })
            .from(pushSubscriptions)
            .where(inArray(pushSubscriptions.userId, rewardedUserIds))
            .all();

          if (subs.length > 0) {
            const queueMsg: NotificationQueueMessage = {
              type: "push_bulk",
              subscriptions: subs.map((s) => ({
                id: s.id,
                userId: s.userId,
                endpoint: s.endpoint,
                p256dh: s.p256dh,
                auth: s.auth,
                failCount: s.failCount,
              })),
              message: {
                title: "투표 보상 지급",
                body: "월간 안전스타 투표 보상 포인트가 지급되었습니다.",
                data: { type: "VOTE_REWARD", url: "/points" },
              },
              enqueuedAt: new Date().toISOString(),
            };
            await enqueueNotification(env.NOTIFICATION_QUEUE, queueMsg);
          }
        } catch (notifErr) {
          const errObj =
            notifErr instanceof Error
              ? {
                  name: notifErr.name,
                  message: notifErr.message,
                  stack: notifErr.stack,
                }
              : {
                  name: "UnknownError",
                  message: String(notifErr),
                };
          log.warn("Failed to send reward notifications", {
            error: errObj,
          });
        }
      }

      processedPeriods += 1;
      rewardedUsers += rewards.length;
      awardedPoints += rewards.reduce((sum, reward) => sum + reward.amount, 0);
    }

    if (processedPeriods > 0) {
      await db.insert(auditLogs).values({
        actorId: systemUserId,
        action: "VOTE_REWARD_DISTRIBUTED",
        targetType: "VOTE",
        targetId: new Date().toISOString(),
        reason: JSON.stringify({
          processedPeriods,
          skippedPeriods,
          rewardedUsers,
          awardedPoints,
        }),
        ip: "SYSTEM",
      });
    }

    log.info("Vote reward distribution completed", {
      totalCompletedPeriods: completedPeriods.length,
      processedPeriods,
      skippedPeriods,
      rewardedUsers,
      awardedPoints,
    });
  } finally {
    await releaseSyncLock(env.KV, "vote-reward-distribution", lock.holder);
  }
}
