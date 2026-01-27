CREATE TABLE `accountPermissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`permissionKey` varchar(100) NOT NULL,
	`permissionName` varchar(100) NOT NULL,
	`isGranted` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accountPermissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_account_permission` UNIQUE(`accountId`,`permissionKey`)
);
--> statement-breakpoint
CREATE INDEX `account_id_permission_idx` ON `accountPermissions` (`accountId`);--> statement-breakpoint
CREATE INDEX `permission_key_idx` ON `accountPermissions` (`permissionKey`);