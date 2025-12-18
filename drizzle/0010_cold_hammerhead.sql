CREATE TABLE `salespersons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`name` varchar(100) NOT NULL,
	`nickname` varchar(50),
	`phone` varchar(20),
	`email` varchar(320),
	`wechat` varchar(100),
	`commissionRate` decimal(5,2) DEFAULT '0.00',
	`city` varchar(50),
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `salespersons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `sales_user_idx` ON `salespersons` (`userId`);--> statement-breakpoint
CREATE INDEX `sales_phone_idx` ON `salespersons` (`phone`);--> statement-breakpoint
CREATE INDEX `sales_city_idx` ON `salespersons` (`city`);