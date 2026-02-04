/**
 * 专业Excel报表生成模块
 * 基于excel-generator Skill的最佳实践
 * 
 * 功能特点:
 * 1. 专业的视觉设计 - 主题色系、字体层次、边框样式
 * 2. 多维度报表 - 概览页、城市统计、销售业绩、老师结算
 * 3. 数据可视化 - 条件格式、数据条
 * 4. 智能分析 - 关键洞察、趋势分析
 */

import ExcelJS from "exceljs";
import * as db from "./db";

// ==================== 主题配置 ====================
const THEMES = {
  elegant_black: {
    primary: "2D2D2D",
    light: "E5E5E5",
    accent: "2D2D2D",
    positive: "2E7D32",
    negative: "C62828",
    warning: "F57C00",
  },
  corporate_blue: {
    primary: "1F4E79",
    light: "D6E3F0",
    accent: "1F4E79",
    positive: "2E7D32",
    negative: "C62828",
    warning: "F57C00",
  },
};

// 默认使用优雅黑主题
const THEME = THEMES.corporate_blue;

// 字体配置
const SERIF_FONT = "Microsoft YaHei"; // 中文首选微软雅黑
const SANS_FONT = "Microsoft YaHei";

// 边框样式
const BORDER_COLOR = "D1D1D1";
const OUTER_BORDER: Partial<ExcelJS.Border> = { style: "thin", color: { argb: `FF${BORDER_COLOR}` } };
const HEADER_BOTTOM: Partial<ExcelJS.Border> = { style: "medium", color: { argb: `FF${THEME.primary}` } };
const INNER_HORIZONTAL: Partial<ExcelJS.Border> = { style: "thin", color: { argb: `FF${BORDER_COLOR}` } };

// ==================== 样式辅助函数 ====================

/**
 * 应用文档标题样式
 */
function applyTitleStyle(cell: ExcelJS.Cell) {
  cell.font = {
    name: SERIF_FONT,
    size: 18,
    bold: true,
    color: { argb: `FF${THEME.primary}` },
  };
  cell.alignment = { horizontal: "left", vertical: "middle" };
}

/**
 * 应用章节标题样式
 */
function applySectionHeaderStyle(cell: ExcelJS.Cell) {
  cell.font = {
    name: SERIF_FONT,
    size: 14,
    bold: true,
    color: { argb: `FF${THEME.primary}` },
  };
  cell.alignment = { horizontal: "left", vertical: "middle" };
}

/**
 * 应用表头样式
 */
function applyTableHeaderStyle(row: ExcelJS.Row, startCol: number, endCol: number) {
  for (let col = startCol; col <= endCol; col++) {
    const cell = row.getCell(col);
    cell.font = {
      name: SERIF_FONT,
      size: 10,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${THEME.primary}` },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: OUTER_BORDER,
      bottom: HEADER_BOTTOM,
      left: col === startCol ? OUTER_BORDER : undefined,
      right: col === endCol ? OUTER_BORDER : undefined,
    };
  }
}

/**
 * 应用数据行样式
 */
function applyDataRowStyle(
  row: ExcelJS.Row,
  startCol: number,
  endCol: number,
  isLastRow: boolean,
  rowIndex: number
) {
  for (let col = startCol; col <= endCol; col++) {
    const cell = row.getCell(col);
    cell.font = {
      name: SANS_FONT,
      size: 11,
    };
    
    // 交替行背景色
    if (rowIndex % 2 === 0) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF9F9F9" },
      };
    }
    
    cell.border = {
      top: INNER_HORIZONTAL,
      bottom: isLastRow ? OUTER_BORDER : INNER_HORIZONTAL,
      left: col === startCol ? OUTER_BORDER : undefined,
      right: col === endCol ? OUTER_BORDER : undefined,
    };
  }
}

/**
 * 应用金额格式(正负值颜色)
 */
function applyAmountStyle(cell: ExcelJS.Cell, value: number) {
  cell.numFmt = "¥#,##0.00";
  if (value < 0) {
    cell.font = { ...cell.font, color: { argb: `FF${THEME.negative}` } };
  } else if (value > 0) {
    cell.font = { ...cell.font, color: { argb: `FF${THEME.positive}` } };
  }
}

/**
 * 应用百分比格式
 */
function applyPercentStyle(cell: ExcelJS.Cell, value: number) {
  cell.numFmt = "0.0%";
  if (value < 0) {
    cell.font = { ...cell.font, color: { argb: `FF${THEME.negative}` } };
  } else if (value > 0.2) {
    cell.font = { ...cell.font, color: { argb: `FF${THEME.positive}` } };
  }
}

/**
 * 应用备注样式
 */
function applyNotesStyle(cell: ExcelJS.Cell) {
  cell.font = {
    name: SANS_FONT,
    size: 10,
    italic: true,
    color: { argb: "FF666666" },
  };
  cell.alignment = { horizontal: "left", vertical: "middle" };
}

// ==================== 报表生成函数 ====================

export interface ReportOptions {
  startDate?: string;
  endDate?: string;
  theme?: keyof typeof THEMES;
}

/**
 * 生成综合财务报表
 */
export async function generateFinancialReport(options: ReportOptions = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "课程交付CRM系统";
  workbook.created = new Date();

  // 获取数据
  const allOrders = await db.getAllOrders();
  const filteredOrders = filterOrdersByDate(allOrders, options.startDate, options.endDate);

  // 创建各个工作表
  await createOverviewSheet(workbook, filteredOrders, options);
  await createCityFinanceSheet(workbook, filteredOrders);
  await createSalesPerformanceSheet(workbook, filteredOrders);
  await createTeacherSettlementSheet(workbook, filteredOrders);
  await createDetailSheet(workbook, filteredOrders);

  // 生成Buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    filename: generateFilename("财务综合报表", options),
  };
}

/**
 * 生成城市业绩报表
 */
export async function generateCityReport(options: ReportOptions = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "课程交付CRM系统";
  workbook.created = new Date();

  const allOrders = await db.getAllOrders();
  const filteredOrders = filterOrdersByDate(allOrders, options.startDate, options.endDate);

  // 创建城市报表工作表
  await createCityOverviewSheet(workbook, filteredOrders, options);
  await createCityFinanceSheet(workbook, filteredOrders);
  await createCityTrendSheet(workbook, filteredOrders);

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    filename: generateFilename("城市业绩报表", options),
  };
}

/**
 * 生成老师结算报表
 */
export async function generateTeacherSettlementReport(options: ReportOptions = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "课程交付CRM系统";
  workbook.created = new Date();

  const allOrders = await db.getAllOrders();
  const filteredOrders = filterOrdersByDate(allOrders, options.startDate, options.endDate);

  await createTeacherOverviewSheet(workbook, filteredOrders, options);
  await createTeacherSettlementSheet(workbook, filteredOrders);
  await createTeacherDetailSheet(workbook, filteredOrders);

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    filename: generateFilename("老师结算报表", options),
  };
}

/**
 * 生成订单导出报表
 */
export async function generateOrderExportReport(options: ReportOptions = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "课程交付CRM系统";
  workbook.created = new Date();

  const allOrders = await db.getAllOrders();
  const filteredOrders = filterOrdersByDate(allOrders, options.startDate, options.endDate);

  await createOrderExportSheet(workbook, filteredOrders, options);

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    filename: generateFilename("订单导出", options),
  };
}

// ==================== 工作表创建函数 ====================

/**
 * 创建概览工作表
 */
async function createOverviewSheet(
  workbook: ExcelJS.Workbook,
  orders: any[],
  options: ReportOptions
) {
  const ws = workbook.addWorksheet("概览");
  ws.views = [{ showGridLines: false }];

  // 设置列宽
  ws.getColumn(1).width = 3; // 左边距
  ws.getColumn(2).width = 20;
  ws.getColumn(3).width = 20;
  ws.getColumn(4).width = 20;
  ws.getColumn(5).width = 20;

  let row = 2;

  // 标题
  const titleCell = ws.getCell(`B${row}`);
  titleCell.value = "课程交付CRM - 财务综合报表";
  applyTitleStyle(titleCell);
  row += 1;

  // 副标题 - 日期范围
  const subtitleCell = ws.getCell(`B${row}`);
  const dateRange = getDateRangeText(options.startDate, options.endDate);
  subtitleCell.value = `报表周期: ${dateRange}`;
  applyNotesStyle(subtitleCell);
  row += 2;

  // 关键指标
  applySectionHeaderStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "关键指标";
  row += 1;

  const stats = calculateOverviewStats(orders);
  
  // 指标卡片
  const metrics = [
    { label: "总销售额", value: stats.totalSales, format: "currency" },
    { label: "订单数量", value: stats.orderCount, format: "number" },
    { label: "总成本", value: stats.totalCost, format: "currency" },
    { label: "净利润", value: stats.netProfit, format: "currency" },
  ];

  // 表头
  applyTableHeaderStyle(ws.getRow(row), 2, 5);
  ws.getCell(`B${row}`).value = "指标";
  ws.getCell(`C${row}`).value = "数值";
  ws.getCell(`D${row}`).value = "占比/率";
  ws.getCell(`E${row}`).value = "趋势";
  row += 1;

  // 数据行
  const metricRows = [
    { label: "总销售额", value: stats.totalSales, rate: 1, trend: "—" },
    { label: "老师费用", value: stats.teacherFee, rate: stats.teacherFee / stats.totalSales, trend: "—" },
    { label: "车费", value: stats.transportFee, rate: stats.transportFee / stats.totalSales, trend: "—" },
    { label: "合伙人费用", value: stats.partnerFee, rate: stats.partnerFee / stats.totalSales, trend: "—" },
    { label: "其他费用", value: stats.otherCost, rate: stats.otherCost / stats.totalSales, trend: "—" },
    { label: "净利润", value: stats.netProfit, rate: stats.profitRate, trend: stats.netProfit > 0 ? "↑" : "↓" },
  ];

  metricRows.forEach((metric, idx) => {
    const currentRow = ws.getRow(row);
    applyDataRowStyle(currentRow, 2, 5, idx === metricRows.length - 1, idx);
    
    ws.getCell(`B${row}`).value = metric.label;
    ws.getCell(`B${row}`).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    
    ws.getCell(`C${row}`).value = metric.value;
    ws.getCell(`C${row}`).numFmt = "¥#,##0.00";
    ws.getCell(`C${row}`).alignment = { horizontal: "right", vertical: "middle" };
    
    ws.getCell(`D${row}`).value = metric.rate;
    ws.getCell(`D${row}`).numFmt = "0.0%";
    ws.getCell(`D${row}`).alignment = { horizontal: "center", vertical: "middle" };
    
    ws.getCell(`E${row}`).value = metric.trend;
    ws.getCell(`E${row}`).alignment = { horizontal: "center", vertical: "middle" };
    if (metric.trend === "↑") {
      ws.getCell(`E${row}`).font = { color: { argb: `FF${THEME.positive}` } };
    } else if (metric.trend === "↓") {
      ws.getCell(`E${row}`).font = { color: { argb: `FF${THEME.negative}` } };
    }
    
    row += 1;
  });

  row += 2;

  // 关键洞察
  applySectionHeaderStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "关键洞察";
  row += 1;

  const insights = generateInsights(stats, orders);
  insights.forEach((insight) => {
    ws.getCell(`B${row}`).value = `• ${insight}`;
    applyNotesStyle(ws.getCell(`B${row}`));
    row += 1;
  });

  row += 2;

  // 工作表导航
  applySectionHeaderStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "工作表导航";
  row += 1;

  const sheets = ["城市财务统计", "销售业绩", "老师结算", "收支明细"];
  sheets.forEach((sheetName) => {
    const cell = ws.getCell(`B${row}`);
    cell.value = sheetName;
    cell.font = { color: { argb: `FF${THEME.accent}` }, underline: true };
    // 使用类型断言绕过只读属性限制
    (cell as any).hyperlink = `#'${sheetName}'!A1`;
    row += 1;
  });

  row += 2;

  // 页脚信息
  ws.getCell(`B${row}`).value = `生成时间: ${new Date().toLocaleString("zh-CN")}`;
  applyNotesStyle(ws.getCell(`B${row}`));
  row += 1;
  ws.getCell(`B${row}`).value = "数据来源: 课程交付CRM系统";
  applyNotesStyle(ws.getCell(`B${row}`));
}

/**
 * 创建城市财务统计工作表
 */
async function createCityFinanceSheet(workbook: ExcelJS.Workbook, orders: any[]) {
  const ws = workbook.addWorksheet("城市财务统计");
  ws.views = [{ showGridLines: false }];

  // 设置列宽
  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 12; // 城市
  ws.getColumn(3).width = 10; // 订单数
  ws.getColumn(4).width = 14; // 销售额
  ws.getColumn(5).width = 14; // 老师费用
  ws.getColumn(6).width = 12; // 车费
  ws.getColumn(7).width = 14; // 合伙人费
  ws.getColumn(8).width = 14; // 其他费用
  ws.getColumn(9).width = 14; // 总成本
  ws.getColumn(10).width = 14; // 净利润
  ws.getColumn(11).width = 10; // 利润率

  let row = 2;

  // 标题
  applyTitleStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "城市财务统计";
  row += 2;

  // 按城市统计
  const cityStats = calculateCityStats(orders);

  // 表头
  const headers = ["城市", "订单数", "销售额", "老师费用", "车费", "合伙人费", "其他费用", "总成本", "净利润", "利润率"];
  applyTableHeaderStyle(ws.getRow(row), 2, 11);
  headers.forEach((header, idx) => {
    ws.getCell(row, idx + 2).value = header;
  });
  row += 1;

  // 数据行
  const sortedCities = Array.from(cityStats.entries())
    .sort((a, b) => b[1].totalSales - a[1].totalSales);

  sortedCities.forEach(([city, stats], idx) => {
    const currentRow = ws.getRow(row);
    applyDataRowStyle(currentRow, 2, 11, idx === sortedCities.length - 1, idx);

    ws.getCell(`B${row}`).value = city;
    ws.getCell(`B${row}`).alignment = { horizontal: "left", vertical: "middle", indent: 1 };

    ws.getCell(`C${row}`).value = stats.orderCount;
    ws.getCell(`C${row}`).alignment = { horizontal: "center", vertical: "middle" };

    ws.getCell(`D${row}`).value = stats.totalSales;
    ws.getCell(`D${row}`).numFmt = "¥#,##0.00";
    ws.getCell(`D${row}`).alignment = { horizontal: "right", vertical: "middle" };

    ws.getCell(`E${row}`).value = stats.teacherFee;
    ws.getCell(`E${row}`).numFmt = "¥#,##0.00";
    ws.getCell(`E${row}`).alignment = { horizontal: "right", vertical: "middle" };

    ws.getCell(`F${row}`).value = stats.transportFee;
    ws.getCell(`F${row}`).numFmt = "¥#,##0.00";
    ws.getCell(`F${row}`).alignment = { horizontal: "right", vertical: "middle" };

    ws.getCell(`G${row}`).value = stats.partnerFee;
    ws.getCell(`G${row}`).numFmt = "¥#,##0.00";
    ws.getCell(`G${row}`).alignment = { horizontal: "right", vertical: "middle" };

    ws.getCell(`H${row}`).value = stats.otherCost;
    ws.getCell(`H${row}`).numFmt = "¥#,##0.00";
    ws.getCell(`H${row}`).alignment = { horizontal: "right", vertical: "middle" };

    ws.getCell(`I${row}`).value = stats.totalCost;
    ws.getCell(`I${row}`).numFmt = "¥#,##0.00";
    ws.getCell(`I${row}`).alignment = { horizontal: "right", vertical: "middle" };

    ws.getCell(`J${row}`).value = stats.netProfit;
    ws.getCell(`J${row}`).numFmt = "¥#,##0.00";
    ws.getCell(`J${row}`).alignment = { horizontal: "right", vertical: "middle" };
    if (stats.netProfit < 0) {
      ws.getCell(`J${row}`).font = { color: { argb: `FF${THEME.negative}` } };
    }

    ws.getCell(`K${row}`).value = stats.profitRate;
    ws.getCell(`K${row}`).numFmt = "0.0%";
    ws.getCell(`K${row}`).alignment = { horizontal: "center", vertical: "middle" };
    if (stats.profitRate < 0) {
      ws.getCell(`K${row}`).font = { color: { argb: `FF${THEME.negative}` } };
    } else if (stats.profitRate > 0.3) {
      ws.getCell(`K${row}`).font = { color: { argb: `FF${THEME.positive}` } };
    }

    row += 1;
  });

  // 汇总行
  row += 1;
  const totalStats = calculateOverviewStats(orders);
  ws.getCell(`B${row}`).value = "合计";
  ws.getCell(`B${row}`).font = { bold: true };
  ws.getCell(`C${row}`).value = totalStats.orderCount;
  ws.getCell(`C${row}`).font = { bold: true };
  ws.getCell(`D${row}`).value = totalStats.totalSales;
  ws.getCell(`D${row}`).numFmt = "¥#,##0.00";
  ws.getCell(`D${row}`).font = { bold: true };
  ws.getCell(`J${row}`).value = totalStats.netProfit;
  ws.getCell(`J${row}`).numFmt = "¥#,##0.00";
  ws.getCell(`J${row}`).font = { bold: true };
  ws.getCell(`K${row}`).value = totalStats.profitRate;
  ws.getCell(`K${row}`).numFmt = "0.0%";
  ws.getCell(`K${row}`).font = { bold: true };

  // 冻结首行
  ws.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];
}

/**
 * 创建销售业绩工作表
 */
async function createSalesPerformanceSheet(workbook: ExcelJS.Workbook, orders: any[]) {
  const ws = workbook.addWorksheet("销售业绩");
  ws.views = [{ showGridLines: false }];

  // 设置列宽
  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 15; // 销售
  ws.getColumn(3).width = 10; // 订单数
  ws.getColumn(4).width = 14; // 销售额
  ws.getColumn(5).width = 14; // 平均单价
  ws.getColumn(6).width = 12; // 占比

  let row = 2;

  // 标题
  applyTitleStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "销售业绩统计";
  row += 2;

  // 按销售统计
  const salesStats = calculateSalesStats(orders);

  // 表头
  const headers = ["销售人员", "订单数", "销售额", "平均单价", "占比"];
  applyTableHeaderStyle(ws.getRow(row), 2, 6);
  headers.forEach((header, idx) => {
    ws.getCell(row, idx + 2).value = header;
  });
  row += 1;

  // 数据行
  const totalSales = Array.from(salesStats.values()).reduce((sum, s) => sum + s.totalSales, 0);
  const sortedSales = Array.from(salesStats.entries())
    .sort((a, b) => b[1].totalSales - a[1].totalSales);

  sortedSales.forEach(([salesperson, stats], idx) => {
    const currentRow = ws.getRow(row);
    applyDataRowStyle(currentRow, 2, 6, idx === sortedSales.length - 1, idx);

    ws.getCell(`B${row}`).value = salesperson || "未分配";
    ws.getCell(`B${row}`).alignment = { horizontal: "left", vertical: "middle", indent: 1 };

    ws.getCell(`C${row}`).value = stats.orderCount;
    ws.getCell(`C${row}`).alignment = { horizontal: "center", vertical: "middle" };

    ws.getCell(`D${row}`).value = stats.totalSales;
    ws.getCell(`D${row}`).numFmt = "¥#,##0.00";
    ws.getCell(`D${row}`).alignment = { horizontal: "right", vertical: "middle" };

    ws.getCell(`E${row}`).value = stats.avgPrice;
    ws.getCell(`E${row}`).numFmt = "¥#,##0.00";
    ws.getCell(`E${row}`).alignment = { horizontal: "right", vertical: "middle" };

    ws.getCell(`F${row}`).value = totalSales > 0 ? stats.totalSales / totalSales : 0;
    ws.getCell(`F${row}`).numFmt = "0.0%";
    ws.getCell(`F${row}`).alignment = { horizontal: "center", vertical: "middle" };

    row += 1;
  });

  // 冻结首行
  ws.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];
}

/**
 * 创建老师结算工作表
 */
async function createTeacherSettlementSheet(workbook: ExcelJS.Workbook, orders: any[]) {
  const ws = workbook.addWorksheet("老师结算");
  ws.views = [{ showGridLines: false }];

  // 设置列宽
  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 15; // 老师
  ws.getColumn(3).width = 10; // 课时数
  ws.getColumn(4).width = 14; // 课时费
  ws.getColumn(5).width = 12; // 车费
  ws.getColumn(6).width = 14; // 应结算

  let row = 2;

  // 标题
  applyTitleStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "老师结算明细";
  row += 2;

  // 按老师统计
  const teacherStats = calculateTeacherStats(orders);

  // 表头
  const headers = ["老师姓名", "课时数", "课时费", "车费", "应结算"];
  applyTableHeaderStyle(ws.getRow(row), 2, 6);
  headers.forEach((header, idx) => {
    ws.getCell(row, idx + 2).value = header;
  });
  row += 1;

  // 数据行
  const sortedTeachers = Array.from(teacherStats.entries())
    .sort((a, b) => b[1].totalFee - a[1].totalFee);

  sortedTeachers.forEach(([teacher, stats], idx) => {
    const currentRow = ws.getRow(row);
    applyDataRowStyle(currentRow, 2, 6, idx === sortedTeachers.length - 1, idx);

    ws.getCell(`B${row}`).value = teacher || "未分配";
    ws.getCell(`B${row}`).alignment = { horizontal: "left", vertical: "middle", indent: 1 };

    ws.getCell(`C${row}`).value = stats.classCount;
    ws.getCell(`C${row}`).alignment = { horizontal: "center", vertical: "middle" };

    ws.getCell(`D${row}`).value = stats.teacherFee;
    ws.getCell(`D${row}`).numFmt = "¥#,##0.00";
    ws.getCell(`D${row}`).alignment = { horizontal: "right", vertical: "middle" };

    ws.getCell(`E${row}`).value = stats.transportFee;
    ws.getCell(`E${row}`).numFmt = "¥#,##0.00";
    ws.getCell(`E${row}`).alignment = { horizontal: "right", vertical: "middle" };

    ws.getCell(`F${row}`).value = stats.totalFee;
    ws.getCell(`F${row}`).numFmt = "¥#,##0.00";
    ws.getCell(`F${row}`).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(`F${row}`).font = { bold: true };

    row += 1;
  });

  // 汇总行
  row += 1;
  const totalTeacherFee = Array.from(teacherStats.values()).reduce((sum, s) => sum + s.teacherFee, 0);
  const totalTransportFee = Array.from(teacherStats.values()).reduce((sum, s) => sum + s.transportFee, 0);
  const totalFee = Array.from(teacherStats.values()).reduce((sum, s) => sum + s.totalFee, 0);
  
  ws.getCell(`B${row}`).value = "合计";
  ws.getCell(`B${row}`).font = { bold: true };
  ws.getCell(`D${row}`).value = totalTeacherFee;
  ws.getCell(`D${row}`).numFmt = "¥#,##0.00";
  ws.getCell(`D${row}`).font = { bold: true };
  ws.getCell(`E${row}`).value = totalTransportFee;
  ws.getCell(`E${row}`).numFmt = "¥#,##0.00";
  ws.getCell(`E${row}`).font = { bold: true };
  ws.getCell(`F${row}`).value = totalFee;
  ws.getCell(`F${row}`).numFmt = "¥#,##0.00";
  ws.getCell(`F${row}`).font = { bold: true };

  // 冻结首行
  ws.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];
}

/**
 * 创建收支明细工作表
 */
async function createDetailSheet(workbook: ExcelJS.Workbook, orders: any[]) {
  const ws = workbook.addWorksheet("收支明细");
  ws.views = [{ showGridLines: false }];

  // 设置列宽
  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 12; // 日期
  ws.getColumn(3).width = 20; // 订单号
  ws.getColumn(4).width = 12; // 城市
  ws.getColumn(5).width = 15; // 客户
  ws.getColumn(6).width = 14; // 收入
  ws.getColumn(7).width = 14; // 老师费
  ws.getColumn(8).width = 12; // 车费
  ws.getColumn(9).width = 14; // 利润

  let row = 2;

  // 标题
  applyTitleStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "收支明细";
  row += 2;

  // 表头
  const headers = ["日期", "订单号", "城市", "客户", "收入", "老师费", "车费", "利润"];
  applyTableHeaderStyle(ws.getRow(row), 2, 9);
  headers.forEach((header, idx) => {
    ws.getCell(row, idx + 2).value = header;
  });
  row += 1;

  // 数据行
  const sortedOrders = [...orders].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  sortedOrders.forEach((order, idx) => {
    const currentRow = ws.getRow(row);
    applyDataRowStyle(currentRow, 2, 9, idx === sortedOrders.length - 1, idx);

    const income = parseFloat(order.paymentAmount || "0");
    const teacherFee = parseFloat(order.teacherFee || "0");
    const transportFee = parseFloat(order.transportFee || "0");
    const profit = income - teacherFee - transportFee;

    ws.getCell(`B${row}`).value = new Date(order.createdAt).toLocaleDateString("zh-CN");
    ws.getCell(`B${row}`).alignment = { horizontal: "center", vertical: "middle" };

    ws.getCell(`C${row}`).value = order.orderNo || "-";
    ws.getCell(`C${row}`).alignment = { horizontal: "left", vertical: "middle", indent: 1 };

    ws.getCell(`D${row}`).value = order.deliveryCity || order.paymentCity || "-";
    ws.getCell(`D${row}`).alignment = { horizontal: "center", vertical: "middle" };

    ws.getCell(`E${row}`).value = order.customerName || "-";
    ws.getCell(`E${row}`).alignment = { horizontal: "left", vertical: "middle", indent: 1 };

    ws.getCell(`F${row}`).value = income;
    ws.getCell(`F${row}`).numFmt = "¥#,##0.00";
    ws.getCell(`F${row}`).alignment = { horizontal: "right", vertical: "middle" };

    ws.getCell(`G${row}`).value = teacherFee;
    ws.getCell(`G${row}`).numFmt = "¥#,##0.00";
    ws.getCell(`G${row}`).alignment = { horizontal: "right", vertical: "middle" };

    ws.getCell(`H${row}`).value = transportFee;
    ws.getCell(`H${row}`).numFmt = "¥#,##0.00";
    ws.getCell(`H${row}`).alignment = { horizontal: "right", vertical: "middle" };

    ws.getCell(`I${row}`).value = profit;
    ws.getCell(`I${row}`).numFmt = "¥#,##0.00";
    ws.getCell(`I${row}`).alignment = { horizontal: "right", vertical: "middle" };
    if (profit < 0) {
      ws.getCell(`I${row}`).font = { color: { argb: `FF${THEME.negative}` } };
    }

    row += 1;
  });

  // 冻结首行
  ws.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];

  // 启用筛选
  ws.autoFilter = {
    from: { row: 4, column: 2 },
    to: { row: row - 1, column: 9 },
  };
}

/**
 * 创建城市概览工作表
 */
async function createCityOverviewSheet(
  workbook: ExcelJS.Workbook,
  orders: any[],
  options: ReportOptions
) {
  const ws = workbook.addWorksheet("概览");
  ws.views = [{ showGridLines: false }];

  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 20;
  ws.getColumn(3).width = 20;

  let row = 2;

  applyTitleStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "城市业绩报表";
  row += 1;

  const dateRange = getDateRangeText(options.startDate, options.endDate);
  applyNotesStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = `报表周期: ${dateRange}`;
  row += 2;

  const cityStats = calculateCityStats(orders);
  const topCities = Array.from(cityStats.entries())
    .sort((a, b) => b[1].totalSales - a[1].totalSales)
    .slice(0, 5);

  applySectionHeaderStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "TOP 5 城市";
  row += 1;

  topCities.forEach(([city, stats], idx) => {
    ws.getCell(`B${row}`).value = `${idx + 1}. ${city}`;
    ws.getCell(`C${row}`).value = stats.totalSales;
    ws.getCell(`C${row}`).numFmt = "¥#,##0.00";
    row += 1;
  });
}

/**
 * 创建城市趋势工作表
 */
async function createCityTrendSheet(workbook: ExcelJS.Workbook, orders: any[]) {
  const ws = workbook.addWorksheet("月度趋势");
  ws.views = [{ showGridLines: false }];

  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 12;

  let row = 2;

  applyTitleStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "城市月度趋势";
  row += 2;

  // 按月份统计
  const monthlyStats = calculateMonthlyStats(orders);
  const months = Array.from(monthlyStats.keys()).sort();

  // 设置列宽
  months.forEach((_, idx) => {
    ws.getColumn(idx + 3).width = 12;
  });

  // 表头
  applyTableHeaderStyle(ws.getRow(row), 2, months.length + 2);
  ws.getCell(`B${row}`).value = "城市";
  months.forEach((month, idx) => {
    ws.getCell(row, idx + 3).value = month;
  });
  row += 1;

  // 获取所有城市
  const allCities = new Set<string>();
  orders.forEach(order => {
    const city = order.deliveryCity || order.paymentCity;
    if (city) allCities.add(city);
  });

  // 数据行
  const sortedCities = Array.from(allCities).sort();
  sortedCities.forEach((city, idx) => {
    const currentRow = ws.getRow(row);
    applyDataRowStyle(currentRow, 2, months.length + 2, idx === sortedCities.length - 1, idx);

    ws.getCell(`B${row}`).value = city;
    ws.getCell(`B${row}`).alignment = { horizontal: "left", vertical: "middle", indent: 1 };

    months.forEach((month, monthIdx) => {
      const monthData = monthlyStats.get(month);
      const cityData = monthData?.cities.get(city);
      ws.getCell(row, monthIdx + 3).value = cityData?.totalSales || 0;
      ws.getCell(row, monthIdx + 3).numFmt = "¥#,##0";
      ws.getCell(row, monthIdx + 3).alignment = { horizontal: "right", vertical: "middle" };
    });

    row += 1;
  });
}

/**
 * 创建老师概览工作表
 */
async function createTeacherOverviewSheet(
  workbook: ExcelJS.Workbook,
  orders: any[],
  options: ReportOptions
) {
  const ws = workbook.addWorksheet("概览");
  ws.views = [{ showGridLines: false }];

  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 20;
  ws.getColumn(3).width = 20;

  let row = 2;

  applyTitleStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "老师结算报表";
  row += 1;

  const dateRange = getDateRangeText(options.startDate, options.endDate);
  applyNotesStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = `报表周期: ${dateRange}`;
  row += 2;

  const teacherStats = calculateTeacherStats(orders);
  const totalFee = Array.from(teacherStats.values()).reduce((sum, s) => sum + s.totalFee, 0);
  const totalClasses = Array.from(teacherStats.values()).reduce((sum, s) => sum + s.classCount, 0);

  applySectionHeaderStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "汇总信息";
  row += 1;

  ws.getCell(`B${row}`).value = "老师总数";
  ws.getCell(`C${row}`).value = teacherStats.size;
  row += 1;

  ws.getCell(`B${row}`).value = "总课时数";
  ws.getCell(`C${row}`).value = totalClasses;
  row += 1;

  ws.getCell(`B${row}`).value = "应结算总额";
  ws.getCell(`C${row}`).value = totalFee;
  ws.getCell(`C${row}`).numFmt = "¥#,##0.00";
}

/**
 * 创建老师明细工作表
 */
async function createTeacherDetailSheet(workbook: ExcelJS.Workbook, orders: any[]) {
  const ws = workbook.addWorksheet("课时明细");
  ws.views = [{ showGridLines: false }];

  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 12; // 日期
  ws.getColumn(3).width = 15; // 老师
  ws.getColumn(4).width = 15; // 客户
  ws.getColumn(5).width = 12; // 城市
  ws.getColumn(6).width = 14; // 课时费
  ws.getColumn(7).width = 12; // 车费

  let row = 2;

  applyTitleStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "课时明细";
  row += 2;

  // 表头
  const headers = ["日期", "老师", "客户", "城市", "课时费", "车费"];
  applyTableHeaderStyle(ws.getRow(row), 2, 7);
  headers.forEach((header, idx) => {
    ws.getCell(row, idx + 2).value = header;
  });
  row += 1;

  // 数据行
  const sortedOrders = [...orders]
    .filter(o => o.deliveryTeacher)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  sortedOrders.forEach((order, idx) => {
    const currentRow = ws.getRow(row);
    applyDataRowStyle(currentRow, 2, 7, idx === sortedOrders.length - 1, idx);

    ws.getCell(`B${row}`).value = new Date(order.createdAt).toLocaleDateString("zh-CN");
    ws.getCell(`B${row}`).alignment = { horizontal: "center", vertical: "middle" };

    ws.getCell(`C${row}`).value = order.deliveryTeacher || "-";
    ws.getCell(`C${row}`).alignment = { horizontal: "left", vertical: "middle", indent: 1 };

    ws.getCell(`D${row}`).value = order.customerName || "-";
    ws.getCell(`D${row}`).alignment = { horizontal: "left", vertical: "middle", indent: 1 };

    ws.getCell(`E${row}`).value = order.deliveryCity || "-";
    ws.getCell(`E${row}`).alignment = { horizontal: "center", vertical: "middle" };

    ws.getCell(`F${row}`).value = parseFloat(order.teacherFee || "0");
    ws.getCell(`F${row}`).numFmt = "¥#,##0.00";
    ws.getCell(`F${row}`).alignment = { horizontal: "right", vertical: "middle" };

    ws.getCell(`G${row}`).value = parseFloat(order.transportFee || "0");
    ws.getCell(`G${row}`).numFmt = "¥#,##0.00";
    ws.getCell(`G${row}`).alignment = { horizontal: "right", vertical: "middle" };

    row += 1;
  });

  // 冻结首行
  ws.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];
}

/**
 * 创建订单导出工作表
 */
async function createOrderExportSheet(
  workbook: ExcelJS.Workbook,
  orders: any[],
  options: ReportOptions
) {
  const ws = workbook.addWorksheet("订单数据");
  ws.views = [{ showGridLines: false }];

  // 设置列宽
  const columns = [
    { key: "orderNo", header: "订单号", width: 20 },
    { key: "channelOrderNo", header: "渠道订单号", width: 25 },
    { key: "createdAt", header: "创建日期", width: 12 },
    { key: "customerName", header: "客户姓名", width: 15 },
    { key: "salesperson", header: "销售人员", width: 12 },
    { key: "deliveryCity", header: "交付城市", width: 12 },
    { key: "deliveryTeacher", header: "交付老师", width: 12 },
    { key: "courseName", header: "课程名称", width: 20 },
    { key: "paymentAmount", header: "收款金额", width: 14 },
    { key: "teacherFee", header: "老师费用", width: 14 },
    { key: "transportFee", header: "车费", width: 12 },
    { key: "paymentChannel", header: "支付渠道", width: 12 },
    { key: "trafficSource", header: "流量来源", width: 15 },
    { key: "notes", header: "备注", width: 30 },
  ];

  ws.getColumn(1).width = 3;
  columns.forEach((col, idx) => {
    ws.getColumn(idx + 2).width = col.width;
  });

  let row = 2;

  // 标题
  applyTitleStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = "订单数据导出";
  row += 1;

  const dateRange = getDateRangeText(options.startDate, options.endDate);
  applyNotesStyle(ws.getCell(`B${row}`));
  ws.getCell(`B${row}`).value = `导出时间: ${new Date().toLocaleString("zh-CN")} | 数据范围: ${dateRange} | 共 ${orders.length} 条记录`;
  row += 2;

  // 表头
  applyTableHeaderStyle(ws.getRow(row), 2, columns.length + 1);
  columns.forEach((col, idx) => {
    ws.getCell(row, idx + 2).value = col.header;
  });
  row += 1;

  // 数据行
  const sortedOrders = [...orders].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  sortedOrders.forEach((order, idx) => {
    const currentRow = ws.getRow(row);
    applyDataRowStyle(currentRow, 2, columns.length + 1, idx === sortedOrders.length - 1, idx);

    ws.getCell(`B${row}`).value = order.orderNo || "-";
    ws.getCell(`C${row}`).value = order.channelOrderNo || "-";
    ws.getCell(`D${row}`).value = new Date(order.createdAt).toLocaleDateString("zh-CN");
    ws.getCell(`E${row}`).value = order.customerName || "-";
    ws.getCell(`F${row}`).value = order.salesperson || "-";
    ws.getCell(`G${row}`).value = order.deliveryCity || order.paymentCity || "-";
    ws.getCell(`H${row}`).value = order.deliveryTeacher || "-";
    ws.getCell(`I${row}`).value = order.courseName || "-";
    
    ws.getCell(`J${row}`).value = parseFloat(order.paymentAmount || "0");
    ws.getCell(`J${row}`).numFmt = "¥#,##0.00";
    ws.getCell(`J${row}`).alignment = { horizontal: "right", vertical: "middle" };
    
    ws.getCell(`K${row}`).value = parseFloat(order.teacherFee || "0");
    ws.getCell(`K${row}`).numFmt = "¥#,##0.00";
    ws.getCell(`K${row}`).alignment = { horizontal: "right", vertical: "middle" };
    
    ws.getCell(`L${row}`).value = parseFloat(order.transportFee || "0");
    ws.getCell(`L${row}`).numFmt = "¥#,##0.00";
    ws.getCell(`L${row}`).alignment = { horizontal: "right", vertical: "middle" };
    
    ws.getCell(`M${row}`).value = order.paymentChannel || "-";
    ws.getCell(`N${row}`).value = order.trafficSource || "-";
    ws.getCell(`O${row}`).value = order.notes || "-";

    row += 1;
  });

  // 冻结首行
  ws.views = [{ state: "frozen", ySplit: 5, showGridLines: false }];

  // 启用筛选
  ws.autoFilter = {
    from: { row: 5, column: 2 },
    to: { row: row - 1, column: columns.length + 1 },
  };
}

// ==================== 辅助函数 ====================

function filterOrdersByDate(orders: any[], startDate?: string, endDate?: string) {
  if (!startDate && !endDate) return orders;
  
  return orders.filter((order) => {
    const orderDate = new Date(order.createdAt);
    if (startDate && orderDate < new Date(startDate)) return false;
    if (endDate && orderDate > new Date(endDate)) return false;
    return true;
  });
}

function getDateRangeText(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return "全部数据";
  if (startDate && endDate) return `${startDate} 至 ${endDate}`;
  if (startDate) return `${startDate} 起`;
  return `至 ${endDate}`;
}

function generateFilename(prefix: string, options: ReportOptions): string {
  const date = new Date().toLocaleDateString("zh-CN").replace(/\//g, "-");
  return `${prefix}_${date}.xlsx`;
}

function calculateOverviewStats(orders: any[]) {
  let totalSales = 0;
  let teacherFee = 0;
  let transportFee = 0;
  let partnerFee = 0;
  let otherCost = 0;

  orders.forEach((order) => {
    totalSales += parseFloat(order.paymentAmount || "0");
    teacherFee += parseFloat(order.teacherFee || "0");
    transportFee += parseFloat(order.transportFee || "0");
    partnerFee += parseFloat(order.partnerFee || "0");
    otherCost += parseFloat(order.consumablesFee || "0") +
                 parseFloat(order.rentFee || "0") +
                 parseFloat(order.propertyFee || "0") +
                 parseFloat(order.utilityFee || "0") +
                 parseFloat(order.otherFee || "0");
  });

  const totalCost = teacherFee + transportFee + partnerFee + otherCost;
  const netProfit = totalSales - totalCost;
  const profitRate = totalSales > 0 ? netProfit / totalSales : 0;

  return {
    orderCount: orders.length,
    totalSales,
    teacherFee,
    transportFee,
    partnerFee,
    otherCost,
    totalCost,
    netProfit,
    profitRate,
  };
}

function calculateCityStats(orders: any[]) {
  const cityStats = new Map<string, {
    orderCount: number;
    totalSales: number;
    teacherFee: number;
    transportFee: number;
    partnerFee: number;
    otherCost: number;
    totalCost: number;
    netProfit: number;
    profitRate: number;
  }>();

  orders.forEach((order) => {
    const city = order.deliveryCity || order.paymentCity || "未知城市";
    const stats = cityStats.get(city) || {
      orderCount: 0,
      totalSales: 0,
      teacherFee: 0,
      transportFee: 0,
      partnerFee: 0,
      otherCost: 0,
      totalCost: 0,
      netProfit: 0,
      profitRate: 0,
    };

    stats.orderCount += 1;
    stats.totalSales += parseFloat(order.paymentAmount || "0");
    stats.teacherFee += parseFloat(order.teacherFee || "0");
    stats.transportFee += parseFloat(order.transportFee || "0");
    stats.partnerFee += parseFloat(order.partnerFee || "0");
    stats.otherCost += parseFloat(order.consumablesFee || "0") +
                       parseFloat(order.rentFee || "0") +
                       parseFloat(order.propertyFee || "0") +
                       parseFloat(order.utilityFee || "0") +
                       parseFloat(order.otherFee || "0");

    stats.totalCost = stats.teacherFee + stats.transportFee + stats.partnerFee + stats.otherCost;
    stats.netProfit = stats.totalSales - stats.totalCost;
    stats.profitRate = stats.totalSales > 0 ? stats.netProfit / stats.totalSales : 0;

    cityStats.set(city, stats);
  });

  return cityStats;
}

function calculateSalesStats(orders: any[]) {
  const salesStats = new Map<string, {
    orderCount: number;
    totalSales: number;
    avgPrice: number;
  }>();

  orders.forEach((order) => {
    const salesperson = order.salesperson || "未分配";
    const stats = salesStats.get(salesperson) || {
      orderCount: 0,
      totalSales: 0,
      avgPrice: 0,
    };

    stats.orderCount += 1;
    stats.totalSales += parseFloat(order.paymentAmount || "0");
    stats.avgPrice = stats.totalSales / stats.orderCount;

    salesStats.set(salesperson, stats);
  });

  return salesStats;
}

function calculateTeacherStats(orders: any[]) {
  const teacherStats = new Map<string, {
    classCount: number;
    teacherFee: number;
    transportFee: number;
    totalFee: number;
  }>();

  orders.forEach((order) => {
    const teacher = order.deliveryTeacher;
    if (!teacher) return;

    const stats = teacherStats.get(teacher) || {
      classCount: 0,
      teacherFee: 0,
      transportFee: 0,
      totalFee: 0,
    };

    stats.classCount += 1;
    stats.teacherFee += parseFloat(order.teacherFee || "0");
    stats.transportFee += parseFloat(order.transportFee || "0");
    stats.totalFee = stats.teacherFee + stats.transportFee;

    teacherStats.set(teacher, stats);
  });

  return teacherStats;
}

function calculateMonthlyStats(orders: any[]) {
  const monthlyStats = new Map<string, {
    totalSales: number;
    orderCount: number;
    cities: Map<string, { totalSales: number; orderCount: number }>;
  }>();

  orders.forEach((order) => {
    const date = new Date(order.createdAt);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const city = order.deliveryCity || order.paymentCity || "未知城市";

    const monthData = monthlyStats.get(month) || {
      totalSales: 0,
      orderCount: 0,
      cities: new Map(),
    };

    monthData.totalSales += parseFloat(order.paymentAmount || "0");
    monthData.orderCount += 1;

    const cityData = monthData.cities.get(city) || { totalSales: 0, orderCount: 0 };
    cityData.totalSales += parseFloat(order.paymentAmount || "0");
    cityData.orderCount += 1;
    monthData.cities.set(city, cityData);

    monthlyStats.set(month, monthData);
  });

  return monthlyStats;
}

function generateInsights(stats: ReturnType<typeof calculateOverviewStats>, orders: any[]): string[] {
  const insights: string[] = [];

  // 利润率分析
  if (stats.profitRate > 0.3) {
    insights.push(`利润率达到 ${(stats.profitRate * 100).toFixed(1)}%,表现优秀`);
  } else if (stats.profitRate < 0.1) {
    insights.push(`利润率仅 ${(stats.profitRate * 100).toFixed(1)}%,建议优化成本结构`);
  }

  // 成本结构分析
  const teacherFeeRate = stats.teacherFee / stats.totalSales;
  if (teacherFeeRate > 0.4) {
    insights.push(`老师费用占比 ${(teacherFeeRate * 100).toFixed(1)}%,是主要成本项`);
  }

  // 订单数量
  insights.push(`共处理 ${stats.orderCount} 笔订单,总销售额 ¥${stats.totalSales.toFixed(2)}`);

  // 平均订单金额
  const avgOrderAmount = stats.totalSales / stats.orderCount;
  insights.push(`平均订单金额 ¥${avgOrderAmount.toFixed(2)}`);

  return insights;
}
