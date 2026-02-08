ALTER TABLE `teacherPayments` MODIFY COLUMN `status` enum('pending','approved','paid') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `teacherPayments` ADD `approvedBy` int;--> statement-breakpoint
ALTER TABLE `teacherPayments` ADD `approvedAt` timestamp;