CREATE TABLE `news_search_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`search_query` text NOT NULL,
	`sources_searched` int DEFAULT 0,
	`news_found` int DEFAULT 0,
	`news_saved` int DEFAULT 0,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`error_message` text,
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`created_by` int NOT NULL,
	CONSTRAINT `news_search_history_id` PRIMARY KEY(`id`)
);
