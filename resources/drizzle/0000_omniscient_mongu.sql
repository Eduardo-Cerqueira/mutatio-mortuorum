CREATE TABLE `mods` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text,
	`author` text
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text
);
--> statement-breakpoint
CREATE TABLE `profileMods` (
	`id` integer PRIMARY KEY NOT NULL,
	`profile_id` integer,
	`mod_id` integer
);
