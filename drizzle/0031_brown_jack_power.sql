CREATE TABLE `parsingLearningConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configKey` varchar(50) NOT NULL,
	`configValue` text NOT NULL,
	`description` text,
	`updatedBy` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `parsingLearningConfig_id` PRIMARY KEY(`id`),
	CONSTRAINT `parsingLearningConfig_configKey_unique` UNIQUE(`configKey`)
);
