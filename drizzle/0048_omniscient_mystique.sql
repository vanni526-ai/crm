CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`courseId` int NOT NULL,
	`courseName` varchar(100) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`duration` decimal(4,2) NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`subtotal` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teacher_unavailability` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherId` int NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`reason` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teacher_unavailability_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `classrooms` ADD `capacity` int DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `order_item_order_idx` ON `order_items` (`orderId`);--> statement-breakpoint
CREATE INDEX `order_item_course_idx` ON `order_items` (`courseId`);--> statement-breakpoint
CREATE INDEX `unavail_teacher_idx` ON `teacher_unavailability` (`teacherId`);--> statement-breakpoint
CREATE INDEX `unavail_time_idx` ON `teacher_unavailability` (`startTime`,`endTime`);