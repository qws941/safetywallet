CREATE TABLE IF NOT EXISTS "user_locks" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "locked_by" text NOT NULL,
  "locked_at" integer NOT NULL,
  "expires_at" integer NOT NULL,
  "reason" text NOT NULL,
  "category" text NOT NULL,
  "unlocked_at" integer,
  "unlocked_by" text,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY ("locked_by") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action,
  FOREIGN KEY ("unlocked_by") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS "user_locks_user_id_idx" ON "user_locks" ("user_id");
CREATE INDEX IF NOT EXISTS "user_locks_locked_at_idx" ON "user_locks" ("locked_at");
