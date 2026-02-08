export interface VoteCandidateDto {
  id: string;
  siteId: string;
  month: string; // YYYY-MM
  userId: string;
  userName?: string;
  source: "ADMIN" | "AUTO";
  nominatedAt: string;
  voteCount?: number;
}

export interface CreateVoteCandidateDto {
  userId: string;
  siteId: string;
  month: string; // YYYY-MM
  source?: "ADMIN" | "AUTO";
}

export interface VoteResultDto {
  candidateId: string;
  candidateName: string;
  voteCount: number;
  rank: number;
}

export interface VoteDto {
  id: string;
  siteId: string;
  month: string;
  voterId: string;
  candidateId: string;
  candidateName?: string;
  votedAt: string;
}

export interface MyVoteDto {
  month: string;
  candidateId: string;
  candidateName: string;
  votedAt: string;
}

export interface VotePeriodSummaryDto {
  month: string;
  siteId: string;
  totalCandidates: number;
  totalVotes: number;
  isActive: boolean; // current month
}

export interface VoteResultExportDto {
  month: string;
  siteId: string;
  siteName?: string;
  results: VoteResultDto[];
  totalVotes: number;
  exportedAt: string;
}
