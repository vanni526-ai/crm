import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Data Quality Check", () => {
  it("should check order data quality", async () => {
    const result = await db.checkOrderDataQuality();
    
    expect(result).toBeDefined();
    expect(result).toHaveProperty("totalOrders");
    expect(result).toHaveProperty("totalIssues");
    expect(result).toHaveProperty("issues");
    expect(result).toHaveProperty("summary");
    
    // 验证issues结构
    expect(result!.issues).toHaveProperty("missingCityConfig");
    expect(result!.issues).toHaveProperty("abnormalTeacherFee");
    expect(result!.issues).toHaveProperty("invalidChannelOrderNo");
    expect(result!.issues).toHaveProperty("missingRequiredFields");
    
    // 验证summary结构
    expect(result!.summary).toHaveProperty("missingCityConfigCount");
    expect(result!.summary).toHaveProperty("abnormalTeacherFeeCount");
    expect(result!.summary).toHaveProperty("invalidChannelOrderNoCount");
    expect(result!.summary).toHaveProperty("missingRequiredFieldsCount");
    
    console.log("Data Quality Check Result:");
    console.log(`Total Orders: ${result!.totalOrders}`);
    console.log(`Total Issues: ${result!.totalIssues}`);
    console.log(`Missing City Config: ${result!.summary.missingCityConfigCount}`);
    console.log(`Abnormal Teacher Fee: ${result!.summary.abnormalTeacherFeeCount}`);
    console.log(`Invalid Channel Order No: ${result!.summary.invalidChannelOrderNoCount}`);
    console.log(`Missing Required Fields: ${result!.summary.missingRequiredFieldsCount}`);
  });

  it("should get unconfigured cities", async () => {
    const result = await db.getUnconfiguredCities();
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("city");
      expect(result[0]).toHaveProperty("orderCount");
      
      console.log("Unconfigured Cities:");
      result.forEach(city => {
        console.log(`- ${city.city}: ${city.orderCount} orders`);
      });
    } else {
      console.log("No unconfigured cities found");
    }
  });
});

describe("Audit Log", () => {
  it("should create audit log", async () => {
    const logId = await db.createAuditLog({
      operationType: "test_operation",
      operationDescription: "测试审计日志功能",
      operatorId: 1,
      operatorName: "测试用户",
      affectedCount: 5,
      details: { test: "data" },
      status: "success",
    });
    
    expect(logId).toBeGreaterThan(0);
    console.log(`Created audit log with ID: ${logId}`);
  });

  it("should get all audit logs", async () => {
    const logs = await db.getAllAuditLogs(10, 0);
    
    expect(logs).toBeDefined();
    expect(Array.isArray(logs)).toBe(true);
    
    if (logs.length > 0) {
      expect(logs[0]).toHaveProperty("id");
      expect(logs[0]).toHaveProperty("operationType");
      expect(logs[0]).toHaveProperty("operationDescription");
      expect(logs[0]).toHaveProperty("operatorName");
      expect(logs[0]).toHaveProperty("affectedCount");
      expect(logs[0]).toHaveProperty("status");
      expect(logs[0]).toHaveProperty("createdAt");
      
      console.log(`Found ${logs.length} audit logs`);
      console.log("Latest audit log:", {
        id: logs[0].id,
        type: logs[0].operationType,
        description: logs[0].operationDescription,
        operator: logs[0].operatorName,
        affected: logs[0].affectedCount,
        status: logs[0].status,
      });
    }
  });

  it("should get audit log stats", async () => {
    const stats = await db.getAuditLogStats();
    
    expect(stats).toBeDefined();
    if (stats) {
      expect(stats).toHaveProperty("totalLogs");
      expect(stats).toHaveProperty("successCount");
      expect(stats).toHaveProperty("failedCount");
      expect(stats).toHaveProperty("partialCount");
      
      console.log("Audit Log Stats:");
      console.log(`Total Logs: ${stats.totalLogs}`);
      console.log(`Success: ${stats.successCount}`);
      console.log(`Failed: ${stats.failedCount}`);
      console.log(`Partial: ${stats.partialCount}`);
    }
  });
});
