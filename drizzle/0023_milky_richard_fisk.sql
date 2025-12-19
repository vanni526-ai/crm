ALTER TABLE `teachers` ADD `status` varchar(20) DEFAULT '活跃' NOT NULL;--> statement-breakpoint
ALTER TABLE `teachers` ADD `customerType` varchar(200);--> statement-breakpoint
ALTER TABLE `teachers` ADD `category` varchar(50);--> statement-breakpoint
CREATE INDEX `teacher_name_idx` ON `teachers` (`name`);