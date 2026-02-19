ALTER TABLE `systemAccounts` ADD `isMember` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `systemAccounts` ADD `membershipOrderId` int;--> statement-breakpoint
ALTER TABLE `systemAccounts` ADD `membershipActivatedAt` timestamp;