CREATE TABLE `partner_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`cityId` int NOT NULL,
	`month` date NOT NULL,
	`rentFee` decimal(10,2) DEFAULT '0.00',
	`propertyFee` decimal(10,2) DEFAULT '0.00',
	`utilityFee` decimal(10,2) DEFAULT '0.00',
	`consumablesFee` decimal(10,2) DEFAULT '0.00',
	`teacherFee` decimal(10,2) DEFAULT '0.00',
	`transportFee` decimal(10,2) DEFAULT '0.00',
	`otherFee` decimal(10,2) DEFAULT '0.00',
	`totalFee` decimal(10,2) DEFAULT '0.00',
	`deferredPayment` decimal(10,2) DEFAULT '0.00',
	`deferredPaymentBalance` decimal(10,2) DEFAULT '0.00',
	`revenue` decimal(10,2) DEFAULT '0.00',
	`profit` decimal(10,2) DEFAULT '0.00',
	`profitAmount` decimal(10,2) DEFAULT '0.00',
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partner_expenses_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_partner_month` UNIQUE(`partnerId`,`cityId`,`month`)
);
--> statement-breakpoint
CREATE TABLE `partner_profit_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`expenseId` int,
	`amount` decimal(10,2) NOT NULL,
	`transferDate` date NOT NULL,
	`transferMethod` enum('wechat','alipay','bank','cash','other') NOT NULL DEFAULT 'bank',
	`transactionNo` varchar(100),
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`notes` text,
	`recordedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partner_profit_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`phone` varchar(20),
	`profitRatio` decimal(5,2) NOT NULL,
	`profitRule` text,
	`brandFee` decimal(10,2) DEFAULT '0.00',
	`techServiceFee` decimal(10,2) DEFAULT '0.00',
	`deferredPaymentTotal` decimal(10,2) DEFAULT '0.00',
	`deferredPaymentRule` text,
	`contractStartDate` date,
	`contractEndDate` date,
	`contractHistory` text,
	`accountName` varchar(100),
	`bankName` varchar(200),
	`accountNumber` varchar(50),
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `expense_partner_idx` ON `partner_expenses` (`partnerId`);--> statement-breakpoint
CREATE INDEX `expense_month_idx` ON `partner_expenses` (`month`);--> statement-breakpoint
CREATE INDEX `profit_partner_idx` ON `partner_profit_records` (`partnerId`);--> statement-breakpoint
CREATE INDEX `profit_date_idx` ON `partner_profit_records` (`transferDate`);--> statement-breakpoint
CREATE INDEX `profit_status_idx` ON `partner_profit_records` (`status`);--> statement-breakpoint
CREATE INDEX `partner_user_idx` ON `partners` (`userId`);--> statement-breakpoint
CREATE INDEX `partner_phone_idx` ON `partners` (`phone`);