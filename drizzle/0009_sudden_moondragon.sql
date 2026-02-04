CREATE TABLE `cities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`areaCode` varchar(10),
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cities_id` PRIMARY KEY(`id`),
	CONSTRAINT `cities_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `classrooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cityId` int NOT NULL,
	`cityName` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`address` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `classrooms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `city_name_idx` ON `cities` (`name`);--> statement-breakpoint
CREATE INDEX `city_active_idx` ON `cities` (`isActive`);--> statement-breakpoint
CREATE INDEX `classroom_city_idx` ON `classrooms` (`cityId`);--> statement-breakpoint
CREATE INDEX `classroom_city_name_idx` ON `classrooms` (`cityName`);--> statement-breakpoint
CREATE INDEX `classroom_active_idx` ON `classrooms` (`isActive`);