ALTER TABLE `users` ADD `supabase_id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_supabase_id_unique` UNIQUE(`supabase_id`);