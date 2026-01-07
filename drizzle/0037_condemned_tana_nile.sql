CREATE TABLE `matchedScheduleOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`orderId` int NOT NULL,
	`matchMethod` enum('llm_intelligent','manual','channel_order_no') NOT NULL,
	`confidence` decimal(5,2),
	`matchDetails` text,
	`isVerified` boolean NOT NULL DEFAULT false,
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matchedScheduleOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_schedule_order` UNIQUE(`scheduleId`,`orderId`)
);
--> statement-breakpoint
CREATE INDEX `schedule_idx` ON `matchedScheduleOrders` (`scheduleId`);--> statement-breakpoint
CREATE INDEX `order_idx` ON `matchedScheduleOrders` (`orderId`);