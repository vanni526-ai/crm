ALTER TABLE `schedules` ADD `classroomId` int;--> statement-breakpoint
CREATE INDEX `classroom_idx` ON `schedules` (`classroomId`);