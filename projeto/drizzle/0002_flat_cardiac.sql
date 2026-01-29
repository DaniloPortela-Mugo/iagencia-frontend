CREATE TABLE `calendar_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`event_type` enum('social_post','tv_broadcast','radio_broadcast','filming','recording','meeting','rally','deadline','other') NOT NULL,
	`start_date` timestamp NOT NULL,
	`end_date` timestamp,
	`all_day` int NOT NULL DEFAULT 0,
	`platform` enum('instagram','facebook','tiktok','youtube','twitter','tv','radio','other'),
	`color` varchar(20) DEFAULT '#8B5CF6',
	`status` enum('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`content_id` int,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendar_events_id` PRIMARY KEY(`id`)
);
