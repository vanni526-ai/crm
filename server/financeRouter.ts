import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { formatDateBeijing, formatDateTimeBeijing, BEIJING_TIMEZONE } from "../shared/timezone";
import ExcelJS from "exceljs";
import * as db from "./db";

// 权限检查中间件
const financeOrAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "finance") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要财务或管理员权限" });
  }
  return next({ ctx });
});

export const financeRouter = router({
  /**
   * 获取合伙人分红统计数据
   */
  getPartnerDividends: financeOrAdminProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        partnerId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const { startDate, endDate, partnerId } = input;
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
        
        // 获取所有合伙人
        const { partners: partnersTable, partnerCities: partnerCitiesTable, cities: citiesTable, orders: ordersTable } = await import("../drizzle/schema");
        const { eq, and, sql } = await import("drizzle-orm");
        
        const allPartners = await dbInstance.select().from(partnersTable);
        
        const result = [];
        
        for (const partner of allPartners) {
          // 如果指定了partnerId，只处理该合伙人
          if (partnerId && partner.id !== partnerId) continue;
          
          // 获取合伙人关联的城市和合同信息
          const partnerCities = await dbInstance
            .select({
              id: partnerCitiesTable.id,
              partnerId: partnerCitiesTable.partnerId,
              cityId: partnerCitiesTable.cityId,
              cityName: citiesTable.name,
              currentProfitStage: partnerCitiesTable.currentProfitStage,
              isInvestmentRecovered: partnerCitiesTable.isInvestmentRecovered,
              profitRatioStage1Partner: partnerCitiesTable.profitRatioStage1Partner,
              profitRatioStage2APartner: partnerCitiesTable.profitRatioStage2APartner,
              profitRatioStage2BPartner: partnerCitiesTable.profitRatioStage2BPartner,
              profitRatioStage3Partner: partnerCitiesTable.profitRatioStage3Partner,
            })
            .from(partnerCitiesTable)
            .leftJoin(citiesTable, eq(partnerCitiesTable.cityId, citiesTable.id))
            .where(eq(partnerCitiesTable.partnerId, partner.id));
          
          if (partnerCities.length === 0) continue;
          
          // 获取该合伙人所有城市的订单
          const cityNames = partnerCities.map(pc => pc.cityName).filter(Boolean) as string[];
          
          const conditions = [
            sql`${ordersTable.deliveryCity} IN (${sql.join(cityNames.map(name => sql`${name}`), sql`, `)})`
          ];
          
          if (startDate) {
            conditions.push(sql`${ordersTable.classDate} >= ${startDate}`);
          }
          if (endDate) {
            conditions.push(sql`${ordersTable.classDate} <= ${endDate}`);
          }
          
          const orders = cityNames.length > 0 
            ? await dbInstance
                .select()
                .from(ordersTable)
                .where(and(...conditions))
            : [];
          
          // 计算总收入和总成本
          let totalRevenue = 0;
          let totalCost = 0;
          
          orders.forEach(order => {
            totalRevenue += parseFloat(order.courseAmount || "0");
            totalCost += parseFloat(order.teacherFee || "0");
            totalCost += parseFloat(order.transportFee || "0");
            totalCost += parseFloat(order.consumablesFee || "0");
            totalCost += parseFloat(order.rentFee || "0");
            totalCost += parseFloat(order.propertyFee || "0");
            totalCost += parseFloat(order.utilityFee || "0");
            totalCost += parseFloat(order.otherFee || "0");
          });
          
          const profit = totalRevenue - totalCost;
          
          // 获取合伙人的分红比例（从第一个城市的合同信息中获取）
          const firstCity = partnerCities[0];
          let profitRatio = 0;
          let profitStage = "未设置";
          
          if (firstCity) {
            // 根据当前分红阶段获取分红比例
            const stage = firstCity.currentProfitStage || 1;
            profitStage = `第${stage}阶段`;
            
            if (stage === 1) {
              profitRatio = parseFloat(firstCity.profitRatioStage1Partner || "0");
            } else if (stage === 2) {
              // 判断是否已回本
              if (firstCity.isInvestmentRecovered) {
                profitRatio = parseFloat(firstCity.profitRatioStage2BPartner || "0");
                profitStage = "第2阶段B（已回本）";
              } else {
                profitRatio = parseFloat(firstCity.profitRatioStage2APartner || "0");
                profitStage = "第2阶段A（未回本）";
              }
            } else if (stage === 3) {
              profitRatio = parseFloat(firstCity.profitRatioStage3Partner || "0");
            }
          }
          
          const dividendAmount = profit * (profitRatio / 100);
          
          result.push({
            partnerId: partner.id,
            partnerName: partner.name,
            cities: partnerCities.map(pc => pc.cityName).join(", "),
            profitStage,
            profitRatio: profitRatio.toFixed(2),
            totalRevenue: totalRevenue.toFixed(2),
            totalCost: totalCost.toFixed(2),
            profit: profit.toFixed(2),
            dividendAmount: dividendAmount.toFixed(2),
            orderCount: orders.length,
          });
        }
        
        return result;
      } catch (error) {
        console.error("获取合伙人分红统计失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "获取合伙人分红统计失败",
        });
      }
    }),
  // 导出财务报表为Excel
  exportExcel: financeOrAdminProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // 获取所有订单数据
        const allOrders = await db.getAllOrders();

        // 根据日期范围过滤订单
        let filteredOrders = allOrders;
        if (input.startDate || input.endDate) {
          filteredOrders = allOrders.filter((order) => {
            const orderDate = new Date(order.createdAt);
            const start = input.startDate ? new Date(input.startDate) : null;
            const end = input.endDate ? new Date(input.endDate) : null;

            if (start && orderDate < start) return false;
            if (end && orderDate > end) return false;
            return true;
          });
        }

        // 按城市统计财务数据
        const cityStats = new Map<
          string,
          {
            orderCount: number;
            totalSales: number;
            teacherFee: number;
            transportFee: number;
            partnerFee: number;
            consumablesFee: number;
            rentFee: number;
            propertyFee: number;
            utilityFee: number;
            otherFee: number;
          }
        >();

        filteredOrders.forEach((order) => {
          const city = order.deliveryCity || order.paymentCity || "未知城市";
          const stats = cityStats.get(city) || {
            orderCount: 0,
            totalSales: 0,
            teacherFee: 0,
            transportFee: 0,
            partnerFee: 0,
            consumablesFee: 0,
            rentFee: 0,
            propertyFee: 0,
            utilityFee: 0,
            otherFee: 0,
          };

          stats.orderCount += 1;
          stats.totalSales += parseFloat(order.paymentAmount || "0");
          stats.teacherFee += parseFloat(order.teacherFee || "0");
          stats.transportFee += parseFloat(order.transportFee || "0");
          stats.partnerFee += parseFloat(order.partnerFee || "0");
          stats.consumablesFee += parseFloat(order.consumablesFee || "0");
          stats.rentFee += parseFloat(order.rentFee || "0");
          stats.propertyFee += parseFloat(order.propertyFee || "0");
          stats.utilityFee += parseFloat(order.utilityFee || "0");
          stats.otherFee += parseFloat(order.otherFee || "0");

          cityStats.set(city, stats);
        });

        // 创建Excel工作簿
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "课程交付CRM系统";
        workbook.created = new Date();

        // 创建"城市财务统计"工作表
        const citySheet = workbook.addWorksheet("城市财务统计");
        citySheet.columns = [
          { header: "城市", key: "city", width: 15 },
          { header: "订单数", key: "orderCount", width: 12 },
          { header: "销售额", key: "totalSales", width: 15 },
          { header: "老师费用", key: "teacherFee", width: 15 },
          { header: "车费", key: "transportFee", width: 12 },
          { header: "合伙人费", key: "partnerFee", width: 15 },
          { header: "耗材费用", key: "consumablesFee", width: 15 },
          { header: "房租费用", key: "rentFee", width: 15 },
          { header: "物业费用", key: "propertyFee", width: 15 },
          { header: "水电费用", key: "utilityFee", width: 15 },
          { header: "其他费用", key: "otherFee", width: 15 },
          { header: "总费用", key: "totalCost", width: 15 },
          { header: "净利润", key: "netProfit", width: 15 },
          { header: "利润率", key: "profitRate", width: 12 },
        ];

        // 填充城市统计数据
        cityStats.forEach((stats, city) => {
          const totalCost =
            stats.teacherFee + stats.transportFee + stats.partnerFee + 
            stats.consumablesFee + stats.rentFee + stats.propertyFee + 
            stats.utilityFee + stats.otherFee;
          const netProfit = stats.totalSales - totalCost;
          const profitRate =
            stats.totalSales > 0
              ? ((netProfit / stats.totalSales) * 100).toFixed(2) + "%"
              : "0%";

          citySheet.addRow({
            city,
            orderCount: stats.orderCount,
            totalSales: `￥${stats.totalSales.toFixed(2)}`,
            teacherFee: `￥${stats.teacherFee.toFixed(2)}`,
            transportFee: `￥${stats.transportFee.toFixed(2)}`,
            partnerFee: `￥${stats.partnerFee.toFixed(2)}`,
            consumablesFee: `￥${stats.consumablesFee.toFixed(2)}`,
            rentFee: `￥${stats.rentFee.toFixed(2)}`,
            propertyFee: `￥${stats.propertyFee.toFixed(2)}`,
            utilityFee: `￥${stats.utilityFee.toFixed(2)}`,
            otherFee: `￥${stats.otherFee.toFixed(2)}`,
            totalCost: `￥${totalCost.toFixed(2)}`,
            netProfit: `￥${netProfit.toFixed(2)}`,
            profitRate,
          });
        });

        // 设置表头样式
        citySheet.getRow(1).font = { bold: true };
        citySheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };

        // 创建"收支明细"工作表
        const detailSheet = workbook.addWorksheet("收支明细");
        detailSheet.columns = [
          { header: "日期", key: "date", width: 12 },
          { header: "订单号", key: "orderNo", width: 25 },
          { header: "支付渠道", key: "paymentChannel", width: 15 },
          { header: "描述", key: "description", width: 30 },
          { header: "金额", key: "amount", width: 15 },
          { header: "类型", key: "type", width: 10 },
        ];

        // 填充收支明细数据
        filteredOrders.forEach((order) => {
          // 收入记录
          detailSheet.addRow({
            date: formatDateBeijing(order.createdAt),
            orderNo: order.orderNo,
            paymentChannel: order.paymentChannel || "-",
            description: `订单收款 - ${order.customerName}`,
            amount: `¥${parseFloat(order.paymentAmount || "0").toFixed(2)}`,
            type: "收入",
          });

          // 老师费用支出记录
          if (order.teacherFee && parseFloat(order.teacherFee) > 0) {
            detailSheet.addRow({
              date: formatDateBeijing(order.createdAt),
              orderNo: order.orderNo,
              paymentChannel: "-",
              description: `老师费用 - ${order.deliveryTeacher || "未知"}`,
              amount: `¥${parseFloat(order.teacherFee).toFixed(2)}`,
              type: "支出",
            });
          }

          // 车费支出记录
          if (order.transportFee && parseFloat(order.transportFee) > 0) {
            detailSheet.addRow({
              date: formatDateBeijing(order.createdAt),
              orderNo: order.orderNo,
              paymentChannel: "-",
              description: `车费`,
              amount: `¥${parseFloat(order.transportFee).toFixed(2)}`,
              type: "支出",
            });
          }
        });

        // 设置表头样式
        detailSheet.getRow(1).font = { bold: true };
        detailSheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };

        // 生成Excel文件的Buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // 将Buffer转换为Base64字符串
        const base64 = Buffer.from(buffer).toString("base64");

        return {
          success: true,
          data: base64,
          filename: `财务报表_${formatDateBeijing(new Date())}.xlsx`,
        };
      } catch (error) {
        console.error("导出Excel失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "导出Excel失败",
        });
      }
    }),
});
