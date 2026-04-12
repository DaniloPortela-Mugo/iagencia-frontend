CREATE TABLE `client_competitors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`name` text NOT NULL,
	`party` varchar(50),
	`position` text,
	`city` text,
	`state` varchar(2),
	`instagram_url` text,
	`facebook_url` text,
	`twitter_url` text,
	`tiktok_url` text,
	`youtube_url` text,
	`website_url` text,
	`notes` text,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_competitors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_media_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`channel_id` int NOT NULL,
	`priority` enum('high','medium','low') NOT NULL DEFAULT 'medium',
	`contract_value` int DEFAULT 0,
	`contact_person` text,
	`notes` text,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_media_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_news_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`name` text NOT NULL,
	`source_type` enum('portal','newspaper','blog','tv_site','radio_site','government','other') NOT NULL,
	`url` text NOT NULL,
	`region` text,
	`keywords` text,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_news_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_social_media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`platform` enum('instagram','facebook','twitter','tiktok','youtube','linkedin','threads') NOT NULL,
	`username` varchar(100) NOT NULL,
	`profile_url` text,
	`followers` int DEFAULT 0,
	`is_active` int NOT NULL DEFAULT 1,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_social_media_id` PRIMARY KEY(`id`)
);
