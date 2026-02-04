const baseURL = "http://localhost:3000/api/trpc";

async function test() {
  // 1. Login
  console.log("=== Step 1: Login ===");
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
  const token = loginData.result.data.json.token;
  console.log("✅ Login success! Token:", token.substring(0, 50) + "...");
  
  // 2. Query orders with token in URL
  console.log("\n=== Step 2: Query orders with URL token ===");
  const ordersResponse = await fetch(`${baseURL}/orders.list?token=${encodeURIComponent(token)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  
  console.log("Status:", ordersResponse.status);
  const ordersData = await ordersResponse.json();
  
  if (ordersResponse.status === 200 && ordersData.result?.data?.json) {
    const orders = ordersData.result.data.json;
    console.log(`✅ Success! Got ${orders.length} orders`);
  } else {
    console.log("❌ Failed!");
    console.log("Response:", JSON.stringify(ordersData, null, 2).substring(0, 300));
  }
}

test().catch(console.error);
