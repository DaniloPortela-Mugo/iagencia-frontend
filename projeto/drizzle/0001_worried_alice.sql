CREATE TABLE `ai_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int,
	`user_id` int NOT NULL,
	`section` enum('strategy','creation','art_direction','production','media') NOT NULL,
	`messages` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `art_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`name` text NOT NULL,
	`file_url` text NOT NULL,
	`file_key` text NOT NULL,
	`file_type` varchar(50),
	`uploaded_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `art_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`social_media_accounts` text,
	`competitor_accounts` text,
	`news_sources` text,
	`tv_channels` text,
	`radio_stations` text,
	`storage_channels` text,
	`tv_programs_count` int DEFAULT 0,
	`tv_program_duration` varchar(20),
	`radio_programs_count` int DEFAULT 0,
	`radio_program_duration` varchar(20),
	`insertions_count` int DEFAULT 0,
	`insertion_durations` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`logo` text,
	`slogan` text,
	`proposals` text,
	`achievements` text,
	`tone_of_voice` text,
	`status` enum('active','paused','completed') NOT NULL DEFAULT 'active',
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clippings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`source` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`url` text NOT NULL,
	`published_date` timestamp,
	`sentiment` enum('positive','neutral','negative'),
	`is_competitor` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clippings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`pit_id` int,
	`title` text NOT NULL,
	`content_type` enum('tv_program','radio_program','tv_insertion','radio_insertion','social_post','speech','jingle','graphic') NOT NULL,
	`content` text NOT NULL,
	`status` enum('to_do','in_approval','done') NOT NULL DEFAULT 'to_do',
	`file_url` text,
	`file_key` text,
	`created_by` int NOT NULL,
	`approved_by` int,
	`approved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_planning` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`content_id` int,
	`scheduled_date` timestamp NOT NULL,
	`platform` enum('tv','radio','instagram','facebook','tiktok','youtube') NOT NULL,
	`theme` text,
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`status` enum('scheduled','sent','published','cancelled') NOT NULL DEFAULT 'scheduled',
	`sent_at` timestamp,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `media_planning_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `performance_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`platform` enum('instagram','facebook','tiktok','youtube') NOT NULL,
	`metric_date` timestamp NOT NULL,
	`followers` int DEFAULT 0,
	`reach` int DEFAULT 0,
	`impressions` int DEFAULT 0,
	`engagement` int DEFAULT 0,
	`likes` int DEFAULT 0,
	`comments` int DEFAULT 0,
	`shares` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `performance_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`title` text NOT NULL,
	`briefing` text NOT NULL,
	`assigned_to` int,
	`status` enum('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`due_date` timestamp,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `production_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`title` text NOT NULL,
	`event_type` enum('filming','recording','meeting','rally','walk','other') NOT NULL,
	`description` text,
	`scheduled_date` timestamp NOT NULL,
	`location` text,
	`responsible_user` int,
	`status` enum('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `production_events_id` PRIMARY KEY(`id`)
);
