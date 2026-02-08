ALTER TABLE `orders` MODIFY COLUMN `deliveryStatus` enum('pending','accepted','delivered') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `orders` ADD `acceptedAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `acceptedBy` int;