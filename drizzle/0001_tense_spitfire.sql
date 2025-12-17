ALTER TABLE `schedules` MODIFY COLUMN `customerId` int;--> statement-breakpoint
ALTER TABLE `schedules` ADD `customerName` varchar(100);