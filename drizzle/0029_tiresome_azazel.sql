CREATE TABLE `fieldMappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('salesperson_alias','city_code','teacher_alias','course_alias') NOT NULL,
	`sourceValue` varchar(100) NOT NULL,
	`targetValue` varchar(100) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fieldMappings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `type_idx` ON `fieldMappings` (`type`);--> statement-breakpoint
CREATE INDEX `source_idx` ON `fieldMappings` (`sourceValue`);