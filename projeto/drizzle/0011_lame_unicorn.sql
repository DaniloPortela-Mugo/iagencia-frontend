CREATE TABLE `approval_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`approval_id` int NOT NULL,
	`user_id` int NOT NULL,
	`comment` text NOT NULL,
	`attachment_url` text,
	`attachment_name` varchar(255),
	`is_internal` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `approval_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `approval_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`approval_id` int NOT NULL,
	`user_id` int NOT NULL,
	`previous_status` enum('pending','in_review','approved','rejected','revision_requested'),
	`new_status` enum('pending','in_review','approved','rejected','revision_requested') NOT NULL,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `approval_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`content_id` int,
	`title` text NOT NULL,
	`description` text,
	`content_type` enum('post','video','image','audio','document','campaign','other') NOT NULL DEFAULT 'post',
	`content_url` text,
	`content_preview` text,
	`status` enum('pending','in_review','approved','rejected','revision_requested') NOT NULL DEFAULT 'pending',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`due_date` timestamp,
	`requested_by` int NOT NULL,
	`assigned_to` int,
	`approved_by` int,
	`approved_at` timestamp,
	`rejected_by` int,
	`rejected_at` timestamp,
	`rejection_reason` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_approvals_id` PRIMARY KEY(`id`)
);
