ALTER TABLE `orders` ADD `orderType` varchar(20) DEFAULT 'course' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `isMember` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `membershipOrderId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `membershipActivatedAt` timestamp;