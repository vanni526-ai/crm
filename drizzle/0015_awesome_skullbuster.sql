CREATE TABLE `user_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(100),
	`userPhone` varchar(20),
	`type` varchar(50) NOT NULL DEFAULT 'general',
	`title` varchar(200),
	`content` text NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'unread',
	`adminReply` text,
	`repliedBy` int,
	`repliedAt` timestamp,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `notification_user_idx` ON `user_notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `notification_status_idx` ON `user_notifications` (`status`);--> statement-breakpoint
CREATE INDEX `notification_type_idx` ON `user_notifications` (`type`);--> statement-breakpoint
CREATE INDEX `notification_created_at_idx` ON `user_notifications` (`createdAt`);