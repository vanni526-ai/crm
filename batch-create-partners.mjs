import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { users, partners, partnerCities, cities } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// 合伙人数据：城市 - 姓名对应关系
const partnerData = [
  { city: '苏州', name: '苏州加盟商', phone: '13800000001' },
  { city: '重庆', name: '重庆加盟商', phone: '13800000002' },
  { city: '天津', name: '张雪婷', phone: '13800000003' },
  { city: '济南', name: '孙志俊', phone: '13800000004' },
  { city: '武汉', name: '王开霖', phone: '13800000005' },
  { city: '郑州', name: '张浩炜', phone: '13800000006' },
  { city: '太原', name: '康红祥', phone: '13800000007' },
  { city: '石家庄', name: '张雪婷', phone: '13800000003' }, // 张雪婷管理多个城市
  { city: '大连', name: '张雪婷', phone: '13800000003' },
  { city: '东莞', name: '曹心茹', phone: '13800000008' },
  { city: '南京', name: '赵浩然', phone: '13800000009' },
  { city: '福州', name: '冯玉智', phone: '13800000010' },
  { city: '泉州', name: '冯玉智', phone: '13800000010' }, // 冯玉智管理多个城市
  { city: '无锡', name: '周建虎', phone: '13800000011' },
  { city: '深圳', name: '瀛姬直营', phone: '13800000012' },
  { city: '宁波', name: '朱利闻', phone: '13800000013' },
];

async function batchCreatePartners() {
  console.log('开始批量创建合伙人账号...\n');
  
  // 获取所有城市ID
  const allCities = await db.select().from(cities);
  const cityMap = new Map(allCities.map(c => [c.name, c.id]));
  
  // 按合伙人姓名分组（处理一个人管理多个城市的情况）
  const partnerMap = new Map();
  for (const item of partnerData) {
    if (!partnerMap.has(item.name)) {
      partnerMap.set(item.name, {
        name: item.name,
        phone: item.phone,
        cities: []
      });
    }
    const cityId = cityMap.get(item.city);
    if (cityId) {
      partnerMap.get(item.name).cities.push(cityId);
    }
  }
  
  console.log(`共需创建 ${partnerMap.size} 个合伙人账号\n`);
  
  let userNumber = 1001; // 起始用户编号
  
  for (const [name, data] of partnerMap.entries()) {
    console.log(`\n处理合伙人: ${name}`);
    console.log(`  手机号: ${data.phone}`);
    console.log(`  管理城市: ${data.cities.join(', ')}`);
    
    // 检查手机号是否已存在
    const existingUser = await db.select().from(users).where(eq(users.phone, data.phone)).limit(1);
    
    let userId;
    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      console.log(`  ✓ 用户已存在 (userId: ${userId})`);
      
      // 检查是否已有partner记录
      const existingPartner = await db.select().from(partners).where(eq(partners.userId, userId)).limit(1);
      if (existingPartner.length > 0) {
        console.log(`  ✓ 合伙人记录已存在，跳过`);
        continue;
      }
    } else {
      // 创建新用户
      const hashedPassword = await bcrypt.hash('123456', 10);
      const openId = `partner_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      const result = await db.insert(users).values({
        openId,
        name: name,
        phone: data.phone,
        password: hashedPassword,
        role: 'cityPartner',
        roles: 'cityPartner',
        isActive: true,
      });
      
      userId = Number(result[0].insertId);
      console.log(`  ✓ 创建用户账号 (userId: ${userId}, 用户编号: ${userNumber}, 密码: 123456)`);
      userNumber++;
    }
    
    // 创建partner记录（由于userManagementRouter的自动同步机制，这里可能已经创建了）
    const existingPartner = await db.select().from(partners).where(eq(partners.userId, userId)).limit(1);
    let partnerId;
    
    if (existingPartner.length > 0) {
      partnerId = existingPartner[0].id;
      console.log(`  ✓ 合伙人记录已存在 (partnerId: ${partnerId})`);
    } else {
      const partnerResult = await db.insert(partners).values({
        userId: userId,
        name: name,
        phone: data.phone,
        profitRatio: '0.30', // 默认30%
        createdBy: 1,
      });
      
      partnerId = Number(partnerResult[0].insertId);
      console.log(`  ✓ 创建合伙人记录 (partnerId: ${partnerId})`);
    }
    
    // 关联城市
    for (const cityId of data.cities) {
      // 检查是否已关联
      const existing = await db.select()
        .from(partnerCities)
        .where(eq(partnerCities.partnerId, partnerId))
        .where(eq(partnerCities.cityId, cityId))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(partnerCities).values({
          partnerId: partnerId,
          cityId: cityId,
          createdBy: 1,
        });
        console.log(`    ✓ 关联城市 ${cityId}`);
      }
    }
  }
  
  console.log('\n\n✅ 批量创建完成！');
  console.log(`共创建 ${partnerMap.size} 个合伙人账号`);
  console.log('默认密码: 123456');
  
  await connection.end();
}

batchCreatePartners().catch(console.error);
