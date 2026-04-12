CREATE TABLE `production_checklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_id` int NOT NULL,
	`item_name` text NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`is_checked` int NOT NULL DEFAULT 0,
	`notes` text,
	`checked_by` int,
	`checked_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `production_checklists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `production_team` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_id` int NOT NULL,
	`user_id` int,
	`member_name` text NOT NULL,
	`role` text NOT NULL,
	`phone` varchar(20),
	`is_confirmed` int NOT NULL DEFAULT 0,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `production_team_id` PRIMARY KEY(`id`)
);
