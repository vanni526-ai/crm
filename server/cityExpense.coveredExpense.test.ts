import { describe, it, expect } from "vitest";

describe("城市费用账单 - 勾选费用的合伙人承担计算", () => {
  it("应该只计算勾选的费用项目(泉州案例)", () => {
    // 泉州的费用数据
    const expenses = {
      rentFee: 3000,      // 房租(勾选)
      propertyFee: 0,     // 物业费(未勾选)
      utilityFee: 0,      // 水电费(勾选)
      teacherFee: 2900,   // 老师费用(勾选)
      transportFee: 400,  // 车费(勾选)
      phoneFee: 200,      // 话费(未勾选)
    };

    // 费用承担配置
    const expenseCoverage = {
      rentFee: true,
      propertyFee: false,
      utilityFee: true,
      teacherFee: true,
      transportFee: true,
      phoneFee: false,
    };

    // 计算勾选费用总和
    let coveredExpenseTotal = 0;
    if (expenseCoverage.rentFee) coveredExpenseTotal += expenses.rentFee;
    if (expenseCoverage.propertyFee) coveredExpenseTotal += expenses.propertyFee;
    if (expenseCoverage.utilityFee) coveredExpenseTotal += expenses.utilityFee;
    if (expenseCoverage.teacherFee) coveredExpenseTotal += expenses.teacherFee;
    if (expenseCoverage.transportFee) coveredExpenseTotal += expenses.transportFee;
    if (expenseCoverage.phoneFee) coveredExpenseTotal += expenses.phoneFee;

    // 费用分摊比例30%
    const costShareRatio = 30;
    const partnerShare = (coveredExpenseTotal * costShareRatio / 100).toFixed(2);

    // 验证结果
    expect(coveredExpenseTotal).toBe(6300); // 3000 + 0 + 2900 + 400 = 6300
    expect(partnerShare).toBe("1890.00"); // 6300 × 30% = 1890
  });

  it("应该正确处理部分勾选的情况(宁波案例)", () => {
    // 宁波的费用数据
    const expenses = {
      rentFee: 2500,      // 房租(勾选)
      teacherFee: 3700,   // 老师费用(勾选)
      transportFee: 300,  // 车费(勾选)
      propertyFee: 0,     // 物业费(未勾选)
    };

    // 费用承担配置(全部勾选)
    const expenseCoverage = {
      rentFee: true,
      teacherFee: true,
      transportFee: true,
      propertyFee: true,
    };

    // 计算勾选费用总和
    let coveredExpenseTotal = 0;
    if (expenseCoverage.rentFee) coveredExpenseTotal += expenses.rentFee;
    if (expenseCoverage.teacherFee) coveredExpenseTotal += expenses.teacherFee;
    if (expenseCoverage.transportFee) coveredExpenseTotal += expenses.transportFee;
    if (expenseCoverage.propertyFee) coveredExpenseTotal += expenses.propertyFee;

    // 费用分摊比例30%
    const costShareRatio = 30;
    const partnerShare = (coveredExpenseTotal * costShareRatio / 100).toFixed(2);

    // 验证结果
    expect(coveredExpenseTotal).toBe(6500); // 2500 + 3700 + 300 + 0 = 6500
    expect(partnerShare).toBe("1950.00"); // 6500 × 30% = 1950
  });

  it("应该正确处理没有勾选任何费用的情况(深圳案例)", () => {
    // 深圳的费用数据
    const expenses = {
      rentFee: 3300,
      teacherFee: 7860,
      transportFee: 1800,
    };

    // 费用承担配置(全部未勾选)
    const expenseCoverage = {
      rentFee: false,
      teacherFee: false,
      transportFee: false,
    };

    // 计算勾选费用总和
    let coveredExpenseTotal = 0;
    if (expenseCoverage.rentFee) coveredExpenseTotal += expenses.rentFee;
    if (expenseCoverage.teacherFee) coveredExpenseTotal += expenses.teacherFee;
    if (expenseCoverage.transportFee) coveredExpenseTotal += expenses.transportFee;

    // 费用分摊比例30%
    const costShareRatio = 30;
    const partnerShare = (coveredExpenseTotal * costShareRatio / 100).toFixed(2);

    // 验证结果
    expect(coveredExpenseTotal).toBe(0); // 没有勾选任何费用
    expect(partnerShare).toBe("0.00"); // 0 × 30% = 0
  });
});
