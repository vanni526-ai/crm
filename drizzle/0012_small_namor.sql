CREATE TABLE `accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(50) NOT NULL,
	`password` varchar(255) NOT NULL,
	`name` varchar(100) NOT NULL,
	`nickname` varchar(50),
	`role` enum('admin','finance','sales') NOT NULL,
	`salespersonId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastLoginAt` timestamp,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `accounts_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE INDEX `username_idx` ON `accounts` (`username`);--> statement-breakpoint
CREATE INDEX `role_idx` ON `accounts` (`role`);--> statement-breakpoint
CREATE INDEX `salesperson_idx` ON `accounts` (`salespersonId`);