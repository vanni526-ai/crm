import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema.js';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

// 城市合伙人费配置数据
const cityConfigs = [
  { city: '济南', partnerFeeRate: '30.00', description: '(课程金额-老师费用)×30%' },
  { city: '石家庄', partnerFeeRate: '30.00', description: '(课程金额-老师费用)×30%' },
  { city: '大连', partnerFeeRate: '30.00', description: '(课程金额-老师费用)×30%' },
  { city: '宁波', partnerFeeRate: '30.00', description: '(课程金额-老师费用)×30%' },
  { city: '太原', partnerFeeRate: '30.00', description: '(课程金额-老师费用)×30%' },
  { city: '郑州', partnerFeeRate: '30.00', description: '(课程金额-老师费用)×30%' },
  { city: '东莞', partnerFeeRate: '30.00', description: '(课程金额-老师费用)×30%' },
  { city: '南京', partnerFeeRate: '30.00', description: '(课程金额-老师费用)×30%' },
  { city: '无锡', partnerFeeRate: '30.00', description: '(课程金额-老师费用)×30%' },
  { city: '武汉', partnerFeeRate: '40.00', description: '(课程金额-老师费用)×40%' },
  { city: '天津', partnerFeeRate: '50.00', description: '(课程金额-老师费用)×50%' },
];

try {
  console.log('开始初始化城市合伙人费配置...');
  
  // 获取管理员用户ID (使用第一个管理员)
  const adminUser = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.role, 'admin'),
  });
  
  if (!adminUser) {
    throw new Error('未找到管理员用户');
  }
  
  const updatedBy = adminUser.id;
  
  // 插入配置数据
  for (const config of cityConfigs) {
    await db.insert(schema.cityPartnerConfig)
      .values({
        ...config,
        updatedBy,
        isActive: true,
      })
      .onDuplicateKeyUpdate({
        set: {
          partnerFeeRate: config.partnerFeeRate,
          description: config.description,
          updatedBy,
          updatedAt: new Date(),
        },
      });
    
    console.log(`✓ ${config.city}: ${config.partnerFeeRate}%`);
  }
  
  console.log('\\n城市合伙人费配置初始化完成!');
  
} catch (error) {
  console.error('初始化失败:', error);
  process.exit(1);
} finally {
  await connection.end();
}
