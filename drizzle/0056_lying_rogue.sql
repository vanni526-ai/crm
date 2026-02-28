CREATE TABLE `membershipOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNo` varchar(50) NOT NULL,
	`userId` int NOT NULL,
	`planId` int NOT NULL,
	`planName` varchar(100) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`status` enum('pending','paid','cancelled','refunded') NOT NULL DEFAULT 'pending',
	`paymentChannel` enum('wechat','alipay','balance'),
	`channelOrderNo` varchar(100),
	`paymentDate` timestamp,
	`activatedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `membershipOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `membershipOrders_orderNo_unique` UNIQUE(`orderNo`)
);
--> statement-breakpoint
CREATE TABLE `membershipPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`duration` int NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`originalPrice` decimal(10,2),
	`benefits` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `membershipPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `membership_order_user_idx` ON `membershipOrders` (`userId`);--> statement-breakpoint
CREATE INDEX `membership_order_status_idx` ON `membershipOrders` (`status`);--> statement-breakpoint
CREATE INDEX `membership_order_no_idx` ON `membershipOrders` (`orderNo`);--> statement-breakpoint
CREATE INDEX `membership_plan_active_idx` ON `membershipPlans` (`isActive`);--> statement-breakpoint
CREATE INDEX `membership_plan_sort_idx` ON `membershipPlans` (`sortOrder`);