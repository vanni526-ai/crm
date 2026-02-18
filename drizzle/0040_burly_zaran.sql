ALTER TABLE `users` ADD `avatarUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `users` ADD `aliases` text;--> statement-breakpoint
ALTER TABLE `users` ADD `teacherAttribute` enum('S','M','Switch');--> statement-breakpoint
ALTER TABLE `users` ADD `customerType` varchar(200);--> statement-breakpoint
ALTER TABLE `users` ADD `category` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `hourlyRate` decimal(10,2);--> statement-breakpoint
ALTER TABLE `users` ADD `bankAccount` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `bankName` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `contractEndDate` date;--> statement-breakpoint
ALTER TABLE `users` ADD `joinDate` date;--> statement-breakpoint
ALTER TABLE `users` ADD `teacherStatus` varchar(20) DEFAULT '活跃';--> statement-breakpoint
ALTER TABLE `users` ADD `teacherNotes` text;--> statement-breakpoint
ALTER TABLE `users` ADD `wechat` varchar(100);