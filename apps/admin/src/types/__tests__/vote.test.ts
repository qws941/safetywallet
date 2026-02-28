import { describe, expect, it } from "vitest";
import type {
  VoteCandidate,
  VoteElection,
  VotePeriod,
  VoteResult,
  VoteResultsResponse,
} from "@/types/vote";

describe("vote types", () => {
  it("accepts valid vote election and period structures", () => {
    const election: VoteElection = {
      siteId: "site-1",
      month: "2026-02",
      status: "ACTIVE",
      candidateCount: 5,
      totalVotes: 120,
    };

    const period: VotePeriod = {
      id: "period-1",
      siteId: "site-1",
      month: "2026-02",
      startDate: "2026-02-01",
      endDate: "2026-02-29",
      createdAt: "2026-02-01T00:00:00.000Z",
    };

    expect(election.status).toBe("ACTIVE");
    expect(period.siteId).toBe("site-1");
  });

  it("links candidate user shape to vote result response", () => {
    const candidate: VoteCandidate = {
      id: "candidate-1",
      userId: "user-1",
      siteId: "site-1",
      month: "2026-02",
      source: "ADMIN",
      createdAt: "2026-02-01T00:00:00.000Z",
      user: {
        id: "user-1",
        name: "홍길동",
        nameMasked: "홍*동",
        companyName: "안전건설",
        tradeType: "배관",
      },
      voteCount: 10,
    };

    const result: VoteResult = {
      user: candidate.user,
      voteCount: candidate.voteCount ?? 0,
      candidateId: candidate.id,
      source: candidate.source,
    };

    const response: VoteResultsResponse = {
      month: "2026-02",
      results: [result],
    };

    expect(response.results[0].user.nameMasked).toBe("홍*동");
  });
});
