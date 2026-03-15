CREATE INDEX IF NOT EXISTS "posts_category_created_at_idx" ON "posts" ("category", "created_at");
CREATE INDEX IF NOT EXISTS "votes_voter_id_month_idx" ON "votes" ("voter_id", "month");
CREATE INDEX IF NOT EXISTS "quiz_attempts_user_id_quiz_id_idx" ON "quiz_attempts" ("user_id", "quiz_id");
CREATE INDEX IF NOT EXISTS "points_ledger_user_id_created_at_idx" ON "points_ledger" ("user_id", "created_at");
