CREATE TABLE `token_families` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `family_id` text NOT NULL,
  `token_hash` text NOT NULL,
  `parent_token_id` text,
  `used` integer NOT NULL DEFAULT 0,
  `revoked_at` integer,
  `expires_at` integer NOT NULL,
  `created_at` integer DEFAULT (unixepoch()),
  FOREIGN KEY (`parent_token_id`) REFERENCES `token_families`(`id`)
);
CREATE INDEX `token_families_user_id_idx` ON `token_families`(`user_id`);
CREATE INDEX `token_families_family_id_idx` ON `token_families`(`family_id`);
CREATE INDEX `token_families_token_hash_idx` ON `token_families`(`token_hash`);
