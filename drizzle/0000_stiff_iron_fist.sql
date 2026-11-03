CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`target_id` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `candle_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_key` text NOT NULL,
	`request_key` text NOT NULL,
	`business_day` text NOT NULL,
	`accepted_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `request_idempotency` ON `candle_requests` (`visitor_key`,`request_key`);--> statement-breakpoint
CREATE INDEX `requests_recent` ON `candle_requests` (`visitor_key`,`accepted_at`);--> statement-breakpoint
CREATE TABLE `candles` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_key` text NOT NULL,
	`business_day` text NOT NULL,
	`accepted_at` text NOT NULL,
	`state` text DEFAULT 'valid' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_candle_per_browser_day` ON `candles` (`visitor_key`,`business_day`);--> statement-breakpoint
CREATE INDEX `candles_day_state` ON `candles` (`business_day`,`state`);--> statement-breakpoint
CREATE TABLE `corrections` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text DEFAULT '' NOT NULL,
	`message` text NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `event_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`payload` text NOT NULL,
	`base_version` integer DEFAULT 0 NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`editor_id` text NOT NULL,
	`reviewer_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `event_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`version` integer NOT NULL,
	`snapshot` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`aliases` text DEFAULT '[]' NOT NULL,
	`start_year` integer NOT NULL,
	`end_year` integer NOT NULL,
	`category` text NOT NULL,
	`sources` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`editor_id` text NOT NULL,
	`reviewer_id` text,
	`review_notes` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_public_order` ON `events` (`status`,`start_year`,`id`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text NOT NULL,
	`window` integer NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rate_window` ON `rate_limits` (`key`,`window`);--> statement-breakpoint
CREATE INDEX `rate_expiry` ON `rate_limits` (`expires_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `anonymous_visitors` (
	`key` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
