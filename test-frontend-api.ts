/**
 * 模拟前端App的HTTP请求测试
 * 测试Token认证是否正常工作
 */

async function testFrontendAPI() {
  const baseURL = "https://crm.bdsm.com.cn/api/trpc";
  
  console.log("=== 步骤1: 登录获取Token ===");
  
  // 1. 登录获取Token
  const loginResponse = await fetch(`${baseURL}/auth.loginWithUserAccount`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      json: {
        username: "appuser",
        password: "123456",
      },
    }),
  });
  
  const loginData = await loginResponse.json();
  console.log("登录响应:", JSON.stringify(loginData, null, 2));
  
  if (!loginData.result?.data?.json?.success) {
    console.error("❌ 登录失败!");
    return;
  }
  
  const token = loginData.result.data.json.token;
  const user = loginData.result.data.json.user;
  console.log("✅ 登录成功!");
  console.log("Token:", token.substring(0, 50) + "...");
  console.log("用户:", user.name, `(ID: ${user.id})`);
  
  console.log("\n=== 步骤2: 使用Token查询订单 ===");
  
  // 2. 使用Token查询订单 (在URL参数中传递Token)
  const ordersResponse = await fetch(`${baseURL}/orders.list?token=${encodeURIComponent(token)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  
  console.log("订单查询响应状态:", ordersResponse.status);
  console.log("订单查询响应头:", Object.fromEntries(ordersResponse.headers.entries()));
  
  const ordersData = await ordersResponse.json();
  console.log("订单查询响应:", JSON.stringify(ordersData, null, 2).substring(0, 500) + "...");
  
  if (ordersResponse.status === 200 && ordersData.result?.data?.json) {
    const orders = ordersData.result.data.json;
    console.log(`✅ 查询成功! 获取到${orders.length}条订单`);
  } else if (ordersData.error) {
    console.error("❌ 查询失败!");
    console.error("错误信息:", ordersData.error);
  }
  
  console.log("\n=== 步骤3: 使用Token筛选订单 ===");
  
  // 3. 使用Token筛选订单 (在URL参数中传递Token)
  const filterResponse = await fetch(`${baseURL}/orders.list?token=${encodeURIComponent(token)}&input=${encodeURIComponent(JSON.stringify({
    json: {
      customerName: "App测试用户",
    },
  }))}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  
  console.log("筛选订单响应状态:", filterResponse.status);
  
  const filterData = await filterResponse.json();
  console.log("筛选订单响应:", JSON.stringify(filterData, null, 2).substring(0, 500) + "...");
  
  if (filterResponse.status === 200 && filterData.result?.data?.json) {
    const orders = filterData.result.data.json;
    console.log(`✅ 筛选成功! 获取到${orders.length}条订单`);
  } else if (filterData.error) {
    console.error("❌ 筛选失败!");
    console.error("错误信息:", filterData.error);
  }
}

// 运行测试
testFrontendAPI().catch(console.error);
