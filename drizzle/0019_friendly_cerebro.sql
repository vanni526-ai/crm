CREATE TABLE `gmailImportLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emailSubject` varchar(255) NOT NULL,
	`emailDate` timestamp NOT NULL,
	`threadId` varchar(100) NOT NULL,
	`totalOrders` int NOT NULL,
	`successOrders` int NOT NULL,
	`failedOrders` int NOT NULL,
	`status` enum('success','partial','failed') NOT NULL,
	`errorLog` text,
	`emailContent` text,
	`parsedData` json,
	`importedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gmailImportLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `thread_id_idx` ON `gmailImportLogs` (`threadId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `gmailImportLogs` (`status`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `gmailImportLogs` (`createdAt`);