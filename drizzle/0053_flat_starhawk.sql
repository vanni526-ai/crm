ALTER TABLE `users` ADD `isDeleted` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `deletionReason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `anonymizedAt` timestamp;