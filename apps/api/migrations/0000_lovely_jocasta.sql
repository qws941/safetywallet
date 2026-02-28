CREATE TABLE `access_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`require_checkin` integer DEFAULT true NOT NULL,
	`day_cutoff_hour` integer DEFAULT 5 NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `access_policies_site_id_unique` ON `access_policies` (`site_id`);--> statement-breakpoint
CREATE TABLE `action_images` (
	`id` text PRIMARY KEY NOT NULL,
	`action_id` text NOT NULL,
	`file_url` text NOT NULL,
	`thumbnail_url` text,
	`created_at` integer,
	FOREIGN KEY (`action_id`) REFERENCES `actions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `actions` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`assignee_type` text NOT NULL,
	`assignee_id` text,
	`due_date` integer,
	`action_status` text DEFAULT 'OPEN' NOT NULL,
	`completion_note` text,
	`completed_at` integer,
	`created_at` integer,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `actions_post_idx` ON `actions` (`post_id`);--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`author_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`is_pinned` integer DEFAULT false NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `announcements_site_pinned_created_at_idx` ON `announcements` (`site_id`,`is_pinned`,`created_at`);--> statement-breakpoint
CREATE TABLE `attendances` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`user_id` text,
	`external_worker_id` text,
	`checkin_at` integer NOT NULL,
	`result` text NOT NULL,
	`device_id` text,
	`source` text NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `attendance_site_checkin_idx` ON `attendances` (`site_id`,`checkin_at`);--> statement-breakpoint
CREATE INDEX `attendance_user_checkin_idx` ON `attendances` (`user_id`,`checkin_at`);--> statement-breakpoint
CREATE INDEX `attendance_external_checkin_idx` ON `attendances` (`external_worker_id`,`checkin_at`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`reason` text,
	`ip` text,
	`user_agent` text,
	`created_at` integer,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `audit_logs_actor_created_at_idx` ON `audit_logs` (`actor_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_target_idx` ON `audit_logs` (`target_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `manual_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`site_id` text NOT NULL,
	`approved_by_id` text NOT NULL,
	`reason` text NOT NULL,
	`valid_date` integer NOT NULL,
	`approved_at` integer,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `manual_approvals_user_valid_date_idx` ON `manual_approvals` (`user_id`,`valid_date`);--> statement-breakpoint
CREATE INDEX `manual_approvals_site_valid_date_idx` ON `manual_approvals` (`site_id`,`valid_date`);--> statement-breakpoint
CREATE TABLE `points_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`site_id` text NOT NULL,
	`post_id` text,
	`ref_ledger_id` text,
	`amount` integer NOT NULL,
	`reason_code` text NOT NULL,
	`reason_text` text,
	`admin_id` text,
	`settle_month` text NOT NULL,
	`occurred_at` integer,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `points_ledger_user_site_month_idx` ON `points_ledger` (`user_id`,`site_id`,`settle_month`);--> statement-breakpoint
CREATE INDEX `points_ledger_site_month_idx` ON `points_ledger` (`site_id`,`settle_month`);--> statement-breakpoint
CREATE TABLE `post_images` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`file_url` text NOT NULL,
	`thumbnail_url` text,
	`created_at` integer,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`site_id` text NOT NULL,
	`category` text NOT NULL,
	`hazard_type` text,
	`risk_level` text,
	`location_floor` text,
	`location_zone` text,
	`location_detail` text,
	`content` text NOT NULL,
	`visibility` text DEFAULT 'WORKER_PUBLIC' NOT NULL,
	`is_anonymous` integer DEFAULT false NOT NULL,
	`review_status` text DEFAULT 'RECEIVED' NOT NULL,
	`action_status` text DEFAULT 'NONE' NOT NULL,
	`is_urgent` integer DEFAULT false NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `posts_site_review_status_idx` ON `posts` (`site_id`,`review_status`);--> statement-breakpoint
CREATE INDEX `posts_site_created_at_idx` ON `posts` (`site_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `posts_user_created_at_idx` ON `posts` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`admin_id` text NOT NULL,
	`action` text NOT NULL,
	`comment` text,
	`reason_code` text,
	`created_at` integer,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reviews_post_created_at_idx` ON `reviews` (`post_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`refresh_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_refresh_token_unique` ON `sessions` (`refresh_token`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `site_memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`site_id` text NOT NULL,
	`role` text DEFAULT 'WORKER' NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`joined_at` integer,
	`left_at` integer,
	`left_reason` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `site_memberships_site_status_idx` ON `site_memberships` (`site_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `site_memberships_user_id_site_id_unique` ON `site_memberships` (`user_id`,`site_id`);--> statement-breakpoint
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`join_code` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`join_enabled` integer DEFAULT true NOT NULL,
	`requires_approval` integer DEFAULT false NOT NULL,
	`created_at` integer,
	`closed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sites_join_code_unique` ON `sites` (`join_code`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`phone_hash` text,
	`name` text,
	`name_masked` text,
	`dob` text,
	`dob_hash` text,
	`external_system` text,
	`external_worker_id` text,
	`company_name` text,
	`trade_type` text,
	`role` text DEFAULT 'WORKER' NOT NULL,
	`pii_view_full` integer DEFAULT false NOT NULL,
	`can_award_points` integer DEFAULT false NOT NULL,
	`can_manage_users` integer DEFAULT false NOT NULL,
	`otp_code` text,
	`otp_expires_at` integer,
	`otp_attempt_count` integer DEFAULT 0 NOT NULL,
	`refresh_token` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_unique` ON `users` (`phone`);--> statement-breakpoint
CREATE INDEX `users_phone_hash_dob_hash_idx` ON `users` (`phone_hash`,`dob_hash`);--> statement-breakpoint
CREATE INDEX `users_external_idx` ON `users` (`external_system`,`external_worker_id`);--> statement-breakpoint
CREATE TABLE `vote_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`month` text NOT NULL,
	`user_id` text NOT NULL,
	`source` text NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `vote_candidates_site_month_idx` ON `vote_candidates` (`site_id`,`month`);--> statement-breakpoint
CREATE UNIQUE INDEX `vote_candidates_site_id_month_user_id_unique` ON `vote_candidates` (`site_id`,`month`,`user_id`);--> statement-breakpoint
CREATE TABLE `votes` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`month` text NOT NULL,
	`voter_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`voted_at` integer,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`voter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`candidate_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `votes_site_month_idx` ON `votes` (`site_id`,`month`);--> statement-breakpoint
CREATE UNIQUE INDEX `votes_site_id_month_voter_id_unique` ON `votes` (`site_id`,`month`,`voter_id`);