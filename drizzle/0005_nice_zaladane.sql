CREATE TABLE `notification_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`event_reminder_24h` int NOT NULL DEFAULT 1,
	`event_reminder_1h` int NOT NULL DEFAULT 1,
	`pit_assigned` int NOT NULL DEFAULT 1,
	`content_updates` int NOT NULL DEFAULT 1,
	`team_confirmation` int NOT NULL DEFAULT 1,
	`email_notifications` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` enum('event_reminder','pit_assigned','content_approved','content_rejected','team_confirmation','system') NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`related_type` varchar(50),
	`related_id` int,
	`is_read` int NOT NULL DEFAULT 0,
	`scheduled_for` timestamp,
	`sent_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
