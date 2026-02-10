import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { partners, users, partnerCities } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

async function createPartnerAccounts() {
  console.log('开始为合伙人创建账号...\n');
  
  // 获取所有合伙人
  const allPartners = await db.select().from(partners);
  console.log(`找到${allPartners.length}个合伙人\n`);
  
  for (const partner of allPartners) {
    // 检查是否已经有独立账号(不是管理员账号)
    if (partner.userId && partner.userId !== 1) {
      console.log(`✓ ${partner.name} 已有独立账号 (userId: ${partner.userId})`);
      continue;
    }
    
    // 生成手机号（如果没有）
    let phone = partner.phone;
    if (!phone) {
      // 使用合伙人ID生成一个临时手机号
      phone = `1${String(partner.id).padStart(10, '0')}`;
      console.log(`  为 ${partner.name} 生成临时手机号: ${phone}`);
    }
    
    // 检查该手机号是否已被使用
    const existingUser = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    
    let userId;
    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      console.log(`  ${partner.name} 的手机号 ${phone} 已存在用户账号 (userId: ${userId})`);
    } else {
      // 创建新用户账号
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      const result = await db.insert(users).values({
        name: partner.name,
        phone: phone,
        password: hashedPassword,
        role: 'cityPartner', // 城市合伙人角色
        createdBy: 1,
      });
      
      userId = Number(result[0].insertId);
      
      // 获取合伙人的城市
      const cities = await db.select()
        .from(partnerCities)
        .where(eq(partnerCities.partnerId, partner.id));
      
      const cityNames = cities.map(c => c.cityId).join(',');
      if (cityNames) {
        await db.update(users)
          .set({ city: cityNames })
          .where(eq(users.id, userId));
      }
      console.log(`✓ 为 ${partner.name} 创建账号 (userId: ${userId}, phone: ${phone}, password: 123456)`);
    }
    
    // 更新合伙人记录，关联用户ID
    await db.update(partners)
      .set({ 
        userId: userId,
        phone: phone 
      })
      .where(eq(partners.id, partner.id));
    
    console.log(`✓ 更新合伙人 ${partner.name} 的userId为 ${userId}\n`);
  }
  
  console.log('\n账号创建完成！');
  await connection.end();
}

createPartnerAccounts().catch(console.error);
