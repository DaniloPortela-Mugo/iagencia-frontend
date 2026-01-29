ALTER TABLE `ai_conversations` ADD `title` text;--> statement-breakpoint
ALTER TABLE `ai_conversations` ADD `is_archived` int DEFAULT 0 NOT NULL;