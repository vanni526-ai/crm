import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { orders, classrooms } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("Data Cleaning - Smart Classroom Fill", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error("Database connection failed");
    }
  });

  it("should identify orders that need smart classroom fill", async () => {
    // 查询有城市但无教室的订单
    const ordersWithoutRoom = await db!
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        deliveryCity: orders.deliveryCity,
        deliveryRoom: orders.deliveryRoom,
      })
      .from(orders)
      .where(
        and(
          eq(orders.deliveryRoom, ""),
          // @ts-ignore
          eq(orders.deliveryCity, "天津")
        )
      )
      .limit(1);

    if (ordersWithoutRoom.length > 0) {
      const order = ordersWithoutRoom[0];
      
      // 检查天津是否只有一个教室
      const cityClassrooms = await db!
        .select({ name: classrooms.name })
        .from(classrooms)
        .where(
          and(
            eq(classrooms.cityName, "天津"),
            eq(classrooms.isActive, true)
          )
        );

      expect(cityClassrooms.length).toBeGreaterThan(0);
      
      if (cityClassrooms.length === 1) {
        expect(cityClassrooms[0].name).toBe("天津1501");
        console.log(`✅ 订单${order.orderNo}应该自动填充为: ${cityClassrooms[0].name}`);
      }
    }
  });

  it("should query classrooms without errors", async () => {
    // 测试查询语法是否正确
    const result = await db!
      .select({ name: classrooms.name })
      .from(classrooms)
      .where(
        and(
          eq(classrooms.cityName, "天津"),
          eq(classrooms.isActive, true)
        )
      );

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});
