CREATE TABLE `client_materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` enum('logo','template','document','image','video','audio','other') NOT NULL DEFAULT 'other',
	`file_key` varchar(500) NOT NULL,
	`file_url` text NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_size` int NOT NULL,
	`mime_type` varchar(100) NOT NULL,
	`tags` text,
	`is_active` int NOT NULL DEFAULT 1,
	`uploaded_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_materials_id` PRIMARY KEY(`id`)
);
