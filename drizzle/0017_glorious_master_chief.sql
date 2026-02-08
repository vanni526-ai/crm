ALTER TABLE `salespersons` ADD `orderCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `salespersons` ADD `totalSales` decimal(12,2) DEFAULT '0.00' NOT NULL;