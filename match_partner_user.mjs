import mysql from 'mysql2/promise';

// 数据库连接配置
const connection = await mysql.createConnection({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

console.log('开始匹配用户账号和合伙人记录...\n');

// 1. 获取所有未关联userId的合伙人记录（userId为NULL或0）
const [unmatchedPartners] = await connection.execute(
  'SELECT * FROM partners WHERE userId IS NULL OR userId = 0'
);

console.log(`找到 ${unmatchedPartners.length} 个未关联的合伙人记录\n`);

let matchedCount = 0;
let unmatchedList = [];

// 2. 遍历每个合伙人记录，尝试通过姓名或城市匹配用户
for (const partner of unmatchedPartners) {
  const partnerName = partner.name;
  let matched = false;
  
  // 策略1: 通过姓名精确匹配
  const [matchedUsers] = await connection.execute(
    'SELECT * FROM users WHERE name = ?',
    [partnerName]
  );
  
  // 筛选出包含cityPartner角色的用户
  const cityPartnerUsers = matchedUsers.filter(user => {
    const roles = user.roles || user.role || '';
    return roles.includes('cityPartner');
  });
  
  if (cityPartnerUsers.length === 1) {
    // 找到唯一匹配的用户，更新partners表的userId
    const matchedUser = cityPartnerUsers[0];
    await connection.execute(
      'UPDATE partners SET userId = ? WHERE id = ?',
      [matchedUser.id, partner.id]
    );
    
    console.log(`✓ [姓名匹配] 合伙人"${partnerName}" (ID: ${partner.id}) <=> 用户"${matchedUser.name}" (ID: ${matchedUser.id})`);
    matchedCount++;
    matched = true;
  } else if (cityPartnerUsers.length > 1) {
    console.log(`⚠ 发现多个同名城市合伙人账号: "${partnerName}" (合伙人ID: ${partner.id}), 用户IDs: ${cityPartnerUsers.map(u => u.id).join(', ')}`);
    unmatchedList.push({
      partnerId: partner.id,
      partnerName: partnerName,
      reason: '存在多个同名用户',
      userIds: cityPartnerUsers.map(u => u.id)
    });
    matched = true; // 虽然有冲突，但不再尝试城市匹配
  }
  
  // 策略2: 如果姓名匹配不到，尝试通过城市匹配
  if (!matched) {
    // 获取该合伙人关联的城市
    const [partnerCityRecords] = await connection.execute(`
      SELECT pc.cityId, c.name as cityName
      FROM partner_cities pc
      LEFT JOIN cities c ON pc.cityId = c.id
      WHERE pc.partnerId = ?
    `, [partner.id]);
    
    if (partnerCityRecords.length > 0) {
      const partnerCityNames = partnerCityRecords.map(pc => pc.cityName).filter(Boolean);
      
      // 查找所有城市合伙人账号
      const [allUsers] = await connection.execute('SELECT * FROM users');
      const filteredCityPartnerUsers = allUsers.filter(user => {
        const roles = user.roles || user.role || '';
        return roles.includes('cityPartner');
      });
      
      // 对每个城市合伙人账号，检查其关联的城市
      let cityMatchedUsers = [];
      for (const user of filteredCityPartnerUsers) {
        const [userCityRecords] = await connection.execute(`
          SELECT cities
          FROM user_role_cities
          WHERE userId = ? AND role = 'cityPartner'
        `, [user.id]);
        
        for (const ucr of userCityRecords) {
          try {
            const userCities = JSON.parse(ucr.cities);
            // 检查是否有交集
            const hasCommonCity = partnerCityNames.some(pcn => userCities.includes(pcn));
            if (hasCommonCity) {
              cityMatchedUsers.push({
                user: user,
                cities: userCities
              });
              break;
            }
          } catch (e) {
            // JSON解析失败，跳过
          }
        }
      }
      
      if (cityMatchedUsers.length === 1) {
        // 找到唯一匹配的用户，更新partners表的userId
        const matchedUser = cityMatchedUsers[0].user;
        await connection.execute(
          'UPDATE partners SET userId = ? WHERE id = ?',
          [matchedUser.id, partner.id]
        );
        
        console.log(`✓ [城市匹配] 合伙人"${partnerName}" (ID: ${partner.id}, 城市: ${partnerCityNames.join(', ')}) <=> 用户"${matchedUser.name}" (ID: ${matchedUser.id}, 城市: ${cityMatchedUsers[0].cities.join(', ')})`);
        matchedCount++;
        matched = true;
      } else if (cityMatchedUsers.length > 1) {
        console.log(`⚠ 发现多个城市合伙人账号关联相同城市: 合伙人"${partnerName}" (ID: ${partner.id}, 城市: ${partnerCityNames.join(', ')}), 用户: ${cityMatchedUsers.map(cm => `${cm.user.name}(ID:${cm.user.id})`).join(', ')}`);
        unmatchedList.push({
          partnerId: partner.id,
          partnerName: partnerName,
          reason: '存在多个关联相同城市的用户',
          cities: partnerCityNames,
          users: cityMatchedUsers.map(cm => ({ id: cm.user.id, name: cm.user.name, cities: cm.cities }))
        });
        matched = true;
      }
    }
  }
  
  // 如果两种策略都没有匹配到
  if (!matched) {
    console.log(`✗ 未找到匹配: 合伙人"${partnerName}" (ID: ${partner.id}) - 没有对应的城市合伙人账号`);
    unmatchedList.push({
      partnerId: partner.id,
      partnerName: partnerName,
      reason: '没有对应的城市合伙人账号'
    });
  }
}

console.log(`\n==================== 匹配结果汇总 ====================`);
console.log(`总共处理: ${unmatchedPartners.length} 个合伙人记录`);
console.log(`成功匹配: ${matchedCount} 个`);
console.log(`未能匹配: ${unmatchedList.length} 个`);

if (unmatchedList.length > 0) {
  console.log(`\n未匹配列表:`);
  unmatchedList.forEach(item => {
    console.log(`  - 合伙人"${item.partnerName}" (ID: ${item.partnerId}): ${item.reason}`);
    if (item.userIds) {
      console.log(`    用户IDs: ${item.userIds.join(', ')}`);
    }
    if (item.cities) {
      console.log(`    城市: ${item.cities.join(', ')}`);
    }
    if (item.users) {
      console.log(`    候选用户: ${item.users.map(u => `${u.name}(ID:${u.id}, 城市:${u.cities.join(',')})`).join(', ')}`);
    }
  });
}

console.log(`\n匹配完成!`);

await connection.end();
