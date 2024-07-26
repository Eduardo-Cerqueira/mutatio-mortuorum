ALTER TABLE `mods` ADD `description` text;--> statement-breakpoint
ALTER TABLE `mods` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `mods` ADD `previewUrl` text;--> statement-breakpoint
ALTER TABLE `mods` ADD `url` text;--> statement-breakpoint
ALTER TABLE `mods` ADD `updatedAt` integer;--> statement-breakpoint
ALTER TABLE `mods` DROP COLUMN `author`;