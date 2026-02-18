import { appRouter } from "./server/routers";
import { createContext } from "./server/_core/context";

async function testDataCleaningAPI() {
  console.log("开始测试数据清洗API...\n");

  // 创建模拟上下文
  const mockContext = await createContext({
    req: {
      headers: {},
      cookies: {},
    } as any,
    res: {} as any,
  });

  // 模拟已认证用户
  (mockContext as any).user = {
    id: 1,
    openId: "test-user",
    name: "Test User",
    email: "test@example.com",
    role: "admin",
  };

  const caller = appRouter.createCaller(mockContext);

  try {
    console.log("1. 测试scanOrders接口...");
    const scanResult = await caller.dataCleaning.scanOrders();
    console.log(`✅ scanOrders成功: 找到${scanResult.total}个需要清洗的订单`);
    
    if (scanResult.orders.length > 0) {
      console.log("\n前3个订单:");
      scanResult.orders.slice(0, 3).forEach((order, i) => {
        console.log(`  ${i + 1}. ${order.orderNo}`);
        console.log(`     原始: 城市=${order.originalCity}, 教室=${order.originalRoom}`);
        console.log(`     标准: 城市=${order.standardizedCity}, 教室=${order.standardizedRoom}`);
      });
    }

    // 测试cleanOrders接口
    if (scanResult.orders.length > 0) {
      console.log("\n2. 测试cleanOrders接口...");
      const orderIds = scanResult.orders.slice(0, 5).map(o => o.id);
      console.log(`   清洗订单ID: ${orderIds.join(", ")}`);
      
      const cleanResult = await caller.dataCleaning.cleanOrders({ orderIds });
      console.log(`✅ cleanOrders成功: 成功${cleanResult.successCount}个，失败${cleanResult.failCount}个`);
      
      if (cleanResult.errors.length > 0) {
        console.log("\n   错误详情:");
        cleanResult.errors.forEach(err => {
          console.log(`   - 订单${err.orderId}: ${err.error}`);
        });
      }
    }

    console.log("\n✅ 所有测试通过！");
  } catch (error) {
    console.error("\n❌ 测试失败:");
    console.error(error);
    if (error instanceof Error) {
      console.error("\n错误堆栈:");
      console.error(error.stack);
    }
  }
}

testDataCleaningAPI().catch(console.error);
