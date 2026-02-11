ALTER TABLE `partner_cities` ADD `contractStatus` enum('draft','active','expired','terminated') DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `contractStartDate` date;--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `contractEndDate` date;--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `contractSignDate` date;--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `contractFileUrl` text;--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `equityRatioPartner` decimal(5,2);--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `equityRatioBrand` decimal(5,2);--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `profitRatioStage1Partner` decimal(5,2);--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `profitRatioStage1Brand` decimal(5,2);--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `profitRatioStage2APartner` decimal(5,2);--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `profitRatioStage2ABrand` decimal(5,2);--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `profitRatioStage2BPartner` decimal(5,2);--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `profitRatioStage2BBrand` decimal(5,2);--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `profitRatioStage3Partner` decimal(5,2);--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `profitRatioStage3Brand` decimal(5,2);--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `currentProfitStage` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `isInvestmentRecovered` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `brandUsageFee` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `brandAuthDeposit` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `managementFee` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `operationPositionFee` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `teacherRecruitmentFee` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `marketingFee` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `estimatedRentDeposit` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `estimatedPropertyFee` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `estimatedUtilityFee` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `estimatedRegistrationFee` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `estimatedRenovationFee` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `totalEstimatedCost` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `partnerBankName` varchar(200);--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `partnerBankAccount` varchar(100);--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `partnerAccountHolder` varchar(100);--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `partnerAlipayAccount` varchar(100);--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `partnerWechatAccount` varchar(100);--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `legalRepresentative` varchar(100);--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `supervisor` varchar(100);--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `financialOfficer` varchar(100);--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `phoneNumbers` text;--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `mediaAccounts` text;--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `profitPaymentDay` int DEFAULT 25;--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `profitPaymentRule` text;--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `partner_cities` ADD `updatedBy` int;--> statement-breakpoint
CREATE INDEX `contract_status_idx` ON `partner_cities` (`contractStatus`);