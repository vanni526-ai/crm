import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { cities, partners, partnerCities } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

async function importPartnerData() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);
  
  // 城市-合伙人对应关系
  const cityPartnerMap = {
    '苏州': '苏州加盟商',
    '重庆': '重庆加盟商',
    '天津': '张雪婷',
    '济南': '孙志俊',
    '武汉': '王开霖',
    '郑州': '张浩炜',
    '太原': '康红祥',
    '石家庄': '张雪婷',
    '大连': '张雪婷',
    '东莞': '曹心茹',
    '南京': '赵浩然',
    '福州': '冯玉智',
    '泉州': '冯玉智',
    '无锡': '周建虎',
    '深圳': '瀛姬直营',
    '宁波': '朱利闻'
  };
  
  // 查询所有城市
  const allCities = await db.select().from(cities);
  console.log('找到城市数量:', allCities.length);
  
  // 创建合伙人记录
  const uniquePartners = [...new Set(Object.values(cityPartnerMap))];
  console.log('需要创建的合伙人:', uniquePartners);
  
  for (const partnerName of uniquePartners) {
    // 检查合伙人是否已存在
    const existing = await db.select().from(partners).where(eq(partners.name, partnerName)).limit(1);
    
    if (existing.length === 0) {
      // 创建新合伙人
      const [result] = await db.insert(partners).values({
        userId: 1, // 默认系统管理员
        name: partnerName,
        phone: '',
        profitRatio: '0.30', // 默认30%
        profitRule: '课程金额减去老师费用后按比例分成',
        brandFee: '10000',
        techServiceFee: '5000',
        deferredPaymentTotal: '0',
        deferredPaymentRule: '无',
        contractStartDate: new Date('2025-01-01'),
        contractEndDate: new Date('2025-12-31'),
        isActive: true,
        createdBy: 1
      });
      console.log('创建合伙人:', partnerName, 'ID:', result.insertId);
    } else {
      console.log('合伙人已存在:', partnerName, 'ID:', existing[0].id);
    }
  }
  
  // 关联合伙人与城市
  for (const [cityName, partnerName] of Object.entries(cityPartnerMap)) {
    const city = allCities.find(c => c.name === cityName);
    if (!city) {
      console.log('城市不存在:', cityName);
      continue;
    }
    
    const partnerList = await db.select().from(partners).where(eq(partners.name, partnerName)).limit(1);
    if (partnerList.length === 0) {
      console.log('合伙人不存在:', partnerName);
      continue;
    }
    
    const partner = partnerList[0];
    
    // 检查关联是否已存在
    const existingLink = await db.select().from(partnerCities)
      .where(eq(partnerCities.partnerId, partner.id))
      .where(eq(partnerCities.cityId, city.id))
      .limit(1);
    
    if (existingLink.length === 0) {
      await db.insert(partnerCities).values({
        partnerId: partner.id,
        cityId: city.id,
        createdBy: 1
      });
      console.log('关联:', partnerName, '-', cityName);
    } else {
      console.log('关联已存在:', partnerName, '-', cityName);
    }
  }
  
  await connection.end();
  console.log('导入完成！');
}

importPartnerData().catch(console.error);
