ALTER TABLE `customers` ADD `membershipStatus` enum('pending','active','expired') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `membershipOrderId` int;--> statement-breakpoint
ALTER TABLE `customers` ADD `membershipActivatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `customers` ADD `membershipExpiresAt` timestamp;