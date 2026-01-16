CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operationType` varchar(50) NOT NULL,
	`operationDescription` text NOT NULL,
	`operatorId` int NOT NULL,
	`operatorName` varchar(100) NOT NULL,
	`affectedCount` int NOT NULL DEFAULT 0,
	`details` json,
	`status` enum('success','failed','partial') NOT NULL DEFAULT 'success',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `operation_type_idx` ON `auditLogs` (`operationType`);--> statement-breakpoint
CREATE INDEX `operator_idx` ON `auditLogs` (`operatorId`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `auditLogs` (`createdAt`);