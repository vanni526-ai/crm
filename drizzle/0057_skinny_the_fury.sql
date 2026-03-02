ALTER TABLE `courses` ADD `teacherFee` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `order_items` ADD `teacherFeePerSession` decimal(10,2) DEFAULT '0.00';