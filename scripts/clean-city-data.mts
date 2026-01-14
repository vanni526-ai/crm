import { getDb } from "../server/db.js";
import { orders } from "../drizzle/schema.js";
import { eq, or, like, isNull } from "drizzle-orm";

// 教室到城市的映射规则
const roomToCityMap: Record<string, string> = {
  // 上海
  "长风1101": "上海",
  "长风北岸1101": "上海",
  "1101": "上海",
  "404": "上海",
  "长风404": "上海",
  "长风北岸404": "上海",
  
  // 其他城市可以根据需要添加
  "济南": "济南",
  "石家庄": "石家庄",
  "大连": "大连",
  "宁波": "宁波",
  "太原": "太原",
  "郑州": "郑州",
  "东莞": "东莞",
  "南京": "南京",
  "无锡": "无锡",
  "武汉": "武汉",
  "天津": "天津",
};

// 根据教室名称推断城市
function inferCityFromRoom(room: string | null): string | null {
  if (!room) return null;
  
  const roomStr = room.trim();
  
  // 直接匹配城市名
  const cityNames = ["上海", "天津", "济南", "石家庄", "大连", "宁波", "太原", "郑州", "东莞", "南京", "无锡", "武汉", "重庆", "苏州"];
  for (const city of cityNames) {
    if (roomStr.includes(city)) {
      return city;
    }
  }
  
  // 检查映射表
  for (const [key, city] of Object.entries(roomToCityMap)) {
    if (roomStr.includes(key)) {
      return city;
    }
  }
  
  return null;
}

async function cleanCityData() {
  console.log("开始清理城市数据...\n");
  
  const db = await getDb();
  if (!db) {
    throw new Error("无法连接到数据库");
  }
  
  try {
    // 1. 修正"会议室:XXX教室"格式的城市数据
    console.log("1. 修正'会议室:XXX教室'格式的城市数据...");
    const cityMappings = [
      { pattern: "%会议室%天津%", city: "天津" },
      { pattern: "%会议室%捕运%", city: "上海" },  // 捕运大厦16D（上海总部办公楼）
      { pattern: "%捕运大厦%", city: "上海" },
      { pattern: "%会议室%东莞%", city: "东莞" },
      { pattern: "%会议室%武汉%", city: "武汉" },
      { pattern: "%会议室%济南%", city: "济南" },
      { pattern: "%会议室%南京%", city: "南京" },
      { pattern: "%会议室%石家庄%", city: "石家庄" },
      { pattern: "%会议室%无锡%", city: "无锡" },
      { pattern: "%会议室%大连%", city: "大连" },
      { pattern: "%会议室%重庆%", city: "重庆" },
      { pattern: "%会议室%郑州%", city: "郑州" },
      { pattern: "%会议室%宁波%", city: "宁波" },
      { pattern: "%会议室%太原%", city: "太原" },
      { pattern: "%会议室%长风%", city: "上海" },
      { pattern: "%长风北岸1101%", city: "上海" },
      { pattern: "%长风1101%", city: "上海" },
      { pattern: "%长风404%", city: "上海" },
    ];
    
    let totalFixed = 0;
    for (const { pattern, city } of cityMappings) {
      const result = await db
        .update(orders)
        .set({ deliveryCity: city })
        .where(like(orders.deliveryCity, pattern));
      
      const count = result.rowsAffected || 0;
      if (count > 0) {
        console.log(`  - 修正匹配 "${pattern}" 的记录: ${count} 条 -> ${city}`);
        totalFixed += count;
      }
    }
    console.log(`  ✓ 共修正 ${totalFixed} 条记录\n`);
    
    // 2. 清理包含http链接的城市字段
    console.log("2. 清理包含http链接的城市字段...");
    const httpResult = await db
      .update(orders)
      .set({ deliveryCity: null })
      .where(like(orders.deliveryCity, "%http%"));
    console.log(`  ✓ 清理 ${httpResult.rowsAffected || 0} 条记录\n`);
    // 3. 将腾讯会议（线上课程）设置为互联网课
    console.log("3. 将腾讯会议（线上课程）设置为互联网课...");
    const tencentResult = await db
      .update(orders)
      .set({ deliveryCity: "互联网课" })
      .where(like(orders.deliveryCity, "%腾讯%"));
    console.log(`  ✓ 修正 ${tencentResult.rowsAffected || 0} 条记录\n`);    
    // 4. 根据教室信息推断城市(处理未知城市和null)
    console.log("4. 根据教室信息推断城市...");
    const unknownCityOrders = await db
      .select()
      .from(orders)
      .where(
        or(
          isNull(orders.deliveryCity),
          eq(orders.deliveryCity, ""),
          eq(orders.deliveryCity, "未知城市")
        )
      );
    
    console.log(`  - 找到 ${unknownCityOrders.length} 条未知城市的订单`);
    
    let inferredCount = 0;
    const cityStats: Record<string, number> = {};
    
    for (const order of unknownCityOrders) {
      const inferredCity = inferCityFromRoom(order.deliveryRoom);
      if (inferredCity) {
        await db
          .update(orders)
          .set({ deliveryCity: inferredCity })
          .where(eq(orders.id, order.id));
        
        inferredCount++;
        cityStats[inferredCity] = (cityStats[inferredCity] || 0) + 1;
      }
    }
    
    console.log(`  ✓ 成功推断 ${inferredCount} 条记录的城市:`);
    for (const [city, count] of Object.entries(cityStats)) {
      console.log(`    - ${city}: ${count} 条`);
    }
    console.log();
    
    // 5. 统计清理后的结果
    console.log("5. 统计清理后的结果...");
    const remainingUnknown = await db
      .select()
      .from(orders)
      .where(
        or(
          isNull(orders.deliveryCity),
          eq(orders.deliveryCity, ""),
          eq(orders.deliveryCity, "未知城市")
        )
      );
    
    console.log(`  - 剩余未知城市订单: ${remainingUnknown.length} 条`);
    
    const allOrders = await db.select().from(orders);
    const cityDistribution: Record<string, number> = {};
    
    for (const order of allOrders) {
      const city = order.deliveryCity || "未知";
      cityDistribution[city] = (cityDistribution[city] || 0) + 1;
    }
    
    console.log("\n城市分布统计:");
    const sortedCities = Object.entries(cityDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    
    for (const [city, count] of sortedCities) {
      const percentage = ((count / allOrders.length) * 100).toFixed(1);
      console.log(`  ${city}: ${count} 条 (${percentage}%)`);
    }
    
    console.log("\n✅ 城市数据清理完成!");
    
  } catch (error) {
    console.error("❌ 清理过程中出错:", error);
    throw error;
  }
}

cleanCityData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
