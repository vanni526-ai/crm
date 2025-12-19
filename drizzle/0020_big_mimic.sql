CREATE TABLE `gmailImportConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configKey` varchar(100) NOT NULL,
	`configValue` json NOT NULL,
	`description` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gmailImportConfig_id` PRIMARY KEY(`id`),
	CONSTRAINT `gmailImportConfig_configKey_unique` UNIQUE(`configKey`)
);
