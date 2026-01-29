CREATE TABLE `scheduled_search_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduled_search_id` int NOT NULL,
	`client_id` int NOT NULL,
	`status` enum('success','failed','partial') NOT NULL,
	`news_found` int DEFAULT 0,
	`news_saved` int DEFAULT 0,
	`execution_time_ms` int,
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scheduled_search_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_searches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`is_enabled` int NOT NULL DEFAULT 1,
	`frequency` enum('6h','12h','24h') NOT NULL DEFAULT '12h',
	`search_query` text,
	`last_run_at` timestamp,
	`next_run_at` timestamp,
	`total_runs` int DEFAULT 0,
	`successful_runs` int DEFAULT 0,
	`failed_runs` int DEFAULT 0,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_searches_id` PRIMARY KEY(`id`)
);
