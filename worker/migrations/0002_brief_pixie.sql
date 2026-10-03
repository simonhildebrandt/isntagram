CREATE TABLE `folder_presets` (
	`folder_id` integer NOT NULL,
	`preset_id` integer NOT NULL,
	PRIMARY KEY(`folder_id`, `preset_id`),
	FOREIGN KEY (`folder_id`) REFERENCES `folders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`preset_id`) REFERENCES `presets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `image_presets` (
	`image_id` integer NOT NULL,
	`preset_id` integer NOT NULL,
	PRIMARY KEY(`image_id`, `preset_id`),
	FOREIGN KEY (`image_id`) REFERENCES `images`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`preset_id`) REFERENCES `presets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `presets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer,
	`fit` text NOT NULL,
	`format` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `presets_user_name` ON `presets` (`user_id`,`name`);--> statement-breakpoint
-- Starter sizes for existing users; new users get them when they choose a handle.
INSERT INTO `presets` (`user_id`, `name`, `width`, `height`, `fit`, `format`, `is_default`, `created_at`, `updated_at`)
SELECT `id`, 'thumb', 150, 150, 'crop', 'webp', 1, datetime('now'), datetime('now') FROM `users` WHERE `handle` IS NOT NULL;
--> statement-breakpoint
INSERT INTO `presets` (`user_id`, `name`, `width`, `height`, `fit`, `format`, `is_default`, `created_at`, `updated_at`)
SELECT `id`, 'medium', 800, NULL, 'inside', 'keep', 1, datetime('now'), datetime('now') FROM `users` WHERE `handle` IS NOT NULL;
