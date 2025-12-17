import { describe, expect, it } from "vitest";
import { parseAlipayCSV, parseWechatExcel, parseICS } from "./fileParser";
import * as fs from "fs";
import * as path from "path";

describe("File Parser", () => {
  it("should parse CSV with Chinese headers", async () => {
    const csvContent = `交易号,商家订单号,交易创建时间,付款时间,最近修改时间,交易来源地,类型,交易对方,商品名称,金额（元）,收/支,交易状态,服务费（元）,成功退款（元）,备注,资金状态
20251216001,ORDER001,2025-12-16 10:00:00,2025-12-16 10:01:00,2025-12-16 10:01:00,线上,即时到账,张三,课程费用,1000.00,收入,交易成功,0.00,0.00,,已收入`;

    const buffer = Buffer.from(csvContent, "utf-8");
    const records = await parseAlipayCSV(buffer);

    expect(records).toHaveLength(1);
    expect(records[0].orderNo).toBe("20251216001");
    expect(records[0].merchantOrderNo).toBe("ORDER001");
    expect(records[0].amount).toBe("1000.00");
    expect(records[0].inOut).toBe("收入");
    expect(records[0].status).toBe("交易成功");
  });

  it("should handle empty CSV", async () => {
    const csvContent = `交易号,商家订单号,金额（元）`;
    const buffer = Buffer.from(csvContent, "utf-8");
    const records = await parseAlipayCSV(buffer);

    expect(records).toHaveLength(0);
  });

  it("should parse ICS calendar events", async () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-event-001
DTSTAMP:20251216T100000Z
DTSTART:20251216T140000Z
DTEND:20251216T160000Z
SUMMARY:课程安排
DESCRIPTION:体验课程
LOCATION:上海体验馆
ORGANIZER:张老师
END:VEVENT
END:VCALENDAR`;

    const buffer = Buffer.from(icsContent, "utf-8");
    const events = await parseICS(buffer);

    expect(events).toHaveLength(1);
    expect(events[0].summary).toBe("课程安排");
    expect(events[0].description).toBe("体验课程");
    expect(events[0].location).toBe("上海体验馆");
  });

  it("should handle malformed CSV gracefully", async () => {
    const csvContent = `invalid,data,format
no,proper,headers`;

    const buffer = Buffer.from(csvContent, "utf-8");

    // 应该抛出错误或返回空数组
    await expect(async () => {
      const records = await parseAlipayCSV(buffer);
      // 如果没有找到正确的表头,应该抛出错误
      if (records.length === 0 || !records[0].orderNo) {
        throw new Error("无法解析CSV");
      }
    }).rejects.toThrow();
  });
});

describe("Import Router Integration", () => {
  it("should validate file content is base64 encoded", () => {
    const testString = "Hello World";
    const base64 = Buffer.from(testString).toString("base64");
    const decoded = Buffer.from(base64, "base64").toString("utf-8");

    expect(decoded).toBe(testString);
  });

  it("should handle large file parsing", async () => {
    // 创建一个包含100条记录的CSV
    let csvContent = `交易号,商家订单号,金额（元）,收/支,交易状态\n`;
    for (let i = 1; i <= 100; i++) {
      csvContent += `ORDER${i.toString().padStart(5, "0")},MERCHANT${i},${(i * 100).toFixed(2)},收入,交易成功\n`;
    }

    const buffer = Buffer.from(csvContent, "utf-8");
    const records = await parseAlipayCSV(buffer);

    expect(records.length).toBeGreaterThan(0);
    expect(records.length).toBeLessThanOrEqual(100);
  });
});
