ALTER TABLE `customers` ADD `userId` int;--> statement-breakpoint
CREATE INDEX `user_idx` ON `customers` (`userId`);