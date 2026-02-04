CREATE TABLE IF NOT EXISTS `cities` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(50) NOT NULL UNIQUE,
  `areaCode` varchar(10),
  `isActive` boolean NOT NULL DEFAULT true,
  `sortOrder` int DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `cities_id` PRIMARY KEY(`id`),
  INDEX `city_name_idx` (`name`),
  INDEX `city_active_idx` (`isActive`)
);

CREATE TABLE IF NOT EXISTS `classrooms` (
  `id` int AUTO_INCREMENT NOT NULL,
  `cityId` int NOT NULL,
  `cityName` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `address` text NOT NULL,
  `isActive` boolean NOT NULL DEFAULT true,
  `sortOrder` int DEFAULT 0,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `classrooms_id` PRIMARY KEY(`id`),
  INDEX `classroom_city_idx` (`cityId`),
  INDEX `classroom_city_name_idx` (`cityName`),
  INDEX `classroom_active_idx` (`isActive`)
);
