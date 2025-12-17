CREATE TABLE `smartRegisterHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template` enum('wechat','alipay','custom') NOT NULL,
	`totalRows` int NOT NULL,
	`successCount` int NOT NULL,
	`failCount` int NOT NULL,
	`operatorId` int NOT NULL,
	`operatorName` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `smartRegisterHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `operator_idx` ON `smartRegisterHistory` (`operatorId`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `smartRegisterHistory` (`createdAt`);