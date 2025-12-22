CREATE TABLE `parsingCorrections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`originalText` text NOT NULL,
	`fieldName` varchar(50) NOT NULL,
	`llmValue` text,
	`correctedValue` text NOT NULL,
	`correctionType` enum('field_missing','field_wrong','format_error','logic_error') NOT NULL,
	`context` text,
	`userId` int NOT NULL,
	`userName` varchar(100),
	`isLearned` boolean NOT NULL DEFAULT false,
	`learnedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `parsingCorrections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promptOptimizationHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`version` varchar(50) NOT NULL,
	`optimizationType` enum('add_example','update_rule','fix_error_pattern') NOT NULL,
	`changeDescription` text NOT NULL,
	`newExamples` text,
	`correctionCount` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promptOptimizationHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `field_idx` ON `parsingCorrections` (`fieldName`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `parsingCorrections` (`userId`);--> statement-breakpoint
CREATE INDEX `learned_idx` ON `parsingCorrections` (`isLearned`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `parsingCorrections` (`createdAt`);--> statement-breakpoint
CREATE INDEX `version_idx` ON `promptOptimizationHistory` (`version`);--> statement-breakpoint
CREATE INDEX `active_idx` ON `promptOptimizationHistory` (`isActive`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `promptOptimizationHistory` (`createdAt`);