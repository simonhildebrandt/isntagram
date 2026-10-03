ALTER TABLE `users` ADD `activated_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `removed_at` text;--> statement-breakpoint
-- Everyone who already chose a handle has signed in.
UPDATE `users` SET `activated_at` = `created_at` WHERE `handle` IS NOT NULL;
