ALTER TABLE `teachers` ADD `userId` int;--> statement-breakpoint
CREATE INDEX `teacher_user_idx` ON `teachers` (`userId`);