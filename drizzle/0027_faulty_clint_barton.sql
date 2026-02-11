CREATE TABLE `city_monthly_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cityId` int NOT NULL,
	`cityName` varchar(50) NOT NULL,
	`month` varchar(7) NOT NULL,
	`rentFee` decimal(10,2) DEFAULT '0.00',
	`propertyFee` decimal(10,2) DEFAULT '0.00',
	`utilityFee` decimal(10,2) DEFAULT '0.00',
	`consumablesFee` decimal(10,2) DEFAULT '0.00',
	`cleaningFee` decimal(10,2) DEFAULT '0.00',
	`phoneFee` decimal(10,2) DEFAULT '0.00',
	`deferredPayment` decimal(10,2) DEFAULT '0.00',
	`expressFee` decimal(10,2) DEFAULT '0.00',
	`promotionFee` decimal(10,2) DEFAULT '0.00',
	`otherFee` decimal(10,2) DEFAULT '0.00',
	`totalExpense` decimal(10,2) DEFAULT '0.00',
	`notes` text,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `city_monthly_expenses_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_city_month` UNIQUE(`cityId`,`month`)
);
--> statement-breakpoint
CREATE INDEX `monthly_expense_city_idx` ON `city_monthly_expenses` (`cityId`);--> statement-breakpoint
CREATE INDEX `monthly_expense_month_idx` ON `city_monthly_expenses` (`month`);