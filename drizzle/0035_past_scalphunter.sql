ALTER TABLE `partner_cities` ADD `venueContractFileUrl` text;--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `venueRentAmount` decimal(10,2);--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `venueDeposit` decimal(10,2);--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `venueLeaseStartDate` date;--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `venueLeaseEndDate` date;--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `venuePaymentCycle` enum('monthly','bimonthly','quarterly','semiannual','annual');