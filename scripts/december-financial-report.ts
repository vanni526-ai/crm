import { getDb } from "../server/db";
import { orders, cityPartnerConfig } from "../drizzle/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import * as XLSX from "xlsx";

async function generateDecemberFinancialReport() {
  console.log("开始生成12月财务统计表...");

  // 获取数据库连接
  const db = await getDb();
  if (!db) {
    console.error("数据库连接失败");
    process.exit(1);
  }

  // 定义12月的时间范围
  const startDate = new Date("2025-12-01");
  const endDate = new Date("2025-12-31");
  
  console.log(`统计时间范围: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);

  // 1. 查询12月的所有订单
  const decemberOrders = await db
    .select()
    .from(orders)
    .where(
      and(
        gte(orders.classDate, startDate),
        lte(orders.classDate, endDate)
      )
    );

  console.log(`查询到12月订单数: ${decemberOrders.length} 个`);

  // 2. 查询城市合伙人费配置
  const cityConfigs = await db.select().from(cityPartnerConfig);
  const cityConfigMap = new Map(
    cityConfigs.map(c => [c.city, { rate: c.partnerFeeRate, areaCode: c.areaCode }])
  );

  console.log(`城市配置数: ${cityConfigs.length} 个`);

  // 3. 按城市统计
  const cityStats = new Map<string, {
    orderCount: number;
    totalCourseAmount: number;
    totalTeacherFee: number;
    totalTransportFee: number;
    totalOtherFee: number;
    totalPartnerFee: number;
    partnerRate: number;
    areaCode: string;
  }>();

  for (const order of decemberOrders) {
    const city = order.deliveryCity || "未知";
    
    if (!cityStats.has(city)) {
      const config = cityConfigMap.get(city);
      cityStats.set(city, {
        orderCount: 0,
        totalCourseAmount: 0,
        totalTeacherFee: 0,
        totalTransportFee: 0,
        totalOtherFee: 0,
        totalPartnerFee: 0,
        partnerRate: config?.rate || 0,
        areaCode: config?.areaCode || "-"
      });
    }

    const stat = cityStats.get(city)!;
    stat.orderCount++;
    stat.totalCourseAmount += Number(order.courseAmount) || 0;
    stat.totalTeacherFee += Number(order.teacherFee) || 0;
    stat.totalTransportFee += Number(order.transportFee) || 0;
    stat.totalOtherFee += (Number(order.otherFee) || 0) + (Number(order.partnerFee) || 0);
    stat.totalPartnerFee += Number(order.partnerFee) || 0;
  }

  // 4. 按老师统计
  const teacherStats = new Map<string, {
    orderCount: number;
    totalTeacherFee: number;
    totalTransportFee: number;
  }>();

  for (const order of decemberOrders) {
    const teacher = order.deliveryTeacher || "未知";
    
    if (!teacherStats.has(teacher)) {
      teacherStats.set(teacher, {
        orderCount: 0,
        totalTeacherFee: 0,
        totalTransportFee: 0
      });
    }

    const stat = teacherStats.get(teacher)!;
    stat.orderCount++;
    stat.totalTeacherFee += Number(order.teacherFee) || 0;
    stat.totalTransportFee += Number(order.transportFee) || 0;
  }

  // 5. 生成Excel报表
  const workbook = XLSX.utils.book_new();

  // 工作表1: 按城市统计
  const cityData = Array.from(cityStats.entries())
    .map(([city, stat]) => ({
      "城市": city,
      "区号": stat.areaCode,
      "订单数": stat.orderCount,
      "课程金额": stat.totalCourseAmount.toFixed(2),
      "老师费用": stat.totalTeacherFee.toFixed(2),
      "车费": stat.totalTransportFee.toFixed(2),
      "其他费用": stat.totalOtherFee.toFixed(2),
      "合伙人费率": `${stat.partnerRate}%`,
      "合伙人应得": stat.totalPartnerFee.toFixed(2)
    }))
    .sort((a, b) => Number(b["合伙人应得"]) - Number(a["合伙人应得"]));

  const citySheet = XLSX.utils.json_to_sheet(cityData);
  XLSX.utils.book_append_sheet(workbook, citySheet, "按城市统计");

  // 工作表2: 按老师统计
  const teacherData = Array.from(teacherStats.entries())
    .map(([teacher, stat]) => ({
      "老师": teacher,
      "授课数": stat.orderCount,
      "老师费用": stat.totalTeacherFee.toFixed(2),
      "车费": stat.totalTransportFee.toFixed(2),
      "总收入": (stat.totalTeacherFee + stat.totalTransportFee).toFixed(2)
    }))
    .sort((a, b) => Number(b["总收入"]) - Number(a["总收入"]));

  const teacherSheet = XLSX.utils.json_to_sheet(teacherData);
  XLSX.utils.book_append_sheet(workbook, teacherSheet, "按老师统计");

  // 工作表3: 汇总统计
  const totalCourseAmount = Array.from(cityStats.values()).reduce((sum, s) => sum + s.totalCourseAmount, 0);
  const totalTeacherFee = Array.from(cityStats.values()).reduce((sum, s) => sum + s.totalTeacherFee, 0);
  const totalTransportFee = Array.from(cityStats.values()).reduce((sum, s) => sum + s.totalTransportFee, 0);
  const totalOtherFee = Array.from(cityStats.values()).reduce((sum, s) => sum + s.totalOtherFee, 0);
  const totalPartnerFee = Array.from(cityStats.values()).reduce((sum, s) => sum + s.totalPartnerFee, 0);

  const summaryData = [
    { "项目": "订单总数", "金额": decemberOrders.length },
    { "项目": "课程总金额", "金额": totalCourseAmount.toFixed(2) },
    { "项目": "老师费用总计", "金额": totalTeacherFee.toFixed(2) },
    { "项目": "车费总计", "金额": totalTransportFee.toFixed(2) },
    { "项目": "其他费用总计", "金额": totalOtherFee.toFixed(2) },
    { "项目": "合伙人费用总计", "金额": totalPartnerFee.toFixed(2) },
    { "项目": "公司净收入", "金额": (totalCourseAmount - totalTeacherFee - totalTransportFee - totalOtherFee).toFixed(2) }
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "汇总统计");

  // 保存文件
  const outputPath = "/home/ubuntu/upload/12月财务统计表.xlsx";
  XLSX.writeFile(workbook, outputPath);

  console.log(`\n✅ 12月财务统计表已生成: ${outputPath}`);
  console.log(`\n📊 统计摘要:`);
  console.log(`订单总数: ${decemberOrders.length}`);
  console.log(`课程总金额: ¥${totalCourseAmount.toFixed(2)}`);
  console.log(`老师费用总计: ¥${totalTeacherFee.toFixed(2)}`);
  console.log(`车费总计: ¥${totalTransportFee.toFixed(2)}`);
  console.log(`合伙人费用总计: ¥${totalPartnerFee.toFixed(2)}`);
  console.log(`公司净收入: ¥${(totalCourseAmount - totalTeacherFee - totalTransportFee - totalOtherFee).toFixed(2)}`);
  console.log(`\n🏆 Top 5 城市(按合伙人费用):`);
  cityData.slice(0, 5).forEach((c, i) => {
    console.log(`  ${i + 1}. ${c["城市"]}: ¥${c["合伙人应得"]} (${c["订单数"]}单)`);
  });
  console.log(`\n🏆 Top 5 老师(按总收入):`);
  teacherData.slice(0, 5).forEach((t, i) => {
    console.log(`  ${i + 1}. ${t["老师"]}: ¥${t["总收入"]} (${t["授课数"]}节)`);
  });

  process.exit(0);
}

generateDecemberFinancialReport().catch(console.error);
