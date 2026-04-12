CREATE TABLE `material_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`material_id` int NOT NULL,
	`version_number` int NOT NULL,
	`file_key` varchar(500) NOT NULL,
	`file_url` text NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_size` int NOT NULL,
	`mime_type` varchar(100) NOT NULL,
	`change_notes` text,
	`uploaded_by` int NOT NULL,
	`is_current_version` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `material_versions_id` PRIMARY KEY(`id`)
);
