CREATE TABLE `accountAuditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`operationType` enum('create','update','delete','login','password_change','activate','deactivate') NOT NULL,
	`operatorId` int,
	`operatorName` varchar(100),
	`oldValue` json,
	`newValue` json,
	`ipAddress` varchar(50),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `accountAuditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `systemAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(100) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`email` varchar(100),
	`phone` varchar(20),
	`identity` enum('customer','teacher','sales','finance','admin') NOT NULL,
	`relatedId` int,
	`relatedName` varchar(100),
	`isActive` boolean NOT NULL DEFAULT true,
	`lastLoginAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	`notes` text,
	CONSTRAINT `systemAccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `systemAccounts_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE INDEX `account_id_idx` ON `accountAuditLogs` (`accountId`);--> statement-breakpoint
CREATE INDEX `operation_type_idx` ON `accountAuditLogs` (`operationType`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `accountAuditLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `username_idx` ON `systemAccounts` (`username`);--> statement-breakpoint
CREATE INDEX `identity_idx` ON `systemAccounts` (`identity`);--> statement-breakpoint
CREATE INDEX `related_id_idx` ON `systemAccounts` (`relatedId`);--> statement-breakpoint
CREATE INDEX `is_active_idx` ON `systemAccounts` (`isActive`);