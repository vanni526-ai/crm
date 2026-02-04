const baseURL = "https://crm.bdsm.com.cn/api/trpc";
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTQ0MzAyMzAsIm9wZW5JZCI6InRlc3RfYXBwX3VzZXJfMDAxIiwibmFtZSI6ImFwcHVzZXIiLCJyb2xlIjoidXNlciIsImlhdCI6MTc3MDE5ODM1MiwiZXhwIjoxNzcwMjg0NzUyfQ.kJ6Ptw_dXoxBCslRIa2La-3-gZ7112OyByOIeNPxX_o";

async function test() {
  console.log("Testing single API call with token in URL...");
  const response = await fetch(`${baseURL}/orders.list?token=${encodeURIComponent(token)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  
  console.log("Status:", response.status);
  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2).substring(0, 500));
}

test().catch(console.error);
