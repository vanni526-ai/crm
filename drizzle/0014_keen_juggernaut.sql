ALTER TABLE `users` DROP INDEX `users_username_unique`;--> statement-breakpoint
DROP INDEX `username_idx` ON `users`;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `username`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `password`;