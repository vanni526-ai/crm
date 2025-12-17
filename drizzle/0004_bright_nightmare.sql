ALTER TABLE `orders` MODIFY COLUMN `customerId` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `customerName` varchar(100);