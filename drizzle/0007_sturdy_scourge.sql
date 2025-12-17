CREATE TABLE `accountTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`customerName` varchar(100) NOT NULL,
	`type` enum('recharge','consume','refund') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`balanceBefore` decimal(10,2) NOT NULL,
	`balanceAfter` decimal(10,2) NOT NULL,
	`relatedOrderId` int,
	`relatedOrderNo` varchar(50),
	`notes` text,
	`operatorId` int NOT NULL,
	`operatorName` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `accountTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `customer_idx` ON `accountTransactions` (`customerId`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `accountTransactions` (`type`);--> statement-breakpoint
CREATE INDEX `order_idx` ON `accountTransactions` (`relatedOrderId`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `accountTransactions` (`createdAt`);