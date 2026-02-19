CREATE TABLE `membershipConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configKey` varchar(50) NOT NULL,
	`configValue` varchar(255) NOT NULL,
	`description` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `membershipConfig_id` PRIMARY KEY(`id`),
	CONSTRAINT `membershipConfig_configKey_unique` UNIQUE(`configKey`)
);
--> statement-breakpoint
ALTER TABLE `systemAccounts` ADD `membershipStatus` enum('pending','active','expired') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `systemAccounts` ADD `membershipExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `membershipStatus` enum('pending','active','expired') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `membershipExpiresAt` timestamp;