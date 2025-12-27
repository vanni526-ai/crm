CREATE TABLE `cityPartnerConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`city` varchar(50) NOT NULL,
	`partnerFeeRate` decimal(5,2) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`updatedBy` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cityPartnerConfig_id` PRIMARY KEY(`id`),
	CONSTRAINT `cityPartnerConfig_city_unique` UNIQUE(`city`)
);
--> statement-breakpoint
CREATE INDEX `city_idx` ON `cityPartnerConfig` (`city`);--> statement-breakpoint
CREATE INDEX `active_idx` ON `cityPartnerConfig` (`isActive`);