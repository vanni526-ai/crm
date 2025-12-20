CREATE TABLE `gmailImportHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` varchar(255) NOT NULL,
	`threadId` varchar(255) NOT NULL,
	`subject` text,
	`fromEmail` varchar(255),
	`orderId` int,
	`importStatus` enum('success','failed','skipped') NOT NULL,
	`errorMessage` text,
	`operatorId` int NOT NULL,
	`operatorName` varchar(100),
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gmailImportHistory_id` PRIMARY KEY(`id`),
	CONSTRAINT `gmailImportHistory_messageId_unique` UNIQUE(`messageId`)
);
--> statement-breakpoint
CREATE INDEX `message_id_idx` ON `gmailImportHistory` (`messageId`);--> statement-breakpoint
CREATE INDEX `thread_id_idx` ON `gmailImportHistory` (`threadId`);--> statement-breakpoint
CREATE INDEX `imported_at_idx` ON `gmailImportHistory` (`importedAt`);--> statement-breakpoint
CREATE INDEX `operator_idx` ON `gmailImportHistory` (`operatorId`);