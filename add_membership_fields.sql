-- 为users表添加会员状态和有效期字段
ALTER TABLE users 
ADD COLUMN membershipStatus ENUM('pending', 'active', 'expired') NOT NULL DEFAULT 'pending' AFTER isActive,
ADD COLUMN membershipExpiresAt TIMESTAMP NULL AFTER membershipActivatedAt;

-- 为systemAccounts表添加会员状态和有效期字段  
ALTER TABLE systemAccounts
ADD COLUMN membershipStatus ENUM('pending', 'active', 'expired') NOT NULL DEFAULT 'pending' AFTER isActive,
ADD COLUMN membershipExpiresAt TIMESTAMP NULL AFTER membershipActivatedAt;
