ALTER TABLE `orders` ADD `customerWechat` varchar(100);--> statement-breakpoint
ALTER TABLE `orders` ADD `downPayment` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `orders` ADD `finalPayment` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `orders` ADD `rechargeAmount` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `orders` ADD `netIncome` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `orders` ADD `confidence` decimal(5,2);--> statement-breakpoint
ALTER TABLE `orders` ADD `originalText` text;