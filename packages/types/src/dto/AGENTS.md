# AGENTS: TYPES/DTO

## SCOPE DELTA

- This folder defines DTO file inventory and domain contracts only.
- Parent already defines package-wide rules; do not restate them here.

## FILE INVENTORY (11)

- `auth.dto.ts`
- `user.dto.ts`
- `site.dto.ts`
- `post.dto.ts`
- `review.dto.ts`
- `points.dto.ts`
- `action.dto.ts`
- `announcement.dto.ts`
- `education.dto.ts`
- `vote.dto.ts`
- `analytics.dto.ts`

## BARREL ORDER

- `index.ts` re-exports all 11 files.
- Keep barrel complete after file add/remove.
- Keep domain grouping stable (auth/user/site/post/review/points/action/announcement/education/vote/analytics).

## DTO SYMBOLS (CURRENT)

- `auth`: `OtpRequestDto`, `OtpVerifyDto`, `TokenRefreshDto`, `AuthResponseDto`, `TokenPayloadDto`, `MeResponseDto`.
- `user`: `UserDto`, `UserProfileDto`, `UpdateProfileDto`.
- `site`: `SiteDto`, `CreateSiteDto`, `SiteMemberDto`, `UpdateMemberStatusDto`, `DashboardStatsDto`.
- `post`: `CreatePostDto`, `PostDto`, `PostImageDto`, `PostListDto`, `PostFilterDto`.
- `review`: `ReviewActionDto`, `ReviewDto`.
- `points`: `AwardPointsDto`, `RevokePointsDto`, `PointsLedgerDto`, `PointsBalanceDto`, `PointsHistoryItemDto`, `PointsHistoryFilterDto`.
- `action`: `CreateActionDto`, `ActionDto`, `ActionImageDto`, `UpdateActionStatusDto`.
- `announcement`: `CreateAnnouncementDto`, `AnnouncementDto`, `UpdateAnnouncementDto`.
- `education`: `CreateEducationContentDto`, `EducationContentDto`, `EducationContentListDto`, `CreateQuizDto`, `CreateQuizQuestionDto`, `QuizDto`, `QuizQuestionDto`, `QuizListDto`, `SubmitQuizAttemptDto`, `QuizAttemptDto`, `QuizAttemptFilterDto`, `CreateStatutoryTrainingDto`, `UpdateStatutoryTrainingDto`, `StatutoryTrainingDto`, `StatutoryTrainingFilterDto`, `CreateTbmRecordDto`, `TbmRecordDto`, `TbmAttendeeDto`, `TbmRecordListDto`, `TbmRecordFilterDto`.
- `vote`: `VoteCandidateDto`, `CreateVoteCandidateDto`, `VoteResultDto`, `VoteDto`, `MyVoteDto`, `VotePeriodSummaryDto`, `VoteResultExportDto`.
- `analytics`: `TrendDataPointDto`, `TrendFilterDto`, `PointsDistributionDto`.

## EDIT GUARDRAILS

- Keep enum-typed fields wired to `../enums` imports; avoid string fallback.
- Keep optional fields explicit (`?` vs `| null`) matching current API payload semantics.
- Preserve nested object shapes used by list/detail responses.
