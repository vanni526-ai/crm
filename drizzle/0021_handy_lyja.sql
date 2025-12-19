CREATE TABLE `gmail_error_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`import_log_id` int NOT NULL,
	`field_name` varchar(100) NOT NULL,
	`wrong_value` text NOT NULL,
	`correct_value` text NOT NULL,
	`feedback_type` varchar(20) NOT NULL,
	`is_learned` boolean DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gmail_error_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gmail_import_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configKey` varchar(100) NOT NULL,
	`configValue` json NOT NULL,
	`description` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gmail_import_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `gmail_import_config_configKey_unique` UNIQUE(`configKey`)
);
--> statement-breakpoint
DROP TABLE `gmailImportConfig`;