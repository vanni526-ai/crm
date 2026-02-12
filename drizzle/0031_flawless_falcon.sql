ALTER TABLE `partner_cities` MODIFY COLUMN `partnerBankAccount` varchar(50);--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `expenseCoverage` json;--> statement-breakpoint
ALTER TABLE `partner_cities` DROP COLUMN `partnerAlipayAccount`;