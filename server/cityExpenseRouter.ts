import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { cityMonthlyExpenses, cities, partnerCities, partners } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import ExcelJS from "exceljs";
import { aggregateOrderFeesByMonthAndCity, aggregateOrderSalesByMonthAndCity } from "./orderAggregation";

export const cityExpenseRouter = router({
  /**
   * 获取城市费用统计
   * 合伙人端接口：强制使用JWT中的userId，忽略前端传入的cityName
   */
  getStats: protectedProcedure
    .input(
      z.object({
        cityName: z.string().optional(), // 忽略此参数
        startMonth: z.string().optional(),
        endMonth: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      // 检查用户角色
      const userRoles = ctx.user.roles ? ctx.user.roles.split(',') : [];
      const isCityPartner = userRoles.includes('cityPartner');

      if (!isCityPartner) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only city partners can access this endpoint',
        });
      }

      // 强制使用JWT中的userId查询partner
      const userId = ctx.user.id;
      const partnerRecord = await db
        .select({ id: partners.id })
        .from(partners)
        .where(eq(partners.userId, userId))
        .limit(1);

      if (partnerRecord.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Partner not found for current user',
        });
      }

      const partnerId = partnerRecord[0].id;

      // 获取该合伙人管理的城市ID列表
      const partnerCitiesRecords = await db
        .select({
          cityId: partnerCities.cityId,
          cityName: cities.name,
        })
        .from(partnerCities)
        .leftJoin(cities, eq(partnerCities.cityId, cities.id))
        .where(and(
          eq(partnerCities.partnerId, partnerId),
          eq(partnerCities.contractStatus, 'active')
        ));

      const managedCityIds = partnerCitiesRecords.map(pc => pc.cityId);

      console.log('[cityExpense.getStats] Partner ID:', partnerId);
      console.log('[cityExpense.getStats] Managed Cities:', partnerCitiesRecords.map(c => c.cityName));

      // TODO: 实现真实的费用统计逻辑
      // 目前返回模拟数据
      return {
        cities: partnerCitiesRecords.map(c => c.cityName),
        totalExpense: '45000.00',
        monthlyAverage: '15000.00',
        breakdown: {
          rentFee: '20000.00',
          propertyFee: '5000.00',
          utilityFee: '3000.00',
          consumablesFee: '2000.00',
          cleaningFee: '1500.00',
          phoneFee: '500.00',
          expressFee: '1000.00',
          promotionFee: '12000.00',
        },
        monthlyStats: [
          {
            month: '2026-01',
            totalExpense: '15000.00',
          },
          {
            month: '2026-02',
            totalExpense: '15000.00',
          },
        ],
      };
    }),
  /**
   * 获取城市月度费用账单列表
   */
  list: protectedProcedure
    .input(z.object({
      cityId: z.number().optional(),
      month: z.string().optional(), // 格式: YYYY-MM
      startMonth: z.string().optional(),
      endMonth: z.string().optional(),
    }).default({}))
    .query(async ({ input = {}, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const conditions = [];
      
      // 权限过滤：城市合伙人只能查看自己管理的城市账单
      const userRoles = ctx.user.roles ? ctx.user.roles.split(',') : [];
      const isCityPartner = userRoles.includes('cityPartner');
      const isAdminOrFinance = userRoles.includes('admin') || userRoles.includes('finance');
      
      if (isCityPartner && !isAdminOrFinance) {
        // 获取该合伙人管理的城市列表
        const partnerRecord = await db
          .select({ id: partners.id })
          .from(partners)
          .where(eq(partners.userId, ctx.user.id))
          .limit(1);
        
        if (partnerRecord.length === 0) {
          // 如果没有找到合伙人记录，返回空数组
          return [];
        }
        
        const partnerId = partnerRecord[0].id;
        
        // 获取该合伙人管理的城市ID列表
        const partnerCitiesRecords = await db
          .select({ cityId: partnerCities.cityId })
          .from(partnerCities)
          .where(and(
            eq(partnerCities.partnerId, partnerId),
            eq(partnerCities.contractStatus, 'active')
          ));
        
        const managedCityIds = partnerCitiesRecords.map(pc => pc.cityId);
        
        if (managedCityIds.length === 0) {
          // 如果没有管理任何城市，返回空数组
          return [];
        }
        
        // 添加城市过滤条件
        if (managedCityIds.length > 0) {
          conditions.push(sql`${cityMonthlyExpenses.cityId} IN (${sql.raw(managedCityIds.join(','))})`);
        }
      }
      
      if (input?.cityId) {
        conditions.push(eq(cityMonthlyExpenses.cityId, input.cityId));
      }
      
      if (input?.month) {
        conditions.push(eq(cityMonthlyExpenses.month, input.month));
      }
      
      if (input?.startMonth) {
        conditions.push(sql`${cityMonthlyExpenses.month} >= ${input.startMonth}`);
      }
      
      if (input?.endMonth) {
        conditions.push(sql`${cityMonthlyExpenses.month} <= ${input.endMonth}`);
      }
      
      // 首先获取基础的费用账单数据(不包含合伙人信息,避免重复)
      const expenses = await db
        .select({
          id: cityMonthlyExpenses.id,
          cityId: cityMonthlyExpenses.cityId,
          cityName: cities.name,
          month: cityMonthlyExpenses.month,
          rentFee: cityMonthlyExpenses.rentFee,
          propertyFee: cityMonthlyExpenses.propertyFee,
          utilityFee: cityMonthlyExpenses.utilityFee,
          consumablesFee: cityMonthlyExpenses.consumablesFee,
          cleaningFee: cityMonthlyExpenses.cleaningFee,
          phoneFee: cityMonthlyExpenses.phoneFee,
          deferredPayment: cityMonthlyExpenses.deferredPayment,
          expressFee: cityMonthlyExpenses.expressFee,
          promotionFee: cityMonthlyExpenses.promotionFee,
          otherFee: cityMonthlyExpenses.otherFee,
          teacherFee: cityMonthlyExpenses.teacherFee,
          transportFee: cityMonthlyExpenses.transportFee,
          totalExpense: cityMonthlyExpenses.totalExpense,
          partnerShare: cityMonthlyExpenses.partnerShare,
          notes: cityMonthlyExpenses.notes,
          createdAt: cityMonthlyExpenses.createdAt,
          updatedAt: cityMonthlyExpenses.updatedAt,
        })
        .from(cityMonthlyExpenses)
        .leftJoin(cities, eq(cityMonthlyExpenses.cityId, cities.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(cityMonthlyExpenses.month), desc(cityMonthlyExpenses.cityId));
      
      // 为每个账单获取合伙人费用分摊比例(取第一个合伙人的比例)
      const expensesWithPartnerInfo = await Promise.all(
        expenses.map(async (expense) => {
          // 注意:这里不过滤partners.isActive,因为当合伙人角色被取消时,
          // partners.isActive会设为false,但partner_cities记录还在,我们仍然需要显示费用分摊比例
          const partnerInfo = await db
            .select({
              costShareRatio: sql<string>`
                CASE 
                  WHEN ${partnerCities.currentProfitStage} = 1 THEN ${partnerCities.profitRatioStage1Partner}
                  WHEN ${partnerCities.currentProfitStage} = 2 AND ${partnerCities.isInvestmentRecovered} = 0 THEN ${partnerCities.profitRatioStage2APartner}
                  WHEN ${partnerCities.currentProfitStage} = 2 AND ${partnerCities.isInvestmentRecovered} = 1 THEN ${partnerCities.profitRatioStage2BPartner}
                  WHEN ${partnerCities.currentProfitStage} = 3 THEN ${partnerCities.profitRatioStage3Partner}
                  ELSE NULL
                END
              `.as('costShareRatio'),
            })
            .from(partnerCities)
            .leftJoin(partners, eq(partnerCities.partnerId, partners.id))
            .where(and(
              eq(partnerCities.cityId, expense.cityId),
              eq(partnerCities.contractStatus, 'active')
            ))
            .orderBy(desc(partnerCities.createdAt))
            .limit(1);
          
          return {
            ...expense,
            costShareRatio: partnerInfo[0]?.costShareRatio || null,
          };
        })
      );
      
      // 为每个账单添加销售额和订单数
      const result = await Promise.all(
        expensesWithPartnerInfo.map(async (expense) => {
          // 如果城市名称为null,返回默认值
          if (!expense.cityName) {
            return {
              ...expense,
              salesAmount: "0.00",
              orderCount: 0,
            };
          }
          
          const { salesAmount, orderCount } = await aggregateOrderSalesByMonthAndCity(
            expense.month,
            expense.cityName
          );
          
          // 计算合伙人分红 = (销售额 × 当前分红阶段的合伙人分红百分比) - 合伙人承担 - 合同后付款
          const partnerDividend = expense.costShareRatio 
            ? (parseFloat(salesAmount) * parseFloat(expense.costShareRatio) / 100 - parseFloat(expense.partnerShare || "0") - parseFloat(expense.deferredPayment || "0")).toFixed(2)
            : "0.00";
          
          return {
            ...expense,
            salesAmount,
            orderCount,
            partnerDividend,
          };
        })
      );
      
      return result;
    }),

  /**
   * 获取单个费用账单详情
   */
  getById: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const result = await db
        .select()
        .from(cityMonthlyExpenses)
        .where(eq(cityMonthlyExpenses.id, input.id))
        .limit(1);
      
      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "费用账单不存在",
        });
      }
      
      return result[0];
    }),

  /**
   * 获取指定城市和月份的费用账单
   */
  getByCityAndMonth: protectedProcedure
    .input(z.object({
      cityId: z.number(),
      month: z.string(), // 格式: YYYY-MM
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const result = await db
        .select()
        .from(cityMonthlyExpenses)
        .where(and(
          eq(cityMonthlyExpenses.cityId, input.cityId),
          eq(cityMonthlyExpenses.month, input.month)
        ))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    }),

  /**
   * 创建或更新费用账单
   */
  upsert: protectedProcedure
    .input(z.object({
      cityId: z.number(),
      cityName: z.string(),
      month: z.string(), // 格式: YYYY-MM
      rentFee: z.string().optional(),
      propertyFee: z.string().optional(),
      utilityFee: z.string().optional(),
      consumablesFee: z.string().optional(),
      cleaningFee: z.string().optional(),
      phoneFee: z.string().optional(),
      deferredPayment: z.string().optional(),
      expressFee: z.string().optional(),
      promotionFee: z.string().optional(),
      otherFee: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      // 自动计算老师费用和车费（从订单数据汇总）
      const { teacherFee, transportFee } = await aggregateOrderFeesByMonthAndCity(
        input.month,
        input.cityName
      );
      
      // 计算总费用 = 房租 + 物业费 + 水电费 + 道具耗材 + 保洁费 + 话费 + 快递费 + 推广费 + 其他费用 + 老师费用 + 车费
      // 注意:合同后付款不计入总费用
      const totalExpense = (
        parseFloat(input.rentFee || "0") +
        parseFloat(input.propertyFee || "0") +
        parseFloat(input.utilityFee || "0") +
        parseFloat(input.consumablesFee || "0") +
        parseFloat(input.cleaningFee || "0") +
        parseFloat(input.phoneFee || "0") +
        parseFloat(input.expressFee || "0") +
        parseFloat(input.promotionFee || "0") +
        parseFloat(input.otherFee || "0") +
        parseFloat(teacherFee) +
        parseFloat(transportFee)
      ).toFixed(2);
      
      // 获取该城市的费用分摄比例和费用承担配置
      const partnerCityInfo = await db
        .select({
          costShareRatio: sql<string>`
            CASE 
              WHEN ${partnerCities.currentProfitStage} = 1 THEN ${partnerCities.profitRatioStage1Partner}
              WHEN ${partnerCities.currentProfitStage} = 2 AND ${partnerCities.isInvestmentRecovered} = 0 THEN ${partnerCities.profitRatioStage2APartner}
              WHEN ${partnerCities.currentProfitStage} = 2 AND ${partnerCities.isInvestmentRecovered} = 1 THEN ${partnerCities.profitRatioStage2BPartner}
              WHEN ${partnerCities.currentProfitStage} = 3 THEN ${partnerCities.profitRatioStage3Partner}
              ELSE NULL
            END
          `.as('costShareRatio'),
          expenseCoverage: partnerCities.expenseCoverage,
        })
        .from(partnerCities)
        .where(and(
          eq(partnerCities.cityId, input.cityId),
          eq(partnerCities.contractStatus, 'active')
        ))
        .limit(1);
      
      // 计算合伙人承担 = 勾选费用总和 × 费用分摄比例 / 100
      const costShareRatio = partnerCityInfo[0]?.costShareRatio ? parseFloat(partnerCityInfo[0].costShareRatio) : 0;
      const expenseCoverage = partnerCityInfo[0]?.expenseCoverage || {};
      
      // 只计算被勾选的费用项目
      let coveredExpenseTotal = 0;
      if (expenseCoverage.rentFee) coveredExpenseTotal += parseFloat(input.rentFee || "0");
      if (expenseCoverage.propertyFee) coveredExpenseTotal += parseFloat(input.propertyFee || "0");
      if (expenseCoverage.utilityFee) coveredExpenseTotal += parseFloat(input.utilityFee || "0");
      if (expenseCoverage.consumablesFee) coveredExpenseTotal += parseFloat(input.consumablesFee || "0");
      if (expenseCoverage.cleaningFee) coveredExpenseTotal += parseFloat(input.cleaningFee || "0");
      if (expenseCoverage.phoneFee) coveredExpenseTotal += parseFloat(input.phoneFee || "0");
      if (expenseCoverage.courierFee) coveredExpenseTotal += parseFloat(input.expressFee || "0");
      if (expenseCoverage.promotionFee) coveredExpenseTotal += parseFloat(input.promotionFee || "0");
      if (expenseCoverage.otherFee) coveredExpenseTotal += parseFloat(input.otherFee || "0");
      if (expenseCoverage.teacherFee) coveredExpenseTotal += parseFloat(teacherFee);
      if (expenseCoverage.transportFee) coveredExpenseTotal += parseFloat(transportFee);
      
      const partnerShare = (coveredExpenseTotal * costShareRatio / 100).toFixed(2);
      
      // 检查是否已存在该城市该月份的记录
      const existing = await db
        .select()
        .from(cityMonthlyExpenses)
        .where(and(
          eq(cityMonthlyExpenses.cityId, input.cityId),
          eq(cityMonthlyExpenses.month, input.month)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        // 更新现有记录
        await db
          .update(cityMonthlyExpenses)
          .set({
            rentFee: input.rentFee || "0.00",
            propertyFee: input.propertyFee || "0.00",
            utilityFee: input.utilityFee || "0.00",
            consumablesFee: input.consumablesFee || "0.00",
            cleaningFee: input.cleaningFee || "0.00",
            phoneFee: input.phoneFee || "0.00",
            deferredPayment: input.deferredPayment || "0.00",
            expressFee: input.expressFee || "0.00",
            promotionFee: input.promotionFee || "0.00",
            otherFee: input.otherFee || "0.00",
            teacherFee,
            transportFee,
            totalExpense,
            partnerShare,
            notes: input.notes,
            uploadedBy: ctx.user.id,
          })
          .where(eq(cityMonthlyExpenses.id, existing[0].id));
        
        return { id: existing[0].id, isNew: false };
      } else {
        // 创建新记录
        const result = await db.insert(cityMonthlyExpenses).values({
          cityId: input.cityId,
          cityName: input.cityName,
          month: input.month,
          rentFee: input.rentFee || "0.00",
          propertyFee: input.propertyFee || "0.00",
          utilityFee: input.utilityFee || "0.00",
          consumablesFee: input.consumablesFee || "0.00",
          cleaningFee: input.cleaningFee || "0.00",
          phoneFee: input.phoneFee || "0.00",
          deferredPayment: input.deferredPayment || "0.00",
          expressFee: input.expressFee || "0.00",
          promotionFee: input.promotionFee || "0.00",
          otherFee: input.otherFee || "0.00",
          teacherFee,
          transportFee,
          totalExpense,
          partnerShare,
          notes: input.notes,
          uploadedBy: ctx.user.id,
        });
        
        return { id: Number(result[0].insertId), isNew: true };
      }
    }),

  /**
   * 删除费用账单
   */
  delete: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      await db
        .delete(cityMonthlyExpenses)
        .where(eq(cityMonthlyExpenses.id, input.id));
      
      return { success: true };
    }),

  /**
   * 获取所有城市列表（用于下拉选择）
   */
  getCities: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const result = await db
        .select({
          id: cities.id,
          name: cities.name,
        })
        .from(cities)
        .where(eq(cities.isActive, true))
        .orderBy(cities.sortOrder, cities.name);
      
      return result;
    }),

  /**
   * 下载Excel导入模板
   */
  downloadTemplate: protectedProcedure
    .mutation(async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("城市费用账单");
      
      // 设置表头
      worksheet.columns = [
        { header: "城市名称", key: "cityName", width: 15 },
        { header: "月份(YYYY-MM)", key: "month", width: 15 },
        { header: "房租", key: "rentFee", width: 12 },
        { header: "物业费", key: "propertyFee", width: 12 },
        { header: "水电费", key: "utilityFee", width: 12 },
        { header: "道具耗材", key: "consumablesFee", width: 12 },
        { header: "保洁费", key: "cleaningFee", width: 12 },
        { header: "话费", key: "phoneFee", width: 12 },
        { header: "合同后付款", key: "deferredPayment", width: 12 },
        { header: "快递费", key: "expressFee", width: 12 },
        { header: "推广费", key: "promotionFee", width: 12 },
        { header: "其他费用", key: "otherFee", width: 12 },
        { header: "备注", key: "notes", width: 30 },
      ];
      
      // 添加示例数据
      worksheet.addRow({
        cityName: "北京",
        month: "2025-01",
        rentFee: 10000,
        propertyFee: 2000,
        utilityFee: 1500,
        consumablesFee: 3000,
        cleaningFee: 800,
        phoneFee: 200,
        deferredPayment: 5000,
        expressFee: 300,
        promotionFee: 2000,
        otherFee: 500,
        notes: "示例数据",
      });
      
      // 设置表头样式
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };
      
      const buffer = await workbook.xlsx.writeBuffer();
      return {
        data: Buffer.from(buffer).toString("base64"),
        filename: "城市费用账单导入模板.xlsx",
      };
    }),

  /**
   * 批量导入Excel数据
   */
  batchImport: protectedProcedure
    .input(z.object({
      fileData: z.string(), // base64编码的文件数据
    }))
    .mutation(async ({ input, ctx }) => {
      /**
       * 安全读取单元格数值：
       * - 普通数字直接返回
       * - 公式单元格（{formula, result}）取 result
       * - 字符串尝试 parseFloat
       * - 其余返回 0
       * 支持负数（退款场景）
       */
      function getCellNumber(cell: ExcelJS.Cell): number {
        const v = cell.value;
        if (v === null || v === undefined) return 0;
        if (typeof v === 'number') return v;
        if (typeof v === 'object' && 'result' in (v as any)) {
          const r = (v as any).result;
          return typeof r === 'number' ? r : parseFloat(String(r)) || 0;
        }
        const n = parseFloat(String(v).replace(/,/g, ''));
        return isNaN(n) ? 0 : n;
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      // 解析Excel文件
      const workbook = new ExcelJS.Workbook();
      const buffer = Buffer.from(input.fileData, "base64");
      await workbook.xlsx.load(buffer as any);
      
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Excel文件格式错误" });
      }
      
      // 获取所有城市映射
      const allCities = await db
        .select({
          id: cities.id,
          name: cities.name,
        })
        .from(cities)
        .where(eq(cities.isActive, true));
      
      const cityMap = new Map(allCities.map(c => [c.name, c.id]));
      
      const successRecords: any[] = [];
      const failedRecords: any[] = [];
      
      // 从第2行开始读取数据（第1行是表头）
      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        
        // 跳过空行
        if (!row.getCell(1).value) continue;
        
        const cityName = row.getCell(1).value?.toString().trim();
        const month = row.getCell(2).value?.toString().trim();
        
        if (!cityName || !month) {
          failedRecords.push({ row: i, reason: "城市名称或月份为空" });
          continue;
        }
        
        const cityId = cityMap.get(cityName);
        if (!cityId) {
          failedRecords.push({ row: i, reason: `城市"${cityName}"不存在` });
          continue;
        }
        
        try {
          const rentFee = getCellNumber(row.getCell(3)).toFixed(2);
          const propertyFee = getCellNumber(row.getCell(4)).toFixed(2);
          const utilityFee = getCellNumber(row.getCell(5)).toFixed(2);
          const consumablesFee = getCellNumber(row.getCell(6)).toFixed(2);
          const cleaningFee = getCellNumber(row.getCell(7)).toFixed(2);
          const phoneFee = getCellNumber(row.getCell(8)).toFixed(2);
          const deferredPayment = getCellNumber(row.getCell(9)).toFixed(2);
          const expressFee = getCellNumber(row.getCell(10)).toFixed(2);
          const promotionFee = getCellNumber(row.getCell(11)).toFixed(2);
          const otherFee = getCellNumber(row.getCell(12)).toFixed(2);
          const notes = row.getCell(13).value?.toString() || "";
          
          // 自动计算老师费用和车费（从订单数据汇总）
          const { teacherFee, transportFee } = await aggregateOrderFeesByMonthAndCity(
            month,
            cityName
          );
          
          // 计算总费用 = 房租 + 物业费 + 水电费 + 道具耗材 + 保洁费 + 话费 + 快递费 + 推广费 + 其他费用 + 老师费用 + 车费
          // 注意:合同后付款不计入总费用
          const totalExpense = (
            parseFloat(rentFee) +
            parseFloat(propertyFee) +
            parseFloat(utilityFee) +
            parseFloat(consumablesFee) +
            parseFloat(cleaningFee) +
            parseFloat(phoneFee) +
            parseFloat(expressFee) +
            parseFloat(promotionFee) +
            parseFloat(otherFee) +
            parseFloat(teacherFee) +
            parseFloat(transportFee)
          ).toFixed(2);
          
          // 检查是否已存在该城市该月份的记录
          const existing = await db
            .select()
            .from(cityMonthlyExpenses)
            .where(and(
              eq(cityMonthlyExpenses.cityId, cityId),
              eq(cityMonthlyExpenses.month, month)
            ))
            .limit(1);
          
          if (existing.length > 0) {
            // 更新现有记录
            await db
              .update(cityMonthlyExpenses)
              .set({
                rentFee,
                propertyFee,
                utilityFee,
                consumablesFee,
                cleaningFee,
                phoneFee,
                deferredPayment,
                expressFee,
                promotionFee,
                otherFee,
                teacherFee,
                transportFee,
                totalExpense,
                notes,
                uploadedBy: ctx.user.id,
              })
              .where(eq(cityMonthlyExpenses.id, existing[0].id));
          } else {
            // 创建新记录
            await db.insert(cityMonthlyExpenses).values({
              cityId,
              cityName,
              month,
              rentFee,
              propertyFee,
              utilityFee,
              consumablesFee,
              cleaningFee,
              phoneFee,
              deferredPayment,
              expressFee,
              promotionFee,
              otherFee,
              teacherFee,
              transportFee,
              totalExpense,
              notes,
              uploadedBy: ctx.user.id,
            });
          }
          
          successRecords.push({ row: i, cityName, month });
        } catch (error) {
          failedRecords.push({ row: i, reason: `数据处理错误: ${error}` });
        }
      }
      
      return {
        success: successRecords.length,
        failed: failedRecords.length,
        failedRecords,
      };
    }),

  /**
   * 导出Excel数据
   */
  exportData: protectedProcedure
    .input(z.object({
      cityId: z.number().optional(),
      month: z.string().optional(),
      startMonth: z.string().optional(),
      endMonth: z.string().optional(),
    }).optional())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      const conditions = [];
      
      if (input?.cityId) {
        conditions.push(eq(cityMonthlyExpenses.cityId, input.cityId));
      }
      
      if (input?.month) {
        conditions.push(eq(cityMonthlyExpenses.month, input.month));
      }
      
      if (input?.startMonth) {
        conditions.push(sql`${cityMonthlyExpenses.month} >= ${input.startMonth}`);
      }
      
      if (input?.endMonth) {
        conditions.push(sql`${cityMonthlyExpenses.month} <= ${input.endMonth}`);
      }
      
      const result = await db
        .select()
        .from(cityMonthlyExpenses)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(cityMonthlyExpenses.month), desc(cityMonthlyExpenses.cityId));
      
      // 创建Excel工作簿
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("城市费用账单");
      
      // 设置表头
      worksheet.columns = [
        { header: "城市名称", key: "cityName", width: 15 },
        { header: "月份", key: "month", width: 15 },
        { header: "房租", key: "rentFee", width: 12 },
        { header: "物业费", key: "propertyFee", width: 12 },
        { header: "水电费", key: "utilityFee", width: 12 },
        { header: "道具耗材", key: "consumablesFee", width: 12 },
        { header: "保洁费", key: "cleaningFee", width: 12 },
        { header: "话费", key: "phoneFee", width: 12 },
        { header: "合同后付款", key: "deferredPayment", width: 12 },
        { header: "快递费", key: "expressFee", width: 12 },
        { header: "推广费", key: "promotionFee", width: 12 },
        { header: "其他费用", key: "otherFee", width: 12 },
        { header: "总费用", key: "totalExpense", width: 12 },
        { header: "备注", key: "notes", width: 30 },
      ];
      
      // 添加数据
      result.forEach(record => {
        worksheet.addRow({
          cityName: record.cityName,
          month: record.month,
          rentFee: parseFloat(record.rentFee || "0"),
          propertyFee: parseFloat(record.propertyFee || "0"),
          utilityFee: parseFloat(record.utilityFee || "0"),
          consumablesFee: parseFloat(record.consumablesFee || "0"),
          cleaningFee: parseFloat(record.cleaningFee || "0"),
          phoneFee: parseFloat(record.phoneFee || "0"),
          deferredPayment: parseFloat(record.deferredPayment || "0"),
          expressFee: parseFloat(record.expressFee || "0"),
          promotionFee: parseFloat(record.promotionFee || "0"),
          otherFee: parseFloat(record.otherFee || "0"),
          totalExpense: parseFloat(record.totalExpense || "0"),
          notes: record.notes || "",
        });
      });
      
      // 设置表头样式
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };
      
      const buffer = await workbook.xlsx.writeBuffer();
      return {
        data: Buffer.from(buffer).toString("base64"),
        filename: `城市账单_${new Date().toISOString().split('T')[0]}.xlsx`,
      };
    }),

  /**
   * 重新计算合伙人承担费用
   * 用于在费用覆盖配置变更后,自动更新已存在的账单记录
   */
  recalculatePartnerShare: protectedProcedure
    .input(z.object({
      cityId: z.number(),
      month: z.string(), // 格式: YYYY-MM
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      try {
        // 1. 查询该城市该月份的账单是否存在
        const existing = await db
          .select()
          .from(cityMonthlyExpenses)
          .where(and(
            eq(cityMonthlyExpenses.cityId, input.cityId),
            eq(cityMonthlyExpenses.month, input.month)
          ))
          .limit(1);
        
        if (existing.length === 0) {
          // 账单不存在,无需重新计算
          return { success: true, message: "账单不存在,无需重新计算" };
        }
        
        const record = existing[0];
        
        // 2. 获取该城市的费用分摊比例和费用承担配置
        const partnerCityInfo = await db
          .select({
            costShareRatio: sql<string>`
              CASE 
                WHEN ${partnerCities.currentProfitStage} = 1 THEN ${partnerCities.profitRatioStage1Partner}
                WHEN ${partnerCities.currentProfitStage} = 2 AND ${partnerCities.isInvestmentRecovered} = 0 THEN ${partnerCities.profitRatioStage2APartner}
                WHEN ${partnerCities.currentProfitStage} = 2 AND ${partnerCities.isInvestmentRecovered} = 1 THEN ${partnerCities.profitRatioStage2BPartner}
                WHEN ${partnerCities.currentProfitStage} = 3 THEN ${partnerCities.profitRatioStage3Partner}
                ELSE NULL
              END
            `.as('costShareRatio'),
            expenseCoverage: partnerCities.expenseCoverage,
          })
          .from(partnerCities)
          .where(and(
            eq(partnerCities.cityId, input.cityId),
            eq(partnerCities.contractStatus, 'active')
          ))
          .limit(1);
        
        if (partnerCityInfo.length === 0) {
          // 没有找到合伙人配置,合伙人承担为0
          await db
            .update(cityMonthlyExpenses)
            .set({
              partnerShare: "0.00",
            })
            .where(eq(cityMonthlyExpenses.id, record.id));
          
          return { success: true, message: "未找到合伙人配置,合伙人承担设为0" };
        }
        
        // 3. 计算合伙人承担 = 勾选费用总和 × 费用分摊比例 / 100
        const costShareRatio = partnerCityInfo[0]?.costShareRatio ? parseFloat(partnerCityInfo[0].costShareRatio) : 0;
        const expenseCoverage = partnerCityInfo[0]?.expenseCoverage || {};
        
        // 只计算被勾选的费用项目
        let coveredExpenseTotal = 0;
        if (expenseCoverage.rentFee) coveredExpenseTotal += parseFloat(record.rentFee || "0");
        if (expenseCoverage.propertyFee) coveredExpenseTotal += parseFloat(record.propertyFee || "0");
        if (expenseCoverage.utilityFee) coveredExpenseTotal += parseFloat(record.utilityFee || "0");
        if (expenseCoverage.consumablesFee) coveredExpenseTotal += parseFloat(record.consumablesFee || "0");
        if (expenseCoverage.cleaningFee) coveredExpenseTotal += parseFloat(record.cleaningFee || "0");
        if (expenseCoverage.phoneFee) coveredExpenseTotal += parseFloat(record.phoneFee || "0");
        if (expenseCoverage.courierFee) coveredExpenseTotal += parseFloat(record.expressFee || "0");
        if (expenseCoverage.promotionFee) coveredExpenseTotal += parseFloat(record.promotionFee || "0");
        if (expenseCoverage.otherFee) coveredExpenseTotal += parseFloat(record.otherFee || "0");
        if (expenseCoverage.teacherFee) coveredExpenseTotal += parseFloat(record.teacherFee || "0");
        if (expenseCoverage.transportFee) coveredExpenseTotal += parseFloat(record.transportFee || "0");
        
        const partnerShare = (coveredExpenseTotal * costShareRatio / 100).toFixed(2);
        
        // 4. 更新账单记录
        await db
          .update(cityMonthlyExpenses)
          .set({
            partnerShare,
          })
          .where(eq(cityMonthlyExpenses.id, record.id));
        
        return { 
          success: true, 
          message: `重新计算成功,合伙人承担费用: ￥${partnerShare}`,
          partnerShare,
        };
      } catch (error: any) {
        console.error("重新计算合伙人承担费用失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `重新计算失败: ${error.message}`,
        });
      }
    }),

  /**
   * 批量重新计算合伙人承担费用
   * 根据筛选条件批量更新账单的合伙人承担费用
   */
  batchRecalculate: protectedProcedure
    .input(z.object({
      cityId: z.number().optional(), // 可选:指定城市ID,不指定则刷新所有城市
      month: z.string().optional(),  // 可选:指定月份,不指定则刷新所有月份
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      
      try {
        // 1. 构建查询条件
        const conditions = [];
        if (input.cityId) {
          conditions.push(eq(cityMonthlyExpenses.cityId, input.cityId));
        }
        if (input.month) {
          conditions.push(eq(cityMonthlyExpenses.month, input.month));
        }
        
        // 2. 查询所有符合条件的账单
        const expenses = await db
          .select()
          .from(cityMonthlyExpenses)
          .where(conditions.length > 0 ? and(...conditions) : undefined);
        
        if (expenses.length === 0) {
          return { 
            success: true, 
            message: "没有找到符合条件的账单",
            total: 0,
            updated: 0,
          };
        }
        
        // 3. 逐个重新计算
        let updatedCount = 0;
        const errors: string[] = [];
        
        for (const expense of expenses) {
          try {
            // 查询该城市的合伙人配置
            const partnerCityInfo = await db
              .select()
              .from(partnerCities)
              .where(and(
                eq(partnerCities.cityId, expense.cityId),
                eq(partnerCities.contractStatus, 'active')
              ))
              .limit(1);
            
            if (partnerCityInfo.length === 0) {
              // 没有找到合伙人配置,设为0
              await db
                .update(cityMonthlyExpenses)
                .set({ partnerShare: "0.00" })
                .where(eq(cityMonthlyExpenses.id, expense.id));
              updatedCount++;
              continue;
            }
            
            // 计算合伙人承担费用
            const expenseCoverage = partnerCityInfo[0]?.expenseCoverage || {};
            const currentStage = partnerCityInfo[0]?.currentProfitStage || 1;
            
            // 根据当前分红阶段和是否回本,确定费用分摊比例
            // 费用分摊比例 = 合伙人分红比例(因为费用按分红比例分摊)
            let costShareRatio = 0;
            if (currentStage === 1) {
              costShareRatio = parseFloat(partnerCityInfo[0]?.profitRatioStage1Partner || "0");
            } else if (currentStage === 2) {
              const isRecovered = partnerCityInfo[0]?.isInvestmentRecovered || false;
              costShareRatio = isRecovered 
                ? parseFloat(partnerCityInfo[0]?.profitRatioStage2BPartner || "0")
                : parseFloat(partnerCityInfo[0]?.profitRatioStage2APartner || "0");
            } else if (currentStage === 3) {
              costShareRatio = parseFloat(partnerCityInfo[0]?.profitRatioStage3Partner || "0");
            }
            
            let coveredExpenseTotal = 0;
            if (expenseCoverage.rentFee) coveredExpenseTotal += parseFloat(expense.rentFee || "0");
            if (expenseCoverage.propertyFee) coveredExpenseTotal += parseFloat(expense.propertyFee || "0");
            if (expenseCoverage.utilityFee) coveredExpenseTotal += parseFloat(expense.utilityFee || "0");
            if (expenseCoverage.cleaningFee) coveredExpenseTotal += parseFloat(expense.cleaningFee || "0");
            if (expenseCoverage.phoneFee) coveredExpenseTotal += parseFloat(expense.phoneFee || "0");
            if (expenseCoverage.consumablesFee) coveredExpenseTotal += parseFloat(expense.consumablesFee || "0");
            if (expenseCoverage.promotionFee) coveredExpenseTotal += parseFloat(expense.promotionFee || "0");
            if (expenseCoverage.otherFee) coveredExpenseTotal += parseFloat(expense.otherFee || "0");
            if (expenseCoverage.teacherFee) coveredExpenseTotal += parseFloat(expense.teacherFee || "0");
            if (expenseCoverage.transportFee) coveredExpenseTotal += parseFloat(expense.transportFee || "0");
            
            const partnerShare = (coveredExpenseTotal * costShareRatio / 100).toFixed(2);
            
            // 更新账单
            await db
              .update(cityMonthlyExpenses)
              .set({ partnerShare })
              .where(eq(cityMonthlyExpenses.id, expense.id));
            
            updatedCount++;
          } catch (error: any) {
            errors.push(`${expense.cityName} ${expense.month}: ${error.message}`);
          }
        }
        
        return { 
          success: true, 
          message: `批量刷新完成,共处理 ${expenses.length} 条账单,成功更新 ${updatedCount} 条${errors.length > 0 ? `,失败 ${errors.length} 条` : ''}`,
          total: expenses.length,
          updated: updatedCount,
          errors: errors.length > 0 ? errors : undefined,
        };
      } catch (error: any) {
        console.error("批量重新计算失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `批量刷新失败: ${error.message}`,
        });
      }
    }),

  /**
   * 获取所有已有数据的月份列表（用于筛选下拉）
   */
  getMonths: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      const result = await db
        .selectDistinct({ month: cityMonthlyExpenses.month })
        .from(cityMonthlyExpenses)
        .orderBy(cityMonthlyExpenses.month);
      return result.map(r => r.month).reverse();
    }),
});
