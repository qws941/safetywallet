CREATE TABLE `api_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bucket` text NOT NULL,
	`endpoint` text NOT NULL,
	`method` text NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`total_duration_ms` integer DEFAULT 0 NOT NULL,
	`max_duration_ms` integer DEFAULT 0 NOT NULL,
	`status_2xx` integer DEFAULT 0 NOT NULL,
	`status_4xx` integer DEFAULT 0 NOT NULL,
	`status_5xx` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_metrics_bucket_endpoint_method_idx` ON `api_metrics` (`bucket`,`endpoint`,`method`);--> statement-breakpoint
CREATE INDEX `api_metrics_bucket_idx` ON `api_metrics` (`bucket`);--> statement-breakpoint
CREATE TABLE `device_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`device_id` text NOT NULL,
	`device_info` text,
	`first_seen_at` integer,
	`last_seen_at` integer,
	`is_trusted` integer DEFAULT true NOT NULL,
	`is_banned` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `device_registrations_device_idx` ON `device_registrations` (`device_id`);--> statement-breakpoint
CREATE INDEX `device_registrations_user_idx` ON `device_registrations` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `device_registrations_user_id_device_id_unique` ON `device_registrations` (`user_id`,`device_id`);--> statement-breakpoint
CREATE TABLE `disputes` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`ref_review_id` text,
	`ref_points_ledger_id` text,
	`ref_attendance_id` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`resolved_by_id` text,
	`resolution_note` text,
	`resolved_at` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ref_review_id`) REFERENCES `reviews`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`ref_points_ledger_id`) REFERENCES `points_ledger`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`ref_attendance_id`) REFERENCES `attendances`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`resolved_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `disputes_site_idx` ON `disputes` (`site_id`);--> statement-breakpoint
CREATE INDEX `disputes_user_idx` ON `disputes` (`user_id`);--> statement-breakpoint
CREATE INDEX `disputes_status_idx` ON `disputes` (`status`);--> statement-breakpoint
CREATE TABLE `education_contents` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`content_type` text NOT NULL,
	`content_url` text,
	`thumbnail_url` text,
	`duration_minutes` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by_id` text NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `education_contents_site_idx` ON `education_contents` (`site_id`);--> statement-breakpoint
CREATE INDEX `education_contents_site_active_idx` ON `education_contents` (`site_id`,`is_active`);--> statement-breakpoint
CREATE TABLE `join_code_history` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`join_code` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`created_by_id` text NOT NULL,
	`invalidated_at` integer,
	`created_at` integer,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `join_code_history_site_idx` ON `join_code_history` (`site_id`);--> statement-breakpoint
CREATE INDEX `join_code_history_code_idx` ON `join_code_history` (`join_code`);--> statement-breakpoint
CREATE TABLE `point_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`reason_code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`default_amount` integer NOT NULL,
	`min_amount` integer,
	`max_amount` integer,
	`daily_limit` integer,
	`monthly_limit` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `point_policies_site_idx` ON `point_policies` (`site_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `point_policies_site_id_reason_code_unique` ON `point_policies` (`site_id`,`reason_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `point_policies_site_id_name_unique` ON `point_policies` (`site_id`,`name`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer,
	`last_used_at` integer,
	`fail_count` integer DEFAULT 0 NOT NULL,
	`user_agent` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `push_sub_user_idx` ON `push_subscriptions` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `push_sub_endpoint_idx` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE TABLE `quiz_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`user_id` text NOT NULL,
	`site_id` text NOT NULL,
	`answers` text,
	`score` integer DEFAULT 0 NOT NULL,
	`passed` integer DEFAULT false NOT NULL,
	`points_awarded` integer DEFAULT 0 NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quiz_attempts_quiz_user_idx` ON `quiz_attempts` (`quiz_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `quiz_attempts_site_idx` ON `quiz_attempts` (`site_id`);--> statement-breakpoint
CREATE INDEX `quiz_attempts_user_idx` ON `quiz_attempts` (`user_id`);--> statement-breakpoint
CREATE TABLE `quiz_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`question` text NOT NULL,
	`options` text NOT NULL,
	`correct_answer` integer NOT NULL,
	`explanation` text,
	`order_index` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quiz_questions_quiz_idx` ON `quiz_questions` (`quiz_id`);--> statement-breakpoint
CREATE INDEX `quiz_questions_quiz_order_idx` ON `quiz_questions` (`quiz_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`content_id` text,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`points_reward` integer DEFAULT 0 NOT NULL,
	`passing_score` integer DEFAULT 70 NOT NULL,
	`time_limit_minutes` integer,
	`created_by_id` text NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_id`) REFERENCES `education_contents`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quizzes_site_idx` ON `quizzes` (`site_id`);--> statement-breakpoint
CREATE INDEX `quizzes_site_status_idx` ON `quizzes` (`site_id`,`status`);--> statement-breakpoint
CREATE INDEX `quizzes_content_idx` ON `quizzes` (`content_id`);--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`recommender_id` text NOT NULL,
	`recommended_name` text NOT NULL,
	`trade_type` text NOT NULL,
	`reason` text NOT NULL,
	`recommendation_date` text NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recommender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `recommendations_site_idx` ON `recommendations` (`site_id`);--> statement-breakpoint
CREATE INDEX `recommendations_recommender_idx` ON `recommendations` (`recommender_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `recommendations_site_id_recommender_id_recommendation_date_unique` ON `recommendations` (`site_id`,`recommender_id`,`recommendation_date`);--> statement-breakpoint
CREATE TABLE `statutory_trainings` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`user_id` text NOT NULL,
	`training_type` text NOT NULL,
	`training_name` text NOT NULL,
	`training_date` integer NOT NULL,
	`expiration_date` integer,
	`provider` text,
	`certificate_url` text,
	`hours_completed` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'SCHEDULED' NOT NULL,
	`created_by_id` text NOT NULL,
	`notes` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `statutory_trainings_site_user_idx` ON `statutory_trainings` (`site_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `statutory_trainings_site_type_idx` ON `statutory_trainings` (`site_id`,`training_type`);--> statement-breakpoint
CREATE INDEX `statutory_trainings_user_idx` ON `statutory_trainings` (`user_id`);--> statement-breakpoint
CREATE INDEX `statutory_trainings_status_idx` ON `statutory_trainings` (`status`);--> statement-breakpoint
CREATE INDEX `statutory_trainings_expiration_idx` ON `statutory_trainings` (`expiration_date`);--> statement-breakpoint
CREATE TABLE `sync_errors` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text,
	`sync_type` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`error_code` text,
	`error_message` text NOT NULL,
	`payload` text,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`last_retry_at` integer,
	`resolved_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sync_errors_site_type_idx` ON `sync_errors` (`site_id`,`sync_type`);--> statement-breakpoint
CREATE INDEX `sync_errors_status_idx` ON `sync_errors` (`status`);--> statement-breakpoint
CREATE INDEX `sync_errors_created_at_idx` ON `sync_errors` (`created_at`);--> statement-breakpoint
CREATE TABLE `tbm_attendees` (
	`id` text PRIMARY KEY NOT NULL,
	`tbm_record_id` text NOT NULL,
	`user_id` text NOT NULL,
	`attended_at` integer,
	FOREIGN KEY (`tbm_record_id`) REFERENCES `tbm_records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tbm_attendees_tbm_record_idx` ON `tbm_attendees` (`tbm_record_id`);--> statement-breakpoint
CREATE INDEX `tbm_attendees_user_idx` ON `tbm_attendees` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tbm_attendees_tbm_record_id_user_id_unique` ON `tbm_attendees` (`tbm_record_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `tbm_records` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`date` integer NOT NULL,
	`topic` text NOT NULL,
	`content` text,
	`leader_id` text NOT NULL,
	`weather_condition` text,
	`special_notes` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`leader_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tbm_records_site_date_idx` ON `tbm_records` (`site_id`,`date`);--> statement-breakpoint
CREATE INDEX `tbm_records_site_idx` ON `tbm_records` (`site_id`);--> statement-breakpoint
CREATE INDEX `tbm_records_leader_idx` ON `tbm_records` (`leader_id`);--> statement-breakpoint
CREATE TABLE `vote_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`month` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vote_periods_site_id_month_unique` ON `vote_periods` (`site_id`,`month`);--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_manual_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`site_id` text NOT NULL,
	`approved_by_id` text,
	`reason` text NOT NULL,
	`valid_date` integer NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`rejection_reason` text,
	`approved_at` integer,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_manual_approvals`("id", "user_id", "site_id", "approved_by_id", "reason", "valid_date", "status", "rejection_reason", "approved_at", "created_at") SELECT "id", "user_id", "site_id", "approved_by_id", "reason", "valid_date", "status", "rejection_reason", "approved_at", "created_at" FROM `manual_approvals`;--> statement-breakpoint
DROP TABLE `manual_approvals`;--> statement-breakpoint
ALTER TABLE `__new_manual_approvals` RENAME TO `manual_approvals`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `manual_approvals_user_valid_date_idx` ON `manual_approvals` (`user_id`,`valid_date`);--> statement-breakpoint
CREATE INDEX `manual_approvals_site_valid_date_idx` ON `manual_approvals` (`site_id`,`valid_date`);--> statement-breakpoint
DROP INDEX `users_phone_unique`;--> statement-breakpoint
DROP INDEX `users_phone_hash_dob_hash_idx`;--> statement-breakpoint
ALTER TABLE `users` ADD `phone_encrypted` text;--> statement-breakpoint
ALTER TABLE `users` ADD `dob_encrypted` text;--> statement-breakpoint
ALTER TABLE `users` ADD `can_review` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `can_export_data` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `false_report_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `restricted_until` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `refresh_token_expires_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `deletion_requested_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `deleted_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `users_external_unique` ON `users` (`external_system`,`external_worker_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_hash_dob_hash_idx` ON `users` (`phone_hash`,`dob_hash`);--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `phone`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `dob`;--> statement-breakpoint
CREATE TABLE `__new_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`assignee_type` text NOT NULL,
	`assignee_id` text,
	`due_date` integer,
	`priority` text,
	`description` text,
	`action_status` text DEFAULT 'NONE' NOT NULL,
	`completion_note` text,
	`completed_at` integer,
	`created_at` integer,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_actions`("id", "post_id", "assignee_type", "assignee_id", "due_date", "priority", "description", "action_status", "completion_note", "completed_at", "created_at") SELECT "id", "post_id", "assignee_type", "assignee_id", "due_date", "priority", "description", "action_status", "completion_note", "completed_at", "created_at" FROM `actions`;--> statement-breakpoint
DROP TABLE `actions`;--> statement-breakpoint
ALTER TABLE `__new_actions` RENAME TO `actions`;--> statement-breakpoint
CREATE INDEX `actions_post_idx` ON `actions` (`post_id`);--> statement-breakpoint
CREATE TABLE `__new_posts` (
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
	`metadata` text,
	`visibility` text DEFAULT 'WORKER_PUBLIC' NOT NULL,
	`is_anonymous` integer DEFAULT false NOT NULL,
	`is_potential_duplicate` integer DEFAULT false NOT NULL,
	`duplicate_of_post_id` text,
	`review_status` text DEFAULT 'PENDING' NOT NULL,
	`action_status` text DEFAULT 'NONE' NOT NULL,
	`is_urgent` integer DEFAULT false NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`duplicate_of_post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_posts`("id", "user_id", "site_id", "category", "hazard_type", "risk_level", "location_floor", "location_zone", "location_detail", "content", "metadata", "visibility", "is_anonymous", "is_potential_duplicate", "duplicate_of_post_id", "review_status", "action_status", "is_urgent", "created_at", "updated_at") SELECT "id", "user_id", "site_id", "category", "hazard_type", "risk_level", "location_floor", "location_zone", "location_detail", "content", "metadata", "visibility", "is_anonymous", "is_potential_duplicate", "duplicate_of_post_id", "review_status", "action_status", "is_urgent", "created_at", "updated_at" FROM `posts`;--> statement-breakpoint
DROP TABLE `posts`;--> statement-breakpoint
ALTER TABLE `__new_posts` RENAME TO `posts`;--> statement-breakpoint
CREATE INDEX `posts_site_review_status_idx` ON `posts` (`site_id`,`review_status`);--> statement-breakpoint
CREATE INDEX `posts_site_created_at_idx` ON `posts` (`site_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `posts_user_created_at_idx` ON `posts` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `posts_duplicate_of_post_id_idx` ON `posts` (`duplicate_of_post_id`);--> statement-breakpoint
ALTER TABLE `action_images` ADD `image_type` text;--> statement-breakpoint
CREATE INDEX `action_images_action_id_idx` ON `action_images` (`action_id`);--> statement-breakpoint
ALTER TABLE `announcements` ADD `scheduled_at` integer;--> statement-breakpoint
ALTER TABLE `announcements` ADD `is_published` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `post_images` ADD `image_hash` text;--> statement-breakpoint
CREATE INDEX `post_images_post_id_idx` ON `post_images` (`post_id`);--> statement-breakpoint
CREATE INDEX `post_images_hash_idx` ON `post_images` (`image_hash`);--> statement-breakpoint
ALTER TABLE `sites` ADD `leaderboard_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `sites` ADD `auto_nomination_top_n` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `sites_name_unique` ON `sites` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_external_site_checkin_unique` ON `attendances` (`external_worker_id`,`site_id`,`checkin_at`);--> statement-breakpoint
CREATE TABLE `__new_points_ledger` (
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
	FOREIGN KEY (`ref_ledger_id`) REFERENCES `points_ledger`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_points_ledger`("id", "user_id", "site_id", "post_id", "ref_ledger_id", "amount", "reason_code", "reason_text", "admin_id", "settle_month", "occurred_at", "created_at") SELECT "id", "user_id", "site_id", "post_id", "ref_ledger_id", "amount", "reason_code", "reason_text", "admin_id", "settle_month", "occurred_at", "created_at" FROM `points_ledger`;--> statement-breakpoint
DROP TABLE `points_ledger`;--> statement-breakpoint
ALTER TABLE `__new_points_ledger` RENAME TO `points_ledger`;--> statement-breakpoint
CREATE INDEX `points_ledger_user_site_month_idx` ON `points_ledger` (`user_id`,`site_id`,`settle_month`);--> statement-breakpoint
CREATE INDEX `points_ledger_site_month_idx` ON `points_ledger` (`site_id`,`settle_month`);--> statement-breakpoint
CREATE INDEX `points_ledger_ref_ledger_id_idx` ON `points_ledger` (`ref_ledger_id`);