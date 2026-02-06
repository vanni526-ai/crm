CREATE TABLE `sales_commission_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`salespersonId` int NOT NULL,
	`city` varchar(50) NOT NULL,
	`commissionRate` decimal(5,2) NOT NULL,
	`notes` text,
	`updatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_commission_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_salesperson_city` UNIQUE(`salespersonId`,`city`)
);
--> statement-breakpoint
CREATE INDEX `commission_salesperson_idx` ON `sales_commission_configs` (`salespersonId`);--> statement-breakpoint
CREATE INDEX `commission_city_idx` ON `sales_commission_configs` (`city`);