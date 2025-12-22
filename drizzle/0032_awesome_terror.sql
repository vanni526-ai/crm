ALTER TABLE `parsingCorrections` ADD `annotationType` enum('typical_error','edge_case','common_pattern','none') DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `parsingCorrections` ADD `annotationNote` text;--> statement-breakpoint
ALTER TABLE `parsingCorrections` ADD `annotatedBy` int;--> statement-breakpoint
ALTER TABLE `parsingCorrections` ADD `annotatedAt` timestamp;