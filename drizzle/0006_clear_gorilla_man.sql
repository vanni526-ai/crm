CREATE TABLE `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`duration` decimal(5,2) NOT NULL,
	`level` enum('入门','深度','订制','剧本') NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `name_idx` ON `courses` (`name`);--> statement-breakpoint
CREATE INDEX `level_idx` ON `courses` (`level`);--> statement-breakpoint
CREATE INDEX `is_active_idx` ON `courses` (`isActive`);