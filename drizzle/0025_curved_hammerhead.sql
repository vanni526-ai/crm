CREATE TABLE `partner_cities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`cityId` int NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partner_cities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `partner_city_partner_idx` ON `partner_cities` (`partnerId`);--> statement-breakpoint
CREATE INDEX `partner_city_city_idx` ON `partner_cities` (`cityId`);--> statement-breakpoint
CREATE INDEX `unique_partner_city` ON `partner_cities` (`partnerId`,`cityId`);