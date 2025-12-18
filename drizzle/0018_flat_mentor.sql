DROP TABLE `auditLogs`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_username_unique`;--> statement-breakpoint
DROP INDEX `salesperson_idx` ON `users`;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `customerWechat`;--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `downPayment`;--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `finalPayment`;--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `rechargeAmount`;--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `netIncome`;--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `confidence`;--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `originalText`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `username`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `passwordHash`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `salespersonId`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `createdBy`;