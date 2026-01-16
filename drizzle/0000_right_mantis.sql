CREATE TABLE `accountTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`customerName` varchar(100) NOT NULL,
	`type` enum('recharge','consume','refund') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`balanceBefore` decimal(10,2) NOT NULL,
	`balanceAfter` decimal(10,2) NOT NULL,
	`relatedOrderId` int,
	`relatedOrderNo` varchar(50),
	`notes` text,
	`operatorId` int NOT NULL,
	`operatorName` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `accountTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` enum('order_create','order_update','order_delete','user_create','user_role_update','user_status_update','user_delete','data_import','customer_create','customer_update','customer_delete','teacher_create','teacher_update','teacher_delete','schedule_create','schedule_update','schedule_delete') NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(100),
	`userRole` varchar(20),
	`targetType` varchar(50),
	`targetId` int,
	`targetName` varchar(200),
	`description` text NOT NULL,
	`changes` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cityPartnerConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`city` varchar(50) NOT NULL,
	`areaCode` varchar(10),
	`partnerFeeRate` decimal(5,2) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`updatedBy` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cityPartnerConfig_id` PRIMARY KEY(`id`),
	CONSTRAINT `cityPartnerConfig_city_unique` UNIQUE(`city`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`wechatId` varchar(100),
	`phone` varchar(20),
	`trafficSource` varchar(100),
	`accountBalance` decimal(10,2) NOT NULL DEFAULT '0.00',
	`tags` text,
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fieldMappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('salesperson_alias','city_code','teacher_alias','course_alias') NOT NULL,
	`sourceValue` varchar(100) NOT NULL,
	`targetValue` varchar(100) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fieldMappings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `gmailImportHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` varchar(255) NOT NULL,
	`threadId` varchar(255) NOT NULL,
	`subject` text,
	`fromEmail` varchar(255),
	`orderId` int,
	`importStatus` enum('success','failed','skipped') NOT NULL,
	`errorMessage` text,
	`operatorId` int NOT NULL,
	`operatorName` varchar(100),
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gmailImportHistory_id` PRIMARY KEY(`id`),
	CONSTRAINT `gmailImportHistory_messageId_unique` UNIQUE(`messageId`)
);
--> statement-breakpoint
CREATE TABLE `gmailImportLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emailSubject` varchar(255) NOT NULL,
	`emailDate` timestamp NOT NULL,
	`threadId` varchar(100) NOT NULL,
	`totalOrders` int NOT NULL,
	`successOrders` int NOT NULL,
	`failedOrders` int NOT NULL,
	`status` enum('success','partial','failed') NOT NULL,
	`errorLog` text,
	`emailContent` text,
	`parsedData` json,
	`warningFlags` json,
	`importedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gmailImportLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `importLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` varchar(20) NOT NULL,
	`dataType` varchar(50) NOT NULL,
	`totalRows` int NOT NULL,
	`successRows` int NOT NULL,
	`failedRows` int NOT NULL,
	`errorLog` text,
	`importedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `importLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matchedScheduleOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`orderId` int NOT NULL,
	`matchMethod` enum('llm_intelligent','manual','channel_order_no') NOT NULL,
	`confidence` decimal(5,2),
	`matchDetails` text,
	`isVerified` boolean NOT NULL DEFAULT false,
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matchedScheduleOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_schedule_order` UNIQUE(`scheduleId`,`orderId`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNo` varchar(50) NOT NULL,
	`customerId` int,
	`customerName` varchar(100),
	`salespersonId` int,
	`salesId` int NOT NULL,
	`salesPerson` varchar(100),
	`trafficSource` varchar(100),
	`paymentAmount` decimal(10,2) NOT NULL,
	`courseAmount` decimal(10,2) NOT NULL,
	`accountBalance` decimal(10,2) NOT NULL DEFAULT '0.00',
	`paymentCity` varchar(50),
	`paymentChannel` varchar(50),
	`channelOrderNo` text,
	`paymentDate` date,
	`paymentTime` time,
	`teacherFee` decimal(10,2) DEFAULT '0.00',
	`transportFee` decimal(10,2) DEFAULT '0.00',
	`otherFee` decimal(10,2) DEFAULT '0.00',
	`partnerFee` decimal(10,2) DEFAULT '0.00',
	`finalAmount` decimal(10,2) DEFAULT '0.00',
	`deliveryCity` varchar(50),
	`deliveryRoom` varchar(100),
	`deliveryTeacher` varchar(100),
	`deliveryCourse` varchar(200),
	`classDate` date,
	`classTime` varchar(50),
	`status` enum('pending','paid','completed','cancelled','refunded') NOT NULL DEFAULT 'pending',
	`isVoided` boolean NOT NULL DEFAULT false,
	`notes` text,
	`noteTags` text,
	`discountInfo` text,
	`couponInfo` text,
	`membershipInfo` text,
	`paymentStatus` varchar(50),
	`specialNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNo_unique` UNIQUE(`orderNo`)
);
--> statement-breakpoint
CREATE TABLE `parsingCorrections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`originalText` text NOT NULL,
	`fieldName` varchar(50) NOT NULL,
	`llmValue` text,
	`correctedValue` text NOT NULL,
	`correctionType` enum('field_missing','field_wrong','format_error','logic_error','manual_edit') NOT NULL,
	`context` text,
	`userId` int NOT NULL,
	`userName` varchar(100),
	`isLearned` boolean NOT NULL DEFAULT false,
	`learnedAt` timestamp,
	`annotationType` enum('typical_error','edge_case','common_pattern','none') DEFAULT 'none',
	`annotationNote` text,
	`annotatedBy` int,
	`annotatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `parsingCorrections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parsingLearningConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configKey` varchar(50) NOT NULL,
	`configValue` text NOT NULL,
	`description` text,
	`updatedBy` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `parsingLearningConfig_id` PRIMARY KEY(`id`),
	CONSTRAINT `parsingLearningConfig_configKey_unique` UNIQUE(`configKey`)
);
--> statement-breakpoint
CREATE TABLE `partnerFeeAuditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operationType` varchar(50) NOT NULL,
	`operationDescription` text NOT NULL,
	`operatorId` int NOT NULL,
	`operatorName` varchar(100) NOT NULL,
	`affectedCount` int NOT NULL DEFAULT 0,
	`details` json,
	`status` enum('success','failed','partial') NOT NULL DEFAULT 'success',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `partnerFeeAuditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promptOptimizationHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`version` varchar(50) NOT NULL,
	`optimizationType` enum('add_example','update_rule','fix_error_pattern') NOT NULL,
	`changeDescription` text NOT NULL,
	`newExamples` text,
	`correctionCount` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promptOptimizationHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reconciliations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`periodStart` date NOT NULL,
	`periodEnd` date NOT NULL,
	`totalIncome` decimal(12,2) NOT NULL,
	`totalExpense` decimal(12,2) NOT NULL,
	`teacherFeeTotal` decimal(12,2) DEFAULT '0.00',
	`transportFeeTotal` decimal(12,2) DEFAULT '0.00',
	`otherFeeTotal` decimal(12,2) DEFAULT '0.00',
	`partnerFeeTotal` decimal(12,2) DEFAULT '0.00',
	`profit` decimal(12,2) NOT NULL,
	`status` enum('draft','confirmed') NOT NULL DEFAULT 'draft',
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reconciliations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salespersons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`name` varchar(100) NOT NULL,
	`nickname` varchar(50),
	`aliases` text,
	`phone` varchar(20),
	`email` varchar(320),
	`wechat` varchar(100),
	`commissionRate` decimal(5,2) DEFAULT '0.00',
	`city` varchar(50),
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `salespersons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int,
	`customerId` int,
	`customerName` varchar(100),
	`wechatId` varchar(100),
	`salesName` varchar(100),
	`trafficSource` varchar(100),
	`paymentAmount` decimal(10,2),
	`courseAmount` decimal(10,2),
	`accountBalance` decimal(10,2),
	`paymentCity` varchar(50),
	`channelOrderNo` varchar(100),
	`overflowOrderNo` varchar(100),
	`refundNo` varchar(100),
	`paymentDate` date,
	`paymentTime` varchar(20),
	`teacherFee` decimal(10,2),
	`transportFee` decimal(10,2),
	`otherFee` decimal(10,2),
	`partnerFee` decimal(10,2),
	`receivedAmount` decimal(10,2),
	`deliveryCity` varchar(50),
	`deliveryClassroom` varchar(100),
	`deliveryTeacher` varchar(100),
	`deliveryCourse` varchar(200),
	`teacherId` int,
	`teacherName` varchar(100),
	`courseType` varchar(200) NOT NULL,
	`classDate` date,
	`classTime` varchar(20),
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`city` varchar(50),
	`location` varchar(200),
	`status` enum('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smartRegisterHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template` enum('wechat','alipay','custom') NOT NULL,
	`totalRows` int NOT NULL,
	`successCount` int NOT NULL,
	`failCount` int NOT NULL,
	`operatorId` int NOT NULL,
	`operatorName` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `smartRegisterHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teacherPayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherId` int NOT NULL,
	`orderId` int,
	`scheduleId` int,
	`amount` decimal(10,2) NOT NULL,
	`paymentMethod` enum('wechat','alipay','bank','cash','other'),
	`transactionNo` varchar(100),
	`paymentTime` timestamp,
	`status` enum('pending','paid') NOT NULL DEFAULT 'pending',
	`notes` text,
	`recordedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teacherPayments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`phone` varchar(20),
	`status` varchar(20) NOT NULL DEFAULT '活跃',
	`customerType` varchar(200),
	`notes` text,
	`category` varchar(50),
	`city` varchar(50),
	`nickname` varchar(50),
	`email` varchar(320),
	`wechat` varchar(100),
	`hourlyRate` decimal(10,2),
	`bankAccount` varchar(100),
	`bankName` varchar(100),
	`aliases` text,
	`contractEndDate` date,
	`joinDate` date,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teachers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`nickname` varchar(50),
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('admin','sales','finance','user') NOT NULL DEFAULT 'user',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `customer_idx` ON `accountTransactions` (`customerId`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `accountTransactions` (`type`);--> statement-breakpoint
CREATE INDEX `order_idx` ON `accountTransactions` (`relatedOrderId`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `accountTransactions` (`createdAt`);--> statement-breakpoint
CREATE INDEX `action_idx` ON `auditLogs` (`action`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `auditLogs` (`userId`);--> statement-breakpoint
CREATE INDEX `target_idx` ON `auditLogs` (`targetType`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `auditLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `city_idx` ON `cityPartnerConfig` (`city`);--> statement-breakpoint
CREATE INDEX `active_idx` ON `cityPartnerConfig` (`isActive`);--> statement-breakpoint
CREATE INDEX `wechat_idx` ON `customers` (`wechatId`);--> statement-breakpoint
CREATE INDEX `created_by_idx` ON `customers` (`createdBy`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `fieldMappings` (`type`);--> statement-breakpoint
CREATE INDEX `source_idx` ON `fieldMappings` (`sourceValue`);--> statement-breakpoint
CREATE INDEX `message_id_idx` ON `gmailImportHistory` (`messageId`);--> statement-breakpoint
CREATE INDEX `thread_id_idx` ON `gmailImportHistory` (`threadId`);--> statement-breakpoint
CREATE INDEX `imported_at_idx` ON `gmailImportHistory` (`importedAt`);--> statement-breakpoint
CREATE INDEX `operator_idx` ON `gmailImportHistory` (`operatorId`);--> statement-breakpoint
CREATE INDEX `thread_id_idx` ON `gmailImportLogs` (`threadId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `gmailImportLogs` (`status`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `gmailImportLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `schedule_idx` ON `matchedScheduleOrders` (`scheduleId`);--> statement-breakpoint
CREATE INDEX `order_idx` ON `matchedScheduleOrders` (`orderId`);--> statement-breakpoint
CREATE INDEX `customer_idx` ON `orders` (`customerId`);--> statement-breakpoint
CREATE INDEX `sales_idx` ON `orders` (`salesId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `payment_date_idx` ON `orders` (`paymentDate`);--> statement-breakpoint
CREATE INDEX `class_date_idx` ON `orders` (`classDate`);--> statement-breakpoint
CREATE INDEX `field_idx` ON `parsingCorrections` (`fieldName`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `parsingCorrections` (`userId`);--> statement-breakpoint
CREATE INDEX `learned_idx` ON `parsingCorrections` (`isLearned`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `parsingCorrections` (`createdAt`);--> statement-breakpoint
CREATE INDEX `operation_type_idx` ON `partnerFeeAuditLogs` (`operationType`);--> statement-breakpoint
CREATE INDEX `operator_idx` ON `partnerFeeAuditLogs` (`operatorId`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `partnerFeeAuditLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `version_idx` ON `promptOptimizationHistory` (`version`);--> statement-breakpoint
CREATE INDEX `active_idx` ON `promptOptimizationHistory` (`isActive`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `promptOptimizationHistory` (`createdAt`);--> statement-breakpoint
CREATE INDEX `period_idx` ON `reconciliations` (`periodStart`,`periodEnd`);--> statement-breakpoint
CREATE INDEX `sales_user_idx` ON `salespersons` (`userId`);--> statement-breakpoint
CREATE INDEX `sales_phone_idx` ON `salespersons` (`phone`);--> statement-breakpoint
CREATE INDEX `sales_city_idx` ON `salespersons` (`city`);--> statement-breakpoint
CREATE INDEX `teacher_idx` ON `schedules` (`teacherId`);--> statement-breakpoint
CREATE INDEX `schedule_customer_idx` ON `schedules` (`customerId`);--> statement-breakpoint
CREATE INDEX `start_time_idx` ON `schedules` (`startTime`);--> statement-breakpoint
CREATE INDEX `schedule_city_idx` ON `schedules` (`city`);--> statement-breakpoint
CREATE INDEX `sales_idx` ON `schedules` (`salesName`);--> statement-breakpoint
CREATE INDEX `payment_date_idx` ON `schedules` (`paymentDate`);--> statement-breakpoint
CREATE INDEX `operator_idx` ON `smartRegisterHistory` (`operatorId`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `smartRegisterHistory` (`createdAt`);--> statement-breakpoint
CREATE INDEX `teacher_payment_idx` ON `teacherPayments` (`teacherId`);--> statement-breakpoint
CREATE INDEX `order_payment_idx` ON `teacherPayments` (`orderId`);--> statement-breakpoint
CREATE INDEX `payment_status_idx` ON `teacherPayments` (`status`);--> statement-breakpoint
CREATE INDEX `teacher_phone_idx` ON `teachers` (`phone`);--> statement-breakpoint
CREATE INDEX `teacher_city_idx` ON `teachers` (`city`);--> statement-breakpoint
CREATE INDEX `teacher_name_idx` ON `teachers` (`name`);