CREATE TABLE `media_broadcasts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`channel_id` int NOT NULL,
	`content_id` int,
	`title` text NOT NULL,
	`broadcast_type` enum('program','insertion') NOT NULL,
	`duration` int NOT NULL,
	`scheduled_date` timestamp NOT NULL,
	`scheduled_time` varchar(10) NOT NULL,
	`end_time` varchar(10),
	`cost_per_insertion` int NOT NULL DEFAULT 0,
	`total_cost` int NOT NULL DEFAULT 0,
	`insertions_count` int NOT NULL DEFAULT 1,
	`status` enum('scheduled','aired','cancelled') NOT NULL DEFAULT 'scheduled',
	`notes` text,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `media_broadcasts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_channels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`channel_type` enum('tv','radio') NOT NULL,
	`city` text,
	`state` varchar(2),
	`coverage` text,
	`contact_name` text,
	`contact_phone` varchar(20),
	`contact_email` varchar(320),
	`notes` text,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `media_channels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_packages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`channel_id` int NOT NULL,
	`package_name` text NOT NULL,
	`start_date` timestamp NOT NULL,
	`end_date` timestamp NOT NULL,
	`total_insertions` int NOT NULL,
	`used_insertions` int NOT NULL DEFAULT 0,
	`total_value` int NOT NULL,
	`paid_value` int NOT NULL DEFAULT 0,
	`status` enum('active','completed','cancelled') NOT NULL DEFAULT 'active',
	`notes` text,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `media_packages_id` PRIMARY KEY(`id`)
);
