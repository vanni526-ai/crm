DROP INDEX `sales_phone_idx` ON `salespersons`;--> statement-breakpoint
DROP INDEX `sales_city_idx` ON `salespersons`;--> statement-breakpoint
ALTER TABLE `salespersons` MODIFY COLUMN `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `salespersons` DROP COLUMN `name`;--> statement-breakpoint
ALTER TABLE `salespersons` DROP COLUMN `nickname`;--> statement-breakpoint
ALTER TABLE `salespersons` DROP COLUMN `aliases`;--> statement-breakpoint
ALTER TABLE `salespersons` DROP COLUMN `phone`;--> statement-breakpoint
ALTER TABLE `salespersons` DROP COLUMN `email`;--> statement-breakpoint
ALTER TABLE `salespersons` DROP COLUMN `wechat`;--> statement-breakpoint
ALTER TABLE `salespersons` DROP COLUMN `city`;