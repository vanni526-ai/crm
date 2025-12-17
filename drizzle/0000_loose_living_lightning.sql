CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`wechatId` varchar(100),
	`phone` varchar(20),
	`trafficSource` varchar(100),
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `importLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` varchar(20) NOT NULL,
	`dataType` varchar(50) NOT NULL,
	`totalRows` int NOT NULL,
	`successRows` int NOT NULL,
	`failedRows` int NOT NULL,
	`errorLog` text,
	`importedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `importLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNo` varchar(50) NOT NULL,
	`customerId` int NOT NULL,
	`salesId` int NOT NULL,
	`paymentAmount` decimal(10,2) NOT NULL,
	`courseAmount` decimal(10,2) NOT NULL,
	`accountBalance` decimal(10,2) NOT NULL DEFAULT '0.00',
	`paymentChannel` varchar(50),
	`channelOrderNo` text,
	`paymentDate` date,
	`paymentTime` time,
	`teacherFee` decimal(10,2) DEFAULT '0.00',
	`transportFee` decimal(10,2) DEFAULT '0.00',
	`otherFee` decimal(10,2) DEFAULT '0.00',
	`partnerFee` decimal(10,2) DEFAULT '0.00',
	`finalAmount` decimal(10,2) DEFAULT '0.00',
	`deliveryCity` varchar(50),
	`deliveryRoom` varchar(100),
	`deliveryTeacher` varchar(100),
	`deliveryCourse` varchar(200),
	`classDate` date,
	`classTime` time,
	`status` enum('pending','paid','completed','cancelled','refunded') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNo_unique` UNIQUE(`orderNo`)
);
--> statement-breakpoint
CREATE TABLE `reconciliations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`periodStart` date NOT NULL,
	`periodEnd` date NOT NULL,
	`totalIncome` decimal(12,2) NOT NULL,
	`totalExpense` decimal(12,2) NOT NULL,
	`teacherFeeTotal` decimal(12,2) DEFAULT '0.00',
	`transportFeeTotal` decimal(12,2) DEFAULT '0.00',
	`otherFeeTotal` decimal(12,2) DEFAULT '0.00',
	`partnerFeeTotal` decimal(12,2) DEFAULT '0.00',
	`profit` decimal(12,2) NOT NULL,
	`status` enum('draft','confirmed') NOT NULL DEFAULT 'draft',
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reconciliations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int,
	`customerId` int NOT NULL,
	`teacherId` int,
	`teacherName` varchar(100),
	`courseType` varchar(200) NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`city` varchar(50),
	`location` varchar(200),
	`status` enum('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teacherPayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherId` int NOT NULL,
	`orderId` int,
	`scheduleId` int,
	`amount` decimal(10,2) NOT NULL,
	`paymentMethod` enum('wechat','alipay','bank','cash','other'),
	`transactionNo` varchar(100),
	`paymentTime` timestamp,
	`status` enum('pending','paid') NOT NULL DEFAULT 'pending',
	`notes` text,
	`recordedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teacherPayments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`nickname` varchar(50),
	`phone` varchar(20),
	`email` varchar(320),
	`wechat` varchar(100),
	`hourlyRate` decimal(10,2),
	`bankAccount` varchar(100),
	`bankName` varchar(100),
	`city` varchar(50),
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teachers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`nickname` varchar(50),
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('admin','sales','finance','user') NOT NULL DEFAULT 'user',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `wechat_idx` ON `customers` (`wechatId`);--> statement-breakpoint
CREATE INDEX `created_by_idx` ON `customers` (`createdBy`);--> statement-breakpoint
CREATE INDEX `customer_idx` ON `orders` (`customerId`);--> statement-breakpoint
CREATE INDEX `sales_idx` ON `orders` (`salesId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `payment_date_idx` ON `orders` (`paymentDate`);--> statement-breakpoint
CREATE INDEX `class_date_idx` ON `orders` (`classDate`);--> statement-breakpoint
CREATE INDEX `period_idx` ON `reconciliations` (`periodStart`,`periodEnd`);--> statement-breakpoint
CREATE INDEX `teacher_idx` ON `schedules` (`teacherId`);--> statement-breakpoint
CREATE INDEX `schedule_customer_idx` ON `schedules` (`customerId`);--> statement-breakpoint
CREATE INDEX `start_time_idx` ON `schedules` (`startTime`);--> statement-breakpoint
CREATE INDEX `schedule_city_idx` ON `schedules` (`city`);--> statement-breakpoint
CREATE INDEX `teacher_payment_idx` ON `teacherPayments` (`teacherId`);--> statement-breakpoint
CREATE INDEX `order_payment_idx` ON `teacherPayments` (`orderId`);--> statement-breakpoint
CREATE INDEX `payment_status_idx` ON `teacherPayments` (`status`);--> statement-breakpoint
CREATE INDEX `teacher_phone_idx` ON `teachers` (`phone`);--> statement-breakpoint
CREATE INDEX `teacher_city_idx` ON `teachers` (`city`);