import { getDb } from '../server/db.ts';
import { orders, cityPartnerConfig } from '../drizzle/schema.ts';
import { and, gte, lte, or, isNull, eq } from 'drizzle-orm';
import * as XLSX from 'xlsx';

async function generate2025MonthlyReport() {
  console.log('开始生成2025年月度财务统计...\n');

  const db = await getDb();
  if (!db) {
    console.error('无法连接到数据库');
    return;
  }

  const cityConfigs = await db.select().from(cityPartnerConfig);
  const cityRateMap = {};
  cityConfigs.forEach(config => {
    cityRateMap[config.city] = config.partnerFeeRate;
  });
  console.log(`已加载 ${cityConfigs.length} 个城市的合伙人费率配置`);

  const monthlyStats = [];
  const monthlyTeacherStats = [];
  const monthlySalesStats = [];

  for (let month = 1; month <= 12; month++) {
    const startDate = new Date(2025, month - 1, 1);
    const endDate = new Date(2025, month, 0, 23, 59, 59);

    console.log(`\n处理 ${month}月 数据...`);

    const monthOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          gte(orders.classDate, startDate),
          lte(orders.classDate, endDate),
          or(
            isNull(orders.status),
            eq(orders.status, 'paid'),
            eq(orders.status, 'completed')
          )
        )
      );

    console.log(`  找到 ${monthOrders.length} 个订单`);

    if (monthOrders.length === 0) continue;

    const cityStats = {};
    monthOrders.forEach(order => {
      const city = order.deliveryCity || '未知城市';
      if (!cityStats[city]) {
        cityStats[city] = {
          orderCount: 0,
          courseAmount: 0,
          teacherFee: 0,
          transportFee: 0,
          otherFee: 0,
          partnerFee: 0,
        };
      }

      cityStats[city].orderCount += 1;
      cityStats[city].courseAmount += Number(order.courseAmount || 0);
      cityStats[city].teacherFee += Number(order.teacherFee || 0);
      cityStats[city].transportFee += Number(order.transportFee || 0);
      cityStats[city].otherFee += Number(order.otherFee || 0);
      cityStats[city].partnerFee += Number(order.partnerFee || 0);
    });

    Object.entries(cityStats).forEach(([city, stats]) => {
      const partnerRate = cityRateMap[city] || 0;
      monthlyStats.push({
        月份: `${month}月`,
        城市: city,
        订单数: stats.orderCount,
        课程金额: stats.courseAmount,
        老师费用: stats.teacherFee,
        车费: stats.transportFee,
        其他费用: stats.otherFee,
        合伙人费率: `${(partnerRate * 100).toFixed(0)}%`,
        合伙人应得: stats.partnerFee,
      });
    });

    const teacherStats = {};
    monthOrders.forEach(order => {
      const teacher = order.deliveryTeacher || '未知老师';
      if (!teacherStats[teacher]) {
        teacherStats[teacher] = {
          courseCount: 0,
          teacherFee: 0,
          transportFee: 0,
        };
      }

      teacherStats[teacher].courseCount += 1;
      teacherStats[teacher].teacherFee += Number(order.teacherFee || 0);
      teacherStats[teacher].transportFee += Number(order.transportFee || 0);
    });

    Object.entries(teacherStats).forEach(([teacher, stats]) => {
      monthlyTeacherStats.push({
        月份: `${month}月`,
        老师: teacher,
        授课数: stats.courseCount,
        老师费用: stats.teacherFee,
        车费: stats.transportFee,
        总收入: stats.teacherFee + stats.transportFee,
      });
    });

    const salesStats = {};
    monthOrders.forEach(order => {
      const sales = order.salesPerson || '未知销售';
      if (!salesStats[sales]) {
        salesStats[sales] = {
          orderCount: 0,
          courseAmount: 0,
        };
      }

      salesStats[sales].orderCount += 1;
      salesStats[sales].courseAmount += Number(order.courseAmount || 0);
    });

    Object.entries(salesStats).forEach(([sales, stats]) => {
      monthlySalesStats.push({
        月份: `${month}月`,
        销售人员: sales,
        订单数: stats.orderCount,
        销售额: stats.courseAmount,
      });
    });
  }

  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(monthlyStats);
  XLSX.utils.book_append_sheet(wb, ws1, '按月份和城市统计');

  const ws2 = XLSX.utils.json_to_sheet(monthlyTeacherStats);
  XLSX.utils.book_append_sheet(wb, ws2, '按月份和老师统计');

  const ws3 = XLSX.utils.json_to_sheet(monthlySalesStats);
  XLSX.utils.book_append_sheet(wb, ws3, '按月份和销售统计');

  const totalOrders = monthlyStats.reduce((sum, row) => sum + row.订单数, 0);
  const totalCourseAmount = monthlyStats.reduce((sum, row) => sum + row.课程金额, 0);
  const totalTeacherFee = monthlyStats.reduce((sum, row) => sum + row.老师费用, 0);
  const totalTransportFee = monthlyStats.reduce((sum, row) => sum + row.车费, 0);
  const totalOtherFee = monthlyStats.reduce((sum, row) => sum + row.其他费用, 0);
  const totalPartnerFee = monthlyStats.reduce((sum, row) => sum + row.合伙人应得, 0);
  const netIncome = totalCourseAmount - totalTeacherFee - totalTransportFee - totalOtherFee;

  const summaryData = [
    { 统计项: '总订单数', 金额: totalOrders },
    { 统计项: '总课程金额', 金额: totalCourseAmount },
    { 统计项: '总老师费用', 金额: totalTeacherFee },
    { 统计项: '总车费', 金额: totalTransportFee },
    { 统计项: '总其他费用', 金额: totalOtherFee },
    { 统计项: '总合伙人费用', 金额: totalPartnerFee },
    { 统计项: '公司净收入', 金额: netIncome },
  ];
  const ws4 = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws4, '2025年度汇总');

  const outputPath = '/home/ubuntu/upload/2025年月度财务统计表.xlsx';
  XLSX.writeFile(wb, outputPath);

  console.log('\n' + '='.repeat(60));
  console.log('2025年财务统计摘要');
  console.log('='.repeat(60));
  console.log(`总订单数: ${totalOrders}`);
  console.log(`总课程金额: ¥${totalCourseAmount.toFixed(2)}`);
  console.log(`总老师费用: ¥${totalTeacherFee.toFixed(2)}`);
  console.log(`总车费: ¥${totalTransportFee.toFixed(2)}`);
  console.log(`总其他费用: ¥${totalOtherFee.toFixed(2)}`);
  console.log(`总合伙人费用: ¥${totalPartnerFee.toFixed(2)}`);
  console.log(`公司净收入: ¥${netIncome.toFixed(2)}`);
  console.log('='.repeat(60));
  console.log(`\n已保存到: ${outputPath}`);
}

generate2025MonthlyReport().catch(console.error);
