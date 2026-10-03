CREATE TABLE `folders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `folders_user_slug` ON `folders` (`user_id`,`slug`);--> statement-breakpoint
CREATE TABLE `images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`folder_id` integer NOT NULL,
	`link_handle` text NOT NULL,
	`path_stem` text NOT NULL,
	`ext` text NOT NULL,
	`name` text NOT NULL,
	`r2_key` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`folder_id`) REFERENCES `folders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `images_r2_key_unique` ON `images` (`r2_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `images_link` ON `images` (`link_handle`,`path_stem`);--> statement-breakpoint
CREATE INDEX `images_folder` ON `images` (`folder_id`);--> statement-breakpoint
CREATE INDEX `images_user` ON `images` (`user_id`);