ALTER TABLE `orders` ADD `consumablesFee` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `orders` ADD `rentFee` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `orders` ADD `propertyFee` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `orders` ADD `utilityFee` decimal(10,2) DEFAULT '0.00';