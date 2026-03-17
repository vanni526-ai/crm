import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";

const BACKEND_URL = "https://crm.bdsm.com.cn";

// 服务端Token存储 - 解决Cloudflare过滤Authorization header的问题
const tokenStore: Map<string, { token: string; expiresAt: number }> = new Map();

function storeToken(token: string) {
  tokenStore.set(token, { token, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
}

function extractClientToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  const xAuth = req.headers["x-auth-token"];
  if (typeof xAuth === "string" && xAuth.trim()) return xAuth.trim();
  if (req.query.token && typeof req.query.token === "string") return req.query.token;
  return null;
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => { server.close(() => resolve(true)); });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // CORS
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token, X-Session-Id");
    res.header("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") { res.sendStatus(200); return; }
    next();
  });

  app.use(express.json({ limit: "50mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now(), tokenStoreSize: tokenStore.size });
  });

  // ============================================================
  // API代理 - 将所有 /api/proxy/* 请求转发到后端
  // ============================================================
  app.use("/api/proxy", async (req, res) => {
    try {
      let path = req.path;
      if (path.startsWith("/api/")) { /* keep */ }
      else if (path.startsWith("/trpc/")) { path = "/api" + path; }

      // 构建查询参数（去掉token参数）
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(req.query)) {
        if (key !== "token" && key !== "_t" && typeof value === "string") {
          queryParams.set(key, value);
        }
      }
      const queryString = queryParams.toString();
      const clientToken = extractClientToken(req);

      console.log(`[Proxy] ${req.method} ${path} (token: ${clientToken ? "yes" : "no"})`);

      const targetUrl = `${BACKEND_URL}${path}${queryString ? "?" + queryString : ""}`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      };
      if (clientToken) {
        headers["Authorization"] = `Bearer ${clientToken}`;
        headers["Cookie"] = `token=${clientToken}`;
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
        redirect: "follow",
      };
      if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const response = await fetch(targetUrl, fetchOptions);
      const text = await response.text();
      let data: any = null;
      try { data = JSON.parse(text); } catch {}

      // 如果是登录请求，提取并存储token
      if (path.includes("auth.login") && data?.result?.data?.json) {
        const loginResult = data.result.data.json;
        if (loginResult.success && loginResult.token) {
          storeToken(loginResult.token);
          console.log(`[Proxy] Stored token for user: ${loginResult.user?.name || "unknown"}`);
        }
      }

      const contentType = response.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);

      if (data) {
        res.status(response.status).json(data);
      } else {
        res.status(response.status).send(text);
      }
    } catch (error: any) {
      console.error("[Proxy] Error:", error.message);
      res.status(500).json({ error: "Proxy request failed", message: error.message });
    }
  });

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  server.listen(port, () => {
    console.log(`[Proxy] Server listening on port ${port}`);
    console.log(`[Proxy] Forwarding to ${BACKEND_URL}`);
    console.log(`[Proxy] Token injection enabled`);
  });
}

startServer().catch(console.error);
