CREATE TABLE `user_role_cities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`role` enum('teacher','cityPartner','sales') NOT NULL,
	`cities` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_role_cities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `user_role_idx` ON `user_role_cities` (`userId`,`role`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `user_role_cities` (`userId`);